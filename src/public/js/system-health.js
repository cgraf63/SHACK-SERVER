/*
    SHACK-SERVER
    Station health card (dashboard command strip)

    Data: /api/system-status/health
    Checks transceiver (CAT), DX sources, database, temperature,
    power supply (Raspberry Pi), disk and memory.
    Hover: all checks. Click: Diagnostics page.
*/

let healthTimer = null;

const HEALTH_ICONS = {
    ok: "💚",
    warn: "💛",
    error: "❤️"
};

const HEALTH_MARKS = {
    ok: "✓",
    warn: "⚠",
    error: "✖"
};


function setHealthCard(icon, title, status, tooltip, state) {

    const iconElement =
        document.getElementById("station-health-icon");

    const titleElement =
        document.getElementById("station-health-title");

    const statusElement =
        document.getElementById("station-health-status");

    if (iconElement) iconElement.textContent = icon;
    if (titleElement) titleElement.textContent = title;
    if (statusElement) {
        statusElement.textContent = status;
        statusElement.style.color =
            state === "error" ? "#ff5252"
                : state === "warn" ? "#ffc400"
                    : "";
    }

    const tile =
        iconElement?.closest(".command-item");

    if (tile) {
        tile.title = tile.dataset.healthTip = tooltip;
        tile.dataset.healthState = state;
        tile.style.borderColor =
            state === "error" ? "rgba(255, 82, 82, 0.6)"
                : state === "warn" ? "rgba(255, 196, 0, 0.55)"
                    : "";
    }

}


async function updateSystemHealth() {

    try {

        const response =
            await fetch(
                "/api/system-status/health",
                { cache: "no-store" }
            );

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data =
            await response.json();

        const checks =
            Array.isArray(data.checks) ? data.checks : [];

        const tooltip =
            checks
                .map(check =>
                    `${HEALTH_MARKS[check.state] || "?"} ${check.name}: ${check.detail}`
                )
                .join("\n") +
            "\n\nClick for Diagnostics";

        setHealthCard(
            HEALTH_ICONS[data.state] || HEALTH_ICONS.warn,
            data.title || "STATION",
            data.summary || "",
            tooltip,
            data.state || "warn"
        );

    }
    catch (error) {

        setHealthCard(
            HEALTH_ICONS.error,
            "STATION ERROR",
            "Backend offline",
            "SHACK-SERVER does not respond.",
            "error"
        );

    }

}


function startSystemHealth() {

    const tile =
        document
            .getElementById("station-health-icon")
            ?.closest(".command-item");

    if (tile && !tile.dataset.healthClick) {

        tile.dataset.healthClick = "1";
        tile.style.cursor = "pointer";

        tile.addEventListener("click", () => {
            window.location.href = "/diagnostics.html";
        });

    }

    updateSystemHealth();

    if (healthTimer) {
        clearInterval(healthTimer);
    }

    healthTimer =
        setInterval(
            updateSystemHealth,
            15000
        );

}


window.addEventListener(
    "componentsLoaded",
    startSystemHealth
);
