import { SerialRadioBase } from "./serial-radio-base.js";

import {
    RadioService
} from "./radio.interface.js";


export class RgoOneService extends SerialRadioBase implements RadioService {


    private frequency = 0;
    private frequencyB = 0;

    private mode = "UNKNOWN";
    private power = 0;

    private rfGain = 0;
    private micGain = 0;

    private preamp = false;
    private attenuator = false;
    private noiseBlanker = false;

    private agc = "UNKNOWN";
    private agcCode = 0;

    private atuEnabled = false;
    private atuTuning = false;

    private cwSpeed = 0;
    private breakInDelay = 0;

    private sMeter = 0;
    private meterFunction = 0;
    private meterValue = 0;

    private ritEnabled = false;
    private xitEnabled = false;
    private ritXitOffset = 0;

    private txState = false;
    private split = false;

    private rxVfo = 0;
    private txVfo = 0;
    private fineTuning = false;

    private firmware = "UNKNOWN";
    private radioId = "UNKNOWN";
    private serialNumber = "UNKNOWN";

    private lastIfResponse = "";
    private lastRx = "";

    private buffer = "";

    private kyWaiters: Array<(busy: boolean) => void> = [];
    private cwJob = 0;



    constructor(
        device: string,
        baudRate: number
    ) {

        super({
            name: "RGO CAT",
            device,
            baudRate,
            dataBits: 8,
            stopBits: 1,
            parity: "none",
            pollIntervalMs: 2000,
            rxTimeoutMs: 15000,
        });

    }


    protected onData(data: Buffer): void {

        this.handleData(
            data.toString()
        );

    }






    protected override poll(): void {

        if (!this.isConnected()) {

            return;

        }


        /*
         * Basic status
         */
        this.send("FA;");
        this.send("FB;");
        this.send("FR;");
        this.send("FT;");
        this.send("FS;");
        this.send("MD;");
        this.send("PC;");


        /*
         * RF / receiver
         */
        this.send("RG;");
        this.send("MG;");
        this.send("PA;");
        this.send("RA;");
        this.send("NB;");
        this.send("GT;");


        /*
         * CW
         */
        this.send("KS;");
        this.send("SD;");


        /*
         * Meters
         */
        this.send("SM0;");
        this.send("RM;");


        /*
         * RIT / XIT
         */
        this.send("RT;");
        this.send("XT;");


        /*
         * ATU
         */
        this.send("AC;");


        /*
         * Full transceiver status.
         *
         * IF gives us:
         * frequency
         * RIT/XIT offset
         * RIT/XIT state
         * TX state
         * VFO
         * split
         * mode
         */

        this.send("IF;");


        /*
         * Identification / information.
         */

        this.send("ID;");

    }


    private send(command: string): void {

        if (!this.isConnected()) {

            return;

        }


        console.log(
            "RGO CAT TX:",
            command
        );


        this.write(
            command
        );

    }


    private handleData(data: string): void {

        this.buffer += data;


        let endIndex: number;


        while (
            (endIndex =
                this.buffer.indexOf(";")) !== -1
        ) {

            const message =
                this.buffer.slice(
                    0,
                    endIndex + 1
                );


            this.buffer =
                this.buffer.slice(
                    endIndex + 1
                );


            if (!message) {

                continue;

            }


            this.lastRx =
                message;


            console.log(
                "RGO CAT RX:",
                message
            );


            this.parseResponse(
                message
            );

        }

    }


