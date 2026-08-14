/* =========================================================
   NETWORK PAGE
   SHACK-SERVER
   ========================================================= */

async function loadNetwork() {

    try {

        const response =
            await fetch("/api/network", {
                cache: "no-store"
            });


        if (!response.ok) {

            throw new Error(
                `HTTP ${response.status}`
            );

        }


        const data =
            await response.json();


        updateNetwork(data);


    }
    catch (error) {

        console.error(
            "Network API error:",
            error
        );


        const status =
            document.getElementById(
                "network-status"
            );


        if (status) {

            status.textContent =
                "Offline";

            status.className =
                "network-status-value network-state-disconnected";

        }


        const updated =
            document.getElementById(
                "network-updated"
            );


        if (updated) {

            updated.textContent =
                "Unable to retrieve network data";

        }

    }

}


/* =========================================================
   UPDATE PAGE
   ========================================================= */

function updateNetwork(data) {


    /*
        General network status
    */

    setText(
        "network-manager",
        data.networkManager || "—"
    );


    setText(
        "network-hostname",
        data.hostname || "—"
    );


    const active =
        data.active || {};


    setText(
        "network-interface",
        active.device || "—"
    );


    setText(
        "network-connection",
        active.connection || "—"
    );


    setText(
        "network-ipv4",
        data.address || "—"
    );


    setText(
        "network-gateway",
        data.gateway || "—"
    );


    const dns =
        Array.isArray(data.dns)
            ? data.dns.join(", ")
            : "—";


    setText(
        "network-dns",
        dns
    );


    /*
        Overall status
    */

    const networkStatus =
        document.getElementById(
            "network-status"
        );


    if (networkStatus) {

        if (
            active.state === "connected"
        ) {

            networkStatus.textContent =
                "Connected";

            networkStatus.className =
                "network-status-value network-state-connected";

        }
        else {

            networkStatus.textContent =
                active.state || "Unknown";

            networkStatus.className =
                "network-status-value network-state-disconnected";

        }

    }


    /*
        WiFi
    */

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


    if (
        wifi.signal !== null &&
        wifi.signal !== undefined
    ) {

        setText(
            "wifi-signal",
            `${wifi.signal}%`
        );

    }
    else {

        setText(
            "wifi-signal",
            "—"
        );

    }


    /*
        WiFi state indicator
    */

    const wifiState =
        document.getElementById(
            "wifi-state"
        );


    const wifiIndicator =
        document.getElementById(
            "wifi-indicator"
        );


    if (
        wifiState &&
        wifiIndicator
    ) {

        if (
            active.type === "wifi" &&
            active.state === "connected"
        ) {

            wifiState.textContent =
                "Connected";

            wifiIndicator.textContent =
                "●";

            wifiIndicator.className =
                "wifi-indicator network-state-connected";

        }
        else {

            wifiState.textContent =
                "Disconnected";

            wifiIndicator.textContent =
                "●";

            wifiIndicator.className =
                "wifi-indicator network-state-disconnected";

        }

    }


    /*
        Interfaces
    */

    updateInterfaces(
        data.interfaces || []
    );


    /*
        Timestamp
    */

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


/* =========================================================
   INTERFACES
   ========================================================= */

function updateInterfaces(
    interfaces
) {

    const container =
        document.getElementById(
            "interface-list"
        );


    if (!container) {

        return;

    }


    if (!interfaces.length) {

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
        interfaces.map(
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
                                address.address
                        )
                        .join(", ");


                /*
                    Determine state.

                    The /api/network endpoint
                    currently provides interface
                    addresses but not a state/type
                    field for each interface.

                    Therefore we derive the
                    information where possible.
                */

                let type =
                    "—";


                if (
                    iface.name === "lo"
                ) {

                    type =
                        "loopback";

                }
                else if (
                    iface.name.startsWith(
                        "wl"
                    )
                ) {

                    type =
                        "wifi";

                }
                else if (
                    iface.name.startsWith(
                        "eth"
                    )
                ) {

                    type =
                        "ethernet";

                }
                else if (
                    iface.name.startsWith(
                        "br"
                    )
                ) {

                    type =
                        "bridge";

                }
                else if (
                    iface.name.startsWith(
                        "docker"
                    )
                ) {

                    type =
                        "docker";

                }


                const state =
                    addresses.length
                        ? "configured"
                        : "inactive";


                const stateClass =
                    addresses.length
                        ? "network-state-connected"
                        : "network-state-unavailable";


                return `

                    <tr>

                        <td>
                            <strong>
                                ${escapeHtml(
                                    iface.name || "—"
                                )}
                            </strong>
                        </td>

                        <td>
                            ${escapeHtml(type)}
                        </td>

                        <td class="${stateClass}">
                            ${escapeHtml(state)}
                        </td>

                        <td>
                            —
                        </td>

                        <td>
                            ${escapeHtml(
                                addressText || "—"
                            )}
                        </td>

                    </tr>

                `;

            }
        )
        .join("");

}


/* =========================================================
   HELPER
   ========================================================= */

function setText(
    id,
    value
) {

    const element =
        document.getElementById(id);


    if (!element) {

        return;

    }


    element.textContent =
        value;

}


/* =========================================================
   HTML ESCAPE
   ========================================================= */

function escapeHtml(
    value
) {

    return String(value)
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


/* =========================================================
   WIFI SCAN
   ========================================================= */

const wifiScanButton =
    document.getElementById(
        "wifi-scan"
    );


if (wifiScanButton) {

    wifiScanButton.addEventListener(
        "click",
        async () => {

            /*
                Scan endpoint will be added
                later.

                For now this prevents the
                button from doing nothing
                silently.
            */

            const message =
                document.getElementById(
                    "wifi-message"
                );


            if (message) {

                message.textContent =
                    "WiFi scan is not available yet.";

            }

        }
    );

}


/* =========================================================
   INITIAL LOAD
   ========================================================= */

loadNetwork();


/*
    Refresh every 10 seconds.
*/

setInterval(
    loadNetwork,
    10000
);
