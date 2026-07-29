import {
    FusionEngine
} from "../fusion/fusion-engine.js";


import {
    SpotNormalizer
} from "../fusion/spot-normalizer.js";





export class DXSpiderParser {


    private normalizer =
        new SpotNormalizer();




    constructor(

        private fusionEngine: FusionEngine,

        private sourceName: string

    ) {}







    parse(data: string) {


        const lines =
            data.split("\n");



        for (const line of lines) {


            const raw =
                this.parseLine(line);



            if (!raw)
                continue;



            const spot =
                this.normalizer.normalize(

                    raw,

                    this.sourceName

                );



            if (spot) {

                this.fusionEngine.addSpot(
                    spot
                );

            }


        }

    }









    private parseLine(line:string) {



        /*
            Nur echte DXSpider Spots

            Beispiel:

            DX de HB9XXX:
            14025.0 VK9XX CW

        */



        if (
            !line.includes("DX de")
        ) {

            return null;

        }





        const match =
            line.match(

                /(\d+\.\d+)\s+([A-Z0-9\/]+)\s+(.*)/i

            );



        if(!match)
            return null;




        const frequency =
            Number(match[1]);



        const call =
            match[2];



        const comment =
    (match[3] ?? "")
        .trim();





        return {


            frequency,


            call,


            mode:
                this.detectMode(
                    comment
                ),


            comment


        };


    }









    private detectMode(
        text:string
    ):string {


        const modes = [

            "FT8",
            "FT4",
            "RTTY",
            "CW",
            "SSB",
            "USB",
            "LSB"

        ];



        const upper =
            text.toUpperCase();



        for(
            const mode of modes
        ) {


            if(
                upper.includes(mode)
            ) {

                return mode;

            }

        }



        return "UNKNOWN";

    }


}
