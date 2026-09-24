
/*
 * SHACK-SERVER - RSP1B SDR
 * WebSocket /sdr
 * KEIN Audio, KEIN CAT, KEINE Transceiver-Steuerung
 */

const $ = id => document.getElementById(id);

let sdrSocket = null;
let sdrFrames = 0;

let freeze = false;
let peakHold = false;
let peakData = null;

let smoothValues = null;

let lastValues = null;
let lastDbMax = -Infinity;

const SPANS = [250000, 500000, 1000000, 2000000, 4000000, 8000000, 16000000];
let spanIndex = 3;
let centerHz = 14074000;
let zoom = 1;

const MIN_HZ = 1000000;
const MAX_HZ = 1000000000;

/* HAM-Band-Anzeige (Bandzonen aus BANDPLAN_DATA) */
let hamView = false;

function drawBandOverlay(context, width, height) {
    if (typeof BANDPLAN_DATA === "undefined" || !Array.isArray(BANDPLAN_DATA)) return;

    const half = SPANS[spanIndex] / 2;
    const viewMin = (centerHz - half) / 1000000;   /* MHz */
    const viewMax = (centerHz + half) / 1000000;   /* MHz */

    const barH = 14;

    for (const band of BANDPLAN_DATA) {
        if (band.max <= viewMin || band.min >= viewMax) continue;

        const x1 = Math.max(0, (band.min - viewMin) / (viewMax - viewMin) * width);
        const x2 = Math.min(width, (band.max - viewMin) / (viewMax - viewMin) * width);

        context.fillStyle = "rgba(57,230,161,0.22)";
        context.fillRect(x1, height - barH, x2 - x1, barH);

        context.strokeStyle = "rgba(57,230,161,0.6)";
        context.lineWidth = 1;
        context.strokeRect(x1 + 0.5, height - barH + 0.5, x2 - x1 - 1, barH - 1);

        context.fillStyle = "#39e6a1";
        context.font = "10px monospace";
        context.textAlign = "center";
        context.fillText(
            band.band + " " + band.min.toFixed(3) + "-" + band.max.toFixed(3),
            (x1 + x2) / 2,
            height - 4
        );
    }

    context.textAlign = "left";
}

function formatFrequency(hz) {
    if (hz >= 1000000) {
        return (hz / 1000000).toFixed(6) + " MHz";
    }
    return (hz / 1000).toFixed(1) + " kHz";
}

function formatShort(hz) {
    if (hz >= 1000000) {
        return (hz / 1000000).toFixed(3) + " MHz";
    }
    return (hz / 1000).toFixed(0) + " kHz";
}

function log(message) {
    const element = $("log");
    if (!element) return;
    element.textContent +=
        new Date().toLocaleTimeString() + "  " + message + "\n";
    element.scrollTop = element.scrollHeight;
}

function setStatus(connected) {
    if ($("dot")) {
        $("dot").classList.toggle("on", connected);
    }
    if ($("status")) {
        $("status").textContent =
            connected ? "CONNECTED" : "DISCONNECTED";
    }
}

function sendCommand(command) {
    if (!sdrSocket || sdrSocket.readyState !== WebSocket.OPEN) {
        log("Not connected - command ignored: " + command.type);
        return;
    }
    sdrSocket.send(JSON.stringify(command));
}

function sdrUrl() {
    const protocol =
        window.location.protocol === "https:" ? "wss:" : "ws:";
    return protocol + "//" + window.location.host + "/sdr";
}

function handleInfo(message) {
    console.log("SDR:", message);

    if (message.type === "scan") {
        if ($("scanStatus")) {
            $("scanStatus").textContent =
                "SCAN " + message.progress + "%  " +
                formatShort(message.freq);
        }
    }

    if (message.type === "scan_done") {
        if ($("scanStatus")) {
            $("scanStatus").textContent = "SCAN STOPPED";
        }
        log("Full scan finished");
    }

    if (message.type === "info" && message.text) {
        log(message.text);
    }
}

