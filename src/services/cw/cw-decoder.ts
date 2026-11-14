import { MORSE_DECODE } from "./morse.js";


/*
 * CW decoder for the RX audio of the transceiver (USB sound card).
 *
 * Port of the decoder of the T-Embed CW key (tembed_cw_key.ino,
 * micTask + decodeEvents), only the audio comes from the transceiver
 * instead of the microphone:
 *
 *   48 kHz -> 16 kHz (box filter), blocks of 128 samples (8 ms),
 *   DC removed, Hann window
 *   Goertzel bins 25 Hz apart (T-Embed: 400..1000 Hz, here 300..1100 Hz
 *   for every CW pitch of the transceivers)
 *   tone: only followed while a clear tone is there (peak > 8 x median),
 *   averaged spectrum, a new bin must be 1.3 x stronger (lock)
 *   level: lock bin +-1 bin, noise floor at once down / slowly up,
 *   peak at once up / slowly down, at least 14 dB apart
 *   key down: tone at the lock bin (> 6 x median) and > 60 % of the span,
 *   key up: < 35 %; a change only after 2 blocks (16 ms)
 *   marks: glitches < 12 ms or < 0.3 dot dropped, dot / dash at 2 dots,
 *   dot length follows (0.85 / 0.15, outliers limited to 0.75..1.33)
 *   gaps: character after 2.5 dots, word after 5 dots
 *
 * Changes for the receiver audio (T-Embed: microphone, own keying):
 *   - 16 ms Goertzel window (every 8 ms): 3 dB more over the noise
 *   - noise floor = median of the bins (T-Embed: lowest block -> on
 *     receiver noise every noise spike was a mark, lots of E and T)
 *   - key down only at > 12 x the noise per bin, pitch lock at 15 x
 *   - a mark is dropped when the strongest bin was not at the pitch
 *   - a weak lone E / T between word gaps is dropped
 *
 * Addition for other stations at any speed: every 8 marks
 * the last 16 mark lengths are split into two groups (dots / dashes).
 * When they say a clearly different speed, the dot length jumps there -
 * the slow follower alone gets stuck when the speed changes a lot
 * (e.g. 20 -> 35 WPM: dashes look like long dots).
 */

const RATE = 16000;
const BLOCK = 128;                          // 8 ms per step
const BLOCK_MS = BLOCK * 1000 / RATE;
/* Goertzel window: 16 ms (T-Embed: 8 ms) - half the bandwidth (~60 Hz),
   3 dB more signal over the receiver noise; still a step every 8 ms.
   (An 8 ms window for fast CW was tried: worse at 35-40 WPM too.) */
const WIN = 256;
const BIN_LOW = 300;
const BIN_STEP = 25;
const BINS = 33;                            // 300 .. 1100 Hz

const HANN = Float32Array.from({ length: WIN }, (_, i) => 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (WIN - 1)));
const COEFF = Float32Array.from({ length: BINS }, (_, b) => 2 * Math.cos(2 * Math.PI * (BIN_LOW + BIN_STEP * b) / RATE));

export interface CwDecoderStats {
    tone: number;           // Hz
    wpm: number;
    snr: number;            // dB, peak over noise floor
    level: number;          // 0..1 like the T-Embed level bar
    key: boolean;           // key down right now
    signal: boolean;        // a CW signal is there at all
}

export class CwDecoder {

    private readonly decimation: number;
    private decimAcc = 0;
    private decimCount = 0;
    private leftover: Buffer | null = null;

    private readonly x = new Float32Array(BLOCK);
    private readonly hist = new Float32Array(WIN);
    private readonly w = new Float32Array(WIN);
    private n = 0;
    private now = 0;                        // ms of audio processed

    /* tone detection (micTask) */
    private readonly binAvg = new Float32Array(BINS);
    private lockBin = Math.round((700 - BIN_LOW) / BIN_STEP);
    private fixedBin = -1;
    private nf = 0.001;
    private pk = 0.01;
    private on = false;
    private confirm = 0;
    private level = 0;
    private enough = false;
    private noiseP = 0;                     // smoothed median bin power = noise per bin
    private markBlocks = 0;
    private markTonal = 0;
    private markPeak = 0;                   // strongest block of the mark (x noise per bin)
    private charPeak = 0;                   // strongest mark of the character
    private held = "";                      // a weak lone E / T, waiting for the next character
    private wordStart = true;

    /* decoder (decodeEvents) */
    private pattern = "";
    private dit = 60;
    private downAt = 0;
    private upAt = 0;
    private pending = false;
    private spaceDone = true;
    private readonly marks: number[] = [];

    constructor(
        sampleRate: number,
        private readonly onText: (text: string) => void
    ) {
        this.decimation = Math.max(1, Math.round(sampleRate / RATE));
    }

