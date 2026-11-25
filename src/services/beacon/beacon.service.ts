import fs from "node:fs";
import path from "node:path";

import { audioSettings, subscribeAudio } from "../audio/audio-ws.service.js";
import { radioManager } from "../radio/radio-manager.js";
import { Ftdx10Service } from "../radio/ftdx10.service.js";
import { Ftx1Service } from "../radio/ftx-1.service.js";


/*
 * Beacon monitor: the NCDXF / IARU International Beacon Project.
 *
 * 18 beacons, 5 bands, every beacon sends 10 s per band (callsign at
 * 22 WPM, then four 1 s dashes at 100 W, 10 W, 1 W, 0.1 W); after 3
 * minutes the cycle starts again. In the slot n = floor(unix s / 10)
 * band b carries beacon (n mod 18 - b) mod 18.
 *
 * The transceiver (CAT) is tuned to the beacon frequency in CW and the
 * receive level is measured twice:
 *   audio    USB sound card, tone power 350-1000 Hz every 20 ms -
 *            timing of the dashes (how many of the four are heard)
 *   S-meter  CAT, every 100 ms - absolute strength
 * Without audio the dashes are counted from the S-meter.
 *
 * Modes:
 *   band     one band, all 18 beacons every 3 minutes
 *   rotate   the next band every 10 s: every beacon on every band
 *            within 15 minutes (5 and 18 have no common factor)
 *
 * The transceiver only receives. STOP restores frequency and mode.
 */

export const BEACON_BANDS = [
    { band: "20m", hz: 14100000 },
    { band: "17m", hz: 18110000 },
    { band: "15m", hz: 21150000 },
    { band: "12m", hz: 24930000 },
    { band: "10m", hz: 28200000 }
] as const;

export const BEACONS = [
    { call: "4U1UN", place: "United Nations, New York", country: "un", locator: "FN30as" },
    { call: "VE8AT", place: "Eureka, Nunavut", country: "ca", locator: "EQ79ax" },
    { call: "W6WX", place: "Mt. Umunhum, California", country: "us", locator: "CM97bd" },
    { call: "KH6RS", place: "Maui, Hawaii", country: "us", locator: "BL10ts" },
    { call: "ZL6B", place: "Masterton, New Zealand", country: "nz", locator: "RE78tw" },
    { call: "VK6RBP", place: "Rolystone, Australia", country: "au", locator: "OF87av" },
    { call: "JA2IGY", place: "Mt. Asama, Japan", country: "jp", locator: "PM84jk" },
    { call: "RR9O", place: "Novosibirsk, Russia", country: "ru", locator: "NO14kx" },
    { call: "VR2B", place: "Hong Kong", country: "hk", locator: "OL72bg" },
    { call: "4S7B", place: "Colombo, Sri Lanka", country: "lk", locator: "NJ06cg" },
    { call: "ZS6DN", place: "Pretoria, South Africa", country: "za", locator: "KG44dc" },
    { call: "5Z4B", place: "Kariobangi, Kenya", country: "ke", locator: "KI88hr" },
    { call: "4X6TU", place: "Tel Aviv, Israel", country: "il", locator: "KM72jb" },
    { call: "OH2B", place: "Lohja, Finland", country: "fi", locator: "KP20eh" },
    { call: "CS3B", place: "São Jorge, Madeira", country: "pt", locator: "IM12or" },
    { call: "LU4AA", place: "Buenos Aires, Argentina", country: "ar", locator: "GF05tj" },
    { call: "OA4B", place: "Lima, Peru", country: "pe", locator: "FH17mw" },
    { call: "YV5B", place: "Caracas, Venezuela", country: "ve", locator: "FJ69cc" }
] as const;

const SLOT_MS = 10_000;
const HISTORY_MS = 24 * 3600_000;
const FILE = path.resolve("data", "beacons.json");

type Mode = "band" | "rotate";

export interface BeaconResult {
    at: number;             // start of the slot (ms)
    beacon: number;         // index in BEACONS
    band: number;           // index in BEACON_BANDS
    dashes: number;         // 0-4 dashes heard (100 W, 10 W, 1 W, 0.1 W)
    snr: number;            // dB over the noise (audio, or S-meter)
    smeter: number;         // S-meter peak 0-255
    source: "audio" | "smeter";
}

