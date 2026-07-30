import {
    Coordinates
} from "./maidenhead.service.js";


export class BearingService {


    bearing(
        a: Coordinates,
        b: Coordinates
    ): number {


        const lat1 =
            this.toRadians(a.latitude);

        const lat2 =
            this.toRadians(b.latitude);


        const deltaLon =
            this.toRadians(
                b.longitude - a.longitude
            );


        const y =
            Math.sin(deltaLon) *
            Math.cos(lat2);


        const x =
            Math.cos(lat1) *
            Math.sin(lat2)
            -
            Math.sin(lat1) *
            Math.cos(lat2) *
            Math.cos(deltaLon);


        let bearing =
            Math.atan2(y, x);


        bearing =
            this.toDegrees(bearing);


        bearing =
            (bearing + 360) % 360;


        return Math.round(bearing);

    }



    private toRadians(
        value: number
    ): number {

        return value *
            Math.PI /
            180;

    }



    private toDegrees(
        value: number
    ): number {

        return value *
            180 /
            Math.PI;

    }

}
