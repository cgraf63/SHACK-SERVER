/*
 * SHACK-SERVER
 * Diagnostics frontend
 */

const DIAGNOSTICS_INTERVAL = 5000;


/*
 * Load diagnostics
 */

async function loadDiagnostics() {

    try {

        const response =
            await fetch(
                "/api/diagnostics",
                {
                    cache: "no-store"
                }
            );


        if (!response.ok) {

            throw new Error(
                `HTTP ${response.status}`
            );

        }


        const data =
            await response.json();


        updateDiagnostics(
            data
        );

    }

    catch (error) {

        console.error(
            "Diagnostics error:",
            error
        );


        const updated =
            document.getElementById(
                "diagnostics-updated"
            );


        if (updated) {

            updated.textContent =
                "Diagnostics unavailable";

        }

    }

}


/*
 * Update complete diagnostics page
 */

function updateDiagnostics(
    data
) {

    updateSources(
        data.sources || []
    );


    updateFusion(
        data.fusion || {}
    );


    updateGeo(
        data.geo || {}
    );

 updateSystemLog(
        data.logs || []
    );

    const updated =
        document.getElementById(
            "diagnostics-updated"
        );


    if (updated) {

        updated.textContent =
            "Updated " +
            new Date().toLocaleTimeString();

    }

}


/*
 * Source Health
 *
 * Active
 *   Source delivered data recently.
 *
 * Silent
 *   Source is known, but no data was
 *   received for the configured timeout.
 *
 * Unknown
 *   No usable status information.
 */

/*
 * System Log
 */

function updateSystemLog(
    logs
) {

    const container =
        document.getElementById(
            "system-log"
        );

    if (!container) {
        return;
    }

    if (
        !Array.isArray(logs) ||
        !logs.length
    ) {

        container.innerHTML =
            '<div class="system-log-empty">' +
            'No log entries' +
            '</div>';

        return;

    }

    const visibleLogs =
        logs.slice(-20);

    container.innerHTML =
        visibleLogs
            .map(
                entry => `

                    <div class="system-log-row">

                        <span class="system-log-time">
                            ${escapeHtml(
                                entry.time || ""
                            )}
                        </span>

                        <span class="system-log-source">
                            ${escapeHtml(
                                entry.source || ""
                            )}
                        </span>

                        <span class="system-log-level">
                            ${escapeHtml(
                                entry.level || ""
                            )}
                        </span>

                        <span class="system-log-message">
                            ${escapeHtml(
                                entry.message || ""
                            )}
                        </span>

                    </div>

                `
            )
            .join("");

}



function updateSources(
    sources
) {

    const container =
        document.getElementById(
            "source-list"
        );


    if (!container) {
        return;
    }


    if (
        !Array.isArray(sources) ||
        !sources.length
    ) {

        container.innerHTML =
            '<div class="geo-empty">' +
            'No sources available' +
            '</div>';

        return;

    }


    container.innerHTML =
        sources
            .map(
                source => {

                    const status =
                        source.status || "Unknown";


                    const active =
                        status === "Active";


                    const silent =
                        status === "Silent";


                    /*
                     * Indicator
                     */

                    let indicatorClass =
                        "inactive";


                    if (active) {

                        indicatorClass =
                            "active";

                    }
                    else if (silent) {

                        indicatorClass =
                            "silent";

                    }


                    /*
                     * Status text
                     */

                    let statusClass =
                        "status-inactive";


                    if (active) {

                        statusClass =
                            "status-active";

                    }
                    else if (silent) {

                        statusClass =
                            "status-silent";

                    }


                    /*
                     * Age
                     */

                    const age =
                        typeof source.ageSeconds === "number"
                            ? formatAge(
                                source.ageSeconds
                            )
                            : "";


                    /*
                     * Silent hint
                     */

                    const silentHint =
                        silent
                            ? "No data received recently"
                            : "";


                    return `

                        <div
                            class="source-row"
                            title="${escapeHtml(
                                silentHint
                            )}"
                        >

                            <div class="source-name">

                                <span
                                    class="source-indicator ${indicatorClass}">
                                </span>

                                <span>
                                    ${escapeHtml(
                                        source.name || ""
                                    )}
                                </span>

                            </div>


                            <div class="source-status">

                                <span
                                    class="${statusClass}"
                                >

                                    ${escapeHtml(
                                        status
                                    )}

                                </span>


                                ${
                                    age
                                        ? `
                                            <span
                                                class="source-age"
                                            >
                                                ${age}
                                            </span>
                                          `
                                        : ""
                                }

                            </div>

                        </div>

                    `;

                }
            )
            .join("");

}


/*
 * Fusion Engine
 */

