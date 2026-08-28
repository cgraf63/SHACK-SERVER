import WebSocket from "ws";


export interface FT8Frame {

    snr: number;
    dt: number;
    freq: number;
    message: string;

}


class TX5DRService {

    private ws: WebSocket | null = null;

    private connected = false;

    private authenticated = false;

    private handshakeComplete = false;

    private reconnectTimer:
        NodeJS.Timeout | null = null;

    private reconnectDelay = 5000;

    private frames: FT8Frame[] = [];

    private readonly maxFrames = 200;


    start(): void {

        console.log(
            "[TX5DR] Starting FT8 client"
        );

        this.connect();

    }


    private async getJWT():

        Promise<string | null> {

        try {

            const tokenFile =
                await import("node:fs/promises");


            const token =
                (
                    await tokenFile.readFile(
                        "/home/admin/tx5dr/app/data/config/.admin-token",
                        "utf8"
                    )
                ).trim();


            const response =
                await fetch(
                    "http://127.0.0.1:8076/api/auth/login",
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body:
                            JSON.stringify({
                                token
                            })
                    }
                );


            if (!response.ok) {

                console.error(
                    "[TX5DR] JWT login failed:",
                    response.status
                );

                return null;

            }


            const data: any =
                await response.json();


            if (!data.jwt) {

                console.error(
                    "[TX5DR] No JWT received"
                );

                return null;

            }


            console.log(
                "[TX5DR] JWT obtained, length:",
                data.jwt.length
            );


            return data.jwt;

        }

        catch (error) {

            console.error(
                "[TX5DR] Could not obtain JWT:",
                error
            );

            return null;

        }

    }


    private async connect(): Promise<void> {

        if (
            this.ws &&
            (
                this.ws.readyState ===
                    WebSocket.OPEN ||

                this.ws.readyState ===
                    WebSocket.CONNECTING
            )
        ) {

            return;

        }


        console.log(
            "[TX5DR] Connecting to TX-5DR..."
        );


        const jwt =
            await this.getJWT();


        if (!jwt) {

            this.scheduleReconnect();

            return;

        }


        this.ws =
            new WebSocket(
                "ws://127.0.0.1:8076/api/ws"
            );


        this.ws.on(
            "open",

            () => {

                console.log(
                    "[TX5DR] WebSocket connected"
                );

                this.connected = true;

            }
        );


        this.ws.on(
            "message",

            (raw) => {

                this.handleMessage(
                    raw.toString(),
                    jwt
                );

            }
        );


        this.ws.on(
            "close",

            (code, reason) => {

                console.log(
                    "[TX5DR] Connection closed:",
                    code,
                    reason.toString()
                );


                this.connected = false;

                this.authenticated = false;

                this.handshakeComplete = false;

                this.ws = null;

                this.scheduleReconnect();

            }
        );


        this.ws.on(
            "error",

            (error) => {

                console.error(
                    "[TX5DR] WebSocket error:",
                    error.message
                );

            }
        );

    }


    private handleMessage(

        raw: string,

        jwt: string

    ): void {

        let message: any;


        try {

            message =
                JSON.parse(raw);

        }

        catch {

            console.log(
                "[TX5DR] RAW:",
                raw
            );

            return;

        }



        switch (message.type) {


            case "authRequired":

                console.log(
                    "[TX5DR] Authentication required"
                );


                this.send({

                    type: "authToken",

                    data: {
                        jwt
                    }

                });

                break;


            case "authResult":

                console.log(
                    "[TX5DR] AUTH RESULT:",
                    message.data
                );


                if (
                    message.data?.success
                ) {

                    console.log(
                        "[TX5DR] Authentication successful"
                    );

                    this.authenticated = true;

                    this.sendHandshake();

                }

                else {

                    console.error(
                        "[TX5DR] Authentication failed:",
                        message.data
                    );

                }

                break;


            case "serverHandshakeComplete":

                console.log(
                    "[TX5DR] Handshake complete"
                );

                this.handshakeComplete = true;

                break;


            case "slotPackUpdated":

                this.handleSlotPack(
                    message.data
                );

                break;


            default:

                break;

        }

    }


    private sendHandshake(): void {

        this.send({

            type: "clientHandshake",

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

            }

        });

    }


    private send(
        data: any
    ): void {

        if (
            !this.ws ||
            this.ws.readyState !==
                WebSocket.OPEN
        ) {

            console.error(
                "[TX5DR] Cannot send, WebSocket not open"
            );

            return;

        }


        const message = {

            ...data,

            timestamp:
                new Date()
                    .toISOString()

        };


        console.log(
            "[TX5DR] TX:",
            message.type
        );


        this.ws.send(
            JSON.stringify(message)
        );

    }


    private handleSlotPack(
        slotPack: any
    ): void {

        if (
            !slotPack?.frames ||
            !Array.isArray(
                slotPack.frames
            )
        ) {

            console.log(
                "[TX5DR] Invalid slot pack"
            );

            return;

        }


        const newFrames:

            FT8Frame[] =

            slotPack.frames

                .filter(
                    (frame: any) =>

                        typeof frame.message ===
                            "string"
                )

                .map(
                    (frame: any) => ({

                        snr:
                            Number(frame.snr),

                        dt:
                            Number(frame.dt),

                        freq:
                            Number(frame.freq),

                        message:
                            frame.message

                    })
                );


        this.frames =
            newFrames;


        if (
            this.frames.length >
            this.maxFrames
        ) {

            this.frames =
                this.frames.slice(
                    0,
                    this.maxFrames
                );

        }


        console.log(

            `[TX5DR] FT8 slot received: ` +

            `${this.frames.length} decodes`

        );

    }


    getFrames():
        FT8Frame[] {

        return this.frames;

    }


    getStatus() {

        return {

            connected:
                this.connected,

            authenticated:
                this.authenticated,

            handshakeComplete:
                this.handshakeComplete,

            frameCount:
                this.frames.length

        };

    }


    private scheduleReconnect():

        void {

        if (
            this.reconnectTimer
        ) {

            return;

        }


        console.log(

            `[TX5DR] Reconnecting in ` +

            `${this.reconnectDelay / 1000}s`

        );


        this.reconnectTimer =
            setTimeout(

                () => {

                    this.reconnectTimer =
                        null;

                    this.connect();

                },

                this.reconnectDelay

            );

    }

}


export const tx5drService =
    new TX5DRService();