    /* 0 = automatic, otherwise the CW pitch of the transceiver in Hz */
    setPitch(hz: number): void {
        if (hz >= BIN_LOW && hz <= BIN_LOW + BIN_STEP * (BINS - 1)) {
            this.fixedBin = Math.round((hz - BIN_LOW) / BIN_STEP);
            this.lockBin = this.fixedBin;
        }
        else {
            this.fixedBin = -1;
        }
    }

    stats(): CwDecoderStats {
        return {
            tone: BIN_LOW + BIN_STEP * this.lockBin,
            wpm: Math.round(1200 / this.dit),
            snr: Math.round(20 * Math.log10(this.pk / Math.max(this.nf, 1e-9))),
            level: Math.round(this.level * 100) / 100,
            key: this.on,
            signal: this.enough
        };
    }

    /* raw S16_LE audio; channels = 2: interleaved, the first one is used */
    feed(chunk: Buffer, channels = 1): void {

        let data = chunk;

        if (this.leftover) {
            data = Buffer.concat([this.leftover, chunk]);
            this.leftover = null;
        }

        const frame = 2 * channels;
        const usable = data.length - (data.length % frame);

        if (usable < data.length) {
            this.leftover = Buffer.from(data.subarray(usable));
        }

        for (let i = 0; i < usable; i += frame) {

            this.decimAcc += data.readInt16LE(i);
            if (++this.decimCount < this.decimation) continue;

            this.x[this.n++] = this.decimAcc / this.decimation / 32768;
            this.decimAcc = 0;
            this.decimCount = 0;

            if (this.n === BLOCK) {
                this.n = 0;
                this.now += BLOCK_MS;
                this.block();
            }

        }

    }

    /* ------------------------------------------------------------ micTask */

    private block(): void {

        // the last WIN samples (sliding window, one new block)
        this.hist.copyWithin(0, BLOCK);
        this.hist.set(this.x, WIN - BLOCK);

        const win = WIN;
        const offset = 0;
        const hannW = HANN;

        const x = this.w;

        let mean = 0;
        for (let i = 0; i < win; i++) mean += this.hist[offset + i]!;
        mean /= win;
        for (let i = 0; i < win; i++) x[i] = (this.hist[offset + i]! - mean) * hannW[i]!;

        const p = new Float32Array(BINS);
        let best = 0;
        for (let b = 0; b < BINS; b++) {
            const k = COEFF[b]!;
            let s1 = 0;
            let s2 = 0;
            for (let i = 0; i < win; i++) {
                const s = x[i]! + k * s1 - s2;
                s2 = s1;
                s1 = s;
            }
            p[b] = s1 * s1 + s2 * s2 - k * s1 * s2;
            if (p[b]! > p[best]!) best = b;
        }

        const sorted = Float32Array.from(p).sort();
        const med = sorted[BINS >> 1]! + 1e-12;

        // noise per bin: the median of the bins, smoothed (a CW tone
        // is in 1-3 bins, the median stays noise)
        this.noiseP = this.noiseP ? this.noiseP + (med - this.noiseP) * 0.02 : med;
        const noiseP = Math.max(this.noiseP, 1e-12);

        // follow the pitch only while a clear tone is there
        // (T-Embed: 8 x median; on receiver noise one of 33 bins is that
        // strong in every 8th block - 15 x keeps the lock on noise)
        if (this.fixedBin < 0) {
            const tonal = p[best]! > med * 15;
            if (tonal) for (let b = 0; b < BINS; b++) this.binAvg[b] = this.binAvg[b]! * 0.95 + p[b]! * 0.05;
            let cand = 0;
            for (let b = 1; b < BINS; b++) if (this.binAvg[b]! > this.binAvg[cand]!) cand = b;
            if (this.binAvg[cand]! > this.binAvg[this.lockBin]! * 1.3) this.lockBin = cand;
        }

        const lock = this.lockBin;
        // +-50 Hz tolerance (T-Embed: +-25 Hz; the lock moves only when a
        // bin is 1.3 x stronger, and the window is ~125 Hz wide)
        let pl = 0;
        for (let b = Math.max(0, lock - 2); b <= Math.min(BINS - 1, lock + 2); b++) if (p[b]! > pl) pl = p[b]!;
        const mag = Math.sqrt(pl) / win;

        // noise floor and peak. T-Embed: the floor follows the lowest
        // block at once - on receiver noise that is far below the real
        // noise, every noise spike then looked like a mark (E / T).
        // Here the floor is the noise of the bins (median).
        this.nf = Math.sqrt(noiseP) / win;
        if (mag > this.pk) this.pk = mag; else this.pk -= (this.pk - this.nf) * 0.0015;
        if (this.pk < this.nf * 1.2) this.pk = this.nf * 1.2;
        const span = this.pk - this.nf;
        this.level = Math.min(1, Math.max(0, (mag - this.nf) / (span > 1e-6 ? span : 1e-6)));

        const enough = this.pk > this.nf * 4;               // about 12 dB over the noise
        // key down: tone at the lock bin clearly over the noise per bin
        // (12 x: noise gets there in < 0.1 % of the blocks)
        const strong = pl > noiseP * 12 && Math.abs(best - lock) <= 2;
        this.enough = enough;

        const want = this.on
            ? (enough && pl > noiseP * 4 && mag > this.nf + span * 0.3)
            : (enough && strong && mag > this.nf + span * 0.5);

        // tone quality of the mark: the strongest bin at the lock
        if (this.on) {
            this.markBlocks++;
            if (Math.abs(best - lock) <= 2) this.markTonal++;
            this.markPeak = Math.max(this.markPeak, pl / noiseP);
        }

        // a change only after 2 blocks (16 ms): single spikes drop out
        if (want !== this.on) {
            if (++this.confirm >= 2) {
                this.on = want;
                this.confirm = 0;
                this.keyEvent(want, this.now - BLOCK_MS);
            }
        }
        else {
            this.confirm = 0;
        }

        if (!this.on) this.gaps();

    }

