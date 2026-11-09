import fs from "node:fs";
import path from "node:path";

import { SerialRadioBase } from "./serial-radio-base.js";
import type { RadioService } from "./radio.interface.js";


/*
 * Yaesu FTX-1 (Field head, Optima / SPA-1) - CAT driver
 *
 * Sources: FTX-1 CAT Operation Reference Manual (2508-C) and the
 * hardware-tested Hamlib FTX-1 backend (rigs/yaesu/ftx1).
 *
 * Differences to the FTDX10 that matter here:
 *   - MAIN / SUB receivers: most commands carry P1 = 0 MAIN, 1 SUB
 *   - FA / FB: 9 digits in Hz, 30 kHz - 470 MHz (incl. 2 m / 70 cm)
 *   - BS: 13 = 144 MHz, 14 = 430 MHz, 12 = AIR, 11 = GEN / 70 MHz
 *   - PC: "PC1xxx" field head (0.5-10 W, battery 6 W, "PC10.5" for
 *         fractions), "PC2xxx" SPA-1 / Optima (5-100 W)
 *   - PA: per band group (0 HF/50: IPO/AMP1/AMP2, 1 VHF / 2 UHF: off/on)
 *   - RA: on/off (12 dB)
 *   - no NB / NR switch: NL / RL level 0 = off
 *   - IF / OI answer: 30 characters
 *   - tuner: AC103 start, AC000 stop (ATAS: AC123 / AC120)
 *   - CW memory play: KY0n (n = 1..5)
 *   - FM: SQ squelch, OS repeater shift, CT tone mode, CN tone / DCS
 *   - split via FT1 (TX on SUB), NOT ST1: with ST1 the firmware locks
 *     SUB in TX state (Hamlib FTX-1 backend, hardware-verified)
 *   - BS answers "?" on some firmware: setBand() falls back to a
 *     typical frequency of the band
 *   - memories (firmware differs from the manual, Hamlib-verified):
 *       MR000nn read, MT000nn name (12 chars), MC0nnnnn / MC1nnnnn
 *       recall on MAIN / SUB, VM000 back to VFO, CH0 / CH1 up / down,
 *       write = load SUB, MC1nnnnn cursor, VM000, BM; - then restore SUB
 *
 * The driver keeps the method names of the FTDX10 driver, so the
 * dashboard (spot tuning, split) works with it too. The dedicated
 * page /ftx1 uses getState() and control() via /api/ftx1.
 */


export const FTX1_MODES: Record<string, string> = {
    LSB: "1",
    USB: "2",
    "CW-U": "3",
    FM: "4",
    AM: "5",
    "RTTY-L": "6",
    "CW-L": "7",
    "DATA-L": "8",
    "RTTY-U": "9",
    "DATA-FM": "A",
    "FM-N": "B",
    "DATA-U": "C",
    "AM-N": "D",
    PSK: "E",
    "DATA-FM-N": "F",
    "C4FM-DN": "H",
    "C4FM-VW": "I"
};

const MODE_BY_CODE: Record<string, string> =
    Object.fromEntries(Object.entries(FTX1_MODES).map(([name, code]) => [code, name]));

/* generic names from the dashboard / spots */
const MODE_ALIASES: Record<string, string> = {
    CW: "CW-U",
    "CW-R": "CW-L",
    RTTY: "RTTY-U",
    DATA: "DATA-U",
    PKT: "DATA-FM",
    C4FM: "C4FM-DN",
    DN: "C4FM-DN",
    VW: "C4FM-VW",
    FT8: "DATA-U",
    FT4: "DATA-U"
};

/* BS band codes */
export const FTX1_BANDS: Array<{ code: string; name: string; from: number; to: number }> = [
    { code: "00", name: "160m", from: 1_800_000, to: 2_000_000 },
    { code: "01", name: "80m", from: 3_500_000, to: 4_000_000 },
    { code: "02", name: "60m", from: 5_250_000, to: 5_450_000 },
    { code: "03", name: "40m", from: 7_000_000, to: 7_300_000 },
    { code: "04", name: "30m", from: 10_100_000, to: 10_150_000 },
    { code: "05", name: "20m", from: 14_000_000, to: 14_350_000 },
    { code: "06", name: "17m", from: 18_068_000, to: 18_168_000 },
    { code: "07", name: "15m", from: 21_000_000, to: 21_450_000 },
    { code: "08", name: "12m", from: 24_890_000, to: 24_990_000 },
    { code: "09", name: "10m", from: 28_000_000, to: 29_700_000 },
    { code: "10", name: "6m", from: 50_000_000, to: 54_000_000 },
    { code: "11", name: "GEN", from: 0, to: 0 },
    { code: "12", name: "AIR", from: 118_000_000, to: 137_000_000 },
    { code: "13", name: "2m", from: 144_000_000, to: 148_000_000 },
    { code: "14", name: "70cm", from: 430_000_000, to: 440_000_000 }
];

/* fallback when BS is refused: typical frequency + mode per band */
const BAND_DEFAULTS: Record<string, [number, string]> = {
    "00": [1_840_000, "LSB"], "01": [3_700_000, "LSB"], "02": [5_357_000, "USB"],
    "03": [7_100_000, "LSB"], "04": [10_120_000, "CW-U"], "05": [14_200_000, "USB"],
    "06": [18_130_000, "USB"], "07": [21_250_000, "USB"], "08": [24_950_000, "USB"],
    "09": [28_500_000, "USB"], "10": [50_150_000, "USB"], "12": [118_100_000, "AM"],
    "13": [145_500_000, "FM"], "14": [433_500_000, "FM"]
};

export interface Ftx1Memory {
    channel: number;
    name: string;
    frequency: number;
    mode: string;
    shift: string;
    tone: string;
}

/* CN P2=0: CTCSS tone index 000-049 (0.1 Hz) */
export const FTX1_CTCSS = [
    670, 693, 719, 744, 770, 797, 825, 854, 885, 915,
    948, 974, 1000, 1035, 1072, 1109, 1148, 1188, 1230, 1273,
    1318, 1365, 1413, 1462, 1514, 1567, 1598, 1622, 1655, 1679,
    1713, 1738, 1773, 1799, 1835, 1862, 1899, 1928, 1966, 1995,
    2035, 2065, 2107, 2181, 2257, 2291, 2336, 2418, 2503, 2541
];

