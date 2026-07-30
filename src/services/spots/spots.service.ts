import {
    fusionEngine
} from "../fusion/fusion-instance.js";



export interface Spot {


    call: string;


    frequency: string;


    mode: string;


    source: string;


    age: string;


    confidence: number;


    snr: number;


    flag: string | undefined;


    countryCode: string | undefined;


    distance: number | undefined;


    azimuth: number | undefined;


}





export async function getSpots(): Promise<Spot[]> {


    return fusionEngine
        .getSpots()
        .map(

            spot => ({


                call:
                    spot.call,



                frequency:
                    String(
                        spot.frequency
                    ),



                mode:
                    spot.mode,



                source:
                    spot.sources.join(
                        ", "
                    ),



                age:
                    `${Math.floor(
                        (
                            Date.now()
                            -
                            spot.lastSeen
                        )
                        /
                        1000
                    )}s`,



                confidence:
                    spot.confidence,



                snr:
                    spot.snr ?? 0,



                flag:
                    spot.flag,



                countryCode:
                    spot.countryCode,



                distance:
                    spot.distance,



                azimuth:
                    spot.azimuth


            })

        );

}
