/*
    SHACK-SERVER
    Settings Modal
*/

console.log("SETTINGS MODAL JS LOADED");


let settingsData = null;


/*
    Open Settings
*/

function openSettings() {

    const modal =
        document.getElementById(
            "settings-modal"
        );

    if (!modal) {

        console.error(
            "Settings modal not found"
        );

        return;

    }


    modal.classList.add(
        "open"
    );


    loadSettings();

const locator =
    document.getElementById(
        "settings-locator"
    );

}


/*
    Close Settings
*/

function closeSettings() {

    const modal =
        document.getElementById(
            "settings-modal"
        );

    if (!modal) {
        return;
    }


    modal.classList.remove(
        "open"
    );

}


/*
    Load settings
*/

async function loadSettings() {

    try {

        const response =
            await fetch(
                "/api/settings?_=" +
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


        settingsData =
            await response.json();


        const callsign =
            document.getElementById(
                "callsign"
            );

        const operatorName =
            document.getElementById(
                "operatorName"
            );

        const locator =
            document.getElementById(
                "settings-locator"
            );

        const club =
            document.getElementById(
                "club"
            );


        if (callsign) {

            callsign.value =
                settingsData.callsign ??
                "";

        }


        if (operatorName) {

            operatorName.value =
                settingsData.operatorName ??
                "";

        }


        if (locator) {

            locator.value =
                settingsData.locator ??
                "";

        }


        if (club) {

            club.value =
                settingsData.club ??
                "";

        }


        const dxspider =
            document.getElementById(
                "source-dxspider"
            );

        const holycluster =
            document.getElementById(
                "source-holycluster"
            );

        const dxsummit =
            document.getElementById(
                "source-dxsummit"
            );


        if (dxspider) {

            dxspider.checked =
                settingsData.sources?.dxspider ??
                false;

        }


        if (holycluster) {

            holycluster.checked =
                settingsData.sources?.holycluster ??
                false;

        }


        if (dxsummit) {

            dxsummit.checked =
                settingsData.sources?.dxsummit ??
                false;

        }


        renderDXSpiders();

    }
    catch (error) {

        console.error(
            "Failed to load settings:",
            error
        );

        showSettingsMessage(
            "Failed to load settings."
        );

    }

}


/*
    DXSpider list
*/

function renderDXSpiders() {

    const list =
        document.getElementById(
            "dxspider-list"
        );


    if (!list) {
        return;
    }


    list.innerHTML = "";


    const spiders =
        settingsData?.dxspiders ?? [];


    spiders.forEach(
        (spider, index) => {

            const row =
                document.createElement(
                    "div"
                );

            row.className =
                "dxspider-row";


            row.innerHTML = `

                <input
                    class="dxspider-enabled"
                    type="checkbox"
                    ${spider.enabled ? "checked" : ""}
                    title="Enabled">

                <input
                    class="dxspider-name"
                    type="text"
                    value="${escapeHtml(spider.name ?? "")}"
                    placeholder="Name">

                <input
                    class="dxspider-host"
                    type="text"
                    value="${escapeHtml(spider.host ?? "")}"
                    placeholder="Host">

                <input
                    class="dxspider-port"
                    type="number"
                    value="${spider.port ?? 8000}"
                    placeholder="Port">

                <input
                    class="dxspider-password"
                    type="password"
                    value="${escapeHtml(spider.password ?? "")}"
                    placeholder="Password">

                <button
                    class="dxspider-remove"
                    type="button">

                    ×

                </button>

            `;


            row.querySelector(
                ".dxspider-remove"
            ).addEventListener(
                "click",
                () => {

                    row.remove();

                }
            );


            list.appendChild(
                row
            );

        }
    );

}


/*
    Add DXSpider
*/

function addDXSpider() {

    const list =
        document.getElementById(
            "dxspider-list"
        );


    if (!list) {
        return;
    }


    const row =
        document.createElement(
            "div"
        );

    row.className =
        "dxspider-row";


    row.innerHTML = `

        <input
            class="dxspider-enabled"
            type="checkbox"
            checked
            title="Enabled">

        <input
            class="dxspider-name"
            type="text"
            placeholder="Name">

        <input
            class="dxspider-host"
            type="text"
            placeholder="Host">

        <input
            class="dxspider-port"
            type="number"
            value="8000"
            placeholder="Port">

        <input
            class="dxspider-password"
            type="password"
            placeholder="Password">

        <button
            class="dxspider-remove"
            type="button">

            ×

        </button>

    `;


    row.querySelector(
        ".dxspider-remove"
    ).addEventListener(
        "click",
        () => {

            row.remove();

        }
    );


    list.appendChild(
        row
    );

}


/*
    Collect DXSpider settings
*/

function collectDXSpiders() {

    const rows =
        document.querySelectorAll(
            "#dxspider-list .dxspider-row"
        );


    return Array.from(rows)
        .map(
            row => ({

                name:
                    row.querySelector(
                        ".dxspider-name"
                    ).value.trim(),

                host:
                    row.querySelector(
                        ".dxspider-host"
                    ).value.trim(),

                port:
                    Number(
                        row.querySelector(
                            ".dxspider-port"
                        ).value
                    ) || 8000,

                password:
                    row.querySelector(
                        ".dxspider-password"
                    ).value,

                enabled:
                    row.querySelector(
                        ".dxspider-enabled"
                    ).checked

            })
        );

}


/*
    Save settings
*/

async function saveSettings() {

    const settings = {

        callsign:
            document.getElementById(
                "callsign"
            ).value.trim(),

        operatorName:
            document.getElementById(
                "operatorName"
            ).value.trim(),

        locator:
            document.getElementById(
                "settings-locator"
            ).value.trim(),

        club:
            document.getElementById(
                "club"
            ).value.trim(),

        sources: {

            dxspider:
                document.getElementById(
                    "source-dxspider"
                ).checked,

            holycluster:
                document.getElementById(
                    "source-holycluster"
                ).checked,

            dxsummit:
                document.getElementById(
                    "source-dxsummit"
                ).checked

        },

        dxspiders:
            collectDXSpiders()

    };


    try {

        const response =
            await fetch(
                "/api/settings",
                {

                    method: "PUT",

                    headers: {

                        "Content-Type":
                            "application/json"

                    },

                    body:
                        JSON.stringify(
                            settings
                        )

                }
            );


        if (!response.ok) {

            throw new Error(
                `HTTP ${response.status}`
            );

        }


        settingsData =
            await response.json();


        showSettingsMessage(
            "Settings saved."
        );


        /*
            SourceManager is restarted
            by the backend after settings update.
        */

    }
    catch (error) {

        console.error(
            "Failed to save settings:",
            error
        );

        showSettingsMessage(
            "Failed to save settings."
        );

    }

}


/*
    Message
*/

function showSettingsMessage(
    message
) {

    const element =
        document.getElementById(
            "settings-message"
        );


    if (element) {

        element.textContent =
            message;

    }

}


/*
    HTML escaping
*/

function escapeHtml(
    value
) {

    return String(value)
        .replaceAll(
            "&",
            "&amp;"
        )
        .replaceAll(
            "<",
            "&lt;"
        )
        .replaceAll(
            ">",
            "&gt;"
        )
        .replaceAll(
            '"',
            "&quot;"
        )
        .replaceAll(
            "'",
            "&#039;"
        );

}


/*
    Initialize
*/

function initializeSettingsModal() {

    console.log(
        "Initializing Settings Modal"
    );


    const settingsButton =
        document.getElementById(
            "settings-btn"
        );

    const modal =
        document.getElementById(
            "settings-modal"
        );

    const closeButton =
        document.getElementById(
            "settings-close"
        );

    const cancelButton =
        document.getElementById(
            "settings-cancel"
        );

    const addButton =
        document.getElementById(
            "add-dxspider"
        );


    if (!settingsButton) {

        console.error(
            "Settings button not found"
        );

        return;

    }


    if (!modal) {

        console.error(
            "Settings modal not found"
        );

        return;

    }


    settingsButton.addEventListener(
        "click",
        event => {

            event.preventDefault();

            openSettings();

        }
    );


    if (closeButton) {

        closeButton.addEventListener(
            "click",
            closeSettings
        );

    }


    if (cancelButton) {

        cancelButton.addEventListener(
            "click",
            closeSettings
        );

    }


    if (addButton) {

        addButton.addEventListener(
            "click",
            addDXSpider
        );

    }


    modal.addEventListener(
        "click",
        event => {

            if (
                event.target === modal
            ) {

                closeSettings();

            }

        }
    );


    const saveButton =
        document.getElementById(
            "save-settings"
        );


    if (saveButton) {

        saveButton.addEventListener(
            "click",
            saveSettings
        );

    }


    console.log(
        "Settings Modal initialized"
    );

}


/*
    Components are loaded dynamically.
*/

window.addEventListener(
    "componentsLoaded",
    initializeSettingsModal
);


/*
    Fallback if script was loaded
    after componentsLoaded.
*/

if (
    document.getElementById(
        "settings-btn"
    )
) {

    initializeSettingsModal();

}
