/*
 * ADIF export of one QSO for the online logbooks
 * (QRZ.com, Club Log, LoTW).
 *
 * Frequencies are stored in different units in SHACK-SERVER
 * (log: MHz, contest log: kHz, older entries partly Hz) -
 * normalizeFrequencyMHz() handles all of them.
 */

export interface UploadQso {

    call: string;
    qso_date: string;          // YYYY-MM-DD or YYYYMMDD
    time_on_utc: string;       // HH:MM[:SS] or HHMM[SS]
    time_off_utc?: string | null;
    frequency: number;         // MHz, kHz or Hz
    band: string;
    mode: string;
    rst_sent?: string | null;
    rst_rcvd?: string | null;
    my_callsign?: string | null;
    operator_name?: string | null;
    my_grid?: string | null;
    dx_grid?: string | null;
    name?: string | null;
    country?: string | null;
    cq_zone?: number | null;
    itu_zone?: number | null;
    notes?: string | null;

    /* Contest QSOs */
    contest_id?: string | null;
    stx_string?: string | null;
    srx_string?: string | null;

}


export function normalizeFrequencyMHz(value: number): number | null {

    const frequency = Number(value);

    if (!Number.isFinite(frequency) || frequency <= 0) {
        return null;
    }

    if (frequency >= 1_000_000) {
        return frequency / 1_000_000;      // Hz
    }

    if (frequency >= 1_000) {
        return frequency / 1_000;          // kHz
    }

    return frequency;                      // MHz

}


/*
 * Band from frequency (MHz), used when the stored band is missing.
 */
const BANDS: Array<[number, number, string]> = [
    [1.8, 2.0, "160M"], [3.5, 4.0, "80M"], [5.06, 5.45, "60M"],
    [7.0, 7.3, "40M"], [10.1, 10.15, "30M"], [14.0, 14.35, "20M"],
    [18.068, 18.168, "17M"], [21.0, 21.45, "15M"], [24.89, 24.99, "12M"],
    [28.0, 29.7, "10M"], [50.0, 54.0, "6M"], [144.0, 148.0, "2M"],
    [420.0, 450.0, "70CM"]
];

function bandFromMHz(mhz: number | null): string {

    if (mhz === null) {
        return "";
    }

    return BANDS.find(([low, high]) => mhz >= low && mhz <= high)?.[2] ?? "";

}

function normalizeBand(band: string, mhz: number | null): string {

    const text = String(band || "").trim().toUpperCase();

    if (!text) {
        return bandFromMHz(mhz);
    }

    return /^\d+(\.\d+)?$/.test(text) ? `${text}M` : text;

}


/*
 * ADIF modes: USB/LSB are submodes of SSB, FT4/JS8 of MFSK.
 */
function adifMode(mode: string): { mode: string; submode?: string } {

    const text = String(mode || "").trim().toUpperCase();

    switch (text) {
        case "USB":
        case "LSB":
            return { mode: "SSB", submode: text };
        case "PH":
        case "PHONE":
            return { mode: "SSB" };
        case "FT4":
        case "JS8":
        case "Q65":
            return { mode: "MFSK", submode: text };
        case "RY":
            return { mode: "RTTY" };
        case "CW-R":
        case "CWR":
            return { mode: "CW" };
        default:
            return { mode: text };
    }

}


/*
 * ADIF OPERATOR must be a callsign. The log stores names
 * ("Christoph") or "HB9GNZ – Michel" - take the callsign only.
 */
function operatorCallsign(value: string | null | undefined): string | null {

    for (const token of String(value || "").toUpperCase().split(/[\s,;–-]+/)) {
        if (/^[A-Z0-9]{1,3}[0-9][A-Z0-9]*(\/[A-Z0-9]+)?$/.test(token) && /[A-Z]/.test(token)) {
            return token;
        }
    }

    return null;

}


export function qsoToAdif(qso: UploadQso): string {

    const fields: string[] = [];

    const add = (
        name: string,
        value: string | number | null | undefined
    ): void => {

        if (value === null || value === undefined) {
            return;
        }

        const text = String(value).trim();

        if (!text) {
            return;
        }

        fields.push(`<${name}:${text.length}>${text}`);

    };

    const digits = (value: string | null | undefined): string =>
        String(value || "").replace(/\D/g, "");

    const mhz = normalizeFrequencyMHz(qso.frequency);
    const mode = adifMode(qso.mode);

    add("CALL", String(qso.call || "").toUpperCase());
    add("QSO_DATE", digits(qso.qso_date).slice(0, 8));
    add("TIME_ON", digits(qso.time_on_utc).slice(0, 6));
    add("TIME_OFF", digits(qso.time_off_utc).slice(0, 6));
    add("BAND", normalizeBand(qso.band, mhz));
    add("FREQ", mhz !== null ? mhz.toFixed(6) : null);
    add("MODE", mode.mode);
    add("SUBMODE", mode.submode);
    add("RST_SENT", qso.rst_sent);
    add("RST_RCVD", qso.rst_rcvd);
    add("STATION_CALLSIGN", qso.my_callsign ? qso.my_callsign.toUpperCase() : null);
    add("OPERATOR", operatorCallsign(qso.operator_name));
    add("MY_GRIDSQUARE", qso.my_grid);
    add("GRIDSQUARE", qso.dx_grid);
    add("NAME", qso.name);
    add("COUNTRY", qso.country);
    add("CQZ", qso.cq_zone);
    add("ITUZ", qso.itu_zone);
    add("CONTEST_ID", qso.contest_id);
    add("STX_STRING", qso.stx_string);
    add("SRX_STRING", qso.srx_string);
    add("COMMENT", qso.notes);

    return fields.join("") + "<EOR>";

}
