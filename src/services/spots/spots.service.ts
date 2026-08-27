import {
    fusionEngine
} from "../fusion/fusion-instance.js";


import {
sotaPotaService
} from "../activities/sota-pota-instance.js";



export interface Spot {

    call: string;
    frequency: string;
    band: string;
    mode: string;
    source: string;
    sources: string[];
    age: string;
    confidence: number;
    snr: number;
    flag: string | undefined;
    countryCode: string | undefined;
    distance: number | undefined;
    azimuth: number | undefined;
    locator: string | undefined;
    comments: string[] | undefined;


    activity:
        "SOTA"
        | "POTA"
        | undefined;

}




export async function getSpots(): Promise<Spot[]> {


console.log(
    "API SPOT CHECK",
    fusionEngine.getSpots()
        .filter(
            spot =>
                spot.comments?.some(
                    comment =>
                        typeof comment !== "string"
                )
        )
);


    return fusionEngine
    .getSpots()
    .filter(
        spot =>
            (
                Date.now()
                -
                spot.lastSeen
            )
            <
            30 * 60 * 1000
    )
    .map(
            spot => ({


                call:
                    spot.call,



                frequency:
                    String(
                        spot.frequency
                    ),

		band:
		    spot.band,


                mode:
                    spot.mode,



                source:
                    spot.sources.join(
                        ", "
                    ),

		sources:
    			spot.sources,

                age:
                    `${Math.floor(
                        (
                            Date.now()
                            -
                            spot.lastSeen
                        )
                        /
                        1000
                    )}s`,



                confidence:
                    spot.confidence,



                snr:
                    spot.snr ?? 0,



                flag:
                    spot.flag,



                countryCode:
                    spot.countryCode,



                distance:
                    spot.distance,



                azimuth:
                    spot.azimuth,

locator:
    spot.locator,

comments:
    spot.comments,

activity:
    sotaPotaService.isPota(spot.call)
        ? "POTA"
        : sotaPotaService.isSota(spot.call)
            ? "SOTA"
            : undefined


            })

        );

}
