/*
 * Beacon monitor page (beacons.html) - NCDXF / IARU beacons.
 *
 *   GET  /api/beacons?hours=n    state, live trace, results
 *   POST /api/beacons/start      { mode, band }
 *   POST /api/beacons/stop
 *   POST /api/beacons/clear
 *
 * Radar: azimuthal map around the own QTH (locator from Settings),
 * beacons at their bearing and distance, colour = how many of the
 * four dashes (100 W, 10 W, 1 W, 0.1 W) were heard.
 */
(() => {

    const COLORS = ["#22333c", "#e0525f", "#f08a29", "#f0d22b", "#2ee88c"];
    const DASH_LABELS = ["100 W", "10 W", "1 W", "0.1 W"];
    const OLD_MS = 30 * 60_000;

    let data = null;
    let offset = 0;                 // server clock - browser clock
    let qth = null;                 // { lat, lon }
    let mode = "rotate";
    let band = 0;
    let radarBand = "best";
    let hours = 6;
    let busy = false;
    let geo = [];                   // per beacon { bearing, distance, x, y }
    let hover = -1;
    let sweep = 0;                  // radar sweep angle (deg)

    try {
        mode = localStorage.getItem("bm-mode") || "rotate";
        band = Number(localStorage.getItem("bm-band")) || 0;
        radarBand = localStorage.getItem("bm-radar") || "best";
        hours = Number(localStorage.getItem("bm-hours")) || 6;
    }
    catch { /* no storage */ }

    const $ = id => document.getElementById(id);
    const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
    const now = () => Date.now() + offset;
    const store = (key, value) => { try { localStorage.setItem(key, String(value)); } catch { /* no storage */ } };

    /* ------------------------------------------------------------ geo */

    function locatorToLatLon(locator) {
        const loc = String(locator || "").trim().toUpperCase();
        if (!/^[A-R]{2}[0-9]{2}/.test(loc)) return null;
        let lon = (loc.charCodeAt(0) - 65) * 20 - 180 + Number(loc[2]) * 2;
        let lat = (loc.charCodeAt(1) - 65) * 10 - 90 + Number(loc[3]);
        if (/^[A-X]{2}$/.test(loc.slice(4, 6))) {
            lon += (loc.charCodeAt(4) - 65) / 12 + 1 / 24;
            lat += (loc.charCodeAt(5) - 65) / 24 + 1 / 48;
        }
        else {
            lon += 1;
            lat += 0.5;
        }
        return { lat, lon };
    }

    function bearingDistance(from, to) {
        const rad = Math.PI / 180;
        const φ1 = from.lat * rad, φ2 = to.lat * rad, Δλ = (to.lon - from.lon) * rad;
        const y = Math.sin(Δλ) * Math.cos(φ2);
        const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
        const bearing = (Math.atan2(y, x) / rad + 360) % 360;
        const a = Math.sin((φ2 - φ1) / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
        const distance = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return { bearing, distance };
    }

    function computeGeo() {
        if (!data) return;
        geo = data.beacons.map(beacon => {
            const pos = locatorToLatLon(beacon.locator);
            return qth && pos ? bearingDistance(qth, pos) : { bearing: 0, distance: 0 };
        });
    }

    /* ------------------------------------------------------------ results */

    function resultFor(beacon, bandIndex) {
        return data?.latest.find(r => r.beacon === beacon && r.band === bandIndex) || null;
    }

    /* best result of a beacon (selected radar band, or best band within 30 min) */
    function radarResult(beacon) {
        if (radarBand !== "best") return resultFor(beacon, Number(radarBand));
        let best = null;
        for (const r of data?.latest || []) {
            if (r.beacon !== beacon || now() - r.at > OLD_MS) continue;
            if (!best || r.dashes > best.dashes) best = r;
        }
        return best;
    }

    function ago(at) {
        const minutes = Math.round((now() - at) / 60000);
        if (minutes < 1) return "just now";
        if (minutes < 60) return `${minutes} min ago`;
        return `${Math.floor(minutes / 60)} h ${minutes % 60} min ago`;
    }

    /* ------------------------------------------------------------ server */

    async function load() {
        try {
            const response = await fetch(`/api/beacons?hours=${hours}`, { cache: "no-store" });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const fresh = await response.json();
            offset = fresh.now - Date.now();
            const first = !data;
            data = fresh;
            if (first) computeGeo();
            render();
        }
        catch (error) {
            showAlert(`Beacon monitor not reachable (${error.message})`);
        }
    }

    async function post(url, body) {
        busy = true;
        renderControls();
        try {
            const response = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body || {})
            });
            const result = await response.json().catch(() => ({}));
            if (!response.ok) {
                showAlert(result.error || `Error ${response.status}`);
                return;
            }
            if (result.beacons) {
                data = result;
                offset = result.now - Date.now();
                render();
            }
            else {
                await load();
            }
        }
        catch {
            showAlert("SHACK-SERVER not reachable");
        }
        finally {
            busy = false;
            renderControls();
        }
    }

    function showAlert(text) {
        const box = $("bm-alert");
        box.hidden = !text;
        box.textContent = text || "";
    }

    /* ------------------------------------------------------------ controls */

    function renderControls() {

        document.querySelectorAll("[data-mode]").forEach(button =>
            button.classList.toggle("active", button.dataset.mode === mode));

        const bands = $("bm-band-select");
        bands.classList.toggle("disabled", mode !== "band");
        bands.querySelectorAll("button").forEach(button =>
            button.classList.toggle("active", Number(button.dataset.band) === band));

        const running = Boolean(data?.running);
        const start = $("bm-start");
        start.classList.toggle("running", running);
        $("bm-start-text").textContent = busy ? "…" : running ? "STOP" : "START";
        start.disabled = busy || (!running && data && !data.supported);

    }

    function initControls() {

        const names = ["20m", "17m", "15m", "12m", "10m"];

        $("bm-band-select").innerHTML = names.map((name, index) =>
            `<button type="button" data-band="${index}">${name}</button>`).join("");

        $("bm-radar-band").innerHTML = [["best", "BEST"], ...names.map((name, index) => [String(index), name])]
            .map(([value, label]) => `<button type="button" data-radar="${value}">${label}</button>`).join("");

        $("bm-hours").innerHTML = [1, 3, 6, 12, 24]
            .map(h => `<button type="button" data-hours="${h}">${h} h</button>`).join("");

        document.addEventListener("click", event => {

            const modeButton = event.target.closest("[data-mode]");
            if (modeButton) {
                mode = modeButton.dataset.mode;
                store("bm-mode", mode);
                renderControls();
                if (data?.running) post("/api/beacons/start", { mode, band });
                return;
            }

            const bandButton = event.target.closest("[data-band]");
            if (bandButton) {
                band = Number(bandButton.dataset.band);
                store("bm-band", band);
                renderControls();
                if (data?.running && mode === "band") post("/api/beacons/start", { mode, band });
                return;
            }

            const radarButton = event.target.closest("[data-radar]");
            if (radarButton) {
                radarBand = radarButton.dataset.radar;
                store("bm-radar", radarBand);
                renderChips();
                return;
            }

            const hoursButton = event.target.closest("[data-hours]");
            if (hoursButton) {
                hours = Number(hoursButton.dataset.hours);
                store("bm-hours", hours);
                renderChips();
                load();
            }

        });

        $("bm-start").addEventListener("click", () => {
            showAlert("");
            if (data?.running) post("/api/beacons/stop");
            else post("/api/beacons/start", { mode, band });
        });

        $("bm-clear").addEventListener("click", () => post("/api/beacons/clear"));

        renderControls();
        renderChips();

    }

    function renderChips() {
        document.querySelectorAll("[data-radar]").forEach(button =>
            button.classList.toggle("active", button.dataset.radar === radarBand));
        document.querySelectorAll("[data-hours]").forEach(button =>
            button.classList.toggle("active", Number(button.dataset.hours) === hours));
    }

    /* ------------------------------------------------------------ render */

    function render() {

        if (!data) return;

        renderControls();

        if (data.error) showAlert(data.error);
        else if (!data.supported && !data.running) showAlert("The beacon monitor works with the Yaesu FTDX10 and FTX-1. Select one of them as the active transceiver on the dashboard.");
        else if (!qth) showAlert("No locator in Settings > Station - the radar needs it for bearing and distance.");
        else if ($("bm-alert").textContent.startsWith("The beacon") || $("bm-alert").textContent.startsWith("No locator") || $("bm-alert").textContent.startsWith("Beacon monitor not")) showAlert("");

        const source = $("bm-source");
        source.textContent = data.running ? (data.source === "audio" ? "AUDIO + S-METER" : "S-METER") : "IDLE";
        source.classList.toggle("live", data.running);

        renderNow();
        renderOnAir();
        renderMatrix();
        renderTimeline();

    }

    function flag(code) {
        return `/assets/flags/${code}.svg`;
    }

    function renderNow() {

        const listening = data.listening;
        const beacon = listening ? data.beacons[listening.beacon] : null;

        $("bm-now-call").textContent = beacon ? beacon.call : "—";
        const img = $("bm-now-flag");
        if (beacon) img.src = flag(beacon.country);
        else img.removeAttribute("src");
        $("bm-now-place").textContent = beacon ? beacon.place : (data.supported ? "Press START to listen" : "FTDX10 or FTX-1 needed");
        $("bm-now-band").textContent = listening ? `${data.bands[listening.band].band} · ${(data.bands[listening.band].hz / 1e6).toFixed(3)}` : "—";
        const g = listening ? geo[listening.beacon] : null;
        $("bm-now-dist").textContent = g && g.distance ? `${Math.round(g.distance).toLocaleString("de-CH")} km · ${Math.round(g.bearing)}°` : "—";
        const sm = data.live?.smeter ?? 0;
        $("bm-now-sm").textContent = data.running ? smeterText(sm) : "—";

        // last finished beacon
        const last = [...(data.latest || [])].sort((a, b) => b.at - a.at)[0];
        const row = $("bm-last").querySelector(".bm-dash-row");
        if (last) {
            const b = data.beacons[last.beacon];
            row.innerHTML = `<span style="white-space:nowrap;font-weight:800">${esc(b.call)} <small style="color:var(--bm-muted);font-weight:600">${esc(data.bands[last.band].band)}</small></span>`
                + DASH_LABELS.map((label, i) => `<div class="bm-dash${i < last.dashes ? " on" : ""}" style="--c:${COLORS[last.dashes]}"><i></i>${label}</div>`).join("");
        }
        else {
            row.innerHTML = '<span class="bm-empty">no result yet</span>';
        }

    }

    function smeterText(raw) {
        // Yaesu 0-255: S9 ~ 130, S9+60 = 255
        if (raw <= 130) return `S${Math.max(0, Math.round(raw / 130 * 9))}`;
        return `S9+${Math.round((raw - 130) / 125 * 60)}`;
    }

    function pips(result) {
        const dashes = result ? result.dashes : 0;
        return `<span class="bm-pips">${[0, 1, 2, 3].map(i => `<i style="${i < dashes ? `background:${COLORS[dashes]};box-shadow:0 0 6px ${COLORS[dashes]}` : ""}"></i>`).join("")}</span>`;
    }

    function renderOnAir() {
        $("bm-onair").innerHTML = data.bands.map((b, index) => {
            const beaconIndex = data.onAir[index];
            const beacon = data.beacons[beaconIndex];
            const listening = data.listening && data.listening.band === index;
            return `
                <div class="bm-onair-row${listening ? " listening" : ""}">
                    <span class="bm-onair-band">${(b.hz / 1e6).toFixed(3)}</span>
                    <img src="${flag(beacon.country)}" alt="">
                    <span><b>${esc(beacon.call)}</b><small>${esc(beacon.place)}</small></span>
                    ${pips(resultFor(beaconIndex, index))}
                </div>`;
        }).join("");
    }

    function renderMatrix() {

        const onAir = data.onAir;
        let html = '<div class="bm-mhead">BEACON</div>' + data.bands.map(b => `<div class="bm-mhead">${b.band}</div>`).join("");

        data.beacons.forEach((beacon, index) => {
            const g = geo[index];
            const isOnAir = onAir.includes(index);
            html += `
                <div class="bm-mname${isOnAir ? " onair" : ""}" title="${esc(beacon.place)} · ${esc(beacon.locator)}">
                    <img src="${flag(beacon.country)}" alt="">
                    <b>${esc(beacon.call)}</b>
                    <span>${esc(beacon.place)}</span>
                    <em>${g && g.distance ? `${Math.round(g.distance / 100) / 10}k km` : ""}</em>
                </div>`;
            data.bands.forEach((b, bandIndex) => {
                const r = resultFor(index, bandIndex);
                const classes = ["bm-cell"];
                if (!r) classes.push("none");
                else if (now() - r.at > OLD_MS) classes.push("old");
                if (onAir[bandIndex] === index) classes.push("onair");
                if (data.listening && data.listening.band === bandIndex && data.listening.beacon === index) classes.push("listening");
                const tip = r
                    ? `${beacon.call} on ${b.band}: ${r.dashes ? `${r.dashes} of 4 dashes (down to ${DASH_LABELS[r.dashes - 1]})` : "not heard"} · ${r.snr} dB over the noise · ${smeterText(r.smeter)} · ${ago(r.at)}`
                    : `${beacon.call} on ${b.band}: not measured yet`;
                html += `<div class="${classes.join(" ")}" title="${esc(tip)}">${[0, 1, 2, 3].map(i =>
                    `<i class="${r && i < r.dashes ? "on" : ""}" style="--c:${COLORS[r ? r.dashes : 0]}"></i>`).join("")}</div>`;
            });
        });

        $("bm-matrix").innerHTML = html;

    }

    function renderTimeline() {

        const history = data.history || [];
        const end = now();
        const start = end - hours * 3600_000;
        const buckets = 48;
        const width = (end - start) / buckets;

        if (!history.length) {
            $("bm-timeline").innerHTML = '<div class="bm-empty">No measurements yet - start the monitor and come back in a few minutes.</div>';
            return;
        }

        let html = "";
        data.bands.forEach((b, bandIndex) => {
            const heard = Array.from({ length: buckets }, () => new Set());
            const measured = Array.from({ length: buckets }, () => new Set());
            const best = new Array(buckets).fill(0);
            for (const [at, beacon, bnd, dashes] of history) {
                if (bnd !== bandIndex || at < start) continue;
                const i = Math.min(buckets - 1, Math.floor((at - start) / width));
                measured[i].add(beacon);
                if (dashes > 0) heard[i].add(beacon);
                best[i] = Math.max(best[i], dashes);
            }
            html += `<div class="bm-tl-row"><span class="bm-tl-band">${b.band}</span><div class="bm-tl-bars">`;
            for (let i = 0; i < buckets; i++) {
                const from = new Date(start + i * width);
                const label = `${from.getHours().toString().padStart(2, "0")}:${from.getMinutes().toString().padStart(2, "0")}`;
                if (!measured[i].size) {
                    html += `<i style="height:3px;opacity:.35" title="${label} · not measured"></i>`;
                    continue;
                }
                const share = heard[i].size / 18;
                html += `<i style="height:${Math.max(3, Math.round(share * 34))}px;background:${COLORS[best[i]]};box-shadow:0 0 6px ${best[i] ? COLORS[best[i]] : "transparent"}" title="${label} · ${heard[i].size} of ${measured[i].size} measured beacons heard"></i>`;
            }
            html += "</div></div>";
        });

        const label = t => { const d = new Date(t); return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; };
        html += `<div class="bm-tl-axis"><span>${label(start)}</span><span>${label(start + (end - start) / 2)}</span><span>now</span></div>`;

        $("bm-timeline").innerHTML = html;

    }

    /* ------------------------------------------------------------ animation */

    const radar = $("bm-radar");
    const trace = $("bm-trace");

    function sizeCanvas(canvas) {
        const rect = canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        const w = Math.max(1, Math.round(rect.width * dpr));
        const h = Math.max(1, Math.round(rect.height * dpr));
        if (canvas.width !== w || canvas.height !== h) {
            canvas.width = w;
            canvas.height = h;
        }
        return { w, h, dpr };
    }

    function drawRadar(time) {

        const { w, h, dpr } = sizeCanvas(radar);
        const ctx = radar.getContext("2d");
        const cx = w / 2, cy = h / 2;
        const R = Math.min(w, h) / 2 - 26 * dpr;

        ctx.clearRect(0, 0, w, h);

        // background
        const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 1.05);
        bg.addColorStop(0, "rgba(0, 229, 255, 0.10)");
        bg.addColorStop(0.6, "rgba(0, 60, 80, 0.10)");
        bg.addColorStop(1, "rgba(0, 0, 0, 0)");
        ctx.fillStyle = bg;
        ctx.beginPath();
        ctx.arc(cx, cy, R, 0, Math.PI * 2);
        ctx.fill();

        // rings 5000 km
        ctx.lineWidth = dpr;
        ctx.font = `${10 * dpr}px Inter, system-ui, sans-serif`;
        ctx.textAlign = "left";
        ctx.textBaseline = "bottom";
        [5000, 10000, 15000, 20000].forEach(km => {
            const r = R * km / 20000;
            ctx.strokeStyle = km === 20000 ? "rgba(0, 229, 255, 0.35)" : "rgba(0, 229, 255, 0.12)";
            ctx.setLineDash(km === 20000 ? [] : [3 * dpr, 5 * dpr]);
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.stroke();
            ctx.fillStyle = "rgba(111, 141, 153, 0.8)";
            if (km < 20000) ctx.fillText(`${km / 1000}k km`, cx + 4 * dpr, cy - r - 2 * dpr);
        });
        ctx.setLineDash([]);

        // spokes + compass
        for (let a = 0; a < 360; a += 30) {
            const rad = (a - 90) * Math.PI / 180;
            ctx.strokeStyle = a % 90 === 0 ? "rgba(0, 229, 255, 0.16)" : "rgba(0, 229, 255, 0.06)";
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(cx + Math.cos(rad) * R, cy + Math.sin(rad) * R);
            ctx.stroke();
        }
        ctx.fillStyle = "#7ceaff";
        ctx.font = `700 ${12 * dpr}px Inter, system-ui, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        [["N", 0], ["E", 90], ["S", 180], ["W", 270]].forEach(([label, a]) => {
            const rad = (a - 90) * Math.PI / 180;
            ctx.fillText(label, cx + Math.cos(rad) * (R + 14 * dpr), cy + Math.sin(rad) * (R + 14 * dpr));
        });

        // sweep: towards the beacon we listen to, idle: one turn per 3 minutes
        let target;
        if (data?.listening && geo[data.listening.beacon]) target = geo[data.listening.beacon].bearing;
        else target = ((now() % 180000) / 180000) * 360;
        let diff = ((target - sweep + 540) % 360) - 180;
        sweep = (sweep + diff * (data?.listening ? 0.08 : 1) + 360) % 360;

        const sweepRad = (sweep - 90) * Math.PI / 180;
        if (ctx.createConicGradient) {
            const cone = ctx.createConicGradient(sweepRad - Math.PI / 3, cx, cy);
            cone.addColorStop(0, "rgba(0, 229, 255, 0)");
            cone.addColorStop(1 / 6, "rgba(0, 229, 255, 0.22)");
            cone.addColorStop(1 / 6 + 0.001, "rgba(0, 229, 255, 0)");
            cone.addColorStop(1, "rgba(0, 229, 255, 0)");
            ctx.fillStyle = cone;
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.arc(cx, cy, R, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.strokeStyle = "rgba(0, 229, 255, 0.85)";
        ctx.lineWidth = 2 * dpr;
        ctx.shadowColor = "#00e5ff";
        ctx.shadowBlur = 12 * dpr;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(sweepRad) * R, cy + Math.sin(sweepRad) * R);
        ctx.stroke();
        ctx.shadowBlur = 0;

        // QTH
        const pulse = (Math.sin(time / 400) + 1) / 2;
        ctx.fillStyle = "#ffffff";
        ctx.shadowColor = "#00e5ff";
        ctx.shadowBlur = (10 + pulse * 10) * dpr;
        ctx.beginPath();
        ctx.arc(cx, cy, 4 * dpr, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        if (!data) return;

        // beacons
        const onAir = data.onAir || [];
        const listening = data.listening?.beacon;
        ctx.font = `700 ${11 * dpr}px Inter, system-ui, sans-serif`;
        ctx.textBaseline = "middle";

        data.beacons.forEach((beacon, index) => {

            const g = geo[index];
            if (!g || !g.distance) return;

            const r = Math.min(1, g.distance / 20000) * R;
            const rad = (g.bearing - 90) * Math.PI / 180;
            const x = cx + Math.cos(rad) * r;
            const y = cy + Math.sin(rad) * r;
            g.x = x / dpr;
            g.y = y / dpr;

            const result = radarResult(index);
            const dashes = result ? result.dashes : 0;
            const color = COLORS[dashes];
            const old = result && now() - result.at > OLD_MS;

            // on the air: ring
            if (onAir.includes(index)) {
                const phase = ((time / 1600) + index * 0.13) % 1;
                ctx.strokeStyle = index === listening ? `rgba(255,255,255,${1 - phase})` : `rgba(0,229,255,${0.6 * (1 - phase)})`;
                ctx.lineWidth = (index === listening ? 2 : 1) * dpr;
                ctx.beginPath();
                ctx.arc(x, y, (8 + phase * 18) * dpr, 0, Math.PI * 2);
                ctx.stroke();
            }

            // path to the beacon we listen to
            if (index === listening) {
                const grad = ctx.createLinearGradient(cx, cy, x, y);
                grad.addColorStop(0, "rgba(0,229,255,0.0)");
                grad.addColorStop(1, "rgba(255,255,255,0.7)");
                ctx.strokeStyle = grad;
                ctx.lineWidth = 1.5 * dpr;
                ctx.beginPath();
                ctx.moveTo(cx, cy);
                ctx.lineTo(x, y);
                ctx.stroke();
            }

            // dot
            const size = (4 + dashes * 1.6 + (index === hover ? 2 : 0)) * dpr;
            ctx.globalAlpha = old ? 0.4 : 1;
            ctx.fillStyle = color;
            ctx.shadowColor = dashes ? color : "transparent";
            ctx.shadowBlur = dashes ? (8 + dashes * 4) * dpr : 0;
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
            if (!dashes) {
                ctx.strokeStyle = "rgba(124, 234, 255, 0.45)";
                ctx.lineWidth = dpr;
                ctx.stroke();
            }

            // label
            const right = x <= cx;
            ctx.textAlign = right ? "right" : "left";
            ctx.fillStyle = index === listening ? "#ffffff" : dashes ? "#d8eef5" : "rgba(160, 190, 200, 0.75)";
            ctx.fillText(beacon.call, x + (right ? -1 : 1) * (size + 6 * dpr), y);
            ctx.globalAlpha = 1;

        });

    }

    function drawTrace() {

        const { w, h, dpr } = sizeCanvas(trace);
        const ctx = trace.getContext("2d");
        ctx.clearRect(0, 0, w, h);

        const pad = 6 * dpr;
        const maxDb = 40;
        const yOf = db => h - pad - Math.max(0, Math.min(maxDb, db)) / maxDb * (h - 2 * pad);
        const xOf = t => pad + (t / 10000) * (w - 2 * pad);

        // second ticks
        ctx.strokeStyle = "rgba(255,255,255,0.05)";
        ctx.lineWidth = dpr;
        for (let s = 0; s <= 10; s++) {
            ctx.beginPath();
            ctx.moveTo(xOf(s * 1000), pad);
            ctx.lineTo(xOf(s * 1000), h - pad);
            ctx.stroke();
        }

        // threshold
        ctx.strokeStyle = "rgba(240, 210, 43, 0.35)";
        ctx.setLineDash([4 * dpr, 4 * dpr]);
        ctx.beginPath();
        ctx.moveTo(pad, yOf(6));
        ctx.lineTo(w - pad, yOf(6));
        ctx.stroke();
        ctx.setLineDash([]);

        const points = data?.live?.trace || [];
        if (points.length > 1) {
            const grad = ctx.createLinearGradient(0, pad, 0, h - pad);
            grad.addColorStop(0, "rgba(46, 232, 140, 0.55)");
            grad.addColorStop(1, "rgba(0, 229, 255, 0.02)");
            ctx.beginPath();
            ctx.moveTo(xOf(points[0][0]), h - pad);
            points.forEach(([t, db]) => ctx.lineTo(xOf(t), yOf(db)));
            ctx.lineTo(xOf(points[points.length - 1][0]), h - pad);
            ctx.closePath();
            ctx.fillStyle = grad;
            ctx.fill();
            ctx.beginPath();
            points.forEach(([t, db], i) => (i ? ctx.lineTo(xOf(t), yOf(db)) : ctx.moveTo(xOf(t), yOf(db))));
            ctx.strokeStyle = "#2ee88c";
            ctx.lineWidth = 1.5 * dpr;
            ctx.shadowColor = "#2ee88c";
            ctx.shadowBlur = 6 * dpr;
            ctx.stroke();
            ctx.shadowBlur = 0;
        }
        else {
            ctx.fillStyle = "rgba(111, 141, 153, 0.8)";
            ctx.font = `${11 * dpr}px Inter, system-ui, sans-serif`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(data?.running ? "listening …" : "signal trace of the current beacon", w / 2, h / 2);
        }

        // cursor
        if (data?.running) {
            const t = (now() - data.slotStart) % 10000;
            ctx.strokeStyle = "rgba(0, 229, 255, 0.8)";
            ctx.lineWidth = dpr;
            ctx.beginPath();
            ctx.moveTo(xOf(t), pad);
            ctx.lineTo(xOf(t), h - pad);
            ctx.stroke();
        }

    }

    function frame(time) {

        drawRadar(time);
        drawTrace();

        // ring + seconds + cycle
        const n = now();
        const inSlot = n % 10000;
        const left = Math.ceil((10000 - inSlot) / 1000);
        $("bm-sec").textContent = data?.running ? String(left) : "--";
        $("bm-ring").style.strokeDashoffset = data?.running ? String(326.7 * (1 - inSlot / 10000)) : "326.7";
        const inCycle = n % 180000;
        const cycleLeft = Math.ceil((180000 - inCycle) / 1000);
        $("bm-cycle").textContent = `next cycle in ${Math.floor(cycleLeft / 60)}:${String(cycleLeft % 60).padStart(2, "0")}`;

        requestAnimationFrame(frame);

    }

    /* radar tooltip */
    radar.addEventListener("mousemove", event => {
        if (!data) return;
        const rect = radar.getBoundingClientRect();
        const x = event.clientX - rect.left, y = event.clientY - rect.top;
        let found = -1, bestD = 14;
        geo.forEach((g, i) => {
            if (g.x === undefined) return;
            const d = Math.hypot(g.x - x, g.y - y);
            if (d < bestD) { bestD = d; found = i; }
        });
        hover = found;
        const tip = $("bm-radar-tip");
        if (found < 0) { tip.hidden = true; return; }
        const beacon = data.beacons[found];
        const g = geo[found];
        const rows = data.bands.map((b, bandIndex) => {
            const r = resultFor(found, bandIndex);
            return `${b.band}: ${r ? `${pips(r)} ${r.dashes ? DASH_LABELS[r.dashes - 1] : "not heard"} <span style="color:#6f8d99">${ago(r.at)}</span>` : '<span style="color:#6f8d99">—</span>'}`;
        }).join("<br>");
        tip.innerHTML = `<b>${esc(beacon.call)}</b> · ${esc(beacon.place)}<br>${Math.round(g.distance).toLocaleString("de-CH")} km · ${Math.round(g.bearing)}°<br>${rows}`;
        tip.style.left = `${x}px`;
        tip.style.top = `${y}px`;
        tip.hidden = false;
    });

    radar.addEventListener("mouseleave", () => {
        hover = -1;
        $("bm-radar-tip").hidden = true;
    });

    /* ------------------------------------------------------------ start */

    async function loadStation() {
        try {
            const response = await fetch("/api/station", { cache: "no-store" });
            const station = await response.json();
            qth = locatorToLatLon(station.locator);
        }
        catch { /* no station */ }
        computeGeo();
    }

    function schedule() {
        setTimeout(async () => {
            if (!document.hidden) await load();
            schedule();
        }, data?.running ? 400 : 3000);
    }

    initControls();
    loadStation().then(load).then(schedule);
    requestAnimationFrame(frame);

})();
