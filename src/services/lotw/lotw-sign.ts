import { sign } from "node:crypto";
import { gzipSync } from "node:zlib";

import { normalizeFrequencyMHz, type UploadQso } from "../upload/adif-export.js";
import type { LotwCredentials } from "./lotw-cert.js";


/*
 * Signed LoTW log (.tq8) without TQSL.
 *
 * Format as written by TQSL 2.x (and by Wavelog, which uploads to
 * LoTW the same way): an ADIF-like "GABBI" file with
 *   tCERT     the callsign certificate (base64 DER)
 *   tSTATION  station location (call, DXCC, grid, CQ, ITU zone)
 *   tCONTACT  one per QSO with SIGN_LOTW_V2.0 = base64 RSA-SHA1
 *             signature over SIGNDATA
 * SIGNDATA is the concatenation (upper case) of the station fields
 * CQZ, GRIDSQUARE, ITUZ and the QSO fields BAND, CALL, FREQ, MODE,
 * QSO_DATE, QSO_TIME in this order. The file is gzip compressed.
 *
 * Not supported yet: US state / county, Canadian province and the
 * other sub-division fields (needed for WAS, ... credit).
 */

export interface StationLocation {
    callsign: string;
    dxcc: number;
    grid: string;
    cqZone: number | null;
    ituZone: number | null;
}

export interface SignedLog {
    gzip: Buffer;
    text: string;
    /* index in the input list -> reason, for QSOs left out */
    skipped: Map<number, string>;
    included: number[];
}


const TQSL_IDENT = "TQSL V2.8.2 Lib: V2.6 Config: V11.34 AllowDupes: false";


function field(name: string, value: string | number): string {

    const text = String(value);

    return `<${name}:${Buffer.byteLength(text, "latin1")}>${text}\n`;

}

/* LoTW band names: 20M, 70CM ... */
function lotwBand(band: string, mhz: number | null): string {

    const b = String(band || "").trim().toUpperCase();

    if (/^\d+(\.\d+)?(M|CM|MM)$/.test(b)) return b;

    if (mhz === null) return "";

    const table: Array<[number, number, string]> = [
        [0.1357, 0.1378, "2190M"], [0.472, 0.479, "630M"], [1.8, 2.0, "160M"], [3.5, 4.0, "80M"],
        [5.06, 5.45, "60M"], [7.0, 7.3, "40M"], [10.1, 10.15, "30M"], [14.0, 14.35, "20M"],
        [18.068, 18.168, "17M"], [21.0, 21.45, "15M"], [24.89, 24.99, "12M"], [28.0, 29.7, "10M"],
        [50.0, 54.0, "6M"], [70.0, 71.0, "4M"], [144.0, 148.0, "2M"], [222.0, 225.0, "1.25M"],
        [420.0, 450.0, "70CM"], [1240.0, 1300.0, "23CM"]
    ];

    return table.find(([from, to]) => mhz >= from && mhz <= to)?.[2] ?? "";

}

/* ADIF mode as LoTW expects it (same mapping idea as Wavelog) */
export function lotwMode(mode: string): string {

    const m = String(mode || "").trim().toUpperCase();

    if (["SSB", "USB", "LSB", "PHONE"].includes(m)) return "SSB";
    if (/^CW/.test(m)) return "CW";
    if (/^RTTY/.test(m)) return "RTTY";
    if (/^AM/.test(m)) return "AM";
    if (m === "FM" || m === "FM-N") return "FM";
    if (/^C4FM/.test(m) || m === "DSTAR" || m === "DMR") return "DIGITALVOICE";
    if (m === "PSK" || m === "BPSK31") return "PSK31";
    if (/^DATA/.test(m) || m === "PKT") return "DATA";

    return m;

}

function isoDate(value: string): string {

    const digits = String(value || "").replace(/\D/g, "");

    return digits.length >= 8 ? `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}` : "";

}

function isoTime(value: string): string {

    const digits = String(value || "").replace(/\D/g, "");

    if (digits.length < 4) return "";

    return `${digits.slice(0, 2)}:${digits.slice(2, 4)}:${(digits.slice(4, 6) || "00").padEnd(2, "0")}`;

}

function freqText(mhz: number): string {

    return String(Number(mhz.toFixed(6)));

}