/* CN P2=1: DCS code index 000-103 */
export const FTX1_DCS = [
    23, 25, 26, 31, 32, 36, 43, 47, 51, 53, 54, 65, 71, 72, 73,
    74, 114, 115, 116, 122, 125, 131, 132, 134, 143, 145, 152, 155, 156, 162,
    165, 172, 174, 205, 212, 223, 225, 226, 243, 244, 245, 246, 251, 252, 255,
    261, 263, 265, 266, 271, 274, 306, 311, 315, 325, 331, 332, 343, 346, 351,
    356, 364, 365, 371, 411, 412, 413, 423, 431, 432, 445, 446, 452, 454, 455,
    462, 464, 465, 466, 503, 506, 516, 523, 526, 532, 546, 565, 606, 612, 624,
    627, 631, 632, 654, 662, 664, 703, 712, 723, 731, 732, 734, 743, 754
];

const MEMORY_FILE = path.join(process.cwd(), "data", "ftx1-memories.json");

/* MR P8 (stored tone) uses its own encoding: 1 TSQ, 2 ENC, 3 DCS */
const MR_TONE = ["", "TSQ", "ENC", "DCS"];

const AGC_NAMES = ["OFF", "FAST", "MID", "SLOW", "AUTO-F", "AUTO-M", "AUTO-S"];
const TONE_MODES = ["OFF", "ENC", "TSQ", "DCS", "PR FREQ", "REV TONE"];
const SHIFT_NAMES = ["SIMP", "+", "−", "ARS"];

export type Ftx1Head = "field" | "spa1" | "unknown";


interface SideState {
    frequency: number;
    mode: string;
    smeter: number;
    rfGain: number;
    afGain: number;
    squelch: number;
    width: number;
    shift: number;
    narrow: boolean;
    notch: boolean;
    notchFrequency: number;
    dnf: boolean;
    contour: boolean;
    contourFrequency: number;
    apf: boolean;
    apfOffset: number;
    dnrLevel: number;
    nbLevel: number;
    agc: number;
    rptShift: number;
    toneMode: number;
    processor: boolean;
    ctcssIndex: number;
    dcsIndex: number;
    memoryMode: boolean;
    memoryChannel: number;
}

function emptySide(): SideState {
    return {
        frequency: 0,
        mode: "UNKNOWN",
        smeter: 0,
        rfGain: 255,
        afGain: 0,
        squelch: 0,
        width: 0,
        shift: 0,
        narrow: false,
        notch: false,
        notchFrequency: 1500,
        dnf: false,
        contour: false,
        contourFrequency: 1500,
        apf: false,
        apfOffset: 0,
        dnrLevel: 0,
        nbLevel: 0,
        agc: 4,
        rptShift: 0,
        toneMode: 0,
        processor: false,
        ctcssIndex: 12,
        dcsIndex: 0,
        memoryMode: false,
        memoryChannel: 0
    };
}

/* 0 = HF / 50 MHz, 1 = VHF, 2 = UHF (PA command) */
function bandGroup(hz: number): 0 | 1 | 2 {
    if (hz >= 400_000_000) return 2;
    if (hz >= 136_000_000) return 1;
    return 0;
}

function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
}

function pad(value: number, length: number): string {
    return String(Math.round(value)).padStart(length, "0");
}


export class Ftx1Service extends SerialRadioBase implements RadioService {

    private buffer = "";
    private pollCount = 0;

    private main = emptySide();
    private sub = emptySide();

    /* VS: 0 = MAIN is TX/RX side, 1 = SUB */
    private activeSide: 0 | 1 = 0;
    private tx = 0;

    private head: Ftx1Head = "unknown";
    private power = 0;
    private powerMaxSeen = 0;

    private attenuator = false;
    private preamp: [number, number, number] = [0, 0, 0];

    private meterPo = 0;
    private meterSwr = 0;
    private meterAlc = 0;
    private meterComp = 0;
    private meterVdd = 0;
    private meterIdd = 0;

    private micGain = 50;
    private cwSpeed = 20;
    private breakIn = false;
    private micEq = false;
    private monitorLevel = 0;

    /* FT: transmitting side (split = TX side differs from VS side) */
    private txSide: 0 | 1 = 0;

    /* memory channels (1-99), read on request, kept in data/ */
    private memories = new Map<number, Ftx1Memory>();
    private memScan = { running: false, done: 0, total: 0, at: 0, error: "" };
    private memLoaded = false;

    /* one request waiting for a matching answer (memory read/write) */
    private waiter: { pattern: RegExp; resolve: (answer: string | null) => void; timer: NodeJS.Timeout } | null = null;
    private busy = false;

    private tuning = false;
    private poweredOn = true;
    private lastAnswerAt = 0;

    private cwMemories = ["", "", "", "", ""];

    /* commands sent in the last moments: polling must not overwrite the UI */
    private lastSetAt = 0;

    constructor(device: string, baudRate: number) {
        super({
            name: "FTX-1 CAT",
            device,
            baudRate,
            dataBits: 8,
            stopBits: 1,
            parity: "none",
            rtscts: false,
            pollIntervalMs: 700,
            rxTimeoutMs: 15000
        });
    }


    /* ------------------------------------------------------------
       Polling
       ------------------------------------------------------------ */

    protected override poll(): void {

        if (this.busy) return;

        this.pollCount++;

        // fast: frequency, mode, TX, meters
        let fast = "FA;FB;IF;OI;TX;SM0;SM1;";

        if (this.tx) fast += "RM5;RM6;RM4;RM3;";

        this.write(fast);

        // every 2nd poll: VFO / split / power / tuner
        if (this.pollCount % 2 === 0) {
            this.write("VS;FT;PC;AC;VM0;VM1;MC0;MC1;");
        }

        // every 3rd poll: receiver and DSP of the active side
        if (this.pollCount % 3 === 1) {
            const p = this.activeSide;
            this.write(
                `AG${p};RG${p};SQ${p};SH${p};IS${p};NA${p};` +
                `BP${p}0;BP${p}1;BC${p};CO${p}0;CO${p}1;CO${p}2;CO${p}3;` +
                `RL${p};NL${p};GT${p};PR0;PR1;RA0;PA${bandGroup(this.side().frequency)};`
            );
        }

        // every 5th poll: TX settings, FM
        if (this.pollCount % 5 === 2) {
            const p = this.activeSide;
            this.write(`MG;KS;BI;ML1;OS${p};CT${p};CN${p}0;CN${p}1;RM8;RM7;`);
        }

        // rarely: CW memories
        if (this.pollCount % 60 === 3) {
            this.write("KM1;KM2;KM3;KM4;KM5;");
        }

    }

