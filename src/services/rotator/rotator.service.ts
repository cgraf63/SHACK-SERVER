import net from "node:net";
import { spawn, type ChildProcess } from "node:child_process";

import type { RotatorSettings } from "../../config/settings.config.js";
import { settingsService } from "../settings/settings.service.js";
import { systemLog } from "../diagnostics/system-log.service.js";
import { freeTcpPort, lastMeaningfulLine } from "../radio/hamlib.service.js";


/*
 * Antenna rotator via Hamlib rotctld (TCP text protocol, port 4533):
 *
 *   p            -> "<azimuth>\n<elevation>\n"   position
 *   P <az> <el>  -> "RPRT 0"                     turn
 *   S            -> "RPRT 0"                     stop
 *
 * serial:  SHACK-SERVER starts its own rotctld for the controller
 *          rotctld -m <model> -r <device> [-s <baud>] -T 127.0.0.1 -t <port>
 * network: connect to a rotctld that is already running
 *
 * Hamlib knows several dozen controllers (Yaesu GS-232A/B, SPID Rot2Prog,
 * Hy-Gain DCU-1, Prosistel, ERC, K3NG, ...). Model 1 = Dummy (simulation).
 */

const POLL_INTERVAL_MS = 1000;
const COMMAND_TIMEOUT_MS = 4000;
const RECONNECT_MS = 10_000;

/* Target reached when the antenna is within this many degrees. */
const ARRIVED_TOLERANCE = 3;


export interface RotatorStatus {
    enabled: boolean;
    connected: boolean;
    azimuth: number | null;
    elevation: number | null;
    target: number | null;
    moving: boolean;
    error: string;
}

interface Pending {
    command: string;
    lines: number;
    received: string[];
    resolve: (lines: string[]) => void;
    reject: (error: Error) => void;
    timer: NodeJS.Timeout | null;
}


/* ----------------------------------------------------------------------
 * One rotctld connection (own process or existing daemon)
 * ---------------------------------------------------------------------- */

export class RotctldConnection {

    private process: ChildProcess | null = null;
    private processOutput = "";
    private socket: net.Socket | null = null;
    private connected = false;
    private buffer = "";
    private queue: Pending[] = [];
    private current: Pending | null = null;
    private stopped = false;
    private reconnectTimer: NodeJS.Timeout | null = null;
    private tcpPort = 0;

    error = "";

    constructor(
        private readonly config: RotatorSettings,
        private readonly onConnected: () => void = () => {},
        private readonly autoReconnect = true
    ) {}

    isConnected(): boolean {
        return this.connected;
    }

    start(): void {

        this.stopped = false;

        if (this.config.connection === "network") {
            this.connectSocket(this.config.host, this.config.port);
        }
        else {
            void this.spawnRotctld();
        }

    }

    stop(): void {

        this.stopped = true;

        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }

        this.closeSocket();

        const child = this.process;
        this.process = null;

