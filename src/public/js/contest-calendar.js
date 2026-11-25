/*
 * Contest Manager: upcoming contests (GET /api/contests/calendar).
 * Dates are computed on the server from the contest rules. "Use"
 * opens a new contest definition prefilled with name, bands, modes
 * and exchange (contest-manager.js, event shack:contest-prefill).
 */
(() => {

    const list = document.getElementById("cc-list");
    if (!list) return;

    const REGIONS = [["all", "ALL"], ["CH", "CH"], ["EU", "EU"], ["World", "WORLD"], ["VHF", "VHF"], ["NA", "NA"]];
    let region = "all";
    try { region = localStorage.getItem("cc-region") || "all"; } catch { /* no storage */ }

    let events = [];

    const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

    const dateFmt = new Intl.DateTimeFormat(undefined, { weekday: "short", day: "2-digit", month: "short" });
    const timeFmt = new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" });

    function until(start, end) {
        const now = Date.now();
        if (now >= start && now < end) {
            const left = Math.round((end - now) / 3_600_000);
            return `<span class="cc-live">ON AIR</span> <small>${left} h left</small>`;
        }
        const hours = (start - now) / 3_600_000;
        if (hours < 24) return `in ${Math.max(1, Math.round(hours))} h`;
        const days = Math.round(hours / 24);
        return `in ${days} day${days === 1 ? "" : "s"}`;
    }

    function renderFilters() {
        document.getElementById("cc-filters").innerHTML = REGIONS
            .map(([value, label]) => `<button type="button" data-cc-region="${value}" class="${value === region ? "active" : ""}">${label}</button>`)
            .join("");
    }

    function render() {

        const shown = events.filter(e => region === "all" || e.region === region);

        if (!shown.length) {
            list.innerHTML = '<div class="cc-empty">No contest in the next 60 days for this filter.</div>';
            return;
        }

        list.innerHTML = shown.map((e, index) => {
            const start = new Date(e.start);
            const end = new Date(e.end);
            const running = Date.now() >= start && Date.now() < end;
            const sameDay = start.toDateString() === new Date(end.getTime() - 1).toDateString();
            const when = sameDay
                ? `${dateFmt.format(start)} · ${timeFmt.format(start)}–${timeFmt.format(end)}`
                : `${dateFmt.format(start)} ${timeFmt.format(start)} – ${dateFmt.format(end)} ${timeFmt.format(end)}`;
            const utc = `${e.start.slice(11, 16)} UTC, ${e.hours} h`;
            return `
                <div class="cc-row${running ? " running" : ""}">
                    <div class="cc-when">
                        <b>${esc(when)}</b>
                        <small>${esc(utc)} · ${until(start.getTime(), end.getTime())}</small>
                    </div>
                    <div class="cc-name">
                        <b>${esc(e.name)}</b>
                        <small>${esc(e.sponsor)}${e.note ? ` · ${esc(e.note)}` : ""}${e.check ? ' · <span class="cc-check" title="Date from the usual rule - check the current announcement">check rules</span>' : ""}</small>
                    </div>
                    <div class="cc-tags">
                        <span class="cc-region r-${esc(e.region)}">${esc(e.region === "World" ? "WORLD" : e.region)}</span>
                        ${e.modes.map(m => `<span class="cc-tag">${esc(m)}</span>`).join("")}
                        <span class="cc-tag dim">${esc(e.bands.length ? (e.bands.length > 3 ? `${e.bands[0]}–${e.bands[e.bands.length - 1]}` : e.bands.join(" ")) : "432+ MHz")}</span>
                    </div>
                    <div class="cc-actions">
                        <a href="${esc(e.url)}" target="_blank" rel="noopener" title="Rules of the sponsor">RULES</a>
                        <button type="button" data-cc-use="${index}" title="New contest definition with these settings">USE</button>
                    </div>
                </div>`;
        }).join("");

        list._shown = shown;

    }

    async function load() {
        try {
            const response = await fetch("/api/contests/calendar?days=60", { cache: "no-store" });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            events = await response.json();
            render();
        }
        catch (error) {
            list.innerHTML = `<div class="cc-empty">Contest calendar not available (${esc(error.message)})</div>`;
        }
    }

    document.addEventListener("click", event => {
        const filter = event.target.closest?.("[data-cc-region]");
        if (filter) {
            region = filter.dataset.ccRegion;
            try { localStorage.setItem("cc-region", region); } catch { /* no storage */ }
            renderFilters();
            render();
            return;
        }
        const use = event.target.closest?.("[data-cc-use]");
        if (use) {
            const contest = list._shown?.[Number(use.dataset.ccUse)];
            if (contest) window.dispatchEvent(new CustomEvent("shack:contest-prefill", { detail: contest }));
        }
    });

    renderFilters();
    load();
    setInterval(render, 60_000);
    setInterval(load, 30 * 60_000);

})();
