document.addEventListener("DOMContentLoaded", () => {

    const body =
        document.getElementById("contest-session-list-body");

    const count =
        document.getElementById("contest-session-count");

    const contestSelect =
        document.getElementById("contest-session-contest");

    const editor =
        document.getElementById(
            "contest-session-operator-editor"
        );

    const editorSession =
        document.getElementById(
            "contest-session-operator-editor-session"
        );

    const operatorList =
        document.getElementById(
            "contest-session-operator-list"
        );

    const saveButton =
        document.getElementById(
            "contest-session-operator-save"
        );

    const closeButton =
        document.getElementById(
            "contest-session-operator-editor-close"
        );

    const message =
        document.getElementById(
            "contest-session-operator-message"
        );

    if (!body) {
        return;
    }

    let sessions = [];
    let definitions = [];
    let operators = [];
    let editingSessionId = null;


    async function loadContestSessions() {

        try {

            const [
                sessionsResponse,
                definitionsResponse,
                operatorsResponse
            ] = await Promise.all([

                fetch(
                    `/api/contests/sessions?_=${Date.now()}`,
                    { cache: "no-store" }
                ),

                fetch(
                    `/api/contests/definitions?_=${Date.now()}`,
                    { cache: "no-store" }
                ),

                fetch(
                    `/api/contests/operators?_=${Date.now()}`,
                    { cache: "no-store" }
                )

            ]);

            if (!sessionsResponse.ok) {
                throw new Error(
                    `Sessions HTTP ${sessionsResponse.status}`
                );
            }

            if (!definitionsResponse.ok) {
                throw new Error(
                    `Definitions HTTP ${definitionsResponse.status}`
                );
            }

            if (!operatorsResponse.ok) {
                throw new Error(
                    `Operators HTTP ${operatorsResponse.status}`
                );
            }

            sessions =
                await sessionsResponse.json();

            definitions =
                await definitionsResponse.json();

            operators =
                await operatorsResponse.json();

            populateContestSelect();
            renderSessions();

        }
        catch (error) {

            console.error(
                "Contest session list error:",
                error
            );

            body.innerHTML = `
                <tr>
                    <td colspan="10" class="contest-empty">
                        Error loading contest sessions
                    </td>
                </tr>
            `;

        }

    }


    function populateContestSelect() {

        if (!contestSelect) {
            return;
        }

        const currentValue =
            contestSelect.value;

        contestSelect.innerHTML =
            `<option value="">All Contests</option>`;

        definitions.forEach(definition => {

            const option =
                document.createElement("option");

            option.value =
                String(definition.id);

            option.textContent =
                definition.name;

            contestSelect.appendChild(option);

        });

        if (
            currentValue &&
            definitions.some(
                definition =>
                    String(definition.id) === currentValue
            )
        ) {
            contestSelect.value =
                currentValue;
        }

    }


    function getFilteredSessions() {

        const selectedContest =
            contestSelect
                ? contestSelect.value
                : "";

        return sessions.filter(session => {

            if (!selectedContest) {
                return true;
            }

            return String(
                session.contest_definition_id
            ) === selectedContest;

        });

    }


    function renderSessions() {

        const filteredSessions =
            getFilteredSessions();

        if (!filteredSessions.length) {

            body.innerHTML = `
                <tr>
                    <td colspan="10" class="contest-empty">
                        No contest sessions
                    </td>
                </tr>
            `;

            if (count) {
                count.textContent = "0 Sessions";
            }

            return;
        }


        body.innerHTML =
            filteredSessions.map(session => {

                const started =
                    session.started_at
                        ? formatDateTime(
                            session.started_at
                        )
                        : "-";

                const ended =
                    session.ended_at
                        ? formatDateTime(
                            session.ended_at
                        )
                        : "-";

                return `
                    <tr>

                        <td>
                            ${escapeHtml(
                                session.status || ""
                            )}
                        </td>

                        <td>
                            ${escapeHtml(
                                session.name || ""
                            )}
                        </td>

                        <td>
                            <strong>
                                ${escapeHtml(
                                    session.station_callsign || ""
                                )}
                            </strong>
                        </td>

                        <td>
                            ${escapeHtml(
                                session.club || ""
                            )}
                        </td>

                        <td>
                            ${escapeHtml(
                                session.station_grid || ""
                            )}
                        </td>

                        <td>
                            ${escapeHtml(
                                session.operator_name || ""
                            )}
                        </td>

                        <td>
                            <span
                                id="contest-session-operators-${session.id}">
                                …
                            </span>
                        </td>

                        <td>
                            ${escapeHtml(started)}
                        </td>

                        <td>
                            ${escapeHtml(ended)}
                        </td>

                        <td>
                            <button
                                type="button"
                                class="button small contest-session-edit-operators"
                                data-session-id="${session.id}">
                                Edit
                            </button>

                            <button
                                type="button"
                                class="button small contest-session-delete"
                                data-session-id="${session.id}">
                                Delete
                            </button>
                        </td>

                    </tr>
                `;

            }).join("");


        if (count) {

            count.textContent =
                `${filteredSessions.length} Session${
                    filteredSessions.length === 1
                        ? ""
                        : "s"
                }`;

        }

        loadOperatorSummaries(filteredSessions);

    }


    async function loadOperatorSummaries(
        sessionList
    ) {

        await Promise.all(
            sessionList.map(async session => {

                try {

                    const response =
                        await fetch(
                            `/api/contests/session/${session.id}/operators?_=${Date.now()}`,
                            { cache: "no-store" }
                        );

                    if (!response.ok) {
                        return;
                    }

                    const assigned =
                        await response.json();

                    const element =
                        document.getElementById(
                            `contest-session-operators-${session.id}`
                        );

                    if (!element) {
                        return;
                    }

                    if (
                        !Array.isArray(assigned) ||
                        !assigned.length
                    ) {
                        element.textContent = "None";
                        return;
                    }

                    element.textContent =
                        assigned
                            .map(
                                operator =>
                                    operator.callsign
                            )
                            .filter(Boolean)
                            .join(", ");

                }
                catch (error) {

                    console.error(
                        `Session ${session.id} operators:`,
                        error
                    );

                }

            })
        );

    }


    async function deleteSession(
        sessionId
    ) {

        const id =
            Number(sessionId);

        if (
            !Number.isInteger(id) ||
            id <= 0
        ) {
            return;
        }

        if (
            !window.confirm(
                "Delete this session?\n\n" +
                "Operator assignments will be removed. QSOs are not affected."
            )
        ) {
            return;
        }

        try {

            const response =
                await fetch(
                    `/api/contests/session/${id}`,
                    { method: "DELETE" }
                );

            if (!response.ok) {
                throw new Error(
                    `HTTP ${response.status}`
                );
            }

            await loadContestSessions();

        }
        catch (error) {

            console.error(
                "Delete session failed:",
                error
            );

        }

    }


    async function openOperatorEditor(
        sessionId
    ) {

        editingSessionId =
            Number(sessionId);

        if (
            !Number.isInteger(editingSessionId) ||
            editingSessionId <= 0
        ) {
            return;
        }

        const session =
            sessions.find(
                item =>
                    Number(item.id) ===
                    editingSessionId
            );

        if (!session) {
            return;
        }

        try {

            const response =
                await fetch(
                    `/api/contests/session/${editingSessionId}/operators?_=${Date.now()}`,
                    { cache: "no-store" }
                );

            if (!response.ok) {
                throw new Error(
                    `HTTP ${response.status}`
                );
            }

            const assigned =
                await response.json();

            renderOperatorEditor(
                session,
                Array.isArray(assigned)
                    ? assigned
                    : []
            );

            if (editor) {
                editor.hidden = false;
                editor.scrollIntoView({
                    behavior: "smooth",
                    block: "nearest"
                });
            }

        }
        catch (error) {

            console.error(
                "Session operator editor:",
                error
            );

            alert(
                "Could not load session operators:\n\n" +
                error.message
            );

        }

    }


    function renderOperatorEditor(
        session,
        assigned
    ) {

        if (editorSession) {

            editorSession.textContent =
                `${session.name || "Session"} · ` +
                `${session.station_callsign || ""}`;

        }

        if (!operatorList) {
            return;
        }

        const assignedIds =
            new Set(
                assigned.map(
                    operator =>
                        Number(operator.id)
                )
            );

        const activeOperators =
            operators.filter(
                operator =>
                    Boolean(operator.active)
            );

        if (!activeOperators.length) {

            operatorList.innerHTML = `
                <div class="contest-empty">
                    No active operators available.
                </div>
            `;

            return;
        }

        operatorList.innerHTML =
            activeOperators.map(operator => {

                const id =
                    Number(operator.id);

                return `
                    <label
                        class="contest-session-operator-item">

                        <input
                            type="checkbox"
                            class="contest-session-operator-checkbox"
                            value="${id}"
                            ${assignedIds.has(id) ? "checked" : ""}
                        >

                        <span>
                            <strong>
                                ${escapeHtml(
                                    operator.callsign || ""
                                )}
                            </strong>

                            <span>
                                ${escapeHtml(
                                    operator.name || ""
                                )}
                            </span>

                            ${
                                operator.club
                                    ? `
                                        <small>
                                            ${escapeHtml(
                                                operator.club
                                            )}
                                        </small>
                                    `
                                    : ""
                            }
                        </span>

                    </label>
                `;

            }).join("");

    }


    async function saveSessionOperators() {

        if (
            !editingSessionId ||
            !operatorList
        ) {
            return;
        }

        const selectedIds =
            Array.from(
                operatorList.querySelectorAll(
                    ".contest-session-operator-checkbox"
                )
            )
            .filter(
                checkbox =>
                    checkbox.checked
            )
            .map(
                checkbox =>
                    Number(checkbox.value)
            );


        try {

            if (saveButton) {
                saveButton.disabled = true;
            }

            const currentResponse =
                await fetch(
                    `/api/contests/session/${editingSessionId}/operators?_=${Date.now()}`,
                    { cache: "no-store" }
                );

            if (!currentResponse.ok) {
                throw new Error(
                    `HTTP ${currentResponse.status}`
                );
            }

            const current =
                await currentResponse.json();


            for (const operator of current) {

                const response =
                    await fetch(
                        `/api/contests/session/${editingSessionId}/operators/${operator.id}`,
                        {
                            method: "DELETE"
                        }
                    );

                if (!response.ok) {

                    const data =
                        await response.json();

                    throw new Error(
                        data.error ||
                        `HTTP ${response.status}`
                    );

                }

            }


            for (const operatorId of selectedIds) {

                const response =
                    await fetch(
                        `/api/contests/session/${editingSessionId}/operators/${operatorId}`,
                        {
                            method: "POST"
                        }
                    );

                if (!response.ok) {

                    const data =
                        await response.json();

                    throw new Error(
                        data.error ||
                        `HTTP ${response.status}`
                    );

                }

            }


            showEditorMessage(
                "Operators saved.",
                "success"
            );

            renderSessions();

        }
        catch (error) {

            console.error(
                "Save session operators:",
                error
            );

            showEditorMessage(
                error.message,
                "error"
            );

        }
        finally {

            if (saveButton) {
                saveButton.disabled = false;
            }

        }

    }


    function showEditorMessage(
        text,
        type
    ) {

        if (!message) {
            return;
        }

        message.textContent =
            text;

        message.className =
            `contest-session-message ${type}`;

    }


    function closeOperatorEditor() {

        editingSessionId =
            null;

        if (editor) {
            editor.hidden = true;
        }

        if (message) {
            message.textContent = "";
        }

    }


    function formatDateTime(value) {

        const date =
            new Date(value);

        if (
            Number.isNaN(
                date.getTime()
            )
        ) {
            return String(value || "");
        }

        return date.toLocaleString(
            undefined,
            {
                dateStyle: "short",
                timeStyle: "short"
            }
        );

    }


    function escapeHtml(value) {

        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");

    }


    if (contestSelect) {

        contestSelect.addEventListener(
            "change",
            renderSessions
        );

    }


    body.addEventListener(
        "click",
        event => {

            const deleteButton =
                event.target.closest(
                    ".contest-session-delete"
                );

            if (deleteButton) {
                deleteSession(
                    deleteButton.dataset.sessionId
                );
                return;
            }

            const button =
                event.target.closest(
                    ".contest-session-edit-operators"
                );

            if (!button) {
                return;
            }

            openOperatorEditor(
                button.dataset.sessionId
            );

        }
    );


    if (saveButton) {

        saveButton.addEventListener(
            "click",
            saveSessionOperators
        );

    }


    if (closeButton) {

        closeButton.addEventListener(
            "click",
            closeOperatorEditor
        );

    }


    window.loadContestSessions =
        loadContestSessions;

});
