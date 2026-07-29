import { FusionSpot } from "./spot.model.js";


export class FusionEngine {


    private spots: FusionSpot[] = [];



    addSpot(
        spot: FusionSpot
    ) {

        this.spots.push(
            spot
        );

    }




    getSpots(): FusionSpot[] {

        return this.spots;

    }



}
