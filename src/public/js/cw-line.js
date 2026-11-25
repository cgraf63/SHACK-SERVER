/*
 * CW line at the bottom of the dashboard (Settings -> Split & CW):
 *
 *   CW RX   decoder: CW of the RX audio of the transceiver as text,
 *           a click on a callsign puts it into Manual QSO
 *   CW TX   encoder: typed text -> CW through the active transceiver
 *
 *   GET  /api/cw?since=n   state + new text
 *   POST /api/cw/send      { text }
 *   POST /api/cw/stop
 *   POST /api/cw/clear
 *
 * Voice keyer line (SSB, Settings -> Split & CW): 8 recorded messages,
 * a click keys the transceiver and plays the message (GET /api/voice,
 * POST /api/voice/play { slot, repeat }, POST /api/voice/stop).
 * Contest console: F1 - F8 play the messages, while the line is shown.
 *
 * Every line shown takes the place of one live spot row
 * (window.shackCwLines, read by live-spots.js).
 *
 * Contest console (contest.html): the same lines at the bottom of the
 * console, switched on separately (contestDecoder / contestEncoder),
 * a callsign goes into the contest callsign field.
 */
(() => {

    const contestView = document.getElementById("contest-view-console");
    const contest = Boolean(contestView);
    const main = contestView || document.querySelector("main");
    if (!main) return;

    const callFieldId = contest ? "contest-call" : "manual-qso-call";
    const flags = s => contest
        ? { decoder: Boolean(s.contestDecoder), encoder: Boolean(s.contestEncoder), voice: Boolean(s.contestVoice) }
        : { decoder: Boolean(s.showDecoder), encoder: Boolean(s.showEncoder), voice: Boolean(s.showVoice) };

    const bar = document.createElement("div");
    bar.className = contest ? "cw-line cw-line-contest" : "cw-line";
    bar.hidden = true;
    bar.innerHTML = `
        <div class="cw-row cw-rx" hidden>
            <span class="cw-tag" title="CW decoder - RX audio of the transceiver">CW RX</span>
            <span class="cw-led" title="Key down"></span>
            <div class="cw-text" id="cw-text"><span class="cw-empty">Waiting for CW …</span></div>
            <span class="cw-info" id="cw-info">—</span>
            <button type="button" class="cw-btn" id="cw-clear" title="Clear the text">CLR</button>
            <button type="button" class="cw-btn run" id="cw-run" title="Start / stop the decoder">STOP</button>
        </div>
        <div class="cw-row cw-tx" hidden>
            <span class="cw-tag tx" title="CW encoder - text to CW through the active transceiver">CW TX</span>
            <input type="text" id="cw-input" autocomplete="off" spellcheck="false" maxlength="200"
                placeholder="Text to send · Enter = send · Esc = stop · {CALL} = own callsign">
            <button type="button" class="cw-btn macro" data-cw="CQ CQ {CALL} {CALL} K">CQ</button>
            <button type="button" class="cw-btn macro" data-cw="{CALL}">MY</button>
            <button type="button" class="cw-btn macro" data-cw="5NN TU">5NN</button>
            <button type="button" class="cw-btn macro" data-cw="TU 73">TU</button>
            <span class="cw-error" id="cw-error" hidden></span>
            <span class="cw-info" id="cw-wpm">— WPM</span>
            <button type="button" class="cw-btn send" id="cw-send">SEND</button>
            <button type="button" class="cw-btn stop" id="cw-stop">STOP</button>
        </div>
        <div class="cw-row cw-voice" hidden>
            <span class="cw-tag voice" title="Voice keyer - recorded messages through the USB sound card, PTT by CAT">VOICE</span>
            <span class="cw-led" id="vk-led" title="Transmitting"></span>
            <div class="vk-slots" id="vk-slots"></div>
            <select class="vk-repeat" id="vk-repeat" title="Repeat the message after n seconds of listening (CQ loop)">
                <option value="0">ONCE</option>
                <option value="3">↻ 3 s</option>
                <option value="5">↻ 5 s</option>
                <option value="8">↻ 8 s</option>
                <option value="10">↻ 10 s</option>
                <option value="15">↻ 15 s</option>
                <option value="20">↻ 20 s</option>
                <option value="30">↻ 30 s</option>
            </select>
            <span class="vk-status" id="vk-status"></span>
            <button type="button" class="cw-btn stop" id="vk-stop" title="Stop - PTT off">STOP</button>
            <a class="cw-btn vk-edit" href="/voice-keyer.html" title="Record the messages">✎</a>
        </div>`;
    main.appendChild(bar);

    const $ = id => document.getElementById(id);
    const rx = bar.querySelector(".cw-rx");
    const tx = bar.querySelector(".cw-tx");
    const voice = bar.querySelector(".cw-voice");

    let seq = null;
    let text = "";
    let state = null;
    let myCall = "";
    let lines = -1;

    const escapeHtml = value => String(value).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

    /* callsigns in the decoded text become clickable */
    const CALL = /\b([A-Z0-9]{1,3}\/)?([A-Z]{1,2}[0-9]|[0-9][A-Z]|[A-Z][0-9][A-Z]?)[0-9]?[A-Z]{1,4}(\/[A-Z0-9]{1,4})?\b/g;
    const NOT_CALLS = new Set(["5NN", "73", "88", "TU", "QRZ", "QSL", "QRL", "QSY", "QRS", "QRQ", "CQ", "DE", "UR", "RST"]);

    function renderText() {

        if (!text) {
            $("cw-text").innerHTML = `<span class="cw-empty">${state?.stopped ? "Decoder stopped - START" : state?.audio?.receiving === false && state?.enabled ? "No audio from the transceiver (USB sound card)" : "Waiting for CW …"}</span>`;
            return;
        }

        const html = escapeHtml(text).replace(CALL, match =>
            NOT_CALLS.has(match) || !/[0-9]/.test(match) || !/[A-Z]/.test(match)
                ? match
                : `<span class="cw-call" data-call="${match}" title="${contest ? "Into the contest callsign field" : "Into Manual QSO"}">${match}</span>`);

        $("cw-text").innerHTML = `<span>${html}</span>`;

    }

    function setLines(count) {
        if (count === lines) return;
        lines = count;
        window.shackCwLines = count;
        window.dispatchEvent(new CustomEvent("shack:cw-lines", { detail: { lines: count } }));
    }

    function apply(s) {

        state = s;
        const show = flags(s);

        rx.hidden = !show.decoder;
        tx.hidden = !show.encoder;
        const voiceWasHidden = voice.hidden;
        voice.hidden = !show.voice;
        bar.hidden = !show.decoder && !show.encoder && !show.voice;
        if (!contest) setLines((show.decoder ? 1 : 0) + (show.encoder ? 1 : 0) + (show.voice ? 1 : 0));
        if (show.voice && voiceWasHidden) voicePoll();

        if (show.decoder) {

            if (typeof s.fresh === "string" && seq !== null) {
                if (s.fresh) text = (text + s.fresh).slice(-600);
            }
            else {
                text = s.text || "";
            }
            seq = s.seq;

            const run = $("cw-run");
            run.textContent = s.stopped ? "START" : "STOP";
            run.classList.toggle("stopped", Boolean(s.stopped));
            bar.querySelector(".cw-rx").classList.toggle("stopped", Boolean(s.stopped));

            const st = s.stopped ? null : s.stats;
            bar.querySelector(".cw-led").classList.toggle("on", Boolean(st?.key));
            bar.querySelector(".cw-led").classList.toggle("signal", Boolean(st?.signal));
            $("cw-info").textContent = st
                ? `${st.tone} Hz · ${st.signal ? `${st.wpm} WPM` : "no signal"}`
                : "—";

            renderText();

        }

        $("cw-wpm").textContent = `${s.wpm} WPM`;
        const canSend = s.canSend !== false;
        $("cw-input").disabled = !canSend;
        $("cw-input").placeholder = canSend
            ? "Text to send · Enter = send · Esc = stop · {CALL} = own callsign"
            : "The active transceiver cannot send CW text via CAT";

    }

    let polling = false;

    async function poll() {
        if (polling || document.hidden) return;
        polling = true;
        try {
            const url = seq === null ? "/api/cw" : `/api/cw?since=${seq}`;
            const response = await fetch(url, { cache: "no-store" });
            if (response.ok) apply(await response.json());
        }
        catch {
            // server not reachable
        }
        finally {
            polling = false;
        }
    }

    /* decoder shown: fast, otherwise only to notice a change in the settings */
    function schedule() {
        const fast = state && flags(state).decoder;
        setTimeout(async () => { await poll(); schedule(); }, fast ? 300 : 3000);
    }

    /* ------------------------------------------------------------ actions */

    async function post(url, body) {
        try {
            const response = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body ?? {})
            });
            const result = await response.json().catch(() => ({}));
            if (!response.ok) flash(result.error || `Error ${response.status}`);
            return response.ok ? result : null;
        }
        catch {
            flash("SHACK-SERVER not reachable");
            return null;
        }
    }

    /* error next to the input, 10 s (the text stays in the input) */
    let errorTimer = null;

    function flash(message) {
        const input = $("cw-input");
        const error = $("cw-error");
        input.classList.add("error");
        error.textContent = message;
        error.title = message;
        error.hidden = false;
        clearTimeout(errorTimer);
        errorTimer = setTimeout(() => {
            input.classList.remove("error");
            error.hidden = true;
        }, 10000);
    }

    async function send(raw) {
        const value = String(raw || "").replace(/\{CALL\}/gi, myCall).trim();
        if (!value) return;
        const result = await post("/api/cw/send", { text: value });
        if (result) {
            clearTimeout(errorTimer);
            $("cw-error").hidden = true;
            const input = $("cw-input");
            input.classList.remove("error");
            input.classList.add("sent");
            setTimeout(() => input.classList.remove("sent"), 400);
        }
        return result;
    }

    $("cw-input").addEventListener("keydown", async event => {
        if (event.key === "Enter") {
            event.preventDefault();
            event.stopPropagation();
            if (await send(event.target.value)) event.target.value = "";
        }
        else if (event.key === "Escape") {
            event.preventDefault();
            post("/api/cw/stop");
        }
    });

    $("cw-send").addEventListener("click", async () => {
        if (await send($("cw-input").value)) $("cw-input").value = "";
    });

    $("cw-stop").addEventListener("click", () => post("/api/cw/stop"));

    bar.querySelectorAll("[data-cw]").forEach(button =>
        button.addEventListener("click", () => send(button.dataset.cw)));

    $("cw-run").addEventListener("click", async () => {
        const result = await post("/api/cw/decoder", { running: Boolean(state?.stopped) });
        if (result) apply({ ...state, ...result, fresh: "" });
    });

    $("cw-clear").addEventListener("click", async () => {
        await post("/api/cw/clear");
        text = "";
        renderText();
    });

    /* callsign -> Manual QSO */
    $("cw-text").addEventListener("click", event => {
        const call = event.target.closest(".cw-call")?.dataset.call;
        if (!call) return;
        const field = document.getElementById(callFieldId);
        if (!field) return;
        field.value = call;
        field.focus();
        field.dispatchEvent(new Event("input", { bubbles: true }));
    });

    fetch("/api/settings").then(r => r.json()).then(s => { myCall = String(s.callsign || "").toUpperCase(); }).catch(() => {});

    /* ------------------------------------------------------------ voice keyer */

    let voiceState = null;
    let voiceTimer = null;
    let voiceMessage = "";
    let voiceMessageTimer = null;

    try {
        const saved = localStorage.getItem("vk-repeat");
        if (saved !== null) $("vk-repeat").value = saved;
    }
    catch { /* no storage */ }

    $("vk-repeat").addEventListener("change", event => {
        try { localStorage.setItem("vk-repeat", event.target.value); } catch { /* no storage */ }
    });

    function voiceFlash(message) {
        voiceMessage = message;
        clearTimeout(voiceMessageTimer);
        voiceMessageTimer = setTimeout(() => { voiceMessage = ""; renderVoice(); }, 8000);
        renderVoice();
    }

    function renderVoice() {
        const s = voiceState;
        if (!s) return;

        const slots = $("vk-slots");
        const html = s.slots.map(m => `<button type="button" class="cw-btn vk-slot${m.recorded ? "" : " empty"}${s.playing === m.slot ? (s.phase === "tx" ? " tx" : " wait") : ""}" data-slot="${m.slot}" title="${contest ? `F${m.slot} · ` : ""}${m.recorded ? `${escapeHtml(m.label)} · ${m.seconds} s` : "Not recorded - ✎ to record"}">${contest ? `<small>F${m.slot}</small>` : ""}${escapeHtml(m.label)}</button>`).join("");
        if (slots.dataset.html !== html) {
            slots.innerHTML = html;
            slots.dataset.html = html;
        }

        $("vk-led").classList.toggle("tx", s.phase === "tx");

        const status = $("vk-status");
        let text = "";
        let cls = "";
        if (voiceMessage) { text = voiceMessage; cls = "error"; }
        else if (s.phase === "tx") { text = `TX ${s.slots[s.playing - 1]?.label ?? ""}`; cls = "tx"; }
        else if (s.phase === "wait") { text = `next in ${Math.ceil(s.nextIn)} s`; cls = "wait"; }
        else if (!s.ready) { text = s.problem; cls = "muted"; }
        else if (s.error) { text = s.error; cls = "error"; }
        status.textContent = text;
        status.title = text;
        status.className = `vk-status ${cls}`;
    }

    async function voicePoll() {
        clearTimeout(voiceTimer);
        if (voice.hidden) return;
        try {
            const response = await fetch("/api/voice", { cache: "no-store" });
            if (response.ok) {
                voiceState = await response.json();
                renderVoice();
            }
        }
        catch {
            // server not reachable
        }
        const busy = voiceState && voiceState.phase !== "idle";
        voiceTimer = setTimeout(voicePoll, document.hidden ? 5000 : busy ? 400 : 2500);
    }

    async function voiceCall(url, body) {
        try {
            const response = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body ?? {})
            });
            const result = await response.json().catch(() => ({}));
            if (!response.ok) voiceFlash(result.error || `Error ${response.status}`);
            else { voiceState = result; voiceMessage = ""; renderVoice(); }
        }
        catch {
            voiceFlash("SHACK-SERVER not reachable");
        }
        voicePoll();
    }

    function voicePlay(slot) {
        const message = voiceState?.slots?.[slot - 1];
        if (message && !message.recorded) {
            voiceFlash(`${message.label} is not recorded - ✎`);
            return;
        }
        /* the same message again while it runs = stop */
        if (voiceState?.playing === slot && voiceState.phase !== "idle") {
            voiceCall("/api/voice/stop");
            return;
        }
        voiceCall("/api/voice/play", { slot, repeat: Number($("vk-repeat").value) || 0 });
    }

    $("vk-slots").addEventListener("click", event => {
        const button = event.target.closest("[data-slot]");
        if (button) voicePlay(Number(button.dataset.slot));
    });

    $("vk-stop").addEventListener("click", () => voiceCall("/api/voice/stop"));

    if (contest) {
        document.addEventListener("keydown", event => {
            if (voice.hidden || event.altKey || event.ctrlKey || event.metaKey) return;
            const match = /^F([1-8])$/.exec(event.key);
            if (!match) return;
            event.preventDefault();
            voicePlay(Number(match[1]));
        }, true);
    }

    poll().then(schedule);

})();
