import { SpotNormalizer } from "../fusion/spot-normalizer.js";
import { FusionEngine } from "../fusion/fusion-engine.js";


export class DXSpiderParser {


    private normalizer =
        new SpotNormalizer();



    constructor(
        private fusionEngine: FusionEngine,
        private sourceName: string
    ) {}



    parse(
        data:string
    ) {


        const lines =
            data.split("\n");


        lines.forEach(
            line => {


                const spot =
                    this.parseLine(
                        line
                    );


                if(!spot)
                    return;



                const normalized =
                    this.normalizer.normalize(
                        spot,
                        this.sourceName
                    );



                if(normalized) {

                    this.fusionEngine.addSpot(
                        normalized
                    );

                }


            }
        );


    }





    private parseLine(
        line:string
    ) {


        /*
          Typische DXSpider Meldung:

          DX de HB9XXX:
          14025.0 VK9XX CW
        */


        const match =
            line.match(
                /(\d+\.\d+)\s+([A-Z0-9\/]+)\s+([A-Z]+)/i
            );



        if(!match)
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
