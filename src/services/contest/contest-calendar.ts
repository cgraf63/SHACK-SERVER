/*
 * Contest calendar: dates computed from the rules of the contests.
 *
 * Most contests have a fixed rule instead of a fixed date, e.g.
 * "CQ WW SSB: last full weekend of October, 00:00 UTC Saturday, 48 h".
 * The dates are computed for every year - nothing to maintain unless
 * a sponsor changes a rule. A "full weekend" = Saturday and Sunday in
 * the month.
 *
 * Rules as known in November 2026; "check" = verify against the
 * current announcement of the sponsor.
 */

type Day = "fri" | "sat" | "sun";

type When =
    | { weekend: number; month: number; day?: Day }       // n-th full weekend (1..5, -1 = last)
    | { weekday: number; nth: number; month: number }     // n-th weekday of the month (0 = Sunday)
    | { fixed: { month: number; day: number } };

export interface ContestRule {
    id: string;
    name: string;
    short: string;
    when: When;
    start: string;           // "HH:MM" UTC
    hours: number;
    modes: string[];
    bands: string[];
    exchange: "serial" | "cq_zone" | "itu_zone" | "locator" | "state" | "country" | "custom" | "none";
    multipliers?: string[];
    region: "World" | "EU" | "CH" | "NA" | "VHF";
    sponsor: string;
    url: string;
    note?: string;
    check?: boolean;
}

const HF = ["160m", "80m", "40m", "20m", "15m", "10m"];
const HF_NO160 = ["80m", "40m", "20m", "15m", "10m"];

