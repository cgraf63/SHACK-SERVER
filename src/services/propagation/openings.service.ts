import fs from "node:fs";
import path from "node:path";

import { dxccService, type DxccEntity } from "../dxcc/dxcc.service.js";
import { entityFlag } from "../dxcc/dxcc-table.js";
import { DistanceService } from "../geo/distance.service.js";
import { BearingService } from "../geo/bearing.service.js";
import { MaidenheadService } from "../geo/maidenhead.service.js";
import { ShackLocationService } from "../geo/shack-location.service.js";
import { getWorkedIndex } from "../needed/worked-index.js";


/*
 * "When can I work it?"
 *
 * Learns from every report that SHACK-SERVER sees (DX cluster, RBN
 * skimmers, PSK Reporter): when a station of entity X is heard on band B
 * by a spotter within 1500 km of the own QTH, the path X -> here was
 * open on B in that UTC hour. Stored per entity and band as one 24-bit
 * mask per day, 28 days:
 *
 *   probability(hour) = days with a report in that hour / days observed
 *
 * In addition a sun model (no learning needed): high bands need daylight
 * at the middle of the path, low bands darkness at both ends, greyline
 * helps. Shown while too few days are collected, and as a hint.
 *
 *   data/openings.json
 */

const FILE = path.resolve("data", "openings.json");
const DAYS = 28;
const NEAR_KM = 1500;
const SAVE_MS = 10 * 60 * 1000;
const DAY_MS = 86_400_000;

export const OPENING_BANDS = ["160m", "80m", "60m", "40m", "30m", "20m", "17m", "15m", "12m", "10m", "6m"];

const distance = new DistanceService();
const bearing = new BearingService();
const maidenhead = new MaidenheadService();
const shack = new ShackLocationService();

const today = (at = Date.now()) => Math.floor(at / DAY_MS);


/* ------------------------------------------------------------ sun */

function sunElevation(lat: number, lon: number, at: Date): number {
    const rad = Math.PI / 180;
    const start = Date.UTC(at.getUTCFullYear(), 0, 0);
    const day = (at.getTime() - start) / DAY_MS;
    const g = 2 * Math.PI / 365 * (day - 1 + (at.getUTCHours() - 12) / 24);
    const decl = 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g)
        + 0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g);
    const eqTime = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g)
        - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
    const minutes = at.getUTCHours() * 60 + at.getUTCMinutes() + eqTime + 4 * lon;
    const hourAngle = (minutes / 4 - 180) * rad;
    const sin = Math.sin(lat * rad) * Math.sin(decl) + Math.cos(lat * rad) * Math.cos(decl) * Math.cos(hourAngle);
    return Math.asin(Math.max(-1, Math.min(1, sin))) / rad;
}

/* sunrise / sunset (UTC "HH:MM") of today, null in polar day / night */
function sunTimes(lat: number, lon: number): { rise: string | null; set: string | null } {
    const base = new Date();
    base.setUTCHours(0, 0, 0, 0);
    let rise: string | null = null;
    let set: string | null = null;
    let prev = sunElevation(lat, lon, base);
    for (let m = 5; m <= 1440; m += 5) {
        const at = new Date(base.getTime() + m * 60_000);
        const elev = sunElevation(lat, lon, at);
        const label = `${String(at.getUTCHours()).padStart(2, "0")}:${String(at.getUTCMinutes()).padStart(2, "0")}`;
        if (prev < -0.83 && elev >= -0.83 && !rise) rise = label;
        if (prev >= -0.83 && elev < -0.83 && !set) set = label;
        prev = elev;
    }
    return { rise, set };
}

function midpoint(a: { lat: number; lon: number }, b: { lat: number; lon: number }): { lat: number; lon: number } {
    const rad = Math.PI / 180;
    const [lat1, lon1, lat2] = [a.lat * rad, a.lon * rad, b.lat * rad];
    const dLon = (b.lon - a.lon) * rad;
    const bx = Math.cos(lat2) * Math.cos(dLon);
    const by = Math.cos(lat2) * Math.sin(dLon);
    const lat = Math.atan2(Math.sin(lat1) + Math.sin(lat2), Math.sqrt((Math.cos(lat1) + bx) ** 2 + by ** 2));
    const lon = lon1 + Math.atan2(by, Math.cos(lat1) + bx);
    return { lat: lat / rad, lon: ((lon / rad + 540) % 360) - 180 };
}