interface Sample { t: number; v: number }

/* slot number -> beacon on band b */
export function beaconOn(slot: number, band: number): number {
    return (((slot % 18) - band) % 18 + 18) % 18;
}

function percentile(values: number[], p: number): number {
    if (!values.length) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    return sorted[Math.min(sorted.length - 1, Math.max(0, Math.floor(p * (sorted.length - 1))))]!;
}

/*
 * Dashes in one slot: runs above floor + margin that last >= minRun.
 * The callsign at 22 WPM has no element longer than ~0.17 s.
 */
function analyse(samples: Sample[], margin: number, minRun: number): { dashes: number; snr: number; floor: number } {
    if (samples.length < 10) return { dashes: 0, snr: 0, floor: 0 };
    const values = samples.map(s => s.v);
    const floor = percentile(values, 0.15);
    const peak = percentile(values, 0.98);
    const threshold = floor + margin;
    let dashes = 0;
    let runStart: number | null = null;
    let last = 0;
    for (const sample of samples) {
        if (sample.v >= threshold) {
            if (runStart === null) runStart = sample.t;
            last = sample.t;
        }
        else if (runStart !== null) {
            if (last - runStart >= minRun && runStart >= 1000) dashes++;
            runStart = null;
        }
    }
    if (runStart !== null && last - runStart >= minRun && runStart >= 1000) dashes++;
    return { dashes: Math.min(4, dashes), snr: Math.max(0, Math.round((peak - floor) * 10) / 10), floor };
}

/* S-meter 0-255 -> about dB (Yaesu: S9 ~ 130, S9+60 = 255) */
function smeterDb(raw: number): number {
    return raw * 0.47;
}

class BeaconService {

    private running = false;
    private mode: Mode = "rotate";
    private fixedBand = 0;
    private timer: NodeJS.Timeout | null = null;
    private unsubscribe: (() => void) | null = null;
    private restore: { frequency: number; mode: string } | null = null;
    private radioId: string | null = null;
    private error = "";

    private slot = -1;
    private slotBand = 0;
    private tunedBand = -1;
    private tunedAt = 0;
    private audioSamples: Sample[] = [];
    private smeterSamples: Sample[] = [];
    private lastAudioAt = 0;
    private smeterTick = 0;

    private results: BeaconResult[] = [];
    private lastSaved = 0;

    // audio framing
    private frame: number[] = [];

    constructor() {
        try {
            const data = JSON.parse(fs.readFileSync(FILE, "utf8"));
            if (Array.isArray(data?.results)) {
                this.results = data.results.filter((r: BeaconResult) => Date.now() - r.at < HISTORY_MS);
            }
        }
        catch { /* no history yet */ }
    }

    private save(force = false): void {
        if (!force && Date.now() - this.lastSaved < 10 * 60_000) return;
        this.lastSaved = Date.now();
        try {
            fs.mkdirSync(path.dirname(FILE), { recursive: true });
            fs.writeFileSync(FILE, JSON.stringify({ results: this.results }));
        }
        catch (error) {
            console.error("BEACON: history not saved", error instanceof Error ? error.message : error);
        }
    }

    private radio(): Ftdx10Service | Ftx1Service | null {
        const radio = radioManager.getActiveRadio();
        return radio instanceof Ftdx10Service || radio instanceof Ftx1Service ? radio : null;
    }

    /* ------------------------------------------------------------ control */

