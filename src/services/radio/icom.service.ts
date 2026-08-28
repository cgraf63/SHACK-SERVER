import {
    RadioService
} from "./radio.interface.js";


export class IcomService
    implements RadioService {


    /*
     * CI-V controller address.
     *
     * E0 = computer/controller
     */

    private readonly controllerAddress =
        0xE0;


    /*
     * Radio CI-V address.
     *
     * This will later be configurable
     * depending on the Icom model.
     */

    private civAddress: number;


    /*
     * Radio state.
     */

    private frequency = 0;

    private mode = "UNKNOWN";

    private power = 0;


    constructor(
        private device: string,
        private baudRate: number,
        civAddress = 0x94
    ) {

        this.civAddress =
            civAddress;

    }


    start(): void {

        console.log(
            "ICOM CI-V service configured:"
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

    }


    /*
     * Build a CI-V frame.
     *
     * FE FE
     * destination
     * source
     * command
     * data...
     * FD
     */

    private buildFrame(
        command: number[],
        data: number[] = []
    ): number[] {

        return [

            0xFE,
            0xFE,

            this.civAddress,

            this.controllerAddress,

            ...command,

            ...data,

            0xFD

        ];

    }


    /*
     * Convert frequency in Hz
     * to Icom CI-V BCD format.
     *
     * Example:
     *
     * 144088000 Hz
     */

    private frequencyToBcd(
        frequency: number
    ): number[] {

        const digits =
            Math.round(
                frequency
            )
                .toString()
                .padStart(
                    10,
                    "0"
                );


        const result: number[] =
            [];


        /*
         * CI-V frequency bytes
         * are sent least significant
         * pair first.
         */

        for (
            let i =
                digits.length - 2;

            i >= 0;

            i -= 2
        ) {

            const low =
                Number(
                    digits[
                        i
                    ]
                );


            const high =
                Number(
                    digits[
                        i + 1
                    ]
                );


            result.push(
                (high << 4) |
                low
            );

        }


        return result;

    }


    /*
     * Convert CI-V BCD frequency
     * back to Hz.
     */

    private bcdToFrequency(
        data: number[]
    ): number {

        let digits =
            "";


        for (
            let i =
                data.length - 1;

            i >= 0;

            i--
        ) {

            const value =
    data[
        i
    ];

if (
    value === undefined
) {
    continue;
}

            const high =
                (
                    value >> 4
                )
                    .toString();


            const low =
                (
                    value & 0x0F
                )
                    .toString();


            digits +=
                high +
                low;

        }


        return Number(
            digits
        );

    }


    /*
     * Send a CI-V frame.
     *
     * The actual SerialPort
     * implementation will be added later.
     */

    private sendFrame(
        frame: number[]
    ): void {

        const hex =
            frame
                .map(
                    value =>
                        value
                            .toString(16)
                            .padStart(
                                2,
                                "0"
                            )
                            .toUpperCase()
                )
                .join(
                    " "
                );


        console.log(
            "ICOM CI-V TX:",
            hex
        );


        /*
         * Later:
         *
         * this.port.write(
         *     Buffer.from(frame)
         * );
         */

    }


    /*
     * Parse an incoming
     * CI-V frame.
     *
     * This function is already prepared
     * for later SerialPort input.
     */

    private parseFrame(
        frame: number[]
    ): void {

        if (
            frame.length < 6
        ) {

            return;

        }


        console.log(
            "ICOM CI-V RX:",
            frame
                .map(
                    value =>
                        value
                            .toString(16)
                            .padStart(
                                2,
                                "0"
                            )
                            .toUpperCase()
                )
                .join(
                    " "
                )
        );


        /*
         * Expected frame:
         *
         * FE FE
         * destination
         * source
         * command
         * data...
         * FD
         */

        if (
            frame[0] !== 0xFE ||
            frame[1] !== 0xFE
        ) {

            return;

        }


        if (
            frame[
                frame.length - 1
            ] !== 0xFD
        ) {

            return;

        }


        const command =
            frame[4];


        /*
         * Frequency response.
         *
         * Command:
         * 03
         */

        if (
            command === 0x03
        ) {

            const frequencyData =
                frame.slice(
                    5,
                    frame.length - 1
                );


            this.frequency =
                this.bcdToFrequency(
                    frequencyData
                );


            console.log(
                "ICOM FREQUENCY:",
                this.frequency
            );

        }

    }


    /*
     * Set frequency.
     *
     * CI-V command:
     *
     * 05 + BCD frequency
     */

    setFrequency(
        frequency: number
    ): void {

        const data =
            this.frequencyToBcd(
                frequency
            );


        const frame =
            this.buildFrame(
                [0x05],
                data
            );


        this.sendFrame(
            frame
        );


        /*
         * Update local state.
         */

        this.frequency =
            frequency;

    }


    /*
     * Set operating mode.
     *
     * The numeric CI-V values
     * are prepared here.
     */

    setMode(
        mode: string,
        frequency: number
    ): void {

        const normalizedMode =
            mode
                .toUpperCase();


        const modes:
            Record<
                string,
                number
            > = {

            LSB:
                0x00,

            USB:
                0x01,

            AM:
                0x02,

            CW:
                0x03,

            RTTY:
                0x04,

            FM:
                0x05,

            WFM:
                0x06,

            CW_R:
                0x07,

            RTTY_R:
                0x08,

            DV:
                0x17

        };


        let selectedMode =
            normalizedMode;


        /*
         * Automatically select
         * LSB or USB for SSB.
         */

        if (
            selectedMode === "SSB"
        ) {

            selectedMode =
                frequency <
                10000000
                    ? "LSB"
                    : "USB";

        }


        const code =
            modes[
                selectedMode
            ];


        if (
            code === undefined
        ) {

            console.error(
                "Unsupported ICOM mode:",
                mode
            );

            return;

        }


        const frame =
            this.buildFrame(
                [0x06],
                [
                    code,
                    0x01
                ]
            );


        this.sendFrame(
            frame
        );


        this.mode =
            selectedMode;

    }


    /*
     * These functions will later
     * be used when polling the radio.
     */


    getFrequency(): number {

        return this.frequency;

    }


    getMode(): string {

        return this.mode;

    }


    getPower(): number {

        return this.power;

    }

}
