import type { FusionSpot } from "../fusion/spot.model.js";
import type { NeededAlertSettings } from "../../config/settings.config.js";
import { dxccService, type DxccEntity } from "../dxcc/dxcc.service.js";
import { settingsService } from "../settings/settings.service.js";
import { watchNotifier, inQuietHours } from "../notifications/watch-notifier.service.js";
import { getWorkedIndex, modeGroup, type WorkedIndex } from "./worked-index.js";
import { heardService, type HeardInfo } from "./heard.service.js";


/*
 * Needed alerts: every new fused spot is checked against the log by
 * DXCC entity - no callsigns to enter.
 *
 *   NEW COUNTRY       entity never worked
 *   NEW BAND COUNTRY  entity worked, but not on this band
 *   NEW BAND          station worked, but not on this band   (optional)
 *   NEW MODE          station worked, but not in this mode   (optional)
 *
 * Filters: bands, modes, minimum score, "only when heard near you".
 * Lockout per entity + band (station levels: per call + band), so a
 * pile-up with many spots alerts once. Baseline 2 min after the start,
 * quiet hours, ntfy channel and link as for the watch list.
 *
 * "Only when heard near you": the RBN skimmers often report a station
 * a few minutes after the first cluster spot - a spot that is not
 * (yet) heard nearby is checked again after 2, 5 and 10 minutes.
 */

const BASELINE_MS = 2 * 60 * 1000;
const RECHECK_MS = [2 * 60_000, 5 * 60_000, 10 * 60_000];
const RECENT_MAX = 30;

export type NeededLevel = "NEW COUNTRY" | "NEW BAND COUNTRY" | "NEW BAND" | "NEW MODE";

export interface NeededAlert {
    at: number;
    level: NeededLevel;
    callsign: string;
    entity: string;
    frequency: number;
    mode: string;
    band: string;
    score: number;
    heard: string;
    nearby: boolean;
    sources: string[];
    /* sent / quiet hours / notifications off / error ... */
    result: string;
}


export function classify(
    spot: Pick<FusionSpot, "call" | "band" | "mode">,
    entity: DxccEntity,
    worked: WorkedIndex,
    settings: NeededAlertSettings
): NeededLevel | null {

    const call = spot.call.toUpperCase();
    const band = String(spot.band || "").toUpperCase();
    const group = modeGroup(spot.mode);

    if (!worked.entities.has(entity.key)) {
        return settings.newCountry ? "NEW COUNTRY" : null;
    }

    if (!worked.entityBands.has(`${entity.key}|${band}`)) {
        return settings.newBandCountry ? "NEW BAND COUNTRY" : null;
    }

    if (worked.calls.has(call)) {

        if (settings.newBand && !worked.callBands.has(`${call}|${band}`)) return "NEW BAND";

        if (settings.newMode && !worked.callModes.has(`${call}|${group}`)) return "NEW MODE";

    }

    return null;

}


/*
 * Same formula as the DX score in the live spots (live-spots.js,
 * calculateSpotScore), by DXCC entity, for a fresh spot.
 */
export function spotScore(spot: FusionSpot, entity: DxccEntity | null, worked: WorkedIndex, heard: HeardInfo | null): number {

    const call = spot.call.toUpperCase();
    const band = String(spot.band || "").toUpperCase();
    const key = entity?.key ?? "";

    const stationOnBand = worked.callBands.has(`${call}|${band}`);
    const countryOnBand = Boolean(key) && worked.entityBands.has(`${key}|${band}`);
    const station = worked.calls.has(call);
    const countryWorked = Boolean(key) && worked.entities.has(key);

    const status =
        stationOnBand ? "station-band" :
        countryOnBand ? "country-band" :
        station ? "station" :
        countryWorked ? "country" : "new";

    let score = 0;

    if (status === "new") score += 100 + 15;
    else if (status === "station") score -= 20;
    else if (status === "country-band") score += 60;
    else if (status === "station-band") score -= 80;

    if (countryWorked && !countryOnBand) score += 60;
    if (station && !stationOnBand) score += 30;

    if ((spot.sources?.length ?? 0) >= 2) score += 20;

    const confidence = Number(spot.confidence);
    if (Number.isFinite(confidence)) score += Math.max(0, Math.min(100, confidence)) * 0.15;

    score += 15; // fresh spot

    const distance = Number(spot.distance);
    if (Number.isFinite(distance)) {
        score += distance > 8000 ? 15 : distance > 5000 ? 11 : distance > 2000 ? 7 : 3;
    }

    if (heard?.nearby) score += 15;

    return Math.round(score);

}


