import { SerialPort } from "serialport";

import {
    RadioService
} from "./radio.interface.js";


export class RgoOneService implements RadioService {

    private port: SerialPort;

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

    private pollTimer?: NodeJS.Timeout;


    constructor(
        device: string,
        baudRate: number
    ) {

        this.port = new SerialPort({
            path: device,
            baudRate,
            dataBits: 8,
            stopBits: 1,
            parity: "none",
            autoOpen: false
        });


        this.port.on(
            "data",
            (data: Buffer) => {

                this.handleData(
                    data.toString()
                );

            }
        );


        this.port.on(
            "error",
            error => {

                console.error(
                    "RGO CAT error:",
                    error.message
                );

            }
        );


        this.port.on(
            "open",
            () => {

                console.log(
                    `RGO CAT connected: ${device} @ ${baudRate}`
                );

            }
        );


        this.port.on(
            "close",
            () => {

                console.log(
                    "RGO CAT disconnected"
                );

            }
        );

    }


    isConnected(): boolean {

        return this.port.isOpen;

    }


    start(): void {

        if (this.port.isOpen) {

            return;

        }


        this.port.open(
            error => {

                if (error) {

                    console.error(
                        "RGO CAT open error:",
                        error.message
                    );

                    return;

                }


                console.log(
                    "RGO CAT connected"
                );


                /*
                 * First poll immediately.
                 *
                 * This deliberately follows the same
                 * architecture as the working FTDX10:
                 *
                 *   poll()
                 *   setInterval(() => poll())
                 *
                 * Commands are sent individually.
                 * Never concatenate the CAT commands.
                 */

                this.poll();


                this.pollTimer =
                    setInterval(
                        () => {

                            this.poll();

                        },
                        2000
                    );

            }
        );

    }


    private poll(): void {

        if (!this.port.isOpen) {

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

        if (!this.port.isOpen) {

            return;

        }


        console.log(
            "RGO CAT TX:",
            command
        );


        this.port.write(
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

            this.atuEnabled =
                match[1] === "1";

            this.atuTuning =
                match[2] === "1";

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

        this.frequency =
            Number(frequencyText);

        this.ritXitOffset =
            Number(offsetText);

        /*
         * Status fields after the RIT/XIT offset.
         *
         * offset ends at body[20]
         * RIT = body[21]
         * XIT = body[22]
         * TX  = body[23]
         */

        this.ritEnabled =
            body[21] === "1";

        this.xitEnabled =
            body[22] === "1";

        this.txState =
            body[23] === "1";

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

        if (!this.port.isOpen) {

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


    bandUp(): void {

        if (!this.port.isOpen) {

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

        if (!this.port.isOpen) {

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

        if (!this.port.isOpen) {

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

        if (!this.port.isOpen) {

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

        if (!this.port.isOpen) {

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
                "CW-R": "7"

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
            normalizedMode;


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

    if (!this.port.isOpen) {
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


    getSplit(): boolean {

        return this.split;

    }


    getRxVfo(): number {

        return this.rxVfo;

    }


    getTxVfo(): number {

        return this.txVfo;

    }


    getFineTuning(): boolean {

        return this.fineTuning;

    }


    getFirmware(): string {

        return this.firmware;

    }


    getRadioId(): string {

        return this.radioId;

    }


    getSerialNumber(): string {

        return this.serialNumber;

    }


    getLastIfResponse(): string {

        return this.lastIfResponse;

    }


    getLastRx(): string {

        return this.lastRx;

    }

}
