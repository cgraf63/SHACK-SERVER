import WebSocket from "ws";
import fs from "fs";

const TX5DR_HTTP =
    "http://127.0.0.1:8076";

const TX5DR_WS =
    "ws://127.0.0.1:8076/api/ws";

const TX5DR_TOKEN =
    fs.readFileSync(
        "/home/admin/tx5dr/app/data/config/.admin-token",
        "utf8"
    ).trim();


async function getJwt() {

    console.log(
        "Requesting JWT..."
    );

    const response =
        await fetch(
            `${TX5DR_HTTP}/api/auth/login`,
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body: JSON.stringify({
                    token: TX5DR_TOKEN
                })
            }
        );

    const data =
        await response.json();


    if (!response.ok) {

        console.error(
            "Login failed:",
            data
        );

        process.exit(1);
    }


    console.log(
        "Login successful"
    );

    console.log(
        "Role:",
        data.role
    );

    return data.jwt;
}


async function connect() {

    const jwt =
        await getJwt();


    console.log(
        "Connecting to TX-5DR..."
    );


    const ws =
        new WebSocket(
            TX5DR_WS
        );


    ws.on(
        "open",
        () => {

            console.log(
                "Connected to TX-5DR"
            );

        }
    );


    ws.on(
        "message",
        (raw) => {

            let message;

            try {

                message =
                    JSON.parse(
                        raw.toString()
                    );

            } catch {

                console.log(
                    "RAW:",
                    raw.toString()
                );

                return;
            }


            console.log(
                "MESSAGE:",
                message.type
            );


            if (
                message.type ===
                "authRequired"
            ) {

                console.log(
                    "Sending JWT authentication..."
                );

                ws.send(
                    JSON.stringify({
                        type:
                            "authToken",

                        data: {
                            jwt
                        },

                        timestamp:
                            new Date()
                                .toISOString()
                    })
                );

                return;
            }


            if (
                message.type ===
                "authResult"
            ) {

                console.log(
                    "AUTH RESULT:",
                    message.data
                );


                if (
                    !message.data?.success
                ) {

                    console.error(
                        "Authentication failed:",
                        message.data?.error
                    );

                    ws.close();

                    return;
                }


                console.log(
                    "Sending client handshake..."
                );


                ws.send(
                    JSON.stringify({

                        type:
                            "clientHandshake",

                        data: {

                            enabledOperatorIds:
                                null,

                            selectedOperatorId:
                                null,

                            clientInstanceId:
                                "shack-server-ft8",

                            clientVersion:
                                "1.0.0",

                            clientCapabilities: [
                                "operatorFiltering",
                                "handshakeProtocol",
                                "selectedOperatorScopedAnalysis"
                            ]
                        },

                        timestamp:
                            new Date()
                                .toISOString()

                    })
                );

                return;
            }


            if (
                message.type ===
                "serverHandshakeComplete"
            ) {

                console.log(
                    "Handshake complete"
                );

                console.log(
                    "Waiting for FT8 decodes..."
                );

                return;
            }


            if (
                message.type ===
                "slotPackUpdated"
            ) {

                const slotPack =
                    message.data;


                console.log(
                    "\n=========================="
                );

                console.log(
                    "FT8 SLOT:",
                    slotPack.slotId
                );

                console.log(
                    "DECODES:",
                    slotPack.frames?.length
                );


                for (
                    const frame of
                    slotPack.frames || []
                ) {

                    console.log(
                        "SNR:",
                        frame.snr,

                        "DT:",
                        frame.dt,

                        "FREQ:",
                        frame.freq,

                        "MESSAGE:",
                        frame.message
                    );
                }

            }

        }
    );


    ws.on(
        "close",
        (code, reason) => {

            console.log(
                "Connection closed:",
                code,
                reason.toString()
            );

        }
    );


    ws.on(
        "error",
        (error) => {

            console.error(
                "WebSocket error:",
                error.message
            );

        }
    );

}


connect()
    .catch(
        error => {

            console.error(
                "Fatal error:",
                error
            );

            process.exit(1);

        }
    );
