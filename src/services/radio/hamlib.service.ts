import { spawn, ChildProcess } from "node:child_process";
import net from "node:net";

import type { RadioService } from "./radio.interface.js";

/*
 * Hamlib driver (rigctld)
 *
 * Hamlib supports several hundred transceivers. This driver talks to a
 * rigctld daemon over TCP using the rigctld text protocol:
 *
 *   f            -> "14074000"            frequency (Hz)
 *   m            -> "USB" + "2400"        mode + passband
 *   t            -> "0" / "1"             PTT
 *   F 14074000   -> "RPRT 0"
 *   M USB 0      -> "RPRT 0"
 *   T 1          -> "RPRT 0"
 *   errors       -> "RPRT -n"
 *
 * Two ways to run:
 *
 *   managed  (connection "serial", default)
 *     SHACK-SERVER starts its own rigctld for the transceiver:
 *       rigctld -m <model> -r <device> -s <baud> -T 127.0.0.1 -t <free port>
 *     and restarts it when it exits (transceiver off, USB unplugged, ...).
 *
 *   external (connection "network")
 *     Connect to an rigctld that is already running (e.g. shared with
 *     WSJT-X or a logging program, which cannot open the same serial
 *     port at the same time).
 *
 * Behaviour matches SerialRadioBase: automatic reconnect, errors logged
 * once, getLastError() for the connection test, stop() for reloads.
 */

export interface HamlibOptions {
    name: string;
    model: number;
    device: string;
    baudRate: number;
    connection: "serial" | "network";
    host: string;
    port: number;
    /* executable, overridable for tests */
    rigctld?: string;
    pollIntervalMs?: number;
    reconnectDelayMs?: number;
    commandTimeoutMs?: number;
}

interface PendingCommand {
    command: string;
    lines: number;              // expected answer lines (RPRT always ends)
    received: string[];
    resolve: (lines: string[]) => void;
    reject: (error: Error) => void;
    timer: ReturnType<typeof setTimeout> | null;
}

/* Hamlib error codes (RPRT -n) that mean "the transceiver does not answer" */
const RIG_TIMEOUT_CODES = new Set([5, 6]);

/* SHACK-SERVER mode -> Hamlib mode */
export function toHamlibMode(mode: string, frequency: number): string {

    const m = mode.trim().toUpperCase();

    switch (m) {
        case "SSB": return frequency < 10_000_000 ? "LSB" : "USB";
        case "USB": case "LSB": case "AM": case "FM": case "WFM": return m;
        case "CW": case "CW-U": case "CW-L": return "CW";
        case "CW-R": case "CWR": return "CWR";
        case "RTTY": case "RTTY-L": return "RTTY";
        case "RTTY-U": case "RTTYR": return "RTTYR";
        case "DATA-U": case "PKTUSB": case "FT8": case "FT4": case "DIGI": return "PKTUSB";
        case "DATA-L": case "PKTLSB": return "PKTLSB";
        case "DATA-FM": case "PKTFM": return "PKTFM";
        default: return m;
    }

}

/* Hamlib mode -> SHACK-SERVER mode (same names as the Yaesu drivers) */
export function fromHamlibMode(mode: string): string {

    const m = mode.trim().toUpperCase();

    switch (m) {
        case "CWR": return "CW-R";
        case "RTTYR": return "RTTY-U";
        case "PKTUSB": return "DATA-U";
        case "PKTLSB": return "DATA-L";
        case "PKTFM": return "DATA-FM";
        default: return m || "UNKNOWN";
    }

}


export class HamlibService implements RadioService {

    private readonly opts: Required<HamlibOptions>;

    private process: ChildProcess | null = null;
    private socket: net.Socket | null = null;
    private socketConnected = false;
    private tcpPort = 0;

    private buffer = "";
    private queue: PendingCommand[] = [];
    private current: PendingCommand | null = null;

    private vfoArg = "";            // " currVFO" when rigctld runs with --vfo

    private pollTimer: ReturnType<typeof setInterval> | null = null;
    private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    private stopped = true;
    private polling = false;

    private lastError = "";
    private lastLoggedError = "";
    private lastAnswerAt = 0;
    private processStderr = "";

    private frequency = 0;
    private mode = "UNKNOWN";
    private ptt = false;


    constructor(options: HamlibOptions) {

        this.opts = {
            rigctld: "rigctld",
            pollIntervalMs: 1000,
            reconnectDelayMs: 5000,
            commandTimeoutMs: 2500,
            ...options,
        };

    }


