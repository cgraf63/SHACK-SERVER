import { EventEmitter } from "node:events";

import { SerialRadioBase } from "./serial-radio-base.js";
import type { RadioService } from "./radio.interface.js";


/*
 * Icom IC-7300 / IC-7300MK2 - CI-V over USB
 *
 * Sources: Icom IC-7300 CI-V reference, Hamlib rigs/icom (ic7300.c,
 * icom.c, icom_defs.h).
 *
 * Frame:   FE FE <to> <from> <cmd> [sub] [data] FD
 *          to = transceiver (IC-7300 94h, MK2 B6h), from = E0h (us)
 * Answers: FB = OK, FA = NG, or the command with data.
 * "CI-V transceive" (default ON) sends frequency / mode changes by
 * itself (commands 00 / 01). "CI-V USB echo back" (default OFF) would
 * echo our own frames - they are ignored (from = E0).
 *
 * Numbers: frequency 5 bytes BCD, least significant first;
 * levels / meters 2 bytes BCD 0000-0255, most significant first.
 *
 * Spectrum scope (27 00): the IC-7300 sends one sweep as 11 frames -
 * division 1 = header (mode, centre/edges, span, out-of-range),
 * divisions 2-11 = 50 + ... data bytes, 475 points, level 0-160.
 * Output on: 27 10 01 (scope on), 27 11 01 (send data).
 * Output only while somebody watches (setScopeListeners) - the data
 * fill most of the CI-V bandwidth.
 */

const CONTROLLER = 0xE0;

export const IC7300_MODES: Record<string, number> = {
    LSB: 0x00, USB: 0x01, AM: 0x02, CW: 0x03, RTTY: 0x04, FM: 0x05, "CW-R": 0x07, "RTTY-R": 0x08
};

/* data modes = mode + 1A 06 01 (USB-D, LSB-D, AM-D, FM-D) */
const DATA_CAPABLE = new Set(["LSB", "USB", "AM", "FM"]);

export const IC7300_BANDS: Array<{ name: string; low: number; high: number; start: number }> = [
    { name: "160m", low: 1_800_000, high: 2_000_000, start: 1_840_000 },
    { name: "80m", low: 3_500_000, high: 4_000_000, start: 3_573_000 },
    { name: "60m", low: 5_250_000, high: 5_450_000, start: 5_357_000 },
    { name: "40m", low: 7_000_000, high: 7_300_000, start: 7_074_000 },
    { name: "30m", low: 10_100_000, high: 10_150_000, start: 10_136_000 },
    { name: "20m", low: 14_000_000, high: 14_350_000, start: 14_074_000 },
    { name: "17m", low: 18_068_000, high: 18_168_000, start: 18_100_000 },
    { name: "15m", low: 21_000_000, high: 21_450_000, start: 21_074_000 },
    { name: "12m", low: 24_890_000, high: 24_990_000, start: 24_915_000 },
    { name: "10m", low: 28_000_000, high: 29_700_000, start: 28_074_000 },
    { name: "6m", low: 50_000_000, high: 54_000_000, start: 50_313_000 },
    { name: "4m", low: 70_000_000, high: 70_500_000, start: 70_200_000 },
];

/* scope spans (± half span is what CI-V transfers) */
export const IC7300_SPANS = [5_000, 10_000, 20_000, 50_000, 100_000, 200_000, 500_000, 1_000_000];

/* S-meter 0-241 -> dB relative to S9 (Hamlib IC7300_STR_CAL) */
const STR_CAL: Array<[number, number]> = [[0, -54], [10, -48], [30, -36], [60, -24], [90, -12], [120, 0], [241, 64]];
/* PO 0-255 -> W */
const PO_CAL: Array<[number, number]> = [[0, 0], [21, 5], [43, 10], [65, 15], [83, 20], [95, 25], [105, 30], [114, 35], [124, 40], [143, 50], [183, 75], [213, 100], [255, 120]];
/* SWR 0-255 -> ratio */
const SWR_CAL: Array<[number, number]> = [[0, 1], [48, 1.5], [80, 2], [120, 3], [240, 6]];

function interpolate(table: Array<[number, number]>, raw: number): number {
    if (raw <= table[0]![0]) return table[0]![1];
    for (let i = 1; i < table.length; i++) {
        const [x1, y1] = table[i]!;
        const [x0, y0] = table[i - 1]!;
        if (raw <= x1) return y0 + (y1 - y0) * (raw - x0) / (x1 - x0);
    }
    return table[table.length - 1]![1];
}

