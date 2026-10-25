import { SerialRadioBase } from "./serial-radio-base.js";

import {
    RadioService
} from "./radio.interface.js";


export class QmxService
    extends SerialRadioBase
    implements RadioService {



    private frequency = 0;

    private mode = "UNKNOWN";

    private power = 0;


    constructor(device: string, baudRate: number) {
        super({
            name: "QMX CAT",
            device,
            baudRate,
            pollIntervalMs: 2000,
            rxTimeoutMs: 15000,
        });
    }

    protected onData(data: Buffer): void {

        const response =
            data.toString(
                "ascii"
            );

        console.log(
            "QMX CAT RX:",
            response
        );

        this.parseResponse(
            response
        );

    }

    protected override poll(): void {
        this.write("FA;MD;PC;");
    }




    private parseResponse(
        response: string
    ): void {

        /*
         * Frequency
         *
         * FA12345678901;
         */

        const faMatch =
            response.match(
                /FA(\d+);/
            );


        if (
            faMatch
        ) {

            const value =
                faMatch[1];

            if (
                value !== undefined
            ) {

                const hz =
                    Number(
                        value
                    );

                if (
                    Number.isFinite(hz)
                ) {

                    this.frequency =
                        hz;

                    console.log(
                        "QMX FREQUENCY:",
                        this.frequency
                    );

                }

            }

        }


        /*
         * Mode
         */

        const mdMatch =
            response.match(
                /MD(\d+);/
            );


        if (
            mdMatch
        ) {

            const value =
                mdMatch[1];

            if (
                value !== undefined
            ) {

                switch (
                    value
                ) {

                    case "1":
                        this.mode = "LSB";
                        break;

                    case "2":
                        this.mode = "USB";
                        break;

                    case "3":
                        this.mode = "CW";
                        break;

                    case "6":
                        this.mode = "FSK";
                        break;

                    case "7":
                        this.mode = "CWR";
                        break;

                    case "9":
                        this.mode = "FSR";
                        break;

                    default:
                        this.mode = "UNKNOWN";

                }

                console.log(
                    "QMX MODE:",
                    this.mode
                );

            }

        }


        /*
         * Power
         *
         * Stored as watts.
         *
         * The exact QMX firmware response should
         * be verified with real hardware.
         */

        const pcMatch =
            response.match(
                /PC(\d+(?:\.\d+)?);/
            );


        if (
            pcMatch
        ) {

            const value =
                pcMatch[1];

            if (
                value !== undefined
            ) {

                const raw =
                    Number(
                        value
                    );

                if (
                    Number.isFinite(raw)
                ) {

                    this.power =
                        raw / 10;

                    console.log(
                        "QMX POWER:",
                        this.power,
                        "W"
                    );

                }

            }

        }

    }


    setFrequency(
        frequency: number
    ): void {

        if (
            !this.isConnected()
        ) {

            console.warn(
                "QMX CAT not connected"
            );

            return;

        }


        const value =
            Math.round(
                frequency
            )
            .toString()
            .padStart(
                11,
                "0"
            );


        this.write(
            `FA${value};`
        );

    }


    setMode(
        mode: string,
        frequency: number
    ): void {

        const codes:
            Record<
                string,
                string
            > = {

                LSB: "1",
                USB: "2",
                CW: "3",
                FSK: "6",
                CWR: "7",
                FSR: "9"

            };


        const code =
            codes[
                mode.toUpperCase()
            ];


        if (
            code === undefined
        ) {

            console.error(
                "Unsupported QMX mode:",
                mode
            );

            return;

        }


        if (
            !this.isConnected()
        ) {

            console.warn(
                "QMX CAT not connected"
            );

            return;

        }


        this.write(
            `MD${code};`
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

}