function connectSdr() {
    if (sdrSocket &&
        (sdrSocket.readyState === WebSocket.OPEN ||
         sdrSocket.readyState === WebSocket.CONNECTING)) {
        return;
    }

    const url = sdrUrl();
    log("Connecting to " + url);

    try {
        sdrSocket = new WebSocket(url);
    } catch (error) {
        log("WebSocket error: " + error.message);
        return;
    }

    sdrSocket.binaryType = "arraybuffer";

    sdrSocket.onopen = () => {
        setStatus(true);
        log("SHACK-SERVER SDR connected");
    };

    sdrSocket.onmessage = event => {

        if (typeof event.data === "string") {
            try {
                const message = JSON.parse(event.data);
                handleInfo(message);
            } catch (_) {}
            return;
        }

        if (!(event.data instanceof ArrayBuffer)) return;

        const data = new DataView(event.data);

        if (data.byteLength < 2) return;

        const bins = data.getUint16(0, true);

        if (bins <= 0 || data.byteLength < 2 + bins * 4) {
            log("Invalid FFT frame");
            return;
        }

        /*
         * Sweep frame: 512 bins + center frequency.
         */
        if (bins === 512 && data.byteLength >= 2 + bins * 4 + 4) {

            const cf =
                data.getFloat32(2 + bins * 4, true);

            setCenter(cf, false);

            if ($("scanStatus")) {
                $("scanStatus").textContent =
                    "SCAN " + formatShort(cf);
            }
        }

        sdrFrames++;

        const values = new Float32Array(bins);
        let maxDb = -Infinity;

        for (let i = 0; i < bins; i++) {
            const value = data.getFloat32(2 + i * 4, true);
            values[i] = value;
            if (Number.isFinite(value) && value > maxDb) {
                maxDb = value;
            }
        }

        lastValues = values;
        lastDbMax = maxDb;

        if (!freeze) {
            drawSpectrum(values);
            drawWaterfall(data, bins);
        }

        if ($("eventStatus")) {
            $("eventStatus").textContent = "RSP1B DATA";
        }

        if (sdrFrames === 1 || sdrFrames % 100 === 0) {
            log("FFT frame " + sdrFrames + " / " + bins + " bins");
        }
    };

    sdrSocket.onerror = () => {
        log("SDR WebSocket error");
    };

    sdrSocket.onclose = () => {
        setStatus(false);
        log("SDR WebSocket disconnected");
        sdrSocket = null;
        setTimeout(connectSdr, 2000);
    };
}

function clampFreq(hz) {
    return Math.min(MAX_HZ, Math.max(MIN_HZ, Math.round(hz)));
}

function setCenter(hz, send) {
    centerHz = clampFreq(hz);

    const half = SPANS[spanIndex] / 2;

    if ($("freq")) {
        $("freq").textContent = formatFrequency(centerHz);
    }
    if ($("range")) {
        $("range").textContent =
            formatShort(centerHz - half) +
            "–" + formatShort(centerHz + half);
    }
    if ($("leftLabel")) {
        $("leftLabel").textContent = formatShort(centerHz - half);
    }
    if ($("rightLabel")) {
        $("rightLabel").textContent = formatShort(centerHz + half);
    }

    redraw();

    if (send) {
        sendCommand({ type: "center", freq: centerHz });
    }
}

function setSpan(index) {
    spanIndex = Math.max(0, Math.min(SPANS.length - 1, index));

    if ($("spanValue")) {
        $("spanValue").textContent =
            formatShort(SPANS[spanIndex]);
    }

    setCenter(centerHz, true);
}

function stepDown() {
    setCenter(centerHz - SPANS[spanIndex] / 10, true);
}

function stepUp() {
    setCenter(centerHz + SPANS[spanIndex] / 10, true);
}

function displayRange() {
    const ref = $("ref") ? Number($("ref").value) : -30;
    const base = $("base") ? Number($("base").value) : -120;
    return {
        top: Math.max(ref, base + 1),
        bottom: base
    };
}

