import { randomUUID } from "node:crypto";

import type {
    LogbookAccount,
    UploadSettings
} from "../../config/settings.config.js";


/*
 * Logbook accounts per callsign: normalisation, migration, merging
 * a save from the browser (secrets are never sent to the browser),
 * and finding the account for a station callsign.
 *
 * No imports of settingsService here (used by the settings service).
 */


export function normalizeCallsign(value: unknown): string {

    return String(value ?? "").trim().toUpperCase().replace(/\s+/g, "");

}


function normalizeAliases(value: unknown): string[] {

    const list = Array.isArray(value)
        ? value
        : String(value ?? "").split(/[,;\s]+/);

    return [...new Set(list.map(normalizeCallsign).filter(Boolean))];

}


function text(value: unknown): string {

    return String(value ?? "").trim();

}


function normalizeAccount(raw: any): LogbookAccount | null {

    const callsign = normalizeCallsign(raw?.callsign);

    if (!callsign) {
        return null;
    }

    return {
        id:
            typeof raw?.id === "string" && raw.id
                ? raw.id
                : raw?.migrated
                    ? `acc-${callsign}`
                    : randomUUID(),
        callsign,
        aliases: normalizeAliases(raw?.aliases),
        qrz: {
            enabled: raw?.qrz?.enabled === true,
            apiKey: text(raw?.qrz?.apiKey)
        },
        clublog: {
            enabled: raw?.clublog?.enabled === true,
            email: text(raw?.clublog?.email),
            password: text(raw?.clublog?.password)
        }
    };

}


/*
 * Settings file -> UploadSettings.
 * Older formats:
 *   - uploads.qrz {enabled, apiKey} (one QRZ key, own callsign)
 *   - nothing, QRZ_API_KEY in .env (always uploaded before)
 */
export function loadUploadSettings(
    parsed: any,
    stationCallsign: string
): UploadSettings {

    const uploads = parsed?.uploads;
    const clublogApiKey = text(uploads?.clublogApiKey);

    if (Array.isArray(uploads?.accounts)) {
        return {
            accounts: uploads.accounts
                .map((account: any) => normalizeAccount(account))
                .filter(Boolean) as LogbookAccount[],
            clublogApiKey
        };
    }

    const callsign = normalizeCallsign(stationCallsign);

    if (!callsign) {
        return { accounts: [], clublogApiKey };
    }

    if (uploads?.qrz) {
        const account = normalizeAccount({
            migrated: true,
            callsign,
            qrz: {
                enabled: uploads.qrz.enabled === true,
                apiKey: uploads.qrz.apiKey
            }
        });
        return { accounts: account ? [account] : [], clublogApiKey };
    }

    if (process.env.QRZ_API_KEY) {
        const account = normalizeAccount({
            migrated: true,
            callsign,
            qrz: { enabled: true, apiKey: "" }   // key stays in .env
        });
        return { accounts: account ? [account] : [], clublogApiKey };
    }

    return { accounts: [], clublogApiKey };

}


/*
 * Typed secret, or the saved one of the same account.
 * clear = true removes it.
 */
function secret(typed: unknown, previous: string | undefined, clear: unknown): string {

    if (clear === true) {
        return "";
    }

    return text(typed) || previous || "";

}


/*
 * Save from the browser. Secrets: empty = keep the saved value of the
 * same account (id). Accounts missing in the patch are deleted.
 */
export function mergeUploadSettings(
    base: UploadSettings,
    patch: any
): UploadSettings {

    const clublogApiKey =
        patch?.clearClublogApiKey === true
            ? ""
            : text(patch?.clublogApiKey) || base.clublogApiKey || "";

    if (!Array.isArray(patch?.accounts)) {
        return {
            accounts: base.accounts.map(account => ({
                ...account,
                aliases: [...account.aliases],
                qrz: { ...account.qrz },
                clublog: { ...account.clublog }
            })),
            clublogApiKey
        };
    }

    const accounts: LogbookAccount[] = [];

    for (const raw of patch.accounts) {

        const previous = base.accounts.find(account => account.id === raw?.id);

        const account = normalizeAccount({
            ...raw,
            qrz: {
                enabled: raw?.qrz?.enabled === true,
                apiKey: secret(raw?.qrz?.apiKey, previous?.qrz.apiKey, raw?.qrz?.clearApiKey)
            },
            clublog: {
                enabled: raw?.clublog?.enabled === true,
                email: text(raw?.clublog?.email),
                password: secret(
                    raw?.clublog?.password,
                    previous?.clublog.password,
                    raw?.clublog?.clearPassword
                )
            }
        });

        if (account && !accounts.some(a => a.callsign === account.callsign)) {
            accounts.push(account);
        }

    }

    return { accounts, clublogApiKey };

}


/*
 * Settings for the browser: secrets removed, "is set" flags only.
 * The .env key (QRZ_API_KEY) counts for the station's own callsign.
 */
export function publicUploadSettings(
    uploads: UploadSettings,
    stationCallsign: string
): unknown {

    const own = normalizeCallsign(stationCallsign);

    return {
        clublogApiKey: "",
        clublogApiKeySet: Boolean(uploads.clublogApiKey),
        accounts: uploads.accounts.map(account => {

            const envKey =
                !account.qrz.apiKey &&
                account.callsign === own &&
                Boolean(process.env.QRZ_API_KEY);

            return {
                id: account.id,
                callsign: account.callsign,
                aliases: account.aliases,
                qrz: {
                    enabled: account.qrz.enabled,
                    apiKey: "",
                    apiKeySet: Boolean(account.qrz.apiKey) || envKey,
                    apiKeyFromEnv: envKey
                },
                clublog: {
                    enabled: account.clublog.enabled,
                    email: account.clublog.email,
                    password: "",
                    passwordSet: Boolean(account.clublog.password)
                }
            };

        })
    };

}


/*
 * Portable / operating suffixes that belong to the same logbook.
 */
const SAME_LOGBOOK_SUFFIXES = new Set([
    "P", "M", "MM", "AM", "QRP", "A", "LH", "R"
]);


/*
 * Account for a station callsign:
 *   1. exact callsign or alias
 *   2. callsign + portable suffix (HB9ISO/P, HB9ISO/M, HB9ISO/QRP, HB9ISO/3)
 * Prefixed calls (A61/HB9ISO) need their own account or an alias,
 * they are another DXCC entity (own LoTW certificate).
 */
export function findAccount(
    accounts: LogbookAccount[],
    stationCallsign: string
): LogbookAccount | null {

    const call = normalizeCallsign(stationCallsign);

    if (!call) {
        return null;
    }

    const exact = accounts.find(account =>
        account.callsign === call || account.aliases.includes(call)
    );

    if (exact) {
        return exact;
    }

    const slash = call.indexOf("/");

    if (slash > 0) {

        const base = call.slice(0, slash);
        const suffix = call.slice(slash + 1);

        if (SAME_LOGBOOK_SUFFIXES.has(suffix) || /^\d$/.test(suffix)) {
            return accounts.find(account => account.callsign === base) ?? null;
        }

    }

    return null;

}
