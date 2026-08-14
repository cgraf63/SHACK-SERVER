import { Router } from "express";
import { exec } from "child_process";
import os from "os";

const router = Router();


function execCommand(
    command: string
): Promise<string> {

    return new Promise(
        (resolve) => {

            exec(
                command,
                {
                    timeout: 5000
                },
                (error, stdout) => {

                    if (error) {

                        resolve("");

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
