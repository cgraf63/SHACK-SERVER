import fs from "node:fs";
import path from "node:path";

import { CallsignResolverService } from "../geo/callsign-resolver.service.js";


/*
 * DXpeditions: "Announced DX Operations" (ADXO) by NG3K, Bill Feidt.
 *
 * The RSS feed is fetched every 6 hours and cached in
 * data/dxpeditions-cache.json, so a restart does not hit NG3K again.
 */

export const ADXO_FEED_URL = "https://www.ng3k.com/adxo.xml";
export const ADXO_PAGE_URL = "https://www.ng3k.com/Misc/adxo.html";

const REFRESH_MS = 6 * 60 * 60 * 1000;
const RETRY_MS = 30 * 60 * 1000;
const MANUAL_MIN_MS = 10 * 60 * 1000;
const FETCH_TIMEOUT_MS = 20_000;

const CACHE_FILE = path.resolve(process.cwd(), "data", "dxpeditions-cache.json");


export interface Dxpedition {
    id: string;
    /** Callsign as announced (can be a prefix only, e.g. "3B9") */
    call: string;
    /** Full callsigns to match in spots, e.g. ["3B9/M0CFW", "3B9KW"] */
    calls: string[];
    /** Only a prefix is announced: spots "PREFIX/CALL" or "CALL/PREFIX" match */
    prefix: string;
    entity: string;
    countryCode: string;
    /** YYYY-MM-DD, UTC */
    start: string;
    end: string;
    dates: string;
    qsl: string;
    source: string;
    info: string;
    link: string;
}

export interface DxpeditionList {
    source: string;
    sourceUrl: string;
    fetchedAt: number | null;
    error: string;
    entries: Dxpedition[];
}


const MONTHS: Record<string, number> = {
    jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
    jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12
};


function decodeXml(text: string): string {

    return text
        .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, "\"")
        .replace(/&apos;/g, "'")
        .replace(/&#(\d+);/g, (_m, n) => String.fromCharCode(Number(n)))
        .replace(/&amp;/g, "&")
        .trim();

}


function tag(xml: string, name: string): string {

    const match = new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i").exec(xml);

    return match ? decodeXml(match[1] ?? "") : "";

}


function isoDate(year: number, month: number, day: number): string | null {

    if (!year || !month || !day || day > 31) return null;

    const date = new Date(Date.UTC(year, month - 1, day));

    if (date.getUTCMonth() !== month - 1) return null;

    return date.toISOString().slice(0, 10);

}


/*
 * "Oct 3-Nov 20, 2026", "Nov 5-12, 2026", "Dec 28, 2026-Jan 5, 2027",
 * "Nov 7, 2026"
 */
export function parseDateRange(text: string): { start: string; end: string } | null {

    const t = text.replace(/\s+/g, " ").trim();

    const range =
        /^([A-Za-z]{3})[a-z]*\.? (\d{1,2})(?:, (\d{4}))? ?- ?(?:([A-Za-z]{3})[a-z]*\.? )?(\d{1,2}), (\d{4})$/.exec(t);

    if (range) {

        const m1 = MONTHS[(range[1] ?? "").toLowerCase()];
        const m2 = range[4] ? MONTHS[range[4].toLowerCase()] : m1;
        const y2 = Number(range[6]);

        if (!m1 || !m2) return null;

        // without a first year: same year, unless the range crosses New Year
        const y1 = range[3] ? Number(range[3]) : (m1 > m2 ? y2 - 1 : y2);

        const start = isoDate(y1, m1, Number(range[2]));
        const end = isoDate(y2, m2, Number(range[5]));

        return start && end && start <= end ? { start, end } : null;

    }

    const single = /^([A-Za-z]{3})[a-z]*\.? (\d{1,2}), (\d{4})$/.exec(t);

    if (single) {

        const m = MONTHS[(single[1] ?? "").toLowerCase()];
        const day = m ? isoDate(Number(single[3]), m, Number(single[2])) : null;

        return day ? { start: day, end: day } : null;

    }

    return null;

}


const CALL_RE = /^[A-Z0-9]{1,10}(?:\/[A-Z0-9]{1,10}){0,2}$/;

function cleanCall(value: string): string {

    return value.toUpperCase().replace(/^[^A-Z0-9]+|[^A-Z0-9]+$/g, "");

}

function looksLikeCall(value: string): boolean {

    return CALL_RE.test(value) && /[A-Z]/.test(value) && /[0-9]/.test(value);

}

/* "H44MS" is complete, "3B9", "8P", "VP2V" are only prefixes */
function isFullCall(value: string): boolean {

    if (value.includes("/")) return true;

    const suffix = /[0-9]([A-Z]+)$/.exec(value);

    return Boolean(suffix && (suffix[1] ?? "").length >= 2);

}