    protected onData(data: Buffer): void {

        this.buffer += data.toString("ascii");

        if (this.buffer.length > 4096) this.buffer = this.buffer.slice(-1024);

        let end: number;

        while ((end = this.buffer.indexOf(";")) !== -1) {

            const message = this.buffer.slice(0, end + 1).replace(/^[\r\n\s]+/, "");

            this.buffer = this.buffer.slice(end + 1);

            if (this.waiter && (message === "?;" || this.waiter.pattern.test(message))) {
                const w = this.waiter;
                this.waiter = null;
                clearTimeout(w.timer);
                w.resolve(message === "?;" ? null : message);
            }

            if (message === "?;" || message.length < 3) continue;

            this.lastAnswerAt = Date.now();
            this.poweredOn = true;

            try {
                this.parse(message);
            }
            catch (error) {
                console.error("FTX-1 parse:", message, (error as Error).message);
            }

        }

    }

    private side(p: 0 | 1 = this.activeSide): SideState {
        return p === 1 ? this.sub : this.main;
    }

    private parse(m: string): void {

        let r: RegExpMatchArray | null;

        if ((r = m.match(/^FA(\d{9});$/))) { this.main.frequency = Number(r[1]); return; }
        if ((r = m.match(/^FB(\d{9});$/))) { this.sub.frequency = Number(r[1]); return; }

        // IF / OI: P1(5) P2 freq(9) P3 clar(+-4) P4 P5 P6 mode P7 P8 tone P9(2) P10 shift
        if ((r = m.match(/^(IF|OI)\d{5}(\d{9})[+-]\d{4}\d\d([0-9A-J])\d(\d)\d{2}(\d);$/))) {
            const s = r[1] === "IF" ? this.main : this.sub;
            s.frequency = Number(r[2]);
            s.mode = MODE_BY_CODE[r[3] ?? ""] ?? s.mode;
            const tone = Number(r[4]);
            // IF P8: 1 = CTCSS ENC/DEC, 2 = CTCSS ENC - CT uses 1 = ENC, 2 = TSQ
            s.toneMode = tone === 1 ? 2 : tone === 2 ? 1 : tone;
            s.rptShift = Number(r[5]);
            return;
        }

        if ((r = m.match(/^MD([01])([0-9A-J]);$/))) {
            this.side(Number(r[1]) as 0 | 1).mode = MODE_BY_CODE[r[2] ?? ""] ?? "UNKNOWN";
            return;
        }

        if ((r = m.match(/^TX(\d);$/))) { this.tx = Number(r[1]); return; }
        if ((r = m.match(/^VS([01]);$/))) { this.activeSide = Number(r[1]) as 0 | 1; return; }
        if ((r = m.match(/^ST([01]);$/))) { return; }
        if ((r = m.match(/^FT([01]);$/))) { this.txSide = Number(r[1]) as 0 | 1; return; }
        if ((r = m.match(/^VM([01])(\d\d);$/))) { this.side(Number(r[1]) as 0 | 1).memoryMode = r[2] === "11"; return; }
        if ((r = m.match(/^MC([01])(\d{5});$/))) { this.side(Number(r[1]) as 0 | 1).memoryChannel = Number(r[2]) % 10000; return; }

        if ((r = m.match(/^PC([12])([\d.]+);$/))) {
            this.head = r[1] === "2" ? "spa1" : "field";
            const watts = Number(r[2]);
            if (Number.isFinite(watts)) {
                this.power = watts;
                this.powerMaxSeen = Math.max(this.powerMaxSeen, watts);
            }
            return;
        }

        if ((r = m.match(/^SM([01])(\d{3});$/))) { this.side(Number(r[1]) as 0 | 1).smeter = Number(r[2]); return; }

        if ((r = m.match(/^RM(\d)(\d{3})\d*;$/))) {
            const value = Number(r[2]);
            switch (r[1]) {
                case "3": this.meterComp = value; break;
                case "4": this.meterAlc = value; break;
                case "5": this.meterPo = value; break;
                case "6": this.meterSwr = value; break;
                case "7": this.meterIdd = value; break;
                case "8": this.meterVdd = value; break;
            }
            return;
        }

        if ((r = m.match(/^AG([01])(\d{3});$/))) { this.side(Number(r[1]) as 0 | 1).afGain = Number(r[2]); return; }
        if ((r = m.match(/^RG([01])(\d{3});$/))) { this.side(Number(r[1]) as 0 | 1).rfGain = Number(r[2]); return; }
        if ((r = m.match(/^SQ([01])(\d{3});$/))) { this.side(Number(r[1]) as 0 | 1).squelch = Number(r[2]); return; }
        if ((r = m.match(/^SH([01])\d(\d{2});$/))) { this.side(Number(r[1]) as 0 | 1).width = Number(r[2]); return; }

        if ((r = m.match(/^IS([01])\d([+-])(\d{4});$/))) {
            this.side(Number(r[1]) as 0 | 1).shift = (r[2] === "-" ? -1 : 1) * Number(r[3]);
            return;
        }

        if ((r = m.match(/^NA([01])([01]);$/))) { this.side(Number(r[1]) as 0 | 1).narrow = r[2] === "1"; return; }
        if ((r = m.match(/^BC([01])([01]);$/))) { this.side(Number(r[1]) as 0 | 1).dnf = r[2] === "1"; return; }

        if ((r = m.match(/^BP([01])([01])(\d{3});$/))) {
            const s = this.side(Number(r[1]) as 0 | 1);
            if (r[2] === "0") s.notch = r[3] !== "000";
            else s.notchFrequency = Number(r[3]) * 10;
            return;
        }

        if ((r = m.match(/^CO([01])([0-3])(\d{4});$/))) {
            const s = this.side(Number(r[1]) as 0 | 1);
            const v = Number(r[3]);
            switch (r[2]) {
                case "0": s.contour = v === 1; break;
                case "1": s.contourFrequency = v; break;
                case "2": s.apf = v === 1; break;
                case "3": s.apfOffset = (v - 25) * 10; break;
            }
            return;
        }

        if ((r = m.match(/^RL([01])(\d{2});$/))) { this.side(Number(r[1]) as 0 | 1).dnrLevel = Number(r[2]); return; }
        if ((r = m.match(/^NL([01])(\d{3});$/))) { this.side(Number(r[1]) as 0 | 1).nbLevel = Number(r[2]); return; }
        if ((r = m.match(/^GT([01])(\d);$/))) { this.side(Number(r[1]) as 0 | 1).agc = Number(r[2]); return; }

        if ((r = m.match(/^PR([01])([12]);$/))) {
            if (r[1] === "0") this.side().processor = r[2] === "2";
            else this.micEq = r[2] === "2";
            return;
        }

        if ((r = m.match(/^RA0([01]);$/))) { this.attenuator = r[1] === "1"; return; }
        if ((r = m.match(/^PA([012])(\d);$/))) { this.preamp[Number(r[1]) as 0 | 1 | 2] = Number(r[2]); return; }

        if ((r = m.match(/^MG(\d{3});$/))) { this.micGain = Number(r[1]); return; }
        if ((r = m.match(/^KS(\d{3});$/))) { this.cwSpeed = Number(r[1]); return; }
        if ((r = m.match(/^BI([01]);$/))) { this.breakIn = r[1] === "1"; return; }
        if ((r = m.match(/^ML1(\d{3});$/))) { this.monitorLevel = Number(r[1]); return; }

        if ((r = m.match(/^OS([01])(\d);$/))) { this.side(Number(r[1]) as 0 | 1).rptShift = Number(r[2]); return; }
        if ((r = m.match(/^CT([01])(\d);$/))) { this.side(Number(r[1]) as 0 | 1).toneMode = Number(r[2]); return; }
        if ((r = m.match(/^CN([01])([01])(\d{3});$/))) {
            const s = this.side(Number(r[1]) as 0 | 1);
            if (r[2] === "0") s.ctcssIndex = clamp(Number(r[3]), 0, 49);
            else s.dcsIndex = clamp(Number(r[3]), 0, 103);
            return;
        }

        if ((r = m.match(/^AC\d\d(\d);$/))) { this.tuning = r[1] !== "0"; return; }
        if ((r = m.match(/^PS([01]);$/))) { this.poweredOn = r[1] === "1"; return; }

        if ((r = m.match(/^KM([1-5])(.*);$/))) {
            this.cwMemories[Number(r[1]) - 1] = (r[2] ?? "").trim();
            return;
        }

    }


