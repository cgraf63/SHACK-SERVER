import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "node:http";
import { execFileSync, spawn, type ChildProcessByStdio } from "node:child_process";
import type { Readable, Writable } from "node:stream";
import { SDR_BINARY } from "./sdr-binary.js";

const clients = new Set<WebSocket>();


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

/*
 * The RSP1B runs only while it is needed - the native process takes a
 * whole CPU core while streaming:
 *   - every connected page "wants" the SDR, unless it sent "sdr_stop"
 *     (DISCONNECT on /sdr, or a remote page hidden for 60 s)
 *   - nobody wants it any more: stop at once after "sdr_stop", 60 s
 *     after the last page closed (a reload does not restart it)
 *   - a FULL SCAN keeps it running (until scan_stop, at most 15 min)
 */
const IDLE_STOP_MS = 60_000;
const SWEEP_MAX_MS = 15 * 60_000;
const KILL_AFTER_MS = 5_000;

const wanting = new WeakMap<WebSocket, boolean>();
let idleTimer: NodeJS.Timeout | null = null;
let sweepUntil = 0;
let stopping: Promise<void> | null = null;
let orphansChecked = false;

function wantedBy(): number {
    let count = 0;
    for (const client of clients) {
        if (wanting.get(client) !== false) count++;
    }
    return count;
}

function sweepRunning(): boolean {
    return sweepUntil > Date.now();
}

export function sdrStatus() {
    return {
        running: !!sdrProcess,
        pid: sdrProcess?.pid ?? null,
        clients: clients.size,
        wantedBy: wantedBy(),
        sweep: sweepRunning(),
        autoStopInSeconds: idleTimer ? Math.round(IDLE_STOP_MS / 1000) : null
    };
}

function broadcastStatus(): void {

    const status = sdrStatus();

    for (const client of clients) {
        if (client.readyState !== WebSocket.OPEN) continue;
        client.send(JSON.stringify({
            type: "sdr-status",
            status: status.running ? "running" : "stopped",
            wanted: wanting.get(client) !== false,
            clients: status.clients,
            wantedBy: status.wantedBy,
            sweep: status.sweep
        }));
    }

}

/* a shack-sdr left over from an earlier server run (would block the RSP1B) */
function killOrphans(): void {

    if (orphansChecked) return;
    orphansChecked = true;

    try {
        execFileSync("pkill", ["-x", "shack-sdr"], { stdio: "ignore", timeout: 3000 });
        console.log("SDR: stopped a leftover shack-sdr process");
    }
    catch {
        // none running (pkill exit 1)
    }

}

let starting = false;

async function startSdrProcess(): Promise<void> {

    if (starting || sdrProcess) return;

    starting = true;

    try {
        if (stopping) await stopping;
    }
    finally {
        starting = false;
    }

    // stopped meanwhile by everybody, or started by another call
    if (sdrProcess || wantedBy() === 0) {
        return;
    }

    killOrphans();

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

    child.stdin.on("error", () => { /* process gone */ });

    child.on(
        "error",
        (error) => {

            console.error(
                "SDR: native process error:",
                error
            );

            if (sdrProcess === child) sdrProcess = null;
            rxBuffer = Buffer.alloc(0);
            broadcastStatus();
        }
    );

    child.on(
        "exit",
        (code, signal) => {

            console.log(
                `SDR: native process exited code=${code} signal=${signal}`
            );

            if (sdrProcess === child) sdrProcess = null;
            rxBuffer = Buffer.alloc(0);
            broadcastStatus();
        }
    );

    broadcastStatus();
}

/* SIGTERM, wait for the exit; SIGKILL when it hangs (SDRplay API) */
function stopSdrProcess(reason = ""): Promise<void> {

    if (idleTimer) {
        clearTimeout(idleTimer);
        idleTimer = null;
    }

    const child = sdrProcess;

    if (!child) {
        return stopping ?? Promise.resolve();
    }

    console.log(
        `SDR: stopping native SDR process${reason ? ` (${reason})` : ""}`
    );

    sdrProcess = null;
    sweepUntil = 0;

    stopping = new Promise<void>(resolve => {

        const done = () => {
            clearTimeout(killer);
            stopping = null;
            resolve();
        };

        const killer = setTimeout(() => {
            console.warn("SDR: native process did not stop - SIGKILL");
            try { child.kill("SIGKILL"); } catch { /* gone */ }
        }, KILL_AFTER_MS);

        if (child.exitCode !== null || child.signalCode !== null) {
            done();
            return;
        }

        child.once("exit", done);

        try { child.kill("SIGTERM"); } catch { done(); }

    });

    broadcastStatus();

    return stopping;
}

