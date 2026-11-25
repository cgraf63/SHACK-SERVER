/* =========================================================
   YEAR IN REVIEW  (review.html, data: GET /api/qso/review?year=)
   ========================================================= */

(() => {

    const BAND_ORDER = ["160m", "80m", "60m", "40m", "30m", "20m", "17m", "15m", "12m", "11m", "10m", "6m", "4m", "2m", "70cm", "23cm"];
    const BAND_COLORS = {
        "160m": "#a06cff", "80m": "#6c8cff", "60m": "#5ab4ff", "40m": "#00e5ff",
        "30m": "#00d6a0", "20m": "#2ee88c", "17m": "#b8f000", "15m": "#ffd400",
        "12m": "#ffa000", "11m": "#ff8a5c", "10m": "#ff6a3d", "6m": "#ff3d7f",
        "4m": "#ff5cb0", "2m": "#ff66d0", "70cm": "#e08cff", "23cm": "#c0a0ff"
    };
    const MODE_COLORS = ["#00e5ff", "#2ee88c", "#ffc400", "#ff6a3d", "#a06cff", "#ff3d7f", "#6c8cff", "#9aa7b0"];
    const MONTHS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
    const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const EARTH_KM = 40075;

    const $ = id => document.getElementById(id);
    const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c]));
    const fmt = n => Number(n || 0).toLocaleString("de-CH");
    const bandColor = band => BAND_COLORS[band] || "#9aa7b0";
    const flag = code => code ? `<img src="/assets/flags/${esc(code)}.svg" alt="" onerror="this.style.visibility='hidden'">` : "<span></span>";

    let data = null;
    let map = null;
    let layer = null;
    let mapBand = "all";

    function bandSort(a, b) {
        const ia = BAND_ORDER.indexOf(a), ib = BAND_ORDER.indexOf(b);
        return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
    }

    function prettyDate(iso) {
        const [y, m, d] = String(iso || "").split("-").map(Number);
        if (!y || !m || !d) return iso || "";
        return `${d}. ${MONTH_NAMES[m - 1]} ${y}`;
    }

    /* ------------------------------------------------------------ load */

    async function load(year) {
        try {
            const response = await fetch(`/api/qso/review${year ? `?year=${year}` : ""}`, { cache: "no-store" });
            data = await response.json();
            if (!response.ok) throw new Error(data.error || response.statusText);
            mapBand = "all";
            render();
        }
        catch (error) {
            $("yr-empty").hidden = false;
            $("yr-empty").textContent = `Could not load the review: ${error.message}`;
        }
    }

    fetch("/api/settings").then(r => r.json()).then(s => {
        if (s.callsign) $("yr-call").textContent = String(s.callsign).toUpperCase();
    }).catch(() => undefined);

    /* ------------------------------------------------------------ render */

    function render() {
        $("yr-year").textContent = data.year;
        document.title = `${data.year} Year in Review - SHACK-SERVER`;

        $("yr-years").innerHTML = (data.years.length ? data.years : [data.year])
            .map(y => `<button type="button" data-year="${y}" class="${y === data.year ? "active" : ""}">${y}</button>`).join("");

        const t = data.totals;
        const empty = !t.qsos;
        $("yr-empty").hidden = !empty;
        $("yr-empty").textContent = "No QSOs in this year.";
        $("yr-sub").textContent = empty ? "from your QSO log" : `${fmt(t.qsos)} QSOs on ${t.activeDays} days · from your QSO log`;

        renderHero(t);
        renderMap();
        renderMonths();
        renderBands();
        renderModes();
        renderHours();
        renderTop();
        renderNew();
        renderHighlights();
    }

    function renderHero(t) {
        const rate = t.qsos ? Math.round(t.confirmed / t.qsos * 100) : 0;
        const laps = t.km / EARTH_KM;
        const tiles = [
            ["QSOS", fmt(t.qsos), t.activeDays ? `${(t.qsos / t.activeDays).toFixed(1)} per active day` : ""],
            ["STATIONS", fmt(t.stations), "different callsigns"],
            ["DXCC", fmt(t.entities), `${t.continents} continent${t.continents === 1 ? "" : "s"}`],
            ["NEW DXCC", fmt(t.newEntities), "first time ever", "gold"],
            ["ACTIVE DAYS", fmt(t.activeDays), `of ${isLeap(data.year) ? 366 : 365}`],
            ["CONFIRMED", `${rate}%`, `${fmt(t.confirmed)} QSL`],
            ["DISTANCE", t.km >= 1e6 ? `${(t.km / 1e6).toFixed(1)}M` : fmt(t.km), `km · ${laps >= 1 ? `${laps.toFixed(1)} × around the earth` : `${Math.round(laps * 100)} % around the earth`}`]
        ];
        $("yr-hero").innerHTML = tiles.map(([label, value, note, cls]) =>
            `<div class="yr-stat ${cls || ""}"><span>${label}</span><strong>${value}</strong><small>${esc(note)}</small></div>`).join("");
    }

    function isLeap(y) {
        return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
    }

    /* ------------------------------------------------------------ map */

    function greatCircle(a, b, steps = 48) {
        const rad = Math.PI / 180;
        const [lat1, lon1, lat2, lon2] = [a[0] * rad, a[1] * rad, b[0] * rad, b[1] * rad];
        const d = 2 * Math.asin(Math.sqrt(Math.sin((lat2 - lat1) / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin((lon2 - lon1) / 2) ** 2));
        if (!d) return [a, b];
        const out = [];
        let prevLon = null;
        for (let i = 0; i <= steps; i++) {
            const f = i / steps;
            const A = Math.sin((1 - f) * d) / Math.sin(d);
            const B = Math.sin(f * d) / Math.sin(d);
            const x = A * Math.cos(lat1) * Math.cos(lon1) + B * Math.cos(lat2) * Math.cos(lon2);
            const y = A * Math.cos(lat1) * Math.sin(lon1) + B * Math.cos(lat2) * Math.sin(lon2);
            const z = A * Math.sin(lat1) + B * Math.sin(lat2);
            const lat = Math.atan2(z, Math.sqrt(x * x + y * y)) / rad;
            let lon = Math.atan2(y, x) / rad;
            if (prevLon !== null) {
                while (lon - prevLon > 180) lon -= 360;
                while (lon - prevLon < -180) lon += 360;
            }
            prevLon = lon;
            out.push([lat, lon]);
        }
        return out;
    }

    function renderMap() {
        if (typeof L === "undefined") return;

        if (!map) {
            map = L.map("yr-map", { preferCanvas: true, worldCopyJump: true, minZoom: 1 }).setView([data.home.lat, data.home.lon], 2);
            L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
                maxZoom: 10,
                attribution: "&copy; OpenStreetMap contributors"
            }).addTo(map);
        }

        const bands = [...new Set(data.points.map(p => p.band))].sort(bandSort);
        $("yr-map-bands").innerHTML = ["all", ...bands].map(b =>
            `<button type="button" data-band="${esc(b)}" class="${b === mapBand ? "active" : ""}" ${b !== "all" ? `style="border-color:${bandColor(b)}"` : ""}>${b === "all" ? "ALL" : esc(b)}</button>`).join("");

        if (layer) layer.remove();
        layer = L.layerGroup().addTo(map);

        const home = [data.home.lat, data.home.lon];
        const points = data.points.filter(p => mapBand === "all" || p.band === mapBand);
        const far = [...points].sort((a, b) => b.km - a.km);

        // lines for the farthest 1500, dots for all
        far.slice(0, 1500).forEach(p => {
            L.polyline(greatCircle(home, [p.lat, p.lon]), {
                color: bandColor(p.band), weight: 1, opacity: 0.35, interactive: false
            }).addTo(layer);
        });

        points.forEach(p => {
            L.circleMarker([p.lat, p.lon], {
                radius: 3.5, color: bandColor(p.band), weight: 1, fillColor: bandColor(p.band), fillOpacity: 0.9
            }).bindPopup(`<div class="yr-pop">${flag(p.code)}<b>${esc(p.call)}</b><br>${esc(p.country)}<br>${esc(p.band)} · ${esc(p.mode)} · ${fmt(p.km)} km<br>${esc(prettyDate(p.date))}</div>`).addTo(layer);
        });

        L.circleMarker(home, { radius: 6, color: "#fff", weight: 2, fillColor: "#00e5ff", fillOpacity: 1 })
            .bindPopup("<b>Your QTH</b>").addTo(layer);

        setTimeout(() => {
            map.invalidateSize();
            if (points.length) {
                map.fitBounds(L.latLngBounds([home, ...points.map(p => [p.lat, p.lon])]), { padding: [20, 20], maxZoom: 6 });
            }
        }, 50);
    }

    /* ------------------------------------------------------------ charts */

    function columns(values, labels, { highlight = -1, color = "#00e5ff", height = 150 } = {}) {
        const w = 320, h = height, pad = 18, n = values.length;
        const max = Math.max(1, ...values);
        const bw = (w - 4) / n;
        let svg = `<svg viewBox="0 0 ${w} ${h + pad}" role="img">`;
        svg += `<defs><linearGradient id="yrg-${n}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${color}"/><stop offset="1" stop-color="${color}" stop-opacity="0.25"/></linearGradient></defs>`;
        values.forEach((v, i) => {
            const bh = Math.max(v ? 2 : 0, (v / max) * (h - 16));
            const x = 2 + i * bw + bw * 0.15;
            const fill = i === highlight ? "#ffc400" : `url(#yrg-${n})`;
            svg += `<rect x="${x.toFixed(1)}" y="${(h - bh).toFixed(1)}" width="${(bw * 0.7).toFixed(1)}" height="${bh.toFixed(1)}" rx="2" fill="${fill}"><title>${esc(labels[i])}: ${v}</title></rect>`;
            if (n <= 12 && v) svg += `<text class="yr-val" x="${(x + bw * 0.35).toFixed(1)}" y="${(h - bh - 4).toFixed(1)}" text-anchor="middle">${v}</text>`;
            if (n <= 12 || i % 3 === 0) svg += `<text x="${(x + bw * 0.35).toFixed(1)}" y="${h + 13}" text-anchor="middle">${esc(n <= 12 ? MONTHS[i] : String(i).padStart(2, "0"))}</text>`;
        });
        return svg + "</svg>";
    }

    function renderMonths() {
        const best = data.months.indexOf(Math.max(...data.months));
        $("yr-months").innerHTML = columns(data.months, MONTH_NAMES, { highlight: data.totals.qsos ? best : -1 });
    }

    function renderHours() {
        const best = data.hours.indexOf(Math.max(...data.hours));
        $("yr-hours").innerHTML = columns(data.hours, data.hours.map((_, i) => `${String(i).padStart(2, "0")}:00 UTC`), { highlight: data.totals.qsos ? best : -1, color: "#2ee88c" });
    }

    function renderBands() {
        const bands = [...data.bands].sort((a, b) => bandSort(a.name, b.name));
        const max = Math.max(1, ...bands.map(b => b.count));
        $("yr-bands").innerHTML = bands.length ? bands.map(b => `
            <div class="yr-bar">
                <b style="color:${bandColor(b.name)}">${esc(b.name)}</b>
                <div class="track"><div class="fill" style="width:${(b.count / max * 100).toFixed(1)}%;background:${bandColor(b.name)}"></div></div>
                <span>${fmt(b.count)}</span>
            </div>`).join("") : `<div class="yr-none">—</div>`;
    }

    function renderModes() {
        const total = data.modes.reduce((s, m) => s + m.count, 0);
        let modes = data.modes.slice(0, 7);
        const rest = data.modes.slice(7).reduce((s, m) => s + m.count, 0);
        if (rest) modes = [...modes, { name: "OTHER", count: rest }];

        const r = 46, c = 2 * Math.PI * r;
        let offset = 0;
        let svg = `<svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="${r}" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="16"/>`;
        modes.forEach((m, i) => {
            const len = total ? m.count / total * c : 0;
            svg += `<circle cx="60" cy="60" r="${r}" fill="none" stroke="${MODE_COLORS[i % MODE_COLORS.length]}" stroke-width="16" stroke-dasharray="${len.toFixed(2)} ${(c - len).toFixed(2)}" stroke-dashoffset="${(-offset).toFixed(2)}" transform="rotate(-90 60 60)"><title>${esc(m.name)}: ${m.count}</title></circle>`;
            offset += len;
        });
        svg += `<text x="60" y="58" text-anchor="middle" style="fill:#fff;font-size:18px;font-weight:900">${data.modes.length}</text><text x="60" y="73" text-anchor="middle">MODES</text></svg>`;

        $("yr-modes").innerHTML = svg + `<div class="yr-legend">${modes.map((m, i) =>
            `<div><i style="background:${MODE_COLORS[i % MODE_COLORS.length]}"></i>${esc(m.name)}<span>${total ? Math.round(m.count / total * 100) : 0} %</span></div>`).join("")}</div>`;
    }

    /* ------------------------------------------------------------ lists */

    function renderTop() {
        $("yr-top").innerHTML = data.topEntities.length ? data.topEntities.map((e, i) => `
            <div class="yr-top-row">
                <span class="rank">${i + 1}</span>${flag(e.code)}
                <span class="name" title="${esc(e.name)}">${esc(e.name)}</span>
                <span class="count">${fmt(e.qsos)}</span>
            </div>`).join("") : `<div class="yr-none">—</div>`;
    }

    function renderNew() {
        $("yr-new").innerHTML = data.newEntities.length
            ? data.newEntities.map(e => `<div title="${esc(e.continent)} · ${e.qsos} QSO">${flag(e.code)}${esc(e.name)}</div>`).join("")
            : `<div class="yr-none">No new entity this year.</div>`;
    }

    function renderHighlights() {
        const f = data.farthest;
        $("yr-far").innerHTML = f ? `
            <div class="label">FARTHEST QSO</div>
            <div class="big">${flag(f.code)}${esc(f.call)}</div>
            <div class="meta">${fmt(f.km)} km · ${esc(f.country)}<br>${esc(f.band)} · ${esc(f.mode)} · ${esc(prettyDate(f.date))}</div>`
            : `<div class="label">FARTHEST QSO</div><div class="yr-none">—</div>`;

        const b = data.busiestDay;
        const top = data.topCalls[0];
        $("yr-best").innerHTML = `
            <div class="label">BUSIEST DAY</div>
            <div class="big">${b ? fmt(b.qsos) : "—"} <span style="font-size:14px;color:var(--yr-muted);font-weight:700">QSOs</span></div>
            <div class="meta">${b ? esc(prettyDate(b.date)) : ""}${top && top.count > 1 ? `<br>Most worked: <b style="color:#fff">${esc(top.call)}</b> (${top.count}×)` : ""}</div>`;
    }

    /* ------------------------------------------------------------ events */

    document.addEventListener("click", event => {
        const year = event.target.closest("#yr-years [data-year]");
        if (year) {
            load(Number(year.dataset.year));
            history.replaceState(null, "", `?year=${year.dataset.year}`);
            return;
        }
        const band = event.target.closest("#yr-map-bands [data-band]");
        if (band) {
            mapBand = band.dataset.band;
            renderMap();
        }
    });

    load(Number(new URLSearchParams(location.search).get("year")) || 0);

})();