class NeededNotifier {

    private startedAt = Date.now();
    private lastAlert = new Map<string, number>();
    private pending = new Map<string, NodeJS.Timeout>();
    private recent: NeededAlert[] = [];

    start(fusion: { onNewSpot(listener: (spot: FusionSpot) => void): void }): void {

        this.startedAt = Date.now();

        fusion.onNewSpot(spot => {
            try {
                this.check(spot, 0);
            }
            catch (error) {
                console.error("Needed alert:", error);
            }
        });

    }

    getRecent(): NeededAlert[] {

        return this.recent;

    }

    private lockKey(level: NeededLevel, spot: FusionSpot, entity: DxccEntity): string {

        const band = String(spot.band || "").toUpperCase();

        return level === "NEW COUNTRY" || level === "NEW BAND COUNTRY"
            ? `${entity.key}|${band}`
            : `${spot.call.toUpperCase()}|${band}|${level}`;

    }

    private check(spot: FusionSpot, attempt: number): void {

        if (!spot?.call) return;

        if (attempt === 0 && Date.now() - this.startedAt < BASELINE_MS) return;

        const all = settingsService.get().notifications;
        const settings = all.needed;

        if (!settings?.enabled) return;

        const band = String(spot.band || "");

        if (settings.bands.length && !settings.bands.map(b => b.toLowerCase()).includes(band.toLowerCase())) return;

        if (settings.modes.length && !settings.modes.includes(modeGroup(spot.mode))) return;

        const entity = dxccService.resolve(spot.call);

        if (!entity) return;

        const worked = getWorkedIndex();
        const level = classify(spot, entity, worked, settings);

        if (!level) return;

        const lockKey = this.lockKey(level, spot, entity);
        const last = this.lastAlert.get(lockKey) ?? 0;

        if (Date.now() - last < settings.cooldownMinutes * 60_000) return;

        const heard = heardService.evaluate(spot.call, band);
        const score = spotScore(spot, entity, worked, heard);

        if (settings.minScore > 0 && score < settings.minScore) return;

        if (settings.onlyNearby && !heard.nearby) {

            // not heard nearby (yet): check again later
            const delay = RECHECK_MS[attempt];

            if (delay !== undefined && !this.pending.has(lockKey)) {

                const timer = setTimeout(() => {
                    this.pending.delete(lockKey);
                    this.check(spot, attempt + 1);
                }, delay);

                timer.unref?.();
                this.pending.set(lockKey, timer);

            }

            return;

        }

        this.lastAlert.set(lockKey, Date.now());

        void this.alert(spot, entity, level, score, heard);

    }

    private async alert(spot: FusionSpot, entity: DxccEntity, level: NeededLevel, score: number, heard: HeardInfo): Promise<void> {

        const all = settingsService.get().notifications;
        const heardText = heardService.describe(heard);

        const sources = [...(spot.sources ?? [])];
        if (heard.rbn && !sources.includes("RBN")) sources.push("RBN");

        const khz = Number(spot.frequency);
        const mode = spot.mode && spot.mode !== "UNKNOWN" ? ` ${spot.mode}` : "";

        const message = [
            `${level}: ${spot.call.toUpperCase()}`,
            entity.name,
            Number.isFinite(khz) && khz > 0 ? `${(khz / 1000).toFixed(3)} MHz${mode}` : mode.trim(),
            heardText,
            sources.length ? `via ${sources.join(", ")}` : ""
        ].filter(Boolean).join(" – ");

        let result: string;

        if (!all.ntfy.enabled || !all.ntfy.topic) {
            result = "no ntfy topic";
        }
        else if (inQuietHours(all)) {
            result = "quiet hours";
        }
        else {
            const push = await watchNotifier.send(all, {
                title: `${level}: ${spot.call.toUpperCase()}`,
                message,
                tags: [level === "NEW COUNTRY" ? "star" : "new"]
            });
            result = push.ok ? "sent" : `error: ${push.message}`;
        }

        this.recent.unshift({
            at: Date.now(),
            level,
            callsign: spot.call.toUpperCase(),
            entity: entity.name,
            frequency: spot.frequency,
            mode: spot.mode,
            band: spot.band,
            score,
            heard: heardText,
            nearby: heard.nearby,
            sources,
            result
        });

        this.recent.length = Math.min(this.recent.length, RECENT_MAX);

        console.log(`Needed alert: ${message} (score ${score}) - ${result}`);

    }

}


export const neededNotifier = new NeededNotifier();
