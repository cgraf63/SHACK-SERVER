import { settingsService } from "../settings/settings.service.js";
import type { LogbookAccount } from "../../config/settings.config.js";
import type { Uploader, UploadResult } from "./uploader.js";
import { systemLog } from "../diagnostics/system-log.service.js";


/*
 * Club Log
 *
 * Single QSOs:  https://clublog.org/realtime.php  (form POST)
 * Many QSOs:    https://clublog.org/putlogs.php   (multipart, one ADIF file)
 *
 * Fields: email, password (Club Log *application* password),
 * callsign (log to upload into), api (application key), adif / file.
 *
 * Error handling (Club Log: stop sending after a non-200 answer):
 *   403          login rejected -> no more requests for this account
 *                until the credentials are changed or "Test" succeeds
 *   400          QSO rejected   -> QSO marked failed, account paused
 *   other/network               -> account paused 5, 10, 20 ... 120 min
 * The reason is shown in the QSO log, Settings and the system log.
 * At most one request every 2 seconds.
 */

const REALTIME_URL = "https://clublog.org/realtime.php";
const PUTLOGS_URL = "https://clublog.org/putlogs.php";

const MIN_REQUEST_INTERVAL_MS = 2000;

const BACKOFF_START_MS = 5 * 60_000;
const BACKOFF_MAX_MS = 120 * 60_000;

let lastRequestAt = 0;

const blocked = new Map<string, { fingerprint: string; reason: string }>();

const backoff = new Map<string, { until: number; delay: number; reason: string }>();


function apiKey(): string {

    return settingsService.get().uploads.clublogApiKey.trim();

}


function credentialsOk(account: LogbookAccount): boolean {

    return Boolean(
        account.clublog.email &&
        account.clublog.password &&
        apiKey()
    );

}


function fingerprint(account: LogbookAccount): string {

    return [
        account.callsign,
        account.clublog.email,
        account.clublog.password,
        apiKey()
    ].join("\u0000");

}


function block(account: LogbookAccount, reason: string): void {

    blocked.set(account.id, { fingerprint: fingerprint(account), reason });

    systemLog.error(
        "UPLOAD", "UPLOAD",
        `Club Log ${account.callsign}: ${reason} - uploads stopped until the ` +
        "login is corrected (Settings → Log Uploads → Test)"
    );

}


function pause(account: LogbookAccount, reason: string): void {

    const previous = backoff.get(account.id);

    const delay = previous
        ? Math.min(BACKOFF_MAX_MS, previous.delay * 2)
        : BACKOFF_START_MS;

    backoff.set(account.id, { until: Date.now() + delay, delay, reason });

    systemLog.warn(
        "UPLOAD", "UPLOAD",
        `Club Log ${account.callsign}: ${reason} - paused for ${Math.round(delay / 60_000)} min`
    );

}


function clearErrors(account: LogbookAccount): void {

    blocked.delete(account.id);
    backoff.delete(account.id);

}


async function throttle(): Promise<void> {

    const wait = lastRequestAt + MIN_REQUEST_INTERVAL_MS - Date.now();

    if (wait > 0) {
        await new Promise(resolve => setTimeout(resolve, wait));
    }

    lastRequestAt = Date.now();

}


async function post(
    url: string,
    body: URLSearchParams | FormData
): Promise<{ status: number; text: string }> {

    await throttle();

    const response =
        await fetch(url, {
            method: "POST",
            body,
            headers: { "User-Agent": "SHACK-SERVER/1.0" },
            signal: AbortSignal.timeout(30_000)
        });

    return {
        status: response.status,
        text: (await response.text()).trim().slice(0, 300)
    };

}


function result(status: number, text: string, account: LogbookAccount): UploadResult {

    if (status === 200) {
        backoff.delete(account.id);
        return { ok: true, message: text || "OK" };
    }

    if (status === 403) {
        const reason = `Login rejected (HTTP 403): ${text || "check e-mail, app password and API key"}`;
        block(account, reason);
        return { ok: false, message: reason, permanent: true };
    }

    if (status === 400) {
        const reason = `QSO rejected (HTTP 400): ${text}`.trim();
        pause(account, reason);
        return { ok: false, message: reason, permanent: true };
    }

    const reason = `HTTP ${status} ${text}`.trim();
    pause(account, reason);
    return { ok: false, message: reason };

}


