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
                                    class="button small"
                                    data-action="edit"
                                    data-id="${definition.id}"
                                >
                                    Edit
                                </button>

                                <button
                                    type="button"
                                    class="button small"
                                    data-action="copy"
                                    data-id="${definition.id}"
                                >
                                    Copy
                                </button>

                                <button
                                    type="button"
                                    class="button small"
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