    /* ------------------------------------------------------------ decodeEvents */

    private keyEvent(down: boolean, t: number): void {

        if (down) {
            this.downAt = t;
            this.markBlocks = 0;
            this.markTonal = 0;
            this.markPeak = 0;
            return;
        }

        const d = t - this.downAt;
        if (d < 12 || d < 0.3 * this.dit) return;          // spike shorter than a third of a dot

        // noise burst: the tone was not at the lock in most blocks
        if (this.markBlocks >= 2 && this.markTonal < this.markBlocks * 0.6) return;

        const element = d < 2 * this.dit ? "." : "-";
        let estimate = element === "." ? d : d / 3;
        estimate = Math.min(this.dit * 1.33, Math.max(this.dit * 0.75, estimate));   // limit outliers
        this.dit = Math.min(300, Math.max(25, 0.85 * this.dit + 0.15 * estimate));

        this.marks.push(d);
        if (this.marks.length > 16) this.marks.shift();
        if (this.marks.length >= 8 && this.marks.length % 4 === 0) this.recluster();

        if (!this.pattern) this.charPeak = 0;
        this.charPeak = Math.max(this.charPeak, this.markPeak);
        this.pattern += element;
        if (this.pattern.length > 9) this.pattern = this.pattern.slice(-9);
        this.upAt = t;
        this.pending = true;
        this.spaceDone = false;

    }

    private recluster(): void {

        const sorted = [...this.marks].sort((a, b) => a - b);
        let low = sorted[0]!;
        let high = sorted[sorted.length - 1]!;
        if (high < low * 2) return;                         // only dots or only dashes

        for (let i = 0; i < 6; i++) {
            const mid = (low + high) / 2;
            const a = sorted.filter(v => v <= mid);
            const b = sorted.filter(v => v > mid);
            if (!a.length || !b.length) return;
            low = a.reduce((s, v) => s + v, 0) / a.length;
            high = b.reduce((s, v) => s + v, 0) / b.length;
        }

        const ratio = high / low;
        if (ratio < 2 || ratio > 4.5) return;

        const dit = Math.min(300, Math.max(25, (low + high / 3) / 2));
        if (Math.abs(dit - this.dit) > this.dit * 0.25) this.dit = dit;

    }

    /*
     * Noise that gets through looks like single dots / dashes: lone E
     * and T. A one-element character at the start of a word with a weak
     * mark (< 16 dB over the noise per bin) is held back - shown when
     * another character follows, dropped when the word ends with it.
     */
    private character(char: string, single: boolean): void {

        if (this.held) {
            this.onText(this.held);
            this.held = "";
        }

        if (single && this.wordStart && this.charPeak < 40) {
            this.held = char;
        }
        else {
            this.onText(char);
        }

        this.wordStart = false;

    }

    private gaps(): void {

        const gap = this.now - this.upAt;

        if (this.pending && gap > 2.5 * this.dit) {
            this.character(MORSE_DECODE[this.pattern] ?? "*", this.pattern.length === 1);
            this.pattern = "";
            this.pending = false;
        }

        if (!this.pending && !this.spaceDone && gap > 5 * this.dit) {
            // a weak E / T alone between two word gaps: noise, dropped
            if (this.held) {
                this.held = "";
            }
            else {
                this.onText(" ");
            }
            this.spaceDone = true;
            this.wordStart = true;
        }

    }

}
