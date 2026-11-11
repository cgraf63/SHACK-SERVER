import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

import { dxccService } from "../dxcc/dxcc.service.js";
import { entityFlag } from "../dxcc/dxcc-table.js";
import { fusionEngine } from "../fusion/fusion-instance.js";
import { qsoService } from "../qso/qso-instance.js";
import { radioManager } from "../radio/radio-manager.js";
import { watchlistService } from "../watchlist/watchlist.service.js";


/*
 * Call check - suggestions while typing a callsign (Manual QSO).
 *
 * Sources, best first:
 *   on air   spots of the last 30 minutes (cluster, RBN, PSK ...) - above
 *            all the ones near the transceiver frequency: "I heard SQ2..
 *            here" -> the station spotted on this frequency
 *   log      callsigns worked before
 *   watch    the watch list
 *   SCP      Super Check Partial database: ~180,000 active callsigns
 *            from Club Log (weekly, data/scp.txt), fallback MASTER.SCP
 *
 * Matching:
 *   partial  the typed text anywhere in the call ("Q2A" -> SQ2ABC),
 *            "?" = one unknown character ("SQ2?BC")
 *   n+1      calls with ONE character different / missing / extra -
 *            for a callsign that was misheard (CW / SSB look-alikes
 *            such as S/H/5, B/D/6, M/N score higher)
 *   empty    only the stations spotted near the transceiver frequency
 */

const DATA_DIR = path.resolve(process.cwd(), "data");
const SCP_FILE = path.join(DATA_DIR, "scp.txt");

const SCP_SOURCES = [
    { url: "https://cdn.clublog.org/clublog.scp.gz", gzip: true },
    { url: "https://www.supercheckpartial.com/MASTER.SCP", gzip: false }
];

const SCP_MAX_AGE_MS = 7 * 24 * 3600_000;
const SPOT_MAX_AGE_MS = 30 * 60_000;
const LOG_CACHE_MS = 60_000;
const NEAR_KHZ = 3;

export interface CallCheckMatch {
    call: string;
    kind: "exact" | "partial" | "n1";
    score: number;
    entity: string;
    flag: string;
    onAir: null | {
        frequency: number;
        band: string;
        mode: string;
        ageSeconds: number;
        sources: string[];
        offsetKhz: number | null;
    };
    log: null | { count: number; last: string };
    watch: boolean;
    scp: boolean;
}

export interface CallCheckResult {
    query: string;
    entity: null | {
        key: string;
        name: string;
        continent: string;
        cqZone: number;
        ituZone: number;
        flag: string;
    };
    radio: null | { frequency: number; band: string };
    matches: CallCheckMatch[];
    scp: { calls: number; updated: string | null };
}


/* ------------------------------------------------------------------ */
/* look-alike characters (CW: similar patterns, SSB: similar sounds)  */
/* ------------------------------------------------------------------ */

const LOOK_ALIKE_GROUPS = [
    // CW
    "EISH5", "TMO0", "AWJ1", "NDB6", "UV4", "KCY", "GZ7", "RLF", "23", "89",
    // SSB (letters that rhyme / sound alike)
    "BCDEGPTVZ3", "MN", "FSX", "AJK8", "IY5", "QU"
];

const lookAlike = new Map<string, Set<string>>();

for (const group of LOOK_ALIKE_GROUPS) {
    for (const char of group) {
        const set = lookAlike.get(char) ?? new Set<string>();
        for (const other of group) if (other !== char) set.add(other);
        lookAlike.set(char, set);
    }
}

function similar(a: string, b: string): boolean {
    return lookAlike.get(a)?.has(b) ?? false;
}


/*
 * One edit apart (substitution, insertion or deletion)?
 * Returns null if not, otherwise whether the edit is a look-alike.
 */
