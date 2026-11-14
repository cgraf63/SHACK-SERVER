/*
 * QMX / QMX+ remote page (/qmx)
 *
 *   GET  /api/qmx           state, polled every 400 ms
 *   GET  /api/qmx/tables    modes, bands, tune steps
 *   POST /api/qmx/control   { control, value }
 *
 * The LCD shows the real 2 x 16 characters of the QMX (CAT "LC;"),
 * drawn as a 5 x 7 dot matrix. Older firmware without LC: the LCD is
 * built from frequency, mode and VFO.
 */
(() => {

    const $ = id => document.getElementById(id);

    /* 5 x 7 font, ASCII 32..126, 5 column bytes per character (bit 0 = top).
       Classic GLCD font from the Adafruit GFX library (BSD licence). */
    const FONT = "000000000000005f00000007000700147f147f14242a7f2a12231308646236495620500008070300001c2241000041221c002a1c7f1c2a08083e080800807030000808080808000060600020100804023e5149453e00427f400072494949462141494d331814127f1027454545393c4a49493141211109073649494936464949291e0000140000004034000000081422411414141414004122140802015909063e415d594e7c1211127c7f494949363e414141227f4141413e7f494949417f090909013e414151737f0808087f00417f41002040413f017f081422417f404040407f021c027f7f0408107f3e4141413e7f090909063e4151215e7f09192946264949493203017f01033f4040403f1f2040201f3f4038403f631408146303047804036159494d43007f4141410204081020004141417f04020102044040404040000307080020545478407f284444383844444428384444287f385454541800087e090218a4a49c787f0804047800447d40002040403d007f1028440000417f40007c047804787c080404783844444438fc1824241818242418fc7c08040408485454542404043f44243c4040207c1c2040201c3c4030403c44281028444c9090907c4464544c440008364100000077000000413608000201020402";

    let state = null;
    let tables = { modes: [], bands: [], steps: [] };
    let myCall = "";
    let sliderBusy = {};

    /* ------------------------------------------------------------ helpers */

    function toast(text) {
        const t = $("toast");
        t.textContent = text;
        t.classList.add("show");
        clearTimeout(t._timer);
        t._timer = setTimeout(() => t.classList.remove("show"), 2600);
    }

    async function control(name, value) {
        try {
            const response = await fetch("/api/qmx/control", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ control: name, value })
            });
            const result = await response.json().catch(() => ({}));
            if (!response.ok) toast(result.error || `Error ${response.status}`);
            else setTimeout(poll, 120);
            return response.ok;
        }
        catch {
            toast("SHACK-SERVER not reachable");
            return false;
        }
    }

    function fmtFreq(hz) {
        // 14.060.00 (MHz . kHz . 10 Hz) - like the QMX
        if (!(hz > 0)) return "--.---.--";
        const mhz = Math.floor(hz / 1e6);
        const khz = Math.floor(hz / 1e3) % 1000;
        const ten = Math.floor(hz / 10) % 100;
        return `${mhz}.${String(khz).padStart(3, "0")}.${String(ten).padStart(2, "0")}`;
    }

    function stepText(hz) {
        if (!hz) return "—";
        if (hz >= 1e6) return `${hz / 1e6} MHz`;
        if (hz >= 1e3) return `${hz / 1e3} kHz`;
        return `${hz} Hz`;
    }

    /* ------------------------------------------------------------ LCD */

    const canvas = $("lcd-canvas");
    const ctx = canvas.getContext("2d");
    let lastLcd = "";

    function glyph(code) {
        if (code < 32 || code > 126) return [0, 0, 0, 0, 0];
        const i = (code - 32) * 10;
        const out = [];
        for (let c = 0; c < 5; c++) out.push(parseInt(FONT.slice(i + c * 2, i + c * 2 + 2), 16));
        return out;
    }

    function drawLcd(text) {

        text = (text || "").padEnd(32, " ").slice(0, 32);
        if (text === lastLcd) return;
        lastLcd = text;

        // 16 characters of 5 dots + 1 dot gap; 2 rows of 8 dots, 3 dots apart
        const W = canvas.width;
        const padX = W * 0.035;
        const cell = (W - 2 * padX) / (16 * 6 - 1);
        const padY = cell * 2.2;
        const rowGap = cell * 3;
        const H = Math.round(2 * padY + 16 * cell + rowGap);
        if (canvas.height !== H) canvas.height = H;
        const dot = cell * 0.86;

        ctx.clearRect(0, 0, W, H);

        for (let row = 0; row < 2; row++) {
            for (let col = 0; col < 16; col++) {

                const bits = glyph(text.charCodeAt(row * 16 + col));
                const x0 = padX + col * 6 * cell;
                const y0 = padY + row * (8 * cell + rowGap);

                for (let c = 0; c < 5; c++) {
                    for (let r = 0; r < 8; r++) {
                        const on = (bits[c] >> r) & 1;
                        ctx.fillStyle = on ? "#1d2606" : "rgba(29, 38, 6, 0.075)";
                        ctx.fillRect(x0 + c * cell, y0 + r * cell, dot, dot);
                    }
                }

            }
        }

    }

    /* LCD text without LC (older firmware): built from the CAT values */
    function syntheticLcd(s) {
        const line1 = `${s.vfo}${s.split ? "S" : " "}${fmtFreq(s.frequency).padStart(10, " ")} ${String(s.mode || "").slice(0, 3)}`;
        const line2 = s.tx
            ? `TX ${s.meters.power.toFixed(1)}W SWR${s.meters.swr ? s.meters.swr.toFixed(1) : "-"}`
            : `S${Math.min(9, Math.round(s.meters.s))} ${s.keyerSpeed ? s.keyerSpeed + "WPM" : ""} ${s.rit.on ? "R" + (s.rit.offset >= 0 ? "+" : "") + s.rit.offset : ""}`;
        return line1.padEnd(16, " ").slice(0, 16) + line2.padEnd(16, " ").slice(0, 16);
    }

    /* touch / mouse tuning on the LCD */
    (() => {

        const lcd = $("lcd");
        let startX = null;
        let moved = 0;
        let accumulated = 0;
        let wheelTimer = null;
        let wheelSteps = 0;

        const flash = side => {
            const zone = $(side === "left" ? "zone-left" : "zone-right");
            zone.classList.add("flash");
            setTimeout(() => zone.classList.remove("flash"), 160);
        };

        lcd.addEventListener("pointerdown", event => {
            startX = event.clientX;
            moved = 0;
            accumulated = 0;
            lcd.setPointerCapture(event.pointerId);
        });

        lcd.addEventListener("pointermove", event => {
            if (startX === null) return;
            const dx = event.clientX - startX;
            moved = Math.max(moved, Math.abs(dx));
            const steps = Math.trunc(dx / 14);
            if (steps !== accumulated) {
                control("tune", steps - accumulated);
                accumulated = steps;
            }
        });

        lcd.addEventListener("pointerup", event => {
            if (startX === null) return;
            if (moved < 6) {
                const rect = lcd.getBoundingClientRect();
                const right = event.clientX - rect.left > rect.width / 2;
                flash(right ? "right" : "left");
                control("tune", right ? 1 : -1);
            }
            startX = null;
        });

        lcd.addEventListener("pointercancel", () => { startX = null; });

        // wheel: collect steps for 80 ms, then one command
        lcd.addEventListener("wheel", event => {
            event.preventDefault();
            wheelSteps += event.deltaY < 0 ? 1 : -1;
            clearTimeout(wheelTimer);
            wheelTimer = setTimeout(() => {
                const steps = wheelSteps;
                wheelSteps = 0;
                if (steps) control("tune", steps);
            }, 80);
        }, { passive: false });

    })();

    /* ------------------------------------------------------------ meters */

    function buildBars() {
        for (const id of ["m-s-bar", "m-po-bar", "m-swr-bar"]) {
            $(id).innerHTML = "<i></i>".repeat(20);
        }
    }

    function setBar(id, fraction, hotFrom = 1) {
        const cells = $(id).children;
        const on = Math.round(Math.max(0, Math.min(1, fraction)) * cells.length);
        for (let i = 0; i < cells.length; i++) {
            cells[i].classList.toggle("on", i < on);
            cells[i].classList.toggle("hot", i < on && i / cells.length >= hotFrom);
        }
    }

    function renderMeters(s) {

        // S meter: S0..S9 left half, S9+60 dB right half
        const sDb = s.meters.sDb;
        const sFrac = sDb <= 54 ? sDb / 54 * 0.6 : 0.6 + Math.min(1, (sDb - 54) / 40) * 0.4;
        setBar("m-s-bar", s.tx ? 0 : sFrac, 0.6);
        $("m-s-val").textContent = s.tx ? "—"
            : sDb <= 54 ? `S${Math.round(s.meters.s)} · ${sDb} dB` : `S9+${sDb - 54} · ${sDb} dB`;

        $("m-po").classList.toggle("idle", !s.tx);
        $("m-swr").classList.toggle("idle", !s.tx);

        setBar("m-po-bar", s.tx ? s.meters.power / 6 : 0, 0.85);
        $("m-po-val").textContent = s.tx ? `${s.meters.power.toFixed(1)} W` : "—";

        const swr = s.meters.swr;
        setBar("m-swr-bar", s.tx && swr ? (swr - 1) / 2 : 0, 0.5);
        $("m-swr-val").textContent = s.tx && swr ? swr.toFixed(2) : "—";

    }

    /* ------------------------------------------------------------ keys */

    function buildKeys() {

        $("modes").innerHTML = tables.modes
            .map(mode => `<button class="k" data-mode="${mode}">${mode}</button>`).join("");

        $("bands").innerHTML = tables.bands
            .map(band => `<button class="k sm" data-band="${band.name}">${band.name.replace("m", "")}</button>`).join("");

        document.querySelectorAll("[data-mode]").forEach(button =>
            button.addEventListener("click", () => control("mode", button.dataset.mode)));

        document.querySelectorAll("[data-band]").forEach(button =>
            button.addEventListener("click", () => control("band", button.dataset.band)));

    }

    function wire() {

        document.querySelectorAll("[data-tune]").forEach(button =>
            button.addEventListener("click", () => control("tune", Number(button.dataset.tune))));

        $("band-up").addEventListener("click", () => control("bandUp"));
        $("band-down").addEventListener("click", () => control("bandDown"));

        const changeStep = direction => {
            const steps = [...tables.steps].sort((a, b) => a - b).filter(v => v <= 100000);
            const current = state?.step || 10;
            let index = steps.indexOf(current);
            if (index < 0) index = 0;
            const next = steps[Math.max(0, Math.min(steps.length - 1, index + direction))];
            if (next && next !== current) control("step", next);
        };

        $("step-up").addEventListener("click", () => changeStep(1));
        $("step-down").addEventListener("click", () => changeStep(-1));

        const setFreq = () => {
            const raw = $("freq-input").value.trim().replace(",", ".");
            const value = Number(raw);
            if (!(value > 0)) return toast("Frequency in kHz, e.g. 14060 or 7030.5");
            const hz = value < 100 ? value * 1e6 : value * 1e3;   // 14.06 MHz or 14060 kHz
            control("frequency", Math.round(hz));
            $("freq-input").value = "";
            $("freq-input").blur();
        };

        $("freq-go").addEventListener("click", setFreq);
        $("freq-input").addEventListener("keydown", event => { if (event.key === "Enter") setFreq(); });

        $("vfo-a").addEventListener("click", () => control("vfo", "A"));
        $("vfo-b").addEventListener("click", () => control("vfo", "B"));
        $("split").addEventListener("click", () => control("split", !state?.split));
        $("a-eq-b").addEventListener("click", () => control("aEqualsB"));
        $("swap").addEventListener("click", () => control("swap"));

        $("rit").addEventListener("click", () => control("rit", !state?.rit?.on));
        $("rit-clear").addEventListener("click", () => control("ritClear"));
        document.querySelectorAll("[data-rit]").forEach(button =>
            button.addEventListener("click", () => {
                const offset = Math.max(-9999, Math.min(9999, (state?.rit?.offset || 0) + Number(button.dataset.rit)));
                if (!state?.rit?.on) control("rit", true);
                control("ritOffset", offset);
            }));

        // sliders: send on release, while dragging only the value
        const slider = (id, controlName, label) => {
            const input = $(id);
            input.addEventListener("input", () => {
                sliderBusy[id] = Date.now();
                $(`${id}-val`).textContent = label(Number(input.value));
            });
            input.addEventListener("change", () => {
                sliderBusy[id] = Date.now();
                control(controlName, Number(input.value));
            });
        };

        slider("af", "afGain", v => `${(v / 4).toFixed(1)} dB`);
        slider("rf", "rfGain", v => `${v} dB`);
        slider("wpm", "keyerSpeed", v => `${v} WPM`);

        // CW
        const sendCw = text => {
            text = String(text || "").replace(/\{CALL\}/g, myCall || "").trim();
            if (!text) return;
            control("cw", text);
        };

        $("cw-send").addEventListener("click", () => { sendCw($("cw-text").value); $("cw-text").value = ""; });
        $("cw-text").addEventListener("keydown", event => {
            if (event.key === "Enter") { sendCw($("cw-text").value); $("cw-text").value = ""; }
            if (event.key === "Escape") control("cwStop");
        });
        $("cw-stop").addEventListener("click", () => control("cwStop"));
        document.querySelectorAll("[data-cw]").forEach(button =>
            button.addEventListener("click", () => sendCw(button.dataset.cw)));
        $("dec-clear").addEventListener("click", () => control("clearDecoded"));

        // carrier: hold to key
        const carrier = $("carrier");
        let carrierOn = false;
        const down = event => {
            event.preventDefault();
            if (carrierOn) return;
            carrierOn = true;
            carrier.classList.add("on");
            control("carrier", true);
        };
        const up = () => {
            if (!carrierOn) return;
            carrierOn = false;
            carrier.classList.remove("on");
            control("carrier", false);
        };
        carrier.addEventListener("pointerdown", down);
        carrier.addEventListener("pointerup", up);
        carrier.addEventListener("pointerleave", up);
        carrier.addEventListener("pointercancel", up);
        window.addEventListener("blur", up);

        // keyboard: arrows tune when no input has the focus
        document.addEventListener("keydown", event => {
            if (event.target.closest("input")) return;
            if (event.key === "ArrowRight" || event.key === "ArrowUp") { event.preventDefault(); control("tune", event.shiftKey ? 10 : 1); }
            if (event.key === "ArrowLeft" || event.key === "ArrowDown") { event.preventDefault(); control("tune", event.shiftKey ? -10 : -1); }
        });

    }

    /* ------------------------------------------------------------ render */

    function setOn(id, on) {
        $(id)?.classList.toggle("on", Boolean(on));
    }

    function render(s) {

        drawLcd(s.lcd || syntheticLcd(s));
        $("lcd").classList.toggle("tx", s.tx);

        $("model").textContent = s.model === "QMX" ? (s.name || "QMX").toUpperCase() : s.model;
        $("fw").textContent = s.version ? `FIRMWARE ${s.version.replace(/QMX$/, "")}` : "";

        renderMeters(s);

        document.querySelectorAll("[data-mode]").forEach(b => b.classList.toggle("on", b.dataset.mode === s.mode));
        document.querySelectorAll("[data-band]").forEach(b => b.classList.toggle("on", b.dataset.band === s.band));

        setOn("vfo-a", s.vfo === "A");
        setOn("vfo-b", s.vfo === "B");
        setOn("split", s.split);
        setOn("rit", s.rit.on);

        $("rit-val").textContent = `${s.rit.offset > 0 ? "+" : ""}${s.rit.offset} Hz`;
        $("step-val").textContent = stepText(s.step);

        const chips = [
            `<span class="chip ${s.tx ? "tx" : ""}">${s.tx ? (s.keyDown ? "TX · CARRIER" : "TX") : "RX"}</span>`,
            `<span class="chip">VFO <b>${s.vfo}</b> ${fmtFreq(s.vfo === "A" ? s.frequencyA : s.frequencyB)}</span>`,
            `<span class="chip">${s.vfo === "A" ? "B" : "A"} ${fmtFreq(s.vfo === "A" ? s.frequencyB : s.frequencyA)}</span>`,
            s.split ? `<span class="chip on">SPLIT · TX ${s.txVfo}</span>` : "",
            s.band ? `<span class="chip">BAND <b>${s.band}</b></span>` : "",
            `<span class="chip">MODE <b>${s.mode}</b></span>`,
            s.meters.agc ? `<span class="chip">AGC <b>${s.meters.agc} dB</b></span>` : "",
            s.cwPending ? `<span class="chip on">CW SENDING · ${s.cwPending >= 9 ? "9+" : s.cwPending}</span>` : ""
        ];
        $("status").innerHTML = chips.join("");

        const sliderValue = (id, value, label) => {
            if (value < 0) return;
            if (Date.now() - (sliderBusy[id] || 0) < 1500) return;
            $(id).value = value;
            $(`${id}-val`).textContent = label(value);
        };

        sliderValue("af", s.afGain, v => `${(v / 4).toFixed(1)} dB`);
        sliderValue("rf", s.rfGain, v => `${v} dB`);
        sliderValue("wpm", s.keyerSpeed || -1, v => `${v} WPM`);

        const decoder = $("decoder");
        decoder.innerHTML = s.decoded
            ? `<span>${s.decoded.replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c])}</span>`
            : `<span class="empty">CW decoder of the QMX …</span>`;

    }

    /* ------------------------------------------------------------ polling */

    function overlay(title, html) {
        $("ov-title").textContent = title;
        $("ov-text").innerHTML = html;
        $("overlay").classList.toggle("show", Boolean(title));
    }

    function setConn(kind, text) {
        $("conn").className = `conn ${kind}`;
        $("conn-text").textContent = text;
    }

    let polling = false;

    async function poll() {

        if (polling) return;
        polling = true;

        try {

            const response = await fetch("/api/qmx", { cache: "no-store" });
            const data = await response.json().catch(() => ({}));

            if (response.status === 409) {
                setConn("bad", "NOT ACTIVE");
                overlay("QMX NOT ACTIVE",
                    `${data.error || "The active transceiver is not a QMX."}<br><br>` +
                    (data.activeRadio ? `Active now: <b>${data.activeRadio.name}</b><br><br>` : "") +
                    `<a href="/">Back to the dashboard</a>`);
                return;
            }

            overlay("");

            state = data;

            if (!data.connected) setConn("bad", data.error ? "PORT ERROR" : "NOT CONNECTED");
            else if (!data.alive) setConn("bad", "NO ANSWER");
            else setConn("ok", data.tx ? "TX" : "CONNECTED");

            render(data);

        }
        catch {
            setConn("bad", "OFFLINE");
        }
        finally {
            polling = false;
        }

    }

    function clock() {
        const now = new Date();
        $("clock").innerHTML = `<b>${now.toISOString().slice(11, 19)}</b> UTC`;
    }

    async function init() {

        buildBars();
        drawLcd("  QRP LABS QMX    CONNECTING... ");

        try {
            tables = await (await fetch("/api/qmx/tables")).json();
        }
        catch {
            // keep the defaults
        }

        try {
            const settings = await (await fetch("/api/settings")).json();
            myCall = String(settings.callsign || "").toUpperCase();
        }
        catch {
            // no callsign - {CALL} stays empty
        }

        buildKeys();
        wire();

        clock();
        setInterval(clock, 1000);

        poll();
        setInterval(poll, 400);

    }

    init();

})();
