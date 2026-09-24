/*
 * Contest Session Manager
 */

let activeContestSession = null;
let contestSessionOperators = [];
let activeContestOperatorId = null;
let contestDefinitions = [];
window.activeContestId = "999";

/*
 * Helpers
 */

function contestSessionElement(id) {
    return document.getElementById(id);
}


function contestSessionEscape(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


function contestSessionStatus(session) {

    if (!session) {
        return "READY";
    }

    return String(
        session.status || "READY"
    ).toUpperCase();

}

function updateContestId() {


    activeContestId = "999";
    window.contestId = "999";

    if (
        !activeContestSession ||
        !activeContestSession.id
    ) {
        return;
    }

    const definition =
        contestDefinitions.find(
            definition =>
                Number(definition.id) ===
                Number(
                    activeContestSession
                        .contest_definition_id
                )
        );

    if (
        !definition ||
        !definition.short_name
    ) {
        console.error(
            "Contest Short ID not found."
        );

        return;
    }

    activeContestId =
        `${String(
            definition.short_name
        ).trim()}-${String(
            activeContestSession.id
        ).trim()}`;

    window.contestId =
        activeContestId;

    window.contestExchangeSent =
        definition.rules_json
            ? (() => {
                try {
                    const rules =
                        JSON.parse(
                            definition.rules_json
                        );

                    return String(
                        rules?.exchange?.sent ||
                        "none"
                    ).trim().toLowerCase();

                }
                catch {
                    return "none";
                }
            })()
            : "none";

document.dispatchEvent(
    new CustomEvent(
        "contestIdChanged"
    )
);

    console.log(
        "Active Contest ID:",
        window.contestId
    );

}

function showContestSessionMessage(
    text,
    type = "success"
) {

    const message =
        contestSessionElement(
            "contest-session-message"
        );

    if (!message) {
        return;
    }

    message.textContent =
        text;

    message.className =
        `contest-session-message ${type}`;

}


/*
 * Load station configuration.
 */

async function loadContestStation() {

    try {

        const response =
            await fetch(
                "/api/station?_=" + Date.now(),
                {
                    cache: "no-store"
                }
            );

        if (!response.ok) {
            return;
        }

        const station =
            await response.json();

        const operator =
            contestSessionElement(
                "contest-operator"
            );

        const callsign =
            contestSessionElement(
                "contest-callsign"
            );

        const grid =
            contestSessionElement(
                "contest-grid"
            );

        if (operator) {
            operator.textContent =
                station.operator_name ||
                station.name ||
                "—";
        }

        if (callsign) {
            callsign.textContent =
                station.callsign ||
                "—";
        }

        if (grid) {
            grid.textContent =
                station.locator ||
                "—";
        }

    }
    catch (error) {

        console.error(
            "Contest station:",
            error
        );

    }

}


/*
 * Load contest definitions.
 */

async function loadContestDefinitions() {

    const selector =
        contestSessionElement(
            "contest-select"
        );

    if (!selector) {
        return;
    }

    try {

        const response =
            await fetch(
                "/api/contests/definitions?_=" +
                Date.now(),
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

        contestDefinitions =
            Array.isArray(data)
                ? data
                : [];

        selector.innerHTML = `
            <option value="">
                Select contest...
            </option>
        `;

        contestDefinitions
            .filter(
                definition =>
                    definition.enabled
            )
            .forEach(
                definition => {

                    const option =
                        document.createElement(
                            "option"
                        );

                    option.value =
                        String(
                            definition.id
                        );

                    option.textContent =
                        definition.name;

                    selector.appendChild(
                        option
                    );

                }
            );
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

    }
    catch (error) {

        console.error(
            "Contest definitions:",
            error
        );

        selector.innerHTML = `
            <option value="">
                Failed to load contests
            </option>
        `;

    }

}


/*
 * Load active session.
 */

async function loadContestSession() {

    try {

        const response =
            await fetch(
                "/api/contests/session?_=" +
                Date.now(),
                {
                    cache: "no-store"
                }
            );

        if (!response.ok) {

            throw new Error(
                `HTTP ${response.status}`
            );

        }

        const session =
            await response.json();

        activeContestSession =
            session || null;

        /*
         * Make the complete active session available
         * to the Contest QSO logger.
         */
        window.contestSession =
            activeContestSession;

        /*
         * Make the active session ID available
         * to the QSO logger.
         */
        window.contestSessionId =
            activeContestSession &&
            activeContestSession.id
                ? String(
                    activeContestSession.id
                )
                : null;
	updateContestId();
        renderContestSession();
if (typeof updateContestCantonField === "function") {
    updateContestCantonField();
}

        await loadContestSessionOperators();

    }
    catch (error) {

        console.error(
            "Contest session:",
            error
        );

        activeContestSession =
            null;

        window.contestSessionId =
            null;

        renderContestSession();

    }

}


/*
 * Render session.
 */

async function loadContestSessionOperators() {

    const operator =
        contestSessionElement(
            "contest-operator"
        );

    if (!operator) {
        return;
    }

    contestSessionOperators = [];

    operator.innerHTML = `
        <option value="">
            Select operator...
        </option>
    `;

    if (
        !activeContestSession ||
        !activeContestSession.id
    ) {
        operator.disabled = true;
        return;
    }

    try {

        const sessionId =
            Number(
                activeContestSession.id
            );

        const response =
            await fetch(
                `/api/contests/session/${sessionId}/operators?_=${Date.now()}`,
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

        contestSessionOperators =
            Array.isArray(data)
                ? data
                : [];

        contestSessionOperators.forEach(
            sessionOperator => {

                const option =
                    document.createElement(
                        "option"
                    );

                option.value =
                    String(
                        sessionOperator.id
                    );

                const callsign =
                    sessionOperator.callsign ||
                    "";

                const name =
                    sessionOperator.name ||
                    "";

                option.textContent =
                    callsign && name
                        ? `${callsign} – ${name}`
                        : callsign || name;

                operator.appendChild(
                    option
                );
            }
        );

        operator.disabled =
            contestSessionOperators.length === 0;

        restoreContestActiveOperator();

    }
    catch (error) {

        console.error(
            "Contest session operators:",
            error
        );

        operator.innerHTML = `
            <option value="">
                Failed to load operators
            </option>
        `;

        operator.disabled = true;
    }
}


function contestActiveOperatorStorageKey() {

    if (
        !activeContestSession ||
        !activeContestSession.id
    ) {
        return null;
    }

    return (
        "contest.activeOperator." +
        String(activeContestSession.id)
    );
}


function setupContestOperatorSelection() {

    const operator =
        contestSessionElement(
            "contest-operator"
        );

    if (!operator) {
        return;
    }

    if (
        operator.dataset.operatorSelectionBound ===
        "true"
    ) {
        return;
    }

    operator.dataset.operatorSelectionBound =
        "true";

    operator.addEventListener(
        "change",
        () => {

            const value =
                operator.value;

            activeContestOperatorId =
                value
                    ? Number(value)
                    : null;

            const storageKey =
                contestActiveOperatorStorageKey();

            if (!storageKey) {
                return;
            }

            if (activeContestOperatorId) {

                localStorage.setItem(
                    storageKey,
                    String(
                        activeContestOperatorId
                    )
                );

            }
            else {

                localStorage.removeItem(
                    storageKey
                );

            }

            window.dispatchEvent(
                new CustomEvent(
                    "contest-active-operator-changed",
                    {
                        detail: {
                            operatorId:
                                activeContestOperatorId
                        }
                    }
                )
            );
        }
    );
}


function restoreContestActiveOperator() {

    const operator =
        contestSessionElement(
            "contest-operator"
        );

    if (!operator) {
        return;
    }

    activeContestOperatorId =
        null;

    const storageKey =
        contestActiveOperatorStorageKey();

    if (!storageKey) {

        operator.value = "";

        return;
    }

    const storedValue =
        localStorage.getItem(
            storageKey
        );

    if (!storedValue) {

        operator.value = "";

        return;
    }

    const storedId =
        Number(storedValue);

    const exists =
        contestSessionOperators.some(
            sessionOperator =>
                Number(
                    sessionOperator.id
                ) === storedId
        );

    if (!exists) {

        localStorage.removeItem(
            storageKey
        );

        operator.value = "";

        return;
    }

    activeContestOperatorId =
        storedId;

    operator.value =
        String(storedId);

    window.dispatchEvent(
        new CustomEvent(
            "contest-active-operator-changed",
            {
                detail: {
                    operatorId:
                        activeContestOperatorId
                }
            }
        )
    );
}


function getActiveContestOperator() {

    if (!activeContestOperatorId) {
        return null;
    }

    return (
        contestSessionOperators.find(
            sessionOperator =>
                Number(
                    sessionOperator.id
                ) ===
                Number(
                    activeContestOperatorId
                )
        ) || null
    );
}


window.getActiveContestOperator =
    getActiveContestOperator;



function renderContestSession() {

    const session =
        activeContestSession;

    const status =
        contestSessionStatus(
            session
        );

    const statusElement =
        contestSessionElement(
            "contest-status"
        );

    const operator =
        contestSessionElement(
            "contest-operator"
        );

    const club =
        contestSessionElement(
            "contest-club"
        );

    const callsign =
        contestSessionElement(
            "contest-callsign"
        );

    const grid =
        contestSessionElement(
            "contest-grid"
        );

    const started =
        contestSessionElement(
            "contest-started"
        );

    const startButton =
        contestSessionElement(
            "contest-start-button"
        );

    const pauseButton =
        contestSessionElement(
            "contest-pause-button"
        );

    const resumeButton =
        contestSessionElement(
            "contest-resume-button"
        );

    const finishButton =
        contestSessionElement(
            "contest-finish-button"
        );

    setupContestOperatorSelection();

    const createButton =
        contestSessionElement(
            "contest-create-button"
        );


    /*
     * Status
     */

    if (statusElement) {

        statusElement.textContent =
            status;

        statusElement.dataset.status =
            status.toLowerCase();

    }


    /*
     * Session information
     *
     * Active Operator is handled separately.
     */

    if (session) {

        if (callsign) {
            callsign.textContent =
                session.station_callsign ||
                "—";
        }

        if (club) {
            club.textContent =
                session.station_callsign ||
                "—";
        }

        if (grid) {
            grid.value =
                session.station_grid ||
                "";
        }

        if (started) {
            started.textContent =
                session.started_at
                    ? formatContestDate(
                        session.started_at
                    )
                    : "—";
        }

    }
    else {

        if (callsign) {
            callsign.textContent = "—";
        }

        if (club) {
            club.textContent = "—";
        }

        if (grid) {
            grid.value = "";
        }

        if (started) {
            started.textContent = "—";
        }

    }


    /*
     * Active Operator selector.
     *
     * The options and enabled state are handled
     * exclusively by loadContestSessionOperators().
     *
     * The Active Operator is client-local and
     * remains selectable while the contest is
     * READY, RUNNING or PAUSED.
     */



    /*
     * Session already exists.
     */

    if (createButton) {

        createButton.disabled =
            Boolean(session);

    }


    /*
     * START
     *
     * Available from READY or PAUSED.
     */

    if (startButton) {

        startButton.disabled =
            !session ||
            !(
                status === "READY" ||
                status === "PAUSED"
            );

    }


    /*
     * PAUSE
     *
     * Available only while RUNNING.
     */

    if (pauseButton) {

        pauseButton.disabled =
            !session ||
            status !== "RUNNING";

    }


    /*
     * RESUME
     *
     * Available only while PAUSED.
     */

    if (resumeButton) {

        resumeButton.disabled =
            !session ||
            status !== "PAUSED";

    }


    /*
     * FINISH
     *
     * Available while RUNNING or PAUSED.
     */

    if (finishButton) {

        finishButton.disabled =
            !session ||
            !(
                status === "RUNNING" ||
                status === "PAUSED"
            );

    }


    /*
     * Notify other contest components.
     */

    if (
        window &&
        typeof window.dispatchEvent === "function"
    ) {

        window.dispatchEvent(
            new CustomEvent(
                "contest-session-changed",
                {
                    detail: {
                        session:
                            activeContestSession
                    }
                }
            )
        );

    }

}


function formatContestDate(value) {

    if (!value) {
        return "—";
    }

    const date =
        new Date(value);

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return String(value);
    }

    return date.toLocaleString(
        "de-CH",
        {
            dateStyle: "short",
            timeStyle: "medium",
	    timeZone: "UTC"
        }
    );

}


/*
 * Contest operators for new session.
 */

async function loadContestCreateOperators() {

    const container =
        contestSessionElement(
            "contest-create-operator-list"
        );

    if (!container) {
        return;
    }

    try {

        const response =
            await fetch(
                "/api/contests/operators?_=" +
                Date.now(),
                {
                    cache: "no-store"
                }
            );

        if (!response.ok) {

            throw new Error(
                `HTTP ${response.status}`
            );

        }

        const operators =
            await response.json();

        const activeOperators =
            Array.isArray(operators)
                ? operators.filter(
                    operator =>
                        operator &&
                        operator.active !== false
                )
                : [];

        if (!activeOperators.length) {

            container.innerHTML =
                '<span class="contest-operator-empty">' +
                'No active operators available.' +
                '</span>';

            return;

        }

        container.innerHTML =
            activeOperators
                .map(operator => {

                    const id =
                        Number(operator.id);

                    const callsign =
                        contestSessionEscape(
                            operator.callsign
                        );

                    const name =
                        contestSessionEscape(
                            operator.name
                        );

                    return `
                        <label class="contest-create-operator-item">
                            <input
                                type="checkbox"
                                class="contest-create-operator-checkbox"
                                value="${id}"
                            >
                            <span>
                                <strong>${callsign}</strong>
                                <span>${name}</span>
                            </span>
                        </label>
                    `;

                })
                .join("");

    }
    catch (error) {

        console.error(
            "Load contest operators:",
            error
        );

        container.innerHTML =
            '<span class="contest-operator-empty">' +
            'Could not load operators.' +
            '</span>';

    }

}


/*
 * Create session.
 */

/*
 * Create session.
 */

async function createContestSession() {

    if (activeContestSession) {

        alert(
            "A contest session already exists."
        );

        return;

    }

    const selector =
        contestSessionElement(
            "contest-select"
        );

    const definitionId =
        Number(
            selector?.value
        );

    if (
        !Number.isInteger(
            definitionId
        ) ||
        definitionId <= 0
    ) {

        alert(
            "Please select a contest."
        );

        return;

    }

    try {

        const response =
            await fetch(
                "/api/station?_=" +
                Date.now(),
                {
                    cache: "no-store"
                }
            );

        if (!response.ok) {

            throw new Error(
                `HTTP ${response.status}`
            );

        }

        const station =
            await response.json();

        const operatorName =
            station.operator_name ||
            station.name ||
            "";

        /*
         * Contest station callsign comes from the
         * selected contest definition.
         */
        const selectedDefinition =
            contestDefinitions.find(
                definition =>
                    Number(definition.id) ===
                    definitionId
            );

        let stationCallsign = "";

        if (selectedDefinition) {

            try {

                const rules =
                    typeof selectedDefinition.rules_json === "string"
                        ? JSON.parse(
                            selectedDefinition.rules_json
                        )
                        : (
                            selectedDefinition.rules_json ||
                            {}
                        );

                stationCallsign =
                    String(
                        rules.station_callsign ||
                        ""
                    ).trim().toUpperCase();

            }
            catch (error) {

                console.error(
                    "Contest definition rules:",
                    error
                );

            }

        }

        const stationGrid =
            station.locator ||
            "";

        if (!operatorName) {

            alert(
                "Station operator is not configured."
            );

            return;

        }

        if (!stationCallsign) {

            alert(
                "Station callsign is not configured."
            );

            return;

        }

        if (!stationGrid) {

            alert(
                "Station grid is not configured."
            );

            return;

        }

        const createResponse =
            await fetch(
                "/api/contests/session",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify({
                            contest_definition_id:
                                definitionId,

                            operator_name:
                                operatorName,

                            station_callsign:
                                stationCallsign,

                            station_grid:
                                stationGrid
                        })
                }
            );

        const data =
            await createResponse.json();

        if (!createResponse.ok) {

            throw new Error(
                data.error ||
                `HTTP ${createResponse.status}`
            );

        }

        activeContestSession =
            data;

        // Session erfolgreich erstellt:
        // Erfolg sofort anzeigen, bevor Operatoren
        // zugeordnet und geladen werden.
        showContestSessionMessage(
            `✓ Session ${data.id} created`,
            "success"
        );

        const operatorCheckboxes =
            document.querySelectorAll(
                ".contest-create-operator-checkbox:checked"
            );

        const selectedOperatorIds =
            Array.from(operatorCheckboxes)
                .map(checkbox => Number(checkbox.value))
                .filter(
                    operatorId =>
                        Number.isInteger(operatorId) &&
                        operatorId > 0
                );

        for (const operatorId of selectedOperatorIds) {

            const operatorResponse =
                await fetch(
                    `/api/contests/session/${data.id}/operators/${operatorId}`,
                    {
                        method: "POST"
                    }
                );

            const operatorData =
                await operatorResponse.json();

            if (!operatorResponse.ok) {

                throw new Error(
                    operatorData.error ||
                    `Could not assign operator ${operatorId}`
                );

            }

        }

        window.contestSessionId =
            data &&
            data.id
                ? String(data.id)
                : null;

        updateContestId();

        /*
         * Load the operators assigned to the newly
         * created session so the Active Operator
         * selector is populated immediately.
         */
        await loadContestSessionOperators();

        renderContestSession();

    }
    catch (error) {

        console.error(
            "Create contest session:",
            error
        );

        alert(
            "Could not create contest session:\n\n" +
            error.message
        );

    }

}           



/*
 * Generic session action.
 */

async function contestSessionAction(
    action
) {

    if (
        !activeContestSession ||
        !activeContestSession.id
    ) {

        alert(
            "No valid contest session."
        );

        return;

    }

    const id =
        Number(
            activeContestSession.id
        );

    if (
        !Number.isInteger(id) ||
        id <= 0
    ) {

        alert(
            "Invalid contest session ID."
        );

        return;

    }

    /*
     * Session lifecycle actions require
     * the central contest control key.
     */
    const lifecycleActions = [
        "start",
        "pause",
        "resume",
        "finish"
    ];

    let requestOptions = {
        method: "POST"
    };

    if (lifecycleActions.includes(action)) {

        const controlKey =
            window.prompt(
                "Contest control key:"
            );

        if (controlKey === null) {
            return;
        }

        requestOptions = {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                control_key: controlKey
            })
        };

    }

    try {

        const response =
            await fetch(
                `/api/contests/session/${id}/${action}`,
                requestOptions
            );

        const data =
            await response.json();

        if (!response.ok) {

            throw new Error(
                data.error ||
                `HTTP ${response.status}`
            );

        }

        activeContestSession =
            data;

        window.contestSessionId =
            data &&
            data.id
                ? String(data.id)
                : null;

        renderContestSession();

        const actionMessages = {
            start: "started",
            pause: "paused",
            resume: "resumed",
            finish: "finished"
        };

        const actionMessage =
            actionMessages[action] || action;

        if (
            activeContestSession &&
            activeContestSession.id
        ) {
            showContestSessionMessage(
                `✓ Session ${activeContestSession.id} ${actionMessage}`,
                "success"
            );
        }

    }
    catch (error) {

        console.error(
            `Contest session ${action}:`,
            error
        );

        alert(
            `Could not ${action} contest session:

` +
            error.message
        );

    }

}



