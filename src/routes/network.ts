import { Router } from "express";
import { exec } from "child_process";
import os from "os";

const router = Router();

function execCommand(
    command: string
): Promise<string> {

    return new Promise(
        (resolve, reject) => {

            exec(
                command,
                {
                    timeout: 10000
                },
                (
                    error,
                    stdout,
                    stderr
                ) => {

                    if (error) {

                        reject(
                            new Error(
                                stderr?.trim()
                                ||
                                error.message
                            )
                        );

                        return;

                    }

                    resolve(
                        stdout.trim()
                    );

                }
            );

        }
    );

}
/*
 * Remove nmcli field prefix.
 *
 * Example:
 *
 * IP4.ADDRESS[1]:192.168.1.128/24
 *
 * becomes:
 *
 * 192.168.1.128/24
 */


function shellEscape(
    value: string
): string {

    return "'" +
        value.replace(
            /'/g,
            "'\\''"
        ) +
        "'";

}

function cleanNmcliValue(
    value: string
): string {

    const separator =
        value.indexOf(":");


    if (
        separator >= 0
    ) {

        return value
            .slice(separator + 1)
            .trim();

    }


    return value.trim();

}


/*
 * Parse nmcli -t output.
 *
 * nmcli escapes ':' and '\'
 * inside fields.
 *
 * Example:
 *
 * A0\:B5\:49\:5D\:DB\:C0
 *
 * must remain one field.
 */
function parseNmcliLine(
    line: string
): string[] {

    const fields: string[] = [];

    let field = "";

    let escaped = false;


    for (
        const char of line
    ) {

        if (
            escaped
        ) {

            field += char;

            escaped = false;

            continue;

        }


        if (
            char === "\\"
        ) {

            escaped = true;

            continue;

        }


        if (
            char === ":"
        ) {

            fields.push(
                field
            );

            field = "";

            continue;

        }


        field += char;

    }


    if (
        escaped
    ) {

        field += "\\";

    }


    fields.push(
        field
    );


    return fields;

}
/*
 * =========================================================
 * WiFi CONNECT
 * =========================================================
 */

router.post(
    "/wifi-connect",
    async (req, res) => {

        try {

            const ssid =
                String(
                    req.body?.ssid || ""
                ).trim();


            const password =
                String(
                    req.body?.password || ""
                );


            if (!ssid) {

                res.status(400).json({

                    error:
                        "SSID is required"

                });

                return;

            }


            /*
             * If no password is supplied,
             * try an open network.
             */

            let command;


            if (password) {

                command =
                    `nmcli device wifi connect ${shellEscape(ssid)} password ${shellEscape(password)}`;

            }
            else {

                command =
                    `nmcli device wifi connect ${shellEscape(ssid)}`;

            }


            const output =
                await execCommand(
                    command
                );


            if (!output) {

                res.status(500).json({

                    error:
                        "WiFi connection failed"

                });

                return;

            }


            res.json({

                success:
                    true,

                message:
                    output

            });

        }
        catch (error) {

            console.error(
                "WiFi connect error:",
                error
            );


            res.status(500).json({

                error:
                    "WiFi connection failed"

            });

        }

    }
);

/*
 * =========================================================
 * WiFi SCAN
 * =========================================================
 */
router.get(
    "/wifi-scan",
    async (_req, res) => {

        try {

            /*
             * Find the active WiFi interface.
             */

            const deviceOutput =
                await execCommand(
                    "nmcli -t -f DEVICE,TYPE,STATE device"
                );


            const wifiDevice =
                deviceOutput
                    .split("\n")
                    .map(
                        line =>
                            parseNmcliLine(line)
                    )
                    .find(
                        parts =>
                            parts[1] === "wifi"
                    );


            if (!wifiDevice) {

                res.status(404).json({
                    error:
                        "No WiFi interface found"
                });

                return;

            }


            const device =
    wifiDevice[0];

if (!device) {

    res.status(404).json({
        error:
            "No WiFi interface found"
    });

    return;

}

            /*
             * Force a real WiFi rescan.
             *
             * The extra timeout is intentional because
             * a real WiFi scan can take several seconds.
             */

            await execCommand(
                `nmcli -t -f SSID,BSSID,CHAN,FREQ,SIGNAL,SECURITY device wifi list --rescan yes`
            );


            /*
             * Give NetworkManager a short moment to
             * populate the scan results.
             */

            await new Promise(
                resolve =>
                    setTimeout(
                        resolve,
                        1500
                    )
            );


            /*
             * Read the fresh scan results.
             */

            const wifiOutput =
                await execCommand(
                    `nmcli -t -f IN-USE,SSID,BSSID,CHAN,FREQ,SIGNAL,SECURITY device wifi list ifname ${shellEscape(device)}`
                );


            const networks =
                wifiOutput
                    .split("\n")
                    .filter(Boolean)
                    .map(
                        line => {

                            const fields =
                                parseNmcliLine(
                                    line
                                );


                            return {

                                inUse:
                                    fields[0] === "*",

                                ssid:
                                    fields[1] || "",

                                bssid:
                                    fields[2] || "",

                                channel:
                                    Number(
                                        fields[3] || 0
                                    ),

                                frequency:
                                    fields[4] || "",

                                signal:
                                    Number(
                                        fields[5] || 0
                                    ),

                                security:
                                    fields
                                        .slice(6)
                                        .join(":") || ""

                            };

                        }
                    );


            res.json(
                networks
            );

        }
        catch (error) {

            console.error(
                "WiFi scan error:",
                error
            );


            res.status(500).json({

                error:
                    "WiFi scan failed"

            });

        }

    }
);





