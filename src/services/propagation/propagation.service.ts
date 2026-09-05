export interface BandCondition {

    band: string;

    score: number;

    condition: string;

}

export interface SidcForecast {

    solarFlux: number;

    ap: number;

    date: string;

}

export interface PropagationStatus {

    solarFlux: number;

    aIndex: number;

    kIndex: number;

    muf: number;

    bands: BandCondition[];

    sidc: SidcForecast;

    updated: string;

 

}


async function fetchJson(
    url: string
): Promise<any> {

    const response =
        await fetch(url);

    if (!response.ok) {

        throw new Error(
            `HTTP ${response.status} from ${url}`
        );

    }

    return response.json();

}

function calculateBandConditions(
    solarFlux: number,
    aIndex: number,
    kIndex: number
): BandCondition[] {

    const bands = [
        { band: "10m", day: 95, night: 25, solar: 1.00 },
        { band: "12m", day: 95, night: 30, solar: 0.95 },
        { band: "15m", day: 95, night: 40, solar: 0.90 },
        { band: "17m", day: 90, night: 55, solar: 0.75 },
        { band: "20m", day: 90, night: 75, solar: 0.55 },
        { band: "30m", day: 65, night: 90, solar: 0.30 },
        { band: "40m", day: 55, night: 90, solar: 0.20 },
        { band: "60m", day: 40, night: 80, solar: 0.10 },
        { band: "80m", day: 30, night: 90, solar: 0.05 }
    ];

    const hour =
        new Date().getUTCHours();

    const isDay =
        hour >= 7 &&
        hour < 17;

    const solarScore =
        Math.max(
            0,
            Math.min(
                100,
                (solarFlux - 70) * 2
            )
        );

    const geomagneticPenalty =
        Math.min(
            50,
            (aIndex * 1.5) +
            (kIndex * 8)
        );

    return bands.map(
        ({ band, day, night, solar }) => {

            const timeScore =
                isDay
                    ? day
                    : night;

            const score =
                Math.round(
                    Math.max(
                        0,
                        Math.min(
                            100,
                            (timeScore * 0.65) +
                            (solarScore * solar * 0.35) -
                            geomagneticPenalty
                        )
                    )
                );

            let condition =
                "Poor";

            if (score >= 75) {
                condition =
                    "Excellent";
            }
            else if (score >= 50) {
                condition =
                    "Good";
            }
            else if (score >= 30) {
                condition =
                    "Fair";
            }

            return {
                band,
                score,
                condition
            };

        }
    );

}

export async function getPropagation(): Promise<PropagationStatus> {

    const solarData =
        await fetchJson(
            "https://services.swpc.noaa.gov/json/f107_cm_flux.json"
        );

    const geomagneticData =
        await fetchJson(
            "https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json"
        );

const sidcData =
    await fetch(
        "https://www.sidc.be/spaceweatherservices/managed/services/applications/managed/services/archive/product/meu/latest"
    )
    .then(
        response => response.text()
    );

const today =
    new Date()
        .toISOString()
        .slice(0, 10);


const sidcLines =
    sidcData.match(
        /PREDICTIONS FOR (\d{2} \w{3} \d{4})\s+10CM FLUX:\s+(\d+)\s+\/ AP:\s+(\d+)/g
    ) || [];


const sidcMatch =
    sidcLines
        .map(line => {

            const match =
                line.match(
                    /PREDICTIONS FOR (\d{2} \w{3} \d{4})\s+10CM FLUX:\s+(\d+)\s+\/ AP:\s+(\d+)/
                );

            if (!match) {
                return null;
            }

const months: Record<string, string> = {
    Jan: "01",
    Feb: "02",
    Mar: "03",
    Apr: "04",
    May: "05",
    Jun: "06",
    Jul: "07",
    Aug: "08",
    Sep: "09",
    Oct: "10",
    Nov: "11",
    Dec: "12"
};


const dateParts =
    match[1]!.split(" ");


const date =
    `${dateParts[2]!}-${months[dateParts[1]!]}-${dateParts[0]!.padStart(2, "0")}`;
            return {
                match,
                date
            };

        })
        .find(
            item =>
                item?.date === today
        )?.match;

const sidcForecast: SidcForecast = {

    date:
        sidcMatch?.[1] || "",

    solarFlux:
        sidcMatch
            ? Number(sidcMatch[2])
            : 0,

    ap:
        sidcMatch
            ? Number(sidcMatch[3])
            : 0

};


    const latestSolar =
        solarData.find(
            (entry: any) =>
                entry.frequency === 2800 &&
                Number.isFinite(
                    Number(entry.flux)
                )
        );


    const latestGeomagnetic =
        geomagneticData[
            geomagneticData.length - 1
        ];


    const solarFlux =
        latestSolar
            ? Math.round(
                Number(latestSolar.flux)
            )
            : 0;


    const aIndex =
        latestGeomagnetic
            ? Number(
                latestGeomagnetic.a_running
            )
            : 0;


    const kIndex =
        latestGeomagnetic
            ? Number(
                latestGeomagnetic.Kp
            )
            : 0;


    return {

        solarFlux,

        aIndex,

        kIndex,

        muf: 21.5,

bands: calculateBandConditions(
    solarFlux,
    aIndex,
    kIndex
),

sidc: sidcForecast,

        updated:
            latestGeomagnetic?.time_tag ||
            latestSolar?.time_tag ||
            new Date().toISOString()

    };

}