    private parseResponse(
        response: string
    ): void {

        /*
         * VFO A
         *
         * FA00007056000;
         */

        let match =
            response.match(
                /^FA(\d{11});$/
            );


        if (match) {

            this.frequency =
                Number(match[1]);

            return;

        }


        /*
         * VFO B
         */

        match =
            response.match(
                /^FB(\d{11});$/
            );


        if (match) {

            this.frequencyB =
                Number(match[1]);

            return;

        }


        /*
         * RX VFO
         */

        match =
            response.match(
                /^FR([01]);$/
            );


        if (match) {

            this.rxVfo =
                Number(match[1]);

            this.split =
                this.rxVfo !== this.txVfo;

            return;

        }


        /*
         * TX VFO
         */

        match =
            response.match(
                /^FT([01]);$/
            );


        if (match) {

            this.txVfo =
                Number(match[1]);

            this.split =
                this.rxVfo !== this.txVfo;

            return;

        }


        /*
         * Fine tuning
         */

        match =
            response.match(
                /^FS([01]);$/
            );


        if (match) {

            this.fineTuning =
                match[1] === "1";

            return;

        }


        /*
         * Mode
         *
         * 1 LSB
         * 2 USB
         * 3 CW
         * 4 FM
         * 5 AM
         * 6 DIGI
         * 7 CW-R
         */

        match =
            response.match(
                /^MDP?([1-7]);$/
            );


        if (match) {

            this.mode =
                this.modeFromCode(
                    Number(match[1])
                );

            return;

        }


        /*
         * Power
         *
         * PC000;
         * PCP050;
         */

        match =
            response.match(
                /^PCP?(\d{3});$/
            );


        if (match) {

            this.power =
                Number(match[1]);

            return;

        }


        /*
         * RF Gain
         */

        match =
            response.match(
                /^RG(\d{3});$/
            );


        if (match) {

            this.rfGain =
                Number(match[1]);

            return;

        }


        /*
         * Mic Gain
         */

        match =
            response.match(
                /^MG(\d{3});$/
            );


        if (match) {

            this.micGain =
                Number(match[1]);

            return;

        }


        /*
         * Preamp
         *
         * Some RGO firmware responses contain
         * an additional parameter, therefore
         * accept both PA0; and PA01;.
         */

        match =
            response.match(
                /^PA([01])(?:[01])?;$/
            );


        if (match) {

            this.preamp =
                match[1] === "1";

            return;

        }


        /*
         * Attenuator
         *
         * RGO returns e.g. RA0000;
         */

        match =
            response.match(
                /^RA(?:00|01)(?:00)?;$/
            );


        if (match) {

            this.attenuator =
                response.startsWith("RA01");

            return;

        }


        /*
         * Noise blanker
         */

        match =
            response.match(
                /^NB([01]);$/
            );


        if (match) {

            this.noiseBlanker =
                match[1] === "1";

            return;

        }


        /*
         * AGC
         *
         * 000 OFF
         * 001 FAST
         * 002 SLOW
         */

        match =
            response.match(
                /^GT(\d{3});$/
            );


        if (match) {

            this.agcCode =
                Number(match[1]);


            switch (this.agcCode) {

                case 0:
                    this.agc = "OFF";
                    break;

                case 1:
                    this.agc = "FAST";
                    break;

                case 2:
                    this.agc = "SLOW";
                    break;

                default:
                    this.agc = "UNKNOWN";

            }


            return;

        }


        /*
         * CW speed
         */

        match =
            response.match(
                /^KS(\d{3});$/
            );


        if (match) {

            this.cwSpeed =
                Number(match[1]);

            return;

        }


        /*
         * Break-in delay
         */

        match =
            response.match(
                /^SD(\d{4});$/
            );


        if (match) {

            this.breakInDelay =
                Number(match[1]);

            return;

        }


        /*
         * S-meter
         *
         * Usually SM0000; ... SM0015;
         */

        match =
            response.match(
                /^SM(?:0)?(\d{4});$/
            );


        if (match) {

            this.sMeter =
                Number(match[1]);

            return;

        }


        /*
         * Meter function/value
         *
         * RM0xxxx; RF power
         * RM1xxxx; ALC
         * RM2xxxx; SWR
         * RM3xxxx; COMP
         */

        match =
            response.match(
                /^RM([0-3])(\d{4});$/
            );


        if (match) {

            this.meterFunction =
                Number(match[1]);

            this.meterValue =
                Number(match[2]);

            return;

        }


        /*
         * RIT
         */

        match =
            response.match(
                /^RT([01]);$/
            );


        if (match) {

            this.ritEnabled =
                match[1] === "1";

            return;

        }


        /*
         * XIT
         */

        match =
            response.match(
                /^XT([01]);$/
            );


        if (match) {

            this.xitEnabled =
                match[1] === "1";

            return;

        }


        /*
         * ATU
         *
         * AC1P2P3
         */

        match =
            response.match(
                /^AC([01])([01])([01]);$/
            );


        if (match) {

            // P1 = 1 always, P2 = ATU on (menu 34), P3 = tuning
            this.atuEnabled =
                match[2] === "1";

            this.atuTuning =
                match[3] === "1";

            return;

        }


        /*
         * CW keyer buffer: KY0 empty, KY1 full (busy)
         */

        match =
            response.match(
                /^KY([01]);$/
            );

        if (match) {

            const busy = match[1] === "1";
            const waiters = this.kyWaiters.splice(0);
            waiters.forEach(resolve => resolve(busy));

            return;

        }


        /*
         * Firmware
         */

        match =
            response.match(
                /^FW([^;]+);$/
            );


        if (match) {

            this.firmware =
                match[1] ?? "";

            return;

        }


        /*
         * Radio ID
         */

        match =
            response.match(
                /^ID([^;]+);$/
            );


        if (match) {

            this.radioId =
                match[1] ?? "";

            return;

        }


        /*
         * Serial number
         */

        match =
            response.match(
                /^SN([^;]+);$/
            );


        if (match) {

            this.serialNumber =
                match[1] ?? "";

            return;

        }


        /*
         * IF = complete TS-480 compatible
         * transceiver status.
         *
         * Example:
         *
         * IF00007056000     -00000000001000000 ;
         */

        if (
            response.startsWith("IF")
        ) {

            this.parseIfResponse(
                response
            );

            return;

        }

    }


