export interface RbnSpot {

    spotter: string;

    spotterGrid?: string;

    countryCode?: string;

spotterCountryCode?: string;

    distanceKm?: number;

    callsign: string;

    frequency: number;

    mode: string;

    snr: number;

    speed: number;

    speedUnit: string;

    type: string;

    time: string;

}

export function parseRbnLine(
    line: string
): RbnSpot | null {

    const match =
        line.match(
            /^DX de\s+(\S+):\s+(\d+(?:\.\d+)?)\s+([A-Z0-9\/]+)\s+(CW|RTTY)\s+(-?\d+)\s+dB\s+(\d+)\s+(WPM|BPS)\s+(\S+)\s+(\d{4}Z)\s*$/
        );


    if (!match) {
        return null;
    }


    return {

        spotter:
            match[1]!,

        frequency:
            Number(match[2]),

        callsign:
            match[3]!,

        mode:
            match[4]!,

        snr:
            Number(match[5]),

        speed:
            Number(match[6]),

        speedUnit:
            match[7]!,

        type:
            match[8]!,

        time:
            match[9]!

    };

}
