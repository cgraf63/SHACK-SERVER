import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "node:http";
import { spawn, type ChildProcessByStdio } from "node:child_process";
import type { Readable, Writable } from "node:stream";

import { shackSettings } from "../../config/settings.config.js";


let audioProcess:
    ChildProcessByStdio<null, Readable, Readable> | null = null;


const clients =
    new Set<WebSocket>();


/*
 * Other consumers of the RX audio on the server (CW decoder).
 * The capture runs while a browser listens OR a listener is subscribed.
 */
const listeners =
    new Set<(chunk: Buffer) => void>();

let restartTimer: ReturnType<typeof setTimeout> | null = null;

function consumers(): number {
    return clients.size + listeners.size;
}

function updateCapture(): void {
    if (consumers() > 0) startAudioCapture();
    else stopAudioCapture();
}

/* RX audio (S16_LE, mono, shackSettings.audio.sampleRate) for a server
   side consumer. Returns the unsubscribe function. */
export function subscribeAudio(listener: (chunk: Buffer) => void): () => void {
    listeners.add(listener);
    updateCapture();
    return () => {
        listeners.delete(listener);
        updateCapture();
    };
}

export function audioCaptureRunning(): boolean {
    return audioProcess !== null;
}

export function audioSettings(): { device: string; sampleRate: number; channels: number; enabled: boolean } {
    const { device, sampleRate, channels, enabled } = shackSettings.audio;
    return { device, sampleRate, channels, enabled };
}


function startAudioCapture(): void {

    if (audioProcess) {
        return;
    }

    if (!shackSettings.audio.enabled) {

        console.log(
            "AUDIO: disabled by configuration"
        );

        return;
    }

    const {
        device,
        sampleRate,
        channels
    } = shackSettings.audio;


    console.log(
        `AUDIO: starting capture ${device} ${sampleRate}Hz ${channels}ch`
    );


    const process =
        spawn(
            "arecord",
            [
                "-D", device,
                "-f", "S16_LE",
                "-r", String(sampleRate),
                "-c", String(channels),
                "-t", "raw"
            ],
            {
                stdio: [
                    "ignore",
                    "pipe",
                    "pipe"
                ]
            }
        );

    audioProcess = process;


    process.stdout.on(
        "data",
        (chunk: Buffer) => {

            for (const listener of listeners) {
                try {
                    listener(chunk);
                }
                catch (error) {
                    console.error("AUDIO: listener error", error);
                }
            }

            for (const client of clients) {

                if (
                    client.readyState ===
                    WebSocket.OPEN
                ) {

                    client.send(chunk);

                }

            }

        }
    );


    process.stderr.on(
        "data",
        (chunk: Buffer) => {

            const message =
                chunk.toString().trim();

            if (message) {
                console.log(
                    `AUDIO: ${message}`
                );
            }

        }
    );


    process.on(
        "error",
        (error) => {

            console.error(
                "AUDIO: capture error",
                error
            );

            audioProcess = null;

        }
    );


    process.on(
        "close",
        (code, signal) => {

            console.log(
                `AUDIO: capture stopped (code=${code}, signal=${signal})`
            );

            audioProcess = null;

            // still wanted (e.g. the transceiver was switched off): retry
            if (consumers() > 0 && !restartTimer) {
                restartTimer = setTimeout(() => {
                    restartTimer = null;
                    if (consumers() > 0) startAudioCapture();
                }, 5000);
            }

        }
    );

}


function stopAudioCapture(): void {

    if (restartTimer) {
        clearTimeout(restartTimer);
        restartTimer = null;
    }

    if (!audioProcess) {
        return;
    }

    console.log(
        "AUDIO: stopping capture"
    );

    audioProcess.kill("SIGTERM");

}


export function startAudioWebSocket(
    server: Server
): void {

    startTxAudioWebSocket(server);


    const wss =
        new WebSocketServer({
            noServer: true
        });

    server.on("upgrade", (request, socket, head) => {
        const pathname = new URL(
            request.url ?? "/",
            "http://localhost"
        ).pathname;

        if (pathname !== "/audio") {
            return;
        }

        wss.handleUpgrade(request, socket, head, (ws) => {
            wss.emit("connection", ws, request);
        });
    });


    wss.on(
        "connection",
        (socket) => {

            console.log(
                "AUDIO WS: client connected"
            );


            clients.add(socket);


            updateCapture();


            socket.on(
                "close",
                () => {

                    clients.delete(socket);


                    console.log(
                        "AUDIO WS: client disconnected"
                    );


                    updateCapture();

                }
            );


            socket.on(
                "error",
                () => {

                    clients.delete(socket);

                    updateCapture();

                }
            );

        }
    );


    console.log(
        "AUDIO WS: listening on /audio"
    );

}


