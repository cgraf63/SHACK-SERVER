import {
    ClusterSource
} from "./sources.config.js";

import {
    SourceStatusService
} from "./source-status.service.js";

import net from "node:net";

import {
    FusionEngine
} from "../fusion/fusion-engine.js";

import {
    DXSpiderParser
} from "./dxspider.parser.js";

import {
    systemLog
} from "../diagnostics/system-log.service.js";


/*
 * DXSpider telnet connection with automatic reconnect.
 *
 * - reconnects after the cluster closes the connection or on errors
 *   (5 s, 10 s, 20 s ... max. 5 min)
 * - TCP keepalive: notices connections a router dropped silently
 * - watchdog: no data for 15 minutes -> reconnect (a cluster
 *   normally sends spots every few seconds)
 */

const RECONNECT_START_MS = 5_000;
const RECONNECT_MAX_MS = 5 * 60_000;
const SILENCE_LIMIT_MS = 15 * 60_000;

export class DXSpiderConnector {

    private socket:
        net.Socket | undefined;

    private parser:
        DXSpiderParser;

    /* disconnect() was called: do not reconnect */
    private stopped = false;

    private reconnectTimer: NodeJS.Timeout | undefined;
    private watchdogTimer: NodeJS.Timeout | undefined;
    private reconnectDelay = RECONNECT_START_MS;
    private lastDataAt = 0;

    /* first lines after connecting (greeting, login answer, errors) */
    private greetingLines = 0;

    constructor(
        private config: ClusterSource,
        fusionEngine: FusionEngine,
        private sourceStatus:
            SourceStatusService
    ) {

        this.parser =
            new DXSpiderParser(
                this.config,
                fusionEngine,
                config.name,
                sourceStatus
            );

    }


    connect() {

        this.stopped = false;

        this.open();

        if (!this.watchdogTimer) {
            this.watchdogTimer =
                setInterval(() => this.checkSilence(), 60_000);
        }

    }


    private open() {

        if (this.stopped) {
            return;
        }

        if (
            this.config.host === undefined ||
            this.config.port === undefined
        ) {

            systemLog.error(
                this.config.name,
                "DXSpider",
                "Host or port is missing"
            );

            return;

        }

        this.closeSocket();

        systemLog.info(
            this.config.name,
            "DXSpider",
            `Connecting to ${this.config.host}:${this.config.port}`
        );

        const socket =
            new net.Socket();

        this.socket = socket;
        this.lastDataAt = Date.now();
        this.greetingLines = 0;

        socket.setKeepAlive(true, 60_000);

        socket.connect(
            this.config.port,
            this.config.host,
            () => {

                systemLog.info(
                    this.config.name,
                    "DXSpider",
                    "Connected"
                );

                this.login();

            }
        );

        socket.on(
            "data",
            data => {

                const text =
                    data.toString();

                this.lastDataAt = Date.now();

                /* data again: next reconnect starts with a short delay */
                this.reconnectDelay = RECONNECT_START_MS;

                /*
                 * Receiving data means the cluster delivers - the source
                 * status is updated here, not only after parsing.
                 */
                this.sourceStatus.touch(
                    this.config.name
                );

                /*
                 * Log what the cluster says right after connecting
                 * (login prompt, "already connected", errors) - spots
                 * themselves are not logged.
                 */
                if (this.greetingLines < 15) {
                    for (const line of text.split(/\r?\n/)) {
                        const trimmed = line.trim();
                        if (!trimmed || /^DX de /i.test(trimmed) || this.greetingLines >= 15) {
                            continue;
                        }
                        this.greetingLines++;
                        console.log(`${this.config.name} < ${trimmed}`);
                    }
                }

                this.parser.parse(
                    text
                );

            }
        );

        socket.on(
            "close",
            () => {

                if (this.socket !== socket) {
                    return;          // an old socket, already replaced
                }

                this.socket = undefined;

                if (this.stopped) {
                    return;
                }

                systemLog.warn(
                    this.config.name,
                    "DXSpider",
                    `Disconnected by ${this.config.host} - reconnecting in ` +
                    `${Math.round(this.reconnectDelay / 1000)} s`
                );

                this.scheduleReconnect();

            }
        );

        socket.on(
            "error",
            error => {

                systemLog.error(
                    this.config.name,
                    "DXSpider",
                    error.message
                );

                /* "close" follows and reconnects */

            }
        );

    }


    private scheduleReconnect() {

        if (this.stopped || this.reconnectTimer) {
            return;
        }

        const delay = this.reconnectDelay;

        this.reconnectDelay =
            Math.min(RECONNECT_MAX_MS, this.reconnectDelay * 2);

        this.reconnectTimer =
            setTimeout(() => {
                this.reconnectTimer = undefined;
                this.open();
            }, delay);

    }


    /* Connected but nothing received for a long time: reconnect. */
    private checkSilence() {

        if (
            this.stopped ||
            !this.socket ||
            Date.now() - this.lastDataAt < SILENCE_LIMIT_MS
        ) {
            return;
        }

        systemLog.warn(
            this.config.name,
            "DXSpider",
            `No data for ${Math.round(SILENCE_LIMIT_MS / 60_000)} min - reconnecting`
        );

        const socket = this.socket;

        this.socket = undefined;
        socket.destroy();

        this.scheduleReconnect();

    }


    private closeSocket() {

        if (this.socket) {
            const socket = this.socket;
            this.socket = undefined;
            socket.destroy();
        }

    }


    private login() {

        if (
            !this.socket
        ) {
            return;
        }

        this.socket.write(
            `${this.config.callsign}\r\n`
        );

        if (
            this.config.password
        ) {

            this.socket.write(
                `${this.config.password}\r\n`
            );

        }

        systemLog.info(
            this.config.name,
            "DXSpider",
            "Login credentials sent"
        );

    }


    disconnect() {

        this.stopped = true;

        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = undefined;
        }

        if (this.watchdogTimer) {
            clearInterval(this.watchdogTimer);
            this.watchdogTimer = undefined;
        }

        if (this.socket) {

            systemLog.info(
                this.config.name,
                "DXSpider",
                "Disconnect requested"
            );

            this.closeSocket();

        }

    }

}
