import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "node:http";
import { spawn, type ChildProcessByStdio } from "node:child_process";
import type { Readable, Writable } from "node:stream";

const clients = new Set<WebSocket>();

const SDR_BINARY =
    "/home/admin/SHACK-SERVER/src/services/sdr/native/shack-sdr";

const FFT_SIZE = 8192;
/*
 * Frame length is parsed from the stream header:
 * uint16 bins + bins * float32 (+ float32 center on sweep frames).
 */

/*
 * The native SDR process produces FFT frames much faster
 * than a browser waterfall needs.
 *
 * Limit the WebSocket stream to approximately 25 FPS.
 */
const STREAM_INTERVAL_MS = 40;
let lastBroadcastTime = 0;

let sdrProcess: ChildProcessByStdio<Writable, Readable, Readable> | null = null;
let rxBuffer = Buffer.alloc(0);

function broadcastSpectrum(frame: Buffer): void {

    for (const client of clients) {

        if (client.readyState !== WebSocket.OPEN) {
            continue;
        }

        client.send(frame);
    }
}

function processSdrData(data: Buffer): void {

    rxBuffer = Buffer.concat([
        rxBuffer,
        data
    ]);

    for (;;) {

        if (rxBuffer.length < 2) {
            break;
        }

        const bins =
            rxBuffer.readUInt16LE(0);

        if (bins === 0 || bins > 65535) {
            console.error(
                `SDR WS: invalid bin count ${bins}`
            );
            rxBuffer = Buffer.alloc(0);
            break;
        }

        /*
         * Sweep frames (512 bins) carry the hop's
         * center frequency as trailing float32.
         */
        const frameLen =
            2 + bins * 4 + (bins === 512 ? 4 : 0);

        if (rxBuffer.length < frameLen) {
            break;
        }

        const frame =
            rxBuffer.subarray(
                0,
                frameLen
            );

        rxBuffer =
            rxBuffer.subarray(
                frameLen
            );

        const now = Date.now();

        if (now - lastBroadcastTime < STREAM_INTERVAL_MS) {
            continue;
        }

        lastBroadcastTime = now;
        broadcastSpectrum(frame);
    }
}

function startSdrProcess(): void {

    if (sdrProcess) {
        return;
    }

    console.log(
        "SDR: starting native SDR process"
    );

    const child =
        spawn(
            SDR_BINARY,
            [],
            {
                stdio: [
                    "pipe",
                    "pipe",
                    "pipe"
                ]
            }
        );

    sdrProcess = child;

    child.stdout.on(
        "data",
        (data: Buffer) => {
            processSdrData(data);
        }
    );

    child.stderr.on(
        "data",
        (data: Buffer) => {

            const message =
                data.toString().trim();

            if (message) {
                console.log(
                    `[SDR] ${message}`
                );
            }
        }
    );

    child.on(
        "error",
        (error) => {

            console.error(
                "SDR: native process error:",
                error
            );

            sdrProcess = null;
            rxBuffer = Buffer.alloc(0);
        }
    );

    child.on(
        "exit",
        (code, signal) => {

            console.log(
                `SDR: native process exited code=${code} signal=${signal}`
            );

            sdrProcess = null;
            rxBuffer = Buffer.alloc(0);
        }
    );
}

function stopSdrProcess(): void {

    if (!sdrProcess) {
        return;
    }

    console.log(
        "SDR: stopping native SDR process"
    );

    sdrProcess.kill("SIGTERM");
    sdrProcess = null;
}

export function startSdrWebSocket(server: Server): void {

    const wss =
        new WebSocketServer({
            noServer: true
        });

    server.on(
        "upgrade",
        (request, socket, head) => {

            const pathname =
                new URL(
                    request.url ?? "/",
                    "http://localhost"
                ).pathname;

            if (pathname !== "/sdr") {
                return;
            }

            wss.handleUpgrade(
                request,
                socket,
                head,
                (ws) => {

                    wss.emit(
                        "connection",
                        ws,
                        request
                    );
                }
            );
        }
    );

    wss.on(
        "connection",
        (socket) => {

            console.log(
                "SDR WS: client connected"
            );

            clients.add(socket);

            console.log(
                `SDR WS: clients=${clients.size}`
            );

            socket.send(
                JSON.stringify({
                    type: "sdr-status",
                    status: "connected"
                })
            );

            /*
             * Start RSP1B when the first browser
             * client connects.
             */
            if (clients.size === 1) {
                console.log("SDR WS: first client -> starting SDR");
                startSdrProcess();
            }

            /*
             * JSON-Kommandos vom Browser an den
             * nativen SDR-Prozess weiterleiten.
             */
            socket.on(
                "message",
                (data) => {

                    if (!sdrProcess || !sdrProcess.stdin) {
                        return;
                    }

                    let text: string;

                    try {
                        text = data.toString();
                    } catch (_) {
                        return;
                    }

                    let command: any;

                    try {
                        command = JSON.parse(text);
                    } catch (_) {
                        return;
                    }

                    let line: string | null = null;

                    switch (command.type) {

                        case "center":
                        case "tune":
                            if (typeof command.freq === "number") {
                                line = `freq ${command.freq}\n`;
                            }
                            break;

                        case "gain": {
                            const grdb =
                                typeof command.if === "number"
                                    ? command.if
                                    : 40;
                            const lna =
                                typeof command.lna === "number"
                                    ? command.lna
                                    : 0;
                            line = `gain ${grdb} ${lna}\n`;
                            break;
                        }

                        case "start":
                            if (typeof command.sample_rate === "number") {
                                line = `fs ${command.sample_rate}\n`;
                            }
                            break;

                        case "scan":
                            if (
                                typeof command.start === "number" &&
                                typeof command.stop === "number" &&
                                typeof command.step === "number"
                            ) {
                                line = `sweep ${command.start} ${command.stop} ${command.step}\n`;
                            }
                            break;

                        case "scan_stop":
                            line = "sweep_stop\n";
                            break;

                        case "stop":
                            /*
                             * Stream-Stop nicht an das Geraet
                             * durchreichen; der Prozess dient
                             * allen verbundenen Clients.
                             */
                            break;

                        default:
                            socket.send(
                                JSON.stringify({
                                    type: "info",
                                    text: `Command not supported: ${command.type}`
                                })
                            );
                            return;
                    }

                    if (line) {
                        sdrProcess.stdin.write(line);
                    }
                }
            );

            socket.on(
                "close",
                () => {

                    clients.delete(socket);

                    console.log(
                        "SDR WS: client disconnected"
                    );

                    /*
                     * Stop RSP1B when the last
                     * browser client disconnects.
                     */
                    if (clients.size === 0) {
                        stopSdrProcess();
                    }
                }
            );

            socket.on(
                "error",
                () => {

                    clients.delete(socket);

                    if (clients.size === 0) {
                        stopSdrProcess();
                    }
                }
            );
        }
    );

    /*
     * Make sure PM2 shutdown also stops the
     * native SDR process.
     */
    process.once(
        "SIGINT",
        stopSdrProcess
    );

    process.once(
        "SIGTERM",
        stopSdrProcess
    );

    console.log(
        "SDR WS: listening on /sdr"
    );
}
