import { SerialPort } from "serialport";

/*
 * SerialRadioBase
 *
 * Common serial-port lifecycle for all CAT drivers.
 * A driver only implements its protocol:
 *
 *   - onData(data)   parse what the transceiver sends
 *   - poll()         send the periodic status queries (optional)
 *
 * Everything else is handled here, identically for every transceiver:
 *
 *   - open the port, and keep retrying while it fails
 *     (transceiver switched off, USB not plugged in yet, ...)
 *   - reconnect automatically after a disconnect
 *   - poll timer that is stopped/restarted with the connection
 *   - optional watchdog: port open but no data any more -> reopen
 *   - every error message is logged once, not every few seconds
 *   - an "error" handler is always registered, so a serial error can
 *     never crash the server
 */

export type SerialDataBits = 5 | 6 | 7 | 8;
export type SerialStopBits = 1 | 1.5 | 2;
export type SerialParity = "none" | "even" | "odd" | "mark" | "space";

export interface SerialRadioOptions {

    /* Log prefix, e.g. "FTDX10 CAT" */
    name: string;

    device: string;

    baudRate: number;

    dataBits?: SerialDataBits;
    stopBits?: SerialStopBits;
    parity?: SerialParity;
    rtscts?: boolean;

    /* Poll interval in ms. 0 = the driver does not poll. */
    pollIntervalMs?: number;

    /*
     * Reopen the port when no data arrived for this long (ms).
     * 0 = disabled. Only sensible for drivers that poll.
     */
    rxTimeoutMs?: number;

    /* Delay between two open attempts (ms). */
    reconnectDelayMs?: number;

}


export abstract class SerialRadioBase {

    protected readonly name: string;

    protected readonly device: string;

    protected readonly baudRate: number;

    /*
     * null when no device is configured.
     * Drivers that need direct access (e.g. an extra "data" listener)
     * use this.port?.on(...) / this.port?.removeListener(...).
     */
    protected readonly port: SerialPort | null;

    private readonly pollIntervalMs: number;
    private readonly rxTimeoutMs: number;
    private readonly reconnectDelayMs: number;

    private pollTimer: ReturnType<typeof setInterval> | null = null;
    private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    private opening = false;
    private stopped = true;
    private lastOpenError = "";
    private lastRxAt = 0;


    constructor(options: SerialRadioOptions) {

        this.name = options.name;
        this.device = options.device;
        this.baudRate = options.baudRate;

        this.pollIntervalMs = options.pollIntervalMs ?? 0;
        this.rxTimeoutMs = options.rxTimeoutMs ?? 0;
        this.reconnectDelayMs = options.reconnectDelayMs ?? 5000;

        if (!options.device) {
            this.port = null;
            return;
        }

        const port = new SerialPort({
            path: options.device,
            baudRate: options.baudRate,
            autoOpen: false,
            ...(options.dataBits !== undefined ? { dataBits: options.dataBits } : {}),
            ...(options.stopBits !== undefined ? { stopBits: options.stopBits } : {}),
            ...(options.parity !== undefined ? { parity: options.parity } : {}),
            ...(options.rtscts !== undefined ? { rtscts: options.rtscts } : {}),
        });

        port.on("data", (data: Buffer) => {
            this.lastRxAt = Date.now();
            this.onData(data);
        });

        port.on("error", (error: Error) => {
            console.error(`${this.name} error:`, error.message);
        });

        port.on("open", () => {
            console.log(
                `${this.name} connected: ${this.device} @ ${this.baudRate}`
            );
        });

        port.on("close", () => {
            console.log(`${this.name} disconnected`);
            this.stopPolling();
            this.onDisconnected();
            this.scheduleReconnect();
        });

        this.port = port;

    }


    /* ------------------------------------------------------------------
     * Driver hooks
     * ------------------------------------------------------------------ */

    /* Data received from the transceiver. */
    protected abstract onData(data: Buffer): void;

    /* Periodic status queries. Default: nothing. */
    protected poll(): void {
        // no polling by default
    }

    /* Called after the port was opened (before the first poll). */
    protected onConnected(): void {
        // optional
    }

    /* Called after the port was closed / lost. */
    protected onDisconnected(): void {
        // optional
    }


    /* ------------------------------------------------------------------
     * Public lifecycle
     * ------------------------------------------------------------------ */

    start(): void {

        if (!this.port) {
            console.log(`${this.name}: no CAT device configured`);
            return;
        }

        this.stopped = false;
        this.openPort();

    }

    /* Stop for good (no reconnect), e.g. when the configuration changes. */
    stop(): void {

        this.stopped = true;

        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }

        this.stopPolling();

        if (this.port?.isOpen) {
            this.port.close();
        }

    }

    /* Serial port really open. */
    isConnected(): boolean {
        return this.port?.isOpen ?? false;
    }

    /* Last open error ("" while connected or when there was none). */
    getLastError(): string {
        return this.lastOpenError;
    }

    /* Time of the last received data (ms since epoch, 0 = never). */
    getLastRxAt(): number {
        return this.lastRxAt;
    }


    /* ------------------------------------------------------------------
     * Helpers for drivers
     * ------------------------------------------------------------------ */

    /* Write to the transceiver. Returns false when the port is not open. */
    protected write(data: string | Buffer): boolean {

        if (!this.port?.isOpen) {
            return false;
        }

        this.port.write(data);
        return true;

    }


    /* ------------------------------------------------------------------
     * Internals
     * ------------------------------------------------------------------ */

    private openPort(): void {

        const port = this.port;

        if (!port || this.stopped || port.isOpen || this.opening) {
            return;
        }

        this.opening = true;

        port.open((error: Error | null) => {

            this.opening = false;

            if (error) {

                // Log each different error once, not every few seconds.
                if (error.message !== this.lastOpenError) {
                    console.error(
                        `${this.name} open error:`,
                        error.message,
                        `- retrying every ${this.reconnectDelayMs / 1000} s`
                    );
                    this.lastOpenError = error.message;
                }

                this.scheduleReconnect();
                return;

            }

            this.lastOpenError = "";
            this.lastRxAt = Date.now();

            this.onConnected();
            this.startPolling();

        });

    }

    private scheduleReconnect(): void {

        if (this.stopped || this.reconnectTimer) {
            return;
        }

        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            this.openPort();
        }, this.reconnectDelayMs);

    }

    private startPolling(): void {

        this.stopPolling();

        if (this.pollIntervalMs <= 0) {
            return;
        }

        this.poll();

        this.pollTimer = setInterval(() => {

            // Port open, but the transceiver stopped answering:
            // close it, the close handler reconnects.
            if (
                this.rxTimeoutMs > 0 &&
                this.port?.isOpen &&
                Date.now() - this.lastRxAt > this.rxTimeoutMs
            ) {
                console.warn(
                    `${this.name}: no data for ${this.rxTimeoutMs / 1000} s - reopening port`
                );
                this.lastRxAt = Date.now();
                this.port.close();
                return;
            }

            this.poll();

        }, this.pollIntervalMs);

    }

    private stopPolling(): void {

        if (this.pollTimer) {
            clearInterval(this.pollTimer);
            this.pollTimer = null;
        }

    }

}
