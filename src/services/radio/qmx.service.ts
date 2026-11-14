import { SerialRadioBase } from "./serial-radio-base.js";

import { RadioService } from "./radio.interface.js";


/*
 * QRP Labs QMX / QMX+ CAT (Kenwood TS-480 subset + QRP Labs extensions,
 * see the QMX CAT manual, firmware 1_04_xxx).
 *
 *   FA / FB        VFO A / B, 11 digits Hz
 *   FR / FT / SP   RX VFO, TX VFO, split
 *   IF             TS-480 status (frequency, RIT, TX, mode, VFO, split)
 *   MD             1 LSB, 2 USB, 3 CW, 5 AM, 6 FSK, 7 CW-R, 9 FSK-R
 *   SM / SA        S-meter / AGC attenuation in dB
 *   PC / SW        output power (0.1 W) / SWR (0.01) - only while TX
 *   KS             keyer speed WPM
 *   AG / RG        AF gain (0-799, 0.25 dB) / RF gain (dB)
 *   RT RC RU RD    RIT on/off, clear, up, down
 *   TR             tune step 0..7 (10 MHz .. 10 Hz)
 *   BU / BD        band up / down
 *   KY / TB        send CW text / decoded CW buffer
 *   KD             key down / up (carrier)
 *   LC             the 2 x 16 characters of the LCD
 *   VN / OM        firmware version / model
 *
 * Every answer ends with ";" - except LC (32 characters that may
 * contain anything) and TB (length in the answer), which are read
 * with their fixed length.
 */

export const QMX_MODES: Record<string, string> = {
    LSB: "1",
    USB: "2",
    CW: "3",
    "CW-R": "7",
    AM: "5",
    FSK: "6",
    "FSK-R": "9"
};

const MODE_BY_CODE: Record<string, string> =
    Object.fromEntries(Object.entries(QMX_MODES).map(([name, code]) => [code, name]));

/* All bands a QMX / QMX+ can have */
export const QMX_BANDS: Array<{ name: string; low: number; high: number; start: number }> = [
    { name: "160m", low: 1_800_000, high: 2_000_000, start: 1_836_000 },
    { name: "80m", low: 3_500_000, high: 4_000_000, start: 3_573_000 },
    { name: "60m", low: 5_250_000, high: 5_450_000, start: 5_357_000 },
    { name: "40m", low: 7_000_000, high: 7_300_000, start: 7_030_000 },
    { name: "30m", low: 10_100_000, high: 10_150_000, start: 10_116_000 },
    { name: "20m", low: 14_000_000, high: 14_350_000, start: 14_060_000 },
    { name: "17m", low: 18_068_000, high: 18_168_000, start: 18_086_000 },
    { name: "15m", low: 21_000_000, high: 21_450_000, start: 21_060_000 },
    { name: "12m", low: 24_890_000, high: 24_990_000, start: 24_906_000 },
    { name: "11m", low: 26_965_000, high: 27_405_000, start: 27_185_000 },
    { name: "10m", low: 28_000_000, high: 29_700_000, start: 28_060_000 },
    { name: "6m", low: 50_000_000, high: 54_000_000, start: 50_096_000 }
];

/*
 * Band versions: the bands in the order of the radio's band
 * configuration (= the BN numbers).
 */
export type QmxBandVersion = "auto" | "80-20" | "60-15" | "20-10" | "plus";

export const QMX_VERSIONS: Record<Exclude<QmxBandVersion, "auto">, { label: string; bands: string[] }> = {
    "80-20": { label: "QMX 80/60/40/30/20 m", bands: ["80m", "60m", "40m", "30m", "20m"] },
    "60-15": { label: "QMX 60/40/30/20/17/15 m", bands: ["60m", "40m", "30m", "20m", "17m", "15m"] },
    "20-10": { label: "QMX 20/17/15/12/11/10 m", bands: ["20m", "17m", "15m", "12m", "11m", "10m"] },
    "plus": { label: "QMX+ 160–6 m", bands: ["160m", "80m", "60m", "40m", "30m", "20m", "17m", "15m", "12m", "11m", "10m", "6m"] }
};

