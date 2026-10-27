import { settingsService } from "../settings/settings.service.js";
import type { LogbookAccount } from "../../config/settings.config.js";
import type { Uploader, UploadResult } from "./uploader.js";


/*
 * Club Log
 *
 * Single QSOs:  https://clublog.org/realtime.php  (form POST)
 * Many QSOs:    https://clublog.org/putlogs.php   (multipart, one ADIF file)
 *
 * Fields: email, password (Club Log *application* password),
 * callsign (log to upload into), api (application key), adif / file.
 *
 * Club Log asks programs to stop sending after a rejected login
 * (HTTP 403) - the account is paused for one hour then.
 */

const REALTIME_URL = "https://clublog.org/realtime.php";
const PUTLOGS_URL = "https://clublog.org/putlogs.php";

const PAUSE_AFTER_403_MS = 60 * 60_000;

const pausedUntil = new Map<string, number>();


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


async function post(
    url: string,
    body: URLSearchParams | FormData
): Promise<{ status: number; text: string }> {

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
        return { ok: true, message: text || "OK" };
    }

    if (status === 403) {

        pausedUntil.set(account.id, Date.now() + PAUSE_AFTER_403_MS);

        return {
            ok: false,
            message: `Login rejected: ${text || "check e-mail, app password and API key"}`,
            permanent: true
        };

    }

    if (status === 400) {
        return { ok: false, message: `Rejected: ${text}`, permanent: true };
    }

    return { ok: false, message: `HTTP ${status} ${text}`.trim() };

}


function paused(account: LogbookAccount): UploadResult | null {

    const until = pausedUntil.get(account.id) ?? 0;

    if (until > Date.now()) {
        return {
            ok: false,
            message: "Paused after rejected login - check Settings → Log Uploads"
        };
    }

    return null;

}


export const clublogUploader: Uploader = {

    id: "clublog",

    label: "Club Log",

    batchMinimum: 5,

    isEnabledFor(account: LogbookAccount): boolean {

        return account.clublog.enabled && credentialsOk(account);

    },

    async upload(_qso, adif, options): Promise<UploadResult> {

        const account = options.account;
        const pause = paused(account);

        if (pause) {
            return pause;
        }

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

            return {
                ok: false,
                message: error instanceof Error ? error.message : String(error)
            };

        }

    },

    async uploadBatch(_qsos, adif, options): Promise<UploadResult> {

        const account = options.account;
        const pause = paused(account);

        if (pause) {
            return pause;
        }

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

            return {
                ok: false,
                message: error instanceof Error ? error.message : String(error)
            };

        }

    },

    /*
     * Check the login without storing anything: an empty QSO is sent.
     * Club Log answers 403 for a wrong login and 400 for the (expected)
     * invalid QSO when the login is fine.
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
                    pausedUntil.delete(account.id);
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