    private parseIfResponse(
        response: string
    ): void {

        this.lastIfResponse =
            response;

        /*
         * RGO ONE / TS-480 compatible IF response.
         *
         * Example:
         *
         * IF00003501090     +26501000003000000 ;
         *
         * Frequency: 11 digits
         * RIT/XIT offset: signed 4 digits
         * followed by the individual status fields.
         */

        const body =
            response.substring(
                2,
                response.length - 1
            );

        if (
            !response.startsWith("IF") ||
            body.length < 25
        ) {

            console.log(
                "RGO IF parse failed:",
                response
            );

            return;

        }

        const frequencyText =
            body.substring(0, 11);

        const offsetText =
            body.substring(16, 21);

        if (
            !/^\d{11}$/.test(frequencyText) ||
            !/^[+-]\d{4}$/.test(offsetText)
        ) {

            console.log(
                "RGO IF parse failed:",
                response
            );

            return;

        }

        const activeFrequency =
            Number(frequencyText);

        if (this.rxVfo === 1) {

            this.frequencyB =
                activeFrequency;

        } else {

            this.frequency =
                activeFrequency;

        }

        this.ritXitOffset =
            Number(offsetText);

        /*
         * Status fields after the RIT/XIT offset (TS-480):
         *
         * RIT = body[21], XIT = body[22],
         * memory bank / channel = body[23..25],
         * TX = body[26], mode = body[27], VFO = body[28],
         * scan = body[29], split = body[30]
         */

        this.ritEnabled =
            body[21] === "1";

        this.xitEnabled =
            body[22] === "1";

        if (body.length >= 27) {
            this.txState =
                body[26] === "1";
        }

        if (body.length >= 28 && /[1-7]/.test(body[27] ?? "")) {
            this.mode =
                this.modeFromCode(Number(body[27]));
        }

        if (body.length >= 31) {
            // FR / FT (RX VFO != TX VFO) count as well
            this.split =
                body[30] === "1" || this.rxVfo !== this.txVfo;
        }

        console.log(
            "RGO IF STATUS:",
            "offset=",
            this.ritXitOffset,
            "RIT=",
            this.ritEnabled,
            "XIT=",
            this.xitEnabled,
            "TX=",
            this.txState
        );

    }


    private modeFromCode(
        code: number
    ): string {

        switch (code) {

            case 1:
                return "LSB";

            case 2:
                return "USB";

            case 3:
                return "CW";

            case 4:
                return "FM";

            case 5:
                return "AM";

            case 6:
                return "DIGI";

            case 7:
                return "CW-R";

            default:
                return "UNKNOWN";

        }

    }


    setFrequency(
        frequency: number
    ): void {

        if (!this.isConnected()) {

            console.error(
                "RGO CAT not connected"
            );

            return;

        }


        this.frequency =
            Math.round(frequency);


        const value =
            this.frequency
                .toString()
                .padStart(11, "0");


        this.send(
            `FA${value};`
        );

    }


    setFrequencyA(
        frequency: number
    ): void {

        this.setFrequency(frequency);

    }


