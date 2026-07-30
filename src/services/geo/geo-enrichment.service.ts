import {
    DxLocation
} from "./geo.model.js";


import {
    GeoCacheService
} from "./geo-cache.service.js";


import {
    QRZService
} from "./qrz.service.js";


export class GeoEnrichmentService {


    private cache =
        new GeoCacheService();


    private qrz =
        new QRZService();



    async enrich(
        call: string
    ): Promise<DxLocation | null> {


        const cached =
            this.cache.get(call);


        if (cached) {

            return cached;

        }


        const location =
            await this.qrz.lookup(call);


        if (location) {

            this.cache.set(
                location
            );

        }


        return location;

    }

}
