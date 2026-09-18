import { SerialPort } from "serialport";

import {
    RadioService
} from "./radio.interface.js";

import {
    IcomCiv
} from "./icom-civ.js";


export class IcomService
    implements RadioService {

    private readonly controllerAddress =
        IcomCiv.CONTROLLER_ADDRESS;

    private civAddress: number;

    private frequency = 0;

    private mode = "UNKNOWN";

    private power = 0;

    private port?: SerialPort;

    private rxBuffer: number[] = [];


    constructor(
        private device: string,
        private baudRate: number,
        civAddress = 0xA4,
        private connection:
            "serial" |
            "network" = "serial",
        private host = "",
        private portNumber = 50002
    ) {

        this.civAddress =
            civAddress;

    }


    start(): void {

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


        if (!this.device) {

            console.log(
                "ICOM: no serial device configured."
            );

            return;
        }


        try {

            this.port =
                new SerialPort({
                    path:
                        this.device,

                    baudRate:
                        this.baudRate,

                    autoOpen:
                        false
                });


            this.port.on(
                "data",
                (data: Buffer) => {

                    this.handleIncomingData(
                        data
                    );

                }
            );


            this.port.on(
                "error",
                (error) => {

                    console.error(
                        "ICOM CI-V serial error:",
                        error.message
                    );

                }
            );


            this.port.on(
                "open",
                () => {

                    console.log(
                        "ICOM CI-V serial port opened:",
                        this.device
                    );

                }
            );


            this.port.on(
                "close",
                () => {

                    console.log(
                        "ICOM CI-V serial port closed."
                    );

                }
            );


            this.port.open(
                (error) => {

                    if (error) {

                        console.error(
                            "ICOM CI-V open failed:",
                            error.message
                        );

                    }

                }
            );

        } catch (error) {

            console.error(
                "ICOM CI-V initialization failed:",
                error
            );

        }

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


        if (!this.port) {

            console.warn(
                "ICOM CI-V: serial port is not initialized."
            );

            return;

        }


        if (!this.port.isOpen) {

            console.warn(
                "ICOM CI-V: serial port is not open."
            );

            return;

        }


        this.port.write(
            Buffer.from(frame),
            (error) => {

                if (error) {

                    console.error(
                        "ICOM CI-V write failed:",
                        error.message
                    );

                }

            }
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

        if (
            !this.port
        ) {

            return;

        }


        if (
            this.port.isOpen
        ) {

            this.port.close();

        }

    }

}