    /* ------------------------------------------------------------
       Helpers
       ------------------------------------------------------------ */

    private send(command: string): void {
        if (!this.isConnected()) throw new Error("FTX-1 not connected");
        this.lastSetAt = Date.now();
        this.write(command);
    }

    private normalizeMode(mode: string, frequency: number): string {
        let m = String(mode || "").toUpperCase().trim();
        if (m === "SSB") m = frequency < 10_000_000 ? "LSB" : "USB";
        m = MODE_ALIASES[m] ?? m;
        if (!FTX1_MODES[m]) throw new Error(`Unsupported FTX-1 mode: ${mode}`);
        return m;
    }

    private checkFrequency(hz: number): number {
        const value = Math.round(Number(hz));
        if (!Number.isFinite(value) || value < 30_000 || value > 470_000_000) {
            throw new Error("Frequency out of range (30 kHz - 470 MHz)");
        }
        return value;
    }

    /* power range of the connected head */
    getPowerRange(): { min: number; max: number; step: number; head: Ftx1Head; note: string } {
        if (this.head === "spa1") {
            const vu = bandGroup(this.main.frequency) > 0;
            return { min: 5, max: vu ? 50 : 100, step: 1, head: "spa1", note: vu ? "SPA-1: max 50 W on 2 m / 70 cm" : "SPA-1 / Optima" };
        }
        return { min: 0.5, max: 10, step: 0.5, head: this.head, note: "Field head: 10 W with 12 V, 6 W on the battery" };
    }


    /* ------------------------------------------------------------
       RadioService + FTDX10-compatible methods (dashboard)
       ------------------------------------------------------------ */

    setFrequency(frequency: number): void {
        const hz = this.checkFrequency(frequency);
        this.send(`FA${pad(hz, 9)};`);
        this.main.frequency = hz;
    }

    setFrequencyA(frequency: number): void {
        this.setFrequency(frequency);
    }

    setFrequencyB(frequency: number): void {
        const hz = this.checkFrequency(frequency);
        this.send(`FB${pad(hz, 9)};`);
        this.sub.frequency = hz;
    }

    setMode(mode: string, frequency: number): void {
        const m = this.normalizeMode(mode, frequency || this.main.frequency);
        this.send(`MD0${FTX1_MODES[m]};`);
        this.main.mode = m;
    }

    setModeB(mode: string): void {
        const m = this.normalizeMode(mode, this.sub.frequency);
        this.send(`MD1${FTX1_MODES[m]};`);
        this.sub.mode = m;
    }

    /* split: TX on SUB with this mode */
    setSplitMode(mode: string, _frequency: number): void {
        this.setModeB(mode);
    }

    /* split = TX on the other side (FT), see header */
    setSplit(enabled: boolean): void {
        const tx = enabled ? (1 - this.activeSide) : this.activeSide;
        this.send(`FT${tx};`);
        this.txSide = tx as 0 | 1;
    }

    getSplit(): boolean {
        return this.txSide !== this.activeSide;
    }

    setActiveVfo(vfo: "A" | "B"): void {
        const split = this.getSplit();
        this.send(vfo === "B" ? "VS1;" : "VS0;");
        this.activeSide = vfo === "B" ? 1 : 0;
        // VS also moves TX: keep split / no split as it was
        this.txSide = (split ? 1 - this.activeSide : this.activeSide) as 0 | 1;
        this.write(`FT${this.txSide};`);
    }

    setBand(code: string, vfo: "A" | "B" = "A"): void {
        const band = FTX1_BANDS.find(b => b.code === code);
        if (!band) throw new Error(`Unsupported FTX-1 band code: ${code}`);
        const p = vfo === "B" ? 1 : 0;
        this.send(`BS${p}${code};`);
        // some firmware answers "?" to BS: then tune to a typical frequency
        const fallback = BAND_DEFAULTS[code];
        if (!fallback) return;
        setTimeout(() => {
            const f = this.side(p as 0 | 1).frequency;
            if (f >= band.from && f <= band.to) return;
            try {
                if (p === 1) { this.setFrequencyB(fallback[0]); this.setModeB(fallback[1]); }
                else { this.setFrequency(fallback[0]); this.setMode(fallback[1], fallback[0]); }
            }
            catch { /* disconnected */ }
        }, 900);
    }

