import {
    FusionSpot
} from "./spot.model.js";



export class FusionEngine {


    private spots =
        new Map<string, FusionSpot>();





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


        let confidence = 50;



        /*
            Multiple independent sources
        */

        confidence +=
            spot.sources.length * 15;



        /*
            Signal information available
        */

        if (
            spot.snr !== undefined
        ) {

            confidence += 10;

        }



        /*
            Multiple spotters
        */

        if (
            spot.spotters
        ) {

            confidence +=
                spot.spotters.length * 5;

        }



        return Math.min(

            confidence,

            99

        );


    }


}
