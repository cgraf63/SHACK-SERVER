import { dxccService } from "../dxcc/dxcc.service.js";
import { qsoService } from "../qso/qso-instance.js";


/*
 * What is in the log, by DXCC entity (cty.dat main prefix) - not by
 * flag / ISO country: Ceuta & Melilla, Canary Islands, Asiatic Russia
 * etc. count as their own entities.
 *
 * Rebuilt at most every 60 s (cheap: one SELECT, resolver results cached).
 */

export type ModeGroup = "CW" | "PHONE" | "FT8" | "FT4" | "DIGI";

export function modeGroup(mode: string): ModeGroup {

    const m = String(mode || "").toUpperCase();

    if (m === "CW") return "CW";
    if (m === "FT8") return "FT8";
    if (m === "FT4") return "FT4";
    if (["SSB", "USB", "LSB", "AM", "FM", "PHONE", "DIGITALVOICE", "C4FM", "DSTAR", "DMR"].includes(m)) return "PHONE";

    return "DIGI";

}


export interface WorkedIndex {
    entities: Set<string>;
    entityBands: Set<string>;
    calls: Set<string>;
    callBands: Set<string>;
    callModes: Set<string>;
}


let index: WorkedIndex | null = null;
let builtAt = 0;

const MAX_AGE_MS = 60_000;


export function invalidateWorkedIndex(): void {

    index = null;

}


export function getWorkedIndex(): WorkedIndex {

    if (index && Date.now() - builtAt < MAX_AGE_MS) return index;

    const next: WorkedIndex = {
        entities: new Set(),
        entityBands: new Set(),
        calls: new Set(),
        callBands: new Set(),
        callModes: new Set()
    };

    for (const row of qsoService.getWorkedRows()) {

        const call = String(row.call || "").trim().toUpperCase();
        const band = String(row.band || "").trim().toUpperCase();

        if (!call) continue;

        next.calls.add(call);

        if (band) next.callBands.add(`${call}|${band}`);

        next.callModes.add(`${call}|${modeGroup(row.mode)}`);

        const entity = dxccService.resolve(call);

        if (entity) {
            next.entities.add(entity.key);
            if (band) next.entityBands.add(`${entity.key}|${band}`);
        }

    }

    index = next;
    builtAt = Date.now();

    return index;

}