function bcdByte(value: number): number {
    return ((Math.floor(value / 10) % 10) << 4) | (value % 10);
}

function fromBcdByte(byte: number): number {
    return ((byte >> 4) & 0x0F) * 10 + (byte & 0x0F);
}

/* frequency (Hz) -> 5 bytes BCD, least significant first */
function freqToBcd(hz: number, bytes = 5): number[] {
    let value = Math.max(0, Math.round(hz));
    const out: number[] = [];
    for (let i = 0; i < bytes; i++) {
        out.push(bcdByte(value % 100));
        value = Math.floor(value / 100);
    }
    return out;
}

function bcdToFreq(data: number[]): number {
    let value = 0;
    for (let i = data.length - 1; i >= 0; i--) value = value * 100 + fromBcdByte(data[i]!);
    return value;
}

/* 0-255 -> 2 bytes BCD "0255", most significant first */
function levelToBcd(level: number): number[] {
    const v = Math.max(0, Math.min(255, Math.round(level)));
    return [bcdByte(Math.floor(v / 100)), bcdByte(v % 100)];
}

function bcdToLevel(data: number[]): number {
    if (data.length < 2) return 0;
    return fromBcdByte(data[0]!) * 100 + fromBcdByte(data[1]!);
}

const pct = (raw: number) => Math.round(raw / 255 * 100);
const raw255 = (percent: number) => Math.round(Math.max(0, Math.min(100, percent)) / 100 * 255);

export interface ScopeLine {
    lowHz: number;
    highHz: number;
    centerHz: number;
    spanHz: number;
    mode: "center" | "fixed" | "scroll-c" | "scroll-f";
    outOfRange: boolean;
    data: Uint8Array;
}

/* poll lists: [cmd, sub?] */
const SLOW_POLL: number[][] = [
    [0x0F], [0x11], [0x16, 0x02], [0x16, 0x12], [0x16, 0x22], [0x16, 0x40], [0x16, 0x41],
    [0x16, 0x44], [0x16, 0x45], [0x16, 0x46], [0x16, 0x47], [0x16, 0x48], [0x1C, 0x01],
    [0x14, 0x01], [0x14, 0x02], [0x14, 0x03], [0x14, 0x0A], [0x14, 0x0B], [0x14, 0x0C],
    [0x14, 0x06], [0x14, 0x12], [0x14, 0x0E], [0x14, 0x07], [0x14, 0x08], [0x14, 0x09],
    [0x14, 0x0D], [0x1A, 0x06], [0x21, 0x00], [0x21, 0x01], [0x25, 0x01], [0x26, 0x01],
    [0x27, 0x14, 0x00], [0x27, 0x15, 0x00], [0x27, 0x19, 0x00], [0x27, 0x1A, 0x00]
];

export class Ic7300Service extends SerialRadioBase implements RadioService {

    readonly events = new EventEmitter();

    private readonly civ: number;
    private rx: number[] = [];

    /* state */
    private frequency = 0;
    private frequencyB = 0;
    private mode = "USB";
    private modeB = "USB";
    private filter = 1;
    private dataMode = false;
    private tx = false;
    private split = false;
    private ritOn = false;
    private ritHz = 0;
    private tunerOn = false;
    private tuning = false;
    private preamp = 0;
    private att = 0;
    private agc = 2;
    private nb = false;
    private nr = false;
    private anf = false;
    private comp = false;
    private mon = false;
    private vox = false;
    private bkin = 0;
    private manualNotch = false;
    private levels: Record<string, number> = {
        af: 0, rf: 255, sql: 0, power: 255, mic: 128, keySpeed: 128, nrLevel: 128,
        nbLevel: 128, compLevel: 128, pbtIn: 128, pbtOut: 128, cwPitch: 128, notch: 128
    };
    private sRaw = 0;
    private poRaw = 0;
    private swrRaw = 0;
    private alcRaw = 0;
    private vfoBSupported = true;

    private scopeMode: ScopeLine["mode"] = "center";
    private scopeSpanHz = 50_000;
    private scopeRef = 0;
    private scopeSpeed = 1;
    private scopeListeners = 0;
    private scopeOutput = false;
    private scopePart: { line: Partial<ScopeLine>; data: Uint8Array; length: number } | null = null;
    private lastScopeAt = 0;

