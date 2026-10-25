/*
    SHACK-SERVER
    Settings → Transceivers

    Add, edit, test and remove transceivers without editing any file.
    Talks to /api/radios (see src/routes/radio-config.ts).
    Changes are applied immediately (independent of "Save Settings").
*/

(function () {

    if (window.loadRadioSettings) {
        return;   // already loaded
    }

    /* Stylesheet for this section */
    if (!document.querySelector('link[data-radio-settings]')) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = "css/radio-settings.css?v=2";
        link.dataset.radioSettings = "1";
        document.head.appendChild(link);
    }

    const MANUAL = "__manual__";
    const STATUS_REFRESH_MS = 3000;

    const state = {
        drivers: [],
        radios: [],
        activeRadioId: "",
        ports: [],
        editingId: null,      // null = add, string = edit
        nameTouched: false,
        statusTimer: null,
        busy: false,
    };

    const $ = id => document.getElementById(id);

    function esc(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    async function api(method, url, body) {

        const response = await fetch(url, {
            method,
            cache: "no-store",
            headers: body ? { "Content-Type": "application/json" } : undefined,
            body: body ? JSON.stringify(body) : undefined,
        });

        let data = {};
        try {
            data = await response.json();
        }
        catch {
            // empty / non-JSON body
        }

        if (!response.ok) {
            throw new Error(data.error || `HTTP ${response.status}`);
        }

        return data;

    }

    function driverOf(protocol) {
        return state.drivers.find(d => d.protocol === protocol);
    }

    function hex2(n) {
        return Number(n).toString(16).toUpperCase().padStart(2, "0");
    }


    /* ==================================================================
       Loading
       ================================================================== */

    async function loadRadioSettings() {

        if (!$("radio-list")) {
            return;   // settings modal of an older page version
        }

        setupOnce();
        hideForm();

        $("radio-list").innerHTML =
            '<div class="radio-empty">Loading transceivers…</div>';

        try {

            const [drivers, radios, ports] = await Promise.all([
                api("GET", "/api/radios/drivers"),
                api("GET", "/api/radios"),
                api("GET", "/api/radios/ports"),
            ]);

            state.drivers = drivers;
            state.radios = radios.radios;
            state.activeRadioId = radios.activeRadioId;
            state.ports = ports;

            renderList();
            startStatusRefresh();

        }
        catch (error) {

            $("radio-list").innerHTML =
                `<div class="radio-empty radio-error-text">` +
                `Transceivers could not be loaded: ${esc(error.message)}</div>`;

        }

    }

    async function refreshList() {

        try {
            const radios = await api("GET", "/api/radios");
            state.radios = radios.radios;
            state.activeRadioId = radios.activeRadioId;
            renderList();
        }
        catch {
            // keep the old list on a temporary error
        }

    }

    async function refreshPorts() {

        try {
            state.ports = await api("GET", "/api/radios/ports");
        }
        catch {
            state.ports = [];
        }

    }

    function startStatusRefresh() {

        stopStatusRefresh();

        state.statusTimer = setInterval(() => {
            if (!state.busy) {
                refreshList();
            }
        }, STATUS_REFRESH_MS);

    }

    function stopStatusRefresh() {

        if (state.statusTimer) {
            clearInterval(state.statusTimer);
            state.statusTimer = null;
        }

    }


    /* ==================================================================
       List
       ================================================================== */

    function statusOf(radio) {

        const s = radio.status || {};

        if (!radio.enabled) {
            return { cls: "off", text: "Disabled" };
        }

        if (!radio.device) {
            return { cls: "off", text: "No port - display only" };
        }

        if (s.connected && s.frequency > 0) {
            return {
                cls: "ok",
                text: `Connected · ${(s.frequency / 1e6).toFixed(3)} MHz` +
                    (s.mode && s.mode !== "UNKNOWN" ? ` ${s.mode}` : ""),
            };
        }

        if (s.connected) {
            return { cls: "warn", text: "Port open - no answer from the transceiver" };
        }

        const e = s.lastError || "";

        if (/no such file|ENOENT/i.test(e)) return { cls: "err", text: "Not plugged in" };
        if (/input\/output|EIO|enable UART/i.test(e)) return { cls: "err", text: "Transceiver switched off?" };
        if (/permission|EACCES/i.test(e)) return { cls: "err", text: "No permission (dialout group)" };
        if (/busy|lock/i.test(e)) return { cls: "err", text: "Port used by another program" };
        if (e) return { cls: "err", text: "Cannot open the port" };

        return { cls: "warn", text: "Connecting…" };

    }

    function portLabel(device) {

        if (!device) {
            return "no port";
        }

        const port = state.ports.find(p => p.path === device);
        if (port) return port.label;

        // Not plugged in right now: make the by-id name readable.
        const name = device.split("/").pop();
        const m = /^usb-(.+?)-if(\d+)(?:-port\d+)?$/.exec(name);
        return m
            ? `${m[1].replace(/_/g, " ")} · Interface ${Number(m[2])}`
            : name;

    }

    function renderList() {

        const list = $("radio-list");
        if (!list) return;

        if (!state.radios.length) {
            list.innerHTML =
                '<div class="radio-empty">No transceiver configured yet. ' +
                'Click <strong>+ Add Transceiver</strong>.</div>';
            return;
        }

        list.innerHTML = state.radios.map(radio => {

            const status = statusOf(radio);
            const driver = driverOf(radio.protocol);
            const active = radio.id === state.activeRadioId;

            return `
                <div class="radio-row ${radio.enabled ? "" : "radio-row-disabled"}" data-id="${esc(radio.id)}">

                    <span class="radio-dot radio-dot-${status.cls}" title="${esc(status.text)}"></span>

                    <div class="radio-main">
                        <div class="radio-name">
                            ${esc(radio.name)}
                            ${active ? '<span class="radio-badge">ACTIVE</span>' : ""}
                        </div>
                        <div class="radio-meta">
                            ${esc(driver ? driver.label : radio.protocol)}
                            · ${esc(portLabel(radio.device))}
                            · ${esc(radio.baudRate)} Bd
                            ${radio.protocol === "icom" && radio.civAddress !== undefined
                                ? ` · CI-V ${hex2(radio.civAddress)}` : ""}
                        </div>
                        <div class="radio-status radio-status-${status.cls}">${esc(status.text)}</div>
                    </div>

                    <div class="radio-row-actions">

                        <label class="radio-check radio-row-enabled" title="Enable / disable">
                            <input type="checkbox" data-action="toggle" ${radio.enabled ? "checked" : ""}>
                            <span>On</span>
                        </label>

                        <button type="button" class="radio-row-button" data-action="edit">Edit</button>
                        <button type="button" class="radio-row-button radio-row-delete" data-action="delete">Delete</button>

                    </div>

                </div>
            `;

        }).join("");

    }

    async function onListClick(event) {

        const target = event.target;
        const action = target?.dataset?.action;
        const row = target?.closest?.(".radio-row");

        if (!action || !row || action === "toggle") {
            return;
        }

        const radio = state.radios.find(r => r.id === row.dataset.id);
        if (!radio) return;

        if (action === "edit") {
            await openForm(radio);
        }

        if (action === "delete") {

            // two-step delete instead of a browser dialog
            if (target.dataset.confirm !== "1") {

                target.dataset.confirm = "1";
                target.textContent = "Really delete?";
                target.classList.add("radio-row-confirm");

                setTimeout(() => {
                    target.dataset.confirm = "";
                    target.textContent = "Delete";
                    target.classList.remove("radio-row-confirm");
                }, 4000);

                return;
            }

            try {
                state.busy = true;
                await api("DELETE", `/api/radios/${encodeURIComponent(radio.id)}`);
                if (state.editingId === radio.id) hideForm();
                await refreshList();
            }
            catch (error) {
                showListError(error.message);
            }
            finally {
                state.busy = false;
            }

        }

    }

    async function onListChange(event) {

        const target = event.target;
        if (target?.dataset?.action !== "toggle") return;

        const row = target.closest(".radio-row");
        const radio = state.radios.find(r => r.id === row?.dataset.id);
        if (!radio) return;

        const { status, id, ...config } = radio;

        try {
            state.busy = true;
            await api("PUT", `/api/radios/${encodeURIComponent(id)}`, {
                ...config,
                enabled: target.checked,
            });
            await refreshList();
        }
        catch (error) {
            target.checked = !target.checked;
            showListError(error.message);
        }
        finally {
            state.busy = false;
        }

    }

    function showListError(message) {

        const list = $("radio-list");
        const box = document.createElement("div");
        box.className = "radio-result radio-result-err";
        box.textContent = message;
        list.prepend(box);
        setTimeout(() => box.remove(), 6000);

    }


    /* ==================================================================
       Form
       ================================================================== */

    function hideForm() {

        const form = $("radio-form");
        if (form) form.hidden = true;

        const add = $("radio-add");
        if (add) add.hidden = false;

        state.editingId = null;

    }

    async function openForm(radio) {

        state.editingId = radio ? radio.id : null;
        state.nameTouched = !!radio;

        await refreshPorts();

        $("radio-form-title").textContent =
            radio ? `Edit ${radio.name}` : "Add Transceiver";

        $("radio-driver").innerHTML = state.drivers.map(d =>
            `<option value="${esc(d.protocol)}">${esc(d.label)}</option>`
        ).join("");

        $("radio-name").value = radio ? radio.name : "";
        $("radio-driver").value = radio ? radio.protocol : state.drivers[0]?.protocol ?? "";
        $("radio-enabled").checked = radio ? radio.enabled : true;

        // CI-V: the radio's own address, otherwise the driver default
        $("radio-civ").value =
            radio && radio.civAddress !== undefined
                ? hex2(radio.civAddress)
                : "";

        onDriverChange(radio ? radio.baudRate : null);

        renderPortOptions(radio ? radio.device : null);

        setResult(null);

        $("radio-add").hidden = true;
        $("radio-form").hidden = false;
        $("radio-form").scrollIntoView({ block: "nearest", behavior: "smooth" });
        $("radio-name").focus();

    }

    /*
     * keepBaud: baud rate of the transceiver being edited (form opened);
     * null when the user picks another driver -> that driver's default.
     */
    function onDriverChange(keepBaud) {

        const driver = driverOf($("radio-driver").value);
        if (!driver) return;

        const baud =
            keepBaud && driver.baudRates.includes(keepBaud)
                ? keepBaud
                : driver.defaultBaudRate;

        $("radio-baud").innerHTML = driver.baudRates.map(b =>
            `<option value="${b}" ${b === baud ? "selected" : ""}>` +
            `${b}${b === driver.defaultBaudRate ? " (default)" : ""}</option>`
        ).join("");

        $("radio-driver-models").textContent = `For: ${driver.models}`;
        $("radio-driver-hint").textContent = driver.hint;

        const civ = !!driver.needsCivAddress;
        document.querySelectorAll(".radio-civ-field").forEach(el => {
            el.hidden = !civ;
        });

        if (civ && !$("radio-civ").value) {
            $("radio-civ").value = hex2(driver.defaultCivAddress ?? 0xA4);
        }

        // Suggest a name until the user typed one.
        if (!state.nameTouched) {
            $("radio-name").value = driver.label;
        }

    }

    function renderPortOptions(selectedDevice) {

        const select = $("radio-port");
        const ownDevice = state.editingId
            ? state.radios.find(r => r.id === state.editingId)?.device
            : "";

        const options = [];

        if (!state.ports.length) {
            options.push('<option value="" disabled>No serial port found - plug in the USB cable and click Refresh</option>');
        }

        for (const port of state.ports) {

            const usedByOther =
                port.inUseBy && port.path !== ownDevice;

            options.push(
                `<option value="${esc(port.path)}" ${usedByOther ? "disabled" : ""}>` +
                `${esc(port.label)}${usedByOther ? ` - used by ${esc(port.inUseBy)}` : ""}` +
                `</option>`
            );

        }

        // Configured port that is not plugged in right now.
        if (selectedDevice && !state.ports.some(p => p.path === selectedDevice)) {
            options.push(
                `<option value="${esc(selectedDevice)}">` +
                `${esc(selectedDevice.split("/").pop())} (not connected right now)</option>`
            );
        }

        options.push('<option value="">No port - display only, no CAT</option>');
        options.push(`<option value="${MANUAL}">Enter path manually…</option>`);

        select.innerHTML = options.join("");

        if (selectedDevice !== null && selectedDevice !== undefined) {
            select.value = selectedDevice;
        }
        else {
            // first free port - but never the CP2105 "Standard port"
            // (Interface 1), which is not the CAT port on Yaesu radios
            const free =
                state.ports.find(p => !p.inUseBy && !/Standard port/.test(p.hint)) ??
                state.ports.find(p => !p.inUseBy);
            select.value = free ? free.path : "";
        }

        onPortChange();

    }

    function onPortChange() {

        const value = $("radio-port").value;
        const manual = value === MANUAL;

        $("radio-port-manual").hidden = !manual;
        if (manual) $("radio-port-manual").focus();

        const port = state.ports.find(p => p.path === value);
        const help = [];

        if (port) {
            help.push(port.path);
            if (port.target && port.target !== port.path) help.push(`→ ${port.target}`);
            if (port.hint) help.push(`· ${port.hint}`);
        }
        else if (value === "") {
            help.push("The transceiver is shown in the station list, but not controlled.");
        }

        $("radio-port-help").textContent = help.join(" ");

    }

    function collectForm() {

        const portValue = $("radio-port").value;

        const config = {
            name: $("radio-name").value.trim(),
            protocol: $("radio-driver").value,
            device: portValue === MANUAL
                ? $("radio-port-manual").value.trim()
                : portValue,
            baudRate: Number($("radio-baud").value),
            enabled: $("radio-enabled").checked,
        };

        if (driverOf(config.protocol)?.needsCivAddress) {
            config.civAddress = $("radio-civ").value.trim();
        }

        return config;

    }

    function setResult(kind, html) {

        const box = $("radio-result");

        if (!kind) {
            box.hidden = true;
            box.innerHTML = "";
            return;
        }

        box.className = `radio-result radio-result-${kind}`;
        box.innerHTML = html;
        box.hidden = false;

    }

    function setFormBusy(busy) {

        state.busy = busy;

        for (const id of ["radio-test", "radio-save", "radio-cancel"]) {
            $(id).disabled = busy;
        }

    }

    async function testConnection() {

        const config = collectForm();

        if (!config.device) {
            setResult("err", "Please choose a serial port first.");
            return;
        }

        setFormBusy(true);
        setResult("info", "Testing… this takes up to 6 seconds. " +
            "The other transceivers are paused during the test.");

        try {

            const result = await api("POST", "/api/radios/test", config);

            if (result.ok) {
                setResult("ok", `✔ ${esc(result.message)}`);
            }
            else {
                setResult("err",
                    `<strong>✖ ${esc(result.message)}</strong>` +
                    (result.hint ? `<div>${esc(result.hint)}</div>` : "") +
                    (result.detail ? `<div class="radio-result-detail">${esc(result.detail)}</div>` : "")
                );
            }

        }
        catch (error) {
            setResult("err", `✖ ${esc(error.message)}`);
        }
        finally {
            setFormBusy(false);
            refreshList();
        }

    }

    async function saveForm() {

        const config = collectForm();

        setFormBusy(true);

        try {

            if (state.editingId) {
                await api("PUT", `/api/radios/${encodeURIComponent(state.editingId)}`, config);
            }
            else {
                await api("POST", "/api/radios", config);
            }

            hideForm();
            await refreshList();

        }
        catch (error) {
            setResult("err", `✖ ${esc(error.message)}`);
        }
        finally {
            setFormBusy(false);
        }

    }


    /* ==================================================================
       Wiring
       ================================================================== */

    function setupOnce() {

        const list = $("radio-list");
        if (!list || list.dataset.ready === "1") return;
        list.dataset.ready = "1";

        list.addEventListener("click", onListClick);
        list.addEventListener("change", onListChange);

        $("radio-add").addEventListener("click", () => openForm(null));
        $("radio-cancel").addEventListener("click", hideForm);
        $("radio-test").addEventListener("click", testConnection);
        $("radio-save").addEventListener("click", saveForm);

        $("radio-driver").addEventListener("change", () => onDriverChange(null));
        $("radio-port").addEventListener("change", onPortChange);
        $("radio-name").addEventListener("input", () => { state.nameTouched = true; });

        $("radio-port-refresh").addEventListener("click", async () => {
            const keep = $("radio-port").value;
            await refreshPorts();
            renderPortOptions(keep === MANUAL ? null : keep);
        });

    }

    window.loadRadioSettings = loadRadioSettings;
    window.closeRadioSettings = () => {
        stopStatusRefresh();
        hideForm();
    };

    // Settings modal may already be open when this script arrives.
    if (document.getElementById("settings-modal")?.classList.contains("open")) {
        loadRadioSettings();
    }

})();