/* TR: tune-knob step */
export const QMX_STEPS = [10_000_000, 1_000_000, 100_000, 10_000, 1_000, 500, 100, 10];

/* Safety: a carrier (KD1) from the remote page ends after this time */
const CARRIER_MAX_MS = 15_000;

const FAST_POLL = "IF;FB;SM;LC;TB;";
const SLOW_POLL = "FR;FT;SP;KS;AG;RG;TR;SA;BN;";


export class QmxService extends SerialRadioBase implements RadioService {

    private buffer = "";

    private frequency = 0;
    private frequencyB = 0;
    private mode = "UNKNOWN";
    private rxVfo = 0;
    private txVfo = 0;
    private split = false;
    private tx = false;
    private ritOn = false;
    private ritOffset = 0;

    private power = 0;          // W, measured while TX
    private swr = 0;            // while TX
    private sMeter = 0;         // dB
    private agcAtten = 0;       // dB
    private keyerSpeed = 0;
    private afGain = -1;        // 0..799
    private rfGain = -1;        // dB
    private step = -1;          // TR index

    private lcd = "";
    private lcdSupported = true;
    private version = "";
    private model = "";

    private decoded = "";       // decoded CW (TB), last 200 characters
    private kyPending = 0;      // characters still to send (TB "t")

    private lastAnswerAt = 0;
    private pollCount = 0;
    private carrierTimer: ReturnType<typeof setTimeout> | null = null;
    private keyDown = false;

    /* the last frequency per band - band buttons go back there */
    private readonly bandMemory = new Map<string, number>();

    /* band version: configured, or detected from BN + current band */
    private readonly bandVersion: QmxBandVersion;
    private detectedVersion: Exclude<QmxBandVersion, "auto"> | null = null;
    private bandNumber = -1;


    constructor(device: string, baudRate: number, bandVersion: QmxBandVersion = "auto") {
        super({
            name: "QMX CAT",
            device,
            baudRate,
            pollIntervalMs: 400,
            rxTimeoutMs: 15000,
        });
        this.bandVersion = bandVersion;
    }


    /* ------------------------------------------------------------ serial */

    protected override onConnected(): void {
        this.buffer = "";
        this.lcdSupported = true;
        this.write("VN;OM;ID;IF;FB;MD;KS;BN;");
    }

    protected override onDisconnected(): void {
        this.keyDown = false;
        this.tx = false;
        if (this.carrierTimer) {
            clearTimeout(this.carrierTimer);
            this.carrierTimer = null;
        }
    }

    protected override poll(): void {

        this.pollCount++;

        // LC only when the firmware knows it
        let fast = this.lcdSupported ? FAST_POLL : FAST_POLL.replace("LC;", "");

        if (this.tx) {
            fast += "PC;SW;";
        }

        this.write(this.pollCount % 5 === 0 ? fast + SLOW_POLL : fast);

    }

    requestStatus(): void {
        this.write("IF;FB;");
    }