    setFrequencyB(
        frequency: number
    ): void {

        if (!this.isConnected()) {

            console.error(
                "RGO CAT not connected"
            );

            return;

        }

        this.frequencyB =
            Math.round(frequency);

        const value =
            this.frequencyB
                .toString()
                .padStart(11, "0");

        this.send(
            `FB${value};`
        );

    }


    setRxVfo(
        vfo: number
    ): void {

        if (!this.isConnected()) {

            console.error(
                "RGO CAT not connected"
            );

            return;

        }

        const value =
            Number(vfo) === 1
                ? 1
                : 0;

        this.rxVfo =
            value;

        this.send(
            `FR${value};`
        );

    }


    setTxVfo(
        vfo: number
    ): void {

        if (!this.isConnected()) {

            console.error(
                "RGO CAT not connected"
            );

            return;

        }

        const value =
            Number(vfo) === 1
                ? 1
                : 0;

        this.txVfo =
            value;

        this.send(
            `FT${value};`
        );

    }


    bandUp(): void {

        if (!this.isConnected()) {

            console.error(
                "RGO CAT not connected"
            );

            return;

        }

        this.send(
            "BU;"
        );

    }


    bandDown(): void {

        if (!this.isConnected()) {

            console.error(
                "RGO CAT not connected"
            );

            return;

        }

        this.send(
            "BD;"
        );

    }


    setRit(
        enabled: boolean
    ): void {

        if (!this.isConnected()) {

            console.error(
                "RGO CAT not connected"
            );

            return;

        }

        this.ritEnabled =
            enabled;

        this.send(
            `RT${enabled ? "1" : "0"};`
        );

    }


    setXit(
        enabled: boolean
    ): void {

        if (!this.isConnected()) {

            console.error(
                "RGO CAT not connected"
            );

            return;

        }

        this.xitEnabled =
            enabled;

        this.send(
            `XT${enabled ? "1" : "0"};`
        );

    }


    setMode(
        mode: string,
        frequency: number
    ): void {

        if (!this.isConnected()) {

            console.error(
                "RGO CAT not connected"
            );

            return;

        }


        let normalizedMode =
            mode.toUpperCase();


        if (
            normalizedMode === "SSB"
        ) {

            normalizedMode =
                frequency < 10000000
                    ? "LSB"
                    : "USB";

        }


        const modes:
            Record<string, string> = {

                LSB: "1",
                USB: "2",
                CW: "3",
                FM: "4",
                AM: "5",
                DIGI: "6",
                DIG: "6",
                DATA: "6",
                RTTY: "6",
                "CW-U": "3",
                "CW-R": "7",
                "CW-L": "7"

            };


        const code =
            modes[normalizedMode];


        if (!code) {

            console.error(
                "Unsupported CAT mode:",
                mode
            );

            return;

        }


        this.mode =
            this.modeFromCode(Number(code));


        this.send(
            `MD${code};`
        );

    }


    getFrequency(): number {

        return this.frequency;

    }


    getFrequencyB(): number {

        return this.frequencyB;

    }


    getMode(): string {

        return this.mode;

    }


    setPower(power: number): void {

        const value =
            Math.max(
                0,
                Math.min(
                    50,
                    Math.round(power)
                )
            );

        const parameter =
            String(value).padStart(3, "0");

        this.send(
            `PC${parameter};`
        );

    }


    getPower(): number {

        return this.power;

    }


    getRfGain(): number {

        return this.rfGain;

    }


    getMicGain(): number {

        return this.micGain;

    }


    getPreamp(): boolean {

        return this.preamp;

    }


    getAttenuator(): boolean {

        return this.attenuator;

    }


    getNoiseBlanker(): boolean {

        return this.noiseBlanker;

    }


    getAgc(): string {

        return this.agc;

    }


    getAtuEnabled(): boolean {

        return this.atuEnabled;

    }


    getAtuTuning(): boolean {

        return this.atuTuning;

    }


    setCwSpeed(speed: number): void {

        const value =
            Math.max(
                5,
                Math.min(
                    45,
                    Math.round(speed)
                )
            );

        const parameter =
            String(value).padStart(3, "0");

        this.send(
            `KS${parameter};`
        );

    }


    getCwSpeed(): number {

        return this.cwSpeed;

    }