export const CONTESTS: ContestRule[] = [

    // ----- world -----
    { id: "cqww-ssb", name: "CQ World Wide DX Contest SSB", short: "CQWW-SSB", when: { weekend: -1, month: 10 }, start: "00:00", hours: 48, modes: ["SSB"], bands: HF, exchange: "cq_zone", multipliers: ["dxcc", "cq_zone"], region: "World", sponsor: "CQ", url: "https://cqww.com" },
    { id: "cqww-cw", name: "CQ World Wide DX Contest CW", short: "CQWW-CW", when: { weekend: -1, month: 11 }, start: "00:00", hours: 48, modes: ["CW"], bands: HF, exchange: "cq_zone", multipliers: ["dxcc", "cq_zone"], region: "World", sponsor: "CQ", url: "https://cqww.com" },
    { id: "cqww-rtty", name: "CQ World Wide DX Contest RTTY", short: "CQWW-RTTY", when: { weekend: -1, month: 9 }, start: "00:00", hours: 48, modes: ["RTTY"], bands: HF_NO160, exchange: "cq_zone", multipliers: ["dxcc", "cq_zone", "state"], region: "World", sponsor: "CQ", url: "https://cqwwrtty.com" },
    { id: "cqwpx-ssb", name: "CQ WW WPX Contest SSB", short: "CQ-WPX-SSB", when: { weekend: -1, month: 3 }, start: "00:00", hours: 48, modes: ["SSB"], bands: HF, exchange: "serial", region: "World", sponsor: "CQ", url: "https://cqwpx.com" },
    { id: "cqwpx-cw", name: "CQ WW WPX Contest CW", short: "CQ-WPX-CW", when: { weekend: -1, month: 5 }, start: "00:00", hours: 48, modes: ["CW"], bands: HF, exchange: "serial", region: "World", sponsor: "CQ", url: "https://cqwpx.com" },
    { id: "cqwpx-rtty", name: "CQ WW WPX Contest RTTY", short: "CQ-WPX-RTTY", when: { weekend: 2, month: 2 }, start: "00:00", hours: 48, modes: ["RTTY"], bands: HF_NO160, exchange: "serial", region: "World", sponsor: "CQ", url: "https://cqwpxrtty.com" },
    { id: "cq160-cw", name: "CQ World Wide 160-Meter Contest CW", short: "CQ-160-CW", when: { weekend: -1, month: 1, day: "fri" }, start: "22:00", hours: 48, modes: ["CW"], bands: ["160m"], exchange: "country", region: "World", sponsor: "CQ", url: "https://cq160.com" },
    { id: "cq160-ssb", name: "CQ World Wide 160-Meter Contest SSB", short: "CQ-160-SSB", when: { weekend: -1, month: 2, day: "fri" }, start: "22:00", hours: 48, modes: ["SSB"], bands: ["160m"], exchange: "country", region: "World", sponsor: "CQ", url: "https://cq160.com" },
    { id: "arrldx-cw", name: "ARRL International DX Contest CW", short: "ARRL-DX-CW", when: { weekend: 3, month: 2 }, start: "00:00", hours: 48, modes: ["CW"], bands: HF, exchange: "custom", multipliers: ["state"], region: "World", sponsor: "ARRL", url: "https://www.arrl.org/arrl-dx", note: "DX sends RST + power, W/VE send RST + state" },
    { id: "arrldx-ssb", name: "ARRL International DX Contest SSB", short: "ARRL-DX-SSB", when: { weekend: 1, month: 3 }, start: "00:00", hours: 48, modes: ["SSB"], bands: HF, exchange: "custom", multipliers: ["state"], region: "World", sponsor: "ARRL", url: "https://www.arrl.org/arrl-dx", note: "DX sends RST + power, W/VE send RST + state" },
    { id: "arrl10", name: "ARRL 10-Meter Contest", short: "ARRL-10", when: { weekend: 2, month: 12 }, start: "00:00", hours: 48, modes: ["CW", "SSB"], bands: ["10m"], exchange: "serial", region: "World", sponsor: "ARRL", url: "https://www.arrl.org/10-meter" },
    { id: "arrl160", name: "ARRL 160-Meter Contest", short: "ARRL-160", when: { weekend: 1, month: 12, day: "fri" }, start: "22:00", hours: 42, modes: ["CW"], bands: ["160m"], exchange: "custom", region: "World", sponsor: "ARRL", url: "https://www.arrl.org/160-meter" },
    { id: "iaru-hf", name: "IARU HF World Championship", short: "IARU-HF", when: { weekend: 2, month: 7 }, start: "12:00", hours: 24, modes: ["CW", "SSB"], bands: HF, exchange: "itu_zone", multipliers: ["itu_zone"], region: "World", sponsor: "ARRL / IARU", url: "https://www.arrl.org/iaru-hf-championship", note: "HQ stations (e.g. HB9HQ) send their society" },
    { id: "wae-cw", name: "WAE DX Contest CW", short: "WAEDC-CW", when: { weekend: 2, month: 8 }, start: "00:00", hours: 48, modes: ["CW"], bands: HF_NO160, exchange: "serial", region: "World", sponsor: "DARC", url: "https://www.darc.de/der-club/referate/conteste/wae-dx-contest", note: "QTCs" },
    { id: "wae-ssb", name: "WAE DX Contest SSB", short: "WAEDC-SSB", when: { weekend: 2, month: 9 }, start: "00:00", hours: 48, modes: ["SSB"], bands: HF_NO160, exchange: "serial", region: "World", sponsor: "DARC", url: "https://www.darc.de/der-club/referate/conteste/wae-dx-contest", note: "QTCs" },
    { id: "wae-rtty", name: "WAE DX Contest RTTY", short: "WAEDC-RTTY", when: { weekend: 2, month: 11 }, start: "00:00", hours: 48, modes: ["RTTY"], bands: HF_NO160, exchange: "serial", region: "World", sponsor: "DARC", url: "https://www.darc.de/der-club/referate/conteste/wae-dx-contest", note: "QTCs" },
    { id: "iota", name: "RSGB IOTA Contest", short: "RSGB-IOTA", when: { weekend: -1, month: 7 }, start: "12:00", hours: 24, modes: ["CW", "SSB"], bands: HF_NO160, exchange: "serial", region: "World", sponsor: "RSGB", url: "https://www.rsgbiota.org", note: "RS(T) + serial + IOTA reference" },
    { id: "aadx-cw", name: "All Asian DX Contest CW", short: "AA-CW", when: { weekend: 3, month: 6 }, start: "00:00", hours: 48, modes: ["CW"], bands: HF, exchange: "custom", region: "World", sponsor: "JARL", url: "https://www.jarl.org/English/4_Library/A-4-3_Contests/A-4-3_Contests.htm", note: "RST + age", check: true },
    { id: "aadx-ssb", name: "All Asian DX Contest SSB", short: "AA-SSB", when: { weekend: 1, month: 9 }, start: "00:00", hours: 48, modes: ["SSB"], bands: HF, exchange: "custom", region: "World", sponsor: "JARL", url: "https://www.jarl.org/English/4_Library/A-4-3_Contests/A-4-3_Contests.htm", note: "RS + age", check: true },
    { id: "rdxc", name: "Russian DX Contest", short: "RDXC", when: { weekend: 3, month: 3 }, start: "12:00", hours: 24, modes: ["CW", "SSB"], bands: HF, exchange: "serial", region: "World", sponsor: "CQ-M / SRR", url: "https://www.rdxc.org" },

    // ----- Europe -----
    { id: "helvetia", name: "USKA Helvetia Contest", short: "HELVETIA", when: { weekend: -1, month: 4 }, start: "13:00", hours: 24, modes: ["CW", "SSB"], bands: HF, exchange: "serial", region: "CH", sponsor: "USKA", url: "https://uska.ch/en/helvetia-contest-2/", note: "HB stations send their canton", check: true },
    { id: "iaru-r1-vhf-mar", name: "IARU Region 1 VHF Contest (March)", short: "IARU-R1-MAR", when: { weekend: 1, month: 3 }, start: "14:00", hours: 24, modes: ["CW", "SSB"], bands: ["2m"], exchange: "locator", region: "VHF", sponsor: "IARU R1 / USKA", url: "https://uska.ch/en/contest/schweizer-contest-uhfvhf/", check: true },
    { id: "iaru-r1-vhf-may", name: "IARU Region 1 VHF Contest (May)", short: "IARU-R1-MAY", when: { weekend: 1, month: 5 }, start: "14:00", hours: 24, modes: ["CW", "SSB"], bands: ["2m"], exchange: "locator", region: "VHF", sponsor: "IARU R1 / USKA", url: "https://uska.ch/en/contest/schweizer-contest-uhfvhf/", check: true },
    { id: "iaru-r1-50", name: "IARU Region 1 50 MHz Contest", short: "IARU-R1-50", when: { weekend: 3, month: 6 }, start: "14:00", hours: 24, modes: ["CW", "SSB"], bands: ["6m"], exchange: "locator", region: "VHF", sponsor: "IARU R1", url: "https://www.iaru-r1.org", check: true },
    { id: "iaru-r1-vhf-sep", name: "IARU Region 1 VHF Contest (September)", short: "IARU-R1-VHF", when: { weekend: 1, month: 9 }, start: "14:00", hours: 24, modes: ["CW", "SSB"], bands: ["2m"], exchange: "locator", region: "VHF", sponsor: "IARU R1 / USKA", url: "https://uska.ch/en/contest/schweizer-contest-uhfvhf/", check: true },
    { id: "iaru-r1-uhf", name: "IARU Region 1 UHF / Microwave Contest", short: "IARU-R1-UHF", when: { weekend: 1, month: 10 }, start: "14:00", hours: 24, modes: ["CW", "SSB"], bands: [], exchange: "locator", region: "VHF", sponsor: "IARU R1 / USKA", url: "https://uska.ch/en/contest/schweizer-contest-uhfvhf/", note: "432 MHz and up", check: true },
    { id: "marconi", name: "Marconi Memorial VHF CW Contest", short: "MARCONI", when: { weekend: 1, month: 11 }, start: "14:00", hours: 24, modes: ["CW"], bands: ["2m"], exchange: "locator", region: "VHF", sponsor: "ARI", url: "https://www.ari.it", check: true },
    { id: "euhf", name: "European HF Championship", short: "EUHFC", when: { weekday: 6, nth: 1, month: 8 }, start: "12:00", hours: 12, modes: ["CW", "SSB"], bands: HF_NO160, exchange: "custom", region: "EU", sponsor: "SCC", url: "https://lea.hamradio.si/~scc/euhfc/", note: "RS(T) + last two digits of the licence year", check: true },
    { id: "wag", name: "Worked All Germany Contest", short: "WAG", when: { weekend: 3, month: 10 }, start: "15:00", hours: 24, modes: ["CW", "SSB"], bands: HF_NO160, exchange: "serial", region: "EU", sponsor: "DARC", url: "https://www.darc.de/der-club/referate/conteste/wag-contest", note: "DL stations send their DOK" },
    { id: "darc10", name: "DARC 10m Contest", short: "DARC-10", when: { weekday: 0, nth: 2, month: 1 }, start: "09:00", hours: 2, modes: ["CW", "SSB"], bands: ["10m"], exchange: "serial", region: "EU", sponsor: "DARC", url: "https://www.darc.de/der-club/referate/conteste/darc-10m-contest" },
    { id: "darc-xmas", name: "DARC Christmas Contest", short: "DARC-XMAS", when: { fixed: { month: 12, day: 26 } }, start: "08:30", hours: 2.5, modes: ["CW", "SSB"], bands: ["80m", "40m"], exchange: "serial", region: "EU", sponsor: "DARC", url: "https://www.darc.de/der-club/referate/conteste", check: true },
    { id: "agcw-hny", name: "AGCW Happy New Year Contest", short: "AGCW-HNY", when: { fixed: { month: 1, day: 1 } }, start: "09:00", hours: 3, modes: ["CW"], bands: ["80m", "40m", "20m"], exchange: "serial", region: "EU", sponsor: "AGCW", url: "https://www.agcw.de", check: true },
    { id: "ok-om", name: "OK/OM DX Contest CW", short: "OKOM-CW", when: { weekend: 2, month: 11 }, start: "12:00", hours: 24, modes: ["CW"], bands: HF, exchange: "serial", region: "EU", sponsor: "CRK", url: "https://okomdx.crk.cz", check: true },
    { id: "pacc", name: "PACC Contest", short: "PACC", when: { weekend: 2, month: 2 }, start: "12:00", hours: 24, modes: ["CW", "SSB"], bands: HF, exchange: "serial", region: "EU", sponsor: "VERON", url: "https://www.veron.nl/pacc", check: true },
    { id: "hadx", name: "HA DX Contest", short: "HA-DX", when: { weekend: 3, month: 1 }, start: "12:00", hours: 24, modes: ["CW", "SSB"], bands: HF, exchange: "serial", region: "EU", sponsor: "MRASZ", url: "https://ha-dx.com", check: true },
    { id: "spdx", name: "SP DX Contest", short: "SPDX", when: { weekend: 1, month: 4 }, start: "15:00", hours: 24, modes: ["CW", "SSB"], bands: HF, exchange: "serial", region: "EU", sponsor: "PZK", url: "https://spdxcontest.pzk.org.pl", check: true },
    { id: "ubadx-ssb", name: "UBA DX Contest SSB", short: "UBA-SSB", when: { weekend: -1, month: 1 }, start: "13:00", hours: 24, modes: ["SSB"], bands: HF_NO160, exchange: "serial", region: "EU", sponsor: "UBA", url: "https://www.uba.be/en/hf/contest-calendar", check: true },
    { id: "ubadx-cw", name: "UBA DX Contest CW", short: "UBA-CW", when: { weekend: -1, month: 2 }, start: "13:00", hours: 24, modes: ["CW"], bands: HF_NO160, exchange: "serial", region: "EU", sponsor: "UBA", url: "https://www.uba.be/en/hf/contest-calendar", check: true },
    { id: "yodx", name: "YO DX HF Contest", short: "YODX", when: { weekend: -1, month: 8 }, start: "12:00", hours: 24, modes: ["CW", "SSB"], bands: HF_NO160, exchange: "serial", region: "EU", sponsor: "FRR", url: "https://www.yodx.ro", check: true },

    // ----- North America -----
    { id: "ss-cw", name: "ARRL November Sweepstakes CW", short: "SS-CW", when: { weekend: 1, month: 11 }, start: "21:00", hours: 30, modes: ["CW"], bands: HF, exchange: "custom", region: "NA", sponsor: "ARRL", url: "https://www.arrl.org/sweepstakes", note: "W/VE only" },
    { id: "ss-ssb", name: "ARRL November Sweepstakes SSB", short: "SS-SSB", when: { weekend: 3, month: 11 }, start: "21:00", hours: 30, modes: ["SSB"], bands: HF, exchange: "custom", region: "NA", sponsor: "ARRL", url: "https://www.arrl.org/sweepstakes", note: "W/VE only" }

];

