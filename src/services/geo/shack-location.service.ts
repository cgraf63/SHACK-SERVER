import {
    settingsService
} from "../settings/settings.service.js";

import {
    shackLocation
} from "../../config/location.config.js";

import {
    Coordinates,
    MaidenheadService
} from "./maidenhead.service.js";


export class ShackLocationService {

    private maidenhead =
        new MaidenheadService();


    getCoordinates(): Coordinates {

        const settings =
            settingsService.get();

try {

    const coordinates =
        this.maidenhead.locatorToCoordinates(
            settings.locator
        );

    if (coordinates) {

        return coordinates;

    }

    throw new Error(
        `Invalid locator: ${settings.locator}`
    );

}
catch (error) {

    console.error(
        "Invalid shack locator:",
        settings.locator,
        error
    );

    return {

        latitude:
            shackLocation.latitude,

        longitude:
            shackLocation.longitude

    };

}

    }


    getLocator(): string {

        return settingsService.get().locator;

    }


    getName(): string {

        return shackLocation.name;

    }

}
