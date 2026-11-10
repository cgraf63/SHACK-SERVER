import fs from "node:fs";
import path from "node:path";

import type { LogbookAccount } from "../../config/settings.config.js";
import { settingsService } from "../settings/settings.service.js";
import { qsoService } from "../qso/qso-instance.js";
import { systemLog } from "../diagnostics/system-log.service.js";
import { modeGroup } from "../needed/worked-index.js";
import { lotwMode } from "./lotw-sign.js";


/*
 * LoTW confirmations
 *
 *   GET https://lotw.arrl.org/lotwuser/lotwreport.adi
 *       ?login=&password=&qso_query=1&qso_qsl=yes&qso_qsldetail=yes
 *       &qso_qslsince=YYYY-MM-DD
 *
 * Answer: ADIF ("ARRL Logbook of the World Status Report"), one record
 * per confirmed QSO. The header field APP_LoTW_LASTQSL is the start for
 * the next query, so later runs only fetch new confirmations.
 *
 * Matching: callsign, band, mode group (CW / phone / FT8 / FT4 / data)
 * and QSO time within 30 minutes. Matched QSOs get lotw_qsl_rcvd = 'Y'
 * (the DXCC table counts them as confirmed).
 *
 * Runs every 6 hours for accounts with a LoTW login, and on demand.
 */

const REPORT_URL = "https://lotw.arrl.org/lotwuser/lotwreport.adi";
const STATE_FILE = path.join(process.cwd(), "data", "lotw-state.json");

const INTERVAL_MS = 6 * 3600_000;
const FIRST_RUN_MS = 3 * 60_000;
const MATCH_WINDOW_MS = 30 * 60_000;


export interface LotwAccountState {
    since: string;              // qso_qslsince for the next run
    lastRun: number;
    ok: boolean;
    message: string;
    matched: number;            // confirmations matched in the last run
    unmatched: number;
    running?: boolean;
}

type StateFile = Record<string, LotwAccountState>;


function readState(): StateFile {

    try {
        return JSON.parse(fs.readFileSync(STATE_FILE, "utf8")) as StateFile;
    }
    catch {
        return {};
    }

}

function writeState(state: StateFile): void {

    try {
        fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
        fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
    }
    catch (error) {
        console.error("LoTW state:", (error as Error).message);
    }

}


/* ------------------------------------------------------------------
 * ADIF
 * ------------------------------------------------------------------ */

export function parseAdif(text: string): { header: Record<string, string>; records: Array<Record<string, string>> } {

    const header: Record<string, string> = {};
    const records: Array<Record<string, string>> = [];

    let current: Record<string, string> = {};
    // everything before <eoh> is header (LoTW: report title + APP_LoTW_ fields)
    let inHeader = /<eoh>/i.test(text);

    const re = /<([A-Za-z0-9_]+)(?::(\d+)(?::[A-Za-z])?)?>/g;
    let match: RegExpExecArray | null;

    while ((match = re.exec(text))) {

        const name = (match[1] ?? "").toUpperCase();

        if (name === "EOH") {
            inHeader = false;
            current = {};
            continue;
        }

        if (name === "EOR") {
            if (Object.keys(current).length) records.push(current);
            current = {};
            continue;
        }

        const length = Number(match[2] ?? 0);
        const value = text.substr(re.lastIndex, length);

        re.lastIndex += length;

        if (inHeader) header[name] = value.trim();
        else current[name] = value.trim();

    }

    return { header, records };

}


/* ------------------------------------------------------------------
 * LoTW requests
 * ------------------------------------------------------------------ */

async function report(username: string, password: string, since: string): Promise<string> {

    const url = new URL(REPORT_URL);

    url.searchParams.set("login", username);
    url.searchParams.set("password", password);
    url.searchParams.set("qso_query", "1");
    url.searchParams.set("qso_qsl", "yes");
    url.searchParams.set("qso_qsldetail", "yes");
    url.searchParams.set("qso_qslsince", since);

    const response = await fetch(url, {
        headers: { "User-Agent": "SHACK-SERVER" },
        signal: AbortSignal.timeout(180_000)
    });

    const text = await response.text();

    if (!response.ok) {
        throw new Error(`LoTW answered HTTP ${response.status}`);
    }

    const head = text.slice(0, 6000);

    if (/Username\/password incorrect/i.test(head)) {
        throw Object.assign(new Error("LoTW login: username / password incorrect"), { login: true });
    }

    if (/Page Request Limit/i.test(head)) {
        throw new Error("LoTW request limit reached - try again later");
    }

    if (!/ARRL Logbook of the World Status Report/i.test(head)) {
        throw new Error("Unexpected answer from LoTW");
    }

    return text;

}

/* login test: confirmations since today (small answer) */
export async function lotwLoginCheck(username: string, password: string): Promise<{ ok: boolean; message: string }> {

    try {
        await report(username, password, new Date().toISOString().slice(0, 10));
        return { ok: true, message: "LoTW login OK" };
    }
    catch (error) {
        return { ok: false, message: error instanceof Error ? error.message : String(error) };
    }

}


