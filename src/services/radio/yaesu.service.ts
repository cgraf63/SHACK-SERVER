import {
    SerialPort
} from "serialport";

import {
    RadioService
} from "./radio.interface.js";


export class YaesuService
    implements RadioService {


    private port: SerialPort;

    private frequency = 0;

    private mode = "UNKNOWN";

    private power = 0;


    constructor(
        private device: string,
        private baudRate: number
    ) {

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
            data => {

                const response =
                    data.toString();

                console.log(
                    "YAESU CAT RX:",
                    response
                );

                this.parseResponse(
                    response
                );

            }
        );

    }


    start(): void {

        this.port.open(
            err => {

                if (
                    err
                ) {

                    console.error(
                        "YAESU CAT open failed:",
                        this.device,
                        err.message
                    );

                    return;

                }


                console.log(
                    "YAESU CAT connected:",
                    this.device,
                    this.baudRate
                );


                /*
                 * Poll MAIN-side:
                 *
                 * FA;   Frequency
                 * MD0;  Mode MAIN-side
                 * PC;   Power
                 * IF;   Complete MAIN-side information
                 */

                setInterval(
                    () => {

                        if (
                            this.port.isOpen
                        ) {

                            this.port.write(
                                "FA;MD0;PC;IF;"
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
    ): void {


        /*
         * Frequency
         *
         * Example:
         *
         * FA144088380;
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
                    !isNaN(hz)
                ) {

                    this.frequency =
                        hz;

                    console.log(
                        "YAESU FREQUENCY:",
                        this.frequency
                    );

                }

            }

        }


                /*
         * FTX-1 POWER response.
         *
         * Example:
         *
         * PC10.5;
         *
         * P1 = device:
         * 1 = FTX-1 Field Head
         *
         * Remaining value = power in watts.
         *
         * Therefore:
         *
         * PC10.5;
         *    └─ 0.5 W
         */

        const pcMatch =
            response.match(
                /PC([12])([\d.]+);/
            );


        if (
            pcMatch
        ) {

            const power =
                pcMatch[2];


            if (
                power !== undefined
            ) {

                const watts =
                    Number(
                        power
                    );


                if (
                    !isNaN(watts)
                ) {

                    this.power =
                        watts;

                    console.log(
                        "YAESU POWER:",
                        this.power,
                        "W"
                    );

                }

            }

        }
     

                
        
        /*
         * Direct MD response.
         *
         * FTX-1 format:
         *
         * MD P1 P2 ;
         *
         * P1:
         *
         * 0 = MAIN-side
         * 1 = SUB-side
         *
         * P2 = mode code
         *
         * Example:
         *
         * MD02;
         *
         * MAIN-side USB
         */

        const mdMatch =
            response.match(
                /MD([01])([0-9A-I]);/
            );


        if (
            mdMatch
        ) {

            const side =
                mdMatch[1];

            const code =
                mdMatch[2];


            if (
                side !== undefined &&
                code !== undefined
            ) {

                console.log(
                    "YAESU MD SIDE:",
                    side === "0"
                        ? "MAIN"
                        : "SUB"
                );


                this.setModeFromCode(
                    code
                );

            }

        }


              /*
         * FTX-1 IF response.
         *
         * Example:
         *
         * IF00000144088380+000000H00003;
         *
         * The MODE is located after:
         *
         * IF
         * + 5 characters memory/VFO information
         * + 9 characters frequency
         * + 1 character clarifier direction
         * + 4 characters clarifier offset
         * + 1 RX clarifier
         * + 1 TX clarifier
         *
         * Therefore the mode is character 22
         * after the "IF" command.
         */

        const ifMatch =
            response.match(
               /IF\d+[+-]\d+([A-Z0-9])\d+;/

            );


                if (
            ifMatch
        ) {

            const code =
                ifMatch[1];


            if (
                code !== undefined
            ) {

                console.log(
                    "YAESU IF MODE CODE:",
                    code
                );


                this.setModeFromCode(
                    code
                );

            }

        }

    }


    private setModeFromCode(
        code: string
    ): void {

        switch (
            code
        ) {

            case "1":
                this.mode = "LSB";
                break;

            case "2":
                this.mode = "USB";
                break;

            case "3":
                this.mode = "CW-U";
                break;

            case "4":
                this.mode = "FM";
                break;

            case "5":
                this.mode = "AM";
                break;

            case "6":
                this.mode = "RTTY-L";
                break;

            case "7":
                this.mode = "CW-L";
                break;

            case "8":
                this.mode = "DATA-L";
                break;

            case "9":
                this.mode = "RTTY-U";
                break;

            case "A":
                this.mode = "DATA-FM";
                break;

            case "B":
                this.mode = "FM-N";
                break;

            case "C":
                this.mode = "DATA-U";
                break;

            case "D":
                this.mode = "AM-N";
                break;

            case "E":
                this.mode = "PSK";
                break;

            case "F":
                this.mode = "DATA-FM-N";
                break;

            case "H":
                this.mode = "C4FM-DN";
                break;

            case "I":
                this.mode = "C4FM-VW";
                break;

            default:
                this.mode = "UNKNOWN";

        }


        console.log(
            "YAESU MODE:",
            this.mode
        );

    }


    setFrequency(
        frequency: number
    ): void {


        if (
            !this.port.isOpen
        ) {

            console.error(
                "YAESU CAT not connected"
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


        const command =
            `FA${value};`;


        console.log(
            "YAESU CAT TX:",
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
                "YAESU CAT not connected"
            );

            return;

        }


        let normalizedMode =
            mode.toUpperCase();


        /*
         * Automatically select
         * LSB or USB for generic SSB.
         */

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

            LSB:
                "1",

            USB:
                "2",

            "CW-U":
                "3",

            CW:
                "3",

            FM:
                "4",

            AM:
                "5",

            "RTTY-L":
                "6",

            "CW-L":
                "7",

            "DATA-L":
                "8",

            RTTY:
                "9",

            "RTTY-U":
                "9",

            "DATA-FM":
                "A",

            "FM-N":
                "B",

            "DATA-U":
                "C",

            "AM-N":
                "D",

            PSK:
                "E",

            "DATA-FM-N":
                "F",

            "C4FM-DN":
                "H",

            "C4FM-VW":
                "I"

        };


        const code =
            modes[
                normalizedMode
            ];


        if (
            !code
        ) {

            console.error(
                "Unsupported YAESU mode:",
                mode
            );

            return;

        }


        /*
         * FTX-1:
         *
         * MD P1 P2 ;
         *
         * P1 = 0 MAIN-side
         * P2 = mode code
         */

        const command =
            `MD0${code};`;


        console.log(
            "YAESU CAT TX:",
            command
        );


        this.port.write(
            command
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

