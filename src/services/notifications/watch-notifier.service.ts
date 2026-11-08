import type { NotificationSettings } from "../../config/settings.config.js";
import type { FusionSpot } from "../fusion/spot.model.js";
import { settingsService } from "../settings/settings.service.js";
import { watchlistService } from "../watchlist/watchlist.service.js";


/*
 * Watch list on the server: every new fused spot is checked against
 * the watch list - also when no browser is open.
 *
 *   - baseline: spots in the first 2 minutes after the start (the
 *     sources deliver their recent spots first) do not alert
 *   - lockout per callsign (Settings, default 15 min): further spots of
 *     the same station do not alert again
 *   - quiet hours: no push notifications (detection is still listed)
 *   - channel: ntfy (JSON API, UTF-8 safe); Telegram / Pushover can be
 *     added as further channels in send()
 */

const BASELINE_MS = 2 * 60 * 1000;
const SEND_TIMEOUT_MS = 15_000;
const RECENT_MAX = 20;


export interface WatchDetection {
    at: number;
    callsign: string;
    frequency: number;
    mode: string;
    country: string;
    sources: string[];
    /* sent / lockout / quiet hours / push off / disabled / error */
    result: string;
}

export interface PushResult {
    at: number;
    ok: boolean;
    message: string;
}


function minutesOfDay(hhmm: string): number {

    const [h, m] = hhmm.split(":").map(Number);

    return (h ?? 0) * 60 + (m ?? 0);

}

export function inQuietHours(settings: NotificationSettings, date = new Date()): boolean {

    if (!settings.quietHours.enabled) return false;

    const now = date.getHours() * 60 + date.getMinutes();
    const from = minutesOfDay(settings.quietHours.from);
    const to = minutesOfDay(settings.quietHours.to);

    if (from === to) return false;

    // e.g. 22:00-07:00 crosses midnight
    return from < to ? now >= from && now < to : now >= from || now < to;

}

export function formatSpotMessage(spot: Pick<FusionSpot, "call" | "frequency" | "mode" | "country" | "sources">): string {

    const parts = [`${spot.call.toUpperCase()} DETECTED`];

    const khz = Number(spot.frequency);
    const mode = spot.mode && spot.mode !== "UNKNOWN" ? ` ${spot.mode}` : "";

    if (Number.isFinite(khz) && khz > 0) {
        parts.push(`${(khz / 1000).toFixed(3)} MHz${mode}`);
    }
    else if (mode) {
        parts.push(mode.trim());
    }

    if (spot.country) parts.push(spot.country);

    if (spot.sources?.length) parts.push(`via ${spot.sources.join(", ")}`);

    return parts.join(" – ");

}


class WatchNotifier {

    private startedAt = Date.now();
    private lastAlert = new Map<string, number>();
    private recent: WatchDetection[] = [];
    private lastPush: PushResult | null = null;

    start(fusion: { onNewSpot(listener: (spot: FusionSpot) => void): void }): void {

        this.startedAt = Date.now();

        fusion.onNewSpot(spot => {
            void this.handle(spot);
        });

    }

    getStatus(): { lastPush: PushResult | null; recent: WatchDetection[]; baseline: boolean } {

        return {
            lastPush: this.lastPush,
            recent: this.recent,
            baseline: Date.now() - this.startedAt < BASELINE_MS
        };

    }

    private remember(spot: FusionSpot, result: string): void {

        this.recent.unshift({
            at: Date.now(),
            callsign: spot.call.toUpperCase(),
            frequency: spot.frequency,
            mode: spot.mode,
            country: spot.country ?? "",
            sources: [...(spot.sources ?? [])],
            result
        });

        this.recent.length = Math.min(this.recent.length, RECENT_MAX);

    }

    private async handle(spot: FusionSpot): Promise<void> {

        if (!spot?.call) return;

        if (Date.now() - this.startedAt < BASELINE_MS) return;

        const entry = watchlistService.lookup(spot.call);

        if (!entry) return;

        const callsign = entry.callsign;
        const settings = settingsService.get().notifications;
        const now = Date.now();
        const last = this.lastAlert.get(callsign) ?? 0;

        if (now - last < settings.cooldownMinutes * 60_000) {
            return; // same station again within the lockout: not even listed
        }

        this.lastAlert.set(callsign, now);

        if (!entry.push) {
            this.remember(spot, "push off");
            return;
        }

        if (!settings.enabled || !settings.ntfy.enabled || !settings.ntfy.topic) {
            this.remember(spot, "notifications off");
            return;
        }

        if (inQuietHours(settings)) {
            this.remember(spot, "quiet hours");
            return;
        }

        const result = await this.send(settings, {
            title: `${callsign} DETECTED`,
            message: formatSpotMessage(spot),
            tags: ["satellite_antenna"]
        });

        this.remember(spot, result.ok ? "sent" : `error: ${result.message}`);

        console.log(`Watch list: ${formatSpotMessage(spot)} - push ${result.ok ? "sent" : "FAILED: " + result.message}`);

    }

    /* Test with the values from the form (token: saved one if empty) */
    async test(settings: NotificationSettings): Promise<PushResult> {

        if (!settings.ntfy.topic) {
            return { at: Date.now(), ok: false, message: "No ntfy topic set" };
        }

        return this.send(settings, {
            title: "SHACK-SERVER",
            message: "Test notification – watch list push works",
            tags: ["white_check_mark"]
        });

    }

    /* also used by the needed alerts */
    async send(
        settings: NotificationSettings,
        notification: { title: string; message: string; tags: string[] }
    ): Promise<PushResult> {

        const at = Date.now();

        try {

            const headers: Record<string, string> = { "Content-Type": "application/json" };

            if (settings.ntfy.token) {
                headers.Authorization = `Bearer ${settings.ntfy.token}`;
            }

            const body: Record<string, unknown> = {
                topic: settings.ntfy.topic,
                title: notification.title,
                message: notification.message,
                tags: notification.tags,
                priority: settings.ntfy.priority === "max" ? 5 : settings.ntfy.priority === "high" ? 4 : 3
            };

            if (settings.linkUrl) {
                body.click = settings.linkUrl;
            }

            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), SEND_TIMEOUT_MS);

            // JSON publishing: POST to the server root, topic in the body
            const response = await fetch(settings.ntfy.server.replace(/\/+$/, "") + "/", {
                method: "POST",
                headers,
                body: JSON.stringify(body),
                signal: controller.signal
            }).finally(() => clearTimeout(timer));

            if (!response.ok) {
                const text = (await response.text().catch(() => "")).slice(0, 200);
                let detail = text;
                try { detail = JSON.parse(text).error || text; } catch { /* plain text */ }
                throw new Error(`ntfy HTTP ${response.status}${detail ? " - " + detail : ""}`);
            }

            this.lastPush = { at, ok: true, message: "sent" };

        }
        catch (error) {

            const cause = (error as any)?.cause?.code || (error as any)?.cause?.message;

            const message = error instanceof Error
                ? (error.name === "AbortError"
                    ? "ntfy server not reachable (timeout)"
                    : error.message === "fetch failed"
                        ? `ntfy server not reachable${cause ? " (" + cause + ")" : ""}`
                        : error.message)
                : String(error);

            this.lastPush = { at, ok: false, message };

        }

        return this.lastPush;

    }

}


export const watchNotifier = new WatchNotifier();