/* ------------------------------------------------------------------
 * Matching
 * ------------------------------------------------------------------ */

function toTime(date: string, time: string): number {

    const d = String(date || "").replace(/\D/g, "");
    const t = String(time || "").replace(/\D/g, "").padEnd(6, "0");

    if (d.length < 8) return NaN;

    return Date.UTC(Number(d.slice(0, 4)), Number(d.slice(4, 6)) - 1, Number(d.slice(6, 8)),
        Number(t.slice(0, 2)), Number(t.slice(2, 4)), Number(t.slice(4, 6)));

}

function groupOf(mode: string): string {

    return modeGroup(lotwMode(mode));

}

/* returns true when a QSO in the log was found */
export function applyConfirmation(record: Record<string, string>): boolean {

    const call = String(record.CALL || "").toUpperCase();
    const band = String(record.BAND || "").toUpperCase();
    const when = toTime(record.QSO_DATE ?? "", record.TIME_ON ?? "");
    const group = groupOf(record.MODE ?? "");

    if (!call || !Number.isFinite(when)) return false;

    let best: { id: number; diff: number; done: boolean } | null = null;

    for (const qso of qsoService.findByCall(call)) {

        if (String(qso.band || "").toUpperCase() !== band) continue;
        if (groupOf(qso.mode) !== group) continue;

        const diff = Math.abs(toTime(qso.qso_date, qso.time_on_utc) - when);

        if (!(diff <= MATCH_WINDOW_MS)) continue;

        if (!best || diff < best.diff) best = { id: qso.id, diff, done: qso.lotw_qsl_rcvd === "Y" };

    }

    if (!best) return false;

    if (!best.done) {
        const d = String(record.QSLRDATE || "").replace(/\D/g, "");
        qsoService.setLotwConfirmed(best.id, d.length >= 8 ? `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}` : "");
    }

    return true;

}


/* ------------------------------------------------------------------
 * Service
 * ------------------------------------------------------------------ */

class LotwDownloadService {

    private timer: NodeJS.Timeout | null = null;
    private running = new Set<string>();

    start(): void {

        if (this.timer) return;

        setTimeout(() => void this.runAll(), FIRST_RUN_MS);
        this.timer = setInterval(() => void this.runAll(), INTERVAL_MS);

    }

    getState(): StateFile {

        const state = readState();

        for (const id of this.running) {
            state[id] = { ...(state[id] ?? { since: "", lastRun: 0, ok: false, message: "", matched: 0, unmatched: 0 }), running: true };
        }

        return state;

    }

    private accounts(): LogbookAccount[] {

        return settingsService.get().uploads.accounts.filter(a => a.lotw?.username && a.lotw?.password);

    }

    async runAll(): Promise<void> {

        for (const account of this.accounts()) {
            await this.run(account.id).catch(() => undefined);
        }

    }

    /* fetch new confirmations of one account; full = from the beginning */
    async run(accountId: string, full = false): Promise<LotwAccountState> {

        const account = settingsService.get().uploads.accounts.find(a => a.id === accountId);

        if (!account || !account.lotw.username || !account.lotw.password) {
            throw new Error("No LoTW login for this account");
        }

        if (this.running.has(accountId)) {
            throw new Error("Already running");
        }

        this.running.add(accountId);

        const state = readState();
        const previous = state[accountId];
        const since = !full && previous?.since ? previous.since : "1945-01-01";

        let result: LotwAccountState;

        try {

            const text = await report(account.lotw.username, account.lotw.password, since);
            const { header, records } = parseAdif(text);

            let matched = 0;
            let unmatched = 0;

            for (const record of records) {
                if (applyConfirmation(record)) matched++;
                else unmatched++;
            }

            // next start: last confirmation date LoTW reported (date part)
            const last = String(header.APP_LOTW_LASTQSL || "").slice(0, 10);

            result = {
                since: /^\d{4}-\d{2}-\d{2}$/.test(last) ? last : since,
                lastRun: Date.now(),
                ok: true,
                message: records.length
                    ? `${records.length} confirmation(s), ${matched} matched in the log${unmatched ? `, ${unmatched} not found` : ""}`
                    : "no new confirmations",
                matched,
                unmatched
            };

            if (records.length) {
                systemLog.info("UPLOAD", "LOTW", `LoTW ${account.callsign}: ${result.message}`);
            }

        }
        catch (error) {

            result = {
                since: previous?.since ?? "",
                lastRun: Date.now(),
                ok: false,
                message: error instanceof Error ? error.message : String(error),
                matched: 0,
                unmatched: 0
            };

            systemLog.warn("UPLOAD", "LOTW", `LoTW ${account.callsign}: ${result.message}`);

        }
        finally {

            this.running.delete(accountId);

        }

        const latest = readState();
        latest[accountId] = result;
        writeState(latest);

        return result;

    }

}


export const lotwDownload = new LotwDownloadService();