    getBreakInDelay(): number {

        return this.breakInDelay;

    }


    getSMeter(): number {

        return this.sMeter;

    }


    getMeterFunction(): number {

        return this.meterFunction;

    }


    getMeterValue(): number {

        return this.meterValue;

    }


    getRitEnabled(): boolean {

        return this.ritEnabled;

    }


    getXitEnabled(): boolean {

        return this.xitEnabled;

    }


    getRitXitOffset(): number {

        return this.ritXitOffset;

    }

setRitXitOffset(offset: number): void {

    if (!this.isConnected()) {
        console.error("RGO CAT not connected");
        return;
    }

    /*
     * RGO RIT/XIT offset:
     * -5000 ... +5000 Hz
     * 10 Hz steps
     */

    let target =
        Math.round(offset / 10) * 10;

    target =
        Math.max(
            -5000,
            Math.min(5000, target)
        );

    const current =
        this.ritXitOffset;

    const difference =
        target - current;

    if (difference === 0) {
        return;
    }

    const steps =
        Math.abs(difference) / 10;

    const command =
        difference > 0
            ? "RU"
            : "RD";

    /*
     * RGO CAT uses the five-digit
     * step parameter for RU/RD.
     *
     * 00100 = 100 × 10 Hz = 1000 Hz
     */

    const parameter =
        String(steps).padStart(5, "0");

    this.send(
        `${command}${parameter};`
    );

}


    getTxState(): boolean {

        return this.txState;

    }

getRxVfo(): number {

    return this.rxVfo;

}


getTxVfo(): number {

    return this.txVfo;

}


getSplit(): boolean {

    return this.split;

}

setSplit(
    enabled: boolean
): void {

    if (!this.isConnected()) {

        console.error(
            "RGO CAT not connected"
        );

        return;

    }

    if (enabled) {

        // SPLIT ON:
        // RX = VFO A
        // TX = VFO B
        //
        // VFO B is already prepared by /radio/split.

        this.setRxVfo(0);
        this.setTxVfo(1);

    } else {

        // SPLIT OFF:
        // RX = VFO A
        // TX = VFO A
        // B bleibt unverändert

        this.setRxVfo(0);
        this.setTxVfo(0);

    }

    this.split = enabled;

}



    /* =========================================================
       Controls of the RGO remote page (CAT manual v1.05)
       ========================================================= */

    getPowerRange(): { min: number; max: number } {
        return { min: 0, max: 50 };
    }

    /*
     * control name -> CAT command. The setting is shown at once
     * and read back from the radio right after.
     */
    control(control: string, value: unknown): void {

        if (!this.isConnected()) throw new Error("RGO CAT not connected");

        const num = (min: number, max: number) => {
            const n = Math.round(Number(value));
            if (!Number.isFinite(n) || n < min || n > max) throw new Error(`Invalid value for ${control}: ${min}-${max}`);
            return n;
        };
        const bool = () => value === true || value === 1 || value === "1" || String(value).toUpperCase() === "ON";
        const pad = (n: number, width: number) => String(n).padStart(width, "0");

        switch (control) {

            case "power":
                this.power = num(0, 50);
                this.send(`PC${pad(this.power, 3)};`);
                this.send("PC;");
                return;

            case "rfGain":
                this.rfGain = num(0, 100);
                this.send(`RG${pad(this.rfGain, 3)};`);
                this.send("RG;");
                return;

            case "micGain":
                this.micGain = num(0, 10);
                this.send(`MG${pad(this.micGain, 3)};`);
                this.send("MG;");
                return;

            case "preamp":
                this.preamp = bool();
                this.send(`PA${this.preamp ? 1 : 0};`);
                this.send("PA;");
                return;

            case "att":
                this.attenuator = bool();
                this.send(`RA${this.attenuator ? "01" : "00"};`);
                this.send("RA;");
                return;

            case "nb":
                this.noiseBlanker = bool();
                this.send(`NB${this.noiseBlanker ? 1 : 0};`);
                this.send("NB;");
                return;

            case "agc": {
                const names = ["OFF", "FAST", "SLOW"];
                const code = typeof value === "string" && names.includes(value.toUpperCase())
                    ? names.indexOf(value.toUpperCase())
                    : num(0, 2);
                this.agcCode = code;
                this.agc = names[code] ?? "UNKNOWN";
                this.send(`GT${pad(code, 3)};`);
                this.send("GT;");
                return;
            }

            case "breakIn":
                this.breakInDelay = num(0, 1200);
                this.send(`SD${pad(this.breakInDelay, 4)};`);
                this.send("SD;");
                return;

            case "cwSpeed":
                this.setCwSpeed(num(5, 45));
                this.send("KS;");
                return;

            case "meter": {
                const names = ["PWR", "ALC", "SWR", "COMP"];
                const code = typeof value === "string" && names.includes(value.toUpperCase())
                    ? names.indexOf(value.toUpperCase())
                    : num(0, 3);
                this.meterFunction = code;
                this.send(`RM${code};`);
                this.send("RM;");
                return;
            }

            case "tune":
                // internal ATU (menu 34, ATU board): AC1 1 1 = start, AC1 1 0 = stop
                if (!this.atuEnabled) throw new Error("Internal tuner is off (menu 34) or not installed");
                this.atuTuning = bool();
                this.send(`AC11${this.atuTuning ? 1 : 0};`);
                setTimeout(() => this.send("AC;"), 300);
                return;

            case "atu":
                // ATU on / off (menu 34)
                this.atuEnabled = bool();
                this.send(`AC1${this.atuEnabled ? 1 : 0}0;`);
                this.send("AC;");
                return;

            case "fine":
                this.fineTuning = bool();
                this.send(`FS${this.fineTuning ? 1 : 0};`);
                this.send("FS;");
                return;

            case "frequency": {
                const hz = num(100000, 60000000);
                if (this.rxVfo === 1) this.setFrequencyB(hz);
                else this.setFrequency(hz);
                return;
            }

            case "split":
                this.setSplit(bool());
                return;

            default:
                throw new Error(`Unknown control: ${control}`);
        }

    }


