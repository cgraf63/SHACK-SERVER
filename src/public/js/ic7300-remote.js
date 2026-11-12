/*
 * IC-7300 remote page (/ic7300)
 *
 *   GET  /api/ic7300           state, polled every 300 ms
 *   POST /api/ic7300/control   { control, value }
 *   WS   /ic7300-scope         spectrum lines of the radio
 *   WS   /audio                RX audio (48 kHz, 16 bit, mono)
 */
(() => {

    const $ = id => document.getElementById(id);

    let state = null;
    let tables = { modes: [], bands: [], spans: [] };
    let step = Number(localStorage.getItem("ic7300.step")) || 100;
    let meterKind = localStorage.getItem("ic7300.meter") || "AUTO";
    let pending = 0;          // frequency changes not yet confirmed
    let localFreq = 0;
    let freqTimer = null;
    let pttDown = false;

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
            const response = await fetch("/api/ic7300/control", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ control: name, value })
            });
            const result = await response.json().catch(() => ({}));
            if (!response.ok) toast(result.error || `Error ${response.status}`);
            return response.ok;
        }
        catch {
            toast("SHACK-SERVER not reachable");
            return false;
        }
    }

    function fmtFreq(hz) {
        // 14.074.00  (MHz . kHz . 10 Hz)
        const mhz = Math.floor(hz / 1e6);
        const khz = Math.floor(hz / 1e3) % 1000;
        const ten = Math.floor(hz / 10) % 100;
        return { mhz: String(mhz), khz: String(khz).padStart(3, "0"), ten: String(ten).padStart(2, "0") };
    }

    function spanText(hz) {
        const half = hz / 2;
        return half >= 1000 ? `±${half / 1000 >= 100 ? half / 1000 : (half / 1000).toFixed(half % 1000 ? 1 : 0)} kHz` : `±${half} Hz`;
    }

    /* ------------------------------------------------------------ frequency display */

    function renderFreq(hz) {

        const f = fmtFreq(hz);
        // each digit gets its step: mouse wheel tunes that digit
        const digits = [];
        const mhz = f.mhz.split("");
        mhz.forEach((d, i) => digits.push(`<span data-step="${10 ** (6 + mhz.length - 1 - i)}">${d}</span>`));
        digits.push('<span class="dot">.</span>');
        f.khz.split("").forEach((d, i) => digits.push(`<span data-step="${10 ** (5 - i)}">${d}</span>`));
        digits.push('<span class="dot small">.</span>');
        f.ten.split("").forEach((d, i) => digits.push(`<span class="small" data-step="${10 ** (2 - i)}">${d}</span>`));
        $("freq").innerHTML = digits.join("");

    }

    function tuneBy(deltaHz) {
        if (!state?.connected) return;
        const base = pending ? localFreq : state.frequency;
        let target = base + deltaHz;
        // snap to the step when the step is used
        if (Math.abs(deltaHz) === step) target = Math.round(target / step) * step;
        setFreq(target);
    }

    function setFreq(hz) {
        hz = Math.max(30_000, Math.min(74_800_000, Math.round(hz)));
        localFreq = hz;
        pending = Date.now();
        renderFreq(hz);
        clearTimeout(freqTimer);
        // at most ~12 commands per second while turning
        freqTimer = setTimeout(() => control("frequency", localFreq), 80);
    }

    $("freq").addEventListener("wheel", event => {
        event.preventDefault();
        const digit = event.target.closest("[data-step]");
        const amount = digit ? Number(digit.dataset.step) : step;
        tuneBy(event.deltaY < 0 ? amount : -amount);
    }, { passive: false });

    $("freq").addEventListener("click", async () => {
        const text = window.prompt("Frequency (MHz or kHz):", state ? (state.frequency / 1e6).toFixed(5) : "");
        if (!text) return;
        let value = Number(text.replace(",", "."));
        if (!Number.isFinite(value) || value <= 0) return toast("Invalid frequency");
        if (value < 100) value *= 1e6;           // MHz
        else if (value < 100_000) value *= 1e3;  // kHz
        setFreq(value);
    });

    /* ------------------------------------------------------------ main dial */

    (() => {
        const dial = $("dial");
        const dot = $("dial-dot");
        let angle = 0;
        let last = null;
        let rest = 0;

        const rotate = degrees => {
            angle = (angle + degrees) % 360;
            dot.style.transform = `rotate(${angle}deg)`;
            // 10 degrees = 1 step
            rest += degrees;
            const steps = Math.trunc(rest / 10);
            if (steps) {
                rest -= steps * 10;
                tuneBy(steps * step);
            }
        };

        const point = e => {
            const r = dial.getBoundingClientRect();
            return Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) * 180 / Math.PI;
        };

        dial.addEventListener("pointerdown", e => { dial.setPointerCapture(e.pointerId); last = point(e); dial.style.cursor = "grabbing"; });
        dial.addEventListener("pointermove", e => {
            if (last === null) return;
            const now = point(e);
            let delta = now - last;
            if (delta > 180) delta -= 360;
            if (delta < -180) delta += 360;
            last = now;
            rotate(delta);
        });
        const end = () => { last = null; dial.style.cursor = ""; };
        dial.addEventListener("pointerup", end);
        dial.addEventListener("pointercancel", end);
        dial.addEventListener("wheel", e => { e.preventDefault(); rotate(e.deltaY < 0 ? 10 : -10); }, { passive: false });
    })();

    const STEPS = [10, 50, 100, 500, 1000, 5000, 9000, 10000];

    function renderSteps() {
        $("steps").innerHTML = STEPS.map(s =>
            `<button class="k sm${s === step ? " on" : ""}" data-step-size="${s}">${s >= 1000 ? `${s / 1000}k` : s}</button>`).join("");
    }

    $("steps").addEventListener("click", e => {
        const b = e.target.closest("[data-step-size]");
        if (!b) return;
        step = Number(b.dataset.stepSize);
        localStorage.setItem("ic7300.step", String(step));
        renderSteps();
    });

    /* ------------------------------------------------------------ meter */

    const METERS = ["AUTO", "S", "PO", "SWR", "ALC"];

    $("meter").addEventListener("click", () => {
        meterKind = METERS[(METERS.indexOf(meterKind) + 1) % METERS.length];
        localStorage.setItem("ic7300.meter", meterKind);
        if (state) renderMeter(state);
    });

    function renderMeter(s) {

        let kind = meterKind;
        if (kind === "AUTO") kind = s.tx ? "PO" : "S";

        let fill = 0;
        let hot = false;
        let text = "";
        let scale = "";

        if (kind === "S") {
            const units = s.meters.sUnits;
            fill = s.meters.overS9 > 0 ? 0.5 + Math.min(1, s.meters.overS9 / 60) * 0.5 : units / 9 * 0.5;
            hot = s.meters.overS9 > 0;
            text = s.meters.overS9 > 0 ? `S9+${s.meters.overS9} dB` : `S${Math.round(units)}`;
            scale = '<span>1</span><span>3</span><span>5</span><span>7</span><span>9</span><span class="red">+20</span><span class="red">+40</span><span class="red">+60 dB</span>';
        }
        else if (kind === "PO") {
            fill = Math.min(1, s.meters.poWatts / 100);
            text = `${s.meters.poWatts} W`;
            scale = "<span>0</span><span>25</span><span>50</span><span>75</span><span>100 W</span>";
        }
        else if (kind === "SWR") {
            fill = Math.min(1, (s.meters.swr - 1) / 2);
            hot = s.meters.swr >= 2;
            text = s.tx ? s.meters.swr.toFixed(1) : "—";
            scale = '<span>1</span><span>1.5</span><span>2</span><span class="red">3</span>';
        }
        else {
            fill = Math.min(1, s.meters.alc / 100);
            hot = s.meters.alc > 100;
            text = `${s.meters.alc} %`;
            scale = "<span>0</span><span>ALC zone</span><span>max</span>";
        }

        $("meter-scale").innerHTML = scale;
        $("meter-fill").style.width = `${Math.round(fill * 100)}%`;
        $("meter-fill").classList.toggle("hot", hot);
        $("meter-name").textContent = meterKind === "AUTO" ? `${kind} · AUTO` : kind;
        $("meter-value").textContent = text;

    }

    /* ------------------------------------------------------------ state rendering */

    function on(id, value) {
        const el = $(id);
        if (el) el.classList.toggle("on", !!value);
    }

    function setSlider(id, value, suffix = "") {
        const input = $(id);
        if (!input || document.activeElement === input || input._busy) return;
        input.value = value;
        const out = $(`${id}-v`);
        if (out) out.textContent = `${value}${suffix}`;
    }

    function render(s) {

        state = s;

        $("conn").className = `conn ${s.connected ? "ok" : "bad"}`;
        $("conn-text").textContent = s.connected ? `CONNECTED · ${s.name || "IC-7300"}` : `NOT CONNECTED${s.error ? ` · ${s.error}` : ""}`;

        // frequency (keep the local value while a change is on its way)
        if (pending && Date.now() - pending < 1200) {
            if (s.frequency === localFreq) pending = 0;
        }
        else {
            pending = 0;
            renderFreq(s.frequency);
        }

        $("mode-tag").textContent = s.mode + (s.dataMode ? "-D" : "");
        $("fil-tag").textContent = `FIL${s.filter}`;
        $("freq-b").textContent = s.frequencyB ? (s.frequencyB / 1e6).toFixed(5) : "—";
        $("vfo-b").classList.toggle("split", s.split);

        // status icons (like the top line of the IC-7300 screen)
        const icons = [
            [s.tx ? "TX" : "RX", s.tx ? "tx" : "rx"],
            [s.preamp ? `P.AMP${s.preamp}` : "P.AMP", s.preamp ? "on" : ""],
            ["ATT", s.att ? "on" : ""],
            [`AGC-${s.agc[0]}`, "on"],
            ["NB", s.nb ? "on" : ""],
            ["NR", s.nr ? "on" : ""],
            ["AN", s.anf ? "on" : ""],
            ["MN", s.manualNotch ? "on" : ""],
            ["COMP", s.comp ? "on" : ""],
            ["VOX", s.vox ? "on" : ""],
            [`BK-IN${s.bkin === "FULL" ? " F" : ""}`, s.bkin !== "OFF" ? "on" : ""],
            ["SPLIT", s.split ? "warn" : ""],
            [s.rit.on ? `RIT ${s.rit.hz > 0 ? "+" : ""}${s.rit.hz}` : "RIT", s.rit.on ? "warn" : ""],
            [s.tuner.tuning ? "TUNING" : "TUNER", s.tuner.tuning ? "warn" : s.tuner.on ? "on" : ""],
            [s.band || "GEN", "on"]
        ];
        $("icons").innerHTML = icons.map(([text, cls]) => `<span class="ico ${cls}">${text}</span>`).join("");

        renderMeter(s);

        // keys
        document.querySelectorAll("[data-mode]").forEach(b => b.classList.toggle("on", b.dataset.mode === s.mode));
        document.querySelectorAll("[data-filter]").forEach(b => b.classList.toggle("on", Number(b.dataset.filter) === s.filter));
        document.querySelectorAll("[data-band]").forEach(b => b.classList.toggle("on", b.dataset.band === s.band));
        document.querySelectorAll("[data-preamp]").forEach(b => b.classList.toggle("on", Number(b.dataset.preamp) === s.preamp));
        document.querySelectorAll("[data-agc]").forEach(b => b.classList.toggle("on", b.dataset.agc === s.agc));
        document.querySelectorAll("[data-bkin]").forEach(b => b.classList.toggle("on", b.dataset.bkin === s.bkin));
        on("data", s.dataMode);
        on("att", s.att);
        ["nb", "nr", "anf", "manualNotch", "comp", "vox", "mon"].forEach(k => on(k, s[k]));
        on("tuner", s.tuner.on);
        on("tune", s.tuner.tuning);
        on("tune-2", s.tuner.tuning);
        on("split", s.split);
        on("rit", s.rit.on);
        $("rit-v").textContent = `${s.rit.hz > 0 ? "+" : ""}${s.rit.hz} Hz`;
        if (!pttDown) $("ptt").classList.toggle("on", s.tx);

        setSlider("pbtIn", s.levels.pbtIn, " Hz");
        setSlider("pbtOut", s.levels.pbtOut, " Hz");
        setSlider("nbLevel", s.levels.nbLevel);
        setSlider("nrLevel", s.levels.nrLevel);
        setSlider("rf", s.levels.rf, " %");
        setSlider("sql", s.levels.sql, " %");
        setSlider("power", s.levels.power, " W");
        setSlider("mic", s.levels.mic, " %");
        setSlider("compLevel", s.levels.compLevel);
        setSlider("keySpeed", s.levels.keySpeed, " wpm");
        setSlider("af", s.levels.af, " %");

        // scope bar
        $("sc-mode").textContent = s.scope.mode === "center" ? "CENT" : "FIX";
        $("sc-span").textContent = spanText(s.scope.spanHz);
        $("sc-ref").textContent = `${s.scope.ref > 0 ? "+" : ""}${s.scope.ref.toFixed(1)} dB`;
        $("sc-speed").textContent = s.scope.speed;

        $("info").innerHTML =
            `CI-V address ${s.civAddress.toString(16).toUpperCase()}h · ` +
            `${s.connected ? "connected" : "not connected"}<br>` +
            `VFO B: ${s.vfoBKnown ? "read with command 25/26" : "firmware without 25/26 - VFO B is set by switching VFOs"}<br>` +
            `Scope: ${s.scope.output ? "output on" : "off"}${s.scope.lastLineAgeMs !== null ? `, last sweep ${s.scope.lastLineAgeMs} ms ago` : ""}<br>` +
            "IC-7300 settings: SET › Connectors › CI-V: CI-V USB Baud Rate 115200, CI-V Transceive ON, CI-V USB Echo Back OFF.";

    }

    async function poll() {
        try {
            const response = await fetch("/api/ic7300", { cache: "no-store" });
            const data = await response.json();
            if (response.status === 409) {
                $("notice").classList.add("show");
                $("notice-text").innerHTML =
                    `<b>The active transceiver is not an IC-7300.</b><br>` +
                    `${data.activeRadio ? `Active: ${data.activeRadio.name}.<br>` : ""}` +
                    `Select the IC-7300 in the <a href="/">dashboard</a>.`;
            }
            else if (response.ok) {
                $("notice").classList.remove("show");
                render(data);
            }
        }
        catch {
            $("conn").className = "conn bad";
            $("conn-text").textContent = "SHACK-SERVER NOT REACHABLE";
        }
        setTimeout(poll, 300);
    }

    /* ------------------------------------------------------------ panels + keys */

    $("softkeys").addEventListener("click", e => {
        const b = e.target.closest("[data-panel]");
        if (!b) return;
        document.querySelectorAll("#softkeys [data-panel]").forEach(k => k.classList.toggle("on", k === b));
        document.querySelectorAll("section.panel").forEach(p => { p.hidden = p.dataset.panel !== b.dataset.panel; });
        localStorage.setItem("ic7300.panel", b.dataset.panel);
    });

    function bindToggle(id, name) {
        $(id).addEventListener("click", () => {
            const value = !$(id).classList.contains("on");
            $(id).classList.toggle("on", value);
            control(name, value);
        });
    }

    function bindSlider(id, name, suffix = "") {
        const input = $(id);
        let timer = null;
        input.addEventListener("input", () => {
            input._busy = true;
            $(`${id}-v`).textContent = `${input.value}${suffix}`;
            clearTimeout(timer);
            timer = setTimeout(() => {
                control(name, Number(input.value));
                setTimeout(() => { input._busy = false; }, 800);
            }, 120);
        });
    }

    async function init() {

        try {
            tables = await (await fetch("/api/ic7300/tables")).json();
        }
        catch { /* defaults */ }

        $("bands").innerHTML = tables.bands.map(b => `<button class="k" data-band="${b.name}">${b.name}</button>`).join("");
        $("modes").innerHTML = tables.modes.map(m => `<button class="k" data-mode="${m}">${m}</button>`).join("");
        $("voices").innerHTML =
            [1, 2, 3, 4, 5, 6, 7, 8].map(n => `<button class="k" data-voice="${n}">T${n}</button>`).join("") +
            '<button class="k red" data-voice="0">STOP</button>';

        document.addEventListener("click", e => {
            const b = e.target.closest("button");
            if (!b) return;
            if (b.dataset.band) control("band", b.dataset.band);
            else if (b.dataset.mode) control("mode", b.dataset.mode);
            else if (b.dataset.filter) control("filter", Number(b.dataset.filter));
            else if (b.dataset.preamp !== undefined) control("preamp", Number(b.dataset.preamp));
            else if (b.dataset.agc) control("agc", b.dataset.agc);
            else if (b.dataset.bkin) control("bkin", b.dataset.bkin);
            else if (b.dataset.voice !== undefined) control("voice", Number(b.dataset.voice));
        });

        bindToggle("data", "data");
        bindToggle("nb", "nb");
        bindToggle("nr", "nr");
        bindToggle("anf", "anf");
        bindToggle("manualNotch", "manualNotch");
        bindToggle("comp", "comp");
        bindToggle("vox", "vox");
        bindToggle("mon", "mon");
        bindToggle("tuner", "tuner");
        bindToggle("split", "split");
        bindToggle("rit", "rit");
        $("att").addEventListener("click", () => control("att", state?.att ? 0 : 20));

        bindSlider("pbtIn", "pbtIn", " Hz");
        bindSlider("pbtOut", "pbtOut", " Hz");
        bindSlider("nbLevel", "nbLevel");
        bindSlider("nrLevel", "nrLevel");
        bindSlider("rf", "rf", " %");
        bindSlider("sql", "sql", " %");
        bindSlider("power", "power", " W");
        bindSlider("mic", "mic", " %");
        bindSlider("compLevel", "compLevel");
        bindSlider("keySpeed", "keySpeed", " wpm");
        bindSlider("af", "af", " %");
        $("pbt-reset").addEventListener("click", () => control("pbtReset", true));

        $("tune").addEventListener("click", () => control("tune", true));
        $("tune-2").addEventListener("click", () => control("tune", true));
        $("vfo-swap").addEventListener("click", () => control("vfoSwap", true));
        $("vfo-equal").addEventListener("click", () => control("vfoEqual", true));

        const ritBy = d => control("ritOffset", (state?.rit.hz || 0) + d);
        $("rit-down").addEventListener("click", () => ritBy(-10));
        $("rit-up").addEventListener("click", () => ritBy(10));
        $("rit-clear").addEventListener("click", () => control("ritOffset", 0));

        // scope bar
        $("sc-mode").addEventListener("click", () => control("scopeMode", state?.scope.mode === "center" ? "fixed" : "center"));
        const spanBy = d => {
            const spans = tables.spans.length ? tables.spans : [5000, 10000, 20000, 50000, 100000, 200000, 500000, 1000000];
            const i = Math.max(0, spans.indexOf(state?.scope.spanHz ?? 50000));
            control("scopeSpan", spans[Math.max(0, Math.min(spans.length - 1, i + d))]);
        };
        $("sc-span-down").addEventListener("click", () => spanBy(-1));
        $("sc-span-up").addEventListener("click", () => spanBy(1));
        $("sc-ref-down").addEventListener("click", () => control("scopeRef", (state?.scope.ref ?? 0) - 1));
        $("sc-ref-up").addEventListener("click", () => control("scopeRef", (state?.scope.ref ?? 0) + 1));
        $("sc-speed").addEventListener("click", () => {
            const speeds = ["FAST", "MID", "SLOW"];
            control("scopeSpeed", speeds[(speeds.indexOf(state?.scope.speed ?? "MID") + 1) % 3]);
        });

        // PTT: hold
        const ptt = $("ptt");
        const pttOn = e => { e.preventDefault(); if (pttDown) return; pttDown = true; ptt.classList.add("on"); control("ptt", true); };
        const pttOff = () => { if (!pttDown) return; pttDown = false; ptt.classList.remove("on"); control("ptt", false); };
        ptt.addEventListener("pointerdown", pttOn);
        ptt.addEventListener("pointerup", pttOff);
        ptt.addEventListener("pointerleave", pttOff);
        ptt.addEventListener("pointercancel", pttOff);
        window.addEventListener("blur", pttOff);

        document.addEventListener("keydown", e => {
            if (e.target.closest("input, textarea")) return;
            if (e.code === "Space") { pttOn(e); return; }
            if (e.key === "ArrowUp" || e.key === "ArrowRight") { e.preventDefault(); tuneBy(step); }
            if (e.key === "ArrowDown" || e.key === "ArrowLeft") { e.preventDefault(); tuneBy(-step); }
        });
        document.addEventListener("keyup", e => { if (e.code === "Space") pttOff(); });

        // CW
        const sendCw = text => text.trim() && control("cwText", text.trim());
        $("cw-send").addEventListener("click", () => { sendCw($("cw-text").value); $("cw-text").select(); });
        $("cw-text").addEventListener("keydown", e => { if (e.key === "Enter") { sendCw($("cw-text").value); $("cw-text").select(); } });
        $("cw-stop").addEventListener("click", () => control("cwStop", true));
        renderMacros();

        // audio
        $("a-rx").addEventListener("click", () => (audio.ctx ? stopAudio() : startAudio()));
        $("a-vol").addEventListener("input", e => {
            $("a-vol-v").textContent = e.target.value;
            if (audio.gain) audio.gain.gain.value = Number(e.target.value) / 100;
        });

        const panel = localStorage.getItem("ic7300.panel");
        if (panel) document.querySelector(`#softkeys [data-panel="${panel}"]`)?.click();

        renderSteps();
        poll();
        connectScope();
        setInterval(() => {
            const now = new Date();
            $("clock").innerHTML = `${now.toISOString().slice(0, 10)} <b>${now.toISOString().slice(11, 19)}</b> UTC`;
        }, 1000);

    }

    /* ------------------------------------------------------------ CW macros */

    const DEFAULT_MACROS = ["CQ CQ DE {CALL} {CALL} K", "{CALL}", "TU 5NN", "QRZ?", "73 TU"];

    function macros() {
        try {
            const list = JSON.parse(localStorage.getItem("ic7300.macros") || "null");
            return Array.isArray(list) && list.length ? list : DEFAULT_MACROS;
        }
        catch {
            return DEFAULT_MACROS;
        }
    }

    let ownCall = "";
    fetch("/api/settings").then(r => r.json()).then(s => { ownCall = String(s.callsign || "").toUpperCase(); }).catch(() => undefined);

    function renderMacros() {
        const list = macros();
        $("cw-macros").innerHTML = list.map((m, i) => `<button class="k sm" data-macro="${i}" title="${m}">F${i + 1} ${m.replace(/\{CALL\}/g, ownCall || "CALL").slice(0, 18)}</button>`).join("");
    }

    $("cw-macros").addEventListener("click", e => {
        const b = e.target.closest("[data-macro]");
        if (!b) return;
        const text = macros()[Number(b.dataset.macro)].replace(/\{CALL\}/g, ownCall);
        control("cwText", text);
    });

    $("cw-macros").addEventListener("contextmenu", e => {
        const b = e.target.closest("[data-macro]");
        if (!b) return;
        e.preventDefault();
        const list = macros();
        const value = window.prompt(`Macro F${Number(b.dataset.macro) + 1}:`, list[Number(b.dataset.macro)]);
        if (value === null) return;
        list[Number(b.dataset.macro)] = value.toUpperCase();
        try { localStorage.setItem("ic7300.macros", JSON.stringify(list)); } catch { /* ignore */ }
        renderMacros();
    });

    /* ------------------------------------------------------------ scope */

    const spectrum = $("spectrum");
    const waterfall = $("waterfall");
    const sctx = spectrum.getContext("2d");
    const wctx = waterfall.getContext("2d", { willReadFrequently: false });
    let lastLine = null;
    let peak = null;

    // waterfall palette: deep blue -> cyan -> yellow -> red (Icom style)
    const PALETTE = (() => {
        const stops = [[0, [2, 6, 22]], [0.25, [10, 40, 140]], [0.45, [20, 140, 230]], [0.62, [90, 230, 230]],
            [0.78, [250, 240, 80]], [0.9, [255, 140, 30]], [1, [255, 40, 40]]];
        const table = new Uint8ClampedArray(161 * 3);
        for (let v = 0; v <= 160; v++) {
            const x = v / 160;
            let i = 1;
            while (i < stops.length - 1 && x > stops[i][0]) i++;
            const [x0, c0] = stops[i - 1];
            const [x1, c1] = stops[i];
            const t = Math.max(0, Math.min(1, (x - x0) / (x1 - x0)));
            for (let k = 0; k < 3; k++) table[v * 3 + k] = c0[k] + (c1[k] - c0[k]) * t;
        }
        return table;
    })();

    function sizeCanvases() {
        const ratio = Math.min(2, window.devicePixelRatio || 1);
        for (const c of [spectrum, waterfall]) {
            const w = Math.round(c.clientWidth * ratio);
            const h = Math.round(c.clientHeight * ratio);
            if (c.width !== w || c.height !== h) {
                // keep the waterfall when resizing
                const copy = c === waterfall && c.width ? wctx.getImageData(0, 0, c.width, c.height) : null;
                c.width = w;
                c.height = h;
                if (copy) wctx.putImageData(copy, 0, 0);
            }
        }
    }

    window.addEventListener("resize", sizeCanvases);

    function drawSpectrum(line) {

        const w = spectrum.width;
        const h = spectrum.height;
        const n = line.data.length;

        sctx.fillStyle = "#01040a";
        sctx.fillRect(0, 0, w, h);

        // grid + frequency labels
        sctx.strokeStyle = "#0f2036";
        sctx.lineWidth = 1;
        sctx.font = `${Math.round(h / 13)}px system-ui, sans-serif`;
        sctx.fillStyle = "#5c7391";
        for (let i = 1; i < 10; i++) {
            const x = Math.round(w * i / 10) + 0.5;
            sctx.beginPath(); sctx.moveTo(x, 0); sctx.lineTo(x, h); sctx.stroke();
        }
        for (let i = 1; i < 4; i++) {
            const y = Math.round(h * i / 4) + 0.5;
            sctx.beginPath(); sctx.moveTo(0, y); sctx.lineTo(w, y); sctx.stroke();
        }
        for (let i = 0; i <= 10; i += 2) {
            const hz = line.low + (line.high - line.low) * i / 10;
            const label = (hz / 1e6).toFixed(line.high - line.low < 100_000 ? 3 : 2);
            const x = Math.min(w - sctx.measureText(label).width - 4, Math.max(4, w * i / 10 - sctx.measureText(label).width / 2));
            sctx.fillText(label, x, h - 6);
        }

        // peak hold (slowly falling)
        if (!peak || peak.length !== n) peak = new Float32Array(n);
        for (let i = 0; i < n; i++) peak[i] = Math.max(line.data[i], peak[i] - 0.6);

        const y = v => h - 4 - v / 160 * (h - 20);

        sctx.beginPath();
        sctx.moveTo(0, h);
        for (let i = 0; i < n; i++) sctx.lineTo(i / (n - 1) * w, y(line.data[i]));
        sctx.lineTo(w, h);
        sctx.closePath();
        const fill = sctx.createLinearGradient(0, 0, 0, h);
        fill.addColorStop(0, "rgba(120, 190, 255, .75)");
        fill.addColorStop(1, "rgba(20, 70, 160, .25)");
        sctx.fillStyle = fill;
        sctx.fill();

        sctx.beginPath();
        for (let i = 0; i < n; i++) sctx.lineTo(i / (n - 1) * w, y(line.data[i]));
        sctx.strokeStyle = "#eaf4ff";
        sctx.lineWidth = Math.max(1, w / 900);
        sctx.stroke();

        sctx.beginPath();
        for (let i = 0; i < n; i++) sctx.lineTo(i / (n - 1) * w, y(peak[i]));
        sctx.strokeStyle = "rgba(255, 200, 61, .45)";
        sctx.lineWidth = 1;
        sctx.stroke();

        // operating frequency marker + filter band
        const f = pending ? localFreq : state?.frequency;
        if (f && f >= line.low && f <= line.high) {
            const x = (f - line.low) / (line.high - line.low) * w;
            const bw = state?.mode === "CW" || state?.mode === "CW-R" ? 500 : state?.mode === "AM" ? 6000 : state?.mode === "FM" ? 12000 : 2700;
            const side = state?.mode === "LSB" ? -1 : state?.mode === "USB" || state?.dataMode ? 1 : 0;
            const px = bw / (line.high - line.low) * w;
            sctx.fillStyle = "rgba(61, 139, 255, .18)";
            if (side === 1) sctx.fillRect(x, 0, px, h);
            else if (side === -1) sctx.fillRect(x - px, 0, px, h);
            else sctx.fillRect(x - px / 2, 0, px, h);
            sctx.fillStyle = state?.tx ? "#ff4141" : "#ffd23d";
            sctx.fillRect(Math.round(x) - 1, 0, 2, h);
        }

        if (line.oor) {
            sctx.fillStyle = "#ff6d6d";
            sctx.fillText("OUT OF RANGE", 8, 18);
        }

    }

    function drawWaterfall(line) {
        const w = waterfall.width;
        const h = waterfall.height;
        // scroll down by one row
        wctx.drawImage(waterfall, 0, 0, w, h - 1, 0, 1, w, h - 1);
        const row = wctx.createImageData(w, 1);
        const n = line.data.length;
        for (let x = 0; x < w; x++) {
            const v = Math.min(160, line.data[Math.min(n - 1, Math.floor(x / w * n))]);
            row.data[x * 4] = PALETTE[v * 3];
            row.data[x * 4 + 1] = PALETTE[v * 3 + 1];
            row.data[x * 4 + 2] = PALETTE[v * 3 + 2];
            row.data[x * 4 + 3] = 255;
        }
        wctx.putImageData(row, 0, 0);
    }

    function connectScope() {

        sizeCanvases();

        const socket = new WebSocket(`${location.protocol === "https:" ? "wss:" : "ws:"}//${location.host}/ic7300-scope`);
        socket.binaryType = "arraybuffer";

        socket.onmessage = e => {
            const view = new DataView(e.data);
            const line = {
                low: view.getFloat64(0, true),
                high: view.getFloat64(8, true),
                oor: view.getUint8(16) === 1,
                data: new Uint8Array(e.data, 18)
            };
            lastLine = line;
            $("scope-msg").style.display = "none";
            sizeCanvases();
            drawSpectrum(line);
            drawWaterfall(line);
        };

        socket.onclose = () => {
            $("scope-msg").style.display = "";
            $("scope-msg").textContent = "Scope connection lost - reconnecting …";
            setTimeout(connectScope, 3000);
        };

    }

    // click / hover in the scope: tune
    const scopeHz = e => {
        if (!lastLine) return null;
        const r = $("scope").getBoundingClientRect();
        const x = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
        return lastLine.low + x * (lastLine.high - lastLine.low);
    };

    $("scope").addEventListener("click", e => {
        const hz = scopeHz(e);
        if (hz === null) return;
        // CW: put the signal on the pitch; SSB: round to 100 Hz
        const snap = state?.mode === "CW" ? 10 : 100;
        setFreq(Math.round(hz / snap) * snap);
    });

    $("scope").addEventListener("mousemove", e => {
        const hz = scopeHz(e);
        const tip = $("scope-hover");
        if (hz === null) { tip.style.display = "none"; return; }
        const r = $("scope").getBoundingClientRect();
        tip.style.display = "block";
        tip.textContent = `${(hz / 1e6).toFixed(4)} MHz`;
        tip.style.left = `${Math.min(r.width - 110, Math.max(4, e.clientX - r.left + 10))}px`;
    });

    $("scope").addEventListener("mouseleave", () => { $("scope-hover").style.display = "none"; });

    $("scope").addEventListener("wheel", e => {
        e.preventDefault();
        tuneBy(e.deltaY < 0 ? step : -step);
    }, { passive: false });

    /* ------------------------------------------------------------ RX audio */

    const audio = { socket: null, ctx: null, node: null, gain: null, ring: new Float32Array(48000), read: 0, write: 0, odd: null };

    function audioAvailable() {
        return (audio.write - audio.read + audio.ring.length) % audio.ring.length;
    }

    function pushPcm(buffer) {
        const bytes = new Uint8Array(buffer);
        let i = 0;
        const push = v => {
            audio.ring[audio.write] = (v < 0x8000 ? v : v - 0x10000) / 32768;
            audio.write = (audio.write + 1) % audio.ring.length;
            if (audio.write === audio.read) audio.read = (audio.read + 1) % audio.ring.length;
        };
        if (audio.odd !== null && bytes.length) { push(audio.odd | (bytes[0] << 8)); audio.odd = null; i = 1; }
        for (; i + 1 < bytes.length; i += 2) push(bytes[i] | (bytes[i + 1] << 8));
        if (i < bytes.length) audio.odd = bytes[i];
        while (audioAvailable() > 19200) audio.read = (audio.read + 1) % audio.ring.length;
    }

    function startAudio() {
        audio.ctx = new AudioContext({ sampleRate: 48000 });
        audio.gain = audio.ctx.createGain();
        audio.gain.gain.value = Number($("a-vol").value) / 100;
        audio.node = audio.ctx.createScriptProcessor(2048, 0, 1);
        audio.node.onaudioprocess = e => {
            const out = e.outputBuffer.getChannelData(0);
            for (let i = 0; i < out.length; i++) {
                if (audioAvailable() > 0) {
                    out[i] = audio.ring[audio.read];
                    audio.read = (audio.read + 1) % audio.ring.length;
                }
                else out[i] = 0;
            }
        };
        audio.node.connect(audio.gain).connect(audio.ctx.destination);
        audio.socket = new WebSocket(`${location.protocol === "https:" ? "wss:" : "ws:"}//${location.host}/audio`);
        audio.socket.binaryType = "arraybuffer";
        audio.socket.onmessage = e => pushPcm(e.data);
        audio.socket.onclose = () => { if (audio.ctx) { stopAudio(); toast("Audio connection closed"); } };
        $("a-rx").classList.add("on");
        $("a-rx").textContent = "RX AUDIO OFF";
    }

    function stopAudio() {
        try { audio.socket?.close(); } catch { /* ignore */ }
        try { audio.node?.disconnect(); } catch { /* ignore */ }
        audio.ctx?.close().catch(() => undefined);
        audio.socket = audio.ctx = audio.node = audio.gain = null;
        audio.read = audio.write = 0;
        $("a-rx").classList.remove("on");
        $("a-rx").textContent = "RX AUDIO ON";
    }

    init();

})();
