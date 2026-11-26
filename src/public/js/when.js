/* =========================================================
   WHEN CAN I WORK IT?  (when.html)

   GET /api/when?q=          prediction for one entity
   GET /api/when/soon        needed entities, next 3 hours
   GET /api/when/entities    search list
   ========================================================= */

(() => {

    const $ = id => document.getElementById(id);
    const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c]));
    const hh = h => String((h + 24) % 24).padStart(2, "0");
    const pct = p => `${Math.round(p * 100)} %`;
    const flag = code => code ? `<img src="/assets/flags/${esc(code)}.svg" alt="" onerror="this.style.visibility='hidden'">` : "<span></span>";

    const STOPS = [[0, [18, 49, 58]], [0.33, [0, 166, 184]], [0.66, [46, 232, 140]], [1, [255, 212, 0]]];

    let data = null;
    let view = "auto";

    function color(p) {
        if (!p) return "";
        const v = Math.max(0.04, Math.min(1, p));
        for (let i = 1; i < STOPS.length; i++) {
            const [p1, c1] = STOPS[i];
            const [p0, c0] = STOPS[i - 1];
            if (v <= p1) {
                const f = (v - p0) / (p1 - p0);
                const c = c0.map((x, k) => Math.round(x + (c1[k] - x) * f));
                return `rgb(${c.join(",")})`;
            }
        }
        return "rgb(255,212,0)";
    }

    function sunColor(elev) {
        if (elev >= 10) return "#e8c95a";
        if (elev >= 0) return "#d9a640";
        if (elev >= -6) return "#c0633a";
        if (elev >= -12) return "#3a3350";
        return "#16222e";
    }

    function localHour(utcHour) {
        const d = new Date();
        d.setUTCHours(utcHour, 0, 0, 0);
        return `${String(d.getHours()).padStart(2, "0")}:00`;
    }

    /* ------------------------------------------------------------ data */

    function useMeasured() {
        if (view === "measured") return true;
        if (view === "model") return false;
        return data.reports > 0 && data.observedDays >= 3;
    }

    function windows(set, threshold) {
        const out = [];
        for (const [band, hours] of Object.entries(set)) {
            let start = -1;
            for (let h = 0; h <= 24; h++) {
                const p = h < 24 ? hours[h] : 0;
                if (p >= threshold && start < 0) start = h;
                if ((p < threshold || h === 24) && start >= 0) {
                    const slice = hours.slice(start, h);
                    out.push({ band, from: start, to: h, peak: Math.max(...slice) });
                    start = -1;
                }
            }
        }
        /* a window over midnight: join 23 -> 00 */
        for (const w of out.filter(x => x.to === 24)) {
            const head = out.find(x => x.band === w.band && x.from === 0 && x !== w);
            if (head) {
                w.to = 24 + head.to;
                w.peak = Math.max(w.peak, head.peak);
                out.splice(out.indexOf(head), 1);
            }
        }
        return out;
    }

    function bestText(set, measured) {
        const now = data.nowHour;
        const threshold = measured ? 0.25 : 0.45;
        const all = windows(set, threshold);
        if (!all.length) {
            return measured
                ? "No opening heard near you so far – see the sun model."
                : "The sun model sees no good opening today.";
        }

        const open = all.filter(w => (now >= w.from && now < w.to) || now + 24 < w.to).sort((a, b) => b.peak - a.peak);
        const ahead = all
            .map(w => ({ ...w, wait: ((w.from - now) + 24) % 24 }))
            .filter(w => !open.includes(w))
            .sort((a, b) => a.wait - b.wait || b.peak - a.peak);
        const top = [...all].sort((a, b) => b.peak - a.peak).slice(0, 3);
        const range = w => `${hh(w.from)}–${hh(w.to)} UTC`;

        let text = `<span class="src">${measured ? "HEARD NEAR YOU" : "SUN MODEL"}</span>`;
        if (open.length) text += `<span class="now">Open now:</span> ${open.map(w => `<b>${esc(w.band)}</b> (${pct(w.peak)})`).join(", ")}<br>`;
        if (ahead.length) text += `Next: <b>${esc(ahead[0].band)}</b> ${range(ahead[0])} – in ${ahead[0].wait} h<br>`;
        text += `Best: ${top.map(w => `<b>${esc(w.band)}</b> ${range(w)} (${pct(w.peak)})`).join(" · ")}`;
        return text;
    }

    /* while the sun model is shown: what was really heard so far */
    function heardLine() {
        const cells = [];
        for (const [band, days] of Object.entries(data.heardDays || {})) {
            days.forEach((k, h) => { if (k) cells.push({ band, h, k, n: Math.max(k, data.observedHours?.[h] ?? k) }); });
        }
        if (!cells.length) return "";
        cells.sort((a, b) => b.k / b.n - a.k / a.n || b.k - a.k || ((a.h - data.nowHour + 24) % 24) - ((b.h - data.nowHour + 24) % 24));
        return `<div class="wh-heard"><span class="src">HEARD NEAR YOU SO FAR</span>${cells.slice(0, 4).map(c => `<b>${esc(c.band)}</b> ${hh(c.h)}z (${daysText(c.k, c.n)})`).join(" · ")}</div>`;
    }

    function daysText(k, n) {
        return n < 7 ? `${k} of ${n} day${n === 1 ? "" : "s"}` : pct(k / n);
    }

    /* ------------------------------------------------------------ render */

    function render() {
        const measured = useMeasured();
        const set = measured ? data.measured : data.model;
        const e = data.entity;
        const now = data.nowHour;
        const bands = Object.keys(set);

        let grid = `<div></div>${Array.from({ length: 24 }, (_, h) => `<div class="hr${h === now ? " now" : ""}" title="${localHour(h)} local">${hh(h)}</div>`).join("")}`;
        grid += `<div class="lbl" title="Sun at your QTH">HERE ☀</div>${data.sun.home.map((el, h) => `<div class="wh-sunrow" style="background:${sunColor(el)}" title="${hh(h)} UTC · sun ${el}° at your QTH"></div>`).join("")}`;
        grid += `<div class="lbl" title="Sun in ${esc(e.name)}">THERE ☀</div>${data.sun.dx.map((el, h) => `<div class="wh-sunrow" style="background:${sunColor(el)}" title="${hh(h)} UTC · sun ${el}° in ${esc(e.name)}"></div>`).join("")}`;
        grid += `<div class="wh-sep"></div>`;

        for (const band of [...bands].reverse()) {
            const worked = data.workedBands.includes(band);
            grid += `<div class="lbl${worked ? " worked" : ""}" title="${worked ? `${esc(band)}: already in your log` : esc(band)}">${esc(band)}</div>`;
            set[band].forEach((p, h) => {
                grid += `<div class="wh-cell${h === now ? " now" : ""}${measured ? "" : " model"}" style="${p ? `background-color:${color(p)}` : ""}" title="${esc(band)} · ${hh(h)}–${hh(h + 1)} UTC (${localHour(h)} local) · ${measured ? `heard near you on ${daysText(data.heardDays?.[band]?.[h] ?? 0, Math.max(1, data.observedHours?.[h] ?? 0))}` : `sun model ${pct(p)}`}"></div>`;
            });
        }

        const last = data.lastHeard;
        const learning = data.observedDays < 7
            ? `Learning since ${data.observedDays} day${data.observedDays === 1 ? "" : "s"} – the chart gets better every day (up to 4 weeks).`
            : `Based on the last ${data.observedDays} days.`;

        $("wh-main").innerHTML = `
            <div class="wh-entity">
                ${e.flag ? `<img src="/assets/flags/${esc(e.flag)}.svg" alt="" onerror="this.remove()">` : ""}
                <div>
                    <h2>${esc(e.name)}</h2>
                    <div class="meta">${esc(e.key)} · ${esc(e.continent)} · CQ zone ${e.cqZone} · ${e.km.toLocaleString("de-CH")} km · ${e.azimuth}°</div>
                </div>
                <span class="wh-badge${data.worked ? " worked" : ""}">${data.worked ? `WORKED · ${data.workedBands.length} band${data.workedBands.length === 1 ? "" : "s"}` : "NEEDED"}</span>
            </div>
            <div class="wh-best">${bestText(set, measured)}${measured ? "" : heardLine()}</div>
            <div class="wh-sun">
                <span>Your QTH: sunrise <b>${data.sun.homeTimes.rise ?? "—"}</b> · sunset <b>${data.sun.homeTimes.set ?? "—"}</b> UTC</span>
                <span>${esc(e.name)}: sunrise <b>${data.sun.dxTimes.rise ?? "—"}</b> · sunset <b>${data.sun.dxTimes.set ?? "—"}</b> UTC</span>
            </div>
            <div class="wh-toolbar">
                <span class="wh-card-title">BAND × HOUR (UTC)</span>
                <div class="wh-toggle" role="group">
                    <button type="button" data-view="measured" class="${measured ? "active" : ""}" title="Heard by spotters within ${data.nearKm} km of your QTH">HEARD NEAR YOU</button>
                    <button type="button" data-view="model" class="${measured ? "" : "active"}" title="Rule of thumb from the sun along the path">SUN MODEL</button>
                </div>
            </div>
            <div class="wh-grid-wrap"><div class="wh-grid">${grid}</div></div>
            <div class="wh-legend">
                <span>less<span class="wh-scale"></span>more</span>
                <span><i style="background:#e8c95a"></i>day</span>
                <span><i style="background:#c0633a"></i>greyline</span>
                <span><i style="background:#16222e;border:1px solid #2a3a48"></i>night</span>
                <span style="color:#2ee88c">✓</span><span style="margin-left:-10px">band already worked</span>
            </div>
            <div class="wh-foot">
                ${measured
                    ? `Share of days on which a station of ${esc(e.name)} was heard by a spotter within ${data.nearKm} km of your QTH in that hour (DX cluster, RBN, PSK Reporter). ${learning}`
                    : `Sun model: high bands need daylight in the middle of the path, low bands darkness at both ends, greyline helps. A rule of thumb – the measured chart replaces it once enough days are collected. ${learning}`}
                ${last ? `<br>Last heard near you: <b>${esc(last.band)}</b> on ${esc(last.date)} at ${hh(last.hour)} UTC.` : ""}
            </div>`;

        document.querySelectorAll(".wh-soon-row").forEach(row => row.classList.toggle("active", row.dataset.key === e.key));
    }

    /* ------------------------------------------------------------ load */

    async function show(query, push = true) {
        const q = String(query || "").trim();
        if (!q) return;
        try {
            const response = await fetch(`/api/when?q=${encodeURIComponent(q)}`, { cache: "no-store" });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || response.statusText);
            if (!data || data.entity.key !== result.entity.key) view = "auto";
            data = result;
            render();
            if (push) history.replaceState(null, "", `?q=${encodeURIComponent(q)}`);
        }
        catch (error) {
            $("wh-main").innerHTML = `<div class="wh-empty">${esc(error.message)}: ${esc(q)}</div>`;
        }
    }

    async function loadSoon() {
        try {
            const list = await (await fetch("/api/when/soon", { cache: "no-store" })).json();
            $("wh-soon").innerHTML = list.length
                ? list.map(s => `
                    <div class="wh-soon-row" data-key="${esc(s.key)}" title="${esc(s.name)} – heard near you on ${esc(s.band)} around ${hh(s.hour)} UTC on ${s.days} of ${s.of} days${s.heardToday ? " (also today)" : ""}">
                        ${flag(s.flag)}<span class="name">${esc(s.name)}</span>
                        <span class="when">${esc(s.band)} · ${hh(s.hour)}z</span>
                        <span class="p" style="color:${color(s.probability)}">${s.of < 7 ? `${s.days}/${s.of} d` : pct(s.probability)}</span>
                    </div>`).join("")
                : `<div class="wh-none">Nothing yet. SHACK-SERVER learns from the spots it receives – after a day or two the countries you still need show up here.</div>`;
            if (data) document.querySelectorAll(".wh-soon-row").forEach(row => row.classList.toggle("active", row.dataset.key === data.entity.key));
        }
        catch {
            // not reachable
        }
    }

    fetch("/api/when/entities").then(r => r.json()).then(list => {
        $("wh-entities").innerHTML = list.map(e => `<option value="${esc(e.name)}">${esc(e.key)}</option>`).join("");
    }).catch(() => undefined);

    $("wh-form").addEventListener("submit", event => {
        event.preventDefault();
        show($("wh-q").value);
    });

    $("wh-soon").addEventListener("click", event => {
        const row = event.target.closest(".wh-soon-row");
        if (row) {
            $("wh-q").value = row.querySelector(".name").textContent;
            show(row.dataset.key);
        }
    });

    $("wh-main").addEventListener("click", event => {
        const button = event.target.closest("[data-view]");
        if (button && data) {
            view = button.dataset.view;
            render();
        }
    });

    const initial = new URLSearchParams(location.search).get("q");
    if (initial) {
        $("wh-q").value = initial;
        show(initial, false);
    }

    loadSoon();
    setInterval(loadSoon, 5 * 60 * 1000);
    setInterval(() => { if (data && !document.hidden) show(data.entity.key, false); }, 10 * 60 * 1000);

})();