/* SHACK-SERVER TX AUDIO */

let txAudioProcess:
    ChildProcessByStdio<Writable, null, Readable> | null = null;

const txClients =
    new Set<WebSocket>();


function startTxAudio(): void {

    if (txAudioProcess) {
        return;
    }

    if (!shackSettings.audio.enabled) {

        console.log(
            "TX AUDIO: disabled by configuration"
        );

        return;
    }

    const {
        device,
        sampleRate,
        channels
    } = shackSettings.audio;


    console.log(
        `TX AUDIO: starting playback ${device} ${sampleRate}Hz ${channels}ch`
    );


    const process =
        spawn(
            "aplay",
            [
                "-D", device,
                "-f", "S16_LE",
                "-r", String(sampleRate),
                "-c", String(channels),
                "-t", "raw"
            ],
            {
                stdio: [
                    "pipe",
                    "ignore",
                    "pipe"
                ]
            }
        );


    txAudioProcess = process;


    process.stderr.on(
        "data",
        (chunk: Buffer) => {

            const message =
                chunk.toString().trim();

            if (message) {
                console.log(
                    `TX AUDIO: ${message}`
                );
            }

        }
    );


    process.on(
        "error",
        (error) => {

            console.error(
                "TX AUDIO: playback error",
                error
            );

            txAudioProcess = null;

        }
    );


    process.on(
        "close",
        (code, signal) => {

            console.log(
                `TX AUDIO: playback stopped (code=${code}, signal=${signal})`
            );

            txAudioProcess = null;

        }
    );

}


/* TX audio of a remote page running (browser microphone) */
export function txAudioBusy(): boolean {
    return txAudioProcess !== null;
}


function stopTxAudio(): void {

    if (!txAudioProcess) {
        return;
    }

    console.log(
        "TX AUDIO: stopping playback"
    );

    txAudioProcess.kill("SIGTERM");

    txAudioProcess = null;

}


function handleTxAudioData(
    data: Buffer
): void {

    if (!txAudioProcess) {
        startTxAudio();
    }

    if (
        txAudioProcess &&
        txAudioProcess.stdin &&
        !txAudioProcess.stdin.destroyed
    ) {

        txAudioProcess.stdin.write(data);

    }

}


function startTxAudioWebSocket(
    server: Server
): void {

    const wss =
        new WebSocketServer({
            noServer: true
        });

    server.on("upgrade", (request, socket, head) => {
        const pathname = new URL(
            request.url ?? "/",
            "http://localhost"
        ).pathname;

        if (pathname !== "/audio-tx") {
            return;
        }

        wss.handleUpgrade(request, socket, head, (ws) => {
            wss.emit("connection", ws, request);
        });
    });


    wss.on(
        "connection",
        (socket) => {

            console.log(
                "TX AUDIO WS: client connected"
            );


            /*
             * Only one TX audio source at a time.
             */
            if (txClients.size > 0) {

                console.log(
                    "TX AUDIO WS: rejecting additional client"
                );

                socket.close(
                    1013,
                    "TX audio already in use"
                );

                return;

            }


            txClients.add(socket);


            socket.on(
                "message",
                (data, isBinary) => {

                    if (!isBinary) {
                        return;
                    }

                    handleTxAudioData(
                        Buffer.from(data as Buffer)
                    );

                }
            );


            socket.on(
                "close",
                () => {

                    txClients.delete(socket);

                    console.log(
                        "TX AUDIO WS: client disconnected"
                    );

                    if (txClients.size === 0) {
                        stopTxAudio();
                    }

                }
            );


            socket.on(
                "error",
                () => {

                    txClients.delete(socket);

                    if (txClients.size === 0) {
                        stopTxAudio();
                    }

                }
            );

        }
    );


    console.log(
        "TX AUDIO WS: listening on /audio-tx"
    );

}


/*
 * Start TX WebSocket alongside the existing RX WebSocket.
 */