    protected onData(data: Buffer): void {

        this.lastAnswerAt = Date.now();
        this.buffer += data.toString("latin1");

        if (this.buffer.length > 4096) {
            this.buffer = this.buffer.slice(-1024);
        }

        for (;;) {

            // skip noise up to the next command (two letters / letter+digit) or "?;"
            const start = this.buffer.search(/[A-Z?]/);
            if (start < 0) { this.buffer = ""; return; }
            if (start > 0) this.buffer = this.buffer.slice(start);

            if (this.buffer.startsWith("?;")) {
                this.buffer = this.buffer.slice(2);
                this.onError();
                continue;
            }

            const command = this.buffer.slice(0, 2);
            if (command.length < 2) return;

            // fixed length answers
            if (command === "LC") {
                if (this.buffer.length >= 2 && this.buffer[2] === ";") {
                    // "LC;" - nothing
                    this.buffer = this.buffer.slice(3);
                    continue;
                }
                if (this.buffer.length < 35) return;
                if (this.buffer[34] === ";") {
                    this.lcd = this.buffer.slice(2, 34);
                    this.buffer = this.buffer.slice(35);
                    continue;
                }
                // not the expected length - treat as a normal answer
            }

            if (command === "TB" && /^TB\d\d\d/.test(this.buffer)) {
                const count = Number(this.buffer.slice(3, 5));
                const total = 5 + count + 1;
                if (this.buffer.length < total) return;
                this.onDecoded(Number(this.buffer[2]), this.buffer.slice(5, 5 + count));
                this.buffer = this.buffer.slice(total);
                continue;
            }

            const end = this.buffer.indexOf(";");
            if (end < 0) return;

            const answer = this.buffer.slice(0, end);
            this.buffer = this.buffer.slice(end + 1);
            this.parse(answer);

        }

    }

    /* "?;" - an unknown command. The only one we poll that older firmware
       may not know is LC. */
    private lastLcRequestErrors = 0;

    private onError(): void {
        if (this.lcd === "" && this.lcdSupported) {
            this.lastLcRequestErrors++;
            if (this.lastLcRequestErrors >= 3) {
                this.lcdSupported = false;
                console.log("QMX CAT: no LC command (older firmware) - LCD from the CAT values");
            }
        }
    }

    private onDecoded(pending: number, text: string): void {
        this.kyPending = pending;
        if (text) {
            this.decoded = (this.decoded + text).slice(-200);
        }
    }

    private parse(answer: string): void {

        const command = answer.slice(0, 2);
        const value = answer.slice(2);
        const number = Number(value.trim());

        switch (command) {

            case "FA":
                if (/^\d+$/.test(value)) this.setVfoA(Number(value));
                break;

            case "FB":
                if (/^\d+$/.test(value)) this.frequencyB = Number(value);
                break;

            case "IF":
                this.parseIf(value);
                break;

            case "MD":
                this.mode = MODE_BY_CODE[value] ?? this.mode;
                break;

            case "FR":
                if (value) this.rxVfo = number;
                break;

            case "FT":
                if (value) this.txVfo = number;
                break;

            case "SP":
                if (value) this.split = value === "1";
                break;

            case "TQ":
                if (value) this.tx = value === "1";
                break;

            case "KS":
                if (value && Number.isFinite(number)) this.keyerSpeed = number;
                break;

            case "AG":
                if (value && Number.isFinite(number)) this.afGain = number;
                break;

            case "RG":
                if (value && Number.isFinite(number)) this.rfGain = number;
                break;

            case "TR":
                if (value && Number.isFinite(number)) this.step = number;
                break;

            case "SM":
                if (value && Number.isFinite(number)) this.sMeter = number;
                break;

            case "SA":
                if (value && Number.isFinite(number)) this.agcAtten = number;
                break;

            case "PC":
                // only measured while transmitting, "PC;" in RX
                this.power = value && Number.isFinite(number) ? number / 10 : 0;
                break;

            case "SW":
                this.swr = value && Number.isFinite(number) ? number / 100 : 0;
                break;

            case "RT":
                if (value) this.ritOn = value === "1";
                break;

            case "BN":
                if (value && Number.isFinite(number)) {
                    this.bandNumber = number;
                    this.detectVersion();
                }
                break;

            case "VN":
                this.version = value;
                break;

            case "OM":
                this.model = value;
                break;

            default:
                break;

        }

    }

    /*
     * Auto detection: BN is the position of the current band in the
     * radio's band list. Only one version has the current band at
     * that position (40 m = BN 2 on the 80-20 m QMX, 1 on the
     * 60-15 m QMX, 3 on the QMX+ ...).
     */
    private detectVersion(): void {

        if (this.bandVersion !== "auto" || this.bandNumber < 0) return;

        const band = this.bandOf(this.getFrequency());
        if (!band) return;

        const matches = (Object.keys(QMX_VERSIONS) as Array<keyof typeof QMX_VERSIONS>)
            .filter(key => QMX_VERSIONS[key].bands[this.bandNumber] === band);

        if (matches.length === 1 && matches[0] !== this.detectedVersion) {
            this.detectedVersion = matches[0]!;
            console.log(`QMX CAT: band version ${QMX_VERSIONS[this.detectedVersion].label} (BN${this.bandNumber} = ${band})`);
        }

    }

