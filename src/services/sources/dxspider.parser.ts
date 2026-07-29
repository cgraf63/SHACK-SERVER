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


            const rawSpot =
                this.parseLine(line);



            if (!rawSpot)
                continue;



            const spot =
                this.normalizer.normalize(

                    rawSpot,

                    this.sourceName

                );



            if (spot) {


                this.fusionEngine.addSpot(
                    spot
                );


            }


        }


    }







    private parseLine(line: string) {


        /*
            Typische DXSpider Meldung:

            DX de HB9XXX:
            14025.0 VK9XX CW
        */



        const match =
            line.match(

                /(\d+\.\d+)\s+([A-Z0-9\/]+)\s+([A-Z0-9]+)/i

            );



        if (!match)
            return null;



        return {


            frequency:
                Number(match[1]),



            call:
                match[2],



            mode:
                match[3]

        };


    }



}