    setPtt(enabled: boolean): void {
        this.send(enabled ? "TX1;" : "TX0;");
        this.tx = enabled ? 1 : 0;
    }

    setPower(watts: number): void {
        const range = this.getPowerRange();
        const value = clamp(Math.round(Number(watts) / range.step) * range.step, range.min, range.max);
        if (this.head === "spa1") {
            this.send(`PC2${pad(value, 3)};`);
        }
        else {
            // whole watts: PC1005, fractions: PC10.5
            this.send(Number.isInteger(value) ? `PC1${pad(value, 3)};` : `PC1${value.toFixed(1)};`);
        }
        this.power = value;
    }

    getPowerState(): boolean {
        return this.poweredOn && Date.now() - this.lastAnswerAt < 10_000;
    }

    setPowerState(enabled: boolean): void {
        if (enabled) {
            // the radio needs a dummy byte to wake up, then PS1 within 1-2 s
            this.write("PS1;");
            setTimeout(() => { try { this.write("PS1;"); } catch { /* port closed */ } }, 1200);
            return;
        }
        this.send("PS0;");
    }

    setAttenuator(value: number): void {
        this.send(`RA0${Number(value) ? 1 : 0};`);
        this.attenuator = Boolean(Number(value));
    }

    /* HF/50: 0 IPO, 1 AMP1, 2 AMP2 - VHF/UHF: 0 off, 1 on */
    setIpo(value: number): void {
        const group = bandGroup(this.side().frequency);
        const v = clamp(Math.round(Number(value)), 0, group === 0 ? 2 : 1);
        this.send(`PA${group}${v};`);
        this.preamp[group] = v;
    }

    setAgc(value: number): void {
        // set: 0 OFF, 1 FAST, 2 MID, 3 SLOW, 4 AUTO
        const v = clamp(Math.round(Number(value)), 0, 4);
        this.send(`GT${this.activeSide}${v};`);
        this.side().agc = v;
    }

    setRfGain(value: number): void {
        const v = clamp(Math.round(Number(value)), 0, 255);
        this.send(`RG${this.activeSide}${pad(v, 3)};`);
        this.side().rfGain = v;
    }

    setAfGain(value: number): void {
        const v = clamp(Math.round(Number(value)), 0, 255);
        this.send(`AG${this.activeSide}${pad(v, 3)};`);
        this.side().afGain = v;
    }

    setSquelch(value: number): void {
        const v = clamp(Math.round(Number(value)), 0, 255);
        this.send(`SQ${this.activeSide}${pad(v, 3)};`);
        this.side().squelch = v;
    }

    setCwSpeed(value: number): void {
        const v = clamp(Math.round(Number(value)), 4, 60);
        this.send(`KS${pad(v, 3)};`);
        this.cwSpeed = v;
    }

    setMicGain(value: number): void {
        const v = clamp(Math.round(Number(value)), 0, 100);
        this.send(`MG${pad(v, 3)};`);
        this.micGain = v;
    }

    setBreakIn(enabled: boolean): void {
        this.send(enabled ? "BI1;" : "BI0;");
        this.breakIn = Boolean(enabled);
    }

    setMicEq(enabled: boolean): void {
        this.send(enabled ? "PR12;" : "PR11;");
        this.micEq = Boolean(enabled);
    }

    setProcessor(enabled: boolean): void {
        this.send(`PR${this.activeSide}${enabled ? 2 : 1};`);
        this.side().processor = Boolean(enabled);
    }

    setFilterWidth(code: number): void {
        const v = clamp(Math.round(Number(code)), 0, 23);
        this.send(`SH${this.activeSide}0${pad(v, 2)};`);
        this.side().width = v;
    }

    setFilterShift(hz: number): void {
        const v = clamp(Math.round(Number(hz) / 20) * 20, -1200, 1200);
        this.send(`IS${this.activeSide}0${v < 0 ? "-" : "+"}${pad(Math.abs(v), 4)};`);
        this.side().shift = v;
    }

    setNarrow(enabled: boolean): void {
        this.send(`NA${this.activeSide}${enabled ? 1 : 0};`);
        this.side().narrow = Boolean(enabled);
    }

    setNotch(enabled: boolean, frequency?: number): void {
        const p = this.activeSide;
        if (enabled && frequency !== undefined) this.setNotchFrequency(frequency);
        this.send(`BP${p}0${enabled ? "001" : "000"};`);
        this.side().notch = Boolean(enabled);
    }

    setNotchFrequency(frequency: number): void {
        const v = clamp(Math.round(Number(frequency) / 10), 1, 320);
        this.send(`BP${this.activeSide}1${pad(v, 3)};`);
        this.side().notchFrequency = v * 10;
    }

    setAutoNotch(enabled: boolean): void {
        this.send(`BC${this.activeSide}${enabled ? 1 : 0};`);
        this.side().dnf = Boolean(enabled);
    }

    setContour(enabled: boolean, frequency?: number): void {
        if (enabled && frequency !== undefined) this.setContourFrequency(frequency);
        this.send(`CO${this.activeSide}0000${enabled ? 1 : 0};`);
        this.side().contour = Boolean(enabled);
    }

    setContourFrequency(frequency: number): void {
        const v = clamp(Math.round(Number(frequency) / 10) * 10, 10, 3200);
        this.send(`CO${this.activeSide}1${pad(v, 4)};`);
        this.side().contourFrequency = v;
    }

    setApf(enabled: boolean): void {
        this.send(`CO${this.activeSide}2000${enabled ? 1 : 0};`);
        this.side().apf = Boolean(enabled);
    }

    /* -250 .. +250 Hz in 10 Hz steps */
    setApfOffset(hz: number): void {
        const v = clamp(Math.round(Number(hz) / 10), -25, 25);
        this.send(`CO${this.activeSide}3${pad(v + 25, 4)};`);
        this.side().apfOffset = v * 10;
    }

    /* DNR: RL level 0 = off */
    setDnr(enabled: boolean): void {
        const level = enabled ? (this.side().dnrLevel || 5) : 0;
        this.send(`RL${this.activeSide}${pad(level, 2)};`);
        this.side().dnrLevel = level;
    }

    setDnrLevel(level: number): void {
        const v = clamp(Math.round(Number(level)), 1, 10);
        this.send(`RL${this.activeSide}${pad(v, 2)};`);
        this.side().dnrLevel = v;
    }

