document.addEventListener("DOMContentLoaded", () => {

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
                        colspan="10"
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
                                    qso.time_on_utc || ""
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

                        </tr>
                    `;

                })
                .join("");


        updateSortHeaders();

    }


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
                        colspan="10"
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
