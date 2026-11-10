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

        applyRotatorSettings(
            settingsData.rotator
        );

        const autoSplitBox = document.getElementById("auto-split");
        if (autoSplitBox) autoSplitBox.checked = settingsData.autoSplit !== false;

        applyBackupSettings(
            settingsData.backup
        );

        applyNotificationSettings(
            settingsData.notifications
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

        rotator:
            collectRotatorSettings(),

        autoSplit:
            document.getElementById("auto-split")?.checked !== false,

        backup:
            collectBackupSettings(),

        notifications:
            collectNotificationSettings(),

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
        setTimeout(loadRotatorStatus, 2500);

        afterBackupSaved();

        afterNotificationsSaved();


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

    initRotatorSettings();

    initBackupSettings();

    initNotificationSettings();

    initSoftwareUpdate();


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

    const lotw =
        account.lotw || {};

    const lotwPlaceholder =
        lotw.passwordSet
            ? "•••••••• saved"
            : "LoTW website password";

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
        <div class="upload-service-row upload-lotw-row">
            <label class="source-switch" title="Upload new QSOs to LoTW (needs the certificate below)">
                <input class="upload-lotw-enabled" type="checkbox" ${lotw.enabled ? "checked" : ""}>
                <span>LoTW</span>
            </label>
            <label title="LoTW website login - used to fetch confirmations">Login</label>
            <input class="upload-lotw-username" type="text" autocomplete="off" value="${escapeHtml(lotw.username || "")}" placeholder="LoTW website user (callsign)">
            <label>Password</label>
            <input class="upload-lotw-password" type="password" autocomplete="new-password" placeholder="${escapeHtml(lotwPlaceholder)}">
            <button type="button" class="settings-secondary-button upload-lotw-test">Test</button>
        </div>
        <div class="upload-lotw-cert">
            <span class="lotw-cert-info">${account.id ? "Certificate: loading…" : "Save the account first, then add the LoTW certificate."}</span>
            <label class="settings-secondary-button file-button" ${account.id ? "" : "hidden"}>
                Add certificate (.p12)
                <input class="lotw-cert-file" type="file" accept=".p12,.pfx,application/x-pkcs12">
            </label>
            <input class="lotw-cert-pass" type="password" autocomplete="new-password" data-lpignore="true" data-1p-ignore placeholder="certificate password (if any)" ${account.id ? "" : "hidden"}>
            <button type="button" class="settings-secondary-button lotw-cert-remove" hidden>Remove certificate</button>
            <button type="button" class="settings-secondary-button lotw-upload-existing" hidden title="Queue all QSOs of this callsign that are not yet in LoTW">Upload existing QSOs</button>
            <button type="button" class="settings-secondary-button lotw-download" hidden title="Fetch new LoTW confirmations now (also automatic every 6 hours)">Fetch confirmations</button>
            <span title="Station location zones for LoTW - empty = from the DXCC entity">CQ <input class="lotw-cq" type="number" min="1" max="40" value="${lotw.cqZone ?? ""}"> ITU <input class="lotw-itu" type="number" min="1" max="90" value="${lotw.ituZone ?? ""}"></span>
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

    row.querySelector(".upload-lotw-test")
        .addEventListener("click", () => testUploadAccount(row, "lotw"));

    setupLotwCert(row);

    return row;

}


function applyUploadSettings(uploads) {

    // fresh LoTW certificate / confirmation status for the rows
    lotwStatusCache = null;

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

            },

            lotw: {

                enabled:
                    row.querySelector(".upload-lotw-enabled").checked,

                username:
                    row.querySelector(".upload-lotw-username").value.trim(),

                /* empty = keep the saved password */
                password:
                    row.querySelector(".upload-lotw-password").value.trim(),

                cqZone:
                    Number(row.querySelector(".lotw-cq").value) || null,

                ituZone:
                    Number(row.querySelector(".lotw-itu").value) || null

            }

        }))
        .filter(account => account.callsign);

}


/*
    LoTW certificate per account: upload .p12, show the data,
    remove, queue existing QSOs, fetch confirmations
*/

let lotwStatusCache = null;

async function lotwStatus(force) {

    if (!lotwStatusCache || force) {
        lotwStatusCache = fetch("/api/lotw/status", { cache: "no-store" })
            .then(response => response.ok ? response.json() : null)
            .catch(() => null);
    }

    return lotwStatusCache;

}