function gridOf(value: string | null | undefined): string {

    const grid = String(value || "").trim().toUpperCase();

    if (/^[A-R]{2}\d{2}([A-X]{2})?/.test(grid)) {
        return grid.length >= 6 && /^[A-R]{2}\d{2}[A-X]{2}/.test(grid) ? grid.slice(0, 6) : grid.slice(0, 4);
    }

    return "";

}


/*
 * Build the signed log for one certificate.
 * station: default location; QSOs with their own my_grid get their own
 * station record (portable operation).
 */
export function buildSignedLog(credentials: LotwCredentials, station: StationLocation, qsos: UploadQso[]): SignedLog {

    const info = credentials.info;
    const skipped = new Map<number, string>();
    const included: number[] = [];

    const certBody = credentials.certificatePem
        .replace(/-----BEGIN CERTIFICATE-----/, "")
        .replace(/-----END CERTIFICATE-----/, "")
        .trim();

    let out = field("TQSL_IDENT", TQSL_IDENT).replace(/\n$/, "\n\n");

    out += field("Rec_Type", "tCERT");
    out += field("CERT_UID", 1);
    out += `<CERTIFICATE:${certBody.length + 1}>${certBody}\n`;
    out += "<eor>\n\n";

    // station records: one per grid square
    const stations = new Map<string, number>();

    const stationFor = (grid: string): number => {

        const existing = stations.get(grid);
        if (existing) return existing;

        const uid = stations.size + 1;
        stations.set(grid, uid);

        out += field("Rec_Type", "tSTATION");
        out += field("STATION_UID", uid);
        out += field("CERT_UID", 1);
        out += field("CALL", info.callsign);
        out += field("DXCC", info.dxcc);
        if (grid) out += field("GRIDSQUARE", grid);
        if (station.ituZone) out += field("ITUZ", station.ituZone);
        if (station.cqZone) out += field("CQZ", station.cqZone);
        out += "<eor>\n\n";

        return uid;

    };

    const defaultGrid = gridOf(station.grid);

    qsos.forEach((qso, index) => {

        const call = String(qso.call || "").trim().toUpperCase();
        const mhz = normalizeFrequencyMHz(qso.frequency);
        const band = lotwBand(qso.band, mhz);
        const mode = lotwMode(qso.mode);
        const date = isoDate(qso.qso_date);
        const time = isoTime(qso.time_on_utc);

        if (!call || !band || !mode || !date || !time) {
            skipped.set(index, "LoTW: QSO incomplete (call, band, mode, date or time missing)");
            return;
        }

        if ((info.qsoFirstDate && date < info.qsoFirstDate) || (info.qsoEndDate && date > info.qsoEndDate)) {
            skipped.set(index, `LoTW: QSO date outside the certificate period ${info.qsoFirstDate} - ${info.qsoEndDate}`);
            return;
        }

        const grid = gridOf(qso.my_grid) || defaultGrid;
        const uid = stationFor(grid);
        const freq = mhz !== null ? freqText(mhz) : "";

        const signData = [
            station.cqZone ?? "",
            grid,
            station.ituZone ?? "",
            band,
            call,
            freq,
            mode,
            date,
            `${time}Z`
        ].join("").toUpperCase();

        const signature = sign("sha1", Buffer.from(signData, "latin1"), credentials.key).toString("base64");

        let contact = "";
        contact += field("Rec_Type", "tCONTACT");
        contact += field("STATION_UID", uid);
        contact += field("CALL", call);
        contact += field("BAND", band);
        contact += field("MODE", mode);
        if (freq) contact += field("FREQ", freq);
        contact += field("QSO_DATE", date);
        contact += field("QSO_TIME", `${time}Z`);

        // signature in lines of 64 characters, length incl. line breaks
        const lines: string[] = [];
        for (let i = 0; i < signature.length; i += 64) lines.push(signature.slice(i, i + 64));
        contact += `<SIGN_LOTW_V2.0:${signature.length + Math.floor(signature.length / 64) + 1}:6>${lines.join("\n")}\n`;
        contact += field("SIGNDATA", signData);
        contact += "<eor>\n\n";

        out += contact;
        included.push(index);

    });

    return { gzip: gzipSync(Buffer.from(out, "latin1"), { level: 9 }), text: out, skipped, included };

}