/* after every change: start, stop now, or stop in 60 s */
function updateSdr(trigger: "request" | "disconnect" | "connect"): void {

    if (wantedBy() > 0) {
        if (idleTimer) {
            clearTimeout(idleTimer);
            idleTimer = null;
        }
        void startSdrProcess();
        return;
    }

    if (!sdrProcess) return;

    if (sweepRunning()) {
        // FULL SCAN still running: check again later
        if (!idleTimer) {
            idleTimer = setTimeout(() => {
                idleTimer = null;
                updateSdr("disconnect");
            }, Math.min(IDLE_STOP_MS, sweepUntil - Date.now() + 1000));
        }
        return;
    }

    if (trigger === "request") {
        void stopSdrProcess("stopped by the user");
        return;
    }

    if (!idleTimer) {
        console.log(`SDR: nobody uses the SDR - stopping in ${IDLE_STOP_MS / 1000} s`);
        idleTimer = setTimeout(() => {
            idleTimer = null;
            if (wantedBy() === 0 && !sweepRunning()) void stopSdrProcess("idle");
            else updateSdr("disconnect");
        }, IDLE_STOP_MS);
        broadcastStatus();
    }

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
        (socket, request: { url?: string }) => {

            console.log(
                "SDR WS: client connected"
            );

            clients.add(socket);

            console.log(
                `SDR WS: clients=${clients.size}`
            );

            /* "?standby=1": only status, the page was stopped (DISCONNECT) */
            const standby =
                new URL(request?.url ?? "/sdr", "http://localhost").searchParams.get("standby") === "1";

            wanting.set(socket, !standby);

            /* start the RSP1B (or keep it running) */
            updateSdr("connect");
            broadcastStatus();

            /*
             * JSON-Kommandos vom Browser an den
             * nativen SDR-Prozess weiterleiten.
             */
            socket.on(
                "message",
                (data) => {

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

                    /* CONNECT / DISCONNECT on /sdr, idle remote pages */
                    if (command.type === "sdr_stop" || command.type === "sdr_start") {
                        wanting.set(socket, command.type === "sdr_start");
                        updateSdr("request");
                        broadcastStatus();
                        if (command.type === "sdr_stop" && sdrProcess && wantedBy() > 0) {
                            socket.send(JSON.stringify({
                                type: "info",
                                text: `SDR keeps running - still used by ${wantedBy()} other page(s) (e.g. a remote page)`
                            }));
                        }
                        return;
                    }

                    if (command.type === "scan") sweepUntil = Date.now() + SWEEP_MAX_MS;
                    if (command.type === "scan_stop") sweepUntil = 0;

                    if (!sdrProcess || !sdrProcess.stdin) {
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
                        `SDR WS: client disconnected, clients=${clients.size}`
                    );

                    /* nobody left: stop in 60 s (a page reload does not restart the RSP1B) */
                    updateSdr("disconnect");
                    broadcastStatus();
                }
            );

            socket.on(
                "error",
                () => {

                    clients.delete(socket);
                    updateSdr("disconnect");
                }
            );
        }
    );

    /*
     * Make sure PM2 shutdown also stops the
     * native SDR process.
     */
    /*
     * pm2 stop / restart: stop the native SDR process too, then exit
     * (a signal listener would otherwise keep Node running until pm2
     * kills it - and leave shack-sdr behind).
     */
    const shutdown = () => {
        void stopSdrProcess("shutdown").finally(() => process.exit(0));
    };

    process.once("SIGINT", shutdown);
    process.once("SIGTERM", shutdown);

    console.log(
        "SDR WS: listening on /sdr"
    );
}
