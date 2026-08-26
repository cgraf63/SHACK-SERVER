import {
    RadioService
} from "./radio.interface.js";


export class IcomService
    implements RadioService {


    private frequency = 0;

    private mode = "UNKNOWN";

    private power = 0;


    constructor(
        private device: string,
        private baudRate: number
    ) {

    }


    start(): void {

        console.log(
            "ICOM CI-V service configured:",
            this.device,
            this.baudRate
        );

    }


    setFrequency(
        frequency: number
    ): void {

        console.log(
            "ICOM setFrequency:",
            frequency
        );

    }


    setMode(
        mode: string,
        frequency: number
    ): void {

        console.log(
            "ICOM setMode:",
            mode,
            frequency
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