    start(mode: Mode, band: number): void {

        const radio = this.radio();
        if (!radio) throw new Error("The beacon monitor works with the Yaesu FTDX10 and FTX-1 (active transceiver)");
        if (!radio.isConnected()) throw new Error("Transceiver not connected (CAT)");

        if (this.running) this.stop(false);

        this.mode = mode === "band" ? "band" : "rotate";
        this.fixedBand = Math.max(0, Math.min(BEACON_BANDS.length - 1, Math.round(band) || 0));
        this.restore = { frequency: radio.getFrequency(), mode: radio.getMode() };
        this.radioId = radioManager.getActiveRadioId();
        this.error = "";
        this.running = true;
        this.slot = -1;
        this.tunedBand = -1;

        try {
            radio.setMode("CW-U", radio.getFrequency());
        }
        catch (error) {
            console.warn("BEACON: CW mode not set", error instanceof Error ? error.message : error);
        }

        this.unsubscribe = subscribeAudio(chunk => this.onAudio(chunk));
        this.timer = setInterval(() => this.tick(), 50);
        this.tick();

        console.log(`BEACON: start, ${this.mode === "band" ? BEACON_BANDS[this.fixedBand]!.band : "all bands"}`);

    }

    stop(restore = true): void {

        if (this.timer) clearInterval(this.timer);
        this.timer = null;
        this.unsubscribe?.();
        this.unsubscribe = null;

        const wasRunning = this.running;
        this.running = false;

        const radio = this.radio();
        if (restore && this.restore && radio && radioManager.getActiveRadioId() === this.radioId) {
            try {
                radio.setFrequency(this.restore.frequency);
                if (this.restore.mode) radio.setMode(this.restore.mode, this.restore.frequency);
            }
            catch (error) {
                console.warn("BEACON: transceiver not restored", error instanceof Error ? error.message : error);
            }
        }
        this.restore = null;

        if (wasRunning) {
            this.save(true);
            console.log("BEACON: stop");
        }

    }

    clearHistory(): void {
        this.results = [];
        this.save(true);
    }

    /* ------------------------------------------------------------ measuring */

    private onAudio(chunk: Buffer): void {

        if (!this.running) return;

        const { sampleRate, channels } = audioSettings();
        const frameSize = Math.round(sampleRate * 0.02);
        const step = 2 * Math.max(1, channels);

        for (let i = 0; i + 1 < chunk.length; i += step) {
            this.frame.push(chunk.readInt16LE(i) / 32768);
            if (this.frame.length >= frameSize) {
                this.measureFrame(this.frame, sampleRate);
                this.frame = [];
            }
        }

    }

    /* strongest tone 350-1000 Hz (Goertzel) of one 20 ms frame, dB */
    private measureFrame(samples: number[], sampleRate: number): void {

        let best = 0;
        for (let f = 350; f <= 1000; f += 50) {
            const k = 2 * Math.cos(2 * Math.PI * f / sampleRate);
            let s1 = 0, s2 = 0;
            for (let i = 0; i < samples.length; i++) {
                const w = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (samples.length - 1));
                const s0 = samples[i]! * w + k * s1 - s2;
                s2 = s1;
                s1 = s0;
            }
            const power = s1 * s1 + s2 * s2 - k * s1 * s2;
            if (power > best) best = power;
        }

