export interface ParsedAdifQso {
    qso_date: string;
    time_on_utc: string;
    time_off_utc: string | null;

    call: string;

    frequency: number;
    band: string;
    mode: string;

    rst_sent: string;
    rst_rcvd: string;

    my_callsign: string;
    my_grid: string;
    operator_name: string;

    name: string | null;
    country: string | null;
    country_code: string | null;
    dx_grid: string | null;

    itu_zone: number | null;
    cq_zone: number | null;

    notes: string | null;

    spot_source: string | null;
    spot_id: string | null;
}

function fields(record: string): Record<string, string> {

    const result: Record<string, string> = {};

    const regex =
        /<([^:>]+)(?::[^>]*)?>([^<]*)/gi;

    let match: RegExpExecArray | null;

    while ((match = regex.exec(record)) !== null) {

        const key =
        match[1]?.trim().toUpperCase() || "";



        result[key] =
            match[2]?.trim() || "";

    }

    return result;
}

function normalizeTime(value?: string): string {

    if (!value) {
        return "";
    }

    const cleaned =
        value
            .trim()
            .replace(/[^0-9]/g, "");

    if (cleaned.length >= 6) {

        return (
            cleaned.substring(0, 2) +
            ":" +
            cleaned.substring(2, 4) +
            ":" +
            cleaned.substring(4, 6)
        );

    }

    if (cleaned.length === 4) {

        return (
            cleaned.substring(0, 2) +
            ":" +
            cleaned.substring(2, 4) +
            ":00"
        );

    }

    return "";
}

function numberOrNull(value?: string): number | null {

    if (!value) {
        return null;
    }

    const number =
        Number(value);

    return Number.isFinite(number)
        ? number
        : null;
}

export function parseAdif(
    content: string
): ParsedAdifQso[] {

    const records =
        content
            .split(
                /<eor\s*>/i
            );

    const result: ParsedAdifQso[] = [];

    for (const record of records) {

        if (!record.trim()) {
            continue;
        }

        const f =
            fields(record);

        const call =
            (f.CALL || "")
                .trim()
                .toUpperCase();

        const date =
            (f.QSO_DATE || "")
                .trim();

        const timeOn =
            normalizeTime(
                f.TIME_ON
            );

        if (
            !call ||
            !/^\d{8}$/.test(date) ||
            !timeOn
        ) {
            continue;
        }

        const freqMHz =
            numberOrNull(
                f.FREQ
            );

        const frequency =
            freqMHz !== null
                ? Math.round(
                    freqMHz * 1000000
                )
                : 0;

        result.push({

            qso_date:
                date.substring(0, 4) +
                "-" +
                date.substring(4, 6) +
                "-" +
                date.substring(6, 8),

            time_on_utc:
                timeOn,

            time_off_utc:
                normalizeTime(
                    f.TIME_OFF
                ) || null,

            call,

            frequency,

            band:
                (f.BAND || "")
                    .trim(),

            mode:
                (f.MODE || "")
                    .trim()
                    .toUpperCase(),

            rst_sent:
                (f.RST_SENT || "59")
                    .trim(),

            rst_rcvd:
                (f.RST_RCVD || "59")
                    .trim(),

            my_callsign:
                (
                    f.STATION_CALLSIGN ||
                    f.MY_CALLSIGN ||
                    ""
                )
                .trim()
                .toUpperCase(),

            my_grid:
                (
                    f.MY_GRIDSQUARE ||
                    f.MY_GRID ||
                    ""
                )
                .trim()
                .toUpperCase(),

            operator_name:
                (
                    f.OPERATOR ||
                    ""
                )
                .trim(),

            name:
                f.NAME
                    ? f.NAME.trim()
                    : null,

            country:
                f.COUNTRY
                    ? f.COUNTRY.trim()
                    : null,

            country_code:
                null,

            dx_grid:
                (
                    f.GRIDSQUARE ||
                    ""
                )
                .trim()
                .toUpperCase() || null,

            itu_zone:
                numberOrNull(
                    f.ITUZ
                ),

            cq_zone:
                numberOrNull(
                    f.CQZ
                ),

            notes:
                f.COMMENT
                    ? f.COMMENT.trim()
                    : null,

            spot_source:
                null,

            spot_id:
                null

        });

    }

    return result;
}
