import fs from "node:fs";
import path from "node:path";


/*
 * DXCC entities from cty.dat (data/cty.dat, AD1C country files).
 *
 * The key of an entity is its main prefix (e.g. "EA9" = Ceuta & Melilla,
 * "EA" = Spain, "FW" = Wallis & Futuna). Entries marked with "*" are
 * WAE / CQ-only areas (e.g. *IT9 Sicily) and not DXCC entities: they are
 * left out, so IT9ABC resolves to Italy.
 *
 * cty.dat gives longitude positive to the WEST - converted here to the
 * usual east-positive value.
 */

export interface DxccEntity {
    /* main prefix, used as DXCC key */
    key: string;
    name: string;
    continent: string;
    cqZone: number;
    latitude: number;
    longitude: number;
}

/* Portable suffixes that do not change the entity */
const IGNORED_SUFFIXES = new Set(["P", "M", "A", "QRP", "QRPP", "LH", "B", "J", "R", "T", "X"]);

/* Maritime / aeronautical mobile: no DXCC entity */
const NO_ENTITY_SUFFIXES = new Set(["MM", "AM"]);


class DxccService {

    private exact = new Map<string, DxccEntity>();
    private prefixes: Array<[string, DxccEntity]> = [];
    private byKey = new Map<string, DxccEntity>();
    private loaded = false;
    private cache = new Map<string, DxccEntity | null>();

    private load(): void {

        this.loaded = true;

        const file = path.resolve(process.cwd(), "data", "cty.dat");

        if (!fs.existsSync(file)) {
            console.error("DXCC: data/cty.dat not found");
            return;
        }

        const content = fs.readFileSync(file, "utf8");

        for (const record of content.split(";")) {

            const text = record.trim();

            if (!text) continue;

            // Name: CQ: ITU: Cont: Lat: Lon: GMT: Prefix: aliases
            const header = text.split(":");

            if (header.length < 9) continue;

            const mainPrefix = (header[7] ?? "").trim();

            // WAE / CQ-only areas are not DXCC entities
            if (mainPrefix.startsWith("*")) continue;

            const entity: DxccEntity = {
                key: mainPrefix.toUpperCase(),
                name: (header[0] ?? "").trim(),
                continent: (header[3] ?? "").trim().toUpperCase(),
                cqZone: Number(header[1]) || 0,
                latitude: Number(header[4]) || 0,
                longitude: -(Number(header[5]) || 0)
            };

            this.byKey.set(entity.key, entity);

            for (const raw of header.slice(8).join(":").split(",")) {

                let alias = raw.trim();

                if (!alias) continue;

                // overrides: (cq) [itu] <lat/lon> {cont} ~gmt~
                const continent = /\{([A-Z]{2})\}/.exec(alias)?.[1];
                alias = alias.replace(/[([<{~].*$/, "").toUpperCase();

                if (!alias) continue;

                const target = continent && continent !== entity.continent
                    ? { ...entity, continent }
                    : entity;

                if (alias.startsWith("=")) {
                    this.exact.set(alias.slice(1), target);
                }
                else {
                    this.prefixes.push([alias, target]);
                }

            }

        }

        this.prefixes.sort((a, b) => b[0].length - a[0].length);

        console.log(`DXCC: ${this.byKey.size} entities from cty.dat`);

    }

    private lookupPrefix(call: string): DxccEntity | null {

        const exact = this.exact.get(call);

        if (exact) return exact;

        for (const [prefix, entity] of this.prefixes) {
            if (call.startsWith(prefix)) return entity;
        }

        return null;

    }

    /*
     * "FW3GT", "3B9/M0CFW", "M0CFW/3B9", "DL1ABC/P", "EA8/DL1ABC/P",
     * "DL1ABC/MM" (no entity)
     */
    resolve(callsign: string): DxccEntity | null {

        if (!this.loaded) this.load();

        const call = String(callsign || "").toUpperCase().trim().replace(/-\d+$|-#$/, "");

        if (!call) return null;

        if (this.cache.has(call)) return this.cache.get(call) ?? null;

        let result: DxccEntity | null = null;

        const exact = this.exact.get(call);

        if (exact) {
            result = exact;
        }
        else {

            let parts = call.split("/").filter(Boolean);

            if (parts.some(part => NO_ENTITY_SUFFIXES.has(part))) {
                this.cache.set(call, null);
                return null;
            }

            parts = parts.filter(part => !IGNORED_SUFFIXES.has(part) && !/^\d$/.test(part));

            if (parts.length === 1) {
                result = this.lookupPrefix(parts[0] ?? "");
            }
            else if (parts.length >= 2) {
                // the shorter part is the location prefix (3B9/M0CFW, M0CFW/3B9)
                const sorted = [...parts].sort((a, b) => a.length - b.length);
                const prefix = sorted[0] ?? "";
                result = this.lookupPrefix(prefix.length <= 4 ? prefix : (parts[0] ?? ""));
                if (!result) result = this.lookupPrefix(parts[0] ?? "");
            }

        }

        if (this.cache.size > 20000) this.cache.clear();

        this.cache.set(call, result);

        return result;

    }

    get(key: string): DxccEntity | undefined {

        if (!this.loaded) this.load();

        return this.byKey.get(key.toUpperCase());

    }

}


export const dxccService = new DxccService();