function resizeCanvas(canvas) {
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    const width = Math.max(1, Math.round(rect.width * dpr));
    const height = Math.max(1, Math.round(rect.height * dpr));

    if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
    }

    return { width, height };
}

function drawGrid(context, width, height) {
    context.strokeStyle = "rgba(0,217,255,.08)";
    context.lineWidth = 1;

    for (let i = 1; i < 10; i++) {
        const x = i * width / 10;
        context.beginPath();
        context.moveTo(x, 0);
        context.lineTo(x, height);
        context.stroke();
    }

    for (let i = 1; i < 8; i++) {
        const y = i * height / 8;
        context.beginPath();
        context.moveTo(0, y);
        context.lineTo(width, y);
        context.stroke();
    }
}

function zoomWindow(bins) {
    if (zoom <= 1) return [0, bins];

    const half = bins / (2 * zoom);
    const center = bins / 2;

    return [
        Math.max(0, Math.floor(center - half)),
        Math.min(bins, Math.ceil(center + half))
    ];
}

/*
 * Vertikale dB-Skala am linken Rand des Spektrums.
 */
function drawDbScale(context, width, height, top, bottom) {

    const dpr = window.devicePixelRatio || 1;

    context.font = (10 * dpr) + "px monospace";
    context.textBaseline = "bottom";

    for (let db = Math.ceil(bottom / 10) * 10; db <= top; db += 10) {

        const level = (db - bottom) / (top - bottom);
        const y = height - level * height * 0.88 - height * 0.04;

        if (y < 12 * dpr || y > height - 2) continue;

        /* Label-Hintergrund fuer Lesbarkeit */
        const text = db + " dB";
        const tw = context.measureText(text).width;

        context.fillStyle = "rgba(2,9,12,.75)";
        context.fillRect(2 * dpr, y - 12 * dpr, tw + 6 * dpr, 13 * dpr);

        /* Label */
        context.fillStyle = "rgba(120,200,230,.85)";
        context.fillText(text, 4 * dpr, y);

        /* dezente Markenlinie bis knapp hinter das Label */
        context.strokeStyle = "rgba(0,217,255,.15)";
        context.lineWidth = 1;
        context.beginPath();
        context.moveTo(tw + 10 * dpr, y);
        context.lineTo(width, y);
        context.stroke();
    }
}