function oneEdit(query: string, call: string): null | { lookAlike: boolean } {

    const lq = query.length;
    const lc = call.length;

    if (Math.abs(lq - lc) > 1 || query === call) return null;

    if (lq === lc) {
        let diff = -1;
        for (let i = 0; i < lq; i++) {
            if (query[i] !== call[i] && query[i] !== "?") {
                if (diff >= 0) return null;
                diff = i;
            }
        }
        if (diff < 0) return null;
        return { lookAlike: similar(query[diff]!, call[diff]!) };
    }

    // one character more or less
    const [longer, shorter] = lq > lc ? [query, call] : [call, query];
    let i = 0;
    let j = 0;
    let skipped = false;

    while (i < longer.length && j < shorter.length) {
        if (longer[i] === shorter[j] || shorter[j] === "?" || longer[i] === "?") {
            i++;
            j++;
        }
        else {
            if (skipped) return null;
            skipped = true;
            i++;
        }
    }

    // edits = skipped character + characters left over at the end
    if ((skipped ? 1 : 0) + (longer.length - i) !== 1) return null;

    return { lookAlike: false };

}


/* "Q2?" -> matcher for "anywhere in the call" */
function partialMatcher(query: string): (call: string) => number {

    if (!query.includes("?")) {
        return call => call.indexOf(query);
    }

    const pattern = new RegExp(query.replace(/[^A-Z0-9/?]/g, "").replace(/\?/g, "[A-Z0-9/]"));

    return call => {
        const match = pattern.exec(call);
        return match ? match.index : -1;
    };

}


/* ------------------------------------------------------------------ */

class CallCheckService {

    private scpCalls: string[] = [];
    private scpSet = new Set<string>();
    private scpUpdated: string | null = null;
    private scpLoading = false;

    private logCache: { at: number; calls: Map<string, { count: number; last: string }> } | null = null;


    start(): void {

        this.loadScpFile();

        void this.refreshScp();

        setInterval(() => void this.refreshScp(), 24 * 3600_000).unref();

    }


    private loadScpFile(): void {

        try {

            if (!fs.existsSync(SCP_FILE)) return;

            const calls = parseScp(fs.readFileSync(SCP_FILE, "utf8"));

            if (calls.length) {
                this.scpCalls = calls;
                this.scpSet = new Set(calls);
                this.scpUpdated = fs.statSync(SCP_FILE).mtime.toISOString();
            }

        }
        catch (error) {
            console.warn("Call check: SCP file not readable:", error instanceof Error ? error.message : error);
        }

    }


    /* download the SCP database when it is older than 7 days */
    async refreshScp(force = false): Promise<void> {

        if (this.scpLoading) return;

        try {
            const age = fs.existsSync(SCP_FILE) ? Date.now() - fs.statSync(SCP_FILE).mtimeMs : Infinity;
            if (!force && age < SCP_MAX_AGE_MS && this.scpCalls.length) return;
        }
        catch { /* download */ }

        this.scpLoading = true;

        try {

            for (const source of SCP_SOURCES) {

                try {

                    const response = await fetch(source.url, {
                        headers: { "User-Agent": "SHACK-SERVER" },
                        signal: AbortSignal.timeout(60_000)
                    });

                    if (!response.ok) throw new Error(`HTTP ${response.status}`);

                    const raw = Buffer.from(await response.arrayBuffer());
                    const text = (source.gzip || (raw[0] === 0x1f && raw[1] === 0x8b) ? zlib.gunzipSync(raw) : raw).toString("utf8");
                    const calls = parseScp(text);

                    if (calls.length < 1000) throw new Error(`only ${calls.length} callsigns`);

                    fs.mkdirSync(DATA_DIR, { recursive: true });
                    fs.writeFileSync(`${SCP_FILE}.tmp`, calls.join("\n") + "\n");
                    fs.renameSync(`${SCP_FILE}.tmp`, SCP_FILE);

                    this.scpCalls = calls;
                    this.scpSet = new Set(calls);
                    this.scpUpdated = new Date().toISOString();

                    console.log(`Call check: ${calls.length} SCP callsigns from ${source.url}`);

                    return;

                }
                catch (error) {
                    console.warn(`Call check: SCP download ${source.url} failed:`, error instanceof Error ? error.message : error);
                }

            }

        }
        finally {
            this.scpLoading = false;
        }

    }


