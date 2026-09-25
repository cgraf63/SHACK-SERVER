const definitionsBody =
    document.getElementById("contest-definitions-body");

const editor =
    document.getElementById("contest-editor");

const editorTitle =
    document.getElementById("contest-editor-title");

const form =
    document.getElementById("contest-form");

const contestId =
    document.getElementById("contest-id");

const contestName =
    document.getElementById("contest-name");

const contestShortName =
    document.getElementById("contest-short-name");

const contestVersion =
    document.getElementById("contest-version");

const contestEnabled =
    document.getElementById("contest-enabled");

const contestStationCallsign =
    document.getElementById(
        "contest-station-callsign"
    );

const contestDescription =
    document.getElementById("contest-description");

const exchangeSent =
    document.getElementById("exchange-sent");

const exchangeReceived =
    document.getElementById("exchange-received");

const dupeKey =
    document.getElementById("dupe-key");

const scoringType =
    document.getElementById("scoring-type");

const sendRst =
    document.getElementById("send-rst");

const receiveRst =
    document.getElementById("receive-rst");

const newContestButton =
    document.getElementById("new-contest-button");

const cancelContestButton =
    document.getElementById("cancel-contest-button");


let definitions = [];


/*
 * Load contest definitions
 */

async function loadDefinitions() {

    try {

        const response =
            await fetch(
                "/api/contests/definitions"
            );

        if (!response.ok) {

            throw new Error(
                `HTTP ${response.status}`
            );

        }

        definitions =
            await response.json();

        renderDefinitions();

    }
    catch (error) {

        console.error(
            "Failed to load contest definitions:",
            error
        );

        definitionsBody.innerHTML = `
            <tr>
                <td
                    colspan="5"
                    class="empty-state"
                >
                    Failed to load contest definitions.
                </td>
            </tr>
        `;

    }

}


/*
 * Render contest definitions
 */

function renderDefinitions() {

    if (!definitions.length) {

        definitionsBody.innerHTML = `
            <tr>
                <td
                    colspan="5"
                    class="empty-state"
                >
                    No contest definitions available.
                </td>
            </tr>
        `;

        return;

    }


    definitionsBody.innerHTML =
        definitions
            .map(
                definition => {

                    const status =
                        definition.enabled
                            ? "Enabled"
                            : "Disabled";

                    return `
                        <tr>

                            <td>
                                ${escapeHtml(
                                    definition.name
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    definition.short_name
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    definition.version
                                )}
                            </td>

                            <td>
                                <span
                                    class="contest-status ${
                                        definition.enabled
                                            ? "enabled"
                                            : "disabled"
                                    }"
                                >
                                    ${status}
                                </span>
                            </td>

                            <td>

                                <button
                                    type="button"
                                    class="button small blue"
                                    data-action="edit"
                                    data-id="${definition.id}"
                                >
                                    Edit
                                </button>

                                <button
                                    type="button"
                                    class="button small muted"
                                    data-action="copy"
                                    data-id="${definition.id}"
                                >
                                    Copy
                                </button>

                                <button
                                    type="button"
                                    class="button small ${
                                        definition.enabled
                                            ? "warning"
                                            : "muted"
                                    }"
                                    data-action="toggle"
                                    data-id="${definition.id}"
                                >
                                    ${
                                        definition.enabled
                                            ? "Disable"
                                            : "Enable"
                                    }
                                </button>

                                <button
                                    type="button"
                                    class="button small danger"
                                    data-action="delete"
                                    data-id="${definition.id}"
                                >
                                    Delete
                                </button>

                            </td>

                        </tr>
                    `;

                }
            )
            .join("");

}


/*
 * Read checked checkbox values
 */

function getCheckedValues(
    name
) {

    return Array.from(
        document.querySelectorAll(
            `input[name="${name}"]:checked`
        )
    ).map(
        input => input.value
    );

}


/*
 * Set checked checkbox values
 */

function setCheckedValues(
    name,
    values
) {

    const selected =
        new Set(
            Array.isArray(values)
                ? values
                : []
        );


    document
        .querySelectorAll(
            `input[name="${name}"]`
        )
        .forEach(
            input => {

                input.checked =
                    selected.has(
                        input.value
                    );

            }
        );

}