function lotwInfoHtml(cert, download) {

    if (!cert) {
        return "No LoTW certificate yet.";
    }

    const expired = new Date(cert.validTo) < new Date();
    const soon = !expired && new Date(cert.validTo) - Date.now() < 60 * 86400000;

    let html =
        `Certificate <b>${escapeHtml(cert.callsign)}</b> · DXCC ${escapeHtml(String(cert.dxcc))}` +
        ` · QSOs ${escapeHtml(cert.qsoFirstDate || "?")} – ${escapeHtml(cert.qsoEndDate || "?")}` +
        ` · <span class="${expired || soon ? "err" : ""}">valid until ${escapeHtml(cert.validTo.slice(0, 10))}${expired ? " (EXPIRED)" : soon ? " (renew soon)" : ""}</span>`;

    if (download) {
        html += `<br>Confirmations: ${download.running ? "fetching…" : `<span class="${download.ok ? "" : "err"}">${escapeHtml(download.message || "")}</span>`}` +
            (download.lastRun ? ` (${escapeHtml(new Date(download.lastRun).toLocaleString())})` : "");
    }

    return html;

}

async function refreshLotwCert(row, force) {

    const id = row.dataset.accountId;

    if (!id) return;

    const status = await lotwStatus(force);
    const entry = status?.accounts?.find(item => item.id === id);
    const cert = entry?.certificate || null;

    row.querySelector(".lotw-cert-info").innerHTML = lotwInfoHtml(cert, entry?.download);
    row.querySelector(".lotw-cert-remove").hidden = !cert;
    row.querySelector(".lotw-upload-existing").hidden = !cert;
    row.querySelector(".lotw-download").hidden = !row.querySelector(".upload-lotw-username").value.trim();

}

async function lotwPost(url, body, method = "POST") {

    const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: method === "DELETE" ? undefined : JSON.stringify(body || {})
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);

    return data;

}