    private logCalls(): Map<string, { count: number; last: string }> {

        if (this.logCache && Date.now() - this.logCache.at < LOG_CACHE_MS) {
            return this.logCache.calls;
        }

        const calls = new Map<string, { count: number; last: string }>();

        try {
            for (const row of qsoService.getCallSummary()) {
                if (row.call) calls.set(row.call, { count: Number(row.n) || 0, last: String(row.last || "") });
            }
        }
        catch (error) {
            console.warn("Call check: log not readable:", error instanceof Error ? error.message : error);
        }

        this.logCache = { at: Date.now(), calls };

        return calls;

    }


    private radioKhz(manualKhz: number | null): number | null {

        try {
            const hz = Number(radioManager.getActiveRadio()?.getFrequency());
            if (Number.isFinite(hz) && hz > 100_000) return hz / 1000;
        }
        catch { /* no transceiver */ }

        return manualKhz && manualKhz > 100 ? manualKhz : null;

    }


    check(rawQuery: string, manualKhz: number | null = null, limit = 15): CallCheckResult {

        const query = String(rawQuery || "").toUpperCase().replace(/[^A-Z0-9/?]/g, "").slice(0, 20);
        const radio = this.radioKhz(manualKhz);
        const now = Date.now();

        /* on air: newest spot per callsign */
        const onAir = new Map<string, NonNullable<CallCheckMatch["onAir"]>>();

        for (const spot of fusionEngine.getSpots()) {

            const age = now - spot.lastSeen;
            if (age > SPOT_MAX_AGE_MS) continue;

            const call = String(spot.call || "").toUpperCase();
            if (!call) continue;

            const offset = radio !== null ? spot.frequency - radio : null;
            const entry = {
                frequency: spot.frequency,
                band: spot.band,
                mode: spot.mode,
                ageSeconds: Math.round(age / 1000),
                sources: spot.sources,
                offsetKhz: offset === null ? null : Math.round(offset * 10) / 10
            };

            const previous = onAir.get(call);

            // the spot nearest to the transceiver, else the newest
            const better = !previous ||
                (offset !== null && previous.offsetKhz !== null
                    ? Math.abs(offset) < Math.abs(previous.offsetKhz)
                    : entry.ageSeconds < previous.ageSeconds);

            if (better) onAir.set(call, entry);

        }

        const log = this.logCalls();
        const watch = new Set(watchlistService.getAll().map(entry => entry.callsign.toUpperCase()));

        const candidates = new Map<string, { kind: CallCheckMatch["kind"]; base: number; lookAlike: boolean }>();

        const consider = (call: string, kind: CallCheckMatch["kind"], base: number, lookAlike = false) => {
            const previous = candidates.get(call);
            if (!previous || previous.base < base) candidates.set(call, { kind, base, lookAlike });
        };

        const radioBand = radio !== null ? bandOf(radio) : "";

        if (!query) {

            /* nothing typed: who is on the air right here? */
            if (radio !== null) {
                for (const [call, spot] of onAir) {
                    if (spot.offsetKhz !== null && Math.abs(spot.offsetKhz) <= NEAR_KHZ * 2) consider(call, "partial", 0);
                }
            }

        }
        else {

            const findIn = partialMatcher(query);
            const fuzzy = query.length >= 4;

            const test = (call: string, allowPartial: boolean, fuzzyInside: boolean) => {

                if (call === query) return consider(call, "exact", 1000);

                if (allowPartial) {
                    const index = findIn(call);
                    if (index === 0) return consider(call, "partial", 320 + Math.min(query.length * 15, 120));
                    if (index > 0) return consider(call, "partial", 220 + Math.min(query.length * 15, 120));
                }

                if (fuzzy) {
                    const edit = oneEdit(query, call);
                    if (edit) return consider(call, "n1", edit.lookAlike ? 170 : 120, edit.lookAlike);

                    // on air: the typed part with one mistake anywhere in the call
                    if (fuzzyInside && call.length > query.length) {
                        for (let start = 0; start + query.length <= call.length; start++) {
                            const part = call.slice(start, start + query.length);
                            const inner = oneEdit(query, part);
                            if (inner && part.length === query.length) {
                                return consider(call, "n1", (inner.lookAlike ? 150 : 100) + (start === 0 ? 20 : 0), inner.lookAlike);
                            }
                        }
                    }
                }

            };

            for (const call of onAir.keys()) test(call, query.length >= 1, true);
            for (const call of log.keys()) test(call, query.length >= 2, false);
            for (const call of watch) test(call, query.length >= 2, false);

            if (query.length >= 3) {
                for (const call of this.scpCalls) test(call, true, false);
            }
            else if (query.length >= 1) {
                // short: only calls starting with it (lots of them)
                for (const call of this.scpCalls) {
                    if (call.startsWith(query)) consider(call, "partial", 300);
                }
            }

        }

        const matches: CallCheckMatch[] = [];

        for (const [call, candidate] of candidates) {

            const spot = onAir.get(call) ?? null;
            const worked = log.get(call) ?? null;
            const watched = watch.has(call);
            const inScp = this.scpSet.has(call);

            let score = candidate.base;

            if (spot) {
                score += 250 + Math.max(0, 100 - Math.floor(spot.ageSeconds / 60) * 5);
                if (radioBand && spot.band === radioBand) score += 150;
                if (spot.offsetKhz !== null) {
                    const distance = Math.abs(spot.offsetKhz);
                    if (distance <= 1) score += 500;
                    else if (distance <= NEAR_KHZ) score += 400;
                    else if (distance <= NEAR_KHZ * 2) score += 150;
                }
            }

            if (worked) score += 60 + Math.min(worked.count, 20);
            if (watched) score += 80;
            if (inScp) score += 40;

            matches.push({
                call,
                kind: candidate.kind,
                score,
                entity: "",
                flag: "",
                onAir: spot,
                log: worked,
                watch: watched,
                scp: inScp
            });

        }

        matches.sort((a, b) => b.score - a.score || a.call.length - b.call.length || a.call.localeCompare(b.call));

        const top = matches.slice(0, limit);

        for (const match of top) {
            const entity = dxccService.resolve(match.call);
            if (entity) {
                match.entity = entity.name;
                match.flag = safeFlag(entity.key, entity.name);
            }
        }

        const entity = query ? dxccService.resolve(query.replace(/\?.*$/, "")) : null;

        return {
            query,
            entity: entity
                ? {
                    key: entity.key,
                    name: entity.name,
                    continent: entity.continent,
                    cqZone: entity.cqZone,
                    ituZone: entity.ituZone,
                    flag: safeFlag(entity.key, entity.name)
                }
                : null,
            radio: radio !== null ? { frequency: Math.round(radio * 10) / 10, band: radioBand } : null,
            matches: top,
            scp: { calls: this.scpCalls.length, updated: this.scpUpdated }
        };

    }

}


