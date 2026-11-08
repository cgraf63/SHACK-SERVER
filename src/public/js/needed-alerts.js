/*
    SHACK-SERVER - last needed alerts in the dashboard (below the
    watch list). Data: /api/needed/recent (server, Settings -> Needed
    alerts). Click on an entry tunes the radio.
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

        if (!box || !list) return;

        const recent = (alerts || []).filter(a => Date.now() - a.at < 6 * 3600_000).slice(0, 4);

        box.hidden = recent.length === 0;

        list.innerHTML = recent.map(a => `
            <div class="needed-alert-item level-${esc(SHORT[a.level] || "NEW").toLowerCase().replace(".", "")}"
                 data-khz="${Number(a.frequency) || ""}" data-mode="${esc(a.mode)}"
                 title="${esc(`${a.level}: ${a.callsign} - ${a.entity} - ${(Number(a.frequency) / 1000).toFixed(3)} MHz ${a.mode}${a.heard ? " - " + a.heard : ""} - score ${a.score} - push: ${a.result}. Click to tune.`)}">
                <span class="needed-alert-level">${esc(SHORT[a.level] || a.level)}</span>
                <span class="needed-alert-call">${esc(a.callsign)}</span>
                <span class="needed-alert-qrg">${(Number(a.frequency) / 1000).toFixed(3)} ${esc(a.mode && a.mode !== "UNKNOWN" ? a.mode : "")}</span>
                ${a.nearby ? '<span class="heard-near-badge">NEAR</span>' : ""}
                <span class="needed-alert-age">${age(a.at)}</span>
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

    document.addEventListener("click", async event => {

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