const DAY_OFFSET: Record<Day, number> = { fri: -1, sat: 0, sun: 1 };

/* Saturday (UTC midnight) of the n-th full weekend of a month (n = -1: last) */
function fullWeekendSaturday(year: number, month: number, n: number): Date | null {
    const saturdays: Date[] = [];
    for (let day = 1; day <= 31; day++) {
        const date = new Date(Date.UTC(year, month - 1, day));
        if (date.getUTCMonth() !== month - 1) break;
        if (date.getUTCDay() !== 6) continue;
        const sunday = new Date(date.getTime() + 86_400_000);
        if (sunday.getUTCMonth() === month - 1) saturdays.push(date);
    }
    if (!saturdays.length) return null;
    return n < 0 ? saturdays[saturdays.length + n] ?? null : saturdays[n - 1] ?? null;
}

function nthWeekday(year: number, month: number, weekday: number, nth: number): Date | null {
    const days: Date[] = [];
    for (let day = 1; day <= 31; day++) {
        const date = new Date(Date.UTC(year, month - 1, day));
        if (date.getUTCMonth() !== month - 1) break;
        if (date.getUTCDay() === weekday) days.push(date);
    }
    return nth < 0 ? days[days.length + nth] ?? null : days[nth - 1] ?? null;
}

/* start and end of a contest in a year (UTC) */
export function occurrence(rule: ContestRule, year: number): { start: Date; end: Date } | null {

    let day: Date | null = null;
    const when = rule.when;

    if ("weekend" in when) {
        const saturday = fullWeekendSaturday(year, when.month, when.weekend);
        if (saturday) day = new Date(saturday.getTime() + DAY_OFFSET[when.day ?? "sat"] * 86_400_000);
    }
    else if ("weekday" in when) {
        day = nthWeekday(year, when.month, when.weekday, when.nth);
    }
    else {
        day = new Date(Date.UTC(year, when.fixed.month - 1, when.fixed.day));
    }

    if (!day) return null;

    const [hh, mm] = rule.start.split(":").map(Number);
    const start = new Date(day.getTime() + ((hh ?? 0) * 60 + (mm ?? 0)) * 60_000);
    const end = new Date(start.getTime() + rule.hours * 3_600_000);
    return { start, end };

}

export interface ContestEvent extends Omit<ContestRule, "when"> {
    start: string;
    end: string;
    running: boolean;
}

/* contests running now or starting within `days` days */
export function upcomingContests(days = 60, now = new Date()): ContestEvent[] {

    const until = now.getTime() + days * 86_400_000;
    const years = [now.getUTCFullYear(), now.getUTCFullYear() + 1];
    const events: ContestEvent[] = [];

    for (const rule of CONTESTS) {
        for (const year of years) {
            const occ = occurrence(rule, year);
            if (!occ) continue;
            if (occ.end.getTime() < now.getTime() || occ.start.getTime() > until) continue;
            const { when: _when, ...rest } = rule;
            events.push({
                ...rest,
                start: occ.start.toISOString(),
                end: occ.end.toISOString(),
                running: occ.start.getTime() <= now.getTime() && now.getTime() < occ.end.getTime()
            });
        }
    }

    return events.sort((a, b) => a.start.localeCompare(b.start));

}
