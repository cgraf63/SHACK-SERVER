import {
    MaidenheadService
} from "./maidenhead.service.js";

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

private maidenhead =
    new MaidenheadService();



    private qrz =
        new QRZService();



    private resolver =
        new CallsignResolverService();



private normalizeCall(
    call: string
): string {

    const upper =
        call
            .toUpperCase()
            .trim();


    const parts =
        upper.split("/");


    const first =
        parts[0] ?? "";


    const second =
        parts[1];


    const suffixes = [
        "P",
        "M",
        "MM",
        "AM",
        "B"
    ];


    // HB9ABC/P, MW7KOD/M, etc.
    if (
        second &&
        suffixes.includes(second)
    ) {

        return first;

    }


    // EA8/HB9ABC, F/G4XYZ
    if (
        second &&
        second.match(/[0-9]/)
    ) {

        return second;

    }


    // W1AW/7, W1AW/KH6
    if (
        second &&
        second.length <= 3
    ) {

        return first;

    }


    return upper;

}







      async enrich(
          call: string,
          locator?: string
      ): Promise<DxLocation | null> {


      console.log(
          "GEO ENRICH INPUT",
          call,
          locator
      );

  console.log(
      "GEO LOOKUP:",
      call
  );

        const normalized =
    this.normalizeCall(
        call
    );


        const cached =
            this.cache.get(
                normalized
            );


        if (
    cached &&
    (
        cached.latitude !== undefined &&
        cached.longitude !== undefined
    )
) {

    return cached;

}


        let location: DxLocation = {


            call: normalized,


            updated:
                Date.now()

        };

if (
    locator
) {

    location.locator =
        locator;

const coordinates =
    this.maidenhead.locatorToCoordinates(
        locator
    );

if (coordinates) {

    location.latitude =
        coordinates.latitude;

    location.longitude =
        coordinates.longitude;

}
}



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


        console.log(
            "QRZ RESULT:",
            normalized,
            qrzLocation
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
    !location.locator &&
    location.latitude !== undefined &&
    location.longitude !== undefined
) {

    location.locator =
        this.maidenhead.coordinatesToLocator(
            location.latitude,
            location.longitude
        );

}

        if (
            location.country ||
            location.locator ||
            location.latitude !== undefined
        ) {


            this.cache.set(
                location
            );


if (
    typeof location.latitude !== "number" ||
    typeof location.longitude !== "number"
) {
    return null;
}


return location;

        }

        return null;

    }

}