    /* NB: NL level 0 = off */
    setNb(enabled: boolean): void {
        const level = enabled ? (this.side().nbLevel || 5) : 0;
        this.send(`NL${this.activeSide}${pad(level, 3)};`);
        this.side().nbLevel = level;
    }

    setNbLevel(level: number): void {
        const v = clamp(Math.round(Number(level)), 1, 10);
        this.send(`NL${this.activeSide}${pad(v, 3)};`);
        this.side().nbLevel = v;
    }

    /* FM repeater: 0 simplex, 1 +, 2 -, 3 ARS */
    setRepeaterShift(value: number): void {
        const v = clamp(Math.round(Number(value)), 0, 3);
        this.send(`OS${this.activeSide}${v};`);
        this.side().rptShift = v;
    }

    /* 0 OFF, 1 CTCSS ENC, 2 CTCSS ENC/DEC (TSQ), 3 DCS, 4 PR FREQ, 5 REV TONE */
    setToneMode(value: number): void {
        const v = clamp(Math.round(Number(value)), 0, 5);
        this.send(`CT${this.activeSide}${v};`);
        this.side().toneMode = v;
    }

    setCtcssTone(index: number): void {
        const v = clamp(Math.round(Number(index)), 0, 49);
        this.send(`CN${this.activeSide}0${pad(v, 3)};`);
        this.side().ctcssIndex = v;
    }

    setDcsCode(index: number): void {
        const v = clamp(Math.round(Number(index)), 0, 103);
        this.send(`CN${this.activeSide}1${pad(v, 3)};`);
        this.side().dcsIndex = v;
    }

    swapVfo(): void { this.send("SV;"); }
    mainToSub(): void { this.send("AB;"); }
    subToMain(): void { this.send("BA;"); }

    async tune(): Promise<boolean> {
        if (!this.isConnected()) return false;
        this.send("AC103;");
        this.tuning = true;
        return true;
    }

    stopTune(): void {
        this.send("AC000;");
        this.tuning = false;
    }

    async monitor(level: number): Promise<boolean> {
        if (!this.isConnected()) return false;
        const v = clamp(Math.round(Number(level)), 0, 100);
        this.send(`ML1${pad(v, 3)};`);
        this.monitorLevel = v;
        return true;
    }

    async playCwMemory(memory: number): Promise<boolean> {
        if (!this.isConnected()) return false;
        const n = Math.round(Number(memory));
        if (n < 0 || n > 5) return false;
        // KY0n: play keyer (TEXT) memory n, KY00 = stop
        this.send(`KY0${n};`);
        return true;
    }



    /* ------------------------------------------------------------
       Memory channels
       ------------------------------------------------------------ */

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /* send one command and wait for the matching answer ("?" = null) */
    private request(command: string, pattern: RegExp, timeoutMs = 600): Promise<string | null> {
        return new Promise(resolve => {
            if (this.waiter) {
                clearTimeout(this.waiter.timer);
                this.waiter.resolve(null);
            }
            const timer = setTimeout(() => {
                if (this.waiter?.timer === timer) this.waiter = null;
                resolve(null);
            }, timeoutMs);
            this.waiter = { pattern, resolve, timer };
            this.write(command);
        });
    }

    /* polling paused, earlier answers drained */
    private async exclusive<T>(work: () => Promise<T>): Promise<T> {
        if (this.busy) throw new Error("FTX-1 is busy with a memory operation");
        if (!this.isConnected()) throw new Error("FTX-1 not connected");
        this.busy = true;
        try {
            await this.sleep(350);
            return await work();
        }
        finally {
            this.busy = false;
        }
    }

    private loadMemories(): void {
        if (this.memLoaded) return;
        this.memLoaded = true;
        try {
            const list = JSON.parse(fs.readFileSync(MEMORY_FILE, "utf8")) as { at: number; memories: Ftx1Memory[] };
            for (const m of list.memories ?? []) this.memories.set(m.channel, m);
            this.memScan.at = list.at ?? 0;
        }
        catch { /* not read yet */ }
    }

    private saveMemories(): void {
        try {
            fs.mkdirSync(path.dirname(MEMORY_FILE), { recursive: true });
            fs.writeFileSync(MEMORY_FILE, JSON.stringify({ at: this.memScan.at, memories: this.getMemories() }, null, 1));
        }
        catch (error) {
            console.error("FTX-1 memories: cannot save:", (error as Error).message);
        }
    }

    getMemories(): Ftx1Memory[] {
        this.loadMemories();
        return [...this.memories.values()].sort((a, b) => a.channel - b.channel);
    }

    getMemoryScan(): { running: boolean; done: number; total: number; at: number; error: string } {
        this.loadMemories();
        return { ...this.memScan };
    }

    /* MR + MT for one channel; null = not programmed */
    private async readChannel(channel: number): Promise<Ftx1Memory | null> {

        const ch = pad(channel, 5);
        const mr = await this.request(`MR${ch};`, new RegExp(`^MR${ch}\\d{9}`));

        if (!mr) return null;

        // MR ch(5) freq(9) clar(+-4) rx tx mode vfo/mem tone(P8) 00 shift
        const r = mr.match(/^MR\d{5}(\d{9})[+-]\d{4}\d\d([0-9A-J])\d(\d)\d{2}(\d)/);

        if (!r) return null;

        const mt = await this.request(`MT${ch};`, new RegExp(`^MT${ch}`));
        const name = mt ? mt.slice(7, -1).trim() : "";

        // shift and tone only exist for FM channels
        const mode = MODE_BY_CODE[r[2] ?? ""] ?? "?";
        const fm = /^(FM|DATA-FM|C4FM)/.test(mode);

        return {
            channel,
            name,
            frequency: Number(r[1]),
            mode,
            tone: fm ? (MR_TONE[Number(r[3])] ?? "") : "",
            shift: fm ? (["", "+", "−", ""][Number(r[4])] ?? "") : ""
        };

    }

    /* read channels 1-99 (about 5-10 s), list kept in data/ftx1-memories.json */
    scanMemories(): void {

        this.loadMemories();

        if (this.memScan.running) return;

        this.memScan = { running: true, done: 0, total: 99, at: this.memScan.at, error: "" };

        void this.exclusive(async () => {
            const found = new Map<number, Ftx1Memory>();
            for (let channel = 1; channel <= 99; channel++) {
                const memory = await this.readChannel(channel);
                if (memory) found.set(channel, memory);
                this.memScan.done = channel;
            }
            this.memories = found;
            this.memScan.at = Date.now();
            this.saveMemories();
        })
            .catch(error => { this.memScan.error = (error as Error).message; })
            .finally(() => { this.memScan.running = false; });

    }

