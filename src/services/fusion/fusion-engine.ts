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



            const source =
                spot.sources[0];


            if (source) {


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
                spot.spotters
            ) {

                existing.spotters ??= [];


                for (
                    const spotter of spot.spotters
                ) {


                    if (
                        !existing.spotters.includes(
                            spotter
                        )
                    ) {

                        existing.spotters.push(
                            spotter
                        );

                    }

                }

            }



            if (
                spot.comments
            ) {

                existing.comments ??= [];


                for (
                    const comment of spot.comments
                ) {


                    if (
                        !existing.comments.includes(
                            comment
                        )
                    ) {

                        existing.comments.push(
                            comment
                        );

                    }

                }

            }



            existing.confidence =
                this.calculateConfidence(
                    existing
                );


            return;

        }



        /*
            New spot
        */


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


        if (!location) {
            return;
        }

console.log(
    "GEO OK:",
    spot.call,
    location
);






        if (location.locator) {

            spot.locator =
                location.locator;

        }



        if (
            location.latitude !== undefined
        ) {

            spot.latitude =
                location.latitude;

        }



        if (
            location.longitude !== undefined
        ) {

            spot.longitude =
                location.longitude;

        }



        if (
            location.latitude !== undefined &&
            location.longitude !== undefined
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
