import {
    fusionEngine
} from "../fusion/fusion-instance.js";


import {
    FusionSpot
} from "../fusion/spot.model.js";


export interface PriorityDX {

    call: string;

    flag?: string;

    country?: string;

    countryCode?: string;

    continent?: string;

    distance: number;

    band: string;

    mode?: string;

}


function calculatePriorityScore(
    spot: FusionSpot
): number {

    return (
        spot.confidence +
        spot.sources.length * 10
    );

}



export function getPriorityDX(): PriorityDX[] {


    return fusionEngine
        .getSpots()


        .filter(
            spot =>
                spot.distance !== undefined &&
                !spot.call.endsWith("/B")
        )


        .sort(
            (a, b) => {


                if (
                    b.distance !== a.distance
                ) {

                    return (
                        b.distance! -
                        a.distance!
                    );

                }


                return (
                    calculatePriorityScore(b)
                    -
                    calculatePriorityScore(a)
                );

            }
        )


        .slice(
            0,
            10
        )


        .map(
            spot => {


console.log(
    "PRIORITY INPUT",
    {
        call: spot.call,
        country: spot.country,
        countryCode: spot.countryCode,
        flag: spot.flag,
        continent: spot.continent
    }
);

                const result: PriorityDX = {

    			call:
        		spot.call,

    			distance:
        		spot.distance!,

    			band:
        		spot.band,

			
};


if (spot.country) {
    result.country =
        spot.country;
}


if (spot.countryCode) {
    result.countryCode =
        spot.countryCode;
}


if (spot.continent) {
    result.continent =
        spot.continent;
}

if (
    spot.flag
) {

    result.flag =
        spot.flag;

}


                if (
                    spot.mode &&
                    spot.mode !== "UNKNOWN"
                ) {

                    result.mode =
                        spot.mode;

                }


                return result;

            }
        );

}
