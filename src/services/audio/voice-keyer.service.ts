import fs from "node:fs";
import path from "node:path";
import { spawn, type ChildProcessByStdio } from "node:child_process";
import type { Readable, Writable } from "node:stream";

import { shackSettings } from "../../config/settings.config.js";
import { radioManager } from "../radio/radio-manager.js";
import { txAudioBusy } from "./audio-ws.service.js";


/*
 * Voice keyer (SSB / AM / FM): 8 recorded messages, played into the
 * USB sound card of the transceiver (the same output as the remote
 * microphone) while the transceiver is keyed by CAT (PTT).
 *
 *   data/voice-keyer/slots.json      labels, sample rate, length
 *   data/voice-keyer/slot-<n>.pcm    S16_LE mono
 *
 * Repeat: the message again every n seconds of listening (CQ loop),
 * until STOP, a new message or 30 minutes.
 *
 * Safety: PTT is released when the playback ends, fails or takes more
 * than the length of the message + 3 s; at most 30 s per message.
 */

export const VOICE_SLOTS = 8;
export const VOICE_MAX_SECONDS = 30;

const DIR = path.resolve("data", "voice-keyer");
const META = path.join(DIR, "slots.json");

const DEFAULT_LABELS = ["CQ", "EXCH", "TU", "MY CALL", "AGN?", "QRZ?", "MSG 7", "MSG 8"];

const PTT_LEAD_MS = 200;        // PTT on -> audio
const PTT_TAIL_MS = 150;        // audio end -> PTT off
const REPEAT_LIMIT_MS = 30 * 60 * 1000;

interface Slot {
    label: string;
    rate: number;
    samples: number;
    updated: string;
}

type Phase = "idle" | "tx" | "wait";

interface PttRadio {
    setPtt?(enabled: boolean): void;
    isConnected?(): boolean;
    getMode?(): string;
}


class VoiceKeyerService {

    private slots: Array<Slot | null> = new Array(VOICE_SLOTS).fill(null);
    private labels: string[] = [...DEFAULT_LABELS];

    private phase: Phase = "idle";
    private current: number | null = null;
    private repeat = 0;
    private repeatSince = 0;
    private nextAt = 0;
    private lastError = "";

    private player: ChildProcessByStdio<Writable, null, Readable> | null = null;
    private timers: Array<ReturnType<typeof setTimeout>> = [];
    private keyed = false;
    private run = 0;            // id of the current playback (stale callbacks)

    constructor() {
        this.load();
    }

    /* ------------------------------------------------------------ storage */

    private load(): void {
        try {
            const data = JSON.parse(fs.readFileSync(META, "utf8"));
            if (Array.isArray(data.labels)) {
                data.labels.slice(0, VOICE_SLOTS).forEach((label: unknown, i: number) => {
                    if (typeof label === "string" && label.trim()) this.labels[i] = label.trim().slice(0, 12);
                });
            }
            if (Array.isArray(data.slots)) {
                data.slots.slice(0, VOICE_SLOTS).forEach((slot: Slot | null, i: number) => {
                    if (slot && fs.existsSync(this.file(i + 1))) this.slots[i] = slot;
                });
            }
        }
        catch {
            // first start
        }
    }

    private save(): void {
        fs.mkdirSync(DIR, { recursive: true });
        fs.writeFileSync(META, JSON.stringify({ labels: this.labels, slots: this.slots }, null, 2));
    }

    private file(slot: number): string {
        return path.join(DIR, `slot-${slot}.pcm`);
    }

    private check(slot: number): number {
        const n = Math.round(Number(slot));
        if (!Number.isFinite(n) || n < 1 || n > VOICE_SLOTS) throw new Error(`Message 1 to ${VOICE_SLOTS}`);
        return n;
    }