function setupLotwCert(row) {

    const info = row.querySelector(".upload-account-info");
    const id = () => row.dataset.accountId;

    const show = (ok, text) => {
        info.innerHTML = `<span class="${ok ? "ok" : "err"}">${ok ? "✔" : "✖"} LoTW: ${escapeHtml(text)}</span>`;
    };

    row.querySelector(".lotw-cert-file").addEventListener("change", async event => {

        const file = event.target.files?.[0];
        event.target.value = "";

        if (!file || !id()) return;

        info.textContent = "LoTW: reading certificate…";

        try {
            const buffer = new Uint8Array(await file.arrayBuffer());
            let binary = "";
            for (let i = 0; i < buffer.length; i++) binary += String.fromCharCode(buffer[i]);
            const data = await lotwPost("/api/lotw/certificate", {
                accountId: id(),
                p12: btoa(binary),
                password: row.querySelector(".lotw-cert-pass").value
            });
            row.querySelector(".lotw-cert-pass").value = "";
            show(true, `certificate ${data.certificate.callsign} added${data.warning ? " - " + data.warning : ""}. Tick "LoTW" and save to upload new QSOs.`);
            await refreshLotwCert(row, true);
        }
        catch (error) {
            show(false, error.message);
        }

    });

    row.querySelector(".lotw-cert-remove").addEventListener("click", async () => {

        if (!confirm("Remove the LoTW certificate of this account from SHACK-SERVER?")) return;

        try {
            await lotwPost(`/api/lotw/certificate/${encodeURIComponent(id())}`, null, "DELETE");
            show(true, "certificate removed");
            await refreshLotwCert(row, true);
        }
        catch (error) {
            show(false, error.message);
        }

    });

    row.querySelector(".lotw-upload-existing").addEventListener("click", async () => {

        const enabled = row.querySelector(".upload-lotw-enabled");

        if (!enabled.checked) {
            show(false, 'tick "LoTW" first - new QSOs are then uploaded automatically too');
            return;
        }

        if (!confirm("Upload all QSOs of this callsign (inside the certificate period) that are not yet in LoTW? LoTW ignores duplicates.")) return;

        try {
            const data = await lotwPost("/api/lotw/upload-existing", { accountId: id(), enable: true });
            show(true, data.queued ? `${data.queued} QSOs queued - uploaded in the background` : "nothing to upload - all QSOs are queued or uploaded already");
        }
        catch (error) {
            show(false, error.message);
        }

    });

    row.querySelector(".lotw-download").addEventListener("click", async event => {

        const button = event.target;
        button.disabled = true;
        info.textContent = "LoTW: fetching confirmations (can take a minute)…";

        try {
            const data = await lotwPost("/api/lotw/download", { accountId: id() });
            show(data.success, data.message);
        }
        catch (error) {
            show(false, error.message);
        }
        finally {
            button.disabled = false;
            await refreshLotwCert(row, true);
        }

    });

    void refreshLotwCert(row, false);

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
    else if (service === "lotw") {

        const username =
            row.querySelector(".upload-lotw-username").value.trim();

        const password =
            row.querySelector(".upload-lotw-password").value.trim();

        if (username) body.username = username;
        if (password) body.password = password;

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
        service === "qrz" ? "QRZ.com" : service === "lotw" ? "LoTW" : "Club Log";

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



/*
    =====================================================
    Rotator (Hamlib rotctld)
    =====================================================
*/

let rotatorModels = [];
let rotatorPorts = [];
let rotatorWanted = null;

function rotatorConnection() {

    return document.querySelector('input[name="rotator-connection"]:checked')?.value || "serial";

}

function updateRotatorForm() {

    document
        .querySelector(".rotator-form")
        ?.classList.toggle("connection-network", rotatorConnection() === "network");

}

function fillRotatorManufacturers(selectedModel) {

    const mfgSelect = document.getElementById("rotator-mfg");

    if (!mfgSelect) return;

    const manufacturers =
        [...new Set(rotatorModels.map(model => model.mfg))].sort((a, b) => a.localeCompare(b));

    const current =
        rotatorModels.find(model => model.id === Number(selectedModel))?.mfg || "";

    mfgSelect.innerHTML =
        `<option value="">- choose -</option>` +
        manufacturers
            .map(mfg => `<option ${mfg === current ? "selected" : ""}>${escapeHtml(mfg)}</option>`)
            .join("");

    fillRotatorModels(selectedModel);

}

function fillRotatorModels(selectedModel) {

    const mfg = document.getElementById("rotator-mfg")?.value || "";
    const modelSelect = document.getElementById("rotator-model");

    if (!modelSelect) return;

    const models = rotatorModels.filter(model => model.mfg === mfg);

    modelSelect.innerHTML =
        (models.length ? "" : `<option value="">- choose manufacturer -</option>`) +
        models
            .map(model =>
                `<option value="${model.id}" ${model.id === Number(selectedModel) ? "selected" : ""}>` +
                `${escapeHtml(model.model)}${model.status && model.status !== "Stable" ? ` (${escapeHtml(model.status)})` : ""}` +
                `</option>`
            )
            .join("");

}

function fillRotatorPorts(selectedDevice) {

    const select = document.getElementById("rotator-device");

    if (!select) return;

    const options = rotatorPorts.map(port =>
        `<option value="${escapeHtml(port.path)}" ${port.path === selectedDevice ? "selected" : ""}>` +
        `${escapeHtml(port.label || port.path)}${port.inUseBy ? ` - used by ${escapeHtml(port.inUseBy)}` : ""}` +
        `</option>`
    );

    if (selectedDevice && !rotatorPorts.some(port => port.path === selectedDevice)) {
        options.unshift(`<option value="${escapeHtml(selectedDevice)}" selected>${escapeHtml(selectedDevice)} (not connected)</option>`);
    }

    select.innerHTML =
        options.length
            ? `<option value="">- choose -</option>` + options.join("")
            : `<option value="">No serial port found</option>`;

}

async function loadRotatorLists(rotator) {

    try {

        const [modelsResponse, portsResponse] = await Promise.all([
            fetch("/api/rotator/models", { cache: "no-store" }),
            fetch("/api/radios/ports", { cache: "no-store" })
        ]);

        const models = modelsResponse.ok ? await modelsResponse.json() : null;
        const ports = portsResponse.ok ? await portsResponse.json() : [];

        rotatorModels = Array.isArray(models?.models) ? models.models : [];
        rotatorPorts = Array.isArray(ports) ? ports : (Array.isArray(ports?.data) ? ports.data : []);

        if (models && !models.installed) {
            showRotatorStatus("err", models.error || "Hamlib is not installed");
        }

    }
    catch (error) {

        rotatorModels = [];
        rotatorPorts = [];

    }

    fillRotatorManufacturers(rotator?.model);
    fillRotatorPorts(rotator?.device || "");

}

function showRotatorStatus(kind, text) {

    const info = document.getElementById("rotator-status");

    if (info) {
        info.innerHTML = kind
            ? `<span class="${kind}">${kind === "ok" ? "✔" : "✖"} ${escapeHtml(text)}</span>`
            : escapeHtml(text);
    }

}

async function loadRotatorStatus() {

    try {

        const response = await fetch("/api/rotator/status", { cache: "no-store" });

        if (!response.ok) return;

        const status = await response.json();

        if (!status.enabled) {
            showRotatorStatus("", "Off");
        }
        else if (status.connected) {
            showRotatorStatus("ok", `Connected - antenna at ${status.azimuth ?? "?"}°`);
        }
        else {
            showRotatorStatus("err", status.error || "Not connected");
        }

    }
    catch (error) {
        // ignore
    }

}

function applyRotatorSettings(rotator) {

    rotatorWanted = rotator || {};

    const enabled = document.getElementById("rotator-enabled");
    const host = document.getElementById("rotator-host");
    const port = document.getElementById("rotator-port");
    const baud = document.getElementById("rotator-baud");

    if (enabled) enabled.checked = rotatorWanted.enabled === true;
    if (host) host.value = rotatorWanted.host || "127.0.0.1";
    if (port) port.value = rotatorWanted.port || 4533;
    if (baud) baud.value = String(rotatorWanted.baudRate || 0);

    const radio = document.querySelector(
        `input[name="rotator-connection"][value="${rotatorWanted.connection === "network" ? "network" : "serial"}"]`
    );

    if (radio) radio.checked = true;

    updateRotatorForm();
    void loadRotatorLists(rotatorWanted);
    void loadRotatorStatus();

}

function collectRotatorSettings() {

    return {

        enabled:
            document.getElementById("rotator-enabled")?.checked ?? false,

        connection:
            rotatorConnection(),

        model:
            Number(document.getElementById("rotator-model")?.value) || 0,

        device:
            document.getElementById("rotator-device")?.value || "",

        baudRate:
            Number(document.getElementById("rotator-baud")?.value) || 0,

        host:
            document.getElementById("rotator-host")?.value.trim() || "127.0.0.1",

        port:
            Number(document.getElementById("rotator-port")?.value) || 4533

    };

}

function initRotatorSettings() {

    document
        .querySelectorAll('input[name="rotator-connection"]')
        .forEach(input => input.addEventListener("change", updateRotatorForm));

    document
        .getElementById("rotator-mfg")
        ?.addEventListener("change", () => fillRotatorModels(0));

    document
        .getElementById("rotator-ports-refresh")
        ?.addEventListener("click", () => {
            const device = document.getElementById("rotator-device")?.value || "";
            void loadRotatorLists({ ...collectRotatorSettings(), device });
        });

    document
        .getElementById("rotator-test")
        ?.addEventListener("click", async event => {

            const button = event.currentTarget;

            button.disabled = true;
            showRotatorStatus("", "Testing...");

            try {

                const response =
                    await fetch("/api/rotator/test", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(collectRotatorSettings())
                    });

                const result = await response.json();

                showRotatorStatus(result.ok ? "ok" : "err", result.message || result.error || "");

            }
            catch (error) {

                showRotatorStatus("err", error.message);

            }
            finally {

                button.disabled = false;

            }

        });

}



/* =========================================================
   BACKUP (Dropbox / rclone, NAS via SMB)
   ========================================================= */

function backupValue(id) {
    return document.getElementById(id)?.value.trim() ?? "";
}

function backupChecked(id) {
    return document.getElementById(id)?.checked === true;
}

function applyBackupSettings(backup) {

    const b = backup || {};
    const set = (id, value) => { const el = document.getElementById(id); if (el) el.value = value ?? ""; };
    const check = (id, value) => { const el = document.getElementById(id); if (el) el.checked = value === true; };

    check("backup-enabled", b.enabled);
    set("backup-time", b.time || "03:15");
    set("backup-keep", b.keep || 14);

    check("backup-rclone-enabled", b.rclone?.enabled);
    set("backup-rclone-remote", b.rclone?.remote || "");

    check("backup-smb-enabled", b.smb?.enabled);
    set("backup-smb-host", b.smb?.host);
    set("backup-smb-share", b.smb?.share);
    set("backup-smb-path", b.smb?.path);
    set("backup-smb-user", b.smb?.user);
    set("backup-smb-domain", b.smb?.domain);
    set("backup-smb-password", "");

    const password = document.getElementById("backup-smb-password");
    if (password) {
        password.placeholder = b.smb?.passwordSet ? "saved - leave empty to keep" : "";
    }

    void loadBackupStatus();

}

function collectBackupSettings() {

    return {
        enabled: backupChecked("backup-enabled"),
        time: backupValue("backup-time") || "03:15",
        keep: Number(backupValue("backup-keep")) || 14,
        rclone: {
            enabled: backupChecked("backup-rclone-enabled"),
            remote: backupValue("backup-rclone-remote")
        },
        smb: {
            enabled: backupChecked("backup-smb-enabled"),
            host: backupValue("backup-smb-host"),
            share: backupValue("backup-smb-share"),
            path: backupValue("backup-smb-path"),
            user: backupValue("backup-smb-user"),
            password: document.getElementById("backup-smb-password")?.value ?? "",
            domain: backupValue("backup-smb-domain")
        }
    };

}

/* After saving: the password is on the Pi now, the field is emptied */
function afterBackupSaved() {

    const password = document.getElementById("backup-smb-password");

    if (password && password.value) {
        password.value = "";
        password.placeholder = "saved - leave empty to keep";
    }

}

function showBackupStatus(html) {

    const info = document.getElementById("backup-status");

    if (info) info.innerHTML = html;

}

function formatBackupStatus(status) {

    if (status?.running) {
        return "Backup running...";
    }

    const last = status?.lastRun;

    if (!last) {
        return "No backup yet.";
    }

    const when = new Date(last.at).toLocaleString("de-CH", { dateStyle: "short", timeStyle: "short" });
    const size = last.size ? ` (${Math.max(1, Math.round(last.size / 1024))} KB)` : "";

    const head = last.ok
        ? `<span class="ok">✔ Last backup ${escapeHtml(when)}${escapeHtml(size)}</span>`
        : `<span class="err">✖ Last backup ${escapeHtml(when)} failed</span>`;

    const targets = (last.targets || []).map(target =>
        `<span class="target ${target.ok ? "ok" : "err"}">${target.ok ? "✔" : "✖"} ${escapeHtml(target.name)}: ${escapeHtml(target.message)}</span>`
    ).join("");

    const note = !last.targets?.length && last.message ? `<span class="target">${escapeHtml(last.message)}</span>` : "";

    const success = !last.ok && status.lastSuccess
        ? `<span class="target">Last successful backup: ${escapeHtml(new Date(status.lastSuccess).toLocaleString("de-CH", { dateStyle: "short", timeStyle: "short" }))}</span>`
        : "";

    return head + targets + note + success;

}

async function loadBackupStatus() {

    try {
        const response = await fetch("/api/backup/status", { cache: "no-store" });
        if (response.ok) showBackupStatus(formatBackupStatus(await response.json()));
    }
    catch {
        // server not reachable
    }

}

async function testBackupTarget(target, button) {

    button.disabled = true;
    showBackupStatus("Testing...");

    try {

        const response = await fetch("/api/backup/test", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ target, backup: collectBackupSettings() })
        });

        const result = await response.json();
        const name = target === "smb" ? "NAS" : "Dropbox / rclone";

        showBackupStatus(
            `<span class="${result.ok ? "ok" : "err"}">${result.ok ? "✔" : "✖"} ${escapeHtml(name)}: ${escapeHtml(result.message || result.error || "")}</span>`
        );

    }
    catch (error) {
        showBackupStatus(`<span class="err">✖ ${escapeHtml(error.message)}</span>`);
    }
    finally {
        button.disabled = false;
    }

}

