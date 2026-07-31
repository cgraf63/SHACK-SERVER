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




    addSpot(
        spot: FusionSpot
    ): void {


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
if (
    existing.latitude === undefined ||
    existing.longitude === undefined
) {

    this.enrichGeo(
        existing
    );

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



        this.spots.set(
            key,
            spot
        );


        this.enrichGeo(
            spot
        );

    }







    private async enrichGeo(
        spot: FusionSpot
    ): Promise<void> {


        const location =
            await this.geo.enrich(
                spot.call
            );

console.log(
    "GEO LOOKUP RESULT",
    spot.call,
    location
);



        if (!location) {

            return;

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

console.log(
    "GEO STORED",
    spot.call,
    spot.latitude,
    spot.longitude,
    spot.distance,
    spot.azimuth
);

            console.log(
                "GEO FINAL",
                spot.call,
                spot.latitude,
                spot.longitude,
                spot.distance,
                spot.azimuth
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
