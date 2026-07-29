import { FusionSpot } from "./spot.model.js";



export class SpotNormalizer {



    normalize(
        raw:any,
        source:string
    ): FusionSpot | null {



        if(!raw.call || !raw.frequency) {

            return null;

        }



        const frequency =
            Number(raw.frequency);



        return {


            call:
                raw.call
                .toUpperCase()
                .trim(),



            frequency,



            band:
                this.getBand(
                    frequency
                ),



            mode:
                this.normalizeMode(
                    raw.mode
                ),



            sources:[
                source
            ],



            timestamp:
                Date.now()



        };


    }






    private getBand(
        frequency:number
    ):string {



        const mhz =
            frequency / 1000;



        if(mhz >= 50)
            return "6m";


        if(mhz >= 28)
            return "10m";


        if(mhz >= 24)
            return "12m";


        if(mhz >= 21)
            return "15m";


        if(mhz >= 18)
            return "17m";


        if(mhz >= 14)
            return "20m";


        if(mhz >= 10)
            return "30m";


        if(mhz >= 7)
            return "40m";


        if(mhz >= 5)
            return "60m";


        if(mhz >= 3)
            return "80m";


        return "unknown";


    }






    private normalizeMode(
        mode?:string
    ):string {


        if(!mode)
            return "UNKNOWN";


        mode =
            mode
            .toUpperCase()
            .trim();



        if(
            mode.includes("CW")
        )
            return "CW";


        if(
            mode.includes("FT")
        )
            return "DIGITAL";


        if(
            mode.includes("SSB") ||
            mode.includes("PH")
        )
            return "SSB";



        return mode;


    }


}
