import { audioCaptureRunning, audioSettings, subscribeAudio } from "../audio/audio-ws.service.js";
import { radioManager } from "../radio/radio-manager.js";
import { settingsService } from "../settings/settings.service.js";
import { CwDecoder, type CwDecoderStats } from "./cw-decoder.js";
import { cleanCwText } from "./morse.js";


/*
 * CW line of the dashboard:
 *
 *   decoder   RX audio of the transceiver (USB sound card) -> text.
 *             Runs while it is shown on the dashboard or in the contest
 *             console (Settings -> Split & CW), pitch from there
 *             (0 = automatic).
 *   encoder   text -> CW through the active transceiver
 *             (RadioService.sendCwText), speed from the settings.
 */

const KEEP = 600;       // characters kept for the dashboard

class CwService {

    private enabled = false;
    private pitch = 0;
    private decoder: CwDecoder | null = null;
    private unsubscribe: (() => void) | null = null;

    private text = "";
    private seq = 0;            // characters ever decoded
    private lastAudioAt = 0;

    constructor() {
        // after the server is up
        setTimeout(() => this.applySettings(), 3000);
    }

    /* settings changed (or start): decoder on / off, pitch */
    applySettings(): void {
        const cw = settingsService.get().cw;
        this.pitch = cw?.pitch ?? 0;
        this.decoder?.setPitch(this.pitch);
        // runs when the dashboard or the contest console shows it
        this.setEnabled(Boolean(cw?.decoder || cw?.contestDecoder));
    }

    setEnabled(on: boolean): void {

        if (on === this.enabled && (on ? this.decoder : !this.decoder)) return;

        this.enabled = on;

        if (on) {
            const { sampleRate, channels } = audioSettings();
            this.decoder = new CwDecoder(sampleRate, char => this.append(char));
            this.decoder.setPitch(this.pitch);
            this.unsubscribe = subscribeAudio(chunk => {
                this.lastAudioAt = Date.now();
                this.decoder?.feed(chunk, channels);
            });
            console.log("CW: decoder on");
        }
        else {
            this.unsubscribe?.();
            this.unsubscribe = null;
            this.decoder = null;
            console.log("CW: decoder off");
        }

    }

    clear(): void {
        this.text = "";
    }

    private append(char: string): void {
        // no double spaces, no leading space
        if (char === " " && (!this.text || this.text.endsWith(" "))) return;
        this.text = (this.text + char).slice(-KEEP);
        this.seq += char.length;
    }

    /* state for the dashboard; since = seq the client has seen */
    state(since?: number) {

        const stats: CwDecoderStats | null = this.decoder?.stats() ?? null;
        const audio = audioSettings();

        let fresh: string | null = null;
        if (since !== undefined && Number.isFinite(since)) {
            const count = this.seq - since;
            fresh = count <= 0 ? "" : this.text.slice(-Math.min(count, this.text.length));
        }

        const radio = radioManager.getActiveRadio() as { sendCwText?: unknown } | null;

        const cw = settingsService.get().cw;

        return {
            enabled: this.enabled,
            showDecoder: Boolean(cw?.decoder),
            showEncoder: Boolean(cw?.encoder),
            contestDecoder: Boolean(cw?.contestDecoder),
            contestEncoder: Boolean(cw?.contestEncoder),
            wpm: cw?.wpm ?? 22,
            pitch: this.pitch,
            seq: this.seq,
            text: this.text,
            fresh,
            stats,
            audio: {
                device: audio.device,
                enabled: audio.enabled,
                running: audioCaptureRunning(),
                receiving: Date.now() - this.lastAudioAt < 2000
            },
            canSend: typeof radio?.sendCwText === "function"
        };

    }

    /* ------------------------------------------------------------ sending */

    async send(text: string): Promise<{ sent: string }> {

        const clean = cleanCwText(text);
        if (!clean) throw new Error("No CW text");

        const radio = radioManager.getActiveRadio() as {
            sendCwText?: (text: string) => Promise<boolean>;
            setCwSpeed?: (wpm: number) => void;
        } | null;

        if (!radio) throw new Error("No active transceiver");
        if (typeof radio.sendCwText !== "function") {
            throw new Error("The active transceiver cannot send CW text via CAT");
        }

        // CW mode first (sideband from Settings > Split & CW)
        const anyRadio = radio as unknown as { getMode?: () => string; getFrequency?: () => number; setMode?: (mode: string, hz: number) => void };
        const mode = String(anyRadio.getMode?.() ?? "").toUpperCase();
        if (!mode.startsWith("CW") && typeof anyRadio.setMode === "function") {
            const sideband = settingsService.get().cwSideband === "CW-L" ? "CW-L" : "CW-U";
            anyRadio.setMode(sideband, anyRadio.getFrequency?.() ?? 0);
            await new Promise(resolve => setTimeout(resolve, 200));
        }

        // the speed of the settings
        const wpm = settingsService.get().cw?.wpm;
        if (wpm && typeof radio.setCwSpeed === "function") {
            try {
                radio.setCwSpeed(wpm);
                await new Promise(resolve => setTimeout(resolve, 80));
            }
            catch (error) {
                console.error("CW: speed not set", error instanceof Error ? error.message : error);
            }
        }

        const ok = await radio.sendCwText(clean);
        if (!ok) throw new Error("Not sent: transceiver not connected or tuner not ready (see the server log)");

        return { sent: clean };

    }

    async stop(): Promise<void> {
        const radio = radioManager.getActiveRadio() as { stopCwText?: () => Promise<boolean> } | null;
        if (typeof radio?.stopCwText !== "function") throw new Error("The active transceiver cannot stop CW via CAT");
        await radio.stopCwText();
    }

}

export const cwService = new CwService();
