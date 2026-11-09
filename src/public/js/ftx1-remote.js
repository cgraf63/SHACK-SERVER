/*
 * SHACK-SERVER - dedicated Yaesu FTX-1 remote (/ftx1)
 *
 * Controls the ACTIVE transceiver (selected in the dashboard) through
 * /api/ftx1. Display modelled on the FTX-1: MAIN and SUB stacked,
 * bar-graph meters, touch keys; tuning dial with steps.
 */

(function () {

    "use strict";

    const $ = id => document.getElementById(id);

    /* ------------------------------------------------------------
       Tables
       ------------------------------------------------------------ */

    const BANDS = [
        ["00", "160 m"], ["01", "80 m"], ["02", "60 m"], ["03", "40 m"], ["04", "30 m"],
        ["05", "20 m"], ["06", "17 m"], ["07", "15 m"], ["08", "12 m"], ["09", "10 m"],
        ["10", "6 m"], ["13", "2 m"], ["14", "70 cm"], ["12", "AIR"], ["11", "GEN"]
    ];

    const MODE_GROUPS = [
        ["SSB", ["LSB", "USB"]],
        ["CW", ["CW-U", "CW-L"]],
        ["AM", ["AM", "AM-N"]],
        ["FM", ["FM", "FM-N"]],
        ["C4FM DIGITAL", ["C4FM-DN", "C4FM-VW"]],
        ["DATA", ["DATA-U", "DATA-L", "DATA-FM", "DATA-FM-N"]],
        ["RTTY / PSK", ["RTTY-U", "RTTY-L", "PSK"]]
    ];

    /* SH width codes (CAT manual table 5) */
    const WIDTH_SSB = [0, 300, 400, 600, 850, 1100, 1200, 1500, 1650, 1800, 1950, 2100, 2250, 2400, 2450, 2500, 2600, 2700, 2800, 2900, 3000, 3200, 3500, 4000];
    const WIDTH_NARROW = [0, 50, 100, 150, 200, 250, 300, 350, 400, 450, 500, 600, 800, 1200, 1400, 1700, 2000, 2400, 3000, 3200, 3500, 4000];

    const AGC = [["OFF", 0], ["FAST", 1], ["MID", 2], ["SLOW", 3], ["AUTO", 4]];
    const SHIFT = [["SIMP", 0], ["+", 1], ["−", 2], ["ARS", 3]];
    const TONE = [["OFF", 0], ["ENC", 1], ["TSQ", 2], ["DCS", 3]];
    const STEPS = [10, 100, 500, 1000, 5000, 12500, 25000];

    let state = null;
    let tables = null;
    let side = "MAIN";           // side the controls act on
    let step = Number(localGet("ftx1-step")) || 100;
    let pane = localGet("ftx1-pane") || "band";

    function localGet(key) { try { return localStorage.getItem(key); } catch { return null; } }
    function localSet(key, value) { try { localStorage.setItem(key, value); } catch { /* ignore */ } }

    /* ------------------------------------------------------------
       API
       ------------------------------------------------------------ */

    let toastTimer = null;

    function toast(text) {
        const el = $("toast");
        el.textContent = text;
        el.classList.add("show");
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => el.classList.remove("show"), 3200);
    }

    async function control(name, value) {
        try {
            const response = await fetch("/api/ftx1/control", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ control: name, value })
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
            holdUntil = Date.now() + 900;
            setTimeout(poll, 250);
            return true;
        }
        catch (error) {
            toast(`${name}: ${error.message}`);
            return false;
        }
    }

    /* controls that belong to one receiver: select it first */
    async function sideControl(name, value) {
        if (state && state.activeSide !== side) await control("side", side);
        return control(name, value);
    }

    /* ------------------------------------------------------------
       Display
       ------------------------------------------------------------ */

    function buildBars() {
        for (const id of ["m-bar", "s-bar"]) {
            $(id).innerHTML = Array.from({ length: 40 }, (_, i) => `<span class="${i >= 24 ? "over" : ""}"></span>`).join("");
        }
        for (const id of ["b-po", "b-swr", "b-alc"]) {
            $(id).innerHTML = Array.from({ length: 24 }, () => "<span></span>").join("");
        }
    }

    /* raw 0-255 -> S units on a 0..40 segment scale (S9 = segment 24) */
    function sSegments(raw) {
        const v = Math.max(0, Math.min(255, Number(raw) || 0));
        // Yaesu: about S5 = 70, S7 = 103, S9 = 132
        let s;
        if (v <= 70) s = v / 70 * 5;
        else if (v <= 103) s = 5 + (v - 70) / 33 * 2;
        else if (v <= 132) s = 7 + (v - 103) / 29 * 2;
        else s = 9 + (v - 132) / 123 * 6; // +60 dB = 6 "units"
        return Math.round(s / 15 * 40);
    }

    function lightBar(id, lit) {
        const spans = $(id).children;
        for (let i = 0; i < spans.length; i++) spans[i].classList.toggle("lit", i < lit);
    }

    function swrFromRaw(raw) {
        const v = Number(raw) || 0;
        // approximate Yaesu scale: 0 = 1.0, 48 = 1.5, 80 = 2.0, 120 = 3.0
        if (v <= 48) return 1 + v / 48 * 0.5;
        if (v <= 80) return 1.5 + (v - 48) / 32 * 0.5;
        if (v <= 120) return 2 + (v - 80) / 40;
        return 3 + (v - 120) / 45;
    }

    function freqHtml(hz) {
        const f = Math.round(Number(hz) || 0);
        if (!f) return "--.---.---";
        const mhz = Math.floor(f / 1e6);
        const khz = String(Math.floor((f % 1e6) / 1000)).padStart(3, "0");
        const rest = String(f % 1000).padStart(3, "0");
        return `${mhz}.${khz}<span class="hz">.${rest}</span>`;
    }

    function ind(id, on, text, cls) {
        const el = $(id);
        if (text !== undefined) el.textContent = text;
        el.className = `ind${on ? " on" : ""}${on && cls ? " " + cls : ""}${el.id === "i-head" ? " right" : ""}`;
    }

    function current() {
        return state ? (side === "SUB" ? state.sub : state.main) : null;
    }

    function isNarrowMode(mode) {
        return /^(CW|RTTY|DATA-[LU]|PSK)/.test(String(mode));
    }

    function render() {

        if (!state) return;

        const m = state.main;
        const s = state.sub;
        const c = current();

        // frequencies (not while the user is tuning / typing)
        if (!(tuning.side === "MAIN" && Date.now() < tuning.holdUntil) && !$("m-freq").querySelector("input")) {
            $("m-freq").innerHTML = freqHtml(m.frequency);
        }
        if (!(tuning.side === "SUB" && Date.now() < tuning.holdUntil) && !$("s-freq").querySelector("input")) {
            $("s-freq").innerHTML = freqHtml(s.frequency);
        }

        $("m-mode").textContent = m.mode;
        $("s-mode").textContent = s.mode;
        const where = sd => sd.memoryMode ? `M-${String(sd.memoryChannel).padStart(2, "0")}${sd.memoryName ? " " + sd.memoryName : ""}` : sd.band;
        $("m-band").textContent = where(m);
        $("s-band").textContent = where(s);

        const tone = sd => sd.toneModeCode ? `<span class="ind on">${sd.toneMode}</span>` : "";
        const shift = sd => sd.rptShiftCode ? `<span class="ind on">${sd.rptShift}</span>` : "";
        $("m-badges").innerHTML = shift(m) + tone(m);
        $("s-badges").innerHTML = shift(s) + tone(s);

        $("vfo-main").classList.toggle("active", side === "MAIN");
        $("vfo-sub").classList.toggle("active", side === "SUB");

        // TX side: split = SUB transmits
        const txSub = state.txSide === "SUB";
        $("vfo-main").classList.toggle("txside", !txSub);
        $("vfo-sub").classList.toggle("txside", txSub);

        lightBar("m-bar", state.tx && !txSub ? 0 : sSegments(m.smeter));
        lightBar("s-bar", state.tx && txSub ? 0 : sSegments(s.smeter));

        // TX meters
        const range = state.powerRange || { max: 10 };
        const po = state.tx ? (state.meters.po / 255) * range.max : 0;
        const swr = swrFromRaw(state.meters.swr);
        lightBar("b-po", state.tx ? Math.round(state.meters.po / 255 * 24) : 0);
        lightBar("b-swr", state.tx ? Math.round(Math.min(swr - 1, 2) / 2 * 24) : 0);
        lightBar("b-alc", state.tx ? Math.round(state.meters.alc / 255 * 24) : 0);
        $("t-po").textContent = state.tx ? `${po.toFixed(po < 10 ? 1 : 0)} W` : "0";
        $("t-swr").textContent = state.tx ? swr.toFixed(1) : "–";
        $("t-alc").textContent = state.tx ? `${Math.round(state.meters.alc / 255 * 100)} %` : "0";

        // status line
        ind("i-tx", true, state.tx ? "TX" : "RX", state.tx ? "red" : "");
        ind("i-split", state.split, "SPLIT", "orange");
        ind("i-att", state.attenuator, "ATT");
        ind("i-pre", state.preamp !== "IPO" && state.preamp !== "PRE OFF", state.preamp, "blue");
        ind("i-agc", true, `AGC ${c.agc}`);
        ind("i-nar", c.narrow, "NAR");
        ind("i-dnr", c.dnrLevel > 0, c.dnrLevel > 0 ? `DNR ${c.dnrLevel}` : "DNR", "blue");
        ind("i-nb", c.nbLevel > 0, c.nbLevel > 0 ? `NB ${c.nbLevel}` : "NB", "blue");
        ind("i-dnf", c.dnf, "DNF", "blue");
        ind("i-notch", c.notch, "NOTCH", "blue");
        ind("i-cont", c.contour, "CONT", "blue");
        ind("i-tone", c.toneModeCode > 0, c.toneModeCode === 3 ? `DCS ${String(state.dcs).padStart(3, "0")}` : c.toneModeCode ? `${c.toneMode} ${state.ctcss.toFixed(1)}` : "TONE");
        ind("i-mem", c.memoryMode, c.memoryMode ? `MEM ${String(c.memoryChannel).padStart(2, "0")}` : "MEM", "mem-on");
        ind("i-head", true, state.head === "spa1" ? "SPA-1" : state.head === "field" ? "FIELD" : "—");
        ind("i-pwr", true, `${Number(state.power).toFixed(state.power < 10 && state.power % 1 ? 1 : 0)} W`);

        // header
        $("radio-name").textContent = state.name || "REMOTE";
        $("pwr").classList.toggle("on", state.poweredOn);
        $("link").classList.toggle("ok", state.connected && state.alive);
        $("link-text").textContent = !state.connected ? "CAT CLOSED" : state.alive ? "CONNECTED" : "NO ANSWER";

        // side selector + names
        document.querySelectorAll(".sidesel button").forEach(b => b.classList.toggle("sel", b.dataset.side === side));
        document.querySelectorAll(".side-name").forEach(el => { el.textContent = side; });

        // buttons on the right
        $("ptt").classList.toggle("on", state.tx);
        $("split").classList.toggle("on", state.split);
        $("tune").classList.toggle("on", state.tuning);

        renderPanes();

    }

    /* ------------------------------------------------------------
       Control panes
       ------------------------------------------------------------ */

    const busy = new Set();     // sliders being dragged

    function setSlider(id, value, text) {
        const input = $(id);
        if (!busy.has(id)) input.value = value;
        const out = input.parentElement.querySelector("output");
        if (out && text !== undefined && !busy.has(id)) out.textContent = text;
    }

    function setToggle(id, on) {
        $(id).classList.toggle("on", Boolean(on));
    }

    function hz(v) {
        return v >= 1000 ? `${(v / 1000).toFixed(2)} kHz` : `${v} Hz`;
    }

    function widthTable(mode) {
        if (/^(AM|FM|C4FM|DATA-FM)/.test(String(mode))) return null;
        return isNarrowMode(mode) ? WIDTH_NARROW : WIDTH_SSB;
    }

    function renderPanes() {

        const c = current();
        const t = widthTable(c.mode);

        // band / mode highlight
        document.querySelectorAll("#band-grid .k").forEach(b => b.classList.toggle("on", c.band.replace(" ", "") === b.textContent.replace(" ", "")));
        document.querySelectorAll("#mode-groups .k").forEach(b => b.classList.toggle("on", b.dataset.mode === c.mode));

        // filter
        $("f-width").disabled = !t;
        $("f-width").max = t ? String(t.length - 1) : "23";
        setSlider("f-width", c.width, t ? (c.width === 0 ? "DEFAULT" : hz(t[c.width] ?? 0)) : "fixed");
        setSlider("f-shift", c.shift, `${c.shift > 0 ? "+" : ""}${c.shift} Hz`);
        setToggle("f-nar", c.narrow);
        setToggle("f-cont", c.contour);
        setSlider("f-contf", c.contourFrequency, hz(c.contourFrequency));
        setToggle("f-apf", c.apf);
        setSlider("f-apfo", c.apfOffset, `${c.apfOffset > 0 ? "+" : ""}${c.apfOffset} Hz`);

        // dsp
        setToggle("d-dnr", c.dnrLevel > 0);
        setSlider("d-dnrl", c.dnrLevel || 5, c.dnrLevel ? String(c.dnrLevel) : "off");
        setToggle("d-nb", c.nbLevel > 0);
        setSlider("d-nbl", c.nbLevel || 5, c.nbLevel ? String(c.nbLevel) : "off");
        setToggle("d-dnf", c.dnf);
        setToggle("d-notch", c.notch);
        setSlider("d-notchf", c.notchFrequency, hz(c.notchFrequency));

        // rx
        setSlider("r-af", c.afGain, String(Math.round(c.afGain / 2.55)));
        setSlider("r-rf", c.rfGain, String(Math.round(c.rfGain / 2.55)));
        setSlider("r-sql", c.squelch, String(Math.round(c.squelch / 2.55)));
        setToggle("r-att", state.attenuator);

        const hf = state.preampGroup === "HF";
        $("pre-label").textContent = `PREAMP (${state.preampGroup})`;
        const preNames = hf ? [["IPO", 0], ["AMP1", 1], ["AMP2", 2]] : [["OFF", 0], ["ON", 1]];
        const preRow = $("pre-row");
        if (preRow.dataset.kind !== state.preampGroup) {
            preRow.dataset.kind = state.preampGroup;
            preRow.innerHTML = preNames.map(([n, v]) => `<button class="k" type="button" data-pre="${v}">${n}</button>`).join("");
        }
        preRow.querySelectorAll("[data-pre]").forEach(b => b.classList.toggle("on", Number(b.dataset.pre) === state.preampCode));

        $("agc-row").querySelectorAll("[data-agc]").forEach(b => {
            const name = b.textContent;
            b.classList.toggle("on", name === "AUTO" ? c.agc.startsWith("AUTO") : c.agc === name);
        });

        // fm
        $("fm-shift").querySelectorAll("[data-shift]").forEach(b => b.classList.toggle("on", Number(b.dataset.shift) === c.rptShiftCode));
        $("fm-tone").querySelectorAll("[data-tone]").forEach(b => b.classList.toggle("on", Number(b.dataset.tone) === c.toneModeCode));
        if (document.activeElement !== $("fm-ctcss")) $("fm-ctcss").value = String(state.ctcssIndex);
        if (document.activeElement !== $("fm-dcs")) $("fm-dcs").value = String(state.dcsIndex);

        // tx
        const range = state.powerRange || { min: 0.5, max: 10, step: 0.5, note: "" };
        const power = $("t-power");
        power.min = String(range.min);
        power.max = String(range.max);
        power.step = String(range.step);
        setSlider("t-power", state.power, `${state.power} W`);
        $("power-note").textContent = range.note || "";
        setSlider("t-mic", state.micGain, String(state.micGain));
        setSlider("t-moni", state.monitor, String(state.monitor));
        setToggle("t-proc", c.processor);
        setToggle("t-eq", state.micEq);

        // cw
        setSlider("c-speed", state.cwSpeed, `${state.cwSpeed} WPM`);
        setToggle("c-bkin", state.breakIn);
        state.cwMemories.forEach((text, i) => {
            const span = $(`cw-text-${i + 1}`);
            if (span) span.textContent = text || "(empty)";
        });

        // memory scan progress (state carries it)
        const scan = state.memoryScan;
        if (scan) {
            $("mem-scan").disabled = scan.running;
            $("mem-scan").textContent = scan.running ? `READING ${scan.done} / ${scan.total}` : "READ CHANNELS";
            if (memScanRunning && !scan.running) void loadMemories();
            memScanRunning = scan.running;
        }
        $("mem-vfo").classList.toggle("on", !c.memoryMode);
        document.querySelectorAll(".mem").forEach(el => el.classList.toggle("cur", c.memoryMode && Number(el.dataset.ch) === c.memoryChannel));

    }

    function buildPanes() {

        $("band-grid").innerHTML = BANDS.map(([code, name]) =>
            `<button class="k" type="button" data-band="${code}">${name}</button>`).join("");

        $("mode-groups").innerHTML = MODE_GROUPS.map(([title, modes]) =>
            `<div class="group"><label>${title}</label><div class="grid">${modes.map(mode =>
                `<button class="k" type="button" data-mode="${mode}">${mode.replace("C4FM-", "C4FM ")}</button>`).join("")}</div></div>`).join("");

        $("agc-row").innerHTML = AGC.map(([n, v]) => `<button class="k" type="button" data-agc="${v}">${n}</button>`).join("");
        $("fm-shift").innerHTML = SHIFT.map(([n, v]) => `<button class="k" type="button" data-shift="${v}">${n}</button>`).join("");
        $("fm-tone").innerHTML = TONE.map(([n, v]) => `<button class="k" type="button" data-tone="${v}">${n}</button>`).join("");

        $("cw-mems").innerHTML = [1, 2, 3, 4, 5].map(n =>
            `<div class="cwmem"><button class="k amber" type="button" data-cw="${n}">M${n}</button><span id="cw-text-${n}">—</span></div>`).join("") +
            `<div class="cwmem"><button class="k warn" type="button" data-cw="0">STOP</button><span>stop playback</span></div>`;

        $("steps").innerHTML = STEPS.map(s =>
            `<button type="button" data-step="${s}" class="${s === step ? "sel" : ""}">${s >= 1000 ? `${s / 1000} k` : s}</button>`).join("");

    }

    function showPane(name) {
        pane = name;
        localSet("ftx1-pane", name);
        document.querySelectorAll(".pane").forEach(p => p.classList.toggle("show", p.dataset.pane === name));
        document.querySelectorAll("#softkeys button").forEach(b => b.classList.toggle("sel", b.dataset.pane === name));
    }

    /* ------------------------------------------------------------
       Tuning: dial, wheel, keyboard, direct entry
       ------------------------------------------------------------ */

    const tuning = { side: "MAIN", target: 0, holdUntil: 0, timer: null, sending: false, angle: 0 };
    let holdUntil = 0;

    function tuneBy(steps) {

        if (!state) return;

        const now = Date.now();
        const base = tuning.side === side && now < tuning.holdUntil ? tuning.target : current().frequency;

        if (!base) return;

        tuning.side = side;
        tuning.target = Math.max(30000, Math.min(470e6, Math.round(base / step) * step + steps * step));
        tuning.holdUntil = now + 1200;

        $(side === "SUB" ? "s-freq" : "m-freq").innerHTML = freqHtml(tuning.target);

        scheduleSend();

    }

    /* at most ~12 frequency commands per second */
    function scheduleSend() {
        if (tuning.timer) return;
        tuning.timer = setTimeout(async () => {
            tuning.timer = null;
            const target = tuning.target;
            const name = tuning.side === "SUB" ? "frequencyB" : "frequency";
            await control(name, target);
            if (tuning.target !== target) scheduleSend();
        }, 80);
    }

    function rotateDial(deg) {
        tuning.angle = (tuning.angle + deg) % 360;
        $("dial").style.transform = `rotate(${tuning.angle}deg)`;
    }

    function setupDial() {

        const wrap = $("dial-wrap");
        let last = null;
        let acc = 0;

        const angleOf = e => {
            const r = wrap.getBoundingClientRect();
            return Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) * 180 / Math.PI;
        };

        wrap.addEventListener("pointerdown", e => {
            wrap.setPointerCapture(e.pointerId);
            last = angleOf(e);
            acc = 0;
        });

        wrap.addEventListener("pointermove", e => {
            if (last === null) return;
            const a = angleOf(e);
            let d = a - last;
            if (d > 180) d -= 360;
            if (d < -180) d += 360;
            last = a;
            rotateDial(d);
            acc += d;
            // one step per 8 degrees
            const steps = Math.trunc(acc / 8);
            if (steps) {
                acc -= steps * 8;
                tuneBy(steps);
            }
        });

        const end = () => { last = null; };
        wrap.addEventListener("pointerup", end);
        wrap.addEventListener("pointercancel", end);

        const wheel = e => {
            e.preventDefault();
            const steps = e.deltaY < 0 ? 1 : -1;
            rotateDial(steps * 8);
            tuneBy(steps);
        };

        wrap.addEventListener("wheel", wheel, { passive: false });
        $("m-freq").addEventListener("wheel", e => { selectSide("MAIN"); wheel(e); }, { passive: false });
        $("s-freq").addEventListener("wheel", e => { selectSide("SUB"); wheel(e); }, { passive: false });

    }

    function selectSide(name) {
        if (side === name) return;
        side = name;
        if (state) render();
        // the radio's VS follows, so that DSP / RX controls act on this side
        if (state && state.activeSide !== name) void control("side", name);
    }

    function directEntry(el, which) {

        if (el.querySelector("input")) return;

        const freq = (which === "SUB" ? state?.sub : state?.main)?.frequency || 0;
        el.innerHTML = `<input type="text" inputmode="decimal" value="${(freq / 1e6).toFixed(6)}">`;

        const input = el.querySelector("input");
        input.focus();
        input.select();

        const finish = async ok => {
            const mhz = Number(String(input.value).replace(",", "."));
            el.innerHTML = freqHtml(freq);
            if (!ok) return;
            if (!Number.isFinite(mhz) || mhz < 0.03 || mhz > 470) return toast("Frequency: 0.030 - 470 MHz");
            await control(which === "SUB" ? "frequencyB" : "frequency", Math.round(mhz * 1e6));
        };

        input.addEventListener("keydown", e => {
            if (e.key === "Enter") { e.preventDefault(); void finish(true); }
            if (e.key === "Escape") void finish(false);
        });
        input.addEventListener("blur", () => void finish(true), { once: true });

    }

    /* ------------------------------------------------------------
       PTT (hold), space bar
       ------------------------------------------------------------ */

    let pttOn = false;

    async function ptt(on) {
        if (pttOn === on) return;
        pttOn = on;
        $("ptt").classList.toggle("on", on);
        const ok = await control("ptt", on);
        if (!ok && on) pttOn = false;
    }

    function setupPtt() {

        const btn = $("ptt");

        btn.addEventListener("pointerdown", e => { btn.setPointerCapture(e.pointerId); void ptt(true); });
        btn.addEventListener("pointerup", () => void ptt(false));
        btn.addEventListener("pointercancel", () => void ptt(false));
        btn.addEventListener("contextmenu", e => e.preventDefault());

        const typing = () => ["INPUT", "SELECT", "TEXTAREA"].includes(document.activeElement?.tagName);

        document.addEventListener("keydown", e => {
            if (typing()) return;
            if (e.code === "Space" && !e.repeat) { e.preventDefault(); void ptt(true); }
            if (e.key === "ArrowUp" || e.key === "ArrowRight") { e.preventDefault(); tuneBy(1); }
            if (e.key === "ArrowDown" || e.key === "ArrowLeft") { e.preventDefault(); tuneBy(-1); }
        });
        document.addEventListener("keyup", e => {
            if (e.code === "Space") { e.preventDefault(); void ptt(false); }
        });

        // safety: never stay in TX when the page is left
        window.addEventListener("blur", () => { if (pttOn) void ptt(false); });
        window.addEventListener("pagehide", () => {
            if (pttOn) navigator.sendBeacon?.("/api/ftx1/control", new Blob([JSON.stringify({ control: "ptt", value: false })], { type: "application/json" }));
        });

    }

    /* ------------------------------------------------------------
       Remote RX audio (/audio: 48 kHz, 16 bit, mono)
       ------------------------------------------------------------ */

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
        // latency limit about 0.4 s
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

        const url = `${location.protocol === "https:" ? "wss:" : "ws:"}//${location.host}/audio`;
        audio.socket = new WebSocket(url);
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


    /* ------------------------------------------------------------
       Memory channels
       ------------------------------------------------------------ */

    let memories = [];
    let memScanRunning = false;

    function esc(text) {
        return String(text ?? "").replace(/[&<>"]/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
    }

    function mhz(hz) {
        const f = Number(hz) || 0;
        return f >= 1e8 ? (f / 1e6).toFixed(4) : (f / 1e6).toFixed(3);
    }

    async function loadMemories() {

        try {

            const response = await fetch("/api/ftx1/memories", { cache: "no-store" });
            if (!response.ok) return;

            const data = await response.json();
            memories = data.memories || [];

            const at = data.scan?.at ? new Date(data.scan.at).toLocaleString() : "";
            $("mem-info").textContent = memories.length
                ? `· ${memories.length} channels${at ? " · read " + at : ""}`
                : data.scan?.at ? "· no programmed channels" : "· not read yet";

            // first free channel as default
            if (!$("mem-ch").value) {
                const used = new Set(memories.map(m => m.channel));
                let free = 1;
                while (used.has(free) && free < 99) free++;
                $("mem-ch").value = String(free);
            }

            renderMemories();
            updateStoreInfo();

        }
        catch { /* later */ }

    }

    function renderMemories() {

        const q = $("mem-filter").value.trim().toUpperCase();
        const list = memories.filter(m => !q || m.name.toUpperCase().includes(q) || mhz(m.frequency).includes(q) || String(m.channel) === q);
        const c = current();

        $("mem-list").innerHTML = list.length
            ? list.map(m => `
                <div class="mem${c && c.memoryMode && c.memoryChannel === m.channel ? " cur" : ""}" data-ch="${m.channel}">
                    <span class="ch">${String(m.channel).padStart(2, "0")}</span>
                    <span class="nm">${esc(m.name || "—")}<small>${mhz(m.frequency)} MHz · ${esc(m.mode)}${m.shift ? " · " + esc(m.shift) : ""}${m.tone ? " · " + esc(m.tone) : ""}</small></span>
                    <span class="acts">
                        <button class="k" type="button" data-recall="MAIN" title="Recall on MAIN">MAIN</button>
                        <button class="k" type="button" data-recall="SUB" title="Recall on SUB">SUB</button>
                        <button class="k" type="button" data-rename title="Change name">✎</button>
                    </span>
                </div>`).join("")
            : `<p class="hint">${memories.length ? "No channel matches." : "Press READ CHANNELS to read the memory channels from the FTX-1 (about 10 seconds)."}</p>`;

    }

    function updateStoreInfo() {
        const ch = Number($("mem-ch").value);
        const used = memories.find(m => m.channel === ch);
        $("mem-store-info").textContent = used
            ? `⚠ channel ${ch} holds ${used.name || "(no name)"} ${mhz(used.frequency)} MHz - will be overwritten`
            : ch >= 1 && ch <= 99 ? `channel ${ch} is free` : "";
    }

    async function storeMemory() {

        const ch = Number($("mem-ch").value);
        const name = $("mem-name").value.trim().toUpperCase();
        const c = current();

        if (!Number.isInteger(ch) || ch < 1 || ch > 99) return toast("Channel 1 - 99");
        if (!c || !c.frequency) return toast("No frequency");

        const used = memories.find(m => m.channel === ch);
        const what = `${mhz(c.frequency)} MHz ${c.mode}${name ? " \"" + name + "\"" : ""}`;

        if (!confirm(used
            ? `Overwrite channel ${ch} (${used.name || "no name"}, ${mhz(used.frequency)} MHz) with ${what}?`
            : `Store ${what} in channel ${ch}?`)) return;

        $("mem-store").disabled = true;

        try {
            const response = await fetch("/api/ftx1/memories/store", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ channel: ch, from: side, name })
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
            toast(`✔ Channel ${ch} stored`);
            $("mem-name").value = "";
            $("mem-ch").value = "";
            await loadMemories();
        }
        catch (error) {
            toast(`Store: ${error.message}`);
        }
        finally {
            $("mem-store").disabled = false;
        }

    }

    async function renameMemory(ch) {

        const m = memories.find(x => x.channel === ch);
        const name = prompt(`Name for channel ${ch} (max. 12 characters)`, m?.name || "");

        if (name === null) return;

        try {
            const response = await fetch("/api/ftx1/memories/rename", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ channel: ch, name: name.toUpperCase().slice(0, 12) })
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
            await loadMemories();
        }
        catch (error) {
            toast(`Name: ${error.message}`);
        }

    }

    function setupMemories() {

        on("mem-scan", "click", async () => {
            if (await control("memoryScan", true)) {
                memScanRunning = true;
                $("mem-scan").disabled = true;
            }
        });
        on("mem-vfo", "click", () => void control("vfoMode", true));
        on("mem-up", "click", () => void control("channelUp", true));
        on("mem-down", "click", () => void control("channelDown", true));
        on("mem-qi", "click", () => void control("qmbStore", true));
        on("mem-qr", "click", () => void control("qmbRecall", true));
        on("mem-filter", "input", renderMemories);
        on("mem-ch", "input", updateStoreInfo);
        on("mem-store", "click", () => void storeMemory());
        on("mem-name", "keydown", e => { if (e.key === "Enter") void storeMemory(); });

        on("mem-list", "click", e => {
            const row = e.target.closest(".mem");
            if (!row) return;
            const ch = Number(row.dataset.ch);
            const recall = e.target.closest("[data-recall]");
            if (recall) {
                const target = recall.dataset.recall;
                selectSide(target);
                void control(target === "SUB" ? "memoryRecallSub" : "memoryRecall", ch);
                return;
            }
            if (e.target.closest("[data-rename]")) void renameMemory(ch);
        });

    }

    /* ------------------------------------------------------------
       Events
       ------------------------------------------------------------ */

    function on(id, event, fn) {
        $(id).addEventListener(event, fn);
    }

    /* slider: live label while dragging, command on release */
    function slider(id, format, send) {
        const input = $(id);
        const out = input.parentElement.querySelector("output");
        input.addEventListener("input", () => {
            busy.add(id);
            if (out) out.textContent = format(Number(input.value));
        });
        input.addEventListener("change", async () => {
            await send(Number(input.value));
            busy.delete(id);
        });
    }

    function setupEvents() {

        on("softkeys", "click", e => {
            const b = e.target.closest("[data-pane]");
            if (b) showPane(b.dataset.pane);
        });

        document.querySelectorAll(".sidesel button").forEach(b => b.addEventListener("click", () => selectSide(b.dataset.side)));

        on("vfo-main", "click", e => { if (!e.target.closest(".freq")) selectSide("MAIN"); });
        on("vfo-sub", "click", e => { if (!e.target.closest(".freq")) selectSide("SUB"); });
        on("m-freq", "click", () => { selectSide("MAIN"); directEntry($("m-freq"), "MAIN"); });
        on("s-freq", "click", () => { selectSide("SUB"); directEntry($("s-freq"), "SUB"); });

        on("steps", "click", e => {
            const b = e.target.closest("[data-step]");
            if (!b) return;
            step = Number(b.dataset.step);
            localSet("ftx1-step", String(step));
            document.querySelectorAll("#steps button").forEach(x => x.classList.toggle("sel", x === b));
        });

        on("band-grid", "click", e => {
            const b = e.target.closest("[data-band]");
            if (b) void control(side === "SUB" ? "bandB" : "band", b.dataset.band);
        });

        on("mode-groups", "click", e => {
            const b = e.target.closest("[data-mode]");
            if (b) void control(side === "SUB" ? "modeB" : "mode", b.dataset.mode);
        });

        on("tune", "click", () => void control("tune", true));
        on("t-tunestop", "click", () => void control("tuneStop", true));
        on("split", "click", () => void control("split", !state?.split));
        on("swap", "click", () => void control("swap", true));
        on("t-a2b", "click", () => void control("mainToSub", true));
        on("t-b2a", "click", () => void control("subToMain", true));

        on("pwr", "click", () => {
            if (!state) return;
            const off = state.poweredOn;
            if (off && !confirm("Switch the FTX-1 off?")) return;
            void control("powerSwitch", !off);
        });

        // filter
        slider("f-width", v => { const t = widthTable(current()?.mode); return !t ? "fixed" : v === 0 ? "DEFAULT" : hz(t[v] ?? 0); }, v => sideControl("width", v));
        slider("f-shift", v => `${v > 0 ? "+" : ""}${v} Hz`, v => sideControl("shift", v));
        on("f-nar", "click", () => void sideControl("narrow", !current().narrow));
        on("f-cont", "click", () => void sideControl("contour", !current().contour));
        slider("f-contf", hz, v => sideControl("contourFrequency", v));
        on("f-apf", "click", () => void sideControl("apf", !current().apf));
        slider("f-apfo", v => `${v > 0 ? "+" : ""}${v} Hz`, v => sideControl("apfOffset", v));

        // dsp
        on("d-dnr", "click", () => void sideControl("dnr", !(current().dnrLevel > 0)));
        slider("d-dnrl", v => String(v), v => sideControl("dnrLevel", v));
        on("d-nb", "click", () => void sideControl("nb", !(current().nbLevel > 0)));
        slider("d-nbl", v => String(v), v => sideControl("nbLevel", v));
        on("d-dnf", "click", () => void sideControl("dnf", !current().dnf));
        on("d-notch", "click", () => void sideControl("notch", !current().notch));
        slider("d-notchf", hz, v => sideControl("notchFrequency", v));

        // rx
        slider("r-af", v => String(Math.round(v / 2.55)), v => sideControl("afGain", v));
        slider("r-rf", v => String(Math.round(v / 2.55)), v => sideControl("rfGain", v));
        slider("r-sql", v => String(Math.round(v / 2.55)), v => sideControl("squelch", v));
        on("r-att", "click", () => void control("att", !state?.attenuator));
        on("pre-row", "click", e => { const b = e.target.closest("[data-pre]"); if (b) void sideControl("preamp", Number(b.dataset.pre)); });
        on("agc-row", "click", e => { const b = e.target.closest("[data-agc]"); if (b) void sideControl("agc", Number(b.dataset.agc)); });

        // fm
        on("fm-shift", "click", e => { const b = e.target.closest("[data-shift]"); if (b) void sideControl("rptShift", Number(b.dataset.shift)); });
        on("fm-tone", "click", e => { const b = e.target.closest("[data-tone]"); if (b) void sideControl("toneMode", Number(b.dataset.tone)); });
        on("fm-ctcss", "change", e => void control("ctcss", Number(e.target.value)));
        on("fm-dcs", "change", e => void control("dcs", Number(e.target.value)));

        // tx
        slider("t-power", v => `${v} W`, v => control("power", v));
        slider("t-mic", v => String(v), v => control("micGain", v));
        slider("t-moni", v => String(v), v => control("monitor", v));
        on("t-proc", "click", () => void sideControl("processor", !current().processor));
        on("t-eq", "click", () => void control("micEq", !state?.micEq));

        // cw
        slider("c-speed", v => `${v} WPM`, v => control("cwSpeed", v));
        on("c-bkin", "click", () => void control("breakIn", !state?.breakIn));
        on("cw-mems", "click", e => { const b = e.target.closest("[data-cw]"); if (b) void control("cwMemory", Number(b.dataset.cw)); });

        // audio
        on("a-rx", "click", () => (audio.ctx ? stopAudio() : startAudio()));
        $("a-vol").addEventListener("input", e => {
            $("o-vol").textContent = `${e.target.value} %`;
            if (audio.gain) audio.gain.gain.value = Number(e.target.value) / 100;
        });

    }

    async function loadTables() {
        try {
            tables = await (await fetch("/api/ftx1/tables")).json();
            $("fm-ctcss").innerHTML = tables.ctcss.map((t, i) => `<option value="${i}">${t.toFixed(1)} Hz</option>`).join("");
            $("fm-dcs").innerHTML = tables.dcs.map((d, i) => `<option value="${i}">${String(d).padStart(3, "0")}</option>`).join("");
        }
        catch { /* later */ }
    }

    /* ------------------------------------------------------------
       Polling
       ------------------------------------------------------------ */

    let polling = false;

    async function poll() {

        if (polling || document.hidden) return;

        polling = true;

        try {

            const response = await fetch("/api/ftx1", { cache: "no-store" });
            const data = await response.json().catch(() => ({}));

            if (response.status === 409) {
                $("ov-title").textContent = "FTX-1 not active";
                $("ov-text").textContent = data.activeRadio
                    ? `The active transceiver is ${data.activeRadio.name}. Select the FTX-1 in the dashboard.`
                    : "No transceiver is active. Select the FTX-1 in the dashboard.";
                $("overlay").classList.add("show");
                $("link").classList.remove("ok");
                $("link-text").textContent = "NOT ACTIVE";
                state = null;
                return;
            }

            if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);

            $("overlay").classList.remove("show");

            // the radio's TX/RX side defines the controlled side, unless the user just chose one
            if (!state || Date.now() > holdUntil) side = data.activeSide || side;

            state = data;
            render();

        }
        catch (error) {
            $("link").classList.remove("ok");
            $("link-text").textContent = "OFFLINE";
        }
        finally {
            polling = false;
        }

    }

    function clock() {
        const now = new Date();
        $("clock").innerHTML = `${now.toISOString().slice(0, 10)} <b>${now.toISOString().slice(11, 19)} UTC</b>`;
    }

    /* ------------------------------------------------------------
       Start
       ------------------------------------------------------------ */

    buildBars();
    buildPanes();
    showPane(pane);
    setupEvents();
    setupDial();
    setupPtt();
    setupMemories();
    clock();
    void loadTables();
    void poll();
    void loadMemories();

    setInterval(poll, 500);
    setInterval(clock, 1000);
    document.addEventListener("visibilitychange", () => { if (!document.hidden) void poll(); });

})();
