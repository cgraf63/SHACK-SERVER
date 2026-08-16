import net from "net";

import {
    fusionEngine
} from "../fusion/fusion-instance.js";


const TELNET_PORT = 8000;

const MAX_INITIAL_SPOTS = 100;

const SPOT_MAX_AGE =
    30 * 60 * 1000;


interface TelnetClient {

    socket: net.Socket;

    callsign: string;

    loggedIn: boolean;

    lastSent: Map<string, number>;

}


const clients =
    new Set<TelnetClient>();


function formatFrequency(
    frequency: number
): string {

    return frequency
        .toFixed(1);

}


function formatTime(
    timestamp: number
): string {

    const date =
        new Date(timestamp);

    const hours =
        String(
            date.getUTCHours()
        ).padStart(
            2,
            "0"
        );

    const minutes =
        String(
            date.getUTCMinutes()
        ).padStart(
            2,
            "0"
        );

    return (
        hours +
        minutes
    );

}


function cleanText(
    value: string
): string {

    return value
        .replace(
            /[\r\n]+/g,
            " "
        )
        .trim();

}


function spotKey(
    spot: {
        call: string;
        frequency: number;
        mode: string;
    }
): string {

    return [

        spot.call,

        spot.frequency,

        spot.mode

    ].join(
        "-"
    );

}


function formatSpot(
    spot: any
): string {

    const spotter =
        cleanText(
            spot.spotters?.[0] ||
            "SHACK"
        );

    let comment =
        cleanText(
            spot.comments?.join(
                " "
            ) || ""
        );


    if (
        !comment &&
        spot.mode
    ) {

        comment =
            cleanText(
                spot.mode
            );

    }


    if (
        spot.source
    ) {

        comment =
            comment
                ? `${comment} ${spot.source}`
                : spot.source;

    }


    /*
     * Classic DX Cluster style:
     *
     * DX de SPOTTER: FREQUENCY CALL COMMENT TIME
     */

    const line =
        "DX de " +
        spotter +
        ": " +
        formatFrequency(
            spot.frequency
        ).padStart(
            9,
            " "
        ) +
        "  " +
        spot.call
            .padEnd(
                12,
                " "
            ) +
        " " +
        comment
            .slice(
                0,
                45
            )
            .padEnd(
                45,
                " "
            ) +
        " " +
        formatTime(
            spot.lastSeen
        );


    return line;

}


function send(
    client: TelnetClient,
    text: string
): void {

    if (
        client.socket.destroyed
    ) {

        return;

    }


    client.socket.write(
        text +
        "\r\n"
    );

}


function sendPrompt(
    client: TelnetClient
): void {

    send(
        client,
        `${client.callsign} de SHACK-SERVER >`
    );

}


function sendInitialSpots(
    client: TelnetClient
): void {

    const now =
        Date.now();


    const spots =
        fusionEngine
            .getSpots()
            .filter(
                spot =>
                    (
                        now -
                        spot.lastSeen
                    ) <
                    SPOT_MAX_AGE
            )
            .sort(
                (
                    a,
                    b
                ) =>
                    b.lastSeen -
                    a.lastSeen
            )
            .slice(
                0,
                MAX_INITIAL_SPOTS
            );


    for (
        const spot of spots
    ) {

        const key =
            spotKey(
                spot
            );


        client.lastSent.set(
            key,
            spot.lastSeen
        );


        send(
            client,
            formatSpot(
                spot
            )
        );

    }

}


