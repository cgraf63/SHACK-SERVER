import { dxccService } from "../dxcc/dxcc.service.js";
import { DistanceService } from "../geo/distance.service.js";
import { MaidenheadService } from "../geo/maidenhead.service.js";
import { ShackLocationService } from "../geo/shack-location.service.js";
import { qsoService } from "./qso-instance.js";


/*
 * Year in review (review.html): statistics and map of the QSOs of one
 * year from the log.
 *
 *   QSOs, stations, DXCC entities (new ones = first QSO ever in that
 *   year), continents, km, confirmations, per month / band / mode /
 *   hour, busiest day, top entities, farthest QSO, map points.
 */

const maidenhead = new MaidenheadService();
const distance = new DistanceService();
const shack = new ShackLocationService();

function qsoYear(date: string): number {
    const match = /^(\d{4})-?(\d{2})/.exec(String(date || ""));
    return match ? Number(match[1]) : 0;
}

function qsoMonth(date: string): number {
    const match = /^\d{4}-?(\d{2})/.exec(String(date || ""));
    return match ? Number(match[1]) : 0;
}

function position(grid: string | null | undefined, call: string): { lat: number; lon: number; exact: boolean } | null {
    if (grid && /^[A-R]{2}\d{2}/i.test(grid)) {
        try {
            const c = maidenhead.locatorToCoordinates(grid);
            if (c) return { lat: c.latitude, lon: c.longitude, exact: true };
        }
        catch { /* bad locator */ }
    }
    const entity = dxccService.resolve(call);
    return entity ? { lat: entity.latitude, lon: entity.longitude, exact: false } : null;
}

export function yearReview(year: number) {

    const all = qsoService.getAllQso();
    const years = [...new Set(all.map(q => qsoYear(q.qso_date)).filter(y => y > 1900))].sort((a, b) => b - a);

    if (!year) year = years[0] ?? new Date().getUTCFullYear();

    const home = shack.getCoordinates();

    // first QSO ever per entity (for "new DXCC this year")
    const firstYear = new Map<string, number>();
    for (const q of all) {
        const entity = dxccService.resolve(q.call);
        const y = qsoYear(q.qso_date);
        if (!entity || !y) continue;
        const known = firstYear.get(entity.key);
        if (known === undefined || y < known) firstYear.set(entity.key, y);
    }

    const qsos = all.filter(q => qsoYear(q.qso_date) === year);

    const months = new Array(12).fill(0);
    const hours = new Array(24).fill(0);
    const bands: Record<string, number> = {};
    const modes: Record<string, number> = {};
    const days: Record<string, number> = {};
    const entities = new Map<string, { key: string; name: string; code: string; continent: string; qsos: number; isNew: boolean }>();
    const continents: Record<string, number> = {};
    const calls = new Map<string, number>();
    const points = new Map<string, { call: string; lat: number; lon: number; band: string; mode: string; km: number; date: string; country: string; code: string }>();

    let totalKm = 0;
    let confirmed = 0;
    let farthest: { call: string; km: number; date: string; band: string; mode: string; country: string; code: string; lat: number; lon: number } | null = null;

    for (const q of qsos) {

        const month = qsoMonth(q.qso_date);
        if (month >= 1 && month <= 12) months[month - 1]++;

        const hour = Number(String(q.time_on_utc || "").slice(0, 2));
        if (Number.isFinite(hour) && hour >= 0 && hour < 24) hours[hour]++;

        const band = String(q.band || "?").toLowerCase();
        bands[band] = (bands[band] ?? 0) + 1;

        const mode = String(q.mode || "?").toUpperCase();
        modes[mode] = (modes[mode] ?? 0) + 1;

        const day = String(q.qso_date).slice(0, 10);
        days[day] = (days[day] ?? 0) + 1;

        const call = String(q.call).toUpperCase();
        calls.set(call, (calls.get(call) ?? 0) + 1);

        if (q.qsl_received) confirmed++;

        const entity = dxccService.resolve(call);
        if (entity) {
            const item = entities.get(entity.key) ?? {
                key: entity.key,
                name: entity.name,
                code: String(q.country_code || "").toLowerCase(),
                continent: entity.continent,
                qsos: 0,
                isNew: firstYear.get(entity.key) === year
            };
            item.qsos++;
            if (!item.code && q.country_code) item.code = String(q.country_code).toLowerCase();
            entities.set(entity.key, item);
            continents[entity.continent] = (continents[entity.continent] ?? 0) + 1;
        }

        const pos = position(q.dx_grid, call);
        if (pos) {
            const km = Math.round(distance.distanceKm({ latitude: home.latitude, longitude: home.longitude }, { latitude: pos.lat, longitude: pos.lon }));
            totalKm += km;
            const country = entity?.name ?? String(q.country ?? "");
            const code = String(q.country_code || "").toLowerCase();
            if (!farthest || km > farthest.km) {
                farthest = { call, km, date: day, band, mode, country, code, lat: pos.lat, lon: pos.lon };
            }
            const key = `${call}|${band}`;
            if (!points.has(key)) points.set(key, { call, lat: Math.round(pos.lat * 100) / 100, lon: Math.round(pos.lon * 100) / 100, band, mode, km, date: day, country, code });
        }
    }

    const busiest = Object.entries(days).sort((a, b) => b[1] - a[1])[0] ?? null;
    const sortRecord = (r: Record<string, number>) => Object.entries(r).sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count }));

    return {
        year,
        years,
        home: { lat: home.latitude, lon: home.longitude },
        totals: {
            qsos: qsos.length,
            stations: calls.size,
            entities: entities.size,
            newEntities: [...entities.values()].filter(e => e.isNew).length,
            continents: Object.keys(continents).length,
            km: totalKm,
            confirmed,
            activeDays: Object.keys(days).length
        },
        months,
        hours,
        bands: sortRecord(bands),
        modes: sortRecord(modes),
        continents: sortRecord(continents),
        busiestDay: busiest ? { date: busiest[0], qsos: busiest[1] } : null,
        topEntities: [...entities.values()].sort((a, b) => b.qsos - a.qsos).slice(0, 10),
        newEntities: [...entities.values()].filter(e => e.isNew).sort((a, b) => a.name.localeCompare(b.name)),
        topCalls: [...calls.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([call, count]) => ({ call, count })),
        farthest,
        points: [...points.values()].slice(0, 5000)
    };

}
