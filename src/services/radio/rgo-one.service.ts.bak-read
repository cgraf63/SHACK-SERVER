import { SerialPort } from "serialport";

import {
    RadioService
} from "./radio.interface.js";


export class RgoOneService
    implements RadioService {

    private port: SerialPort;

    private frequency = 0;

    private mode = "UNKNOWN";

    private power = 0;


    constructor(
        device: string,
        baudRate: number
    ) {


        this.port =
            new SerialPort({

                path: device,

                baudRate: baudRate,

                autoOpen: false

            });


        this.port.on(
            "data",
            data => {


                const response =
                    data.toString();


                console.log(
                    "CAT RX:",
                    response
                );


                this.parseResponse(
                    response
                );


            }
        );

    }


    start() {


        this.port.open(
            err => {


                if (err) {


                    console.error(
                        "CAT open failed:",
                        err.message
                    );


                    return;

                }


                console.log(
                    "CAT connected"
                );


                /*
                    Radio status polling.

                    Frequency
                    Mode
                    Power
                */

                setInterval(
                    () => {

                        if (
                            this.port.isOpen
                        ) {

                            this.port.write(
                                "FA;MD;PC;"
                            );

                        }

                    },
                    2000
                );


            }
        );

    }


    private parseResponse(
        response: string
    ) {


        /*
            Frequency

            Example:

            FA00028000000;
        */

        const faMatch =
            response.match(
                /FA(\d+);/
            );


        if (
            faMatch
        ) {


            const hz =
                Number(
                    faMatch[1]
                );


            if (
                !isNaN(hz)
            ) {


                this.frequency =
                    hz;


                console.log(
                    "CAT FREQUENCY:",
                    this.frequency
                );


            }

        }


        /*
            Power

            Examples:

            PC000;
            PCP050;
        */

        const pcMatch =
            response.match(
                /PCP?(\d{3})/
            );


        if (
            pcMatch
        ) {


            this.power =
                Number(
                    pcMatch[1]
                );


            console.log(
                "CAT POWER:",
                this.power,
                "W"
            );


        }


        /*
            Mode

            RGO ONE examples:

            MDP1;
            MD1;

            1 = LSB
            2 = USB
            3 = CW
            4 = FM
            5 = AM
            6 = DIGI
            7 = CW-R
        */

        const mdMatch =
            response.match(
                /MDP?(\d)/
            );


        if (
            mdMatch
        ) {


            const code =
                mdMatch[1];


            switch (
                code
            ) {


                case "1":

                    this.mode =
                        "LSB";

                    break;


                case "2":

                    this.mode =
                        "USB";

                    break;


                case "3":

                    this.mode =
                        "CW";

                    break;


                case "4":

                    this.mode =
                        "FM";

                    break;


                case "5":

                    this.mode =
                        "AM";

                    break;


                case "6":

                    this.mode =
                        "DIGI";

                    break;


                case "7":

                    this.mode =
                        "CW-R";

                    break;


                default:

                    this.mode =
                        "UNKNOWN";

            }


            console.log(
                "CAT MODE:",
                this.mode
            );


        }

    }


    setFrequency(
        frequency: number
    ): void {


        if (
            !this.port.isOpen
        ) {

            console.error(
                "CAT not connected"
            );

            return;

        }


        /*
            Update local status immediately.

            This allows /api/radio
            to return the new frequency
            without waiting for the next
            CAT polling response.
        */

        this.frequency =
            Math.round(
                frequency
            );


        const value =
            this.frequency
                .toString()
                .padStart(
                    11,
                    "0"
                );


        const command =
            `FA${value};`;


        console.log(
            "CAT TX:",
            command
        );


        this.port.write(
            command
        );

    }


    setMode(
        mode: string,
        frequency: number
    ): void {


        if (
            !this.port.isOpen
        ) {

            console.error(
                "CAT not connected"
            );

            return;

        }


        let normalizedMode =
            mode.toUpperCase();


        /*
            SSB handling.

            Below 10 MHz -> LSB
            10 MHz and above -> USB
        */

        if (
            normalizedMode === "SSB"
        ) {

            normalizedMode =
                frequency < 10000000
                    ? "LSB"
                    : "USB";

        }


        /*
            Update local mode immediately.

            This allows the frontend
            to display the new mode
            without waiting for a CAT
            response.
        */

        this.mode =
            normalizedMode;


        const modes:
            Record<string, string> = {

                LSB: "1",

                USB: "2",

                CW: "3",

                FM: "4",

                AM: "5",

                "CW-R": "7"

            };


        const code =
            modes[
                normalizedMode
            ];


        if (
            !code
        ) {

            console.error(
                "Unsupported CAT mode:",
                mode
            );

            return;

        }


        const command =
            `MD${code};`;


        console.log(
            "CAT TX:",
            command
        );


        this.port.write(
            command
        );

    }


    getFrequency():
        number {

        return this.frequency;

    }


    getMode():
        string {

        return this.mode;

    }


    getPower():
        number {

        return this.power;

    }

}