function initBackupSettings() {

    document.getElementById("backup-rclone-test")
        ?.addEventListener("click", event => testBackupTarget("rclone", event.currentTarget));

    document.getElementById("backup-smb-test")
        ?.addEventListener("click", event => testBackupTarget("smb", event.currentTarget));

    document.getElementById("backup-run")
        ?.addEventListener("click", async event => {

            const button = event.currentTarget;

            button.disabled = true;
            showBackupStatus("Backup running...");

            try {
                const response = await fetch("/api/backup/run", { method: "POST" });
                const result = await response.json();
                showBackupStatus(response.ok ? formatBackupStatus(result) : `<span class="err">✖ ${escapeHtml(result.error || response.status)}</span>`);
            }
            catch (error) {
                showBackupStatus(`<span class="err">✖ ${escapeHtml(error.message)}</span>`);
            }
            finally {
                button.disabled = false;
            }

        });

}



/* =========================================================
   WATCH LIST NOTIFICATIONS (ntfy)
   ========================================================= */

function applyNotificationSettings(notifications) {

    const n = notifications || {};
    const set = (id, value) => { const el = document.getElementById(id); if (el) el.value = value ?? ""; };
    const check = (id, value) => { const el = document.getElementById(id); if (el) el.checked = value === true; };

    check("notify-enabled", n.enabled);
    set("notify-ntfy-server", n.ntfy?.server || "https://ntfy.sh");
    set("notify-ntfy-topic", n.ntfy?.topic);
    set("notify-ntfy-token", "");
    set("notify-ntfy-priority", n.ntfy?.priority || "high");
    set("notify-cooldown", n.cooldownMinutes || 15);
    check("notify-quiet-enabled", n.quietHours?.enabled);
    set("notify-quiet-from", n.quietHours?.from || "22:00");
    set("notify-quiet-to", n.quietHours?.to || "07:00");
    set("notify-link", n.linkUrl || "");

    const token = document.getElementById("notify-ntfy-token");
    if (token) {
        token.placeholder = n.ntfy?.tokenSet ? "saved - leave empty to keep" : "optional - for protected topics";
    }

    void loadNotificationWatchList();
    void loadNotificationStatus();

    applyNeededSettings(n.needed || {}, n.nearbyRadiusKm);

}

