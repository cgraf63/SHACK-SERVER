import { shackSettings, type NotificationSettings } from "../../config/settings.config.js";


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
        }
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