/*
 * Build rules object
 */

function buildRules() {

    return {

        station_callsign:
            contestStationCallsign
                ? contestStationCallsign.value
                    .trim()
                    .toUpperCase()
                : "",

        bands:
            getCheckedValues(
                "contest-band"
            ),

        modes:
            getCheckedValues(
                "contest-mode"
            ),

        exchange: {

            sent:
                exchangeSent.value,

            received:
                exchangeReceived.value

        },

        dupe: {

            key:
                dupeKey.value

        },

        scoring: {

            type:
                scoringType.value

        },

        multipliers:
            getCheckedValues(
                "contest-multiplier"
            ),

        rst: {

            send:
                sendRst.checked,

            receive:
                receiveRst.checked

        }

    };

}


/*
 * Apply rules object to editor
 */

function applyRules(
    rules
) {

    const safeRules =
        rules &&
        typeof rules === "object"
            ? rules
            : {};


    if (contestStationCallsign) {
        contestStationCallsign.value =
            String(
                safeRules.station_callsign || ""
            )
            .trim()
            .toUpperCase();
    }


    setCheckedValues(
        "contest-band",
        safeRules.bands
    );


    setCheckedValues(
        "contest-mode",
        safeRules.modes
    );


    exchangeSent.value =
        safeRules.exchange?.sent ||
        "none";


    exchangeReceived.value =
        safeRules.exchange?.received ||
        "none";


    dupeKey.value =
        safeRules.dupe?.key ||
        "call";


    scoringType.value =
        safeRules.scoring?.type ||
        "one";


    setCheckedValues(
        "contest-multiplier",
        safeRules.multipliers
    );


    sendRst.checked =
        safeRules.rst?.send !== false;


    receiveRst.checked =
        safeRules.rst?.receive !== false;

}


/*
 * Reset editor
 */

function resetEditor() {

    contestId.value =
        "";

    contestName.value =
        "";

    contestShortName.value =
        "";

    contestVersion.value =
        "1";

    contestEnabled.value =
        "true";

    if (contestStationCallsign) {
        contestStationCallsign.value =
            "";
    }

    contestDescription.value =
        "";


    applyRules({

        bands: [],

        modes: [],

        exchange: {

            sent: "none",
            received: "none"

        },

        dupe: {

            key: "call"

        },

        scoring: {

            type: "one"

        },

        multipliers: [],

        rst: {

            send: true,
            receive: true

        }

    });

}


/*
 * Open new contest editor
 */

function openNewEditor() {

    resetEditor();


    editorTitle.textContent =
        "New Contest";


    editor.hidden =
        false;


    contestName.focus();

}


/*
 * Open existing contest editor
 */

async function openEditEditor(
    id
) {

    try {

        const response =
            await fetch(
                `/api/contests/definitions/${id}`
            );


        if (!response.ok) {

            throw new Error(
                `HTTP ${response.status}`
            );

        }


        const definition =
            await response.json();


        contestId.value =
            definition.id;

        contestName.value =
            definition.name || "";

        contestShortName.value =
            definition.short_name || "";

        contestVersion.value =
            definition.version || "1";

        contestEnabled.value =
            definition.enabled
                ? "true"
                : "false";

        contestDescription.value =
            definition.description || "";


        let rules = {};

        try {

            rules =
                JSON.parse(
                    definition.rules_json || "{}"
                );

        }
        catch (error) {

            console.warn(
                "Invalid rules JSON:",
                error
            );

        }


        applyRules(
            rules
        );


        editorTitle.textContent =
            "Edit Contest";


        editor.hidden =
            false;


        contestName.focus();

    }
    catch (error) {

        console.error(
            "Failed to load contest definition:",
            error
        );


        alert(
            "Failed to load contest definition."
        );

    }

}


/*
 * Copy contest definition
 */

