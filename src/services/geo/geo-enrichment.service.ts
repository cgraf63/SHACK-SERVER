import {
    DxLocation
} from "./geo.model.js";


import {
    GeoCacheService
} from "./geo-cache.service.js";


import {
    QRZService
} from "./qrz.service.js";


import {
    CallsignResolverService
} from "./callsign-resolver.service.js";



export class GeoEnrichmentService {


    private cache =
        new GeoCacheService();



    private qrz =
        new QRZService();



    private resolver =
        new CallsignResolverService();




    async enrich(
        call: string
    ): Promise<DxLocation | null> {


        const normalized =
            call
                .toUpperCase()
                .trim();



        const cached =
            this.cache.get(
                normalized
            );


        if (cached) {

            return cached;

        }



        let location: DxLocation = {


            call: normalized,


            updated:
                Date.now()

        };



        const callsignInfo =
            this.resolver.resolve(
                normalized
            );



        if (callsignInfo) {


            location.country =
                callsignInfo.country;


            location.countryCode =
                callsignInfo.countryCode;


            location.continent =
                callsignInfo.continent;

        }



        const qrzLocation =
            await this.qrz.lookup(
                normalized
            );



        if (qrzLocation) {


            location = {

                ...location,

                ...qrzLocation,

                call: normalized,

                updated:
                    Date.now()

            };

        }



        if (
            location.country ||
            location.locator ||
            location.latitude !== undefined
        ) {


            this.cache.set(
                location
            );


            return location;

        }



        return null;

    }

}
