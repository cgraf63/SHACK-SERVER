/*
    SHACK-SERVER - last needed alerts in the dashboard, in the place of
    Priority DX: when there are needed alerts of the last 3 hours, the
    card shows them ('New – "needed" callsigns'), otherwise Priority DX.
    Data: /api/needed/recent (Settings -> New "needed" callsigns).
    Click on an entry tunes the radio.
*/

(function () {

    if (window.shackNeededAlerts) {
        return;
    }

    const SHORT = {
        "NEW COUNTRY": "NEW",
        "NEW BAND COUNTRY": "BAND",
        "NEW BAND": "N.BAND",
        "NEW MODE": "N.MODE"
    };

    let lastJson = "";

    function esc(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    }

    function age(at) {
        const minutes = Math.max(0, Math.round((Date.now() - at) / 60000));
        return minutes < 60 ? `${minutes}m` : `${Math.round(minutes / 60)}h`;
    }

    function render(alerts) {

        const box = document.getElementById("needed-alerts");
        const list = document.getElementById("needed-alerts-items");
        const priority = document.getElementById("priority-dx-list");
        const title = document.getElementById("dx-focus-title");

        if (!box || !list) return;

        const all = (alerts || []).filter(a => Date.now() - a.at < 3 * 3600_000);

        lastAll = all;
        offset = Math.max(0, Math.min(offset, all.length - PAGE));

        const recent = all.slice(offset, offset + PAGE);

        box.hidden = all.length === 0;

        if (priority) priority.hidden = all.length > 0;

        if (title) {
            if (all.length) {
                /* more than 5: up / down (and the mouse wheel over the list) */
                const nav = all.length > PAGE
                    ? `<span class="needed-nav">
                           <button type="button" class="needed-nav-btn" data-nav="-1" ${offset === 0 ? "disabled" : ""} title="Newer">▲</button>
                           <span class="needed-nav-pos">${offset + 1}–${offset + recent.length}/${all.length}</span>
                           <button type="button" class="needed-nav-btn" data-nav="1" ${offset + PAGE >= all.length ? "disabled" : ""} title="Older">▼</button>
                       </span>`
                    : "";
                title.innerHTML = `<span>${nav ? 'New "needed"' : 'New – "needed" callsigns'}</span>${nav}`;
                title.title = `Stations you still need (new DXCC entity / band), last 3 hours - click to tune.\n`
                    + all.map(a => `${SHORT[a.level] || a.level}  ${a.callsign}  ${(Number(a.frequency) / 1000).toFixed(3)} ${a.mode && a.mode !== "UNKNOWN" ? a.mode : ""}  ${age(a.at)}`).join("\n");
            }
            else {
                title.textContent = "Priority DX";
                title.title = "Priority DX: the most distant stations in the live spots";
            }
        }

        lastRecent = all;

        list.innerHTML = recent.map(a => `
            <div class="needed-alert-item level-${esc(SHORT[a.level] || "NEW").toLowerCase().replace(".", "")}"
                 data-khz="${Number(a.frequency) || ""}" data-mode="${esc(a.mode)}"
                 title="${esc(`${a.level}: ${a.callsign} - ${a.entity} - ${(Number(a.frequency) / 1000).toFixed(3)} MHz ${a.mode}${a.heard ? " - " + a.heard : ""} - score ${a.score} - push: ${a.result}. Click to tune, VIEW details, LOG a QSO.`)}">
                <span class="needed-alert-level">${esc(SHORT[a.level] || a.level)}</span>
                <span class="needed-alert-call">${a.flag ? `<img class="needed-alert-flag" src="/assets/flags/${esc(a.flag)}.svg" alt="" title="${esc(a.entity)}">` : ""}${esc(a.callsign)}</span>
                <span class="needed-alert-qrg">${(Number(a.frequency) / 1000).toFixed(3)} ${esc(a.mode && a.mode !== "UNKNOWN" ? a.mode : "")}</span>
                ${a.nearby ? '<span class="heard-near-badge">NEAR</span>' : ""}
                <span class="needed-alert-age">${age(a.at)}</span>
                <span class="needed-alert-actions">
                    <button type="button" class="needed-btn" data-act="view" data-call="${esc(a.callsign)}" title="Details (QRZ)">VIEW</button>
                    <button type="button" class="needed-btn log" data-act="log" data-call="${esc(a.callsign)}" title="Log a QSO">LOG</button>
                </span>
            </div>
        `).join("");

    }

    async function load() {

        try {
            const response = await fetch("/api/needed/recent", { cache: "no-store" });
            if (!response.ok) return;
            const alerts = await response.json();
            const json = JSON.stringify(alerts);
            if (json !== lastJson) {
                lastJson = json;
            }
            render(alerts);
        }
        catch {
            // server not reachable
        }

    }

    let lastRecent = [];

    const PAGE = 5;
    let offset = 0;
    let lastAll = [];

    function scrollBy(step) {
        const next = Math.max(0, Math.min(offset + step, lastAll.length - PAGE));
        if (next === offset) return false;
        offset = next;
        render(lastAll);
        return true;
    }

    /* mouse wheel over the list */
    document.addEventListener("wheel", event => {
        if (!event.target.closest?.("#needed-alerts") || lastAll.length <= PAGE) return;
        if (scrollBy(event.deltaY > 0 ? 1 : -1)) event.preventDefault();
    }, { passive: false });

    /* the live spot of this call (all fields), else built from the alert */
    function spotFor(call) {
        const live = typeof currentSpots !== "undefined" && Array.isArray(currentSpots)
            ? currentSpots.find(spot => spot.call === call)
            : null;
        if (live) return { ...live };
        const alert = lastRecent.find(a => a.callsign === call) || {};
        return {
            call,
            frequency: Number(alert.frequency) || 0,
            mode: alert.mode && alert.mode !== "UNKNOWN" ? alert.mode : "",
            band: alert.band || "",
            country: alert.entity || "",
            countryCode: alert.flag || ""
        };
    }

    async function viewCall(call) {
        const spot = spotFor(call);
        try {
            const response = await fetch(`/api/qso/qrz/${encodeURIComponent(call)}`);
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.qrz) {
                    spot.image = data.qrz.image || "";
                    spot.qrzName = data.qrz.name || "";
                }
            }
        }
        catch {
            // without QRZ: details from the spot
        }
        if (typeof window.showSpotDetails === "function") window.showSpotDetails(spot);
    }

    async function logCall(call) {
        if (typeof openQsoDialog !== "function") return;
        let station = null;
        try {
            const response = await fetch("/api/station");
            if (response.ok) station = await response.json();
        }
        catch {
            // dialog without station data
        }
        openQsoDialog({ ...spotFor(call), qsoTimeUtc: new Date().toISOString() }, station);
    }

    document.addEventListener("click", async event => {

        const nav = event.target.closest?.(".needed-nav-btn[data-nav]");
        if (nav) {
            event.stopPropagation();
            scrollBy(Number(nav.dataset.nav));
            return;
        }

        const button = event.target.closest?.(".needed-btn");
        if (button) {
            event.stopPropagation();
            if (button.dataset.act === "view") viewCall(button.dataset.call);
            else logCall(button.dataset.call);
            return;
        }

        const item = event.target.closest?.(".needed-alert-item");

        if (!item || !item.dataset.khz) return;

        try {
            await fetch("/api/radio/tune", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ frequency: Math.round(Number(item.dataset.khz) * 1000), mode: item.dataset.mode })
            });
        }
        catch {
            // radio not reachable
        }

    });

    window.shackNeededAlerts = { reload: load };

    window.addEventListener("componentsLoaded", load);
    setTimeout(load, 1500);
    setInterval(load, 30000);

})();