function applyNeededSettings(needed, radiusKm) {

    const check = (id, value) => { const el = document.getElementById(id); if (el) el.checked = value === true; };
    const set = (id, value) => { const el = document.getElementById(id); if (el) el.value = value ?? ""; };

    check("needed-enabled", needed.enabled);
    check("needed-new-country", needed.newCountry !== false);
    check("needed-new-band-country", needed.newBandCountry !== false);
    check("needed-new-band", needed.newBand);
    check("needed-new-mode", needed.newMode);
    check("needed-only-nearby", needed.onlyNearby);
    set("needed-min-score", needed.minScore ?? 0);
    set("needed-radius", radiusKm || 1000);
    set("needed-cooldown", needed.cooldownMinutes || 60);
    check("needed-pskreporter", settingsData?.notifications?.pskReporter === true);

    void loadPskReporterStatus();

    const bands = (needed.bands || []).map(b => String(b).toLowerCase());
    const modes = needed.modes || [];

    document.querySelectorAll("[data-needed-band]").forEach(box => {
        box.checked = bands.includes(box.dataset.neededBand.toLowerCase());
    });

    document.querySelectorAll("[data-needed-mode]").forEach(box => {
        box.checked = modes.includes(box.dataset.neededMode);
    });

}

async function loadPskReporterStatus() {

    const info = document.getElementById("needed-pskreporter-status");

    if (!info) return;

    try {

        const response = await fetch("/api/needed/pskreporter", { cache: "no-store" });

        if (!response.ok) { info.textContent = ""; return; }

        const s = await response.json();

        info.innerHTML = !s.enabled
            ? "Receivers near your QTH report which stations they decode (MQTT, mqtt.pskreporter.info). RBN covers CW / RTTY."
            : s.connected
                ? `<span class="ok">✔ connected - ${escapeHtml(s.squares)} grid squares, ${escapeHtml(s.reportsPerMinute)} reports / min</span>`
                : `<span class="err">✖ not connected${s.error ? " - " + escapeHtml(s.error) : ""}</span>`;

    }
    catch {
        info.textContent = "";
    }

}