        if (child && child.exitCode === null) {
            child.kill("SIGTERM");
            setTimeout(() => {
                if (child.exitCode === null) child.kill("SIGKILL");
            }, 2000).unref();
        }

    }

    private fail(message: string): void {

        if (message !== this.error) {
            this.error = message;
            systemLog.warn("ROTATOR", "ROTATOR", message);
        }

    }

    private async spawnRotctld(): Promise<void> {

        if (this.process || this.stopped) return;

        if (!this.config.model || !this.config.device) {
            this.fail("Rotator model and serial port are required");
            return;
        }

        this.tcpPort = await freeTcpPort();

        if (this.stopped || this.process) return;

        this.processOutput = "";

        const args = [
            "-m", String(this.config.model),
            "-r", this.config.device,
            ...(this.config.baudRate > 0 ? ["-s", String(this.config.baudRate)] : []),
            "-T", "127.0.0.1",
            "-t", String(this.tcpPort)
        ];

        let child: ChildProcess;

        try {
            child = spawn("rotctld", args, { stdio: ["ignore", "pipe", "pipe"] });
        }
        catch (error) {
            this.fail(`cannot start rotctld: ${(error as Error).message}`);
            this.scheduleReconnect();
            return;
        }

        this.process = child;

        const collect = (data: Buffer) => {
            this.processOutput = (this.processOutput + data.toString()).slice(-2000);
        };

        child.stdout?.on("data", collect);
        child.stderr?.on("data", collect);

        child.on("error", (error: NodeJS.ErrnoException) => {

            this.fail(
                error.code === "ENOENT"
                    ? "rotctld not found - Hamlib is not installed (sudo apt install libhamlib-utils)"
                    : `rotctld: ${error.message}`
            );

            if (child.pid === undefined && this.process === child) {
                this.process = null;
                this.scheduleReconnect();
            }

        });

        child.on("exit", (code, signal) => {

            if (this.process !== child) return;

            this.process = null;
            this.closeSocket();

            if (this.stopped) return;

            const detail = lastMeaningfulLine(this.processOutput);

            this.fail(
                `rotctld exited (${signal ?? `code ${code}`})` +
                (detail ? `: ${detail}` : "")
            );

            this.scheduleReconnect();

        });

        this.connectSocket("127.0.0.1", this.tcpPort, 10);

    }

    private connectSocket(host: string, port: number, retries = 0): void {

        if (this.stopped || this.socket) return;

        const socket = net.createConnection({ host, port });

        this.socket = socket;
        socket.setNoDelay(true);

        socket.on("connect", () => {
            this.connected = true;
            this.buffer = "";
            this.error = "";
            this.onConnected();
        });

        socket.on("data", data => this.onData(data.toString()));

        socket.on("error", (error: NodeJS.ErrnoException) => {

            /* own rotctld still starting: retry quietly */
            if (error.code === "ECONNREFUSED" && retries > 0 && this.process) {
                this.socket = null;
                socket.destroy();
                setTimeout(() => this.connectSocket(host, port, retries - 1), 500).unref();
                return;
            }

            if (this.config.connection === "network") {
                this.fail(`cannot connect to rotctld at ${host}:${port} (${error.code ?? error.message})`);
            }
            else {
                const detail = lastMeaningfulLine(this.processOutput);
                this.fail(`rotctld does not accept connections${detail ? `: ${detail}` : ""}`);
                this.process?.kill("SIGTERM");
            }

        });

        socket.on("close", () => {

            if (this.socket !== socket) return;

            this.socket = null;
            this.connected = false;
            this.rejectAll(new Error("connection closed"));

            if (this.stopped) return;

            if (this.config.connection === "network") {
                this.scheduleReconnect();
            }
            else if (this.process) {
                setTimeout(() => this.connectSocket("127.0.0.1", this.tcpPort, 10), 500).unref();
            }

        });

    }

    private closeSocket(): void {

        const socket = this.socket;

        this.socket = null;
        this.connected = false;
        this.rejectAll(new Error("connection closed"));

        socket?.destroy();

    }

    private scheduleReconnect(): void {

        if (this.stopped || this.reconnectTimer || !this.autoReconnect) return;

        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            this.start();
        }, RECONNECT_MS);

    }

    /* lines = answer lines for a "get" command, 0 for "set" (RPRT n) */
    send(command: string, lines: number): Promise<string[]> {

        if (!this.connected || !this.socket) {
            return Promise.reject(new Error(this.error || "rotator not connected"));
        }

        return new Promise((resolve, reject) => {
            this.queue.push({ command, lines, received: [], resolve, reject, timer: null });
            this.next();
        });

    }

    private next(): void {

        if (this.current || !this.queue.length || !this.socket) return;

        const cmd = this.queue.shift()!;

        this.current = cmd;

        cmd.timer = setTimeout(() => {

            if (this.current !== cmd) return;

            this.current = null;
            cmd.reject(new Error(`no answer from rotctld to "${cmd.command}"`));
            this.socket?.destroy();

        }, COMMAND_TIMEOUT_MS);

        this.socket.write(cmd.command + "\n");

    }

    private onData(text: string): void {

        this.buffer += text;

        let index: number;

        while ((index = this.buffer.indexOf("\n")) >= 0) {

            const line = this.buffer.slice(0, index).replace(/\r$/, "").trim();
            this.buffer = this.buffer.slice(index + 1);

            const cmd = this.current;

            if (!cmd) continue;

            const rprt = /^RPRT (-?\d+)$/.exec(line);

            if (rprt) {
                this.finish(cmd, Number(rprt[1]));
                continue;
            }

            cmd.received.push(line);

            if (cmd.lines > 0 && cmd.received.length >= cmd.lines) {
                this.finish(cmd, 0);
            }

        }

    }

    private finish(cmd: Pending, code: number): void {

        if (cmd.timer) clearTimeout(cmd.timer);

        this.current = null;

        if (code === 0) {
            cmd.resolve(cmd.received);
        }
        else {
            cmd.reject(new Error(`Hamlib error ${code}`));
        }

        this.next();

    }

    private rejectAll(error: Error): void {

        const pending = [...(this.current ? [this.current] : []), ...this.queue];

        this.current = null;
        this.queue = [];

        for (const cmd of pending) {
            if (cmd.timer) clearTimeout(cmd.timer);
            cmd.reject(error);
        }

    }

    async getPosition(): Promise<{ azimuth: number; elevation: number }> {

        const [az, el] = await this.send("p", 2);

        const azimuth = Number(az);
        const elevation = Number(el);

        if (!Number.isFinite(azimuth)) {
            throw new Error(`unexpected answer from rotctld: ${az}`);
        }

        return {
            azimuth,
            elevation: Number.isFinite(elevation) ? elevation : 0
        };

    }

}


