import { morseDurationMs } from "./morse.js";


/*
 * CW text for Yaesu transceivers without a "send text" CAT command
 * (FTDX10, FTX-1): the text is written into one keyer TEXT memory
 * (KM), played (KY), and the memory gets its old text back when
 * everything is sent. Longer texts go in pieces of up to 50
 * characters (the size of a keyer memory), one after the other.
 */

export interface MemoryCwSenderOptions {
    name: string;
    write: (command: string) => void;
    slot: number;                       // keyer memory 1..5
    playCommand: string;                // e.g. "KYA;" (FTDX10) / "KY05;" (FTX-1)
    stopCommand: string | null;
    originalText: () => string;         // text of the memory before (from KM reads)
    wpm: () => number;
    maxChars?: number;
}

export class MemoryCwSender {

    private queue: string[] = [];
    private busy = false;
    private timer: ReturnType<typeof setTimeout> | null = null;
    private saved: string | null = null;

    constructor(private readonly options: MemoryCwSenderOptions) {}

    send(text: string): void {

        const max = this.options.maxChars ?? 49;      // 50 incl. the "}"

        // pieces of whole words
        let piece = "";
        for (const word of text.split(" ").filter(Boolean)) {
            const next = piece ? `${piece} ${word}` : word;
            if (next.length > max && piece) {
                this.queue.push(piece);
                piece = word.slice(0, max);
            }
            else {
                piece = next.slice(0, max);
            }
        }
        if (piece) this.queue.push(piece);

        if (!this.busy) this.next();

    }

    stop(): void {
        this.queue = [];
        if (this.timer) clearTimeout(this.timer);
        this.timer = null;
        if (this.options.stopCommand) this.options.write(this.options.stopCommand);
        this.finish();
    }

    private next(): void {

        const piece = this.queue.shift();

        if (piece === undefined) {
            this.finish();
            return;
        }

        if (!this.busy) {
            this.busy = true;
            this.saved = this.options.originalText();
        }

        const { write, slot, playCommand } = this.options;

        // "}" = end of the text (as the radio's own memory editor writes it)
        write(`KM${slot}${piece}};`);

        // the radio needs a moment to store the memory
        this.timer = setTimeout(() => {
            write(playCommand);
            this.timer = setTimeout(() => this.next(), morseDurationMs(piece, this.options.wpm()) + 400);
        }, 150);

    }

    private finish(): void {

        if (!this.busy) return;
        this.busy = false;

        // the old text back ("KMn;" alone would be a read, so only when there was one)
        if (this.saved) {
            const text = this.saved.endsWith("}") ? this.saved : `${this.saved}}`;
            this.options.write(`KM${this.options.slot}${text};`);
        }
        this.saved = null;

    }

}