    private tick = 0;
    private slowIndex = 0;
    private lastCommand: number[] = [];
    private readonly bandMemory = new Map<string, { frequency: number; mode: string }>();

    constructor(device: string, baudRate: number, civAddress = 0x94) {
        super({
            name: "IC-7300",
            device,
            baudRate,
            pollIntervalMs: 100,
            rxTimeoutMs: 15_000,
        });
        this.civ = civAddress;
    }

    /* ------------------------------------------------------------ frames */

    private send(cmd: number[], data: number[] = []): boolean {
        this.lastCommand = cmd;
        return this.write(Buffer.from([0xFE, 0xFE, this.civ, CONTROLLER, ...cmd, ...data, 0xFD]));
    }

    private sendChecked(cmd: number[], data: number[] = []): void {
        if (!this.isConnected()) throw new Error("IC-7300 not connected");
        this.send(cmd, data);
    }

    protected onData(data: Buffer): void {

        for (const byte of data) this.rx.push(byte);

        for (;;) {
            let start = -1;
            for (let i = 0; i < this.rx.length - 1; i++) {
                if (this.rx[i] === 0xFE && this.rx[i + 1] === 0xFE) { start = i; break; }
            }
            if (start < 0) {
                this.rx = this.rx.length && this.rx[this.rx.length - 1] === 0xFE ? [0xFE] : [];
                return;
            }
            if (start > 0) this.rx = this.rx.slice(start);
            // skip repeated preambles (FE FE FE ...)
            while (this.rx.length > 2 && this.rx[2] === 0xFE) this.rx.shift();
            const end = this.rx.indexOf(0xFD, 2);
            if (end < 0) {
                if (this.rx.length > 2048) this.rx = [];
                return;
            }
            const frame = this.rx.slice(0, end + 1);
            this.rx = this.rx.slice(end + 1);
            this.handleFrame(frame);
        }

    }

    private handleFrame(frame: number[]): void {

        if (frame.length < 6) return;

        const to = frame[2]!;
        const from = frame[3]!;

        // echo of our own frame, or not for us (00 = broadcast / transceive)
        if (from === CONTROLLER) return;
        if (to !== CONTROLLER && to !== 0x00) return;
        if (from !== this.civ) return;

        const cmd = frame[4]!;
        const rest = frame.slice(5, -1);

        switch (cmd) {

            case 0xFB:
                return;

            case 0xFA:
                // NG: 25/26 not supported by older firmware
                if (this.lastCommand[0] === 0x25 || this.lastCommand[0] === 0x26) this.vfoBSupported = false;
                return;

            case 0x00:
            case 0x03:
                if (rest.length >= 5) this.frequency = bcdToFreq(rest.slice(0, 5));
                return;

            case 0x01:
            case 0x04:
                this.applyMode(rest[0], rest[1]);
                return;

            case 0x0F:
                this.split = rest[0] === 0x01;
                return;

            case 0x11:
                this.att = rest[0] === 0x20 ? 20 : 0;
                return;

            case 0x14:
                this.applyLevel(rest[0]!, bcdToLevel(rest.slice(1)));
                return;

            case 0x15:
                this.applyMeter(rest[0]!, bcdToLevel(rest.slice(1)));
                return;

            case 0x16:
                this.applyFunction(rest[0]!, rest[1] ?? 0);
                return;

            case 0x1A:
                if (rest[0] === 0x06) this.dataMode = (rest[1] ?? 0) > 0;
                return;

            case 0x1C:
                if (rest[0] === 0x00) this.tx = rest[1] === 0x01;
                if (rest[0] === 0x01) {
                    this.tunerOn = (rest[1] ?? 0) >= 1;
                    this.tuning = rest[1] === 0x02;
                }
                return;

            case 0x21:
                if (rest[0] === 0x00 && rest.length >= 4) {
                    const hz = bcdToFreq(rest.slice(1, 3));
                    this.ritHz = rest[3] === 0x01 ? -hz : hz;
                }
                if (rest[0] === 0x01) this.ritOn = rest[1] === 0x01;
                return;

            case 0x25:
                if (rest[0] === 0x01 && rest.length >= 6) this.frequencyB = bcdToFreq(rest.slice(1, 6));
                return;

            case 0x26:
                if (rest[0] === 0x01 && rest.length >= 2) {
                    this.modeB = Object.entries(IC7300_MODES).find(([, code]) => code === rest[1])?.[0] ?? this.modeB;
                }
                return;

            case 0x27:
                this.handleScope(rest);
                return;
        }

    }