    /* MAIN / SUB into memory mode on this channel */
    recallMemory(channel: number, side: "MAIN" | "SUB"): void {
        const ch = clamp(Math.round(Number(channel)), 1, 117);
        const p = side === "SUB" ? 1 : 0;
        this.send(`MC${p}${pad(ch, 5)};`);
        this.side(p).memoryMode = true;
        this.side(p).memoryChannel = ch;
    }

    /* back to VFO mode */
    vfoMode(): void {
        this.send("VM000;");
        this.main.memoryMode = false;
    }

    /* channel up / down (memory mode) */
    channelStep(up: boolean): void {
        this.send(up ? "CH0;" : "CH1;");
    }

    quickMemory(store: boolean): void {
        this.send(store ? "QI;" : "QR;");
    }

    async renameMemory(channel: number, name: string): Promise<void> {
        const ch = clamp(Math.round(Number(channel)), 1, 99);
        const clean = String(name ?? "").toUpperCase().replace(/[^A-Z0-9 /\-+.]/g, "").slice(0, 12);
        await this.exclusive(async () => {
            this.write(`MT${pad(ch, 5)}${clean.padEnd(12, " ")};`);
            await this.sleep(150);
            const memory = await this.readChannel(ch);
            if (memory) this.memories.set(ch, memory);
            this.saveMemories();
        });
    }

    /*
     * Store the current setting of MAIN or SUB in a channel.
     * Firmware path (Hamlib, hardware-verified): load the values into
     * SUB, point the SUB memory cursor at the channel, VFO mode, BM.
     * SUB is restored afterwards.
     */
    async storeMemory(channel: number, from: "MAIN" | "SUB", name: string): Promise<Ftx1Memory | null> {

        const ch = clamp(Math.round(Number(channel)), 1, 99);
        const source = from === "SUB" ? this.sub : this.main;
        const frequency = source.frequency;
        const mode = source.mode;
        const code = FTX1_MODES[mode];

        if (!frequency || !code) throw new Error("No valid frequency / mode to store");

        const saved = { frequency: this.sub.frequency, mode: FTX1_MODES[this.sub.mode] };
        const fm = /^(FM|DATA-FM)/.test(mode);

        return this.exclusive(async () => {

            const cmd = async (c: string) => { this.write(c); await this.sleep(60); };

            await cmd(`MC1${pad(ch, 5)};`);
            await cmd("VM000;");
            await cmd(`FB${pad(frequency, 9)};`);
            await cmd(`MD1${code};`);

            if (fm) {
                if (source.toneMode === 3) {
                    await cmd("CT13;");
                    await cmd(`CN11${pad(source.dcsIndex, 3)};`);
                }
                else if (source.toneMode === 1 || source.toneMode === 2) {
                    await cmd(`CT1${source.toneMode};`);
                    await cmd(`CN10${pad(source.ctcssIndex, 3)};`);
                }
                else {
                    await cmd("CT10;");
                }
                await cmd(`OS1${source.rptShift <= 2 ? source.rptShift : 0};`);
            }

            await cmd("CF10000000;");
            await cmd("CF10020000;");
            await cmd("BM;");
            await this.sleep(200);

            // restore SUB
            if (fm) await cmd("CT10;");
            if (saved.frequency) await cmd(`FB${pad(saved.frequency, 9)};`);
            if (saved.mode) await cmd(`MD1${saved.mode};`);

            const clean = String(name ?? "").toUpperCase().replace(/[^A-Z0-9 /\-+.]/g, "").slice(0, 12);
            if (clean) {
                await cmd(`MT${pad(ch, 5)}${clean.padEnd(12, " ")};`);
            }

            await this.sleep(150);

            const memory = await this.readChannel(ch);
            if (memory) this.memories.set(ch, memory);
            this.memScan.at = this.memScan.at || Date.now();
            this.saveMemories();

            return memory;

        });

    }

    /* ------------------------------------------------------------
       Getters (GET /api/radio)
       ------------------------------------------------------------ */

    getFrequency(): number { return this.main.frequency; }
    getFrequencyB(): number { return this.sub.frequency; }
    getMode(): string { return this.main.mode; }
    getModeB(): string { return this.sub.mode; }
    getPower(): number { return this.power; }
    getTxState(): boolean { return this.tx > 0; }
    getActiveVfo(): string { return this.activeSide === 1 ? "B" : "A"; }
    getRfGain(): number { return this.side().rfGain; }
    getAfGain(): number { return this.side().afGain; }
    getCwSpeed(): number { return this.cwSpeed; }
    getMicGain(): number { return this.micGain; }
    getBreakIn(): boolean { return this.breakIn; }
    getMicEq(): boolean { return this.micEq; }
    getFilterWidth(): number { return this.side().width; }
    getFilterShift(): number { return this.side().shift; }
    getNotch(): boolean { return this.side().notch; }
    getNotchFrequency(): number { return this.side().notchFrequency; }
    getContour(): boolean { return this.side().contour; }
    getContourFrequency(): number { return this.side().contourFrequency; }
    getDnr(): boolean { return this.side().dnrLevel > 0; }
    getDnrLevel(): number { return this.side().dnrLevel; }
    getNb(): boolean { return this.side().nbLevel > 0; }
    getNbLevel(): number { return this.side().nbLevel; }
    getSMeter(): number { return this.side().smeter; }
    getMeterAlc(): number { return this.meterAlc; }
    getMeterPower(): number { return this.meterPo; }
    getMeterSwr(): number { return this.meterSwr; }
    getAttenuator(): string { return this.attenuator ? "12 dB" : "OFF"; }

    getIpo(): string {
        const group = bandGroup(this.side().frequency);
        const v = this.preamp[group];
        return group === 0 ? (["IPO", "AMP1", "AMP2"][v] ?? "IPO") : (v ? "PRE ON" : "PRE OFF");
    }

    getAgc(): string { return AGC_NAMES[this.side().agc] ?? "---"; }
    getCwMemories(): string[] { return [...this.cwMemories]; }


    /* ------------------------------------------------------------
       Dedicated page /ftx1
       ------------------------------------------------------------ */

