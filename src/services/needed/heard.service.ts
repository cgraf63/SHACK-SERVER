import { dxccService } from "../dxcc/dxcc.service.js";
import { DistanceService } from "../geo/distance.service.js";
import { MaidenheadService } from "../geo/maidenhead.service.js";
import { ShackLocationService } from "../geo/shack-location.service.js";
import { settingsService } from "../settings/settings.service.js";


/*
 * "Heard near you": who heard which station recently, and where.
 *
 * Reports come from
 *   - the Reverse Beacon Network (all skimmer spots, with SNR and the
 *     skimmer locator from the RBN skimmer list) - not shown in the
 *     spot list, only used here
 *   - the DX clusters (spotter call from "DX de XXX:" / API fields)
 *
 * Spotter location: locator (RBN list, HolyCluster) if known, otherwise
 * the centre of the spotter's DXCC entity (cty.dat). Near = distance to
 * the own QTH <= radius (Settings, default 1000 km); without any
 * position: same continent.
 */

const WINDOW_MS = 15 * 60 * 1000;
const MAX_REPORTS_PER_CALL = 40;
const MAX_LOCATORS = 20_000;
/* memory cap (PSK Reporter can deliver tens of thousands of stations) */
const MAX_CALLS = 60_000;

export interface HeardReport {
    spotter: string;
    source: string;
    band: string;
    at: number;
    snr?: number;
    locator?: string;
}

export interface HeardInfo {
    nearby: boolean;
    nearbyCount: number;
    spotterCount: number;
    /* best SNR of the near spotters (RBN), dB */
    bestSnr: number | null;
    /* spotters per continent, e.g. {EU: 3, NA: 1} */
    continents: Record<string, number>;
    rbn: boolean;
    radiusKm: number;
}


class HeardService {

    private reports = new Map<string, HeardReport[]>();
    private locators = new Map<string, string>();

    private distance = new DistanceService();
    private maidenhead = new MaidenheadService();
    private shack = new ShackLocationService();

    private shackCache: { at: number; lat: number; lon: number; continent: string } | null = null;
    private evalCache = new Map<string, { at: number; info: HeardInfo }>();

    constructor() {

        setInterval(() => this.prune(), 60_000).unref?.();

    }

    /* spotter call -> locator, learned from sources that tell it */
    learnLocator(spotter: string, locator: string | undefined): void {

        if (!spotter || !locator || !/^[A-R]{2}\d{2}/i.test(locator)) return;

        if (this.locators.size > MAX_LOCATORS) this.locators.clear();

        this.locators.set(spotter.toUpperCase(), locator.toUpperCase());

    }

    report(call: string, report: HeardReport): void {

        const key = call.toUpperCase().trim();

        if (!key || !report.spotter) return;

        if (report.locator) this.learnLocator(report.spotter, report.locator);

        let list = this.reports.get(key);

        if (!list && this.reports.size >= MAX_CALLS) {

            this.prune();

            // still full: drop the oldest quarter (Map keeps insertion order)
            if (this.reports.size >= MAX_CALLS) {
                let drop = Math.floor(MAX_CALLS / 4);
                for (const call of this.reports.keys()) {
                    if (drop-- <= 0) break;
                    this.reports.delete(call);
                }
            }

        }

        if (!list) {
            list = [];
            this.reports.set(key, list);
        }

        // same spotter on the same band: keep the newest report only
        const index = list.findIndex(r => r.spotter === report.spotter && r.band === report.band);

        if (index >= 0) list.splice(index, 1);

        list.push(report);

        this.evalCache.delete(`${key}|${report.band.toUpperCase()}`);

        if (list.length > MAX_REPORTS_PER_CALL) list.splice(0, list.length - MAX_REPORTS_PER_CALL);

    }

    private prune(): void {

        const limit = Date.now() - WINDOW_MS;

        for (const [call, list] of this.reports) {

            const fresh = list.filter(r => r.at >= limit);

            if (fresh.length) this.reports.set(call, fresh);
            else this.reports.delete(call);

        }

        this.evalCache.clear();

    }

    private shackPosition(): { lat: number; lon: number; continent: string } {

        if (this.shackCache && Date.now() - this.shackCache.at < 60_000) return this.shackCache;

        const coordinates = this.shack.getCoordinates();
        const own = dxccService.resolve(String(settingsService.get().callsign || ""));

        this.shackCache = {
            at: Date.now(),
            lat: coordinates.latitude,
            lon: coordinates.longitude,
            continent: own?.continent ?? "EU"
        };

        return this.shackCache;

    }

