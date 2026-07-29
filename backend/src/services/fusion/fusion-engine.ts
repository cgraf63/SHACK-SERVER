import { FusionSpot } from "./spot.model.js";



export class FusionEngine {


    private spots: FusionSpot[] = [];



    /*
        neuen Spot hinzufügen
    */

    addSpot(
        spot: FusionSpot
    ) {


        const existing =
            this.findExistingSpot(
                spot
            );


        if (existing) {


            /*
                gleiche Aktivität gefunden
            */


            this.mergeSpot(
                existing,
                spot
            );


        }
        else {


            /*
                neuer Spot
            */


            spot.sources =
                spot.sources || [];


            spot.confidence =
                50;


            spot.duplicateCount =
                1;


            this.spots.push(
                spot
            );


        }


    }





    /*
        gleiche Station/Band/Mode
    */

    private findExistingSpot(
        spot: FusionSpot
    ) {


        return this.spots.find(
            existing =>


                existing.call === spot.call &&

                existing.band === spot.band &&

                existing.mode === spot.mode

        );


    }





    /*
        Quellen zusammenführen
    */

    private mergeSpot(
        target: FusionSpot,
        incoming: FusionSpot
    ) {



        incoming.sources.forEach(
            source => {


                if(
                    !target.sources.includes(source)
                ) {


                    target.sources.push(
                        source
                    );


                }


            }
        );



        target.duplicateCount =
            (target.duplicateCount || 1)
            + 1;



        /*
            mehr Quellen = höhere Sicherheit
        */


        target.confidence =
            Math.min(
                100,
                50 +
                (
                    target.sources.length
                    * 15
                )
            );



        target.timestamp =
            Date.now();



    }





    /*
        alle aktuellen Spots
    */

    getSpots() {


        return this.spots;


    }





    /*
        Top DX Möglichkeiten
    */

    getPrioritySpots(
        limit:number = 10
    ) {


        return this.spots

            .sort(
                (
                    a,
                    b
                ) =>
                (
                    b.priorityScore || 0
                )
                -
                (
                    a.priorityScore || 0
                )
            )

            .slice(
                0,
                limit
            );


    }


}
