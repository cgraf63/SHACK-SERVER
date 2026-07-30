import {
    FusionSpot
} from "./spot.model.js";


import {
    GeoEnrichmentService
} from "../geo/geo-enrichment.service.js";



export class FusionEngine {


    private spots =
        new Map<string, FusionSpot>();


    private geo =
        new GeoEnrichmentService();



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


            /*
                Existing spot:
                merge information
            */


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