function safeFlag(key: string, name: string): string {

    try {
        return entityFlag(key, name);
    }
    catch {
        return "";
    }

}


/* SCP file: one callsign per line, "#" comments */
export function parseScp(text: string): string[] {

    const calls = new Set<string>();

    for (const line of text.split(/\r?\n/)) {
        const call = line.trim().split(/[\s,;]+/)[0]?.toUpperCase() ?? "";
        if (!call || call.startsWith("#") || !/^[A-Z0-9/]{3,15}$/.test(call) || !/\d/.test(call)) continue;
        calls.add(call);
    }

    return [...calls];

}


function bandOf(khz: number): string {

    const mhz = khz / 1000;

    const bands: Array<[number, number, string]> = [
        [1.8, 2.0, "160m"], [3.5, 4.0, "80m"], [5.3, 5.45, "60m"], [7.0, 7.3, "40m"],
        [10.1, 10.15, "30m"], [14.0, 14.35, "20m"], [18.068, 18.168, "17m"], [21.0, 21.45, "15m"],
        [24.89, 24.99, "12m"], [28.0, 29.7, "10m"], [50, 54, "6m"], [70, 71, "4m"],
        [144, 148, "2m"], [430, 440, "70cm"]
    ];

    return bands.find(([from, to]) => mhz >= from && mhz <= to)?.[2] ?? "";

}


export const callCheckService = new CallCheckService();