    /* ==================================================================
       Lifecycle
       ================================================================== */

    start(): void {

        if (this.opts.connection === "serial" && !this.opts.device) {
            console.log(`${this.opts.name}: no CAT device configured`);
            return;
        }

        this.stopped = false;
        this.connectOrSpawn();

    }

    stop(): void {

        this.stopped = true;

        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }

        this.stopPolling();
        this.closeSocket();
        this.killProcess();

    }

    /* Transceiver really answers (not just "TCP connected"). */
    isConnected(): boolean {

        return this.socketConnected &&
            Date.now() - this.lastAnswerAt < Math.max(5000, this.opts.pollIntervalMs * 4);

    }

    getLastError(): string {
        return this.isConnected() ? "" : this.lastError;
    }

    requestStatus(): void {
        void this.poll();
    }


    /* ==================================================================
       RadioService
       ================================================================== */

    getFrequency(): number { return this.frequency; }

    getMode(): string { return this.mode; }

    /* Output power in watts is not reliably available via Hamlib. */
    getPower(): number { return 0; }

    getTxState(): boolean { return this.ptt; }

    setFrequency(frequency: number): void {

        if (!Number.isFinite(frequency) || frequency <= 0) return;

        this.send(`F${this.vfoArg} ${Math.round(frequency)}`, 0)
            .then(() => { this.frequency = Math.round(frequency); })
            .catch(error => this.logError(`set frequency failed: ${error.message}`));

    }

    /* Used by POST /api/radio/frequency */
    setFrequencyA(frequency: number): void {
        this.setFrequency(frequency);
    }

    setMode(mode: string, frequency: number): void {

        const hamlibMode = toHamlibMode(mode, frequency || this.frequency);

        // passband 0 = the transceiver's normal filter for this mode
        this.send(`M${this.vfoArg} ${hamlibMode} 0`, 0)
            .then(() => { this.mode = fromHamlibMode(hamlibMode); })
            .catch(error => this.logError(`set mode failed: ${error.message}`));

    }

    setPtt(enabled: boolean): void {

        this.send(`T${this.vfoArg} ${enabled ? 1 : 0}`, 0)
            .then(() => { this.ptt = enabled; })
            .catch(error => this.logError(`PTT failed: ${error.message}`));

    }


    /* ==================================================================
       rigctld process (managed mode)
       ================================================================== */

    private connectOrSpawn(): void {

        if (this.stopped) return;

        if (this.opts.connection === "network") {
            this.connectSocket(this.opts.host || "127.0.0.1", this.opts.port || 4532);
            return;
        }

        void this.spawnRigctld();

    }

    private async spawnRigctld(): Promise<void> {

        if (this.process || this.stopped) return;

        this.tcpPort = await freeTcpPort();

        // stop() or a second start may have happened while waiting
        if (this.stopped || this.process) return;

        this.processStderr = "";

        const args = [
            "-m", String(this.opts.model),
            "-r", this.opts.device,
            // baud rate 0 = Hamlib's default for this model
            ...(this.opts.baudRate > 0 ? ["-s", String(this.opts.baudRate)] : []),
            "-T", "127.0.0.1",
            "-t", String(this.tcpPort),
        ];

        let child: ChildProcess;

        try {
            child = spawn(this.opts.rigctld, args, { stdio: ["ignore", "pipe", "pipe"] });
        }
        catch (error) {
            this.fail(`cannot start rigctld: ${(error as Error).message}`);
            this.scheduleReconnect();
            return;
        }

        this.process = child;

        const collect = (data: Buffer) => {
            this.processStderr = (this.processStderr + data.toString()).slice(-2000);
        };

        child.stdout?.on("data", collect);
        child.stderr?.on("data", collect);

        child.on("error", (error: NodeJS.ErrnoException) => {

            this.fail(
                error.code === "ENOENT"
                    ? "rigctld not found - Hamlib is not installed (sudo apt install libhamlib-utils)"
                    : `rigctld: ${error.message}`
            );

            // Process could not be started at all: no "exit" event follows.
            if (child.pid === undefined && this.process === child) {
                this.process = null;
                this.closeSocket();
                this.scheduleReconnect();
            }

        });

        child.on("exit", (code, signal) => {

            if (this.process !== child) return;
            this.process = null;

            this.closeSocket();
            this.stopPolling();

            if (this.stopped) return;

            if (!this.lastError || this.lastError.startsWith("rigctld exited")) {
                const detail = lastMeaningfulLine(this.processStderr);
                this.fail(
                    `rigctld exited (${signal ?? `code ${code}`})` +
                    (detail ? `: ${detail}` : "")
                );
            }

            this.scheduleReconnect();

        });

        // Give rigctld a moment to open the transceiver and the TCP port.
        this.connectSocket("127.0.0.1", this.tcpPort, 10);

    }

    private killProcess(): void {

        const child = this.process;
        this.process = null;

        if (child && child.exitCode === null) {
            child.kill("SIGTERM");
            setTimeout(() => {
                if (child.exitCode === null) child.kill("SIGKILL");
            }, 2000).unref();
        }

    }


    /* ==================================================================
       TCP connection
       ================================================================== */

    private connectSocket(host: string, port: number, retries = 0): void {

        if (this.stopped || this.socket) return;

        const socket = net.createConnection({ host, port });
        this.socket = socket;
        socket.setNoDelay(true);

        socket.on("connect", async () => {

            this.socketConnected = true;
            this.buffer = "";

            try {
                // rigctld started with --vfo needs a VFO argument on every command
                const [chk] = await this.send("\\chk_vfo", 1);
                this.vfoArg = /1\s*$/.test(chk ?? "") ? " currVFO" : "";
            }
            catch {
                this.vfoArg = "";
            }

            this.startPolling();

        });

        socket.on("data", (data: Buffer) => this.onData(data.toString()));

        socket.on("error", (error: NodeJS.ErrnoException) => {

            // managed rigctld is gone already: its exit handler takes over
            if (this.opts.connection === "serial" && !this.process) {
                this.socket = null;
                socket.destroy();
                return;
            }

            // rigctld still starting up: retry quietly
            if (error.code === "ECONNREFUSED" && retries > 0 && this.process) {
                this.socket = null;
                socket.destroy();
                setTimeout(() => this.connectSocket(host, port, retries - 1), 500).unref();
                return;
            }

            if (this.opts.connection === "network") {
                this.fail(`cannot connect to rigctld at ${host}:${port} (${error.code ?? error.message})`);
            }
            else if (error.code === "ECONNREFUSED") {
                const detail = lastMeaningfulLine(this.processStderr);
                this.fail(`rigctld does not accept connections${detail ? `: ${detail}` : ""}`);
                // terminate - the exit handler restarts rigctld
                this.process?.kill("SIGTERM");
            }

        });

        socket.on("close", () => {

            if (this.socket !== socket) return;

            this.socket = null;
            this.socketConnected = false;
            this.stopPolling();
            this.rejectAll(new Error("connection closed"));

            if (this.stopped) return;

            if (this.opts.connection === "network") {
                this.scheduleReconnect();
            }
            else if (this.process) {
                // managed rigctld still running (e.g. command timeout): reconnect
                setTimeout(() => this.connectSocket("127.0.0.1", this.tcpPort, 10), 500).unref();
            }
            // otherwise: the process exit handler restarts rigctld

        });

    }

    private closeSocket(): void {

        const socket = this.socket;
        this.socket = null;
        this.socketConnected = false;
        this.rejectAll(new Error("connection closed"));

        if (socket) {
            socket.destroy();
        }

    }

    private scheduleReconnect(): void {

        if (this.stopped || this.reconnectTimer) return;

        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            this.connectOrSpawn();
        }, this.opts.reconnectDelayMs);

    }


    /* ==================================================================
       Protocol
       ================================================================== */

    /*
     * Queue one command. lines = number of answer lines for a "get"
     * command; 0 for "set" commands (answer is a single "RPRT n").
     * Any "RPRT n" line ends the answer; n != 0 rejects.
     */
    private send(command: string, lines: number): Promise<string[]> {

        if (!this.socketConnected || !this.socket) {
            return Promise.reject(new Error("not connected"));
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
            cmd.reject(new Error(`no answer from rigctld to "${cmd.command}"`));

            // Stream out of sync: start over with a fresh connection.
            const socket = this.socket;
            if (socket) socket.destroy();

        }, this.opts.commandTimeoutMs);

        this.socket.write(cmd.command + "\n");

    }

    private onData(text: string): void {

        this.buffer += text;

        let index: number;

        while ((index = this.buffer.indexOf("\n")) >= 0) {

            const line = this.buffer.slice(0, index).replace(/\r$/, "");
            this.buffer = this.buffer.slice(index + 1);

            const cmd = this.current;
            if (!cmd) continue;     // unsolicited output: ignore

            const rprt = /^RPRT (-?\d+)$/.exec(line.trim());

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

    private finish(cmd: PendingCommand, code: number): void {

        if (cmd.timer) clearTimeout(cmd.timer);
        this.current = null;

        if (code === 0) {
            cmd.resolve(cmd.received);
        }
        else {
            const error = new Error(`Hamlib error ${code}`) as Error & { hamlibCode?: number };
            error.hamlibCode = -code;
            cmd.reject(error);
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


    /* ==================================================================
       Polling
       ================================================================== */

    private startPolling(): void {

        this.stopPolling();
        void this.poll();
        this.pollTimer = setInterval(() => void this.poll(), this.opts.pollIntervalMs);

    }

    private stopPolling(): void {

        if (this.pollTimer) {
            clearInterval(this.pollTimer);
            this.pollTimer = null;
        }

    }

    private async poll(): Promise<void> {

        if (this.polling || !this.socketConnected) return;
        this.polling = true;

        try {

            const [freq] = await this.send(`f${this.vfoArg}`, 1);
            const hz = Number(String(freq ?? "").trim());
            if (Number.isFinite(hz) && hz > 0) this.frequency = hz;

            const [mode] = await this.send(`m${this.vfoArg}`, 2);
            if (mode) this.mode = fromHamlibMode(mode);

            try {
                const [ptt] = await this.send(`t${this.vfoArg}`, 1);
                this.ptt = String(ptt ?? "").trim() === "1";
            }
            catch {
                // some rigs cannot report PTT - not an error
            }

            this.lastAnswerAt = Date.now();

            if (this.lastError) {
                console.log(`${this.opts.name} connected (${this.describeTarget()})`);
            }
            this.lastError = "";
            this.lastLoggedError = "";

        }
        catch (error) {

            const code = (error as { hamlibCode?: number }).hamlibCode;

            if (code !== undefined && RIG_TIMEOUT_CODES.has(code)) {
                this.fail(`transceiver does not answer (Hamlib error -${code}: switched off or wrong settings?)`);
            }
            else if (code !== undefined) {
                this.fail(`Hamlib error -${code}`);
            }
            // connection errors are reported by the socket/process handlers

        }
        finally {

            this.polling = false;

        }

    }


    /* ==================================================================
       Helpers
       ================================================================== */

    private describeTarget(): string {

        return this.opts.connection === "network"
            ? `rigctld ${this.opts.host || "127.0.0.1"}:${this.opts.port || 4532}`
            : `model ${this.opts.model}, ${this.opts.device} @ ${this.opts.baudRate || "model default"}`;

    }

    private fail(message: string): void {

        this.lastError = message;
        this.logError(message);

    }

    /* Log each different error once, not every few seconds. */
    private logError(message: string): void {

        if (message === this.lastLoggedError) return;
        this.lastLoggedError = message;

        console.error(`${this.opts.name}: ${message} - ${this.describeTarget()}`);

    }

}


/* ---------------------------------------------------------------------- */

/* Ask the OS for a free local TCP port. */
function freeTcpPort(): Promise<number> {

    return new Promise((resolve, reject) => {

        const server = net.createServer();
        server.unref();
        server.on("error", reject);
        server.listen(0, "127.0.0.1", () => {
            const address = server.address();
            const port = typeof address === "object" && address ? address.port : 0;
            server.close(() => resolve(port));
        });

    });

}

/*
 * Most useful part of rigctld's output for the user.
 * rigctld prints the concrete cause first and a generic summary last:
 *   serial_open: Unable to open /dev/ttyUSB0 - No such file or directory
 *   rig_open: error = IO error
 * So the concrete OS error wins; otherwise the error lines are joined.
 */
function lastMeaningfulLine(output: string): string {

    const lines = output
        .split(/\r?\n/)
        .map(l => l.trim())
        .filter(Boolean);

    const specific = lines.filter(l =>
        /no such file|permission denied|busy|cannot lock|timed out/i.test(l)
    );

    if (specific.length) {
        return specific[specific.length - 1]!;
    }

    const important = lines.filter(l =>
        /error|fail|unable|cannot|denied|invalid/i.test(l)
    );

    return (important.length ? important : lines).slice(-2).join(" / ");

}