    private radiusKm(): number {

        const radius = Number((settingsService.get() as any).notifications?.nearbyRadiusKm);

        return Number.isFinite(radius) && radius > 0 ? radius : 1000;

    }

    evaluate(call: string, band: string): HeardInfo {

        const key = `${call.toUpperCase()}|${String(band).toUpperCase()}`;
        const cached = this.evalCache.get(key);

        if (cached && Date.now() - cached.at < 20_000) return cached.info;

        const radiusKm = this.radiusKm();
        const shack = this.shackPosition();
        const limit = Date.now() - WINDOW_MS;
        const bandKey = String(band).toUpperCase();

        const reports = (this.reports.get(call.toUpperCase()) ?? [])
            .filter(r => r.at >= limit && (!bandKey || r.band.toUpperCase() === bandKey));

        const info: HeardInfo = {
            nearby: false,
            nearbyCount: 0,
            spotterCount: 0,
            bestSnr: null,
            continents: {},
            rbn: false,
            radiusKm
        };

        const seen = new Set<string>();

        for (const report of reports) {

            if (seen.has(report.spotter)) continue;

            seen.add(report.spotter);
            info.spotterCount++;

            if (report.source === "RBN") info.rbn = true;

            const entity = dxccService.resolve(report.spotter);
            const continent = entity?.continent ?? "";

            if (continent) info.continents[continent] = (info.continents[continent] ?? 0) + 1;

            let position: { latitude: number; longitude: number } | null = null;

            const locator = report.locator ?? this.locators.get(report.spotter);

            if (locator) {
                try {
                    position = this.maidenhead.locatorToCoordinates(locator) ?? null;
                }
                catch {
                    position = null;
                }
            }

            if (!position && entity) {
                position = { latitude: entity.latitude, longitude: entity.longitude };
            }

            const near = position
                ? this.distance.distanceKm({ latitude: shack.lat, longitude: shack.lon }, position) <= radiusKm
                : Boolean(continent) && continent === shack.continent;

            if (near) {

                info.nearbyCount++;

                if (typeof report.snr === "number" && Number.isFinite(report.snr)) {
                    info.bestSnr = info.bestSnr === null ? report.snr : Math.max(info.bestSnr, report.snr);
                }

            }

        }

        info.nearby = info.nearbyCount > 0;

        this.evalCache.set(key, { at: Date.now(), info });

        return info;

    }

    /* "heard in EU (3 spotters)" */
    describe(info: HeardInfo): string {

        if (!info.spotterCount) return "";

        const shack = this.shackPosition();

        if (info.nearby) {
            return `heard in ${shack.continent} (${info.nearbyCount} spotter${info.nearbyCount === 1 ? "" : "s"}` +
                `${info.bestSnr !== null ? `, ${info.bestSnr} dB` : ""})`;
        }

        const continents = Object.entries(info.continents)
            .sort((a, b) => b[1] - a[1])
            .map(([continent]) => continent)
            .join("/");

        return `heard in ${continents || "?"} (${info.spotterCount} spotter${info.spotterCount === 1 ? "" : "s"})`;

    }

}


export const heardService = new HeardService();


export function bandOfKhz(khz: number): string {

    const mhz = khz / 1000;

    if (mhz >= 50 && mhz <= 54) return "6m";
    if (mhz >= 28) return mhz <= 29.7 ? "10m" : "";
    if (mhz >= 24.89) return "12m";
    if (mhz >= 21) return "15m";
    if (mhz >= 18.068) return "17m";
    if (mhz >= 14) return "20m";
    if (mhz >= 10.1) return "30m";
    if (mhz >= 7) return "40m";
    if (mhz >= 5.3) return "60m";
    if (mhz >= 3.5) return "80m";
    if (mhz >= 1.8) return "160m";

    return "";

}


/* Cluster reports from the fusion engine */
export function attachHeardService(fusion: { onSpotReport(listener: (spot: any) => void): void }): void {

    fusion.onSpotReport(spot => {

        const spotter = spot?.spotters?.[0];

        if (!spotter || !spot.call) return;

        heardService.report(spot.call, {
            spotter,
            source: spot.sources?.[0] ?? "",
            band: spot.band ?? "",
            at: Date.now(),
            ...(typeof spot.snr === "number" ? { snr: spot.snr } : {}),
            ...(spot.spotterLocator ? { locator: spot.spotterLocator } : {})
        });

    });

}