/* 0..1, rule of thumb from the sun along the path */
function modelScore(band: string, home: number, dx: number, mid: number, km: number): number {
    const grey = (e: number) => e > -6 && e < 3;
    const dark = (e: number) => e < -6;
    const greyBonus = grey(home) || grey(dx) ? 0.2 : 0;
    const short = km < 2500;

    switch (band) {
        case "160m":
            return dark(home) && dark(dx) ? 0.55 + greyBonus : grey(home) && dark(dx) ? 0.35 : 0;
        case "80m":
            return dark(home) && dark(dx) ? 0.6 + greyBonus : (grey(home) || grey(dx)) && (dark(home) || dark(dx)) ? 0.35 : short && mid < 0 ? 0.2 : 0;
        case "60m":
        case "40m":
            if (dark(home) && dark(dx)) return 0.65 + greyBonus;
            if (short) return 0.35 + greyBonus / 2;
            if (dark(mid) && (dark(home) || dark(dx))) return 0.35 + greyBonus;
            return greyBonus ? 0.25 : 0.03;
        case "30m":
            if (dark(home) && dark(dx)) return 0.5 + greyBonus;
            if (dark(mid)) return 0.3 + greyBonus;
            return mid > 0 ? 0.2 + greyBonus / 2 : 0.08;
        case "20m":
            if (mid > 0 && home > -6 && dx > -6) return 0.7 + greyBonus / 2;
            if (mid > 0 || greyBonus) return 0.4;
            return 0.06;
        case "17m":
        case "15m":
            return mid > 8 && home > -3 && dx > -3 ? 0.6 : mid > 0 ? 0.3 : 0.02;
        case "12m":
        case "10m":
            return mid > 18 && home > 0 && dx > 0 ? 0.45 : mid > 8 ? 0.15 : 0;
        case "6m":
            return mid > 30 && km < 3000 ? 0.15 : 0;
        default:
            return 0;
    }
}


/* ------------------------------------------------------------ service */

interface Store {
    firstDay: number;
    data: Record<string, Record<string, number>>;   // "KEY|band" -> day -> mask
}

class OpeningsService {

    private store: Store = { firstDay: today(), data: {} };
    private dirty = false;
    private home: { at: number; lat: number; lon: number } | null = null;
    private spotterPositions = new Map<string, { lat: number; lon: number } | null>();

    constructor() {
        try {
            const saved = JSON.parse(fs.readFileSync(FILE, "utf8")) as Store;
            if (saved && typeof saved.firstDay === "number" && saved.data) this.store = saved;
        }
        catch {
            // first start
        }
        this.prune();
        setInterval(() => this.save(), SAVE_MS).unref?.();
        process.once("SIGTERM", () => this.save());
        process.once("SIGINT", () => this.save());
    }

    private save(): void {
        if (!this.dirty) return;
        try {
            this.prune();
            fs.mkdirSync(path.dirname(FILE), { recursive: true });
            fs.writeFileSync(FILE, JSON.stringify(this.store));
            this.dirty = false;
        }
        catch (error) {
            console.error("OPENINGS: not saved", error instanceof Error ? error.message : error);
        }
    }

    private prune(): void {
        const oldest = today() - DAYS + 1;
        if (this.store.firstDay < oldest) this.store.firstDay = oldest;
        for (const [key, days] of Object.entries(this.store.data)) {
            for (const day of Object.keys(days)) if (Number(day) < oldest) delete days[day];
            if (!Object.keys(days).length) delete this.store.data[key];
        }
    }

    private homePosition(): { lat: number; lon: number } {
        if (this.home && Date.now() - this.home.at < 60_000) return this.home;
        const c = shack.getCoordinates();
        this.home = { at: Date.now(), lat: c.latitude, lon: c.longitude };
        return this.home;
    }