    private applyMode(code?: number, filter?: number): void {
        const name = Object.entries(IC7300_MODES).find(([, value]) => value === code)?.[0];
        if (name) this.mode = name;
        if (filter && filter >= 1 && filter <= 3) this.filter = filter;
    }

    private applyLevel(sub: number, value: number): void {
        const map: Record<number, string> = {
            0x01: "af", 0x02: "rf", 0x03: "sql", 0x06: "nrLevel", 0x07: "pbtIn", 0x08: "pbtOut",
            0x09: "cwPitch", 0x0A: "power", 0x0B: "mic", 0x0C: "keySpeed", 0x0D: "notch",
            0x0E: "compLevel", 0x12: "nbLevel"
        };
        const key = map[sub];
        if (key) this.levels[key] = value;
    }

    private applyMeter(sub: number, value: number): void {
        if (sub === 0x02) this.sRaw = value;
        if (sub === 0x11) this.poRaw = value;
        if (sub === 0x12) this.swrRaw = value;
        if (sub === 0x13) this.alcRaw = value;
    }

    private applyFunction(sub: number, value: number): void {
        switch (sub) {
            case 0x02: this.preamp = value; break;
            case 0x12: this.agc = value; break;
            case 0x22: this.nb = value === 1; break;
            case 0x40: this.nr = value === 1; break;
            case 0x41: this.anf = value === 1; break;
            case 0x44: this.comp = value === 1; break;
            case 0x45: this.mon = value === 1; break;
            case 0x46: this.vox = value === 1; break;
            case 0x47: this.bkin = value; break;
            case 0x48: this.manualNotch = value === 1; break;
        }
    }

    /* ------------------------------------------------------------ scope */

    private handleScope(rest: number[]): void {

        const sub = rest[0];

        if (sub === 0x14 && rest.length >= 3) {
            this.scopeMode = (["center", "fixed", "scroll-c", "scroll-f"] as const)[rest[2]!] ?? "center";
            return;
        }
        if (sub === 0x15 && rest.length >= 7) {
            this.scopeSpanHz = bcdToFreq(rest.slice(2, 7)) * 2;
            return;
        }
        if (sub === 0x19 && rest.length >= 5) {
            // ref level: 2 bytes BCD (0.01 dB), sign
            const value = (fromBcdByte(rest[2]!) * 100 + fromBcdByte(rest[3]!)) / 100;
            this.scopeRef = rest[4] === 0x01 ? -value : value;
            return;
        }
        if (sub === 0x1A && rest.length >= 3) {
            this.scopeSpeed = rest[2]!;
            return;
        }
        if (sub !== 0x00 || rest.length < 4) return;

        // 27 00 <scope> <division> <max division> ...
        const division = fromBcdByte(rest[2]!);
        const maxDivision = fromBcdByte(rest[3]!);
        const payload = rest.slice(4);

        if (division === 1) {

            const mode = (["center", "fixed", "scroll-c", "scroll-f"] as const)[payload[0]!] ?? "center";
            let low: number;
            let high: number;
            let center: number;
            let span: number;

            if (mode === "center") {
                center = bcdToFreq(payload.slice(1, 6));
                span = bcdToFreq(payload.slice(6, 11)) * 2;
                low = center - span / 2;
                high = center + span / 2;
            }
            else {
                low = bcdToFreq(payload.slice(1, 6));
                high = bcdToFreq(payload.slice(6, 11));
                span = high - low;
                center = low + span / 2;
            }

            this.scopeMode = mode;
            this.scopeSpanHz = mode === "center" ? span : this.scopeSpanHz;

            this.scopePart = {
                line: { lowHz: low, highHz: high, centerHz: center, spanHz: span, mode, outOfRange: payload[11] === 0x01 },
                data: new Uint8Array(475),
                length: 0
            };

            // LAN / single frame: data follows the header
            const inline = payload.slice(12);
            if (inline.length) {
                this.scopePart.data.set(inline.slice(0, 475));
                this.scopePart.length = Math.min(475, inline.length);
            }
        }
        else if (this.scopePart) {
            const offset = (maxDivision > 1 ? division - 2 : division - 1) * 50;
            if (offset >= 0 && offset < 475) {
                const chunk = payload.slice(0, 475 - offset);
                this.scopePart.data.set(chunk, offset);
                this.scopePart.length = Math.max(this.scopePart.length, offset + chunk.length);
            }
        }

        if (this.scopePart && division === maxDivision) {
            const line = { ...this.scopePart.line, data: this.scopePart.data.slice(0, this.scopePart.length || 475) } as ScopeLine;
            this.scopePart = null;
            this.lastScopeAt = Date.now();
            this.events.emit("scope", line);
        }

    }