function sendNewSpots(): void {

    const now =
        Date.now();


    const spots =
        fusionEngine
            .getSpots()
            .filter(
                spot =>
                    (
                        now -
                        spot.lastSeen
                    ) <
                    SPOT_MAX_AGE
            );


    for (
        const client of clients
    ) {

        if (
            !client.loggedIn ||
            client.socket.destroyed
        ) {

            continue;

        }


        for (
            const spot of spots
        ) {

            const key =
                spotKey(
                    spot
                );


            const lastSent =
                client.lastSent.get(
                    key
                );


            /*
             * Send a spot when:
             *
             * - it has never been sent
             * - or it was updated since
             *   the previous transmission
             */

            if (
                lastSent === undefined ||
                spot.lastSeen > lastSent
            ) {

                send(
                    client,
                    formatSpot(
                        spot
                    )
                );


                client.lastSent.set(
                    key,
                    spot.lastSeen
                );

            }

        }


        /*
         * Keep the client map reasonably small.
         */

        for (
            const [
                key,
                timestamp
            ]
            of client.lastSent
        ) {

            if (
                now -
                timestamp >
                SPOT_MAX_AGE
            ) {

                client.lastSent.delete(
                    key
                );

            }

        }

    }

}


function handleLine(
    client: TelnetClient,
    line: string
): void {

    const input =
        line.trim();


    if (
        !client.loggedIn
    ) {

        if (
            !input
        ) {

            return;

        }


        /*
         * Callsign received.
         */

        client.callsign =
            input
                .toUpperCase()
                .replace(
                    /[^A-Z0-9\/-]/g,
                    ""
                )
                .slice(
                    0,
                    20
                );


        if (
            !client.callsign
        ) {

            send(
                client,
                "Invalid callsign."
            );

            send(
                client,
                "login:"
            );

            return;

        }


        client.loggedIn =
            true;


        send(
            client,
            ""
        );

        send(
            client,
            "SHACK-SERVER DX Cluster"
        );

        send(
            client,
            "Read-only DX Cluster"
        );

        send(
            client,
            ""
        );


        sendInitialSpots(
            client
        );


        send(
            client,
            ""
        );


        sendPrompt(
            client
        );


        return;

    }


    /*
     * Read-only server.
     *
     * We intentionally do not implement
     * DX submission or other cluster
     * commands.
     */

    const command =
        input.toUpperCase();


    if (
        command === "BYE" ||
        command === "QUIT" ||
        command === "EXIT"
    ) {

        send(
            client,
            "73!"
        );


        client.socket.end();

        return;

    }


    /*
     * Ignore all other input.
     */

}


const server =
    net.createServer(
        socket => {

            socket.setEncoding(
                "utf8"
            );


            const client:
                TelnetClient = {

                socket,

                callsign:
                    "",

                loggedIn:
                    false,

                lastSent:
                    new Map()

            };


            clients.add(
                client
            );


            console.log(
                `Telnet client connected from ${socket.remoteAddress}`
            );


            send(
                client,
                ""
            );

            send(
                client,
                "SHACK-SERVER DX Cluster"
            );

            send(
                client,
                "login:"
            );


            let buffer =
                "";


            socket.on(
                "data",
                data => {

                    buffer +=
                        String(
                            data
                        );


                    const lines =
                        buffer.split(
                            /\r?\n/
                        );


                    buffer =
                        lines.pop() ||
                        "";


                    for (
                        const line of lines
                    ) {

                        handleLine(
                            client,
                            line
                        );

                    }

                }
            );


            socket.on(
                "close",
                () => {

                    clients.delete(
                        client
                    );


                    console.log(
                        `Telnet client disconnected ${client.callsign || ""}`
                    );

                }
            );


            socket.on(
                "error",
                error => {

                    console.error(
                        "Telnet client error:",
                        error.message
                    );


                    clients.delete(
                        client
                    );

                }
            );

        }
    );


server.on(
    "error",
    error => {

        console.error(
            "Telnet server error:",
            error
        );

    }
);


server.listen(
    TELNET_PORT,
    "0.0.0.0",
    () => {

        console.log(
            `DX Cluster Telnet server listening on port ${TELNET_PORT}`
        );

    }
);


/*
 * Check the FusionEngine periodically.
 *
 * This does not modify the FusionEngine.
 * It only reads getSpots() and forwards
 * new/updated spots to connected clients.
 */

setInterval(
    sendNewSpots,
    2000
);


export {
    server as telnetServer
};