function updateFusion(
    fusion
) {

    setText(
        "fusion-total",
        fusion.total
    );


    setText(
        "fusion-under10",
        fusion.under10min
    );


    setText(
        "fusion-under30",
        fusion.under30min
    );


    setText(
        "fusion-calls",
        fusion.uniqueCalls
    );


    setText(
        "fusion-sources",
        fusion.sources
    );

}


/*
 * Geo enrichment
 */

function updateGeo(
    geo
) {

    setText(
        "geo-failed",
        geo.failed
    );


    const container =
        document.getElementById(
            "geo-list"
        );


    if (!container) {
        return;
    }


    const calls =
        Array.isArray(geo.calls)
            ? geo.calls
            : [];


    if (!calls.length) {

        container.innerHTML =
            '<div class="geo-empty">' +
            'No failed lookups' +
            '</div>';

        return;

    }


    /*
     * Only show the last 10 failed
     * lookup entries.
     *
     * The backend may contain many
     * historical attempts, but the
     * diagnostics display remains compact.
     */

    const visibleCalls =
        calls.slice(-10);


    container.innerHTML =
        visibleCalls
            .map(
                entry => `

                    <div class="geo-row">

                        <span class="geo-call">

                            ${escapeHtml(
                                entry.call || ""
                            )}

                        </span>


                        <span class="geo-attempts">

                            ${entry.attempts || 0}

                            attempt${
                                entry.attempts === 1
                                    ? ""
                                    : "s"
                            }

                        </span>

                    </div>

                `
            )
            .join("");

}


/*
 * System Actions
 */

async function systemAction(
    endpoint,
    message
) {

    const messageElement =
        document.getElementById(
            "system-message"
        );


    if (messageElement) {

        messageElement.textContent =
            message;

    }


    try {

        const response =
            await fetch(
                endpoint,
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/json"
                    }
                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.error ||
                `HTTP ${response.status}`
            );

        }


        if (messageElement) {

            messageElement.textContent =
                data.message ||
                "Command initiated";

        }

    }

    catch (error) {

        console.error(
            "System action failed:",
            error
        );


        if (messageElement) {

            messageElement.textContent =
                "Error: " +
                error.message;

        }

    }

}


/*
 * Restart SHACK-SERVER
 */

function restartServer() {

    if (
        !confirm(
            "Restart SHACK-SERVER?"
        )
    ) {

        return;

    }


    systemAction(
        "/api/system/restart",
        "Restarting SHACK-SERVER..."
    );

}


/*
 * Reboot Linux system
 */

function rebootSystem() {

    if (
        !confirm(
            "Reboot the complete system?"
        )
    ) {

        return;

    }


    systemAction(
        "/api/system/reboot",
        "System reboot initiated..."
    );

}


/*
 * Shutdown Linux system
 */

function shutdownSystem() {

    if (
        !confirm(
            "Shutdown the complete system?"
        )
    ) {

        return;

    }


    systemAction(
        "/api/system/shutdown",
        "System shutdown initiated..."
    );

}


/*
 * Helpers
 */

function setText(
    id,
    value
) {

    const element =
        document.getElementById(
            id
        );


    if (!element) {
        return;
    }


    element.textContent =
        value !== undefined &&
        value !== null
            ? value
            : "—";

}


/*
 * Format source age
 */

function formatAge(
    seconds
) {

    if (seconds < 60) {

        return `${seconds}s ago`;

    }


    const minutes =
        Math.floor(
            seconds / 60
        );


    if (minutes < 60) {

        return `${minutes}m ago`;

    }


    const hours =
        Math.floor(
            minutes / 60
        );


    return `${hours}h ago`;

}


/*
 * HTML escaping
 */

function escapeHtml(
    value
) {

    return String(value)

        .replace(
            /&/g,
            "&amp;"
        )

        .replace(
            /</g,
            "&lt;"
        )

        .replace(
            />/g,
            "&gt;"
        )

        .replace(
            /"/g,
            "&quot;"
        )

        .replace(
            /'/g,
            "&#039;"
        );

}


/*
 * Init
 */

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        /*
         * Load sidebar first.
         */

        if (
            typeof loadComponents ===
            "function"
        ) {

            await loadComponents();

        }


        /*
         * Buttons
         */

        const restart =
            document.getElementById(
                "restart-server"
            );


        if (restart) {

            restart.addEventListener(
                "click",
                restartServer
            );

        }


        const reboot =
            document.getElementById(
                "reboot-system"
            );


        if (reboot) {

            reboot.addEventListener(
                "click",
                rebootSystem
            );

        }


        const shutdown =
            document.getElementById(
                "shutdown-system"
            );


        if (shutdown) {

            shutdown.addEventListener(
                "click",
                shutdownSystem
            );

        }


        /*
         * Initial diagnostics
         */

        await loadDiagnostics();


        /*
         * Automatic refresh
         */

        setInterval(
            loadDiagnostics,
            DIAGNOSTICS_INTERVAL
        );

    }
);