    /* the bands of this radio (all, as long as the version is unknown) */
    getBands(): string[] {
        const version = this.bandVersion !== "auto" ? this.bandVersion : this.detectedVersion;
        return version ? QMX_VERSIONS[version].bands : QMX_BANDS.map(b => b.name);
    }

    /*
     * TS-480 IF: frequency(11) spaces(5) RIT(5, ±9999) RIT-on(1) XIT(1)
     * bank(1) channel(2) TX(1) mode(1) VFO(1) scan(1) split(1) tone(1)
     * tone-number(2) space(1)
     */
    private parseIf(value: string): void {

        if (value.length < 33) return;

        const hz = Number(value.slice(0, 11));
        if (Number.isFinite(hz) && hz > 0) this.setVfoA(hz, Number(value[28]) === 1);

        const rit = Number(value.slice(16, 21));
        if (Number.isFinite(rit)) this.ritOffset = rit;

        this.ritOn = value[21] === "1";
        this.tx = value[26] === "1";
        this.mode = MODE_BY_CODE[value[27] ?? ""] ?? this.mode;
        this.rxVfo = value[28] === "1" ? 1 : 0;
        this.split = value[30] === "1";

    }

    /* IF reports the frequency of the VFO in use */
    private setVfoA(hz: number, isVfoB = false): void {

        if (isVfoB) {
            this.frequencyB = hz;
        }
        else {
            this.frequency = hz;
        }

        const band = this.bandOf(hz);
        if (band) this.bandMemory.set(band, hz);

    }


    /* ------------------------------------------------------------ RadioService */

    private send(command: string): void {
        if (!this.write(command)) {
            throw new Error("QMX CAT not connected");
        }
    }

    private static freq(hz: number): string {
        return Math.round(hz).toString().padStart(11, "0");
    }

    setFrequency(frequency: number): void {

        if (!this.isConnected()) {
            console.warn("QMX CAT not connected");
            return;
        }

        // in VFO B mode the radio works on B
        this.write(`${this.rxVfo === 1 ? "FB" : "FA"}${QmxService.freq(frequency)};`);

        if (this.rxVfo === 1) this.frequencyB = Math.round(frequency);
        else this.frequency = Math.round(frequency);

    }

    setFrequencyB(frequency: number): void {
        this.write(`FB${QmxService.freq(frequency)};`);
        this.frequencyB = Math.round(frequency);
    }

    setSplit(enabled: boolean): void {
        this.write(`SP${enabled ? 1 : 0};`);
        this.split = enabled;
    }

    getSplit(): boolean {
        return this.split;
    }

    /* general names from spots / tune routes -> QMX mode */
    private normalizeMode(mode: string, frequency: number): string {

        const requested = String(mode || "").trim().toUpperCase();

        const aliases: Record<string, string> = {
            CWR: "CW-R",
            "CW-L": "CW-R",
            "CW-U": "CW",
            FSR: "FSK-R",
            SSB: frequency > 0 && frequency < 10_000_000 ? "LSB" : "USB",
            FT8: "USB",
            FT4: "USB",
            JS8: "USB",
            WSPR: "USB",
            DIGI: "USB",
            DATA: "USB",
            "DATA-U": "USB",
            "USB-D": "USB",
            "DATA-L": "LSB",
            "LSB-D": "LSB",
            PSK: "USB",
            RTTY: "FSK",
            "RTTY-R": "FSK-R",
        };

        const name = aliases[requested] ?? requested;

        if (!QMX_MODES[name]) {
            throw new Error(`Unsupported QMX mode: ${mode}`);
        }

        return name;

    }

