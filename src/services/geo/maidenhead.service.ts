export interface Coordinates {

    latitude: number;

    longitude: number;

}



export class MaidenheadService {


    locatorToCoordinates(
        locator: string
    ): Coordinates | null {


        if (!locator || locator.length < 4) {
            return null;
        }


        locator =
            locator.toUpperCase();


        const lon =
            (locator.charCodeAt(0) - 65) * 20 - 180;


        const lat =
            (locator.charCodeAt(1) - 65) * 10 - 90;


        let longitude =
            lon +
            Number(locator[2]) * 2;


        let latitude =
            lat +
            Number(locator[3]) * 1;


        if (locator.length >= 6) {

            longitude +=
                (locator.charCodeAt(4) - 65) *
                (5 / 60);

            latitude +=
                (locator.charCodeAt(5) - 65) *
                (2.5 / 60);

        }


        return {

            latitude,

            longitude

        };

    }

}
