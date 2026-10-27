document.addEventListener("DOMContentLoaded", () => {

        initCabrilloExport();


    const body =
        document.getElementById(
            "contest-qso-history-body"
        );

    const count =
        document.getElementById(
            "contest-qso-history-count"
        );

    if (!body) {
        return;
    }


    const filters = {

        contest:
            document.getElementById(
                "contest-history-contest"
            ),

        session:
            document.getElementById(
                "contest-history-session"
            ),

        operator:
            document.getElementById(
                "contest-history-operator"
            ),

        station:
            document.getElementById(
                "contest-history-station"
            ),

        band:
            document.getElementById(
                "contest-history-band"
            ),

        mode:
            document.getElementById(
                "contest-history-mode"
            ),

        call:
            document.getElementById(
                "contest-history-call"
            )

    };


    let qsos = [];

    let sortField = "id";

    let sortDirection = "desc";



    /*
     * Cabrillo export for the selected
     * contest session.
     */
    function initCabrilloExport() {

        const sessionSelect =
            document.getElementById(
                "contest-history-session"
            );

        if (!sessionSelect) {
            return;
        }

        if (document.getElementById("contest-history-cabrillo")) {
            return;
        }

        const button =
            document.createElement("button");

        button.type = "button";
        button.id = "contest-history-cabrillo";
        button.className = "contest-session-select";
        button.textContent = "EXPORT CABRILLO";

        button.addEventListener("click", async () => {

            const sessionId = sessionSelect.value;

            if (!sessionId) {
                alert("Please select a session first.");
                return;
            }

            button.disabled = true;

            try {

                const response =
                    await fetch(
                        "/api/contests/session/" + sessionId + "/cabrillo",
                        { cache: "no-store" }
                    );

                if (!response.ok) {
                    throw new Error("HTTP " + response.status);
                }

                const text = await response.text();

                function headerValue(name) {

                    for (const line of text.split("\n")) {

                        if (line.startsWith(name + ":")) {
                            return line.slice(name.length + 1).trim();
                        }

                    }

                    return "";

                }

                const callsign =
                    headerValue("CALLSIGN").replace(/\s+/g, "-") || "station";

                const contest =
                    headerValue("CONTEST").replace(/\s+/g, "-") || "contest";

                const blob = new Blob([text], { type: "text/plain" });

                const url = URL.createObjectURL(blob);

                const link = document.createElement("a");

                link.href = url;
                link.download = callsign + "-" + contest + ".log";

                document.body.appendChild(link);
                link.click();
                link.remove();
                URL.revokeObjectURL(url);

            }
            catch (error) {

                console.error("Cabrillo export:", error);
                alert("Cabrillo export failed: " + error.message);

            }
            finally {
                button.disabled = false;
            }

        });

        sessionSelect.insertAdjacentElement("afterend", button);


        /*
            Upload the whole session to the online logbooks
            (QRZ.com, ...). Runs in the background with retry.
        */
        const uploadButton =
            document.createElement("button");

        uploadButton.type = "button";
        uploadButton.id = "contest-history-upload";
        uploadButton.className = "contest-session-select";
        uploadButton.textContent = "UPLOAD SESSION";
        uploadButton.title = "Upload all QSOs of this session to the online logbooks (Settings → Log Uploads)";

        uploadButton.addEventListener("click", async () => {

            const sessionId = sessionSelect.value;

            if (!sessionId) {
                alert("Please select a session first.");
                return;
            }

            const label =
                sessionSelect.options[sessionSelect.selectedIndex]?.textContent?.trim() ||
                "this session";

            if (!confirm(`Upload all QSOs of "${label}" to the online logbooks?`)) {
                return;
            }

            uploadButton.disabled = true;

            try {

                const response =
                    await fetch(
                        "/api/uploads/contest-session/" + sessionId,
                        { method: "POST" }
                    );

                const data =
                    await response.json().catch(() => ({}));

                if (!response.ok) {
                    throw new Error(data.error || "HTTP " + response.status);
                }

                alert(
                    `${data.queued} upload(s) queued for ${data.qsos} QSOs` +
                    ` (${(data.services || []).join(", ").toUpperCase()}).\n` +
                    `QSOs already uploaded are skipped. Progress: Settings → Log Uploads.`
                );

            }
            catch (error) {

                alert("Upload failed: " + error.message);

            }
            finally {

                uploadButton.disabled = false;

            }

        });

        button.insertAdjacentElement("afterend", uploadButton);

    }


    function escapeHtml(value) {

        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");

    }


    function frequencyDisplay(value) {

        const frequency =
            Number(value);

        if (!Number.isFinite(frequency)) {
            return "";
        }

        return frequency > 1000
            ? (frequency / 1000).toFixed(3)
            : frequency.toFixed(3);

    }


    function uniqueValues(field) {

        return [
            ...new Set(
                qsos
                    .map(qso =>
                        String(
                            qso[field] ?? ""
                        ).trim()
                    )
                    .filter(Boolean)
            )
        ].sort(
            (a, b) =>
                a.localeCompare(
                    b,
                    undefined,
                    {
                        numeric: true,
                        sensitivity: "base"
                    }
                )
        );

    }


    function setOptions(
        select,
        values,
        allLabel
    ) {

        if (!select) {
            return;
        }

        const current =
            select.value;

        select.innerHTML = "";

        const all =
            document.createElement("option");

        all.value = "";
        all.textContent = allLabel;

        select.appendChild(all);


        values.forEach(value => {

            const option =
                document.createElement("option");

            option.value = value;
            option.textContent = value;

            select.appendChild(option);

        });


        if (
            values.includes(current)
        ) {
            select.value = current;
        }
        else {
            select.value = "";
        }

    }


    function populateFilters() {

        if (filters.contest) {

            const contests = [];

            const seen =
                new Set();

            qsos.forEach(qso => {

                const id =
                    String(
                        qso.contest_definition_id ?? ""
                    );

                if (
                    id &&
                    !seen.has(id)
                ) {

                    seen.add(id);

                    contests.push({
                        id,
                        name:
                            String(
                                qso.contest_name || id
                            )
                    });

                }

            });


            contests.sort(
                (a, b) =>
                    a.name.localeCompare(
                        b.name,
                        undefined,
                        {
                            sensitivity: "base"
                        }
                    )
            );


            const current =
                filters.contest.value;


            filters.contest.innerHTML =
                `<option value="">All Contests</option>`;


            contests.forEach(contest => {

                const option =
                    document.createElement("option");

                option.value =
                    contest.id;

                option.textContent =
                    contest.name;

                filters.contest.appendChild(
                    option
                );

            });


            filters.contest.value =
                contests.some(
                    contest =>
                        contest.id === current
                )
                    ? current
                    : "";

        }


        updateSessionFilter();


        setOptions(
            filters.operator,
            uniqueValues("operator"),
            "All Operators"
        );

        setOptions(
            filters.station,
            uniqueValues("station_callsign"),
            "All Stations"
        );

        setOptions(
            filters.band,
            uniqueValues("band"),
            "All Bands"
        );

        setOptions(
            filters.mode,
            uniqueValues("mode"),
            "All Modes"
        );

    }


    function updateSessionFilter() {

        if (!filters.session) {
            return;
        }

        const contestId =
            filters.contest?.value || "";


        const sessionMap =
            new Map();


        qsos.forEach(qso => {

            if (
                contestId &&
                String(
                    qso.contest_definition_id
                ) !== contestId
            ) {
                return;
            }

            const id =
                String(
                    qso.session_id ?? ""
                );

            if (id) {
                sessionMap.set(
                    id,
                    qso
                );
            }

        });


        const current =
            filters.session.value;


        filters.session.innerHTML =
            `<option value="">All Sessions</option>`;


        [...sessionMap.keys()]
            .sort(
                (a, b) =>
                    Number(a) - Number(b)
            )
            .forEach(id => {

                const option =
                    document.createElement("option");

                option.value = id;

                option.textContent =
                    `Session ${id}`;

                filters.session.appendChild(
                    option
                );

            });


        filters.session.value =
            sessionMap.has(current)
                ? current
                : "";

    }


    function getFilteredQsos() {

        const contest =
            filters.contest?.value || "";

        const session =
            filters.session?.value || "";

        const operator =
            filters.operator?.value || "";

        const station =
            filters.station?.value || "";

        const band =
            filters.band?.value || "";

        const mode =
            filters.mode?.value || "";

        const call =
            (
                filters.call?.value || ""
            )
            .trim()
            .toUpperCase();


        return qsos.filter(qso => {

            if (
                contest &&
                String(
                    qso.contest_definition_id
                ) !== contest
            ) {
                return false;
            }

            if (
                session &&
                String(qso.session_id)
                    !== session
            ) {
                return false;
            }

            if (
                operator &&
                String(qso.operator)
                    !== operator
            ) {
                return false;
            }

            if (
                station &&
                String(qso.station_callsign)
                    !== station
            ) {
                return false;
            }

            if (
                band &&
                String(qso.band)
                    !== band
            ) {
                return false;
            }

            if (
                mode &&
                String(qso.mode)
                    !== mode
            ) {
                return false;
            }

            if (
                call &&
                !String(qso.call)
                    .toUpperCase()
                    .includes(call)
            ) {
                return false;
            }

            return true;

        });

    }


    function compareValues(
        a,
        b,
        field
    ) {

        let av = a[field];
        let bv = b[field];


        if (
            field === "frequency" ||
            field === "session_id" ||
            field === "id"
        ) {

            av = Number(av);
            bv = Number(bv);

            if (!Number.isFinite(av)) {
                av = 0;
            }

            if (!Number.isFinite(bv)) {
                bv = 0;
            }

        }
        else if (
            field === "time_on_utc"
        ) {

            av =
                String(
                    av ?? ""
                );

            bv =
                String(
                    bv ?? ""
                );

        }
        else {

            av =
                String(
                    av ?? ""
                ).toLowerCase();

            bv =
                String(
                    bv ?? ""
                ).toLowerCase();

        }


        if (av < bv) {
            return -1;
        }

        if (av > bv) {
            return 1;
        }

        return 0;

    }


    function sortQsos(list) {

        return list
            .slice()
            .sort(
                (a, b) => {

                    const result =
                        compareValues(
                            a,
                            b,
                            sortField
                        );

                    return sortDirection === "asc"
                        ? result
                        : -result;

                }
            );

    }


    function updateSortHeaders() {

        document
            .querySelectorAll(
                "[data-history-sort]"
            )
            .forEach(header => {

                const field =
                    header.dataset.historySort;

                const base =
                    header.textContent
                        .replace(
                            /\s+[▲▼↕]$/,
                            ""
                        )
                        .trim();

                header.textContent =
                    field === sortField
                        ? `${base} ${sortDirection === "asc" ? "▲" : "▼"}`
                        : `${base} ↕`;

                header.style.cursor =
                    "pointer";

            });

    }


    function render() {

        const filtered =
            sortQsos(
                getFilteredQsos()
            );


        if (count) {

            count.textContent =
                `${filtered.length} QSO${filtered.length === 1 ? "" : "s"}`;

        }


        if (!filtered.length) {

            body.innerHTML = `
                <tr>
                    <td
                        colspan="11"
                        class="contest-empty"
                    >
                        No contest QSOs
                    </td>
                </tr>
            `;

            updateSortHeaders();

            return;

        }


        body.innerHTML =
            filtered
                .map(qso => {

                    return `
                        <tr>

                            <td>
                                ${escapeHtml(
                                    (qso.qso_date || "") +
                                    " " +
                                    (qso.time_on_utc || "")
                                )}
                            </td>

                            <td>
                                <strong>
                                    ${escapeHtml(
                                        qso.call || ""
                                    )}
                                </strong>
                            </td>

                            <td>
                                ${escapeHtml(
                                    qso.band || ""
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    frequencyDisplay(
                                        qso.frequency
                                    )
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    qso.mode || ""
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    qso.rst_sent || ""
                                )}/${escapeHtml(
                                    qso.rst_rcvd || ""
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    qso.exchange_received || ""
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    qso.operator || ""
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    qso.station_callsign || ""
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    qso.session_id || ""
                                )}
                            </td>

                            <td class="qso-history-actions">

                                <button
                                    type="button"
                                    class="button small petrol qso-history-action qso-history-edit"
                                    data-qso-id="${escapeHtml(qso.id)}"
                                    title="Edit QSO"
                                    aria-label="Edit QSO"
                                >
                                    Edit
                                </button>

                                <button
                                    type="button"
                                    class="button small contest-session-delete qso-history-action qso-history-delete"
                                    data-qso-id="${escapeHtml(qso.id)}"
                                    title="Delete QSO"
                                    aria-label="Delete QSO"
                                >
                                    Delete
                                </button>

                            </td>

                        </tr>
                    `;

                })
                .join("");


        updateSortHeaders();

    }



    /*
     * Edit dialog for one contest QSO (replaces the
     * former prompt() per field).
     */
    const EDIT_BANDS = [
        "160", "80", "40", "20", "15", "10",
        "60", "30", "17", "12", "6", "2"
    ];

    const EDIT_MODES = [
        "SSB", "CW", "RTTY", "FT8", "FT4", "FM", "AM"
    ];

    function ensureEditDialogStyles() {

        if (document.getElementById("qh-edit-styles")) {
            return;
        }

        const style = document.createElement("style");
        style.id = "qh-edit-styles";
        style.textContent = `
            .qh-edit-overlay {
                position: fixed; inset: 0; z-index: 10000;
                background: rgba(0, 0, 0, 0.65);
                display: flex; align-items: center; justify-content: center;
                padding: 16px;
            }
            .qh-edit-dialog {
                width: 100%; max-width: 620px; max-height: 92vh; overflow: auto;
                background: var(--panel, #0d1720);
                border: 1px solid var(--cyan, #00e5ff);
                border-radius: 10px;
                box-shadow: 0 0 24px rgba(0, 229, 255, 0.25);
                color: var(--text, #fff);
                font-family: inherit;
            }
            .qh-edit-header {
                display: flex; align-items: center; justify-content: space-between;
                padding: 14px 18px;
                border-bottom: 1px solid var(--panel-border, #1d3442);
            }
            .qh-edit-title {
                color: var(--cyan, #00e5ff); font-weight: 700;
                letter-spacing: 1px; font-size: 15px;
            }
            .qh-edit-close {
                background: none; border: none; color: var(--muted, #9aa7b0);
                font-size: 22px; cursor: pointer; line-height: 1;
            }
            .qh-edit-close:hover { color: var(--text, #fff); }
            .qh-edit-grid {
                display: grid; grid-template-columns: 1fr 1fr;
                gap: 12px 16px; padding: 16px 18px;
            }
            .qh-edit-field { display: flex; flex-direction: column; gap: 4px; }
            .qh-edit-field label {
                font-size: 11px; letter-spacing: 1px;
                color: var(--muted, #9aa7b0);
            }
            .qh-edit-field input,
            .qh-edit-field select {
                background: var(--background, #050b10);
                border: 1px solid var(--panel-border, #1d3442);
                border-radius: 6px; color: var(--text, #fff);
                padding: 8px 10px; font-size: 14px; font-family: inherit;
                min-width: 0;
            }
            .qh-edit-field input:focus,
            .qh-edit-field select:focus {
                outline: none; border-color: var(--cyan, #00e5ff);
            }
            .qh-edit-field input.qh-call { text-transform: uppercase; font-weight: 700; }
            .qh-edit-error {
                min-height: 18px; padding: 0 18px;
                color: var(--red, #ff5252); font-size: 13px;
            }
            .qh-edit-actions {
                display: flex; justify-content: flex-end; gap: 10px;
                padding: 12px 18px 16px;
            }
            .qh-edit-actions button {
                padding: 8px 18px; border-radius: 6px; cursor: pointer;
                font-weight: 700; letter-spacing: 1px; font-family: inherit;
            }
            .qh-edit-cancel {
                background: transparent; color: var(--muted, #9aa7b0);
                border: 1px solid var(--panel-border, #1d3442);
            }
            .qh-edit-save {
                background: transparent; color: var(--cyan, #00e5ff);
                border: 1px solid var(--cyan, #00e5ff);
            }
            .qh-edit-save:hover { background: rgba(0, 229, 255, 0.12); }
            .qh-edit-save:disabled { opacity: 0.5; cursor: default; }
            @media (max-width: 520px) {
                .qh-edit-grid { grid-template-columns: 1fr; }
            }
        `;

        document.head.appendChild(style);

    }

    function normalizeEditDate(value) {

        const digits = String(value || "").replace(/\D/g, "");

        if (digits.length !== 8) {
            return null;
        }

        return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;

    }

    function normalizeEditTime(value) {

        const digits = String(value || "").replace(/\D/g, "");

        if (digits.length !== 4 && digits.length !== 6) {
            return null;
        }

        const hh = Number(digits.slice(0, 2));
        const mm = Number(digits.slice(2, 4));
        const ss = digits.length === 6 ? Number(digits.slice(4, 6)) : 0;

        if (hh > 23 || mm > 59 || ss > 59) {
            return null;
        }

        const two = (n) => String(n).padStart(2, "0");

        return `${two(hh)}:${two(mm)}:${two(ss)}`;

    }

    function editOptions(list, current) {

        const value = String(current ?? "");
        const values = list.includes(value) || !value
            ? list
            : [value, ...list];

        return values
            .map(item =>
                `<option value="${escapeHtml(item)}"${item === value ? " selected" : ""}>${escapeHtml(item)}</option>`
            )
            .join("");

    }

    async function editQsoHistory(qsoId) {

        const qso =
            qsos.find(
                item =>
                    Number(item.id) ===
                    Number(qsoId)
            );

        if (!qso) {
            alert("Contest QSO not found.");
            return;
        }

        ensureEditDialogStyles();

        document.querySelector(".qh-edit-overlay")?.remove();

        const field = (id, label, value, extra = "") => `
            <div class="qh-edit-field">
                <label for="qh-edit-${id}">${label}</label>
                <input id="qh-edit-${id}" type="text" autocomplete="off"
                       value="${escapeHtml(value ?? "")}" ${extra}>
            </div>`;

        const overlay = document.createElement("div");
        overlay.className = "qh-edit-overlay";
        overlay.innerHTML = `
            <form class="qh-edit-dialog" novalidate>
                <div class="qh-edit-header">
                    <div class="qh-edit-title">EDIT QSO</div>
                    <button type="button" class="qh-edit-close" title="Close">×</button>
                </div>
                <div class="qh-edit-grid">
                    ${field("call", "CALL", qso.call, 'class="qh-call"')}
                    ${field("frequency", "FREQUENCY (kHz)", qso.frequency, 'inputmode="decimal"')}
                    <div class="qh-edit-field">
                        <label for="qh-edit-band">BAND (m)</label>
                        <select id="qh-edit-band">${editOptions(EDIT_BANDS, qso.band)}</select>
                    </div>
                    <div class="qh-edit-field">
                        <label for="qh-edit-mode">MODE</label>
                        <select id="qh-edit-mode">${editOptions(EDIT_MODES, String(qso.mode ?? "").toUpperCase())}</select>
                    </div>
                    ${field("date", "DATE UTC (YYYY-MM-DD)", qso.qso_date)}
                    ${field("time", "TIME UTC (HH:MM)", String(qso.time_on_utc ?? "").slice(0, 5))}
                    ${field("rst-sent", "RST SENT", qso.rst_sent)}
                    ${field("rst-rcvd", "RST RECEIVED", qso.rst_rcvd)}
                    ${field("exch-sent", "EXCHANGE SENT", qso.exchange_sent)}
                    ${field("exch-rcvd", "EXCHANGE RECEIVED", qso.exchange_received)}
                    ${field("operator", "OPERATOR", qso.operator)}
                    ${field("station", "STATION", qso.station_callsign)}
                </div>
                <div class="qh-edit-error" aria-live="polite"></div>
                <div class="qh-edit-actions">
                    <button type="button" class="qh-edit-cancel">CANCEL</button>
                    <button type="submit" class="qh-edit-save">SAVE</button>
                </div>
            </form>`;

        document.body.appendChild(overlay);

        const form = overlay.querySelector("form");
        const errorBox = overlay.querySelector(".qh-edit-error");
        const saveButton = overlay.querySelector(".qh-edit-save");
        const value = (id) =>
            String(overlay.querySelector(`#qh-edit-${id}`).value || "").trim();

        const close = () => {
            document.removeEventListener("keydown", onKey, true);
            overlay.remove();
        };

        const onKey = (event) => {
            if (event.key === "Escape") {
                event.preventDefault();
                event.stopPropagation();
                close();
            }
        };

        document.addEventListener("keydown", onKey, true);

        overlay.querySelector(".qh-edit-close").addEventListener("click", close);
        overlay.querySelector(".qh-edit-cancel").addEventListener("click", close);
        overlay.addEventListener("mousedown", (event) => {
            if (event.target === overlay) close();
        });

        const callInput = overlay.querySelector("#qh-edit-call");
        callInput.addEventListener("input", () => {
            const pos = callInput.selectionStart;
            callInput.value = callInput.value.toUpperCase();
            callInput.setSelectionRange(pos, pos);
        });
        callInput.focus();
        callInput.select();

        form.addEventListener("submit", async (event) => {

            event.preventDefault();
            errorBox.textContent = "";

            const call = value("call").toUpperCase();
            const frequencyNumber = Number(value("frequency").replace(",", "."));
            const qsoDate = normalizeEditDate(value("date"));
            /*
             * Keep the original seconds when the time
             * was not changed.
             */
            const originalTime = String(qso.time_on_utc ?? "");
            const timeOn =
                value("time") === originalTime.slice(0, 5) &&
                normalizeEditTime(originalTime)
                    ? normalizeEditTime(originalTime)
                    : normalizeEditTime(value("time"));

            const payload = {
                qso_date: qsoDate,
                time_on_utc: timeOn,
                frequency: frequencyNumber,
                band: value("band"),
                mode: value("mode"),
                call,
                rst_sent: value("rst-sent"),
                rst_rcvd: value("rst-rcvd"),
                exchange_sent: value("exch-sent"),
                exchange_received: value("exch-rcvd"),
                operator: value("operator"),
                station_callsign: value("station").toUpperCase()
            };

            if (!call) {
                errorBox.textContent = "Call is required.";
                return;
            }
            if (!Number.isFinite(frequencyNumber) || frequencyNumber <= 0) {
                errorBox.textContent = "Invalid frequency (kHz, e.g. 14025).";
                return;
            }
            if (!qsoDate) {
                errorBox.textContent = "Invalid date (YYYY-MM-DD).";
                return;
            }
            if (!timeOn) {
                errorBox.textContent = "Invalid time (HH:MM, UTC).";
                return;
            }

            const missing = Object.entries(payload)
                .filter(([, v]) => typeof v === "string" && !v)
                .map(([k]) => k.replace(/_/g, " "));

            if (missing.length) {
                errorBox.textContent = "Please fill in: " + missing.join(", ") + ".";
                return;
            }

            saveButton.disabled = true;
            saveButton.textContent = "SAVING...";

            try {

                const response =
                    await fetch(
                        `/api/contests/qso/${qso.id}`,
                        {
                            method: "PUT",
                            headers: {
                                "Content-Type": "application/json"
                            },
                            body: JSON.stringify(payload)
                        }
                    );

                const data =
                    await response.json().catch(() => ({}));

                if (!response.ok) {
                    throw new Error(
                        data.error ||
                        `HTTP ${response.status}`
                    );
                }

                close();
                await loadQsoHistory();

            }
            catch (error) {

                console.error(
                    "Edit contest QSO:",
                    error
                );

                errorBox.textContent =
                    "Could not update contest QSO: " + error.message;
                saveButton.disabled = false;
                saveButton.textContent = "SAVE";

            }

        });

    }


    async function deleteQsoHistory(qsoId) {

        const qso =
            qsos.find(
                item =>
                    Number(item.id) ===
                    Number(qsoId)
            );

        if (!qso) {
            alert("Contest QSO not found.");
            return;
        }


        const confirmed =
            confirm(
                `Delete contest QSO #${qso.id}?\n\n` +
                `${qso.call || ""}\n` +
                `${qso.band || ""}\n` +
                `${frequencyDisplay(qso.frequency)} kHz\n` +
                `${qso.contest_name || ""}`
            );

        if (!confirmed) return;


        try {

            const response =
                await fetch(
                    `/api/contests/qso/${qso.id}`,
                    {
                        method: "DELETE"
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


            await loadQsoHistory();

        }
        catch (error) {

            console.error(
                "Delete contest QSO:",
                error
            );

            alert(
                "Could not delete contest QSO:\n\n" +
                error.message
            );

        }

    }


    body.addEventListener(
        "click",
        event => {

            const editButton =
                event.target.closest(
                    ".qso-history-edit"
                );

            if (editButton) {

                editQsoHistory(
                    editButton.dataset.qsoId
                );

                return;

            }


            const deleteButton =
                event.target.closest(
                    ".qso-history-delete"
                );

            if (deleteButton) {

                deleteQsoHistory(
                    deleteButton.dataset.qsoId
                );

            }

        }
    );


    async function loadQsoHistory() {

        try {

            const response =
                await fetch(
                    `/api/contests/qso-history?_=${Date.now()}`,
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


            if (!Array.isArray(data)) {

                throw new Error(
                    "Invalid QSO history response"
                );

            }


            qsos = data;

            populateFilters();

            render();

        }
        catch (error) {

            console.error(
                "QSO history error:",
                error
            );


            body.innerHTML = `
                <tr>
                    <td
                        colspan="11"
                        class="contest-empty"
                    >
                        Error loading QSO history
                    </td>
                </tr>
            `;

        }

    }


    Object.values(filters)
        .filter(Boolean)
        .forEach(element => {

            element.addEventListener(
                "change",
                () => {

                    if (
                        element ===
                        filters.contest
                    ) {
                        updateSessionFilter();
                    }

                    render();

                }
            );

        });


    if (filters.call) {

        filters.call.addEventListener(
            "input",
            render
        );

    }


    document
        .querySelectorAll(
            "[data-history-sort]"
        )
        .forEach(header => {

            header.addEventListener(
                "click",
                () => {

                    const field =
                        header.dataset.historySort;

                    if (
                        sortField === field
                    ) {
                        sortDirection =
                            sortDirection === "asc"
                                ? "desc"
                                : "asc";
                    }
                    else {
                        sortField = field;
                        sortDirection = "asc";
                    }

                    render();

                }
            );

        });


    window.loadQsoHistory =
        loadQsoHistory;

    window.loadContestQsoHistory =
        loadQsoHistory;

});
