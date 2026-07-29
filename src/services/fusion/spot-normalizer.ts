import {
    FusionSpot
} from "./spot.model.js";



export class SpotNormalizer {


    normalize(
        raw: any,
        source: string
    ): FusionSpot | null {


        if (
            !raw.call ||
            !raw.frequency
        ) {

            return null;

        }


        const frequency =
            Number(raw.frequency);



        const mode =
            this.detectMode(
                raw.mode,
                frequency
            );



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


            mode,


            sources: [
                source
            ],


            firstSeen:
                Date.now(),


            lastSeen:
                Date.now(),


            confidence:
                this.calculateConfidence(
                    mode
                ),


            snr:
                raw.snr

        };

    }







    private detectMode(
        mode: string | undefined,
        frequency: number
    ): string {


        if (mode) {

            const upper =
                mode.toUpperCase();



            const known = [

                "FT8",
                "FT4",
                "RTTY",
                "CW",
                "SSB",
                "USB",
                "LSB"

            ];



            for (
                const item of known
            ) {

                if (
                    upper.includes(item)
                ) {

                    return item;

                }

            }

        }





        /*
            Bandplan fallback
        */


        // 6m FT8
        if (
            frequency >= 50300 &&
            frequency <= 50400
        ) {

            return "FT8";

        }



        // 20m FT8
        if (
            frequency >= 14070 &&
            frequency <= 14110
        ) {

            return "FT8";

        }



        // 17m FT8
        if (
            frequency >= 18090 &&
            frequency <= 18110
        ) {

            return "FT8";

        }



        // 15m FT8
        if (
            frequency >= 21070 &&
            frequency <= 21110
        ) {

            return "FT8";

        }
//15m
if (
    frequency >= 21150 &&
    frequency <= 21450
) {

    return "SSB";

}
if (
    frequency >= 28300 &&
    frequency <= 29700
) {

    return "SSB";

}
if (
    frequency >= 28000 &&
    frequency <= 28070
)
{
    return "CW";
}

if (
    frequency >= 7050 &&
    frequency <= 7200
)
{
    return "SSB";
}

//20m SSB
if (
    frequency >= 14150 &&
    frequency <= 14350
) {

    return "SSB";

}

        // 40m CW Bereich
        if (
            frequency >= 7000 &&
            frequency <= 7050
        ) {

            return "CW";

        }



        // 20m CW Bereich
        if (
            frequency >= 14000 &&
            frequency <= 14070
        ) {

            return "CW";

        }



        return "UNKNOWN";

    }









    private calculateConfidence(
        mode: string
    ): number {


        let value = 60;



        if (
            mode !== "UNKNOWN"
        ) {

            value += 15;

        }



        return Math.min(
            value,
            99
        );

    }









    private getBand(
        frequency: number
    ): string {


        const mhz =
            frequency / 1000;



        if (mhz >= 50)
            return "6m";


        if (mhz >= 28)
            return "10m";


        if (mhz >= 24)
            return "12m";


        if (mhz >= 21)
            return "15m";


        if (mhz >= 18)
            return "17m";


        if (mhz >= 14)
            return "20m";


        if (mhz >= 10)
            return "30m";


        if (mhz >= 7)
            return "40m";


        if (mhz >= 3)
            return "80m";


        return "unknown";

    }

}