function collectNeededSettings() {

    return {
        enabled: backupChecked("needed-enabled"),
        newCountry: backupChecked("needed-new-country"),
        newBandCountry: backupChecked("needed-new-band-country"),
        newBand: backupChecked("needed-new-band"),
        newMode: backupChecked("needed-new-mode"),
        bands: [...document.querySelectorAll("[data-needed-band]:checked")].map(box => box.dataset.neededBand),
        modes: [...document.querySelectorAll("[data-needed-mode]:checked")].map(box => box.dataset.neededMode),
        minScore: Number(backupValue("needed-min-score")) || 0,
        onlyNearby: backupChecked("needed-only-nearby"),
        cooldownMinutes: Number(backupValue("needed-cooldown")) || 60
    };

}

function collectNotificationSettings() {

    return {
        enabled: backupChecked("notify-enabled"),
        cooldownMinutes: Number(backupValue("notify-cooldown")) || 15,
        quietHours: {
            enabled: backupChecked("notify-quiet-enabled"),
            from: backupValue("notify-quiet-from") || "22:00",
            to: backupValue("notify-quiet-to") || "07:00"
        },
        linkUrl: backupValue("notify-link"),
        nearbyRadiusKm: Number(backupValue("needed-radius")) || 1000,
        needed: collectNeededSettings(),
        pskReporter: backupChecked("needed-pskreporter"),
        ntfy: {
            enabled: true,
            server: backupValue("notify-ntfy-server") || "https://ntfy.sh",
            topic: backupValue("notify-ntfy-topic"),
            token: document.getElementById("notify-ntfy-token")?.value.trim() ?? "",
            priority: backupValue("notify-ntfy-priority") || "high"
        }
    };

}

function afterNotificationsSaved() {

    setTimeout(loadPskReporterStatus, 4000);

    const token = document.getElementById("notify-ntfy-token");

    if (token && token.value) {
        token.value = "";
        token.placeholder = "saved - leave empty to keep";
    }

}

