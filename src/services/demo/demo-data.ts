import { qsoService } from "../qso/qso-instance.js";
import { contestService } from "../contest/contest.service.js";
import { settingsService } from "../settings/settings.service.js";


/*
 * Sample data for the demo version: station settings, a small log
 * and one finished CQ WW contest session. Only written into an empty
 * installation (first start of the container).
 */

const STATION = {
    callsign: "N0CALL",
    operatorName: "Demo",
    locator: "JN47",
    club: ""
};

/* [call, MHz, band, mode, country, code, cq, itu, grid] */
const LOG: Array<[string, number, string, string, string, string, number, number, string]> = [
    ["JA1XYZ", 14.074, "20m", "FT8", "Japan", "jp", 25, 45, "PM95"],
    ["VK2ABC", 14.205, "20m", "USB", "Australia", "au", 30, 59, "QF56"],
    ["W1AW", 14.040, "20m", "CW", "United States", "us", 5, 8, "FN31"],
    ["PY2XX", 21.270, "15m", "USB", "Brazil", "br", 11, 15, "GG66"],
    ["ZS6AB", 21.074, "15m", "FT8", "South Africa", "za", 38, 57, "KG44"],
    ["LU1XY", 28.480, "10m", "USB", "Argentina", "ar", 13, 14, "GF05"],
    ["9V1XX", 28.074, "10m", "FT8", "Singapore", "sg", 28, 54, "OJ11"],
    ["DL1ABC", 7.090, "40m", "LSB", "Germany", "de", 14, 28, "JO62"],
    ["F5XYZ", 7.030, "40m", "CW", "France", "fr", 14, 27, "JN18"],
    ["G4ABC", 3.760, "80m", "LSB", "England", "gb", 14, 27, "IO91"],
    ["OH2XX", 14.025, "20m", "CW", "Finland", "fi", 15, 18, "KP20"],
    ["EA8ABC", 18.130, "17m", "USB", "Canary Islands", "es", 33, 36, "IL18"],
    ["5B4XY", 24.950, "12m", "USB", "Cyprus", "cy", 20, 39, "KM64"],
    ["VE3XYZ", 14.230, "20m", "USB", "Canada", "ca", 4, 4, "FN03"],
    ["4X1AB", 21.025, "15m", "CW", "Israel", "il", 20, 39, "KM72"],
    ["UA9XX", 14.074, "20m", "FT8", "Asiatic Russia", "ru", 17, 31, "MO05"],
    ["CT1ABC", 7.074, "40m", "FT8", "Portugal", "pt", 14, 37, "IM58"],
    ["SV1XY", 18.100, "17m", "FT8", "Greece", "gr", 20, 28, "KM18"],
    ["HB9XYZ", 3.573, "80m", "FT8", "Switzerland", "ch", 14, 28, "JN47"],
    ["I2ABC", 50.313, "6m", "FT8", "Italy", "it", 15, 28, "JN45"]
];

const CONTEST_CALLS: Array<[string, string, string]> = [
    ["DL5XX", "14", "40"], ["OK1ABC", "15", "40"], ["S51XY", "15", "40"],
    ["9A1XX", "15", "40"], ["G3XYZ", "14", "40"], ["EA3ABC", "14", "40"],
    ["OH6XY", "15", "20"], ["UA3XX", "16", "20"], ["W3ABC", "5", "20"],
    ["K1XYZ", "5", "20"], ["JA7XX", "25", "20"], ["VE9ABC", "5", "20"],
    ["LZ1XY", "20", "15"], ["YO3XX", "20", "15"], ["SP9ABC", "15", "15"],
    ["PY1XY", "11", "15"], ["CX2XX", "13", "10"], ["ZS1ABC", "38", "10"]
];


export function seedDemoData(): void {

    const settings = settingsService.get();

    if (!settings.callsign) {
        settingsService.update(STATION as any);
    }

    if (qsoService.getAllQso().length === 0) {

        const today = new Date();

        LOG.forEach(([call, mhz, band, mode, country, code, cq, itu, grid], index) => {

            const date = new Date(today.getTime() - (index + 1) * 26 * 3600_000);

            qsoService.createQso({
                qso_date: date.toISOString().slice(0, 10),
                time_on_utc: date.toISOString().slice(11, 19),
                call,
                frequency: mhz,
                band,
                mode,
                rst_sent: mode === "FT8" ? "-10" : mode === "CW" ? "599" : "59",
                rst_rcvd: mode === "FT8" ? "-12" : mode === "CW" ? "599" : "59",
                my_callsign: STATION.callsign,
                my_grid: STATION.locator,
                operator_name: STATION.operatorName,
                name: null,
                country,
                country_code: code,
                dx_grid: grid,
                cq_zone: cq,
                itu_zone: itu,
                notes: "Demo QSO",
                spot_source: mode === "FT8" ? "WSJT-X" : index % 3 === 0 ? "" : "DX Summit",
                spot_id: null
            });

        });

    }

    if (contestService.getAll().length === 0) {

        try {

            const definition = contestService.create({
                name: "CQ WW DX Contest SSB",
                short_name: "CQWW-SSB",
                version: "1",
                description: "Demo contest definition",
                rules_json: JSON.stringify({
                    station_callsign: STATION.callsign,
                    bands: ["160m", "80m", "40m", "20m", "15m", "10m"],
                    modes: ["SSB"],
                    exchange: { sent: "cq_zone", received: "cq_zone" },
                    dupe: { key: "call_band" },
                    scoring: { type: "one" },
                    multipliers: [],
                    rst: { send: true, receive: true },
                    category: {
                        operator: "SINGLE-OP",
                        assisted: "NON-ASSISTED",
                        power: "LOW",
                        station: "FIXED"
                    }
                }),
                enabled: true
            } as any);

            const session = contestService.createSession({
                contest_definition_id: Number(definition.id),
                name: "Demo session",
                status: "READY",
                operator_name: STATION.operatorName,
                station_callsign: STATION.callsign,
                station_grid: STATION.locator,
                club: ""
            } as any);

            contestService.startSession(Number(session.id));

            const start = Date.now() - 3 * 24 * 3600_000;
            const kHz: Record<string, number> = { "40": 7120, "20": 14250, "15": 21300, "10": 28500 };

            CONTEST_CALLS.forEach(([call, zone, band], index) => {

                const time = new Date(start + index * 7 * 60_000);

                contestService.createContestQso({
                    session_id: Number(session.id),
                    qso_date: time.toISOString().slice(0, 10),
                    time_on_utc: time.toISOString().slice(11, 19),
                    frequency: (kHz[band] ?? 14250) + index,
                    band,
                    mode: "SSB",
                    call,
                    rst_sent: "59",
                    rst_rcvd: "59",
                    exchange_sent: "14",
                    exchange_received: zone,
                    operator: STATION.callsign,
                    station_callsign: STATION.callsign
                } as any);

            });

            contestService.finishSession(Number(session.id));

        }
        catch (error) {

            console.error("DEMO: contest sample data failed:", error);

        }

    }

}
