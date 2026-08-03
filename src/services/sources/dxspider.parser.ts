import {
    ClusterSource
} from "./sources.config.js";

import {
    SourceStatusService
} from "./source-status.service.js";

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

	private source: ClusterSource,
        private fusionEngine: FusionEngine,
	private sourceName: string,
	private sourceStatus: SourceStatusService

    ) {}







    async parse(data: string) {


        const lines =
            data.split("\n");



        for (const line of lines) {


            const raw =
  		  this.parseLine(line);


console.log(
    "AFTER PARSELINE:",
    raw
);


		if (!raw)
		continue;
console.log(
    "DXSPIDER RAW BEFORE NORMALIZE",
    raw?.call,
    raw?.locator
);

if (!raw)
    continue;


            const spot =
                this.normalizer.normalize(

                    raw,

                    this.sourceName

                );


	if (spot) {

    this.sourceStatus.touch(
        this.sourceName
    );

console.log(
    "DXSPIDER PARSED:",
    spot
);

    await this.fusionEngine.addSpot(
        spot
    );

}
            
            


        }

    }









  private parseLine(line:string) {


    if (
        !line.includes("DX de")
    ) {
        return null;
    }

const match =
    line.match(
        /DX de .*?:\s+(\d+(?:\.\d+)?)\s+(\S+)\s*(.*)/i
    );

    if (!match) {
        return null;
    }


    let frequency =
        Number(match[1]);


    /*
       DXSpider Frequenzen kommen teilweise
       als kHz ohne Dezimalpunkt:
       
       144267.1 -> 144.2671
       50313.8  -> 50.3138
       28074.0  -> 28.0740
    */

    if (frequency > 1000) {

        frequency =
            frequency / 1000;

    }


    const call =
    match[2];

const comment =
    (match[3] ?? "")
        .trim();

console.log(
    "DXSPIDER COMMENT:",
    comment
);


const locator =
    undefined;

console.log(
    "LOCATOR DEBUG:",
    comment,
    "=>",
    locator
);
console.log(
    "DXSPIDER PARSER OUTPUT",
    call,
    locator
);

    return {

        frequency,

        call,

        mode:
            this.detectMode(
                comment
            ),


        comment,
	locator

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