    /* the WebSocket counts its viewers: scope data only while somebody watches */
    setScopeListeners(count: number): void {
        this.scopeListeners = Math.max(0, count);
        this.updateScopeOutput();
    }

    private updateScopeOutput(): void {
        if (!this.isConnected()) return;
        const want = this.scopeListeners > 0;
        if (want === this.scopeOutput) return;
        if (want) {
            this.send([0x27, 0x10], [0x01]);   // scope on
            this.send([0x27, 0x11], [0x01]);   // data output on
        }
        else {
            this.send([0x27, 0x11], [0x00]);
        }
        this.scopeOutput = want;
    }

    /* ------------------------------------------------------------ polling */

    protected override onConnected(): void {
        this.scopeOutput = false;
        this.send([0x03]);
        this.send([0x04]);
        // all settings once at the start (afterwards one per poll)
        for (const item of SLOW_POLL) this.send(item);
        this.updateScopeOutput();
    }

    protected override onDisconnected(): void {
        this.scopeOutput = false;
        this.tx = false;
    }

    protected override poll(): void {

        this.tick++;

        // fast: frequency / mode / TX state / meters
        switch (this.tick % 4) {
            case 0: this.send([0x03]); break;
            case 1: this.send([0x04]); break;
            case 2: this.send([0x1C, 0x00]); break;
            case 3:
                if (this.tx) {
                    this.send([0x15, 0x11]);
                    this.send([0x15, 0x12]);
                    this.send([0x15, 0x13]);
                }
                else {
                    this.send([0x15, 0x02]);
                }
                break;
        }

        // slow: settings, one per 2 ticks (all ~7 s)
        if (this.tick % 2 === 0) {
            let item = SLOW_POLL[this.slowIndex % SLOW_POLL.length]!;
            this.slowIndex++;
            if (!this.vfoBSupported && (item[0] === 0x25 || item[0] === 0x26)) {
                item = SLOW_POLL[this.slowIndex % SLOW_POLL.length]!;
                this.slowIndex++;
            }
            this.send(item);
        }

        // scope stalled (radio restarted): switch output on again
        if (this.scopeOutput && this.lastScopeAt && Date.now() - this.lastScopeAt > 5000) {
            this.scopeOutput = false;
            this.lastScopeAt = 0;
            this.updateScopeOutput();
        }

    }

    requestStatus(): void {
        this.send([0x03]);
        this.send([0x04]);
    }

    /* ------------------------------------------------------------ RadioService */

    setFrequency(frequency: number): void {
        this.send([0x05], freqToBcd(frequency));
        this.frequency = Math.round(frequency);
    }

    setMode(mode: string, frequency: number): void {
        const { name, data } = this.normalizeMode(mode, frequency);
        this.send([0x06], [IC7300_MODES[name]!, this.filter]);
        this.send([0x1A, 0x06], [data ? 0x01 : 0x00, data ? this.filter : 0x00]);
        this.mode = name;
        this.dataMode = data;
    }

    getFrequency(): number { return this.frequency; }
    getFrequencyB(): number { return this.frequencyB; }
    getMode(): string { return this.mode; }
    getModeB(): string { return this.modeB; }
    getPower(): number { return Math.round(this.levels.power! / 255 * 100); }
    getSplit(): boolean { return this.split; }

    /* VFO B without switching (25 01) - older firmware: switch, set, back */
    setFrequencyB(frequency: number): void {
        if (this.vfoBSupported) {
            this.send([0x25, 0x01], freqToBcd(frequency));
        }
        else {
            this.send([0x07, 0x01]);
            this.send([0x05], freqToBcd(frequency));
            this.send([0x07, 0x00]);
        }
        this.frequencyB = Math.round(frequency);
    }

    setSplitMode(mode: string, frequency: number): void {
        const { name, data } = this.normalizeMode(mode, frequency);
        if (this.vfoBSupported) {
            this.send([0x26, 0x01], [IC7300_MODES[name]!, data ? 0x01 : 0x00, this.filter]);
        }
        this.modeB = name;
    }

    setSplit(enabled: boolean): void {
        this.send([0x0F], [enabled ? 0x01 : 0x00]);
        this.split = enabled;
    }