function networkError(error: unknown, account: LogbookAccount): UploadResult {

    const reason = error instanceof Error ? error.message : String(error);
    pause(account, reason);
    return { ok: false, message: reason };

}


export const clublogUploader: Uploader = {

    id: "clublog",

    label: "Club Log",

    batchMinimum: 5,

    isEnabledFor(account: LogbookAccount): boolean {

        return account.clublog.enabled && credentialsOk(account);

    },

    pausedFor(account: LogbookAccount) {

        const stop = blocked.get(account.id);

        if (stop) {

            /* Credentials changed since the 403: allowed to try again. */
            if (stop.fingerprint !== fingerprint(account)) {
                blocked.delete(account.id);
            }
            else {
                return {
                    reason: `${stop.reason} - stopped until the login is corrected`,
                    until: Date.now() + 10 * 60_000
                };
            }

        }

        const wait = backoff.get(account.id);

        if (wait && wait.until > Date.now()) {
            return {
                reason:
                    `${wait.reason} - paused until ` +
                    `${new Date(wait.until).toISOString().slice(11, 16)} UTC`,
                until: wait.until
            };
        }

        return null;

    },

    async upload(_qso, adif, options): Promise<UploadResult> {

        const account = options.account;

        try {

            const response = await post(
                REALTIME_URL,
                new URLSearchParams({
                    email: account.clublog.email,
                    password: account.clublog.password,
                    callsign: account.callsign,
                    adif,
                    api: apiKey()
                })
            );

            return result(response.status, response.text, account);

        }
        catch (error) {

            return networkError(error, account);

        }

    },

    async uploadBatch(_qsos, adif, options): Promise<UploadResult> {

        const account = options.account;

        try {

            const form = new FormData();

            form.append("email", account.clublog.email);
            form.append("password", account.clublog.password);
            form.append("callsign", account.callsign);
            form.append("api", apiKey());
            form.append(
                "file",
                new Blob(
                    [`SHACK-SERVER upload\n<ADIF_VER:5>3.1.4<EOH>\n${adif}\n`],
                    { type: "text/plain" }
                ),
                `${account.callsign.replace(/\//g, "_")}.adi`
            );

            const response = await post(PUTLOGS_URL, form);

            return result(response.status, response.text || "File accepted", account);

        }
        catch (error) {

            return networkError(error, account);

        }

    },

    /*
     * Check the login without storing anything: an empty QSO is sent.
     * Club Log answers 403 for a wrong login and 400 for the (expected)
     * invalid QSO when the login is fine. A successful test lifts a stop.
     */
    async test(account, credentials): Promise<UploadResult> {

        const email = (credentials?.email || account?.clublog.email || "").trim();
        const password = (credentials?.password || account?.clublog.password || "").trim();
        const callsign = (credentials?.callsign || account?.callsign || "").trim().toUpperCase();
        const key = (credentials?.apiKey || apiKey()).trim();

        if (!key) {
            return { ok: false, message: "Club Log API key missing (Log Uploads, top)." };
        }

        if (!email || !password || !callsign) {
            return { ok: false, message: "E-mail, app password and callsign are needed." };
        }

        try {

            const response = await post(
                REALTIME_URL,
                new URLSearchParams({
                    email,
                    password,
                    callsign,
                    adif: "<EOR>",
                    api: key
                })
            );

            if (response.status === 403) {
                return {
                    ok: false,
                    message: `Login rejected: ${response.text || "check e-mail, app password, callsign and API key"}`
                };
            }

            if (response.status === 400 || response.status === 200) {

                if (account) {
                    clearErrors(account);
                }

                return { ok: true, message: `Login OK for ${callsign}` };

            }

            return { ok: false, message: `HTTP ${response.status} ${response.text}`.trim() };

        }
        catch (error) {

            return {
                ok: false,
                message: error instanceof Error ? error.message : String(error)
            };

        }

    }

};