async function copyDefinition(
    id
) {

    const definition =
        definitions.find(
            item =>
                Number(item.id) ===
                Number(id)
        );


    if (!definition) {

        return;

    }


    contestId.value =
        "";


    contestName.value =
        `${definition.name} Copy`;


    contestShortName.value =
        `${definition.short_name}-copy`;


    contestVersion.value =
        definition.version || "1";


    contestEnabled.value =
        definition.enabled
            ? "true"
            : "false";


    contestDescription.value =
        definition.description || "";


    let rules = {};

    try {

        rules =
            JSON.parse(
                definition.rules_json || "{}"
            );

    }
    catch (error) {

        console.warn(
            "Invalid rules JSON:",
            error
        );

    }


    applyRules(
        rules
    );


    editorTitle.textContent =
        "Copy Contest";


    editor.hidden =
        false;


    contestName.focus();

}


/*
 * Save contest definition
 */

async function saveDefinition(
    event
) {

    event.preventDefault();


    const rules =
        buildRules();


    const payload = {

        name:
            contestName.value.trim(),

        short_name:
            contestShortName.value.trim(),

        version:
            contestVersion.value.trim() ||
            "1",

        description:
            contestDescription.value.trim() ||
            null,

        rules_json:
            JSON.stringify(
                rules,
                null,
                2
            ),

        enabled:
            contestEnabled.value ===
            "true"

    };


    if (
        !payload.name ||
        !payload.short_name
    ) {

        alert(
            "Contest name and Short ID are required."
        );

        return;

    }


    if (
        !rules.station_callsign
    ) {

        alert(
            "Station Callsign is required."
        );

        if (contestStationCallsign) {
            contestStationCallsign.focus();
        }

        return;

    }


    const id =
        contestId.value;


    const url =
        id
            ? `/api/contests/definitions/${id}`
            : "/api/contests/definitions";


    const method =
        id
            ? "PUT"
            : "POST";


    try {

        const response =
            await fetch(
                url,
                {

                    method,

                    headers: {

                        "Content-Type":
                            "application/json"

                    },

                    body:
                        JSON.stringify(
                            payload
                        )

                }
            );


        const result =
            await response.json();


        if (!response.ok) {

            throw new Error(
                result.error ||
                `HTTP ${response.status}`
            );

        }


        closeEditor();

        await loadDefinitions();

    }
    catch (error) {

        console.error(
            "Failed to save contest definition:",
            error
        );


        alert(
            error.message ||
            "Failed to save contest definition."
        );

    }

}


/*
 * Delete contest definition
 */

async function deleteDefinition(
    id
) {

    const definition =
        definitions.find(
            item =>
                Number(item.id) ===
                Number(id)
        );


    if (!definition) {

        return;

    }


    if (
        !confirm(
            `Delete contest "${definition.name}"?`
        )
    ) {

        return;

    }


    try {

        const response =
            await fetch(
                `/api/contests/definitions/${id}`,
                {
                    method: "DELETE"
                }
            );


        const result =
            await response.json();


        if (!response.ok) {

            throw new Error(
                result.error ||
                `HTTP ${response.status}`
            );

        }


        await loadDefinitions();

    }
    catch (error) {

        console.error(
            "Failed to delete contest definition:",
            error
        );


        alert(
            error.message ||
            "Failed to delete contest definition."
        );

    }

}


/*
 * Enable / disable
 */

async function toggleDefinition(
    id
) {

    const definition =
        definitions.find(
            item =>
                Number(item.id) ===
                Number(id)
        );


    if (!definition) {

        return;

    }


    try {

        const response =
            await fetch(
                `/api/contests/definitions/${id}/enabled`,
                {

                    method: "PATCH",

                    headers: {

                        "Content-Type":
                            "application/json"

                    },

                    body:
                        JSON.stringify({

                            enabled:
                                !definition.enabled

                        })

                }
            );


        const result =
            await response.json();


        if (!response.ok) {

            throw new Error(
                result.error ||
                `HTTP ${response.status}`
            );

        }


        await loadDefinitions();

    }
    catch (error) {

        console.error(
            "Failed to update contest status:",
            error
        );


        alert(
            error.message ||
            "Failed to update contest status."
        );

    }

}


/*
 * Close editor
 */

function closeEditor() {

    editor.hidden =
        true;

}