    setMode(mode: string, frequency: number): void {

        let name: string;

        try {
            name = this.normalizeMode(mode, frequency);
        }
        catch (error) {
            console.error(error instanceof Error ? error.message : error);
            return;
        }

        if (!this.isConnected()) {
            console.warn("QMX CAT not connected");
            return;
        }

        this.write(`MD${QMX_MODES[name]};`);
        this.mode = name;

    }

    getFrequency(): number {
        return this.rxVfo === 1 ? this.frequencyB : this.frequency;
    }

    getMode(): string {
        return this.mode;
    }

    getPower(): number {
        return this.power;
    }


    /* ------------------------------------------------------------ remote page */

    private bandOf(hz: number): string {
        return QMX_BANDS.find(b => hz >= b.low && hz <= b.high)?.name ?? "";
    }

    /* QMX S-meter: dB -> S units (S9 = 54 dB above S0, 6 dB per S unit) */
    private sUnits(): number {
        return Math.max(0, this.sMeter / 6);
    }

    getState() {

        const frequency = this.getFrequency();

        return {
            connected: this.isConnected(),
            alive: Date.now() - this.lastAnswerAt < 3000,
            error: this.getLastError(),
            model: this.model === "QC" || this.model === "" ? "QMX" : this.model,
            version: this.version,
            bands: this.getBands(),
            bandVersion: this.bandVersion,
            bandVersionLabel: (() => {
                const version = this.bandVersion !== "auto" ? this.bandVersion : this.detectedVersion;
                return version ? QMX_VERSIONS[version].label : "";
            })(),
            bandVersionDetected: this.bandVersion === "auto" && this.detectedVersion !== null,
            frequency,
            frequencyA: this.frequency,
            frequencyB: this.frequencyB,
            band: this.bandOf(frequency),
            mode: this.mode,
            vfo: this.rxVfo === 1 ? "B" : "A",
            txVfo: this.txVfo === 1 ? "B" : "A",
            split: this.split,
            tx: this.tx,
            keyDown: this.keyDown,
            rit: { on: this.ritOn, offset: this.ritOffset },
            meters: {
                sDb: this.sMeter,
                s: this.sUnits(),
                agc: this.agcAtten,
                power: this.power,
                swr: this.swr
            },
            keyerSpeed: this.keyerSpeed,
            afGain: this.afGain,
            rfGain: this.rfGain,
            step: this.step >= 0 ? QMX_STEPS[this.step] ?? 0 : 0,
            lcd: this.lcdSupported ? this.lcd : "",
            decoded: this.decoded,
            cwPending: this.kyPending
        };

    }

