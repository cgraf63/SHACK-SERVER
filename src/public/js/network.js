/* =========================================================
   NETWORK UI
   Compact layout matching the new NETWORK design
   ========================================================= */

(() => {

    "use strict";

    /* ---------------------------------------------------------
       CSS
       --------------------------------------------------------- */

    const style = document.createElement("style");

    style.textContent = `
        .network-status-grid {
            display: block !important;
        }

        .network-status-grid .network-stat {
            display: none !important;
        }

        .network-status-grid .network-stat:first-child {
            display: block !important;
            padding: 0 !important;
            border: 0 !important;
            background: transparent !important;
        }

        .network-status-grid .network-stat:first-child span {
            display: none !important;
        }

        .network-status-grid .network-stat:first-child strong {
            display: block !important;
            margin-top: 8px !important;
            font-size: 16px !important;
        }

        .network-wifi-grid {
            display: grid !important;
            grid-template-columns:
                minmax(150px, 1.2fr)
                minmax(190px, 1.5fr)
                minmax(75px, .65fr)
                minmax(115px, .9fr)
                minmax(90px, .7fr)
                minmax(100px, .8fr) !important;
            gap: 0 !important;
            border: 1px solid #24343f !important;
            border-radius: 5px !important;
            overflow: hidden !important;
        }

        .network-wifi-item {
            min-width: 0 !important;
            padding: 7px 12px !important;
            background: #0b151e !important;
            border: 0 !important;
            border-right: 1px solid #24343f !important;
            border-radius: 0 !important;
            gap: 4px !important;
        }

        .network-wifi-item:last-child {
            border-right: 0 !important;
        }

        .network-wifi-item span {
            margin-bottom: 4px !important;
            font-size: 11px !important;
        }

        .network-wifi-item strong {
            font-size: 14px !important;
            white-space: nowrap !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
        }

        .network-card-title-row {
            display: flex !important;
            align-items: center !important;
            justify-content: space-between !important;
            gap: 14px !important;
        }

        .network-inline-scan {
            margin-left: auto;
        }

        .network-table th {
            padding: 9px 12px !important;
        }

        .network-table td {
            padding: 7px 12px !important;
        }

        .network-signal {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            white-space: nowrap;
        }

        .network-signal-bars {
            display: inline-flex;
            align-items: flex-end;
            gap: 2px;
            height: 14px;
        }

        .network-signal-bars i {
            display: block;
            width: 4px;
            background: #39d98a;
            opacity: .25;
        }

        .network-signal-bars i:nth-child(1) { height: 4px; }
        .network-signal-bars i:nth-child(2) { height: 7px; }
        .network-signal-bars i:nth-child(3) { height: 10px; }
        .network-signal-bars i:nth-child(4) { height: 13px; }

        .network-signal-bars.level-1 i:nth-child(1),
        .network-signal-bars.level-2 i:nth-child(-n+2),
        .network-signal-bars.level-3 i:nth-child(-n+3),
        .network-signal-bars.level-4 i {
            opacity: 1;
        }

        .network-connect-cell {
            width: 90px;
            text-align: right;
        }

        .network-connect-button {
            min-width: 82px;
            padding: 6px 12px;
            border: 1px solid #344754;
            border-radius: 6px;
            background: #101c25;
            color: #d7e0e5;
            font-size: 12px;
            font-weight: 600;
            cursor: pointer;
            white-space: nowrap;
        }

        .network-connect-button:hover {
            border-color: #607d8b;
            color: #ffffff;
        }

        .network-connect-button:disabled {
            opacity: .5;
            cursor: default;
        }

        .network-connect-button.connected {
            color: #39d98a;
            border-color: #2b6b4e;
        }

        .network-hidden-ssid {
            color: #8fa3b2;
            font-style: italic;
        }

        .network-total {
            padding-top: 8px;
            color: #8fa3b2;
            font-size: 12px;
            text-align: center;
        }

        @media (max-width: 1100px) {
            .network-wifi-grid {
                grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
            }

            .network-wifi-item:nth-child(3) {
                border-right: 0 !important;
            }

            .network-wifi-item:nth-child(-n+3) {
                border-bottom: 1px solid #24343f !important;
            }
        }

        @media (max-width: 750px) {
            .network-wifi-grid {
                grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            }

            .network-wifi-item:nth-child(2n) {
                border-right: 0 !important;
            }

            .network-wifi-item {
                border-bottom: 1px solid #24343f !important;
            }
        }

        @media (max-width: 500px) {
            .network-wifi-grid {
                grid-template-columns: 1fr !important;
            }

            .network-wifi-item {
                border-right: 0 !important;
            }
        }
    `;

    document.head.appendChild(style);


    /* ---------------------------------------------------------
       Helpers
       --------------------------------------------------------- */

    function setText(id, value) {

        const element =
            document.getElementById(id);

        if (!element) {
            return;
        }

        element.textContent =
            value;

    }


    function escapeHtml(value) {

        return String(
            value ?? ""
        )
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");

    }


    function signalLevel(signal) {

        if (signal >= 75) return 4;
        if (signal >= 50) return 3;
        if (signal >= 25) return 2;
        if (signal > 0) return 1;

        return 0;

    }


    function signalMarkup(signal) {

        const value =
            Math.max(
                0,
                Math.min(
                    100,
                    Number(signal) || 0
                )
            );

        return `
            <span class="network-signal">
                <span class="network-signal-value">
                    ${value}%
                </span>
                <span
                    class="network-signal-bars level-${signalLevel(value)}">
                    <i></i><i></i><i></i><i></i>
                </span>
            </span>
        `;

    }


    /* ---------------------------------------------------------
       Adapt existing HTML to the compact design
       --------------------------------------------------------- */

    function setupLayout() {

        /*
         * Add the Scan WiFi button to the connected WiFi card.
         */

        const wifiSsid =
            document.getElementById(
                "wifi-ssid"
            );

        if (wifiSsid) {

            const wifiCard =
                wifiSsid.closest(
                    ".network-card"
                );

            if (
                wifiCard &&
                !wifiCard.querySelector(
                    "#wifi-scan-top"
                )
            ) {

                const title =
                    wifiCard.querySelector(
                        ".network-card-title"
                    );

                if (title) {

                    const row =
                        document.createElement(
                            "div"
                        );

                    row.className =
                        "network-card-title-row";

                    title.parentNode.insertBefore(
                        row,
                        title
                    );

                    row.appendChild(
                        title
                    );

                    const button =
                        document.createElement(
                            "button"
                        );

                    button.id =
                        "wifi-scan-top";

                    button.type =
                        "button";

                    button.className =
                        "network-button network-inline-scan";

                    button.textContent =
                        "↻  Scan WiFi";

                    row.appendChild(
                        button
                    );

                }

            }

        }


        /*
         * Add a Connect column to the existing
         * available WiFi table.
         */

        const wifiTable =
            document.querySelector(
                "#wifi-networks"
            );

        if (wifiTable) {

            const header =
                wifiTable
                    .closest("table")
                    ?.querySelector("thead tr");

            if (
                header &&
                !header.querySelector(
                    ".network-connect-header"
                )
            ) {

                const th =
                    document.createElement(
                        "th"
                    );

                th.className =
                    "network-connect-header";

                th.textContent =
                    "";

                header.appendChild(
                    th
                );

            }

        }

        /*
         * Add total counter below the WiFi table.
         */

        if (
            wifiTable &&
            !document.getElementById(
                "wifi-network-total"
            )
        ) {

            const total =
                document.createElement(
                    "div"
                );

            total.id =
                "wifi-network-total";

            total.className =
                "network-total";

            wifiTable
                .closest(".network-table-wrapper")
                ?.after(total);

        }

    }


    /* ---------------------------------------------------------
       Main network data
       --------------------------------------------------------- */

    async function loadNetwork() {

        try {

            const response =
                await fetch(
                    "/api/network",
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

            updateNetwork(
                data
            );

        }
        catch (error) {

            console.error(
                "Network load failed:",
                error
            );

            setText(
                "network-status-value",
                "Unavailable"
            );

        }

    }


    function updateNetwork(data) {

        const active =
            data.active || {};

        const connected =
            active.state === "connected";

        const status =
            document.getElementById(
                "network-status-value"
            );

        if (status) {

            status.textContent =
                connected
                    ? "Connected"
                    : active.state ||
                      "Disconnected";

            status.className =
                connected
                    ? "network-status-value network-state-connected"
                    : "network-status-value network-state-disconnected";

        }

        const wifi =
            data.wifi || {};

        setText(
            "wifi-ssid",
            wifi.ssid || "—"
        );

        setText(
            "wifi-bssid",
            wifi.bssid || "—"
        );

        setText(
            "wifi-channel",
            wifi.channel !== null &&
            wifi.channel !== undefined
                ? String(wifi.channel)
                : "—"
        );

        setText(
            "wifi-frequency",
            wifi.frequency || "—"
        );

        setText(
            "wifi-security",
            wifi.security || "—"
        );

        const signal =
            document.getElementById(
                "wifi-signal"
            );

        if (signal) {

            signal.innerHTML =
                wifi.signal !== null &&
                wifi.signal !== undefined
                    ? signalMarkup(
                        Number(
                            wifi.signal
                        )
                    )
                    : "—";

        }

        const label =
            document.getElementById(
                "wifi-connected-label"
            );

        if (label) {

            label.textContent =
                active.type === "wifi" &&
                connected
                    ? " (Connected)"
                    : "";

        }

        updateInterfaces(
            data.interfaces || []
        );

        const updated =
            document.getElementById(
                "network-updated"
            );

        if (updated) {

            updated.textContent =
                "Updated " +
                new Date().toLocaleTimeString();

        }

    }


    /* ---------------------------------------------------------
       Interfaces
       Only wlan0, lo and eth0.
       --------------------------------------------------------- */

    function updateInterfaces(
        interfaces
    ) {

        const container =
            document.getElementById(
                "network-interfaces"
            );

        if (!container) {
            return;
        }

        const wanted = [
            "wlan0",
            "lo",
            "eth0"
        ];

        const visible =
            interfaces
                .filter(
                    iface =>
                        wanted.includes(
                            iface.name
                        )
                )
                .sort(
                    (a, b) =>
                        wanted.indexOf(
                            a.name
                        ) -
                        wanted.indexOf(
                            b.name
                        )
                );

        if (!visible.length) {

            container.innerHTML = `
                <tr>
                    <td
                        colspan="5"
                        class="network-empty">
                        No network interfaces found.
                    </td>
                </tr>
            `;

            return;

        }

        container.innerHTML =
            visible.map(
                iface => {

                    const addresses =
                        Array.isArray(
                            iface.addresses
                        )
                            ? iface.addresses
                            : [];

                    const addressText =
                        addresses
                            .map(
                                address =>
                                    escapeHtml(
                                        address.address
                                    )
                            )
                            .join(", ");

                    const state =
                        iface.state ||
                        "—";

                    let dotClass =
                        "network-state-dot";

                    if (
                        state ===
                            "unavailable" ||
                        state ===
                            "disconnected"
                    ) {

                        dotClass +=
                            " inactive";

                    }
                    else if (
                        state !==
                            "connected" &&
                        state !==
                            "connected (externally)"
                    ) {

                        dotClass +=
                            " warning";

                    }

                    const stateText =
                        state ===
                            "connected (externally)"
                            ? "connected"
                            : state;

                    return `
                        <tr>

                            <td>
                                <strong>
                                    ${escapeHtml(
                                        iface.name ||
                                        "—"
                                    )}
                                </strong>
                            </td>

                            <td>
                                ${escapeHtml(
                                    iface.type ||
                                    "—"
                                )}
                            </td>

                            <td>
                                <span class="network-state">
                                    <span
                                        class="${dotClass}">
                                    </span>
                                    ${escapeHtml(
                                        stateText
                                    )}
                                </span>
                            </td>

                            <td>
                                ${addressText || "—"}
                            </td>

                            <td>
                                ${escapeHtml(
                                    iface.connection ||
                                    "—"
                                )}
                            </td>

                        </tr>
                    `;

                }
            ).join("");

    }


    /* ---------------------------------------------------------
       WiFi scan
       --------------------------------------------------------- */

    async function scanWifi() {

        const buttons =
            [
                document.getElementById(
                    "wifi-scan-top"
                ),
                document.getElementById(
                    "wifi-scan-btn"
                )
            ]
            .filter(Boolean);

        const message =
            document.getElementById(
                "wifi-scan-message"
            );

        buttons.forEach(
            button => {

                button.disabled =
                    true;

                button.textContent =
                    "Scanning...";

            }
        );

        if (message) {

            message.textContent =
                "Scanning for WiFi networks...";

        }

        try {

            const response =
                await fetch(
                    "/api/network/wifi-scan",
                    {
                        cache: "no-store"
                    }
                );

            if (!response.ok) {

                throw new Error(
                    `HTTP ${response.status}`
                );

            }

            const networks =
                await response.json();

            renderWifiNetworks(
                networks
            );

            if (message) {

                message.textContent =
                    `${networks.length} WiFi network(s) found`;

            }

        }
        catch (error) {

            console.error(
                "WiFi scan failed:",
                error
            );

            if (message) {

                message.textContent =
                    "WiFi scan failed: " +
                    (
                        error instanceof Error
                            ? error.message
                            : String(error)
                    );

            }

        }
        finally {

            buttons.forEach(
                button => {

                    button.disabled =
                        false;

                    button.textContent =
                        "↻  Scan WiFi";

                }
            );

        }

    }


    /* ---------------------------------------------------------
       Render WiFi networks
       --------------------------------------------------------- */

    function renderWifiNetworks(
        networks
    ) {

        const container =
            document.getElementById(
                "wifi-networks"
            );

        const total =
            document.getElementById(
                "wifi-network-total"
            );

        if (!container) {
            return;
        }

        if (
            !Array.isArray(networks) ||
            !networks.length
        ) {

            container.innerHTML = `
                <tr>
                    <td
                        colspan="6"
                        class="network-empty">
                        No WiFi networks found.
                    </td>
                </tr>
            `;

            if (total) {
                total.textContent = "";
            }

            return;

        }

        const sorted =
            [...networks].sort(
                (a, b) =>
                    Number(
                        b.signal || 0
                    ) -
                    Number(
                        a.signal || 0
                    )
            );

        container.innerHTML =
            sorted.map(
                network => {

                    const ssid =
                        network.ssid ||
                        "";

                    const hidden =
                        !ssid;

                    const signal =
                        Number(
                            network.signal ||
                            0
                        );

                    const buttonClass =
                        network.inUse
                            ? "network-connect-button connected"
                            : "network-connect-button";

                    const buttonText =
                        network.inUse
                            ? "Connected"
                            : "Connect";

                    return `
                        <tr>

                            <td>
                                ${
                                    hidden
                                        ? `<span class="network-hidden-ssid">-- (Hidden)</span>`
                                        : escapeHtml(ssid)
                                }
                            </td>

                            <td>
                                ${signalMarkup(
                                    signal
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    network.channel ??
                                    "—"
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    network.frequency ||
                                    "—"
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    network.security ||
                                    "—"
                                )}
                            </td>

                            <td class="network-connect-cell">

                                ${
                                    hidden
                                        ? ""
                                        : `
                                            <button
                                                type="button"
                                                class="${buttonClass}"
                                                data-ssid="${escapeHtml(
                                                    ssid
                                                )}"
                                                ${
                                                    network.inUse
                                                        ? "disabled"
                                                        : ""
                                                }>
                                                ${buttonText}
                                            </button>
                                        `
                                }

                            </td>

                        </tr>
                    `;

                }
            ).join("");

        if (total) {

            total.textContent =
                `Total: ${sorted.length} networks`;

        }

        container
            .querySelectorAll(
                ".network-connect-button:not([disabled])"
            )
            .forEach(
                button => {

                    button.addEventListener(
                        "click",
                        () => {

                            connectWifi(
                                button.dataset.ssid ||
                                "",
                                button
                            );

                        }
                    );

                }
            );

    }


    /* ---------------------------------------------------------
       WiFi connect
       --------------------------------------------------------- */

    async function connectWifi(
        ssid,
        button
    ) {

        if (!ssid) {
            return;
        }

        const password =
            window.prompt(
                `WiFi password for "${ssid}"`,
                ""
            );

        if (password === null) {
            return;
        }

        button.disabled =
            true;

        button.textContent =
            "Connecting...";

        try {

            const response =
                await fetch(
                    "/api/network/wifi/connect",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type":
                                "application/json"
                        },
                        body:
                            JSON.stringify({
                                ssid,
                                password
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

            const message =
                document.getElementById(
                    "wifi-scan-message"
                );

            if (message) {

                message.textContent =
                    `Connected to ${ssid}`;

            }

            await loadNetwork();

            await new Promise(
                resolve =>
                    setTimeout(
                        resolve,
                        1000
                    )
            );

            await scanWifi();

        }
        catch (error) {

            console.error(
                "WiFi connect failed:",
                error
            );

            const message =
                document.getElementById(
                    "wifi-scan-message"
                );

            if (message) {

                message.textContent =
                    "WiFi connection failed: " +
                    (
                        error instanceof Error
                            ? error.message
                            : String(error)
                    );

            }

            button.disabled =
                false;

            button.textContent =
                "Connect";

        }

    }


    /* ---------------------------------------------------------
       Start
       --------------------------------------------------------- */

    document.addEventListener(
        "DOMContentLoaded",
        () => {

            setupLayout();

            const topButton =
                document.getElementById(
                    "wifi-scan-top"
                );

            const bottomButton =
                document.getElementById(
                    "wifi-scan-btn"
                );

            if (topButton) {

                topButton.addEventListener(
                    "click",
                    scanWifi
                );

            }

            if (bottomButton) {

                bottomButton.addEventListener(
                    "click",
                    scanWifi
                );

            }

            loadNetwork();

            setInterval(
                loadNetwork,
                10000
            );

        }
    );

})();
