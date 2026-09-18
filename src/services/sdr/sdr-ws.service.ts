import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "node:http";
import { spawn, type ChildProcessByStdio } from "node:child_process";
import type { Readable } from "node:stream";

const clients = new Set<WebSocket>();

const SDR_BINARY =
    "/home/admin/SHACK-SERVER/src/services/sdr/native/shack-sdr";

const FFT_SIZE = 8192;
const FRAME_SIZE = 2 + (FFT_SIZE * 4);

/*
 * The native SDR process produces FFT frames much faster
 * than a browser waterfall needs.
 *
 * Limit the WebSocket stream to approximately 25 FPS.
 */
const STREAM_INTERVAL_MS = 40;
let lastBroadcastTime = 0;

let sdrProcess: ChildProcessByStdio<null, Readable, Readable> | null = null;
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

    while (rxBuffer.length >= FRAME_SIZE) {

        const frame =
            rxBuffer.subarray(
                0,
                FRAME_SIZE
            );

        rxBuffer =
            rxBuffer.subarray(
                FRAME_SIZE
            );

        /*
         * Native process format:
         *
         * uint16_t bins
         * float bins[2048]
         */
        const bins =
            frame.readUInt16LE(0);

        if (bins !== FFT_SIZE) {
            console.error(
                `SDR WS: invalid FFT size ${bins}`
            );
            continue;
        }

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
                    "ignore",
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
