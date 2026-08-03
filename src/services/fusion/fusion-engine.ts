import {
    countryCodeToFlag
} from "../geo/flag.util.js";

import {
    FusionSpot
} from "./spot.model.js";


import {
    GeoEnrichmentService
} from "../geo/geo-enrichment.service.js";


import {
    DistanceService
} from "../geo/distance.service.js";


import {
    BearingService
} from "../geo/bearing.service.js";


import {
    ShackLocationService
} from "../geo/shack-location.service.js";



export class FusionEngine {


    private spots =
        new Map<string, FusionSpot>();


    private geo =
        new GeoEnrichmentService();


    private distance =
        new DistanceService();


    private bearing =
        new BearingService();


    private shack =
        new ShackLocationService();

   

    async addSpot(
    spot: FusionSpot
): Promise<void> {

        const key =
            this.createKey(
                spot
            );


        const existing =
            this.spots.get(
                key
            );



                    if (existing) {


            existing.lastSeen =
                spot.lastSeen;
if (spot.country) {
    existing.country =
        spot.country;
}


if (spot.countryCode) {
    existing.countryCode =
        spot.countryCode;
}


if (spot.flag) {
    existing.flag =
        spot.flag;
}


if (spot.continent) {
    existing.continent =
        spot.continent;
}

            if (
                existing.locator === undefined &&
                spot.locator !== undefined
            ) {

                existing.locator =
                    spot.locator;

            }


            for (
                const source of spot.sources
            ) {

                if (
                    !existing.sources.includes(
                        source
                    )
                ) {

                    existing.sources.push(
                        source
                    );

                }

            }


            if (
                spot.snr !== undefined
            ) {

                existing.snr =
                    spot.snr;

            }


           if (
    existing.latitude === undefined ||
    existing.longitude === undefined ||
    existing.countryCode === undefined
) {

    await this.enrichGeo(
        existing
    );

}


            existing.confidence =
                this.calculateConfidence(
                    existing
                );


            return;

        } 

      


        if (
            spot.confidence === undefined
        ) {

            spot.confidence = 50;

        }

await this.enrichGeo(
    spot
);


this.spots.set(
    key,
    spot
);



    }







    private async enrichGeo(
        spot: FusionSpot
    ): Promise<void> {

console.log(
    "FUSION ENRICH CALL",
    {
        call: spot.call,
        locator: spot.locator,
        lat: spot.latitude,
        lon: spot.longitude
    }
);
        const location =
            await this.geo.enrich(
                spot.call,
		spot.locator
            );

        if (!location) {

        return    
        }


     
           

        if (
            location.country
        ) {

            spot.country =
                location.country;

        }


        if (
    location.countryCode
) {

    spot.countryCode =
        location.countryCode;


    spot.flag =
        countryCodeToFlag(
            location.countryCode
        );

}


        if (
            location.continent
        ) {

            spot.continent =
                location.continent;

        }


        if (
            location.locator
        ) {

            spot.locator =
                location.locator;

        }



        if (
            typeof location.latitude === "number"
        ) {

            spot.latitude =
                location.latitude;

console.log(
    "FUSION ENRICH RESULT",
    {
        call: spot.call,
        country: spot.country,
        countryCode: spot.countryCode,
        flag: spot.flag,
        continent: spot.continent
    }
);


        }



        if (
            typeof location.longitude === "number"
        ) {

            spot.longitude =
                location.longitude;

        }





        if (
            typeof location.latitude === "number" &&
            typeof location.longitude === "number"
        ) {


            const shack =
                this.shack.getCoordinates();



            const dx = {

                latitude:
                    location.latitude,

                longitude:
                    location.longitude

            };



            spot.distance =
                this.distance.distanceKm(
                    shack,
                    dx
                );



            spot.azimuth =
                this.bearing.bearing(
                    shack,
                    dx
                );





     

        }

    }






getSpots(): FusionSpot[] {

    return Array.from(
        this.spots.values()
    );

}

    private createKey(
        spot: FusionSpot
    ): string {


        return [

            spot.call,

            spot.frequency,

            spot.mode

        ]
        .join("-");

    }







    private calculateConfidence(
        spot: FusionSpot
    ): number {


        let score = 50;



        if (
            spot.sources.length > 1
        ) {

            score += 20;

        }



        if (
            spot.snr !== undefined
        ) {

            score += 10;

        }



        if (
            spot.spotters &&
            spot.spotters.length > 0
        ) {

            score += 10;

        }



        return Math.min(
            score,
            100
        );

    }


}