    async tune(): Promise<boolean> {
        if (!this.isConnected()) return false;
        this.send([0x1C, 0x01], [0x02]);
        this.tuning = true;
        return true;
    }

    private normalizeMode(mode: string, frequency: number): { name: string; data: boolean } {
        let m = String(mode || "").trim().toUpperCase();
        let data = false;
        if (m.endsWith("-D")) { data = true; m = m.slice(0, -2); }
        if (["FT8", "FT4", "DIGI", "DATA", "PKT", "PSK"].includes(m)) { data = true; m = frequency < 10_000_000 ? "LSB" : "USB"; }
        if (m === "SSB") m = frequency < 10_000_000 ? "LSB" : "USB";
        if (m === "CW-L") m = "CW-R";
        if (!(m in IC7300_MODES)) throw new Error(`Unsupported IC-7300 mode: ${mode}`);
        if (data && !DATA_CAPABLE.has(m)) data = false;
        return { name: m, data };
    }

    /* ------------------------------------------------------------ remote page */

    private bandOf(hz: number): string {
        return IC7300_BANDS.find(b => hz >= b.low && hz <= b.high)?.name ?? "";
    }

    getState() {

        const sDb = interpolate(STR_CAL, this.sRaw);
        const sUnits = sDb >= 0 ? 9 : Math.max(0, 9 + sDb / 6);

        return {
            connected: this.isConnected(),
            error: this.getLastError(),
            civAddress: this.civ,
            frequency: this.frequency,
            frequencyB: this.frequencyB,
            vfoBKnown: this.vfoBSupported,
            band: this.bandOf(this.frequency),
            mode: this.mode,
            modeB: this.modeB,
            dataMode: this.dataMode,
            filter: this.filter,
            tx: this.tx,
            split: this.split,
            rit: { on: this.ritOn, hz: this.ritHz },
            tuner: { on: this.tunerOn, tuning: this.tuning },
            preamp: this.preamp,
            att: this.att,
            agc: (["OFF", "FAST", "MID", "SLOW"] as const)[this.agc] ?? "MID",
            nb: this.nb,
            nr: this.nr,
            anf: this.anf,
            comp: this.comp,
            mon: this.mon,
            vox: this.vox,
            bkin: (["OFF", "SEMI", "FULL"] as const)[this.bkin] ?? "OFF",
            manualNotch: this.manualNotch,
            levels: {
                af: pct(this.levels.af!), rf: pct(this.levels.rf!), sql: pct(this.levels.sql!),
                power: pct(this.levels.power!), mic: pct(this.levels.mic!),
                keySpeed: Math.round(6 + this.levels.keySpeed! / 255 * 42),
                nrLevel: Math.round(this.levels.nrLevel! / 255 * 15),
                nbLevel: Math.round(this.levels.nbLevel! / 255 * 9),
                compLevel: Math.round(this.levels.compLevel! / 255 * 10),
                pbtIn: Math.round((this.levels.pbtIn! - 128) / 128 * 1200),
                pbtOut: Math.round((this.levels.pbtOut! - 128) / 128 * 1200),
                cwPitch: Math.round(300 + this.levels.cwPitch! / 255 * 600)
            },
            meters: {
                sRaw: this.sRaw,
                sUnits: Math.round(sUnits * 10) / 10,
                overS9: sDb > 0 ? Math.round(sDb) : 0,
                poWatts: Math.round(interpolate(PO_CAL, this.poRaw)),
                swr: Math.round(interpolate(SWR_CAL, this.swrRaw) * 10) / 10,
                alc: Math.round(this.alcRaw / 120 * 100)
            },
            scope: {
                output: this.scopeOutput,
                mode: this.scopeMode,
                spanHz: this.scopeSpanHz,
                ref: this.scopeRef,
                speed: (["FAST", "MID", "SLOW"] as const)[this.scopeSpeed] ?? "MID",
                lastLineAgeMs: this.lastScopeAt ? Date.now() - this.lastScopeAt : null
            }
        };

    }

