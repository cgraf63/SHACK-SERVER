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

    // Transceiver section (js/radio-settings.js)
    if (typeof window.loadRadioSettings === "function") {
        window.loadRadioSettings();
    }

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

    if (typeof window.closeRadioSettings === "function") {
        window.closeRadioSettings();
    }

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


        /*
            Optional modules (sidebar pages)
        */

        const moduleRbn =
            document.getElementById("module-rbn");

        const moduleSdr =
            document.getElementById("module-sdr");

        if (moduleRbn) {
            moduleRbn.checked =
                settingsData.modules?.rbn !== false;
        }

        if (moduleSdr) {
            moduleSdr.checked =
                settingsData.modules?.sdr === true;
        }


        /*
            Log uploads (keys are never sent to the browser)
        */

        applyUploadSettings(
            settingsData.uploads
        );

        applyWsjtxSettings(
            settingsData.wsjtx
        );


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


    /*
        Column headings
    */

    if (spiders.length) {

        const head =
            document.createElement("div");

        head.className =
            "dxspider-head";

        head.innerHTML =
            "<span></span><span>Name</span><span>Host</span>" +
            "<span>Port</span><span>Password</span><span></span>";

        list.appendChild(head);

    }


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
                    type="button"
                    title="Remove">×</button>

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
            type="button"
            title="Remove">×</button>

    `;


    row.querySelector(
        ".dxspider-remove"
    ).addEventListener(
        "click",
        () => {

            row.remove();

        }
    );


    if (!list.querySelector(".dxspider-head")) {

        const head =
            document.createElement("div");

        head.className =
            "dxspider-head";

        head.innerHTML =
            "<span></span><span>Name</span><span>Host</span>" +
            "<span>Port</span><span>Password</span><span></span>";

        list.appendChild(head);

    }


    list.appendChild(
        row
    );

    row.querySelector(".dxspider-name")?.focus();

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
        )
        /*
            Ignore empty rows (added but never filled in).
        */
        .filter(
            spider => spider.host !== ""
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
            collectDXSpiders(),

        uploads: {

            accounts:
                collectUploadAccounts(),

            /* empty = keep the saved key */
            clublogApiKey:
                document.getElementById("upload-clublog-apikey")
                    ?.value.trim() ?? ""

        },

        wsjtx: {

            enabled:
                document.getElementById("wsjtx-enabled")
                    ?.checked ?? false,

            port:
                Number(
                    document.getElementById("wsjtx-port")?.value
                ) || 2237,

            multicastGroup:
                document.getElementById("wsjtx-multicast")
                    ?.value.trim() ?? ""

        },

        modules: {

            rbn:
                document.getElementById("module-rbn")
                    ?.checked ?? true,

            sdr:
                document.getElementById("module-sdr")
                    ?.checked ?? false

        }

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


        applyUploadSettings(
            settingsData.uploads
        );

        setTimeout(loadWsjtxStatus, 800);


        /*
            Let the sidebar update (optional modules).
        */

        window.dispatchEvent(
            new CustomEvent(
                "settingsSaved",
                { detail: settingsData }
            )
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

let settingsModalInitialized = false;

function initializeSettingsModal() {

    /*
        Runs from the componentsLoaded event and from the
        fallback below - only initialize once, otherwise
        every button gets two click handlers.
    */
    if (settingsModalInitialized) {
        return;
    }

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


    settingsModalInitialized = true;


    initUploadSettings();


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



/*
    =====================================================
    Log uploads: one logbook account per callsign
    (QRZ.com now, later Club Log and LoTW).
    Keys are never sent to the browser: an empty key
    field means "keep the saved key".
    =====================================================
*/

function uploadAccountRow(account) {

    const row =
        document.createElement("div");

    row.className =
        "upload-account";

    row.dataset.accountId =
        account.id || "";

    const qrz =
        account.qrz || {};

    const clublog =
        account.clublog || {};

    const clublogPlaceholder =
        clublog.passwordSet
            ? "•••••••• saved"
            : "Club Log app password";

    const placeholder =
        qrz.apiKeyFromEnv
            ? "Key from .env - enter to replace"
            : qrz.apiKeySet
                ? "•••••••• saved - enter to replace"
                : "QRZ Logbook API key";

    row.innerHTML = `
        <div class="upload-account-head">
            <label>Callsign</label>
            <input class="upload-call" type="text" value="${escapeHtml(account.callsign || "")}" placeholder="HB9XXX">
            <label title="Other callsigns for this logbook, e.g. A61/HB9ISO. /P, /M, /QRP match automatically.">Also for</label>
            <input class="upload-aliases" type="text" value="${escapeHtml((account.aliases || []).join(", "))}" placeholder="e.g. A61/HB9ISO  (/P, /M match automatically)">
            <button type="button" class="dxspider-remove upload-account-remove" title="Remove account">×</button>
        </div>
        <div class="upload-service-row">
            <label class="source-switch">
                <input class="upload-qrz-enabled" type="checkbox" ${qrz.enabled ? "checked" : ""}>
                <span>QRZ.com</span>
            </label>
            <label>API key</label>
            <input class="upload-qrz-key" type="password" autocomplete="off" placeholder="${escapeHtml(placeholder)}">
            <button type="button" class="settings-secondary-button upload-qrz-test">Test</button>
        </div>
        <div class="upload-service-row upload-clublog-row">
            <label class="source-switch">
                <input class="upload-clublog-enabled" type="checkbox" ${clublog.enabled ? "checked" : ""}>
                <span>Club Log</span>
            </label>
            <label>E-mail</label>
            <input class="upload-clublog-email" type="text" autocomplete="off" value="${escapeHtml(clublog.email || "")}" placeholder="Club Log login e-mail">
            <label title="Club Log → Settings → App Passwords (not your normal password)">App password</label>
            <input class="upload-clublog-password" type="password" autocomplete="off" placeholder="${escapeHtml(clublogPlaceholder)}">
            <button type="button" class="settings-secondary-button upload-clublog-test">Test</button>
        </div>
        <div class="upload-service-info upload-account-info"></div>
    `;

    row.querySelector(".upload-call")
        .addEventListener("input", event => {
            event.target.value = event.target.value.toUpperCase();
        });

    row.querySelector(".upload-account-remove")
        .addEventListener("click", () => row.remove());

    row.querySelector(".upload-qrz-test")
        .addEventListener("click", () => testUploadAccount(row, "qrz"));

    row.querySelector(".upload-clublog-test")
        .addEventListener("click", () => testUploadAccount(row, "clublog"));

    return row;

}


function applyUploadSettings(uploads) {

    const list =
        document.getElementById("upload-accounts");

    if (!list) {
        return;
    }

    list.innerHTML = "";

    const clublogKey =
        document.getElementById("upload-clublog-apikey");

    if (clublogKey) {
        clublogKey.value = "";
        clublogKey.placeholder =
            uploads?.clublogApiKeySet
                ? "•••••••• saved - enter to replace"
                : "request at clublog.org/requestapikey.php";
    }

    for (const account of uploads?.accounts ?? []) {
        list.appendChild(
            uploadAccountRow(account)
        );
    }

    loadUploadSummary();

}


function collectUploadAccounts() {

    return Array.from(
        document.querySelectorAll("#upload-accounts .upload-account")
    )
        .map(row => ({

            id:
                row.dataset.accountId || undefined,

            callsign:
                row.querySelector(".upload-call").value.trim().toUpperCase(),

            aliases:
                row.querySelector(".upload-aliases").value
                    .split(/[,;\s]+/)
                    .map(item => item.trim().toUpperCase())
                    .filter(Boolean),

            qrz: {

                enabled:
                    row.querySelector(".upload-qrz-enabled").checked,

                /* empty = keep the saved key */
                apiKey:
                    row.querySelector(".upload-qrz-key").value.trim()

            },

            clublog: {

                enabled:
                    row.querySelector(".upload-clublog-enabled").checked,

                email:
                    row.querySelector(".upload-clublog-email").value.trim(),

                /* empty = keep the saved password */
                password:
                    row.querySelector(".upload-clublog-password").value.trim()

            }

        }))
        .filter(account => account.callsign);

}


async function testUploadAccount(row, service) {

    const info =
        row.querySelector(".upload-account-info");

    const button =
        row.querySelector(`.upload-${service}-test`);

    const callsign =
        row.querySelector(".upload-call").value.trim().toUpperCase();

    const body = {
        accountId: row.dataset.accountId || "",
        callsign
    };

    if (service === "qrz") {

        const key =
            row.querySelector(".upload-qrz-key").value.trim();

        if (key) body.apiKey = key;

    }
    else {

        const email =
            row.querySelector(".upload-clublog-email").value.trim();

        const password =
            row.querySelector(".upload-clublog-password").value.trim();

        const apiKey =
            document.getElementById("upload-clublog-apikey")?.value.trim() ?? "";

        if (email) body.email = email;
        if (password) body.password = password;
        if (apiKey) body.apiKey = apiKey;

    }

    const label =
        service === "qrz" ? "QRZ.com" : "Club Log";

    button.disabled = true;
    info.textContent = `Testing ${label}...`;

    try {

        const response =
            await fetch(
                `/api/uploads/test/${service}`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(body)
                }
            );

        const result =
            await response.json();

        info.innerHTML =
            `<span class="${result.ok ? "ok" : "err"}">` +
            `${result.ok ? "✔" : "✖"} ${label}: ${escapeHtml(result.message || "")}` +
            `</span>`;

    }
    catch (error) {

        info.innerHTML =
            `<span class="err">✖ ${escapeHtml(error.message)}</span>`;

    }
    finally {

        button.disabled = false;

    }

}


async function loadUploadSummary() {

    const info =
        document.getElementById("upload-summary");

    if (!info) {
        return;
    }

    try {

        const response =
            await fetch(
                "/api/uploads/summary",
                { cache: "no-store" }
            );

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const summary =
            await response.json();

        const lines =
            Object.values(summary)
                .filter(item => item.done || item.pending || item.failed)
                .map(item =>
                    `${escapeHtml(item.label)}: ${item.done} uploaded · ${item.pending} pending` +
                    (item.failed ? ` · <span class="err">${item.failed} failed</span>` : "")
                );

        const anyFailed =
            Object.values(summary).some(item => item.failed);

        info.innerHTML =
            lines.join("<br>") +
            (
                anyFailed
                    ? `<button type="button" class="settings-secondary-button" id="upload-retry">Retry failed</button>`
                    : ""
            );

        document
            .getElementById("upload-retry")
            ?.addEventListener(
                "click",
                async () => {

                    await fetch(
                        "/api/uploads/retry",
                        {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({})
                        }
                    );

                    loadUploadSummary();

                }
            );

    }
    catch (error) {

        info.textContent = "";

    }

}


function initUploadSettings() {

    document
        .getElementById("upload-account-add")
        ?.addEventListener(
            "click",
            () => {

                const list =
                    document.getElementById("upload-accounts");

                if (!list) {
                    return;
                }

                const row =
                    uploadAccountRow({
                        callsign: "",
                        aliases: [],
                        qrz: { enabled: true }
                    });

                list.appendChild(row);

                row.querySelector(".upload-call").focus();

            }
        );

}



/*
    =====================================================
    WSJT-X / JTDX
    =====================================================
*/

function applyWsjtxSettings(wsjtx) {

    const enabled =
        document.getElementById("wsjtx-enabled");

    const port =
        document.getElementById("wsjtx-port");

    const multicast =
        document.getElementById("wsjtx-multicast");

    if (enabled) enabled.checked = wsjtx?.enabled === true;
    if (port) port.value = wsjtx?.port ?? 2237;
    if (multicast) multicast.value = wsjtx?.multicastGroup ?? "";

    const address =
        document.getElementById("wsjtx-server-address");

    /* LAN IP of the server (not the browser's hostname, e.g. Cloudflare) */
    if (address) {
        fetch("/api/system-status", { cache: "no-store" })
            .then(response => response.ok ? response.json() : null)
            .then(data => {
                if (data?.ip) {
                    address.textContent = data.ip;
                }
            })
            .catch(() => {});
    }

    loadWsjtxStatus();

}


async function loadWsjtxStatus() {

    const info =
        document.getElementById("wsjtx-status");

    if (!info) {
        return;
    }

    try {

        const response =
            await fetch("/api/wsjtx/status", { cache: "no-store" });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const status =
            await response.json();

        if (!status.enabled) {
            info.textContent = "Off";
            return;
        }

        if (!status.listening) {
            info.innerHTML =
                `<span class="err">✖ UDP ${status.port} not open` +
                `${status.error ? ": " + escapeHtml(status.error) : ""}</span>`;
            return;
        }

        const clients =
            (status.clients || [])
                .map(client => {
                    const ago = Math.round((Date.now() - client.lastSeen) / 1000);
                    const freq = client.dialFrequency
                        ? ` · ${(client.dialFrequency / 1e6).toFixed(3)} MHz ${escapeHtml(client.mode || "")}`
                        : "";
                    return `${escapeHtml(client.id)} ${escapeHtml(client.version || "")} (${escapeHtml(client.address)}, ${ago}s ago)${freq}`;
                });

        info.innerHTML =
            `<span class="ok">✔ Listening on UDP ${status.port}` +
            `${status.multicastGroup ? " · multicast " + escapeHtml(status.multicastGroup) : ""}</span>` +
            (clients.length
                ? `<br>${clients.join("<br>")}`
                : " · no WSJT-X seen yet") +
            (status.lastQso
                ? `<br>Last QSO: ${escapeHtml(status.lastQso.call)} - ${escapeHtml(status.lastQso.result)}` +
                  ` (${escapeHtml(status.lastQso.at.slice(11, 16))} UTC) · ${status.loggedCount} logged since start`
                : "");

    }
    catch (error) {

        info.textContent = "";

    }

}
