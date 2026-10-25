import { SerialRadioBase } from "./serial-radio-base.js";

import {
    RadioService
} from "./radio.interface.js";

import {
    IcomCiv
} from "./icom-civ.js";


export class IcomService
    extends SerialRadioBase
    implements RadioService {

    private readonly controllerAddress =
        IcomCiv.CONTROLLER_ADDRESS;

    private civAddress: number;

    private frequency = 0;

    private mode = "UNKNOWN";

    private power = 0;


    private rxBuffer: number[] = [];


    constructor(
        device: string,
        baudRate: number,
        civAddress = 0xA4,
        private connection:
            "serial" |
            "network" = "serial",
        private host = "",
        private portNumber = 50002
    ) {

        /*
         * Icom does not poll (yet): no rx watchdog.
         * Network transport is not implemented: no serial port then.
         */
        super({
            name: "ICOM CI-V",
            device: connection === "network" ? "" : device,
            baudRate,
            pollIntervalMs: 0,
            rxTimeoutMs: 0,
        });

        this.civAddress =
            civAddress;

    }


    protected onData(data: Buffer): void {

        this.handleIncomingData(
            data
        );

    }


    override start(): void {

        console.log(
            "ICOM CI-V service starting:"
        );

        console.log(
            "Device:",
            this.device
        );

        console.log(
            "Baud rate:",
            this.baudRate
        );

        console.log(
            "CI-V address:",
            "0x" +
            this.civAddress
                .toString(16)
                .toUpperCase()
        );

        console.log(
            "Connection:",
            this.connection
        );


        if (
            this.connection === "network"
        ) {

            console.log(
                "Network host:",
                this.host
            );

            console.log(
                "Network port:",
                this.portNumber
            );

            console.log(
                "ICOM network transport not implemented yet."
            );

            return;
        }


        super.start();

    }


    private handleIncomingData(
        data: Buffer
    ): void {

        for (
            const byte of data
        ) {

            this.rxBuffer.push(
                byte
            );

        }


        while (true) {

            const start =
                this.findFrameStart();

            if (start < 0) {

                this.rxBuffer = [];

                return;

            }


            if (start > 0) {

                this.rxBuffer =
                    this.rxBuffer.slice(
                        start
                    );

            }


            const end =
                this.rxBuffer.indexOf(
                    IcomCiv.END,
                    2
                );

            if (end < 0) {

                return;

            }


            const frame =
                this.rxBuffer.slice(
                    0,
                    end + 1
                );


            this.rxBuffer =
                this.rxBuffer.slice(
                    end + 1
                );


            this.handleFrame(
                frame
            );

        }

    }


    private findFrameStart(): number {

        for (
            let i = 0;
            i < this.rxBuffer.length - 1;
            i++
        ) {

            if (
                this.rxBuffer[i] ===
                    IcomCiv.PREAMBLE &&
                this.rxBuffer[i + 1] ===
                    IcomCiv.PREAMBLE
            ) {

                return i;

            }

        }

        return -1;

    }


    private handleFrame(
        frame: number[]
    ): void {

        console.log(
            "ICOM CI-V RX:",
            IcomCiv.toHex(frame)
        );


        const parsed =
            IcomCiv.parseFrame(
                frame
            );

        if (!parsed) {

            console.warn(
                "ICOM: invalid CI-V frame."
            );

            return;

        }


        /*
         * Ignore frames that are not
         * addressed to the controller.
         */

        if (
            parsed.destination !==
            this.controllerAddress
        ) {

            return;

        }


        /*
         * Frequency response.
         *
         * Command 03.
         */

        if (
            parsed.command === 0x03 &&
            parsed.data.length > 0
        ) {

            try {

                this.frequency =
                    IcomCiv.bcdToFrequency(
                        parsed.data
                    );

                console.log(
                    "ICOM FREQUENCY:",
                    this.frequency
                );

            } catch (error) {

                console.error(
                    "ICOM frequency decode failed:",
                    error
                );

            }

            return;

        }


        /*
         * Mode response.
         *
         * Command 04.
         *
         * Data:
         *   byte 0 = mode
         *   byte 1 = filter
         */

        if (
            parsed.command === 0x04 &&
            parsed.data.length > 0
        ) {

            this.mode =
                IcomCiv.codeToMode(
                    parsed.data[0]!
                );

            console.log(
                "ICOM MODE:",
                this.mode
            );

            return;

        }

    }


    private sendFrame(
        frame: number[]
    ): void {

        console.log(
            "ICOM CI-V TX:",
            IcomCiv.toHex(frame)
        );


        if (!this.isConnected()) {

            console.warn(
                "ICOM CI-V: serial port is not open."
            );

            return;

        }


        this.write(
            Buffer.from(frame)
        );

    }


    setFrequency(
        frequency: number
    ): void {

        const frame =
            IcomCiv.setFrequency(
                this.civAddress,
                frequency
            );


        this.sendFrame(
            frame
        );


        this.frequency =
            frequency;

    }


    setMode(
        mode: string,
        frequency: number
    ): void {

        let selectedMode =
            mode
                .trim()
                .toUpperCase();


        /*
         * Preserve SHACK-SERVER's
         * automatic SSB selection.
         */

        if (
            selectedMode === "SSB"
        ) {

            selectedMode =
                frequency < 10000000
                    ? "LSB"
                    : "USB";

        }


        const code =
            IcomCiv.modeToCode(
                selectedMode
            );


        const frame =
            IcomCiv.setMode(
                this.civAddress,
                code
            );


        this.sendFrame(
            frame
        );


        this.mode =
            selectedMode;

    }


    /*
     * Ask the transceiver for frequency and mode once.
     * Icom does not poll; the connection test uses this.
     */
    requestStatus(): void {

        this.sendFrame(
            IcomCiv.readFrequency(
                this.civAddress
            )
        );

        this.sendFrame(
            IcomCiv.readMode(
                this.civAddress
            )
        );

    }


    getFrequency(): number {

        return this.frequency;

    }


    getMode(): string {

        return this.mode;

    }


    getPower(): number {

        return this.power;

    }


    close(): void {

        this.stop();

    }

}
