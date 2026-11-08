import {
    FusionSpot
} from "./spot.model.js";


import {
    GeoEnrichmentService
} from "../geo/geo-enrichment.service.js";


import {
    DistanceService
} from "../geo/distance.service.js";


import {
    BearingService
} from "../geo/bearing.service.js";


import {
    ShackLocationService
} from "../geo/shack-location.service.js";



export class FusionEngine {


    private spots =
        new Map<string, FusionSpot>();


    private geo =
        new GeoEnrichmentService();


    private distance =
        new DistanceService();


    private bearing =
        new BearingService();


    private shack =
        new ShackLocationService();


    /*
     * Listeners for new spots (station not yet in the list on this
     * frequency / mode) - called after the geo enrichment, so country
     * and country code are known. Used by the watch list notifier.
     */
    private newSpotListeners: Array<(spot: FusionSpot) => void> = [];

    onNewSpot(listener: (spot: FusionSpot) => void): void {

        this.newSpotListeners.push(listener);

    }

    /* Every incoming report (before merging): who heard whom */
    private reportListeners: Array<(spot: FusionSpot) => void> = [];

    onSpotReport(listener: (spot: FusionSpot) => void): void {

        this.reportListeners.push(listener);

    }

    private emitNewSpot(spot: FusionSpot): void {

        for (const listener of this.newSpotListeners) {
            try {
                listener(spot);
            }
            catch (error) {
                console.error("New spot listener failed:", error);
            }
        }

    }

   

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

        for (const listener of this.reportListeners) {
            try {
                listener(spot);
            }
            catch (error) {
                console.error("Spot report listener failed:", error);
            }
        }



                    if (existing) {


            existing.lastSeen =
                spot.lastSeen;


            if (
                existing.locator === undefined &&
                spot.locator !== undefined
            ) {

                existing.locator =
                    spot.locator;

            }


            for (
                const spotter of spot.spotters ?? []
            ) {

                existing.spotters ??= [];

                if (
                    !existing.spotters.includes(spotter) &&
                    existing.spotters.length < 50
                ) {
                    existing.spotters.push(spotter);
                }

            }


            for (
                const source of spot.sources
            ) {

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
                existing.latitude === undefined ||
                existing.longitude === undefined
            ) {

                this.enrichGeo(
                    existing
                );

            }


            existing.confidence =
                this.calculateConfidence(
                    existing
                );


            return;

        } 

      


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
        )
            .catch(() => undefined)
            .finally(() => this.emitNewSpot(spot));

    }







    private async enrichGeo(
        spot: FusionSpot
    ): Promise<void> {

        const location =
            await this.geo.enrich(
                spot.call,
		spot.locator
            );

        if (!location) {

        return    
        }


     
           

        if (
            location.country
        ) {

            spot.country =
                location.country;

        }


        if (
            location.countryCode
        ) {

            spot.countryCode =
                location.countryCode;

        }


        if (
            location.continent
        ) {

            spot.continent =
                location.continent;

        }


        if (
            location.locator
        ) {

            spot.locator =
                location.locator;

        }



        if (
            typeof location.latitude === "number"
        ) {

            spot.latitude =
                location.latitude;

        }



        if (
            typeof location.longitude === "number"
        ) {

            spot.longitude =
                location.longitude;

        }





        if (
            typeof location.latitude === "number" &&
            typeof location.longitude === "number"
        ) {


            const shack =
                this.shack.getCoordinates();



            const dx = {

                latitude:
                    location.latitude,

                longitude:
                    location.longitude

            };



            spot.distance =
                this.distance.distanceKm(
                    shack,
                    dx
                );



            spot.azimuth =
                this.bearing.bearing(
                    shack,
                    dx
                );

  } //Ende if latitude

} //ende enrichGeo()

    refreshShackLocation(): void {

        const shack =
            this.shack.getCoordinates();


        for (
            const spot of this.spots.values()
        ) {

            if (
                typeof spot.latitude !== "number" ||
                typeof spot.longitude !== "number"
            ) {

                continue;

            }


            const dx = {

                latitude:
                    spot.latitude,

                longitude:
                    spot.longitude

            };


            spot.distance =
                this.distance.distanceKm(
                    shack,
                    dx
                );


            spot.azimuth =
                this.bearing.bearing(
                    shack,
                    dx
                );

        }

    }



getBandActivity() {

    const bands:
        Record<string, number> = {};


    const now =
        Date.now();


    for (const spot of this.spots.values()) {


        const age =
            now - spot.lastSeen;


        if (
            age >
            10 * 60 * 1000
        ) {
            continue;
        }


       


        bands[spot.band] =
    (bands[spot.band] ?? 0) + 1;
    }


    return bands;

}
     
getGeoDiagnostics() {

    return {

        failed:
            this.geo.getFailedEnrichmentCount(),

        calls:
            this.geo.getFailedEnrichment()

    };

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