export function parseAdxo(xml: string, resolver?: CallsignResolverService): Dxpedition[] {

    const entries: Dxpedition[] = [];
    const items = xml.match(/<item>[\s\S]*?<\/item>/gi) ?? [];

    for (const item of items) {

        const title = tag(item, "title");
        const description = tag(item, "description");
        const link = tag(item, "link");

        // description: dates -- entity -- call -- QSL: x -- Source: y -- info
        const parts = description.split(/\s*--\s*/).map(p => p.replace(/\s+/g, " ").trim());

        let datesText = parts[0] ?? "";
        let entity = parts[1] ?? "";
        let call = cleanCall(parts[2] ?? "");
        let qsl = (parts[3] ?? "").replace(/^QSL:\s*/i, "");
        const source = (parts[4] ?? "").replace(/^Source:\s*/i, "");
        const info = parts.slice(5).join(" -- ");

        // fallback: title "Entity: dates -- CALL -- QSL via: X"
        if (!parseDateRange(datesText) || !call) {

            const t = /^(.*?):\s*(.*?)\s*--\s*(\S+)\s*--\s*QSL via:\s*(.*)$/.exec(title);

            if (t) {
                entity = t[1] ?? entity;
                datesText = t[2] ?? datesText;
                call = cleanCall(t[3] ?? call);
                qsl = t[4] ?? qsl;
            }

        }

        const range = parseDateRange(datesText);

        if (!range || !call) continue;

        const calls = new Set<string>();

        if (looksLikeCall(call) && isFullCall(call)) calls.add(call);

        for (const match of info.matchAll(/\b(?:as|using|also)\s+([A-Z0-9/]+)/gi)) {
            const c = cleanCall(match[1] ?? "");
            if (looksLikeCall(c) && isFullCall(c)) calls.add(c);
        }

        const qrz = /qrz\.com\/db\/([A-Z0-9/]+)/i.exec(link);

        if (qrz) {
            const c = cleanCall(qrz[1] ?? "");
            // a QRZ link of the operator's home call (e.g. NY9K for VP2V/NY9K) is no match
            if (looksLikeCall(c) && isFullCall(c) && c.startsWith(call)) {
                calls.add(c);
            }
        }

        const prefix = isFullCall(call) ? "" : call;

        const countryCode =
            resolver?.resolve([...calls][0] ?? call)?.countryCode?.toLowerCase() ?? "";

        entries.push({
            id: `${call}|${range.start}`,
            call,
            calls: [...calls],
            prefix,
            entity,
            countryCode,
            start: range.start,
            end: range.end,
            dates: datesText,
            qsl,
            source,
            info,
            link: link && !/ng3k\.com/i.test(link) ? link : ""
        });

    }

    return entries;

}


class DxpeditionService {

    private list: DxpeditionList = {
        source: "NG3K ADXO",
        sourceUrl: ADXO_PAGE_URL,
        fetchedAt: null,
        error: "",
        entries: []
    };

    private resolver = new CallsignResolverService();
    private timer: NodeJS.Timeout | null = null;
    private loading: Promise<void> | null = null;
    private lastAttempt = 0;

    start(): void {

        this.loadCache();

        const age = this.list.fetchedAt ? Date.now() - this.list.fetchedAt : Infinity;

        this.schedule(age >= REFRESH_MS ? 5_000 : REFRESH_MS - age);

    }

    private schedule(delay: number): void {

        if (this.timer) clearTimeout(this.timer);

        this.timer = setTimeout(async () => {
            await this.refresh();
            this.schedule(this.list.error ? RETRY_MS : REFRESH_MS);
        }, Math.max(1_000, delay));

        this.timer.unref?.();

    }

    private loadCache(): void {

        try {
            const data = JSON.parse(fs.readFileSync(CACHE_FILE, "utf8"));
            if (Array.isArray(data?.entries)) {
                this.list = { ...this.list, ...data, error: "" };
            }
        }
        catch {
            // no cache yet
        }

    }

    private saveCache(): void {

        try {
            fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true });
            fs.writeFileSync(CACHE_FILE, JSON.stringify(this.list, null, 1));
        }
        catch (error) {
            console.error("DXpeditions: cache not saved:", error);
        }

    }

    /** Manual refresh from the page: at most every 10 minutes */
    async refreshIfAllowed(): Promise<void> {

        if (Date.now() - this.lastAttempt < MANUAL_MIN_MS) return;

        await this.refresh();

    }

    refresh(): Promise<void> {

        if (this.loading) return this.loading;

        this.lastAttempt = Date.now();

        this.loading = (async () => {

            try {

                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

                const response = await fetch(ADXO_FEED_URL, {
                    headers: { "User-Agent": "SHACK-SERVER (ham radio station server)" },
                    signal: controller.signal
                }).finally(() => clearTimeout(timeout));

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }

                const entries = parseAdxo(await response.text(), this.resolver);

                if (!entries.length) {
                    throw new Error("feed contained no readable entries");
                }

                this.list = { ...this.list, fetchedAt: Date.now(), error: "", entries };
                this.saveCache();

                console.log(`DXpeditions: ${entries.length} entries from NG3K ADXO`);

            }
            catch (error) {

                const message = error instanceof Error
                    ? (error.name === "AbortError" ? "timeout" : error.message)
                    : String(error);

                this.list = { ...this.list, error: `NG3K ADXO not reachable (${message})` };
                console.error("DXpeditions:", this.list.error);

            }
            finally {
                this.loading = null;
            }

        })();

        return this.loading;

    }

    /** Entries that have not ended yet (UTC date), sorted by start */
    get(): DxpeditionList {

        const today = new Date().toISOString().slice(0, 10);

        return {
            ...this.list,
            entries: this.list.entries
                .filter(entry => entry.end >= today)
                .sort((a, b) => a.start.localeCompare(b.start) || a.call.localeCompare(b.call))
        };

    }

}


export const dxpeditionService = new DxpeditionService();
