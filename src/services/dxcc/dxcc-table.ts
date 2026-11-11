import { dxccService } from "./dxcc.service.js";
import { qsoService } from "../qso/qso-instance.js";
import { CallsignResolverService } from "../geo/callsign-resolver.service.js";
import { modeGroup } from "../needed/worked-index.js";


/*
 * DXCC table: all current entities (cty.dat) x bands, worked / confirmed.
 * Confirmed = "QSL received" in the log (LoTW confirmations later).
 */

export const DXCC_BANDS = ["160M", "80M", "60M", "40M", "30M", "20M", "17M", "15M", "12M", "10M", "6M"];

export type ModeFilter = "ALL" | "CW" | "PHONE" | "DIGI";

type Mark = "C" | "W";

export interface DxccRow {
    key: string;
    name: string;
    continent: string;
    flag: string;
    status: Mark | "";
    bands: Record<string, Mark>;
    qsos: number;
}

export interface DxccTable {
    mode: ModeFilter;
    bands: string[];
    total: number;
    worked: number;
    confirmed: number;
    perBand: Record<string, { worked: number; confirmed: number }>;
    rows: DxccRow[];
}


const resolver = new CallsignResolverService();
const flagCache = new Map<string, string>();


/* cty.dat names that differ from the ISO country names */
const FLAG_BY_ENTITY: Record<string, string> = {
    "european russia": "ru", "asiatic russia": "ru", "kaliningrad": "ru", "franz josef land": "ru",
    "european turkey": "tr", "asiatic turkey": "tr",
    "sardinia": "it", "african italy": "it", "sicily": "it",
    "balearic islands": "es", "canary islands": "es", "ceuta & melilla": "es",
    "madeira islands": "pt", "azores": "pt",
    "corsica": "fr", "crete": "gr", "dodecanese": "gr", "mount athos": "gr",
    "england": "gb-eng", "scotland": "gb-sct", "wales": "gb-wls", "northern ireland": "gb-nir",
    "shetland islands": "gb-sct",
    "hawaii": "us", "alaska": "us", "navassa island": "us", "baker & howland islands": "us",
    "johnston island": "us", "midway island": "us", "palmyra & jarvis islands": "us",
    "kure island": "us", "wake island": "us", "desecheo island": "us",
    "galapagos islands": "ec", "easter island": "cl", "juan fernandez islands": "cl",
    "san felix & san ambrosio": "cl", "fernando de noronha": "br", "st. peter & st. paul rocks": "br",
    "trindade & martim vaz": "br", "revillagigedo": "mx", "cocos island": "cr", "malpelo island": "co",
    "san andres & providencia": "co", "aves island": "ve", "bonaire": "bq", "curacao": "cw",
    "sint maarten": "sx", "saba & st. eustatius": "bq", "st. martin": "mf", "st. barthelemy": "bl",
    "us virgin islands": "vi", "british virgin islands": "vg", "turks & caicos islands": "tc",
    "lord howe island": "au", "willis island": "au", "macquarie island": "au", "mellish reef": "au",
    "heard island": "hm", "cocos (keeling) islands": "cc", "christmas island": "cx",
    "chesterfield islands": "nc", "new caledonia": "nc", "wallis & futuna islands": "wf",
    "french polynesia": "pf", "austral islands": "pf", "clipperton island": "fr", "marquesas islands": "pf",
    "kermadec islands": "nz", "chatham islands": "nz", "auckland & campbell islands": "nz",
    "north cook islands": "ck", "south cook islands": "ck", "temotu province": "sb",
    "rotuma island": "fj", "conway reef": "fj", "banaba island": "ki", "western kiribati": "ki",
    "central kiribati": "ki", "eastern kiribati": "ki", "minami torishima": "jp", "ogasawara": "jp",
    "spratly islands": "", "scarborough reef": "", "pratas island": "tw", "market reef": "ax",
    "aland islands": "ax", "jan mayen": "sj", "svalbard": "sj", "bear island": "sj", "bouvet": "bv",
    "peter 1 island": "aq", "antarctica": "aq", "south shetland islands": "aq", "south orkney islands": "aq",
    "south sandwich islands": "gs", "south georgia island": "gs", "falkland islands": "fk",
    "crozet island": "tf", "kerguelen islands": "tf", "amsterdam & st. paul is.": "tf",
    "glorioso islands": "tf", "juan de nova, europa": "tf", "tromelin island": "tf",
    "mayotte": "yt", "reunion island": "re", "rodriguez island": "mu", "agalega & st. brandon": "mu",
    "andaman & nicobar is.": "in", "lakshadweep islands": "in", "sable island": "ca", "st. paul island": "ca",
    "ascension island": "sh-ac", "st. helena": "sh-hl", "tristan da cunha & gough islands": "sh-ta",
    "chagos islands": "io", "pitcairn island": "pn", "ducie island": "pn", "guantanamo bay": "us",
    "us virgin is.": "vi", "fed. rep. of germany": "de", "republic of korea": "kr",
    "dem. rep. of korea": "kp", "dem. rep. of the congo": "cd", "republic of the congo": "cg",
    "vatican city": "va", "itu hq": "ch", "united nations hq": "un", "the gambia": "gm",
    "slovak republic": "sk", "czech republic": "cz", "republic of kosovo": "xk",
    "east malaysia": "my", "west malaysia": "my", "sardinia ": "it", "brunei darussalam": "bn",
    "timor - leste": "tl", "swaziland": "sz", "cape verde": "cv", "ivory coast": "ci",
    "st. kitts & nevis": "kn", "st. vincent": "vc", "st. lucia": "lc", "micronesia": "fm",
    "marshall islands": "mh", "mariana islands": "mp", "guam": "gu", "american samoa": "as",
    "swains island": "as", "samoa": "ws", "tokelau islands": "tk", "north macedonia": "mk",
    "macao": "mo", "hong kong": "hk", "taiwan": "tw", "palestine": "ps", "sov mil order of malta": "mt",
    "u.k. base areas on cyprus": "cy", "uk base areas on cyprus": "cy", "western sahara": "eh",
    "south sudan": "ss", "puerto rico": "pr", "minami torishima ": "jp", "annobon island": "gq",
    "equatorial guinea": "gq", "sao tome & principe": "st", "bosnia-herzegovina": "ba",
    "trinidad & tobago": "tt", "antigua & barbuda": "ag", "st. pierre & miquelon": "pm",
    "guernsey": "gg", "jersey": "je", "isle of man": "im", "gibraltar": "gi", "faroe islands": "fo",
    "greenland": "gl", "cayman islands": "ky", "montserrat": "ms", "anguilla": "ai", "bermuda": "bm",
    "aruba": "aw", "french guiana": "gf", "guadeloupe": "gp", "martinique": "mq", "norfolk island": "nf",
    "cabo verde": "cv", "dpr of korea": "kp", "myanmar": "mm", "republic of south sudan": "ss",
    "tristan da cunha & gough": "sh-ta", "serbia": "rs", "vietnam": "vn", "yemen": "ye", "zimbabwe": "zw", "france": "fr", "benin": "bj", "burkina faso": "bf",
    "niue": "nu", "tonga": "to", "tuvalu": "tv", "nauru": "nr", "vanuatu": "vu", "palau": "pw"
};