    /* PCM S16_LE mono from the browser */
    store(slot: number, pcm: Buffer, rate: number, label?: string): void {
        const n = this.check(slot);
        const sampleRate = Math.round(Number(rate)) || shackSettings.audio.sampleRate;
        if (sampleRate < 8000 || sampleRate > 96000) throw new Error("Invalid sample rate");
        if (pcm.length < 2 || pcm.length % 2) throw new Error("No audio");
        const samples = pcm.length / 2;
        if (samples / sampleRate > VOICE_MAX_SECONDS + 0.5) throw new Error(`At most ${VOICE_MAX_SECONDS} seconds`);

        if (this.current === n) this.stop();

        fs.mkdirSync(DIR, { recursive: true });
        fs.writeFileSync(this.file(n), pcm);
        this.slots[n - 1] = { label: this.labels[n - 1] ?? "", rate: sampleRate, samples, updated: new Date().toISOString() };
        if (label !== undefined) this.setLabel(n, label);
        this.save();
    }

    setLabel(slot: number, label: string): void {
        const n = this.check(slot);
        const clean = String(label ?? "").replace(/[<>]/g, "").trim().toUpperCase().slice(0, 12);
        this.labels[n - 1] = clean || DEFAULT_LABELS[n - 1] || `MSG ${n}`;
        this.save();
    }

    remove(slot: number): void {
        const n = this.check(slot);
        if (this.current === n) this.stop();
        try { fs.unlinkSync(this.file(n)); } catch { /* not there */ }
        this.slots[n - 1] = null;
        this.save();
    }

    /* the recording as WAV (listening in the browser) */
    wav(slot: number): Buffer | null {
        const n = this.check(slot);
        const meta = this.slots[n - 1];
        if (!meta) return null;
        const pcm = fs.readFileSync(this.file(n));
        const header = Buffer.alloc(44);
        header.write("RIFF", 0);
        header.writeUInt32LE(36 + pcm.length, 4);
        header.write("WAVE", 8);
        header.write("fmt ", 12);
        header.writeUInt32LE(16, 16);
        header.writeUInt16LE(1, 20);
        header.writeUInt16LE(1, 22);
        header.writeUInt32LE(meta.rate, 24);
        header.writeUInt32LE(meta.rate * 2, 28);
        header.writeUInt16LE(2, 32);
        header.writeUInt16LE(16, 34);
        header.write("data", 36);
        header.writeUInt32LE(pcm.length, 40);
        return Buffer.concat([header, pcm]);
    }

    /* ------------------------------------------------------------ playing */

    private radio(): PttRadio | null {
        return (radioManager.getActiveRadio() as PttRadio | undefined) ?? null;
    }

    private canKey(): string {
        const radio = this.radio();
        if (!radio) return "No active transceiver";
        if (typeof radio.setPtt !== "function") return "The active transceiver cannot be keyed via CAT";
        if (typeof radio.isConnected === "function" && !radio.isConnected()) return "Transceiver not connected (CAT port closed)";
        const mode = String(radio.getMode?.() ?? "").toUpperCase();
        if (mode.startsWith("CW")) return "The transceiver is in CW - the voice keyer needs SSB, AM or FM";
        if (!shackSettings.audio.enabled) return "USB audio is switched off in the configuration";
        return "";
    }

    private ptt(on: boolean): void {
        const radio = this.radio();
        if (!on && !this.keyed) return;
        try {
            radio?.setPtt?.(on);
            this.keyed = on;
        }
        catch (error) {
            console.error("VOICE KEYER: PTT", error);
            if (!on) this.keyed = false;
        }
    }

    private later(ms: number, fn: () => void): void {
        this.timers.push(setTimeout(fn, ms));
    }

    private clearTimers(): void {
        this.timers.forEach(clearTimeout);
        this.timers = [];
    }

    play(slot: number, repeatSeconds = 0): void {
        const n = this.check(slot);
        if (!this.slots[n - 1]) throw new Error(`Message ${n} is not recorded`);

        const problem = this.canKey();
        if (problem) throw new Error(problem);
        if (txAudioBusy()) throw new Error("The remote microphone is transmitting");

        this.stop();

        const repeat = Math.round(Number(repeatSeconds) || 0);
        this.repeat = repeat >= 1 ? Math.min(120, repeat) : 0;
        this.repeatSince = Date.now();
        this.lastError = "";
        this.transmit(n);
    }