    /*
     * Remote page controls: POST /api/qmx/control { control, value }
     */
    control(name: string, value: unknown): void {

        if (!this.isConnected()) {
            throw new Error("QMX CAT not connected");
        }

        const num = Number(value);
        const needNumber = (min: number, max: number): number => {
            if (!Number.isFinite(num) || num < min || num > max) {
                throw new Error(`${name}: value ${String(value)} out of range ${min}..${max}`);
            }
            return Math.round(num);
        };

        switch (name) {

            case "frequency":
                this.setFrequency(needNumber(100_000, 60_000_000));
                return;

            case "frequencyB":
                this.setFrequencyB(needNumber(100_000, 60_000_000));
                return;

            /* tune by n steps of the current tune step (default 1 kHz / 10 Hz) */
            case "tune": {
                const steps = needNumber(-1000, 1000);
                const size = this.step >= 0 ? QMX_STEPS[this.step]! : 10;
                const base = Math.round(this.getFrequency() / size) * size;
                this.setFrequency(Math.max(100_000, base + steps * size));
                return;
            }

            case "step": {
                const index = QMX_STEPS.indexOf(needNumber(10, 10_000_000));
                if (index < 0) throw new Error(`step: ${String(value)} not supported`);
                this.send(`TR${index};`);
                this.step = index;
                return;
            }

            case "mode":
                this.setMode(String(value ?? ""), this.getFrequency());
                return;

            case "band": {
                const band = QMX_BANDS.find(b => b.name === String(value));
                if (!band) throw new Error(`band: ${String(value)} unknown`);
                if (!this.getBands().includes(band.name)) throw new Error(`${band.name} is not a band of this QMX`);
                this.setFrequency(this.bandMemory.get(band.name) ?? band.start);
                return;
            }

            case "bandUp":
                this.send("BU;IF;");
                return;

            case "bandDown":
                this.send("BD;IF;");
                return;

            case "vfo": {
                const b = String(value).toUpperCase() === "B";
                // VFO B mode: RX and TX on B; split stays off
                this.send(b ? "FR1;FT1;IF;" : "FR0;FT0;IF;");
                this.rxVfo = this.txVfo = b ? 1 : 0;
                this.split = false;
                return;
            }

            case "split":
                this.setSplit(Boolean(value));
                this.write("IF;");
                return;

            case "aEqualsB":
                this.setFrequencyB(this.frequency);
                return;

            case "swap": {
                const a = this.frequency;
                const b = this.frequencyB;
                this.send(`FA${QmxService.freq(b)};FB${QmxService.freq(a)};IF;`);
                this.frequency = b;
                this.frequencyB = a;
                return;
            }

            case "keyerSpeed":
                this.send(`KS${String(needNumber(5, 60)).padStart(3, "0")};`);
                this.keyerSpeed = needNumber(5, 60);
                return;

            case "afGain":
                this.send(`AG0${String(needNumber(0, 799)).padStart(3, "0")};`);
                this.afGain = needNumber(0, 799);
                return;

            case "rfGain":
                this.send(`RG${String(needNumber(0, 99)).padStart(2, "0")};`);
                this.rfGain = needNumber(0, 99);
                return;

            case "rit":
                this.send(`RT${value ? 1 : 0};`);
                this.ritOn = Boolean(value);
                return;

            /* RIT offset in Hz: clear, then up/down - correct for the
               "absolute" and for the "relative" CAT RU/RD setting */
            case "ritOffset": {
                const hz = needNumber(-9999, 9999);
                const digits = String(Math.abs(hz)).padStart(3, "0");
                this.send(hz === 0 ? "RC;IF;" : `RC;${hz > 0 ? "RU" : "RD"}${digits};IF;`);
                this.ritOffset = hz;
                return;
            }

            case "ritClear":
                this.send("RC;IF;");
                this.ritOffset = 0;
                return;

            /* send CW text (KY, QMX format "KY text;") */
            case "cw": {
                const text = String(value ?? "")
                    .toUpperCase()
                    .replace(/[;\r\n]/g, " ")
                    .replace(/[^A-Z0-9 .,?/=+\-'"()@:!&[\]_<>#%\\]/g, "")
                    .slice(0, 72);
                if (!text.trim()) return;
                this.send(`KY ${text};`);
                return;
            }

            /* stop CW sending: back to receive */
            case "cwStop":
                this.send("RX;");
                this.tx = false;
                return;

            /* carrier (key down) for tuning an antenna - at most 15 s */
            case "carrier":
                this.setCarrier(Boolean(value));
                return;

            case "clearDecoded":
                this.decoded = "";
                return;

            default:
                throw new Error(`Unknown QMX control: ${name}`);

        }

    }

    private setCarrier(on: boolean): void {

        if (this.carrierTimer) {
            clearTimeout(this.carrierTimer);
            this.carrierTimer = null;
        }

        if (on) {
            this.send("KD1;");
            this.keyDown = true;
            this.tx = true;
            this.carrierTimer = setTimeout(() => {
                this.carrierTimer = null;
                this.write("KD0;");
                this.keyDown = false;
                console.log("QMX CAT: carrier stopped after 15 s (safety)");
            }, CARRIER_MAX_MS);
        }
        else {
            this.write("KD0;");
            this.keyDown = false;
        }

    }

}