async function loadNotificationWatchList() {

    const box = document.getElementById("notify-watchlist");

    if (!box) return;

    try {

        const response = await fetch("/api/watchlist", { cache: "no-store" });
        const entries = response.ok ? await response.json() : [];

        if (!entries.length) {
            box.innerHTML = `<span class="empty">The watch list is empty - add callsigns in the dashboard (ADD TO WATCH).</span>`;
            return;
        }

        box.innerHTML = entries.map(entry =>
            `<label title="Push notification for ${escapeHtml(entry.callsign)} (applies immediately)">
                <input type="checkbox" data-notify-call="${escapeHtml(entry.callsign)}" ${entry.push !== 0 ? "checked" : ""}>
                ${escapeHtml(entry.callsign)}
            </label>`
        ).join("");

    }
    catch {
        box.innerHTML = `<span class="empty">Watch list not available.</span>`;
    }

}

function showNotificationStatus(html) {

    const info = document.getElementById("notify-status");

    if (info) info.innerHTML = html;

}

function formatTime(at) {

    return new Date(at).toLocaleString("de-CH", { dateStyle: "short", timeStyle: "short" });

}

async function loadNotificationStatus() {

    try {

        const response = await fetch("/api/watchlist/notifications/status", { cache: "no-store" });

        if (!response.ok) return;

        const status = await response.json();
        const lines = [];

        if (status.lastPush) {
            lines.push(status.lastPush.ok
                ? `<span class="target ok">✔ Last push ${escapeHtml(formatTime(status.lastPush.at))}</span>`
                : `<span class="target err">✖ Last push ${escapeHtml(formatTime(status.lastPush.at))}: ${escapeHtml(status.lastPush.message)}</span>`);
        }

        for (const hit of (status.recent || []).slice(0, 5)) {
            lines.push(
                `<span class="target">${escapeHtml(formatTime(hit.at))} ${escapeHtml(hit.callsign)} ` +
                `${escapeHtml((Number(hit.frequency) / 1000).toFixed(3))} MHz ${escapeHtml(hit.mode || "")} - ${escapeHtml(hit.result)}</span>`
            );
        }

        showNotificationStatus(lines.join("") || "No watch list detections since the server start.");

    }
    catch {
        // server not reachable
    }

}

