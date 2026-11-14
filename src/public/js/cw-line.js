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
        ? { decoder: Boolean(s.contestDecoder), encoder: Boolean(s.contestEncoder) }
        : { decoder: Boolean(s.showDecoder), encoder: Boolean(s.showEncoder) };

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
        </div>
        <div class="cw-row cw-tx" hidden>
            <span class="cw-tag tx" title="CW encoder - text to CW through the active transceiver">CW TX</span>
            <input type="text" id="cw-input" autocomplete="off" spellcheck="false" maxlength="200"
                placeholder="Text to send · Enter = send · Esc = stop · {CALL} = own callsign">
            <button type="button" class="cw-btn macro" data-cw="CQ CQ {CALL} {CALL} K">CQ</button>
            <button type="button" class="cw-btn macro" data-cw="{CALL}">MY</button>
            <button type="button" class="cw-btn macro" data-cw="5NN TU">5NN</button>
            <button type="button" class="cw-btn macro" data-cw="TU 73">TU</button>
            <span class="cw-info" id="cw-wpm">— WPM</span>
            <button type="button" class="cw-btn send" id="cw-send">SEND</button>
            <button type="button" class="cw-btn stop" id="cw-stop">STOP</button>
        </div>`;
    main.appendChild(bar);

    const $ = id => document.getElementById(id);
    const rx = bar.querySelector(".cw-rx");
    const tx = bar.querySelector(".cw-tx");

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
            $("cw-text").innerHTML = `<span class="cw-empty">${state?.audio?.receiving === false && state?.enabled ? "No audio from the transceiver (USB sound card)" : "Waiting for CW …"}</span>`;
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
        bar.hidden = !show.decoder && !show.encoder;
        if (!contest) setLines((show.decoder ? 1 : 0) + (show.encoder ? 1 : 0));

        if (show.decoder) {

            if (typeof s.fresh === "string" && seq !== null) {
                if (s.fresh) text = (text + s.fresh).slice(-600);
            }
            else {
                text = s.text || "";
            }
            seq = s.seq;

            const st = s.stats;
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

    function flash(message) {
        const input = $("cw-input");
        input.classList.add("error");
        input.title = message;
        const keep = input.value;
        input.value = "";
        input.placeholder = message;
        setTimeout(() => {
            input.classList.remove("error");
            input.title = "";
            if (!input.value) input.value = keep;
            if (state) apply(state);
        }, 2500);
    }

    async function send(raw) {
        const value = String(raw || "").replace(/\{CALL\}/gi, myCall).trim();
        if (!value) return;
        const result = await post("/api/cw/send", { text: value });
        if (result) {
            const input = $("cw-input");
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

    poll().then(schedule);

})();
