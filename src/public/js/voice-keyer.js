/* =========================================================
   VOICE KEYER – recording page (voice-keyer.html)

   Record with the microphone (needs HTTPS) or load an audio file,
   trim silence, normalise, resample to the sample rate of the USB
   sound card and store on the server (PUT /api/voice/:slot, PCM S16_LE).
   ========================================================= */

(() => {

    const $ = id => document.getElementById(id);
    const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c]));

    const canRecord = window.isSecureContext && Boolean(navigator.mediaDevices?.getUserMedia);

    let state = null;
    let recording = null;      // { slot, stream, context, node, chunks, rate, started, timer }
    let fileSlot = 0;
    let listening = null;      // Audio element
    const waves = new Map();   // slot -> Float32Array (peaks) for the drawing
    const messages = new Map();

    if (!canRecord) {
        $("vkp-https").hidden = false;
        $("vkp-https-url").textContent = `https://${location.hostname}`;
    }

    /* ------------------------------------------------------------ server */

    async function api(method, url, body, headers) {
        const response = await fetch(url, { method, body, headers, cache: "no-store" });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || `Error ${response.status}`);
        return result;
    }

    async function refresh() {
        try {
            state = await api("GET", "/api/voice");
            render();
        }
        catch {
            // not reachable
        }
    }

    /* ------------------------------------------------------------ render */

    function setMessage(slot, text, cls = "") {
        messages.set(slot, { text, cls });
        const el = document.querySelector(`.vkp-card[data-slot="${slot}"] .vkp-msg`);
        if (el) {
            el.textContent = text;
            el.className = `vkp-msg ${cls}`;
        }
    }

    function render() {
        if (!state) return;

        const radio = $("vkp-radio");
        radio.className = `vkp-radio ${state.phase === "tx" ? "tx" : state.ready ? "ok" : ""}`;
        $("vkp-radio-text").textContent = state.phase === "tx"
            ? `TRANSMITTING ${state.slots[state.playing - 1]?.label ?? ""}`
            : state.ready ? "Transceiver ready" : state.problem;

        const grid = $("vkp-grid");
        if (!grid.children.length) {
            grid.innerHTML = state.slots.map(m => `
                <div class="vkp-card" data-slot="${m.slot}">
                    <div class="vkp-head">
                        <span class="vkp-num" title="F${m.slot} in the contest console">F${m.slot}</span>
                        <input class="vkp-label" maxlength="12" spellcheck="false" value="${esc(m.label)}" title="Name on the button (Enter = save)">
                        <span class="vkp-len"></span>
                    </div>
                    <canvas class="vkp-wave"></canvas>
                    <div class="vkp-actions">
                        <button type="button" class="vkp-btn rec" data-act="rec" ${canRecord ? "" : "disabled title=\"Needs HTTPS\""}>● REC</button>
                        <button type="button" class="vkp-btn" data-act="file" title="Load an audio file">FILE</button>
                        <button type="button" class="vkp-btn" data-act="listen" title="Listen in the browser">▶ LISTEN</button>
                        <button type="button" class="vkp-btn del" data-act="del" title="Delete the recording">✕</button>
                        <button type="button" class="vkp-btn tx" data-act="tx" title="Transmit (PTT on)">TX</button>
                    </div>
                    <div class="vkp-msg"></div>
                </div>`).join("");
        }

        for (const m of state.slots) {
            const card = grid.querySelector(`.vkp-card[data-slot="${m.slot}"]`);
            if (!card) continue;
            const isRec = recording?.slot === m.slot;
            const isTx = state.playing === m.slot && state.phase !== "idle";
            card.classList.toggle("rec", isRec);
            card.classList.toggle("tx", isTx);
            card.querySelector(".vkp-len").textContent = isRec ? `${((performance.now() - recording.started) / 1000).toFixed(1)} s` : m.recorded ? `${m.seconds.toFixed(1)} s` : "—";
            const label = card.querySelector(".vkp-label");
            if (document.activeElement !== label && label.value !== m.label) label.value = m.label;

            const rec = card.querySelector("[data-act=rec]");
            rec.textContent = isRec ? "■ STOP" : "● REC";
            rec.classList.toggle("on", isRec);
            if (canRecord) rec.disabled = Boolean(recording && !isRec);

            card.querySelector("[data-act=listen]").disabled = !m.recorded || isRec;
            card.querySelector("[data-act=del]").disabled = !m.recorded || isRec;
            const tx = card.querySelector("[data-act=tx]");
            tx.disabled = !m.recorded || isRec || (!state.ready && !isTx);
            tx.textContent = isTx ? (state.phase === "tx" ? "■ TX" : "■ WAIT") : "TX";
            tx.classList.toggle("on", isTx);
            tx.title = state.ready ? "Transmit (PTT on)" : state.problem;

            const msg = messages.get(m.slot);
            const msgEl = card.querySelector(".vkp-msg");
            if (msg) { msgEl.textContent = msg.text; msgEl.className = `vkp-msg ${msg.cls}`; }
            else if (!m.recorded) msgEl.textContent = "Not recorded";
            else msgEl.textContent = m.updated ? `Recorded ${new Date(m.updated).toLocaleString()}` : "";

            if (!isRec) drawWave(m.slot, card.querySelector(".vkp-wave"));
        }
    }

    /* waveform: peaks of the recording (loaded once per slot) */
    async function loadWave(slot) {
        try {
            const response = await fetch(`/api/voice/${slot}/audio`, { cache: "no-store" });
            if (!response.ok) { waves.set(slot, null); return; }
            const buffer = await response.arrayBuffer();
            const view = new DataView(buffer);
            const n = (buffer.byteLength - 44) >> 1;
            const peaks = new Float32Array(300);
            const per = Math.max(1, Math.floor(n / peaks.length));
            for (let i = 0; i < peaks.length; i++) {
                let max = 0;
                for (let j = i * per; j < Math.min(n, (i + 1) * per); j++) {
                    const v = Math.abs(view.getInt16(44 + j * 2, true)) / 32768;
                    if (v > max) max = v;
                }
                peaks[i] = max;
            }
            waves.set(slot, peaks);
        }
        catch {
            waves.set(slot, null);
        }
        render();
    }

    function drawWave(slot, canvas, livePeaks) {
        const m = state.slots[slot - 1];
        if (!livePeaks && m.recorded && !waves.has(slot)) {
            waves.set(slot, undefined);
            loadWave(slot);
        }
        const peaks = livePeaks || (m.recorded ? waves.get(slot) : null);

        const ratio = window.devicePixelRatio || 1;
        const w = canvas.clientWidth, h = canvas.clientHeight;
        if (canvas.width !== Math.round(w * ratio)) { canvas.width = Math.round(w * ratio); canvas.height = Math.round(h * ratio); }
        const ctx = canvas.getContext("2d");
        ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
        ctx.clearRect(0, 0, w, h);
        ctx.strokeStyle = "rgba(255,255,255,0.06)";
        ctx.beginPath(); ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2); ctx.stroke();
        if (!peaks || !peaks.length) return;

        const grad = ctx.createLinearGradient(0, 0, 0, h);
        const color = livePeaks ? "#ff5252" : "#e08cff";
        grad.addColorStop(0, color);
        grad.addColorStop(0.5, livePeaks ? "#ffb4b4" : "#00e5ff");
        grad.addColorStop(1, color);
        ctx.fillStyle = grad;
        const count = livePeaks ? Math.max(peaks.length, 300) : peaks.length;
        const bw = w / count;
        for (let i = 0; i < peaks.length; i++) {
            const ph = Math.max(1, peaks[i] * (h - 6));
            ctx.fillRect(i * bw, (h - ph) / 2, Math.max(1, bw - 0.5), ph);
        }
    }

    /* ------------------------------------------------------------ audio processing */

    /* trim silence, fade, normalise to -1 dBFS, resample, Int16 */
    async function prepare(samples, rate) {
        const target = state?.sampleRate || 48000;

        let peak = 0;
        for (const v of samples) peak = Math.max(peak, Math.abs(v));
        if (peak < 0.01) throw new Error("Nothing heard - is the microphone muted?");

        const threshold = Math.max(0.02, peak * 0.06);
        const win = Math.round(rate * 0.02);
        let start = 0, end = samples.length;
        for (let i = 0; i < samples.length; i += win) {
            if (samples.subarray(i, i + win).some(v => Math.abs(v) > threshold)) { start = i; break; }
        }
        for (let i = samples.length - win; i > 0; i -= win) {
            if (samples.subarray(i, i + win).some(v => Math.abs(v) > threshold)) { end = i + win; break; }
        }
        start = Math.max(0, start - Math.round(rate * 0.12));
        end = Math.min(samples.length, end + Math.round(rate * 0.25));
        let cut = samples.slice(start, end);

        const max = (state?.maxSeconds || 30) * rate;
        if (cut.length > max) cut = cut.slice(0, max);

        /* resample */
        const frames = Math.max(1, Math.round(cut.length * target / rate));
        const offline = new OfflineAudioContext(1, frames, target);
        const buffer = offline.createBuffer(1, cut.length, rate);
        buffer.copyToChannel(cut, 0);
        const source = offline.createBufferSource();
        source.buffer = buffer;
        source.connect(offline.destination);
        source.start();
        const out = (await offline.startRendering()).getChannelData(0);

        let outPeak = 0;
        for (const v of out) outPeak = Math.max(outPeak, Math.abs(v));
        const gain = outPeak ? 0.89 / outPeak : 1;
        const fade = Math.round(target * 0.01);

        const pcm = new Int16Array(out.length);
        for (let i = 0; i < out.length; i++) {
            let v = out[i] * gain;
            if (i < fade) v *= i / fade;
            if (i > out.length - fade) v *= (out.length - i) / fade;
            pcm[i] = Math.max(-32768, Math.min(32767, Math.round(v * 32767)));
        }
        return { pcm, rate: target };
    }

    async function upload(slot, samples, rate) {
        setMessage(slot, "Saving …");
        const { pcm, rate: target } = await prepare(samples, rate);
        const label = document.querySelector(`.vkp-card[data-slot="${slot}"] .vkp-label`)?.value ?? "";
        state = await api("PUT", `/api/voice/${slot}?rate=${target}&label=${encodeURIComponent(label)}`, pcm.buffer, { "Content-Type": "application/octet-stream" });
        waves.delete(slot);
        setMessage(slot, `Saved · ${(pcm.length / target).toFixed(1)} s`, "ok");
        render();
    }

    /* ------------------------------------------------------------ recording */

    async function startRecording(slot) {
        let stream;
        try {
            stream = await navigator.mediaDevices.getUserMedia({
                audio: { channelCount: 1, echoCancellation: false, noiseSuppression: true, autoGainControl: true }
            });
        }
        catch (error) {
            setMessage(slot, `Microphone: ${error.message}`, "error");
            return;
        }

        const context = new AudioContext();
        const source = context.createMediaStreamSource(stream);
        const node = context.createScriptProcessor(4096, 1, 1);
        const mute = context.createGain();
        mute.gain.value = 0;
        const chunks = [];
        const live = [];

        node.onaudioprocess = event => {
            const data = new Float32Array(event.inputBuffer.getChannelData(0));
            chunks.push(data);
            for (let i = 0; i < data.length; i += 1024) {
                let max = 0;
                for (let j = i; j < Math.min(data.length, i + 1024); j++) max = Math.max(max, Math.abs(data[j]));
                live.push(Math.min(1, max * 1.6));
            }
            const card = document.querySelector(`.vkp-card[data-slot="${slot}"]`);
            if (card) {
                drawWave(slot, card.querySelector(".vkp-wave"), live.slice(-300));
                card.querySelector(".vkp-len").textContent = `${((performance.now() - recording.started) / 1000).toFixed(1)} s`;
            }
        };

        source.connect(node);
        node.connect(mute);
        mute.connect(context.destination);

        recording = { slot, stream, context, node, chunks, rate: context.sampleRate, started: performance.now() };
        recording.timer = setTimeout(() => stopRecording(), ((state?.maxSeconds || 30) + 0.3) * 1000);
        setMessage(slot, "Recording … speak now, ■ STOP when done", "error");
        render();
    }

    async function stopRecording() {
        if (!recording) return;
        const r = recording;
        recording = null;
        clearTimeout(r.timer);
        r.node.disconnect();
        r.stream.getTracks().forEach(track => track.stop());
        await r.context.close().catch(() => undefined);

        const length = r.chunks.reduce((s, c) => s + c.length, 0);
        const samples = new Float32Array(length);
        let offset = 0;
        for (const c of r.chunks) { samples.set(c, offset); offset += c.length; }

        render();
        try {
            await upload(r.slot, samples, r.rate);
        }
        catch (error) {
            setMessage(r.slot, error.message, "error");
            render();
        }
    }

    /* ------------------------------------------------------------ file */

    $("vkp-file").addEventListener("change", async event => {
        const file = event.target.files?.[0];
        event.target.value = "";
        const slot = fileSlot;
        if (!file || !slot) return;
        try {
            setMessage(slot, `Reading ${file.name} …`);
            const context = new AudioContext();
            const decoded = await context.decodeAudioData(await file.arrayBuffer());
            await context.close().catch(() => undefined);
            const mono = new Float32Array(decoded.length);
            for (let c = 0; c < decoded.numberOfChannels; c++) {
                const data = decoded.getChannelData(c);
                for (let i = 0; i < data.length; i++) mono[i] += data[i] / decoded.numberOfChannels;
            }
            await upload(slot, mono, decoded.sampleRate);
        }
        catch (error) {
            setMessage(slot, error.message?.includes("decode") ? "This audio file cannot be read" : error.message, "error");
            render();
        }
    });

    /* ------------------------------------------------------------ actions */

    $("vkp-grid").addEventListener("click", async event => {
        const button = event.target.closest("[data-act]");
        const card = event.target.closest(".vkp-card");
        if (!button || !card) return;
        const slot = Number(card.dataset.slot);
        messages.delete(slot);

        try {
            switch (button.dataset.act) {
                case "rec":
                    if (recording?.slot === slot) await stopRecording();
                    else if (!recording) await startRecording(slot);
                    break;
                case "file":
                    fileSlot = slot;
                    $("vkp-file").click();
                    break;
                case "listen":
                    if (listening) { listening.pause(); listening = null; }
                    listening = new Audio(`/api/voice/${slot}/audio?t=${Date.now()}`);
                    listening.play().catch(error => setMessage(slot, error.message, "error"));
                    break;
                case "del":
                    state = await api("DELETE", `/api/voice/${slot}`);
                    waves.delete(slot);
                    break;
                case "tx":
                    if (state.playing === slot && state.phase !== "idle") state = await api("POST", "/api/voice/stop");
                    else state = await api("POST", "/api/voice/play", JSON.stringify({ slot, repeat: 0 }), { "Content-Type": "application/json" });
                    break;
            }
        }
        catch (error) {
            setMessage(slot, error.message, "error");
        }
        render();
    });

    $("vkp-grid").addEventListener("change", async event => {
        if (!event.target.classList.contains("vkp-label")) return;
        const slot = Number(event.target.closest(".vkp-card").dataset.slot);
        try {
            state = await api("PATCH", `/api/voice/${slot}`, JSON.stringify({ label: event.target.value }), { "Content-Type": "application/json" });
            setMessage(slot, "Name saved", "ok");
            render();
        }
        catch (error) {
            setMessage(slot, error.message, "error");
        }
    });

    $("vkp-grid").addEventListener("keydown", event => {
        if (event.key === "Enter" && event.target.classList.contains("vkp-label")) event.target.blur();
    });

    window.addEventListener("resize", () => render());

    async function loop() {
        await refresh();
        setTimeout(loop, state && state.phase !== "idle" ? 400 : 2000);
    }

    loop();

})();
