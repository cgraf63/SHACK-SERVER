import type { RadioService } from "./radio.interface.js";


/*
 * Simulated transceiver for the demo version and for testing
 * without hardware. Follows frequency and mode changes from the
 * dashboard (spot click, band buttons) - nothing is transmitted.
 */
export class DemoRadioService implements RadioService {

    private frequency = 14_200_000;   // Hz
    private mode = "USB";
    private power = 100;
    private started = false;

    start(): void {
        this.started = true;
    }

    stop(): void {
        this.started = false;
    }

    isConnected(): boolean {
        return this.started;
    }

    getLastError(): string {
        return "";
    }

    requestStatus(): void {
        // nothing to ask - the state is local
    }

    setFrequency(frequency: number): void {

        const hz = Number(frequency);

        if (Number.isFinite(hz) && hz > 0) {
            this.frequency = Math.round(hz);
        }

    }

    setMode(mode: string, frequency: number): void {

        const text = String(mode || "").trim().toUpperCase();

        if (text === "SSB") {
            this.mode = Number(frequency || this.frequency) < 10_000_000 ? "LSB" : "USB";
        }
        else if (text) {
            this.mode = text;
        }

        if (frequency) {
            this.setFrequency(frequency);
        }

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
