import {
    shackLocation
} from "../../config/location.config.js";


import {
    Coordinates
} from "./maidenhead.service.js";


export class ShackLocationService {


    getCoordinates(): Coordinates {


        return {

            latitude:
                shackLocation.latitude,

            longitude:
                shackLocation.longitude

        };

    }



    getLocator(): string {

        return shackLocation.locator;

    }



    getName(): string {

        return shackLocation.name;

    }

}