function initNotificationSettings() {

    document.getElementById("notify-watchlist")
        ?.addEventListener("change", async event => {

            const box = event.target.closest("[data-notify-call]");

            if (!box) return;

            const call = box.dataset.notifyCall;

            try {
                await fetch(`/api/watchlist/${encodeURIComponent(call)}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ push: box.checked })
                });
                window.shackWatchList?.reload();
            }
            catch {
                box.checked = !box.checked;
            }

        });

    window.addEventListener("watchlistChanged", () => {
        void loadNotificationWatchList();
    });

    document.getElementById("notify-ntfy-generate")
        ?.addEventListener("click", () => {

            const input = document.getElementById("notify-ntfy-topic");
            const call = (settingsData?.callsign || "shack").toLowerCase().replace(/[^a-z0-9]/g, "");
            const random = Array.from(crypto.getRandomValues(new Uint8Array(6)))
                .map(b => "abcdefghijkmnpqrstuvwxyz23456789"[b % 32]).join("");

            if (input) input.value = `${call}-shack-${random}`;

        });

    document.getElementById("notify-test")
        ?.addEventListener("click", async event => {

            const button = event.currentTarget;

            button.disabled = true;
            showNotificationStatus("Sending...");

            try {

                const response = await fetch("/api/watchlist/notifications/test", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ notifications: collectNotificationSettings() })
                });

                const result = await response.json();

                showNotificationStatus(result.ok
                    ? `<span class="ok">✔ Test notification sent - check your phone</span>`
                    : `<span class="err">✖ ${escapeHtml(result.message || result.error || "failed")}</span>`);

            }
            catch (error) {
                showNotificationStatus(`<span class="err">✖ ${escapeHtml(error.message)}</span>`);
            }
            finally {
                button.disabled = false;
            }

        });

}



/* =========================================================
   SOFTWARE UPDATE (scripts/install.sh --update)
   ========================================================= */

let updatePollTimer = null;
let updateWasRunning = false;

function formatCommitDate(iso) {

    const date = new Date(iso);

    return Number.isNaN(date.getTime())
        ? ""
        : date.toLocaleDateString("de-CH", { day: "2-digit", month: "2-digit", year: "numeric" });

}

function renderUpdateStatus(status) {

    const current = document.getElementById("update-current");
    const run = document.getElementById("update-run");
    const hint = document.getElementById("update-hint");
    const list = document.getElementById("update-commits");
    const log = document.getElementById("update-log");

    if (!current || !run || !hint || !list || !log) return;

    if (!status.available) {
        current.textContent = status.reason || "Update not available.";
        run.disabled = true;
        document.getElementById("update-check").disabled = true;
        return;
    }

    current.innerHTML = status.current
        ? `Installed: <code>${escapeHtml(status.current.hash)}</code> · ${escapeHtml(formatCommitDate(status.current.date))} · ${escapeHtml(status.current.subject)}`
        : "Installed version unknown";

    if (status.running) {
        run.disabled = true;
        hint.innerHTML = `<span class="ok">Updating… SHACK-SERVER restarts at the end (a few minutes).</span>`;
    }
    else if (status.checkError) {
        run.disabled = true;
        hint.innerHTML = `<span class="err">✖ ${escapeHtml(status.checkError)}</span>`;
    }
    else if (status.lastCheck === null) {
        run.disabled = true;
        hint.textContent = "";
    }
    else if (status.behind > 0) {
        run.disabled = false;
        hint.innerHTML = `<span class="ok">${status.behind} new change${status.behind === 1 ? "" : "s"} available</span>`;
    }
    else {
        run.disabled = true;
        hint.innerHTML = `<span class="ok">✔ Up to date</span>`;
    }

    if (!status.running && status.lastRun && Date.now() - status.lastRun.at < 24 * 3600_000) {
        hint.innerHTML += ` <span class="${status.lastRun.ok ? "ok" : "err"}">· last update ${escapeHtml(new Date(status.lastRun.at).toLocaleString("de-CH", { dateStyle: "short", timeStyle: "short" }))}: ${escapeHtml(status.lastRun.message)}</span>`;
    }

    list.innerHTML = (status.commits || []).slice(0, 15).map(commit =>
        `<div class="commit"><code>${escapeHtml(commit.hash)}</code><span class="date">${escapeHtml(formatCommitDate(commit.date))}</span>${escapeHtml(commit.subject)}</div>`
    ).join("");

    log.hidden = !(status.running || (status.lastRun && !status.lastRun.ok)) || !status.log;
    log.textContent = status.log || "";
    log.scrollTop = log.scrollHeight;

}

async function loadUpdateStatus() {

    const response = await fetch("/api/system/update", { cache: "no-store" });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const status = await response.json();

    renderUpdateStatus(status);

    return status;

}

/* while the update runs: poll; the server is away during the restart */
function pollUpdate() {

    clearTimeout(updatePollTimer);

    updatePollTimer = setTimeout(async () => {

        try {

            const status = await loadUpdateStatus();

            if (status.running) {
                updateWasRunning = true;
                pollUpdate();
                return;
            }

            if (updateWasRunning && status.lastRun?.ok) {
                const hint = document.getElementById("update-hint");
                if (hint) hint.innerHTML = `<span class="ok">✔ Update installed - reloading the page…</span>`;
                setTimeout(() => location.reload(), 2500);
            }

            updateWasRunning = false;

        }
        catch {

            // restart in progress
            const hint = document.getElementById("update-hint");
            if (hint) hint.innerHTML = `<span class="ok">SHACK-SERVER is restarting…</span>`;
            pollUpdate();

        }

    }, 3000);

}

function initSoftwareUpdate() {

    const check = document.getElementById("update-check");
    const run = document.getElementById("update-run");

    if (!check || !run) return;

    check.addEventListener("click", async () => {

        check.disabled = true;
        const hint = document.getElementById("update-hint");
        if (hint) hint.textContent = "Checking GitHub…";

        try {
            const response = await fetch("/api/system/update/check", { method: "POST" });
            renderUpdateStatus(await response.json());
        }
        catch (error) {
            if (hint) hint.innerHTML = `<span class="err">✖ ${escapeHtml(error.message)}</span>`;
        }
        finally {
            check.disabled = false;
        }

    });

    run.addEventListener("click", async () => {

        if (!confirm("Install the update now?\n\nSHACK-SERVER is updated and restarts - this takes a few minutes. A running QSO / contest log is not affected.")) {
            return;
        }

        run.disabled = true;

        try {
            const response = await fetch("/api/system/update/run", { method: "POST" });
            const result = await response.json();
            if (!response.ok) {
                alert(result.message || result.error || "Update could not be started");
                return;
            }
            updateWasRunning = true;
            pollUpdate();
        }
        catch (error) {
            alert(`Update could not be started: ${error.message}`);
        }

    });

    loadUpdateStatus()
        .then(status => {
            if (status.running) {
                updateWasRunning = true;
                pollUpdate();
            }
            else if (status.available && (status.lastCheck === null || Date.now() - status.lastCheck > 3600_000)) {
                check.click();
            }
        })
        .catch(() => undefined);

}