function drawSpectrum(values) {
    const canvas = $("spectrum");
    if (!canvas) return;

    const context = canvas.getContext("2d");
    const size = resizeCanvas(canvas);
    if (!size) return;

    const { width, height } = size;
    const bins = values.length;

    /*
     * Zeitliche Glaettung: exponentieller Mittelwert
     * ueber das vorherige Frame.
     */
    if (!freeze) {
        if (!smoothValues || smoothValues.length !== bins) {
            smoothValues = Float32Array.from(values);
        } else {
            for (let i = 0; i < bins; i++) {
                smoothValues[i] =
                    smoothValues[i] * 0.92 + values[i] * 0.08;
            }
        }
    }

    const shown = smoothValues || values;

    context.fillStyle = "#02090c";
    context.fillRect(0, 0, width, height);

    drawGrid(context, width, height);

    const { top, bottom } = displayRange();
    const range = top - bottom;

    drawDbScale(context, width, height, top, bottom);

    /* Zoom-Fenster */
    const [startBin, endBin] = zoomWindow(bins);
    const windowBins = Math.max(1, endBin - startBin);

    /* Peak hold auf Rohdaten */
    if (peakHold) {
        if (!peakData || peakData.length !== bins) {
            peakData = values.slice();
        } else {
            for (let i = 0; i < bins; i++) {
                peakData[i] = Math.max(peakData[i], values[i]);
            }
        }
    } else {
        peakData = null;
    }

    /*
     * Auf Displaybreite dezimieren: pro Pixelspalte
     * Maximum (Kurve) aus allen Bins der Spalte.
     */
    const columns = Math.min(width, windowBins);

    const colMax = new Float32Array(columns);

    for (let c = 0; c < columns; c++) {

        const b0 = startBin + Math.floor(c * windowBins / columns);
        const b1 = startBin + Math.max(b0 - startBin + 1,
            Math.floor((c + 1) * windowBins / columns));

        let hi = -Infinity;

        for (let b = b0; b < b1 && b < startBin + windowBins; b++) {
            if (Number.isFinite(shown[b]) && shown[b] > hi) {
                hi = shown[b];
            }
        }

        if (!Number.isFinite(hi)) hi = bottom;

        colMax[c] = hi;
    }

    function levelOf(db) {
        return Math.max(0, Math.min(1, (db - bottom) / range));
    }

    function yOf(level) {
        return height - level * height * 0.88 - height * 0.04;
    }

    /*
     * Gefuellte Flaeche unter der Kurve.
     */
    const gradient = context.createLinearGradient(0, 0, 0, height);

    gradient.addColorStop(0.00, "rgba(0,217,255,0.35)");
    gradient.addColorStop(0.60, "rgba(0,150,220,0.12)");
    gradient.addColorStop(1.00, "rgba(0,100,180,0.02)");

    context.beginPath();

    for (let c = 0; c < columns; c++) {
        const x = (c + 0.5) / columns * width;
        const y = yOf(levelOf(colMax[c]));

        if (c === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
    }

    context.lineTo(width, height);
    context.lineTo(0, height);
    context.closePath();

    context.fillStyle = gradient;
    context.fill();

    /*
     * Kurvenlinie.
     */
    context.beginPath();

    for (let c = 0; c < columns; c++) {
        const x = (c + 0.5) / columns * width;
        const y = yOf(levelOf(colMax[c]));

        if (c === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
    }

    context.strokeStyle = "#00d9ff";
    context.lineWidth = 1.2;
    context.stroke();

    /* Peak-Spur */
    if (peakData) {
        context.beginPath();

        for (let c = 0; c < columns; c++) {

            const b0 = startBin + Math.floor(c * windowBins / columns);
            const b1 = startBin + Math.max(b0 - startBin + 1,
                Math.floor((c + 1) * windowBins / columns));

            let hi = -Infinity;

            for (let b = b0; b < b1 && b < startBin + windowBins; b++) {
                if (Number.isFinite(peakData[b]) && peakData[b] > hi) {
                    hi = peakData[b];
                }
            }

            if (!Number.isFinite(hi)) continue;

            const x = (c + 0.5) / columns * width;

            if (c === 0) context.moveTo(x, yOf(levelOf(hi)));
            else context.lineTo(x, yOf(levelOf(hi)));
        }

        context.strokeStyle = "#39e6a1";
        context.lineWidth = 1;
        context.stroke();
    }

    /* Signalanzeige */
    let maxDb = -Infinity;

    for (let i = startBin; i < startBin + windowBins; i++) {
        if (Number.isFinite(values[i]) && values[i] > maxDb) {
            maxDb = values[i];
        }
    }

    if ($("power")) {
        $("power").textContent =
            (Number.isFinite(maxDb) ? maxDb : 0).toFixed(1) + " dB";
    }

    if ($("snr")) {
        let sum = 0;
        let count = 0;

        for (let i = startBin; i < startBin + windowBins; i++) {
            if (Number.isFinite(shown[i])) {
                sum += shown[i];
                count++;
            }
        }

        const mean = count > 0 ? sum / count : 0;
        const snr = Number.isFinite(maxDb) ? maxDb - mean : 0;

        $("snr").textContent = snr.toFixed(1) + " dB";

        if ($("snrFill")) {
            $("snrFill").style.width =
                Math.max(0, Math.min(100, snr * 2)) + "%";
        }
    }
}

function drawWaterfall(data, bins) {
    const canvas = $("waterfall");
    if (!canvas) return;

    const context = canvas.getContext("2d");
    const size = resizeCanvas(canvas);
    if (!size) return;

    const { width, height } = size;

    if (height > 1) {
        context.drawImage(
            canvas,
            0, 0, width, height - 1,
            0, 1, width, height - 1
        );
    }

    const { top, bottom } = displayRange();
    const range = top - bottom;

    const [startBin, endBin] = zoomWindow(bins);
    const windowBins = Math.max(1, endBin - startBin);

    const image = context.createImageData(width, 1);

    for (let x = 0; x < width; x++) {
        const bin = startBin + Math.min(
            windowBins - 1,
            Math.floor(x * windowBins / width)
        );

        const db = data.getFloat32(2 + bin * 4, true);

        const level = Math.max(0, Math.min(1, (db - bottom) / range));

        let r;
        let g;
        let b;

        if (level < 0.25) {
            const t = level / 0.25;
            r = Math.round(2 + 4 * t);
            g = Math.round(12 + 25 * t);
            b = Math.round(35 + 70 * t);
        } else if (level < 0.50) {
            const t = (level - 0.25) / 0.25;
            r = Math.round(6 + 4 * t);
            g = Math.round(37 + 75 * t);
            b = Math.round(105 + 85 * t);
        } else if (level < 0.75) {
            const t = (level - 0.50) / 0.25;
            r = Math.round(10 + 10 * t);
            g = Math.round(112 + 90 * t);
            b = Math.round(190 + 45 * t);
        } else {
            const t = (level - 0.75) / 0.25;
            r = Math.round(20 + 50 * t);
            g = Math.round(202 + 53 * t);
            b = 235;
        }

        const index = x * 4;
        image.data[index] = r;
        image.data[index + 1] = g;
        image.data[index + 2] = b;
        image.data[index + 3] = 255;
    }

    context.putImageData(image, 0, 0);
}

function redraw() {
    if (lastValues && !freeze) {
        drawSpectrum(lastValues);
    }
}

function canvasClickTune(canvas, event) {
    if (!canvas || !lastValues) return;

    const rect = canvas.getBoundingClientRect();
    const fraction = (event.clientX - rect.left) / rect.width;

    const offset = (fraction - 0.5) * SPANS[spanIndex] / zoom;

    setCenter(centerHz + offset, true);
    log("Tuned to " + formatFrequency(centerHz));
}

if ($("waterfall")) {
    $("waterfall").addEventListener("click", event => {
        canvasClickTune($("waterfall"), event);
    });
}

if ($("spectrum")) {
    $("spectrum").addEventListener("click", event => {
        canvasClickTune($("spectrum"), event);
    });
}

if ($("connect")) {
    $("connect").onclick = () => {
        if (sdrSocket) {
            log("Already connected to /sdr");
            return;
        }
        connectSdr();
    };
}

if ($("freeze")) {
    $("freeze").onclick = () => {
        freeze = !freeze;
        $("freeze").classList.toggle("active", freeze);
        log(freeze ? "Spectrum frozen" : "Spectrum live");
    };
}

if ($("peak")) {
    $("peak").onclick = () => {
        peakHold = !peakHold;
        $("peak").classList.toggle("active", peakHold);
        if (!peakHold) peakData = null;
        log(peakHold ? "Peak hold ON" : "Peak hold OFF");
    };
}

if ($("scan")) {
    $("scan").onclick = () => {
        const running =
            $("scanStatus").textContent.indexOf("SCAN") === 0 &&
            $("scanStatus").textContent !== "SCAN STOPPED";

        if (running) {
            sendCommand({ type: "scan_stop" });
            $("scanStatus").textContent = "SCAN STOPPED";
            $("scan").classList.remove("active");
            log("Full scan stopped");
        } else {
            sendCommand({
                type: "scan",
                start: MIN_HZ,
                stop: MAX_HZ,
                step: Number($("scanStep").value)
            });
            $("scanStatus").textContent = "SCAN RUNNING …";
            $("scan").classList.add("active");
            log("Full scan 1-1000 MHz started");
        }
    };
}

document.querySelectorAll("[data-view]").forEach(button => {
    button.onclick = () => {
        document.querySelectorAll("[data-view]").forEach(b =>
            b.classList.remove("active"));
        button.classList.add("active");

        const view = button.dataset.view;

        if ($("mode")) {
            $("mode").textContent =
                view === "ham" ? "HAM BANDS" : "OVERVIEW";
        }

        if (view === "ham") {
            hamView = true;
            setCenter(14074000, true);
            log("View: HAM bands - Bandzonen eingeblendet");
        } else {
            hamView = false;
            redraw();
            setCenter(500000000, true);
            log("View: overview 1-1000 MHz - Bandzonen aus");
        }
    };
});

document.querySelectorAll("[data-f]").forEach(button => {
    button.onclick = () => {
        const mhz = Number(button.dataset.f);
        const name = button.textContent.trim();

        let band = null;

        if (typeof BANDPLAN_DATA !== "undefined" && Array.isArray(BANDPLAN_DATA)) {
            band = BANDPLAN_DATA.find(b =>
                mhz >= b.min && mhz <= b.max) || null;
        }

        if (band) {
            const bwHz = (band.max - band.min) * 1000000;

            /* kleinsten Span wählen, der das Band vollständig zeigt */
            let idx = SPANS.findIndex(s => s >= bwHz * 1.15);
            if (idx === -1) idx = SPANS.length - 1;

            spanIndex = idx;
            if ($("span")) {
                $("span").value = idx;
            }
            if ($("spanValue")) {
                $("spanValue").textContent = formatShort(SPANS[idx]);
            }

            const center = (band.min + band.max) / 2 * 1000000;
            setCenter(center, true);

            hamView = true;
            redraw();

            log(name + ": " + band.min.toFixed(3) +
                " - " + band.max.toFixed(3) + " MHz" +
                " (Span " + formatShort(SPANS[idx]) + ")");
        } else {
            setCenter(mhz * 1000000, true);
            log("Band " + name + " -> " + formatFrequency(centerHz));
        }
    };
});

if ($("minus")) $("minus").onclick = stepDown;
if ($("plus")) $("plus").onclick = stepUp;

if ($("center")) {
    $("center").onclick = () => {
        setCenter(centerHz, true);
        log("Re-centered " + formatFrequency(centerHz));
    };
}

if ($("sample")) {
    $("sample").onchange = () => {
        const rate = Number($("sample").value);
        log("Sample rate " + (rate / 1000000) + " MS/s");
        sendCommand({ type: "start", sample_rate: rate });
    };
}

if ($("span")) {
    $("span").oninput = () => setSpan(Number($("span").value));
}

if ($("lna")) {
    $("lna").oninput = () => {
        $("lnaValue").textContent = $("lna").value;
        sendCommand({ type: "gain", lna: Number($("lna").value) });
    };
}

if ($("ifgr")) {
    $("ifgr").oninput = () => {
        $("ifValue").textContent = $("ifgr").value + " dB";
        sendCommand({ type: "gain", if: Number($("ifgr").value) });
    };
}

if ($("demod")) {
    $("demod").onchange = () => {
        const bw = Number($("bw").value);
        sendCommand({
            type: "demod",
            mode: $("demod").value,
            bw: bw
        });
        log("Demod " + $("demod").value + " / " + (bw / 1000) + " kHz");
    };
}

if ($("bw")) {
    $("bw").oninput = () => {
        $("bwValue").textContent = ($("bw").value / 1000) + " kHz";
    };
    $("bw").onchange = () => {
        sendCommand({ type: "demod", mode: $("demod").value, bw: Number($("bw").value) });
    };
}

if ($("ref")) {
    $("ref").oninput = () => {
        $("refValue").textContent = $("ref").value + " dB";
        redraw();
    };
}

if ($("base")) {
    $("base").oninput = () => {
        $("baseValue").textContent = $("base").value + " dB";
        redraw();
    };
}

if ($("zoom")) {
    $("zoom").oninput = () => {
        zoom = Number($("zoom").value);
        $("zoomValue").textContent = zoom + "×";
        redraw();
    };
}

window.addEventListener("resize", redraw);

setStatus(false);

setCenter(centerHz, false);

log("RSP1B SDR interface ready");
log("Using SHACK-SERVER /sdr");
log("No audio / no CAT / no transceiver control");

connectSdr();