        const now = Date.now();
        this.lastAudioAt = now;
        this.addSample(this.audioSamples, now, 10 * Math.log10(best + 1e-12));

    }

    private addSample(list: Sample[], now: number, value: number): void {
        const t = now - this.slot * SLOT_MS;
        // the first 0.5 s after tuning and the last 0.25 s (next band) do not count
        if (this.slot < 0 || now - this.tunedAt < 500 || t > SLOT_MS - 250 || this.tunedBand !== this.slotBand) return;
        list.push({ t, v: value });
    }

    private tick(): void {

        if (!this.running) return;

        const radio = this.radio();
        if (!radio || radioManager.getActiveRadioId() !== this.radioId) {
            this.error = "The active transceiver changed - beacon monitor stopped";
            this.stop(false);
            return;
        }
        if (!radio.isConnected()) {
            this.error = "Transceiver not connected (CAT)";
            return;
        }
        this.error = "";

        const now = Date.now();
        const slot = Math.floor(now / SLOT_MS);
        const inSlot = now - slot * SLOT_MS;

        if (slot !== this.slot) {
            this.finishSlot();
            this.slot = slot;
            this.slotBand = this.bandFor(slot);
            this.audioSamples = [];
            this.smeterSamples = [];
            this.frame = [];
        }

        // tune: at the start, in "rotate" already 0.2 s before the next slot
        const wanted = inSlot > SLOT_MS - 200 ? this.bandFor(slot + 1) : this.slotBand;
        if (wanted !== this.tunedBand) {
            try {
                radio.setFrequency(BEACON_BANDS[wanted]!.hz);
                this.tunedBand = wanted;
                this.tunedAt = now;
            }
            catch (error) {
                this.error = error instanceof Error ? error.message : String(error);
            }
        }

        // S-meter every 100 ms
        this.smeterTick = (this.smeterTick + 1) % 2;
        if (this.smeterTick === 0) {
            radio.requestSMeter();
            this.addSample(this.smeterSamples, now, radio.getSMeter());
        }

    }

    private bandFor(slot: number): number {
        return this.mode === "band" ? this.fixedBand : ((slot % BEACON_BANDS.length) + BEACON_BANDS.length) % BEACON_BANDS.length;
    }

    private finishSlot(): void {

        if (this.slot < 0) return;
        if (this.smeterSamples.length < 30 && this.audioSamples.length < 150) return;

        const audio = this.audioSamples.length >= 150 && Date.now() - this.lastAudioAt < 2000;
        const smeterDbSamples = this.smeterSamples.map(s => ({ t: s.t, v: smeterDb(s.v) }));
        const result = audio
            ? analyse(this.audioSamples, 6, 550)
            : analyse(smeterDbSamples, 4, 500);

        const smeterPeak = this.smeterSamples.length ? Math.round(percentile(this.smeterSamples.map(s => s.v), 0.98)) : 0;

        this.results.push({
            at: this.slot * SLOT_MS,
            beacon: beaconOn(this.slot, this.slotBand),
            band: this.slotBand,
            dashes: result.dashes,
            snr: result.snr,
            smeter: smeterPeak,
            source: audio ? "audio" : "smeter"
        });

        const cutoff = Date.now() - HISTORY_MS;
        if (this.results.length && this.results[0]!.at < cutoff) {
            this.results = this.results.filter(r => r.at >= cutoff);
        }
        this.save();

    }

    /* ------------------------------------------------------------ state */

    state(hours = 6) {

        const now = Date.now();
        const slot = Math.floor(now / SLOT_MS);
        const since = now - Math.max(1, Math.min(24, hours)) * 3600_000;

        // latest result per beacon x band
        const latest: Record<string, BeaconResult> = {};
        for (const result of this.results) {
            latest[`${result.beacon}:${result.band}`] = result;
        }

        // live trace of the current slot (100 ms steps)
        const source = this.audioSamples.length > 20 && now - this.lastAudioAt < 2000 ? "audio" : "smeter";
        const samples = source === "audio"
            ? this.audioSamples
            : this.smeterSamples.map(s => ({ t: s.t, v: smeterDb(s.v) }));
        const buckets = new Map<number, number>();
        for (const sample of samples) {
            const key = Math.floor(sample.t / 100);
            buckets.set(key, Math.max(buckets.get(key) ?? -Infinity, sample.v));
        }
        const values = samples.map(s => s.v);
        const floor = percentile(values, 0.15);

        return {
            running: this.running,
            mode: this.mode,
            band: this.fixedBand,
            error: this.error,
            supported: Boolean(this.radio()),
            now,
            slotStart: slot * SLOT_MS,
            listening: this.running ? { band: this.slotBand, beacon: beaconOn(slot, this.slotBand) } : null,
            onAir: BEACON_BANDS.map((_, band) => beaconOn(slot, band)),
            source: this.running ? (now - this.lastAudioAt < 2000 ? "audio" : "smeter") : null,
            live: this.running
                ? {
                    floor,
                    trace: [...buckets.entries()].sort((a, b) => a[0] - b[0]).map(([k, v]) => [k * 100, Math.round((v - floor) * 10) / 10]),
                    smeter: this.radio()?.getSMeter() ?? 0
                }
                : null,
            bands: BEACON_BANDS,
            beacons: BEACONS,
            latest: Object.values(latest),
            history: this.results.filter(r => r.at >= since).map(r => [r.at, r.beacon, r.band, r.dashes, r.snr])
        };

    }

}

export const beaconService = new BeaconService();