    control(name: string, value: unknown): void {

        const num = () => {
            const n = Number(value);
            if (!Number.isFinite(n)) throw new Error(`${name}: number expected`);
            return n;
        };
        const bool = () => value === true || value === 1 || value === "1" || value === "on" || value === "true";
        const level = (sub: number, raw: number) => this.sendChecked([0x14, sub], levelToBcd(raw));
        const fn = (sub: number, v: number) => this.sendChecked([0x16, sub], [v]);

        switch (name) {

            case "frequency": {
                const hz = num();
                if (hz < 30_000 || hz > 74_800_000) throw new Error("Frequency out of range (0.03-74.8 MHz)");
                if (!this.isConnected()) throw new Error("IC-7300 not connected");
                const band = this.bandOf(this.frequency);
                if (band) this.bandMemory.set(band, { frequency: this.frequency, mode: this.mode });
                this.setFrequency(hz);
                return;
            }
            case "frequencyB": {
                if (!this.isConnected()) throw new Error("IC-7300 not connected");
                this.setFrequencyB(num());
                return;
            }
            case "mode":
                if (!this.isConnected()) throw new Error("IC-7300 not connected");
                this.setMode(String(value), this.frequency);
                return;
            case "data": {
                const on = bool();
                if (on && !DATA_CAPABLE.has(this.mode)) throw new Error(`No data mode for ${this.mode}`);
                this.sendChecked([0x1A, 0x06], [on ? 0x01 : 0x00, on ? this.filter : 0x00]);
                this.dataMode = on;
                return;
            }
            case "filter": {
                const f = num();
                if (![1, 2, 3].includes(f)) throw new Error("Filter 1-3");
                this.sendChecked([0x06], [IC7300_MODES[this.mode]!, f]);
                this.filter = f;
                return;
            }
            case "band": {
                const band = IC7300_BANDS.find(b => b.name === String(value));
                if (!band) throw new Error(`Unknown band ${value}`);
                if (!this.isConnected()) throw new Error("IC-7300 not connected");
                const current = this.bandOf(this.frequency);
                if (current) this.bandMemory.set(current, { frequency: this.frequency, mode: this.mode });
                const memory = this.bandMemory.get(band.name);
                this.setFrequency(memory?.frequency ?? band.start);
                if (memory?.mode && memory.mode !== this.mode) this.setMode(memory.mode, memory.frequency);
                return;
            }
            case "ptt":
                this.sendChecked([0x1C, 0x00], [bool() ? 0x01 : 0x00]);
                this.tx = bool();
                return;
            case "tune":
                if (!this.isConnected()) throw new Error("IC-7300 not connected");
                void this.tune();
                return;
            case "tuner":
                this.sendChecked([0x1C, 0x01], [bool() ? 0x01 : 0x00]);
                this.tunerOn = bool();
                return;
            case "split":
                if (!this.isConnected()) throw new Error("IC-7300 not connected");
                this.setSplit(bool());
                return;
            case "vfo":
                this.sendChecked([0x07, String(value).toUpperCase() === "B" ? 0x01 : 0x00]);
                return;
            case "vfoSwap":
                this.sendChecked([0x07, 0xB0]);
                return;
            case "vfoEqual":
                this.sendChecked([0x07, 0xA0]);
                return;
            case "rit":
                this.sendChecked([0x21, 0x01], [bool() ? 0x01 : 0x00]);
                this.ritOn = bool();
                return;
            case "ritOffset": {
                const hz = Math.max(-9999, Math.min(9999, Math.round(num())));
                this.sendChecked([0x21, 0x00], [...freqToBcd(Math.abs(hz), 2), hz < 0 ? 0x01 : 0x00]);
                this.ritHz = hz;
                return;
            }

            case "af": level(0x01, raw255(num())); this.levels.af = raw255(num()); return;
            case "rf": level(0x02, raw255(num())); this.levels.rf = raw255(num()); return;
            case "sql": level(0x03, raw255(num())); this.levels.sql = raw255(num()); return;
            case "power": level(0x0A, raw255(num())); this.levels.power = raw255(num()); return;
            case "mic": level(0x0B, raw255(num())); this.levels.mic = raw255(num()); return;
            case "keySpeed": {
                const wpm = Math.max(6, Math.min(48, Math.round(num())));
                const raw = Math.round((wpm - 6) / 42 * 255);
                level(0x0C, raw);
                this.levels.keySpeed = raw;
                return;
            }
            case "nrLevel": {
                const raw = Math.round(Math.max(0, Math.min(15, num())) / 15 * 255);
                level(0x06, raw); this.levels.nrLevel = raw; return;
            }
            case "nbLevel": {
                const raw = Math.round(Math.max(0, Math.min(9, num())) / 9 * 255);
                level(0x12, raw); this.levels.nbLevel = raw; return;
            }
            case "compLevel": {
                const raw = Math.round(Math.max(0, Math.min(10, num())) / 10 * 255);
                level(0x0E, raw); this.levels.compLevel = raw; return;
            }
            case "pbtIn":
            case "pbtOut": {
                const hz = Math.max(-1200, Math.min(1200, num()));
                const raw = Math.round(128 + hz / 1200 * 127);
                level(name === "pbtIn" ? 0x07 : 0x08, raw);
                this.levels[name] = raw;
                return;
            }
            case "pbtReset":
                level(0x07, 128); level(0x08, 128);
                this.levels.pbtIn = 128; this.levels.pbtOut = 128;
                return;

            case "preamp": {
                const p = num();
                if (![0, 1, 2].includes(p)) throw new Error("Preamp 0-2");
                fn(0x02, p); this.preamp = p; return;
            }
            case "att": {
                const on = num() > 0 || bool();
                this.sendChecked([0x11], [on ? 0x20 : 0x00]);
                this.att = on ? 20 : 0;
                return;
            }
            case "agc": {
                const index = ["FAST", "MID", "SLOW"].indexOf(String(value).toUpperCase());
                if (index < 0) throw new Error("AGC FAST / MID / SLOW");
                fn(0x12, index + 1); this.agc = index + 1; return;
            }
            case "nb": fn(0x22, bool() ? 1 : 0); this.nb = bool(); return;
            case "nr": fn(0x40, bool() ? 1 : 0); this.nr = bool(); return;
            case "anf": fn(0x41, bool() ? 1 : 0); this.anf = bool(); return;
            case "comp": fn(0x44, bool() ? 1 : 0); this.comp = bool(); return;
            case "mon": fn(0x45, bool() ? 1 : 0); this.mon = bool(); return;
            case "vox": fn(0x46, bool() ? 1 : 0); this.vox = bool(); return;
            case "manualNotch": fn(0x48, bool() ? 1 : 0); this.manualNotch = bool(); return;
            case "bkin": {
                const index = ["OFF", "SEMI", "FULL"].indexOf(String(value).toUpperCase());
                if (index < 0) throw new Error("Break-in OFF / SEMI / FULL");
                fn(0x47, index); this.bkin = index; return;
            }

            case "cwText": {
                // 17: up to 30 characters per frame
                const text = String(value ?? "").toUpperCase().replace(/[^A-Z0-9 /?.,=+\-@^]/g, "");
                if (!text) throw new Error("CW text empty");
                if (!this.isConnected()) throw new Error("IC-7300 not connected");
                for (let i = 0; i < text.length; i += 30) {
                    this.send([0x17], [...Buffer.from(text.slice(i, i + 30), "ascii")]);
                }
                return;
            }
            case "cwStop":
                this.sendChecked([0x17], [0xFF]);
                return;
            case "voice": {
                const n = num();
                if (n < 0 || n > 8) throw new Error("Voice memory 1-8 (0 = stop)");
                this.sendChecked([0x28, 0x00], [n]);
                return;
            }

            case "scopeSpan": {
                const span = num();
                if (!IC7300_SPANS.includes(span)) throw new Error(`Span: ${IC7300_SPANS.join(", ")} Hz`);
                this.sendChecked([0x27, 0x15], [0x00, ...freqToBcd(span / 2)]);
                this.scopeSpanHz = span;
                return;
            }
            case "scopeMode": {
                const index = ["center", "fixed"].indexOf(String(value));
                if (index < 0) throw new Error("Scope mode center / fixed");
                this.sendChecked([0x27, 0x14], [0x00, index]);
                this.scopeMode = index === 0 ? "center" : "fixed";
                return;
            }
            case "scopeRef": {
                const db = Math.max(-20, Math.min(20, Math.round(num() * 2) / 2));
                const hundredths = Math.round(Math.abs(db) * 100);
                this.sendChecked([0x27, 0x19], [0x00, bcdByte(Math.floor(hundredths / 100)), bcdByte(hundredths % 100), db < 0 ? 0x01 : 0x00]);
                this.scopeRef = db;
                return;
            }
            case "scopeSpeed": {
                const index = ["FAST", "MID", "SLOW"].indexOf(String(value).toUpperCase());
                if (index < 0) throw new Error("Scope speed FAST / MID / SLOW");
                this.sendChecked([0x27, 0x1A], [0x00, index]);
                this.scopeSpeed = index;
                return;
            }

            default:
                throw new Error(`Unknown control: ${name}`);
        }

    }

}