    private spotterPosition(spotter: string, locator?: string): { lat: number; lon: number } | null {
        if (locator && /^[A-R]{2}\d{2}/i.test(locator)) {
            try {
                const c = maidenhead.locatorToCoordinates(locator);
                if (c) return { lat: c.latitude, lon: c.longitude };
            }
            catch { /* bad locator */ }
        }
        const key = spotter.toUpperCase();
        if (this.spotterPositions.has(key)) return this.spotterPositions.get(key) ?? null;
        const entity = dxccService.resolve(key.replace(/-\d+$|-#$/, ""));
        const position = entity ? { lat: entity.latitude, lon: entity.longitude } : null;
        if (this.spotterPositions.size > 20_000) this.spotterPositions.clear();
        this.spotterPositions.set(key, position);
        return position;
    }

    /* one report: call heard by spotter on band */
    record(call: string, spotter: string, band: string, locator?: string, at = Date.now()): void {
        const b = String(band || "").toLowerCase();
        if (!OPENING_BANDS.includes(b) || !call || !spotter) return;

        const position = this.spotterPosition(spotter, locator);
        if (!position) return;
        const home = this.homePosition();
        if (distance.distanceKm({ latitude: home.lat, longitude: home.lon }, { latitude: position.lat, longitude: position.lon }) > NEAR_KM) return;

        const entity = dxccService.resolve(call);
        if (!entity) return;

        const key = `${entity.key}|${b}`;
        if (today(at) < today() - DAYS + 1 || at > Date.now() + 60_000) return;
        if (today(at) < this.store.firstDay) this.store.firstDay = today(at);
        const day = String(today(at));
        const bit = 1 << new Date(at).getUTCHours();
        const days = (this.store.data[key] ??= {});
        const mask = days[day] ?? 0;
        if (mask & bit) return;
        days[day] = mask | bit;
        this.dirty = true;
    }

    private observedDays(): number {
        return Math.max(1, Math.min(DAYS, today() - this.store.firstDay + 1));
    }

    private measured(entityKey: string): Record<string, number[]> {
        const observed = this.observedDays();
        const result: Record<string, number[]> = {};
        for (const band of OPENING_BANDS) {
            const days = this.store.data[`${entityKey}|${band}`];
            const hours = new Array(24).fill(0);
            if (days) {
                for (const mask of Object.values(days)) {
                    for (let h = 0; h < 24; h++) if (mask & (1 << h)) hours[h]++;
                }
            }
            result[band] = hours.map(n => Math.round(Math.min(1, n / observed) * 100) / 100);
        }
        return result;
    }

    private lastHeard(entityKey: string): { band: string; day: number; hour: number } | null {
        let best: { band: string; day: number; hour: number } | null = null;
        for (const band of OPENING_BANDS) {
            const days = this.store.data[`${entityKey}|${band}`];
            if (!days) continue;
            for (const [day, mask] of Object.entries(days)) {
                const hour = 31 - Math.clz32(mask);
                const d = Number(day);
                if (!best || d > best.day || (d === best.day && hour > best.hour)) best = { band, day: d, hour };
            }
        }
        return best;
    }

    private model(entity: DxccEntity, home: { lat: number; lon: number }, km: number) {
        const dx = { lat: entity.latitude, lon: entity.longitude };
        const mid = midpoint(home, dx);
        const base = new Date();
        base.setUTCHours(0, 30, 0, 0);
        const sun = { home: [] as number[], dx: [] as number[] };
        const bands: Record<string, number[]> = {};
        for (const band of OPENING_BANDS) bands[band] = [];
        for (let h = 0; h < 24; h++) {
            const at = new Date(base.getTime() + h * 3_600_000);
            const eHome = sunElevation(home.lat, home.lon, at);
            const eDx = sunElevation(dx.lat, dx.lon, at);
            const eMid = sunElevation(mid.lat, mid.lon, at);
            sun.home.push(Math.round(eHome));
            sun.dx.push(Math.round(eDx));
            for (const band of OPENING_BANDS) bands[band].push(Math.round(Math.min(1, modelScore(band, eHome, eDx, eMid, km)) * 100) / 100);
        }
        return { bands, sun };
    }

    resolveEntity(query: string): DxccEntity | null {
        const q = String(query || "").trim().toUpperCase();
        if (!q) return null;
        return dxccService.get(q)
            ?? dxccService.all().find(e => e.name.toUpperCase() === q)
            ?? dxccService.resolve(q)
            ?? dxccService.all().find(e => e.name.toUpperCase().startsWith(q))
            ?? null;
    }

    predict(query: string) {
        const entity = this.resolveEntity(query);
        if (!entity) return null;

        const home = this.homePosition();
        const km = Math.round(distance.distanceKm({ latitude: home.lat, longitude: home.lon }, { latitude: entity.latitude, longitude: entity.longitude }));
        const worked = getWorkedIndex();
        const model = this.model(entity, home, km);
        const measured = this.measured(entity.key);
        const last = this.lastHeard(entity.key);

        return {
            entity: {
                key: entity.key,
                name: entity.name,
                continent: entity.continent,
                flag: entityFlag(entity.key, entity.name),
                cqZone: entity.cqZone,
                km,
                azimuth: Math.round(bearing.bearing({ latitude: home.lat, longitude: home.lon }, { latitude: entity.latitude, longitude: entity.longitude }))
            },
            worked: worked.entities.has(entity.key),
            workedBands: OPENING_BANDS.filter(b => worked.entityBands.has(`${entity.key}|${b.toUpperCase()}`) || worked.entityBands.has(`${entity.key}|${b}`)),
            observedDays: this.observedDays(),
            reports: Object.values(measured).reduce((s, h) => s + h.reduce((a, v) => a + (v > 0 ? 1 : 0), 0), 0),
            measured,
            model: model.bands,
            sun: {
                home: model.sun.home,
                dx: model.sun.dx,
                homeTimes: sunTimes(home.lat, home.lon),
                dxTimes: sunTimes(entity.latitude, entity.longitude)
            },
            lastHeard: last ? { band: last.band, date: new Date(last.day * DAY_MS).toISOString().slice(0, 10), hour: last.hour } : null,
            nowHour: new Date().getUTCHours(),
            nearKm: NEAR_KM
        };
    }

    /* needed entities (not worked at all) with the best chance in the next hours */
    soon(hours = 3, limit = 15) {
        const worked = getWorkedIndex();
        const observed = this.observedDays();
        const now = new Date().getUTCHours();
        const next = Array.from({ length: hours }, (_, i) => (now + i) % 24);
        const best = new Map<string, { band: string; hour: number; p: number }>();

        for (const [key, days] of Object.entries(this.store.data)) {
            const [entityKey, band] = key.split("|");
            if (worked.entities.has(entityKey)) continue;
            const counts = new Array(24).fill(0);
            for (const mask of Object.values(days)) for (const h of next) if (mask & (1 << h)) counts[h]++;
            for (const h of next) {
                const p = Math.min(1, counts[h] / observed);
                const current = best.get(entityKey);
                if (p > 0 && (!current || p > current.p)) best.set(entityKey, { band, hour: h, p });
            }
        }

        return [...best.entries()]
            .map(([key, b]) => {
                const entity = dxccService.get(key);
                return {
                    key,
                    name: entity?.name ?? key,
                    continent: entity?.continent ?? "",
                    flag: entity ? entityFlag(entity.key, entity.name) : "",
                    band: b.band,
                    hour: b.hour,
                    probability: Math.round(b.p * 100) / 100
                };
            })
            .sort((a, b) => b.probability - a.probability || a.hour - b.hour)
            .slice(0, limit);
    }

    entities() {
        return dxccService.all()
            .map(e => ({ key: e.key, name: e.name }))
            .sort((a, b) => a.name.localeCompare(b.name));
    }
}

export const openingsService = new OpeningsService();