/* ----------------------------------------------------------------------
 * The station's rotator (from Settings → Rotator)
 * ---------------------------------------------------------------------- */

function normalizeAzimuth(value: number): number {

    const az = Math.round(Number(value)) % 360;

    return az < 0 ? az + 360 : az;

}


class RotatorService {

    private connection: RotctldConnection | null = null;
    private config: RotatorSettings | null = null;
    private pollTimer: NodeJS.Timeout | null = null;
    private polling = false;

    private azimuth: number | null = null;
    private elevation: number | null = null;
    private target: number | null = null;

    start(): void {

        settingsService.onUpdate(() => this.applySettings());
        this.applySettings();

    }

    private applySettings(): void {

        const wanted = settingsService.get().rotator;

        if (this.config && JSON.stringify(wanted) === JSON.stringify(this.config)) {
            return;
        }

        this.stopConnection();
        this.config = { ...wanted };

        if (!wanted.enabled) {
            return;
        }

        this.connection = new RotctldConnection(wanted, () => {
            systemLog.info("ROTATOR", "ROTATOR", "Rotator connected");
        });

        this.connection.start();

        this.pollTimer = setInterval(() => void this.poll(), POLL_INTERVAL_MS);

    }

    private stopConnection(): void {

        if (this.pollTimer) {
            clearInterval(this.pollTimer);
            this.pollTimer = null;
        }

        this.connection?.stop();
        this.connection = null;
        this.azimuth = null;
        this.elevation = null;
        this.target = null;

    }

    private async poll(): Promise<void> {

        if (this.polling || !this.connection?.isConnected()) {
            return;
        }

        this.polling = true;

        try {

            const position = await this.connection.getPosition();

            this.azimuth = position.azimuth;
            this.elevation = position.elevation;

            if (
                this.target !== null &&
                angleDistance(this.azimuth, this.target) <= ARRIVED_TOLERANCE
            ) {
                this.target = null;
            }

        }
        catch {
            // connection errors are reported by the connection itself
        }
        finally {
            this.polling = false;
        }

    }

    getStatus(): RotatorStatus {

        const enabled = Boolean(this.config?.enabled);
        const connected = Boolean(this.connection?.isConnected());

        return {
            enabled,
            connected,
            azimuth: this.azimuth === null ? null : Math.round(this.azimuth),
            elevation: this.elevation === null ? null : Math.round(this.elevation),
            target: this.target,
            moving: this.target !== null,
            error: enabled && !connected ? (this.connection?.error || "connecting...") : ""
        };

    }

    async turn(azimuth: number): Promise<RotatorStatus> {

        if (!this.connection?.isConnected()) {
            throw new Error(this.connection?.error || "Rotator not connected");
        }

        const target = normalizeAzimuth(azimuth);
        const elevation = Math.max(0, Math.round(this.elevation ?? 0));

        await this.connection.send(`P ${target} ${elevation}`, 0);

        this.target = target;

        systemLog.info("ROTATOR", "ROTATOR", `Turning to ${target}°`);

        return this.getStatus();

    }

    async stop(): Promise<RotatorStatus> {

        if (!this.connection?.isConnected()) {
            throw new Error(this.connection?.error || "Rotator not connected");
        }

        await this.connection.send("S", 0);

        this.target = null;

        systemLog.info("ROTATOR", "ROTATOR", "Stopped");

        return this.getStatus();

    }

}


function angleDistance(a: number, b: number): number {

    const diff = Math.abs(normalizeAzimuth(a) - normalizeAzimuth(b));

    return Math.min(diff, 360 - diff);

}


/*
 * Settings → Rotator → Test: start a temporary connection with the
 * entered values, read the position once.
 */
export async function testRotator(config: RotatorSettings): Promise<{ ok: boolean; message: string }> {

    const connection = new RotctldConnection(config, () => {}, false);

    try {

        connection.start();

        const deadline = Date.now() + 12_000;

        while (!connection.isConnected() && Date.now() < deadline) {

            if (connection.error && config.connection === "network") {
                break;
            }

            await new Promise(resolve => setTimeout(resolve, 250));

        }

        if (!connection.isConnected()) {
            return { ok: false, message: connection.error || "No connection to the rotator" };
        }

        const position = await connection.getPosition();

        return {
            ok: true,
            message: `Connected - antenna at ${Math.round(position.azimuth)}°`
        };

    }
    catch (error) {

        return {
            ok: false,
            message: connection.error || (error instanceof Error ? error.message : String(error))
        };

    }
    finally {

        connection.stop();

    }

}


export const rotatorService = new RotatorService();
