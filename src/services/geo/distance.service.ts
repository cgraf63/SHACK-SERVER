import {
    Coordinates
} from "./maidenhead.service.js";


export class DistanceService {


    distanceKm(
        a: Coordinates,
        b: Coordinates
    ): number {


        const earthRadius = 6371;


        const lat1 =
            this.toRadians(a.latitude);

        const lat2 =
            this.toRadians(b.latitude);


        const deltaLat =
            this.toRadians(
                b.latitude - a.latitude
            );

        const deltaLon =
            this.toRadians(
                b.longitude - a.longitude
            );


        const h =
            Math.sin(deltaLat / 2) *
            Math.sin(deltaLat / 2) +

            Math.cos(lat1) *
            Math.cos(lat2) *
            Math.sin(deltaLon / 2) *
            Math.sin(deltaLon / 2);


        const distance =
            2 *
            earthRadius *
            Math.atan2(
                Math.sqrt(h),
                Math.sqrt(1 - h)
            );


        return Math.round(distance);

    }


    private toRadians(
        value: number
    ): number {

        return value *
            Math.PI /
            180;

    }

}