/*
 * Escape HTML
 */

function escapeHtml(
    value
) {

    return String(
        value ?? ""
    )
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
 * Table actions
 */

definitionsBody.addEventListener(
    "click",
    event => {

        const button =
            event.target.closest(
                "button[data-action]"
            );


        if (!button) {

            return;

        }


        const action =
            button.dataset.action;

        const id =
            button.dataset.id;


        if (action === "edit") {

            openEditEditor(id);

        }
        else if (action === "copy") {

            copyDefinition(id);

        }
        else if (action === "toggle") {

            toggleDefinition(id);

        }
        else if (action === "delete") {

            deleteDefinition(id);

        }

    }
);


/*
 * Event handlers
 */

newContestButton.addEventListener(
    "click",
    openNewEditor
);


cancelContestButton.addEventListener(
    "click",
    closeEditor
);


form.addEventListener(
    "submit",
    saveDefinition
);


/*
 * Initial load
 */

loadDefinitions();


/*
 * Contest Operators
 */

const operatorsBody =
    document.getElementById("contest-operators-body");

const operatorEditor =
    document.getElementById("operator-editor");

const operatorEditorTitle =
    document.getElementById("operator-editor-title");

const operatorForm =
    document.getElementById("operator-form");

const operatorId =
    document.getElementById("operator-id");

const operatorCallsign =
    document.getElementById("operator-callsign");

const operatorName =
    document.getElementById("operator-name");

const operatorClub =
    document.getElementById("operator-club");

const operatorEmail =
    document.getElementById("operator-email");

const operatorNotes =
    document.getElementById("operator-notes");

const operatorActive =
    document.getElementById("operator-active");

const newOperatorButton =
    document.getElementById("new-operator-button");

const cancelOperatorButton =
    document.getElementById("cancel-operator-button");


let operators = [];


/*
 * Load operators
 */

async function loadOperators() {

    try {

        const response =
            await fetch(
                "/api/contests/operators"
            );


        if (!response.ok) {

            throw new Error(
                `HTTP ${response.status}`
            );

        }


        operators =
            await response.json();


        renderOperators();

    }
    catch (error) {

        console.error(
            "Failed to load contest operators:",
            error
        );


        operatorsBody.innerHTML = `
            <tr>
                <td
                    colspan="5"
                    class="empty-state"
                >
                    Failed to load operators.
                </td>
            </tr>
        `;

    }

}


/*
 * Render operators
 */

function renderOperators() {

    if (!operators.length) {

        operatorsBody.innerHTML = `
            <tr>
                <td
                    colspan="5"
                    class="empty-state"
                >
                    No operators available.
                </td>
            </tr>
        `;

        return;

    }


    operatorsBody.innerHTML =
        operators
            .map(
                operator => {

                    const status =
                        operator.active
                            ? "Active"
                            : "Disabled";


                    return `
                        <tr>

                            <td>
                                <strong>
                                    ${escapeHtml(
                                        operator.callsign
                                    )}
                                </strong>
                            </td>

                            <td>
                                ${escapeHtml(
                                    operator.name
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    operator.club || ""
                                )}
                            </td>

                            <td>
                                <span
                                    class="contest-status ${
                                        operator.active
                                            ? "enabled"
                                            : "disabled"
                                    }"
                                >
                                    ${status}
                                </span>
                            </td>

                            <td>

                                <button
                                    type="button"
                                    class="button small blue"
                                    data-operator-action="edit"
                                    data-id="${operator.id}"
                                >
                                    Edit
                                </button>

                                <button
                                    type="button"
                                    class="button small ${
                                        operator.active
                                            ? "warning"
                                            : "muted"
                                    }"
                                    data-operator-action="toggle"
                                    data-id="${operator.id}"
                                >
                                    ${
                                        operator.active
                                            ? "Disable"
                                            : "Enable"
                                    }
                                </button>

                                <button
                                    type="button"
                                    class="button small danger"
                                    data-operator-action="delete"
                                    data-id="${operator.id}"
                                >
                                    Delete
                                </button>

                            </td>

                        </tr>
                    `;

                }
            )
            .join("");

}


/*
 * Open operator editor
 */

function openOperatorEditor(
    operator = null
) {

    operatorEditor.hidden = false;


    if (operator) {

        operatorEditorTitle.textContent =
            "Edit Operator";

        operatorId.value =
            operator.id ?? "";

        operatorCallsign.value =
            operator.callsign ?? "";

        operatorName.value =
            operator.name ?? "";

        operatorClub.value =
            operator.club ?? "";

        operatorEmail.value =
            operator.email ?? "";

        operatorNotes.value =
            operator.notes ?? "";

        operatorActive.checked =
            operator.active !== false;

    }
    else {

        operatorEditorTitle.textContent =
            "New Operator";

        operatorForm.reset();

        operatorId.value =
            "";

        operatorActive.checked =
            true;

    }


    operatorCallsign.focus();

}


/*
 * Close operator editor
 */

function closeOperatorEditor() {

    operatorEditor.hidden = true;

    operatorForm.reset();

    operatorId.value =
        "";

    operatorActive.checked =
        true;

}


/*
 * Save operator
 */

async function saveOperator(
    event
) {

    event.preventDefault();


    const id =
        Number(
            operatorId.value
        );


    const payload = {

        callsign:
            operatorCallsign.value.trim(),

        name:
            operatorName.value.trim(),

        club:
            operatorClub.value.trim(),

        email:
            operatorEmail.value.trim(),

        notes:
            operatorNotes.value.trim(),

        active:
            operatorActive.checked

    };


    const url =
        id > 0
            ? `/api/contests/operators/${id}`
            : "/api/contests/operators";


    const method =
        id > 0
            ? "PATCH"
            : "POST";


    try {

        const response =
            await fetch(
                url,
                {

                    method,

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify(
                            payload
                        )

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


        closeOperatorEditor();

        await loadOperators();

    }
    catch (error) {

        console.error(
            "Failed to save contest operator:",
            error
        );


        alert(
            error.message ||
            "Failed to save operator."
        );

    }

}


/*
 * Delete operator
 */

async function deleteOperator(
    id
) {

    const operator =
        operators.find(
            item =>
                Number(item.id) ===
                Number(id)
        );

    if (!operator) {
        return;
    }

    if (
        !confirm(
            `Delete operator "${operator.callsign}"?`
        )
    ) {
        return;
    }

    try {

        const response =
            await fetch(
                `/api/contests/operators/${id}`,
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

        await loadOperators();

    }
    catch (error) {

        console.error(
            "Failed to delete contest operator:",
            error
        );

        alert(
            error.message ||
            "Failed to delete operator."
        );

    }

}


/*
 * Operator table actions
 */

operatorsBody.addEventListener(
    "click",
    async event => {

        const button =
            event.target.closest(
                "[data-operator-action]"
            );


        if (!button) {

            return;

        }


        const id =
            Number(
                button.dataset.id
            );


        const action =
            button.dataset.operatorAction;


        const operator =
            operators.find(
                item =>
                    Number(item.id) === id
            );


        if (!operator) {

            return;

        }


        if (action === "edit") {

            openOperatorEditor(
                operator
            );

            return;

        }


        if (action === "delete") {

            deleteOperator(id);

            return;

        }


        if (action === "toggle") {

            try {

                const response =
                    await fetch(
                        `/api/contests/operators/${id}/active`,
                        {

                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body:
                                JSON.stringify({
                                    active:
                                        !operator.active
                                })

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


                await loadOperators();

            }
            catch (error) {

                console.error(
                    "Failed to change operator status:",
                    error
                );


                alert(
                    error.message ||
                    "Failed to change operator status."
                );

            }

        }

    }
);


/*
 * Operator editor events
 */

newOperatorButton.addEventListener(
    "click",
    () => {

        openOperatorEditor();

    }
);


cancelOperatorButton.addEventListener(
    "click",
    () => {

        closeOperatorEditor();

    }
);


operatorForm.addEventListener(
    "submit",
    saveOperator
);


/*
 * Initial load
 */

loadOperators();



/*
 * Contest Operators
 */
