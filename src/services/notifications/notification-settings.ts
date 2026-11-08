import { shackSettings, type NotificationSettings, type NeededAlertSettings } from "../../config/settings.config.js";


function text(value: unknown, max = 300): string {

    return typeof value === "string" ? value.trim().slice(0, max) : "";

}

function hhmm(value: unknown, fallback: string): string {

    const match = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(text(value));

    return match ? `${(match[1] ?? "").padStart(2, "0")}:${match[2]}` : fallback;

}

function httpUrl(value: unknown): string {

    const url = text(value, 500).replace(/\/+$/, "");

    try {
        const parsed = new URL(url);
        return parsed.protocol === "http:" || parsed.protocol === "https:" ? url : "";
    }
    catch {
        return "";
    }

}


function clamp(value: unknown, min: number, max: number, fallback: number): number {

    const n = Math.round(Number(value));

    return Number.isFinite(n) && n >= min && n <= max ? n : fallback;

}

const BANDS = ["160m", "80m", "60m", "40m", "30m", "20m", "17m", "15m", "12m", "10m", "6m", "4m", "2m", "70cm"];
const MODES = ["CW", "PHONE", "FT8", "FT4", "DIGI"];

function normalizeNeeded(raw: any, base: NeededAlertSettings): NeededAlertSettings {

    if (!raw || typeof raw !== "object") return { ...base };

    const flag = (value: unknown, fallback: boolean) => typeof value === "boolean" ? value : fallback;

    return {
        enabled: flag(raw.enabled, base.enabled),
        newCountry: flag(raw.newCountry, base.newCountry),
        newBandCountry: flag(raw.newBandCountry, base.newBandCountry),
        newBand: flag(raw.newBand, base.newBand),
        newMode: flag(raw.newMode, base.newMode),
        bands: Array.isArray(raw.bands)
            ? BANDS.filter(band => raw.bands.map((b: unknown) => String(b).toLowerCase()).includes(band.toLowerCase()))
            : base.bands,
        modes: Array.isArray(raw.modes)
            ? MODES.filter(mode => raw.modes.map((m: unknown) => String(m).toUpperCase()).includes(mode))
            : base.modes,
        minScore: clamp(raw.minScore, 0, 1000, base.minScore),
        onlyNearby: flag(raw.onlyNearby, base.onlyNearby),
        cooldownMinutes: clamp(raw.cooldownMinutes, 1, 1440, base.cooldownMinutes)
    };

}


/* Empty token = keep the saved one, clearToken = true removes it */
export function normalizeNotifications(raw: any, previous?: NotificationSettings): NotificationSettings {

    const base = previous ?? shackSettings.notifications;

    const cooldown = Math.round(Number(raw?.cooldownMinutes));
    const priority = raw?.ntfy?.priority;

    const token =
        raw?.ntfy?.clearToken === true
            ? ""
            : text(raw?.ntfy?.token, 200) || base.ntfy.token || "";

    return {
        enabled: raw?.enabled === true,
        cooldownMinutes: Number.isFinite(cooldown) && cooldown >= 1 && cooldown <= 1440 ? cooldown : base.cooldownMinutes,
        quietHours: {
            enabled: raw?.quietHours?.enabled === true,
            from: hhmm(raw?.quietHours?.from, base.quietHours.from),
            to: hhmm(raw?.quietHours?.to, base.quietHours.to)
        },
        linkUrl: raw?.linkUrl === "" ? "" : (httpUrl(raw?.linkUrl) || (raw?.linkUrl === undefined ? base.linkUrl : "")),
        ntfy: {
            enabled: raw?.ntfy?.enabled !== false,
            server: httpUrl(raw?.ntfy?.server) || "https://ntfy.sh",
            // ntfy topics: letters, digits, _ and -
            topic: text(raw?.ntfy?.topic, 64).replace(/[^A-Za-z0-9_-]/g, ""),
            token,
            priority: priority === "default" || priority === "max" ? priority : "high"
        },
        nearbyRadiusKm: clamp(raw?.nearbyRadiusKm, 50, 20000, base.nearbyRadiusKm ?? 1000),
        pskReporter: typeof raw?.pskReporter === "boolean" ? raw.pskReporter : (base.pskReporter ?? false),
        needed: normalizeNeeded(raw?.needed, base.needed ?? shackSettings.notifications.needed)
    };

}


export function publicNotifications(settings: NotificationSettings): unknown {

    return {
        ...settings,
        ntfy: {
            ...settings.ntfy,
            token: "",
            tokenSet: Boolean(settings.ntfy.token)
        }
    };

}