    getState(): Record<string, unknown> {

        this.loadMemories();

        const sideState = (s: SideState) => ({
            frequency: s.frequency,
            mode: s.mode,
            band: FTX1_BANDS.find(b => b.to && s.frequency >= b.from && s.frequency <= b.to)?.name ?? "GEN",
            smeter: s.smeter,
            rfGain: s.rfGain,
            afGain: s.afGain,
            squelch: s.squelch,
            width: s.width,
            shift: s.shift,
            narrow: s.narrow,
            notch: s.notch,
            notchFrequency: s.notchFrequency,
            dnf: s.dnf,
            contour: s.contour,
            contourFrequency: s.contourFrequency,
            apf: s.apf,
            apfOffset: s.apfOffset,
            dnrLevel: s.dnrLevel,
            nbLevel: s.nbLevel,
            agc: AGC_NAMES[s.agc] ?? "---",
            rptShift: SHIFT_NAMES[s.rptShift] ?? "SIMP",
            rptShiftCode: s.rptShift,
            toneMode: TONE_MODES[s.toneMode] ?? "OFF",
            toneModeCode: s.toneMode,
            processor: s.processor,
            ctcssIndex: s.ctcssIndex,
            ctcss: (FTX1_CTCSS[s.ctcssIndex] ?? 0) / 10,
            dcsIndex: s.dcsIndex,
            dcs: FTX1_DCS[s.dcsIndex] ?? 0,
            memoryMode: s.memoryMode,
            memoryChannel: s.memoryChannel,
            memoryName: s.memoryMode ? (this.memories.get(s.memoryChannel)?.name ?? "") : ""
        });

        const group = bandGroup(this.side().frequency);

        return {
            connected: this.isConnected(),
            alive: Date.now() - this.lastAnswerAt < 5000,
            lastError: this.getLastError(),
            poweredOn: this.getPowerState(),
            activeSide: this.activeSide === 1 ? "SUB" : "MAIN",
            split: this.getSplit(),
            txSide: this.txSide === 1 ? "SUB" : "MAIN",
            tx: this.tx > 0,
            tuning: this.tuning,
            main: sideState(this.main),
            sub: sideState(this.sub),
            power: this.power,
            powerRange: this.getPowerRange(),
            head: this.head,
            attenuator: this.attenuator,
            preamp: this.getIpo(),
            preampCode: this.preamp[group],
            preampGroup: ["HF", "VHF", "UHF"][group],
            meters: {
                po: this.meterPo,
                swr: this.meterSwr,
                alc: this.meterAlc,
                comp: this.meterComp,
                idd: this.meterIdd,
                vdd: this.meterVdd
            },
            micGain: this.micGain,
            micEq: this.micEq,
            cwSpeed: this.cwSpeed,
            breakIn: this.breakIn,
            monitor: this.monitorLevel,
            ctcssIndex: this.side().ctcssIndex,
            ctcss: (FTX1_CTCSS[this.side().ctcssIndex] ?? 0) / 10,
            dcsIndex: this.side().dcsIndex,
            dcs: FTX1_DCS[this.side().dcsIndex] ?? 0,
            memoryScan: { ...this.memScan },
            cwMemories: [...this.cwMemories],
            recentlySet: Date.now() - this.lastSetAt < 1500
        };

    }

    /* one entry point for the page, input validated here */
    control(control: string, value: unknown): void {

        const num = (): number => {
            const n = Number(value);
            if (!Number.isFinite(n)) throw new Error(`Invalid value for ${control}`);
            return n;
        };
        const bool = (): boolean => value === true || value === 1 || value === "1" || value === "on";

        switch (control) {
            case "frequency": return this.setFrequency(num());
            case "frequencyB": return this.setFrequencyB(num());
            case "mode": return this.setMode(String(value), this.main.frequency);
            case "modeB": return this.setModeB(String(value));
            case "band": return this.setBand(String(value), "A");
            case "bandB": return this.setBand(String(value), "B");
            case "side": return this.setActiveVfo(value === "SUB" || value === "B" ? "B" : "A");
            case "split": return this.setSplit(bool());
            case "swap": return this.swapVfo();
            case "mainToSub": return this.mainToSub();
            case "subToMain": return this.subToMain();
            case "ptt": return this.setPtt(bool());
            case "tune": void this.tune(); return;
            case "tuneStop": return this.stopTune();
            case "power": return this.setPower(num());
            case "powerSwitch": return this.setPowerState(bool());
            case "afGain": return this.setAfGain(num());
            case "rfGain": return this.setRfGain(num());
            case "squelch": return this.setSquelch(num());
            case "att": return this.setAttenuator(bool() ? 1 : 0);
            case "preamp": return this.setIpo(num());
            case "agc": return this.setAgc(num());
            case "width": return this.setFilterWidth(num());
            case "shift": return this.setFilterShift(num());
            case "narrow": return this.setNarrow(bool());
            case "notch": return this.setNotch(bool());
            case "notchFrequency": return this.setNotchFrequency(num());
            case "dnf": return this.setAutoNotch(bool());
            case "contour": return this.setContour(bool());
            case "contourFrequency": return this.setContourFrequency(num());
            case "apf": return this.setApf(bool());
            case "apfOffset": return this.setApfOffset(num());
            case "dnr": return this.setDnr(bool());
            case "dnrLevel": return this.setDnrLevel(num());
            case "nb": return this.setNb(bool());
            case "nbLevel": return this.setNbLevel(num());
            case "micGain": return this.setMicGain(num());
            case "micEq": return this.setMicEq(bool());
            case "processor": return this.setProcessor(bool());
            case "cwSpeed": return this.setCwSpeed(num());
            case "breakIn": return this.setBreakIn(bool());
            case "monitor": void this.monitor(num()); return;
            case "cwMemory": void this.playCwMemory(num()); return;
            case "rptShift": return this.setRepeaterShift(num());
            case "toneMode": return this.setToneMode(num());
            case "ctcss": return this.setCtcssTone(num());
            case "dcs": return this.setDcsCode(num());
            case "memoryRecall": return this.recallMemory(num(), "MAIN");
            case "memoryRecallSub": return this.recallMemory(num(), "SUB");
            case "vfoMode": return this.vfoMode();
            case "channelUp": return this.channelStep(true);
            case "channelDown": return this.channelStep(false);
            case "qmbStore": return this.quickMemory(true);
            case "qmbRecall": return this.quickMemory(false);
            case "memoryScan": return this.scanMemories();
            default: throw new Error(`Unknown FTX-1 control: ${control}`);
        }

    }

}