function normalizeName(name: string): string {

    return name
        .toLowerCase()
        .replace(/&/g, "and")
        .replace(/\bst\.\s*/g, "saint ")
        .replace(/\bis\.?$/g, "islands")
        .replace(/[^a-z0-9]+/g, " ")
        .trim();

}


let isoByName: Map<string, string> | null = null;

function isoNames(): Map<string, string> {

    if (isoByName) return isoByName;

    isoByName = new Map();

    try {

        const names = new Intl.DisplayNames(["en"], { type: "region" });

        for (let a = 65; a <= 90; a++) {
            for (let b = 65; b <= 90; b++) {
                const code = String.fromCharCode(a, b);
                const name = names.of(code);
                // first (current) code wins: BJ before the old DY for Benin
                if (name && name !== code && !isoByName.has(normalizeName(name))) {
                    isoByName.set(normalizeName(name), code.toLowerCase());
                }
            }
        }

    }
    catch {
        // no ICU data
    }

    return isoByName;

}


/* flag (ISO code) for an entity that is not in the log */
export function entityFlag(key: string, name: string): string {

    if (flagCache.has(key)) return flagCache.get(key) ?? "";

    const lower = name.toLowerCase().trim();

    let flag = FLAG_BY_ENTITY[lower] ?? isoNames().get(normalizeName(name)) ?? "";

    if (!flag && !(lower in FLAG_BY_ENTITY)) {
        const probe = /\d/.test(key) ? `${key}AA` : `${key}1AA`;
        flag = String(resolver.resolve(probe)?.countryCode ?? "").toLowerCase();
    }

    flagCache.set(key, flag);

    return flag;

}

function upgrade(current: Mark | "" | undefined, confirmed: boolean): Mark {

    return confirmed || current === "C" ? "C" : "W";

}


export function buildDxccTable(mode: ModeFilter = "ALL"): DxccTable {

    const rows = new Map<string, DxccRow>();

    for (const entity of dxccService.all()) {
        rows.set(entity.key, {
            key: entity.key,
            name: entity.name,
            continent: entity.continent,
            flag: "",
            status: "",
            bands: {},
            qsos: 0
        });
    }

    const logFlags = new Map<string, string>();

    for (const qso of qsoService.getWorkedRows()) {

        const entity = dxccService.resolve(qso.call);

        if (!entity) continue;

        const row = rows.get(entity.key);

        if (!row) continue;

        if (qso.country_code && !logFlags.has(entity.key)) {
            logFlags.set(entity.key, String(qso.country_code).toLowerCase());
        }

        if (mode !== "ALL") {
            const group = modeGroup(qso.mode);
            const matches = mode === "DIGI" ? ["FT8", "FT4", "DIGI"].includes(group) : group === mode;
            if (!matches) continue;
        }

        const confirmed = Number(qso.qsl_received) === 1;
        const band = String(qso.band || "").trim().toUpperCase();

        row.qsos++;
        row.status = upgrade(row.status, confirmed);

        if (DXCC_BANDS.includes(band)) {
            row.bands[band] = upgrade(row.bands[band], confirmed);
        }

    }

    const perBand: Record<string, { worked: number; confirmed: number }> = {};

    for (const band of DXCC_BANDS) perBand[band] = { worked: 0, confirmed: 0 };

    let worked = 0;
    let confirmed = 0;

    for (const row of rows.values()) {

        row.flag = logFlags.get(row.key) ?? entityFlag(row.key, row.name);

        if (row.status) worked++;
        if (row.status === "C") confirmed++;

        for (const [band, mark] of Object.entries(row.bands)) {
            const counter = perBand[band];
            if (!counter) continue;
            counter.worked++;
            if (mark === "C") counter.confirmed++;
        }

    }

    return {
        mode,
        bands: DXCC_BANDS,
        total: rows.size,
        worked,
        confirmed,
        perBand,
        rows: [...rows.values()].sort((a, b) => a.name.localeCompare(b.name))
    };

}
