/*
 * Contest Session Manager
 */

let activeContestSession = null;
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

    const finishButton =
        contestSessionElement(
            "contest-finish-button"
        );

    const createButton =
        contestSessionElement(
            "contest-create-button"
        );

    if (statusElement) {

        statusElement.textContent =
            status;

        statusElement.dataset.status =
            status.toLowerCase();

    }

    if (session) {

        if (operator) {
            operator.textContent =
                session.operator_name || "—";
        }

        if (callsign) {
            callsign.textContent =
                session.station_callsign || "—";
        }

        if (grid) {
            grid.textContent =
                session.station_grid || "—";
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

        if (operator) {
            operator.textContent = "—";
        }

        if (callsign) {
            callsign.textContent = "—";
        }

        if (grid) {
            grid.textContent = "—";
        }

        if (started) {
            started.textContent = "—";
        }

    }

    /*
     * Session already exists.
     */

    if (createButton) {
        createButton.disabled =
            Boolean(session);
    }

    /*
     * READY
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
     * PAUSE only while running.
     */

    if (pauseButton) {
        pauseButton.disabled =
            !session ||
            status !== "RUNNING";
    }

    /*
     * FINISH while active or paused.
     */

    if (finishButton) {
        finishButton.disabled =
            !session ||
            !(
                status === "RUNNING" ||
                status === "PAUSED"
            );
    }

}


/*
 * Format timestamp.
 */

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

        const stationCallsign =
            station.callsign ||
            "";

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

        window.contestSessionId =
            data &&
            data.id
                ? String(data.id)
                : null;

        updateContestId();

        renderContestSession();

        showContestSessionMessage(
            `Session ${data.id} created`,
            "success"
        );

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

    try {

        const response =
            await fetch(
                `/api/contests/session/${id}/${action}`,
                {
                    method: "POST"
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

        activeContestSession =
            data;

        window.contestSessionId =
            data &&
            data.id
                ? String(data.id)
                : null;

        renderContestSession();

    }
    catch (error) {

        console.error(
            `Contest session ${action}:`,
            error
        );

        alert(
            `Could not ${action} contest session:\n\n` +
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

        await loadContestSession();

    }
);