router.get(
    "/wifi/scan",
    async (_req, res) => {

        try {

            const output =
                await execCommand(
                    "nmcli -t -f SSID,BSSID,CHAN,FREQ,SIGNAL,SECURITY device wifi list --rescan yes"
                );

            const networks =
                output
                    ? output
                        .split("\n")
                        .filter(Boolean)
                        .map(line => {

                            const fields =
                                parseNmcliLine(line);

                            return {

                                ssid:
                                    fields[0] || "",

                                bssid:
                                    fields[1] || "",

                                channel:
                                    fields[2] || "",

                                frequency:
                                    fields[3] || "",

                                signal:
                                    Number(
                                        fields[4] || 0
                                    ),

                                security:
                                    fields
                                        .slice(5)
                                        .join(":") || ""

                            };

                        })
                        .filter(
                            network =>
                                network.ssid.length > 0
                        )
                    : [];


            res.json(networks);

        }
        catch (error) {

            console.error(
                "WiFi scan error:",
                error
            );

            res.status(500).json({
                error: "WiFi scan failed"
            });

        }

    }
);


/*
 * =========================================================
 * WIFI CONNECT
 * =========================================================
 */

router.post(
    "/wifi/connect",
    async (req, res) => {

        try {

            const {
                ssid,
                password
            } = req.body;


            if (
                !ssid ||
                typeof ssid !== "string"
            ) {

                res.status(400).json({
                    error: "SSID required"
                });

                return;

            }


            /*
             * Escape shell characters.
             */

            const escapedSsid =
                ssid.replace(
                    /(["\\$`])/g,
                    "\\$1"
                );


            if (
                password &&
                typeof password === "string"
            ) {

                const escapedPassword =
                    password.replace(
                        /(["\\$`])/g,
                        "\\$1"
                    );


                await execCommand(
                    `nmcli device wifi connect "${escapedSsid}" password "${escapedPassword}"`
                );

            }
            else {

                await execCommand(
                    `nmcli device wifi connect "${escapedSsid}"`
                );

            }


            res.json({
                success: true
            });

        }
        catch (error) {

            console.error(
                "WiFi connect error:",
                error
            );

            res.status(500).json({
                error: "WiFi connection failed"
            });

        }

    }
);

router.get(
    "/",
    async (_req, res) => {

        try {

            /*
             * =========================
             * NetworkManager
             * =========================
             */

            const nmStatus =
                await execCommand(
                    "systemctl is-active NetworkManager"
                );


            /*
             * =========================
             * Network interfaces
             * =========================
             */

            const deviceOutput =
                await execCommand(
                    "nmcli -t -f DEVICE,TYPE,STATE,CONNECTION device"
                );


            const devices =
                deviceOutput
                    ? deviceOutput
                        .split("\n")
                        .filter(Boolean)
                        .map(
                            line => {

                                const parts =
                                    parseNmcliLine(
                                        line
                                    );


                                return {

                                    device:
                                        parts[0] || "",

                                    type:
                                        parts[1] || "",

                                    state:
                                        parts[2] || "",

                                    connection:
                                        parts
                                            .slice(3)
                                            .join(":") || ""

                                };

                            }
                        )
                    : [];


            /*
             * =========================
             * Active physical connection
             * =========================
             */

            const active =
                devices.find(
                    device =>
                        device.state ===
                        "connected"
                        &&
                        (
                            device.type === "wifi"
                            ||
                            device.type === "ethernet"
                        )
                );





            /*
             * =========================
             * IPv4 address
             * =========================
             */

            const address =
                active
                    ? cleanNmcliValue(
                        await execCommand(
                            `nmcli -t -f IP4.ADDRESS device show ${active.device}`
                        )
                    )
                    : "";


            /*
             * =========================
             * Gateway
             * =========================
             */

            const gateway =
                active
                    ? cleanNmcliValue(
                        await execCommand(
                            `nmcli -t -f IP4.GATEWAY device show ${active.device}`
                        )
                    )
                    : "";


            /*
             * =========================
             * DNS
             * =========================
             */

            const dnsOutput =
                active
                    ? await execCommand(
                        `nmcli -t -f IP4.DNS device show ${active.device}`
                    )
                    : "";


            const dns =
                dnsOutput
                    .split("\n")
                    .filter(Boolean)
                    .map(
                        cleanNmcliValue
                    );


            /*
             * =========================
             * WiFi information
             * =========================
             *
             * SSID, BSSID, channel,
             * frequency, signal and
             * security are obtained from
             * "nmcli device wifi list".
             */

            let wifi = null;


            if (
                active &&
                active.type === "wifi"
            ) {

                const wifiOutput =
                    await execCommand(
                        "nmcli -t -f IN-USE,SSID,BSSID,CHAN,FREQ,SIGNAL,SECURITY device wifi list"
                    );


                const wifiLines =
                    wifiOutput
                        .split("\n")
                        .filter(Boolean);


                /*
                 * Current connected AP
                 */

                const currentLine =
                    wifiLines.find(
                        line => {

                            const fields =
                                parseNmcliLine(
                                    line
                                );


                            return (
                                fields[0] === "*"
                            );

                        }
                    );


                if (
                    currentLine
                ) {

                    const fields =
                        parseNmcliLine(
                            currentLine
                        );


                    wifi = {

                        device:
                            active.device,


                        ssid:
                            fields[1] || "",


                        bssid:
                            fields[2] || "",


                        channel:
                            Number(
                                fields[3] || 0
                            ),


                        frequency:
                            fields[4] || "",


                        signal:
                            Number(
                                fields[5] || 0
                            ),


                        security:
                            fields
                                .slice(6)
                                .join(":") || ""

                    };

                }

            }


            /*
             * =========================
             * Network interfaces
             * =========================
             *
             * This comes from Node.js
             * and includes IPv4 and IPv6.
             */

            const nodeInterfaces =
    os.networkInterfaces();


router.post(
    "/wifi/scan",
    async (_req, res) => {

        try {

            await execCommand(
                "nmcli device wifi rescan"
            );

            const output =
                await execCommand(
                    "nmcli -t -f SSID,BSSID,CHAN,FREQ,SIGNAL,SECURITY device wifi list"
                );

            const networks =
                output
                    ? output
                        .split("\n")
                        .filter(Boolean)
                        .map(line => {

                            const fields =
                                parseNmcliLine(line);

                            return {
                                ssid: fields[0] || "",
                                bssid: fields[1] || "",
                                channel: fields[2] || "",
                                frequency: fields[3] || "",
                                signal: Number(fields[4] || 0),
                                security:
                                    fields
                                        .slice(5)
                                        .join(":") || ""
                            };

                        })
                        .filter(network => network.ssid)
                    : [];

            res.json({
                networks
            });

        }
        catch (error) {

            console.error(
                "WiFi scan error:",
                error
            );

            res.status(500).json({
                error: "WiFi scan failed"
            });

        }

    }
);


router.post(
    "/wifi/connect",
    async (req, res) => {

        try {

            const ssid =
                String(
                    req.body?.ssid || ""
                ).trim();

            const password =
                String(
                    req.body?.password || ""
                );

            if (!ssid) {

                res.status(400).json({
                    error: "SSID required"
                });

                return;

            }

            /*
             * nmcli connection.
             *
             * --ask wird bewusst nicht verwendet,
             * da der Prozess ohne interaktive Eingabe
             * laufen muss.
             */

            let command;

            if (password) {

                command =
                    `nmcli device wifi connect ${JSON.stringify(ssid)} password ${JSON.stringify(password)}`;

            }
            else {

                command =
                    `nmcli device wifi connect ${JSON.stringify(ssid)}`;

            }

            const result =
                await execCommand(
                    command
                );

            if (!result) {

                /*
                 * execCommand liefert momentan bei
                 * Fehlern ebenfalls "". Das bestehende
                 * Verhalten behalten wir zunächst bei.
                 */

                res.status(500).json({
                    error: "WiFi connection failed"
                });

                return;

            }

            res.json({
                success: true,
                message: result
            });

        }
        catch (error) {

            console.error(
                "WiFi connect error:",
                error
            );

            res.status(500).json({
                error: "WiFi connection failed"
            });

        }

    }
);

const interfaces =
    devices.map(
        device => ({

            name:
                device.device,

            type:
                device.type,

            state:
                device.state,

            connection:
                device.connection,

            addresses:
                (
                    nodeInterfaces[
                        device.device
                    ] || []
                )
                .map(
                    entry => ({

                        address:
                            entry.address,

                        family:
                            entry.family,

                        internal:
                            entry.internal

                    })
                )

        })
    );


            /*
             * =========================
             * Response
             * =========================
             */

            res.json({

                hostname:
                    os.hostname(),


                networkManager:
                    nmStatus === "active"
                        ? "active"
                        : nmStatus || "inactive",


                active:
                    active
                        ? {

                            device:
                                active.device,

                            type:
                                active.type,

                            state:
                                active.state,

                            connection:
                                active.connection

                        }
                        : null,


                address,


                gateway,


                dns,


                wifi,


                interfaces

            });

        }
        catch (error) {

            console.error(
                "Network API error:",
                error
            );


            res.status(500).json({

                error:
                    "Network information unavailable"

            });

        }

    }
);


export default router;
