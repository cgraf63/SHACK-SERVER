import type { LogbookAccount } from "../../config/settings.config.js";
import { settingsService } from "../settings/settings.service.js";
import { dxccService } from "../dxcc/dxcc.service.js";
import { systemLog } from "../diagnostics/system-log.service.js";
import { certProblem, getCredentials } from "../lotw/lotw-cert.js";
import { buildSignedLog, type StationLocation } from "../lotw/lotw-sign.js";
import type { UploadQso } from "./adif-export.js";
import type { Uploader, UploadResult } from "./uploader.js";


/*
 * ARRL Logbook of the World
 *
 * QSOs are signed here with the callsign certificate (no TQSL needed)
 * and sent as one .tq8 file per batch:
 *   POST https://lotw.arrl.org/lotw/upload  (multipart, field "upfile")
 * Answer: HTML with "<!-- .UPL. accepted -->" or "rejected".
 * LoTW processes uploads in a queue - confirmations appear later.
 *
 * Network / server errors: the account pauses 15, 30 ... 240 min.
 */

const UPLOAD_URL = "https://lotw.arrl.org/lotw/upload";

const BACKOFF_START_MS = 15 * 60_000;
const BACKOFF_MAX_MS = 240 * 60_000;

const backoff = new Map<string, { until: number; delay: number; reason: string }>();


function stationFor(account: LogbookAccount, dxccCall: string): StationLocation {

    const settings = settingsService.get();
    const entity = dxccService.resolve(dxccCall);

    return {
        callsign: account.callsign,
        dxcc: 0,
        grid: settings.locator || "",
        cqZone: account.lotw.cqZone ?? (entity?.cqZone || null),
        ituZone: account.lotw.ituZone ?? (entity?.ituZone || null)
    };

}

function failBackoff(account: LogbookAccount, reason: string): void {

    const previous = backoff.get(account.id);
    const delay = previous ? Math.min(previous.delay * 2, BACKOFF_MAX_MS) : BACKOFF_START_MS;

    backoff.set(account.id, { until: Date.now() + delay, delay, reason });

    systemLog.warn("UPLOAD", "UPLOAD", `LoTW ${account.callsign}: ${reason} - next try in ${Math.round(delay / 60_000)} min`);

}


async function send(gzip: Buffer, filename: string): Promise<{ ok: boolean; message: string; retry: boolean }> {

    const form = new FormData();

    form.append("upfile", new Blob([new Uint8Array(gzip)], { type: "application/octet-stream" }), filename);

    let response: Response;

    try {
        response = await fetch(UPLOAD_URL, {
            method: "POST",
            body: form,
            headers: { "User-Agent": "SHACK-SERVER" },
            signal: AbortSignal.timeout(90_000)
        });
    }
    catch (error) {
        return { ok: false, retry: true, message: `LoTW not reachable: ${error instanceof Error ? error.message : String(error)}` };
    }

    const html = await response.text().catch(() => "");

    if (!response.ok) {
        return { ok: false, retry: true, message: `LoTW answered HTTP ${response.status}` };
    }

    if (/<!--\s*\.UPL\.\s*accepted\s*-->/i.test(html)) {
        return { ok: true, retry: false, message: "accepted by LoTW (processing can take a while)" };
    }

    const reason =
        /<!--\s*\.UPLMESSAGE\.\s*([\s\S]*?)\s*-->/i.exec(html)?.[1] ??
        html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 200);

    return { ok: false, retry: false, message: `rejected by LoTW: ${reason || "no reason given"}` };

}


export const lotwUploader: Uploader = {

    id: "lotw",

    label: "LoTW",

    batchMinimum: 1,

    batchAll: true,

    isEnabledFor(account: LogbookAccount): boolean {

        return account.lotw?.enabled === true && getCredentials(account.id) !== null;

    },

    pausedFor(account: LogbookAccount) {

        const credentials = getCredentials(account.id);

        if (credentials) {
            const problem = certProblem(credentials.info);
            if (problem) return { reason: problem, until: Date.now() + 6 * 3600_000 };
        }

        const pause = backoff.get(account.id);

        if (pause && pause.until > Date.now()) {
            return { reason: `LoTW paused: ${pause.reason}`, until: pause.until };
        }

        return null;

    },

    async upload(qso: UploadQso, _adif: string, options): Promise<UploadResult> {

        const result = await this.uploadBatch!([qso], "", { account: options.account });

        return result.results?.[0] ?? result;

    },

    async uploadBatch(qsos: UploadQso[], _adif: string, options): Promise<UploadResult> {

        const account = options.account;
        const credentials = getCredentials(account.id);

        if (!credentials) {
            return { ok: false, message: "LoTW: no certificate (Settings → Log Uploads)", permanent: true };
        }

        const problem = certProblem(credentials.info);

        if (problem) {
            return { ok: false, message: problem };
        }

        let signed;

        try {
            signed = buildSignedLog(credentials, { ...stationFor(account, credentials.info.callsign), dxcc: credentials.info.dxcc }, qsos);
        }
        catch (error) {
            return { ok: false, message: `LoTW signing failed: ${error instanceof Error ? error.message : String(error)}`, permanent: true };
        }

        const results: UploadResult[] = qsos.map((_, index) => {
            const reason = signed.skipped.get(index);
            return reason ? { ok: false, message: reason, permanent: true } : { ok: false, message: "" };
        });

        if (!signed.included.length) {
            return { ok: false, message: "LoTW: no QSO could be signed", permanent: true, results };
        }

        const stamp = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);
        const filename = `${credentials.info.callsign.replace(/[^A-Z0-9]+/gi, "-").toLowerCase()}-${stamp}-shack-server.tq8`;

        const answer = await send(signed.gzip, filename);

        if (answer.ok) {
            backoff.delete(account.id);
        }
        else if (answer.retry) {
            failBackoff(account, answer.message);
        }

        for (const index of signed.included) {
            results[index] = { ok: answer.ok, message: answer.message, permanent: !answer.ok && !answer.retry };
        }

        systemLog[answer.ok ? "info" : "warn"](
            "UPLOAD", "UPLOAD",
            `LoTW ${credentials.info.callsign}: ${signed.included.length} QSO(s) ${answer.message}` +
            (signed.skipped.size ? `, ${signed.skipped.size} skipped` : "")
        );

        return {
            ok: answer.ok && signed.skipped.size === 0,
            message: answer.message,
            permanent: !answer.ok && !answer.retry,
            results
        };

    },

    /* certificate ready + LoTW website login (when given) */
    async test(account: LogbookAccount | null, credentials?: Record<string, string>): Promise<UploadResult> {

        const parts: string[] = [];
        let ok = true;

        const cert = account ? getCredentials(account.id) : null;

        if (!cert) {
            ok = false;
            parts.push("no certificate uploaded");
        }
        else {
            const problem = certProblem(cert.info);
            if (problem) {
                ok = false;
                parts.push(problem);
            }
            else {
                parts.push(`certificate ${cert.info.callsign} OK (DXCC ${cert.info.dxcc}, until ${cert.info.validTo.slice(0, 10)})`);
            }
        }

        const username = credentials?.username || account?.lotw.username || "";
        const password = credentials?.password || account?.lotw.password || "";

        if (username && password) {
            const { lotwLoginCheck } = await import("../lotw/lotw-download.service.js");
            const login = await lotwLoginCheck(username, password);
            if (!login.ok) ok = false;
            parts.push(login.message);
        }
        else {
            parts.push("no LoTW login (needed for confirmations)");
        }

        return { ok, message: parts.join(" · ") };

    }

};