    private transmit(n: number): void {

        const meta = this.slots[n - 1];
        if (!meta) { this.stop(); return; }

        const run = ++this.run;
        this.current = n;
        this.phase = "tx";
        this.nextAt = 0;

        const { device, sampleRate, channels } = shackSettings.audio;
        let pcm = fs.readFileSync(this.file(n));

        if (channels === 2) {
            const stereo = Buffer.alloc(pcm.length * 2);
            for (let i = 0; i < pcm.length; i += 2) {
                pcm.copy(stereo, i * 2, i, i + 2);
                pcm.copy(stereo, i * 2 + 2, i, i + 2);
            }
            pcm = stereo;
        }

        const rate = meta.rate || sampleRate;
        const duration = meta.samples / rate * 1000;

        this.ptt(true);

        this.later(PTT_LEAD_MS, () => {
            if (run !== this.run) return;

            const player = spawn("aplay", [
                "-D", device,
                "-f", "S16_LE",
                "-r", String(rate),
                "-c", String(channels === 2 ? 2 : 1),
                "-t", "raw",
                "-q"
            ], { stdio: ["pipe", "ignore", "pipe"] });

            this.player = player;
            let stderr = "";

            player.stderr.on("data", (chunk: Buffer) => { stderr += chunk.toString(); });
            player.stdin.on("error", () => undefined);

            player.on("error", error => {
                if (run !== this.run) return;
                this.lastError = `Playback: ${error.message}`;
                this.finish(run, false);
            });

            player.on("close", code => {
                if (this.player === player) this.player = null;
                if (run !== this.run) return;
                if (code && stderr.trim()) this.lastError = stderr.trim().split("\n").pop() ?? "";
                this.finish(run, !code);
            });

            player.stdin.end(pcm);

            /* watchdog */
            this.later(duration + 3000, () => {
                if (run !== this.run || this.phase !== "tx") return;
                this.lastError = "Playback did not end - stopped";
                this.stop();
            });
        });
    }

    private finish(run: number, ok: boolean): void {
        this.later(PTT_TAIL_MS, () => {
            if (run !== this.run) return;
            this.ptt(false);

            const n = this.current;
            if (ok && n && this.repeat && Date.now() - this.repeatSince < REPEAT_LIMIT_MS) {
                this.phase = "wait";
                this.nextAt = Date.now() + this.repeat * 1000;
                this.later(this.repeat * 1000, () => {
                    if (run !== this.run) return;
                    if (txAudioBusy() || this.canKey()) {
                        this.lastError = this.canKey() || "The remote microphone is transmitting";
                        this.reset();
                        return;
                    }
                    this.transmit(n);
                });
                return;
            }
            this.reset();
        });
    }

    private reset(): void {
        this.phase = "idle";
        this.current = null;
        this.nextAt = 0;
        this.repeat = 0;
    }

    stop(): void {
        this.run++;
        this.clearTimers();
        if (this.player) {
            try { this.player.kill("SIGTERM"); } catch { /* gone */ }
            this.player = null;
        }
        this.ptt(false);
        this.reset();
    }

    state() {
        const problem = this.canKey();
        return {
            slots: this.slots.map((slot, i) => ({
                slot: i + 1,
                label: this.labels[i],
                recorded: Boolean(slot),
                seconds: slot ? Math.round(slot.samples / slot.rate * 10) / 10 : 0,
                updated: slot?.updated ?? null
            })),
            phase: this.phase,
            playing: this.current,
            repeat: this.repeat,
            nextIn: this.nextAt ? Math.max(0, Math.round((this.nextAt - Date.now()) / 100) / 10) : 0,
            error: this.lastError,
            ready: !problem,
            problem,
            sampleRate: shackSettings.audio.sampleRate,
            maxSeconds: VOICE_MAX_SECONDS
        };
    }
}

export const voiceKeyer = new VoiceKeyerService();