/*
 * Button setup.
 */

function setupContestSession() {

    const createButton =
        contestSessionElement(
            "contest-create-button"
        );

    const startButton =
        contestSessionElement(
            "contest-start-button"
        );

    const pauseButton =
        contestSessionElement(
            "contest-pause-button"
        );

    const resumeButton =
        contestSessionElement(
            "contest-resume-button"
        );

    const finishButton =
        contestSessionElement(
            "contest-finish-button"
        );

    if (createButton) {

        createButton.addEventListener(
            "click",
            createContestSession
        );

    }

    if (startButton) {

        startButton.addEventListener(
            "click",
            () =>
                contestSessionAction(
                    "start"
                )
        );

    }

    if (pauseButton) {

        pauseButton.addEventListener(
            "click",
            () =>
                contestSessionAction(
                    "pause"
                )
        );

    }

    if (resumeButton) {

        resumeButton.addEventListener(
            "click",
            () =>
                contestSessionAction(
                    "resume"
                )
        );

    }

    if (finishButton) {

        finishButton.addEventListener(
            "click",
            () =>
                contestSessionAction(
                    "finish"
                )
        );

    }

}


/*
 * Initialize.
 */

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        setupContestSession();

        await loadContestStation();

        await loadContestDefinitions();

        await loadContestCreateOperators();

        await loadContestSession();

    }
);

