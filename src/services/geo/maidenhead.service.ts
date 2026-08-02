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

    coordinatesToLocator(
        latitude: number,
        longitude: number
    ): string {

        let lon =
            longitude + 180;

        let lat =
            latitude + 90;


        const fieldLon =
            Math.floor(
                lon / 20
            );

        const fieldLat =
            Math.floor(
                lat / 10
            );


        lon =
            lon % 20;

        lat =
            lat % 10;


        const squareLon =
            Math.floor(
                lon / 2
            );

        const squareLat =
            Math.floor(
                lat / 1
            );


        lon =
            (lon % 2) * 60;

        lat =
            (lat % 1) * 60;


        const subLon =
            Math.floor(
                lon / 5
            );

        const subLat =
            Math.floor(
                lat / 2.5
            );


        return (
            String.fromCharCode(65 + fieldLon) +
            String.fromCharCode(65 + fieldLat) +
            squareLon +
            squareLat +
            String.fromCharCode(97 + subLon) +
            String.fromCharCode(97 + subLat)
        );
    }

}
