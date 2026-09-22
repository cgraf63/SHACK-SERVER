document.addEventListener("DOMContentLoaded", () => {

    const body = document.getElementById("contest-qso-list-body");
    const count = document.getElementById("contest-qso-count");

    if (!body) {
        return;
    }

    async function loadContestQsos() {

        let sessionId =
            Number(
                window.contestSessionId ||
                window.contestSession?.id ||
                0
            );

        try {

            /*
             * Falls contest-session.js die Session noch nicht
             * global gesetzt hat, direkt die aktive Session laden.
             */
            if (!sessionId) {

                const sessionResponse = await fetch(
                    `/api/contests/session?_=${Date.now()}`,
                    {
                        cache: "no-store"
                    }
                );

                if (sessionResponse.ok) {

                    const session = await sessionResponse.json();

                    if (session && session.id) {
                        sessionId = Number(session.id);
                    }

                }
            }

            if (!sessionId) {

                body.innerHTML = `
                    <tr>
                        <td colspan="9" class="contest-empty">
                            No active contest session
                        </td>
                    </tr>
                `;

                if (count) {
                    count.textContent = "0 QSOs";
                }

                return;
            }

            const response = await fetch(
                `/api/contests/session/${sessionId}/qso?_=${Date.now()}`,
                {
                    cache: "no-store"
                }
            );

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const qsos = await response.json();

            if (!Array.isArray(qsos) || qsos.length === 0) {

                body.innerHTML = `
                    <tr>
                        <td colspan="9" class="contest-empty">
                            No contest QSOs
                        </td>
                    </tr>
                `;

                if (count) {
                    count.textContent = "0 QSOs";
                }

                return;
            }

            body.innerHTML = qsos
                .slice()
                .reverse()
                .map(qso => {

                    const rstSent =
                        String(qso.rst_sent || "");

                    const rstReceived =
                        String(qso.rst_rcvd || "");

                    return `
                        <tr>
                            <td>${escapeHtml(qso.time_on_utc || "")}</td>
                            <td><strong>${escapeHtml(qso.call || "")}</strong></td>
                            <td>${escapeHtml(qso.band || "")}</td>
                            <td>${escapeHtml(
                                Number(qso.frequency || 0) > 1000
                                    ? (Number(qso.frequency) / 1000).toFixed(3)
                                    : qso.frequency || ""
                            )}</td>
                            <td>${escapeHtml(qso.mode || "")}</td>
                            <td>${escapeHtml(rstSent)}/${escapeHtml(rstReceived)}</td>
                            <td>${escapeHtml(qso.exchange_received || "")}</td>
                            <td>${escapeHtml(qso.operator || "")}</td>
                            <td>${escapeHtml(qso.station_callsign || "")}</td>
                        </tr>
                    `;

                })
                .join("");

            if (count) {
                count.textContent =
                    `${qsos.length} QSO${qsos.length === 1 ? "" : "s"}`;
            }

        } catch (error) {

            console.error(
                "Contest QSO list error:",
                error
            );

            body.innerHTML = `
                <tr>
                    <td colspan="9" class="contest-empty">
                        Error loading contest QSOs
                    </td>
                </tr>
            `;

        }

    }

    function escapeHtml(value) {

        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");

    }

    window.loadContestQsos = loadContestQsos;

});