    /* ---------------------------------------------------- CW text (KY) */

    /* KY; -> KY0 (buffer empty) / KY1 (full); null = no answer */
    private queryKeyer(timeoutMs = 800): Promise<boolean | null> {
        return new Promise(resolve => {
            const waiter = (busy: boolean) => { clearTimeout(timer); resolve(busy); };
            const timer = setTimeout(() => {
                this.kyWaiters = this.kyWaiters.filter(w => w !== waiter);
                resolve(null);
            }, timeoutMs);
            this.kyWaiters.push(waiter);
            this.send("KY;");
        });
    }

    /*
     * Text -> CW through the keyer buffer (TS-480 format: "KY " +
     * 24 characters, unused characters are spaces). Longer texts go
     * in blocks of whole words; the next block when the buffer is
     * empty again. Returns after the first block.
     */
    async sendCwText(text: string): Promise<boolean> {

        if (!this.isConnected()) return false;

        const clean = String(text)
            .toUpperCase()
            .replace(/[^A-Z0-9 .,?/=+\-@]/g, "")
            .replace(/\s+/g, " ")
            .trim();

        if (!clean) return false;

        const blocks: string[] = [];
        let current = "";
        for (const word of clean.split(" ")) {
            const piece = word.slice(0, 23);
            const next = current ? `${current} ${piece}` : piece;
            if (next.length > 24) {
                blocks.push(current);
                current = ` ${piece}`;      // the word space at the start of the next block
            }
            else {
                current = next;
            }
        }
        if (current) blocks.push(current);

        const job = ++this.cwJob;

        const sendBlock = (block: string) => this.send(`KY ${block.padEnd(24, " ")};`);

        sendBlock(blocks[0]!);

        if (blocks.length > 1) {
            void (async () => {
                for (const block of blocks.slice(1)) {
                    const until = Date.now() + 90_000;
                    for (;;) {
                        await new Promise(resolve => setTimeout(resolve, 300));
                        if (job !== this.cwJob || !this.isConnected()) return;
                        const busy = await this.queryKeyer();
                        if (busy === false) break;
                        if (Date.now() > until) return;
                    }
                    if (job !== this.cwJob) return;
                    sendBlock(block);
                }
            })();
        }

        return true;

    }

    /* 24 spaces stop the message */
    async stopCwText(): Promise<boolean> {
        this.cwJob++;
        if (!this.isConnected()) return false;
        this.send(`KY ${" ".repeat(24)};`);
        return true;
    }

}
