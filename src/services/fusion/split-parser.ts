/*
 * Split information in DX spot comments.
 *
 *   "UP 2", "UP2", "up 1-3" (middle), "2 UP", "DOWN 1", "DN 3"
 *   "LSN 1 UP", "QSX 2 UP" (UP / DOWN wins over a QSX number)
 *   "QSX 14025", "QSX 14.025", "QSX 025" / "QSX 25" (last digits),
 *   "LSN 14.205", "LISTENING 7165"
 *   "LSN UP", "QRZ UP", "PSE UP", a comment that is just "UP"
 *     -> default offset: CW / RTTY 2 kHz, SSB 5 kHz
 *
 * FT8 / FT4 / other digital modes: no split (DXpedition mode is done
 * in WSJT-X). Sanity: offset up to 30 kHz, QSX within 60 kHz of the
 * spot frequency.
 */

export interface SplitInfo {
    /* TX frequency in kHz */
    txKhz: number;
    /* TX - RX in kHz */
    offsetKhz: number;
    /* short text for the badge, e.g. "UP 2", "QSX 14.025" */
    label: string;
}

const MAX_OFFSET_KHZ = 30;
const MAX_QSX_DISTANCE_KHZ = 60;

const DIGITAL = new Set(["FT8", "FT4", "JS8", "PSK", "PSK31", "WSPR", "DIGITAL", "DIGI", "MSK144", "Q65", "JT65", "JT9", "FST4"]);

function num(value: string | undefined): number {

    return Number(String(value ?? "").replace(",", "."));

}

function round(khz: number): number {

    return Math.round(khz * 10) / 10;

}

function defaultOffset(mode: string): number {

    const m = mode.toUpperCase();

    return m === "SSB" || m === "USB" || m === "LSB" || m === "AM" || m === "FM" ? 5 : 2;

}

/* "QSX 25" / "QSX 025" -> the nearest frequency with these last digits */
function expandShortQsx(digits: string, rxKhz: number): number | null {

    const value = Number(digits);
    const step = digits.length <= 2 ? 100 : 1000;
    const base = Math.floor(rxKhz / step) * step;

    const candidates = [base - step + value, base + value, base + step + value];

    let best: number | null = null;

    for (const candidate of candidates) {
        if (best === null || Math.abs(candidate - rxKhz) < Math.abs(best - rxKhz)) best = candidate;
    }

    return best;

}

function qsxValue(raw: string, rxKhz: number): number | null {

    const text = raw.replace(",", ".");
    const value = Number(text);

    if (!Number.isFinite(value) || value <= 0) return null;

    // MHz: 14.025, 7.165, 3.799
    if (text.includes(".") && value < 100) return value * 1000;

    // kHz: 14025, 7165, 14025.5
    if (value >= 1000) return value;

    // last digits: 025, 25, 195 (a single digit is too vague)
    if (/^\d{2,3}$/.test(text)) return expandShortQsx(text, rxKhz);

    return null;

}


export function parseSplit(comment: string | undefined, rxKhz: number, mode: string): SplitInfo | null {

    if (!comment || !Number.isFinite(rxKhz) || rxKhz <= 0) return null;

    const m = String(mode || "").toUpperCase();

    if (DIGITAL.has(m)) return null;

    const text = ` ${comment.toUpperCase().replace(/\s+/g, " ")} `;

    /* UP 2 / UP2 / UP 1-3 / DOWN 1 / DN 2 */
    const updown =
        /\b(UP|DN|DWN|DOWN)\s*(\d{1,2}(?:[.,]\d)?)(?:\s*-\s*(\d{1,2}(?:[.,]\d)?))?\s*(?:K|KHZ)?\b/.exec(text) ??
        null;

    /* 2 UP / 5UP / 1-3 UP */
    const reversed =
        updown ? null : /\b(\d{1,2}(?:[.,]\d)?)(?:\s*-\s*(\d{1,2}(?:[.,]\d)?))?\s*(?:K|KHZ)?\s*(UP|DN|DWN|DOWN)\b/.exec(text);

    let direction = "";
    let from = NaN;
    let to = NaN;

    if (updown) {
        direction = updown[1] ?? "";
        from = num(updown[2]);
        to = updown[3] ? num(updown[3]) : from;
    }
    else if (reversed) {
        direction = reversed[3] ?? "";
        from = num(reversed[1]);
        to = reversed[2] ? num(reversed[2]) : from;
    }

    if (direction && Number.isFinite(from) && Number.isFinite(to)) {


        const offset = (from + to) / 2;

        if (offset > 0 && offset <= MAX_OFFSET_KHZ) {

            const sign = direction === "UP" ? 1 : -1;
            const range = from !== to ? `${from}-${to}` : `${from}`;

            return {
                txKhz: round(rxKhz + sign * offset),
                offsetKhz: round(sign * offset),
                label: `${sign > 0 ? "UP" : "DN"} ${range}`
            };

        }

    }

    /* QSX / LSN / LISTENING <frequency> */
    const qsx = /\b(?:QSX|LSN|LIS|LSTN|LISTEN(?:ING)?)\s*:?\s*(\d{1,5}(?:[.,]\d{1,3})?)(?![\d.,])/.exec(text);

    if (qsx) {

        const tx = qsxValue(qsx[1] ?? "", rxKhz);

        if (tx !== null && Math.abs(tx - rxKhz) <= MAX_QSX_DISTANCE_KHZ && Math.abs(tx - rxKhz) >= 0.1) {
            const txKhz = round(tx);
            return {
                txKhz,
                offsetKhz: round(txKhz - rxKhz),
                label: `QSX ${(txKhz / 1000).toFixed(3)}`
            };
        }

    }

    /* bare UP: only in clear phrases */
    if (/\b(?:LSN|LIS|LSTN|LISTEN(?:ING)?|QRZ|PSE|PLS|SPLIT|QSX)\s+UP\b/.test(text) || /^\s*UP\s*!*\s*$/.test(text)) {

        const offset = defaultOffset(m);

        return {
            txKhz: round(rxKhz + offset),
            offsetKhz: offset,
            label: "UP"
        };

    }

    return null;

}


/* Newest comment first */
export function splitFromComments(comments: string[] | undefined, rxKhz: number, mode: string): SplitInfo | null {

    for (const comment of [...(comments ?? [])].reverse()) {

        const split = parseSplit(comment, rxKhz, mode);

        if (split) return split;

    }

    return null;

}
