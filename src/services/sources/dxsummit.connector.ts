import {
    SourceStatusService
} from "./source-status.service.js";
import {
    ClusterSource
} from "./sources.config.js";


import {
    FusionEngine
} from "../fusion/fusion-engine.js";


import {
    SpotNormalizer
} from "../fusion/spot-normalizer.js";



export class DXSummitConnector {


    private timer?: NodeJS.Timeout;


    private normalizer =
        new SpotNormalizer();




    constructor(

    private source: ClusterSource,
    private fusionEngine: FusionEngine,
    private sourceStatus: SourceStatusService

) {}




    connect() {


        console.log(
            `DX Summit started: ${this.source.name}`
        );



        const interval =
            (this.source.interval ?? 60)
            *
            1000;



        this.fetchSpots();



        this.timer =
            setInterval(

                () => {

                    this.fetchSpots();

                },

                interval

            );


    }









    private async fetchSpots() {


        try {


            console.log(
                "DX Summit fetch..."
            );



            const response =
                await fetch(
                    "http://www.dxsummit.fi/api/v1/spots"
                );



            const data =
                await response.json();



            let count = 0;



            for (
                const raw of data
            ) {


                const spot =

                    this.normalizer.normalize(

                        {

                            call:
                                raw.dx_call,


                            frequency:
                                raw.frequency,


                            mode:
                                raw.info,


			    comment:
    				raw.info,
                            snr:
                                this.extractSnr(
                                    raw.info
                                )

                        },

                        "DX Summit"

                    );



              

if (
    spot
) {


    console.log(
        "DX Summit normalized:",
        spot
    );


    this.sourceStatus.touch(
        "DX Summit"
    );


    this.fusionEngine.addSpot(
        spot
    );


   
        count++;

    }

 }   // <-- Ende for (const raw of data)

    
    console.log(
        `DX Summit processed ${count} spots`
    );


    }
    catch(error) {

        console.error(
            "DX Summit fetch failed:",
            error
        );

    }

}


    private extractSnr(




        info: string | undefined
    ): number | undefined {


        if (
            !info
        ) {

            return undefined;

        }



        const match =
            info.match(
                /([+-]\d+)\s*dB/i
            );



        if (
            match
        ) {

            return Number(
                match[1]
            );

        }



        return undefined;

    }









    disconnect() {


        if(
            this.timer
        ) {


            clearInterval(
                this.timer
            );


        }


    }


}
