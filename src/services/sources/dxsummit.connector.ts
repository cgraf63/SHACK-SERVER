import {
    ClusterSource
} from "./sources.config.js";


import {
    FusionEngine
} from "../fusion/fusion-engine.js";



export class DXSummitConnector {


    private timer?: NodeJS.Timeout;



    constructor(

        private source: ClusterSource,

        private fusionEngine: FusionEngine

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


            /*
                TODO:
                HTTP/API Zugriff
                Parser
                SpotNormalizer

            */



        }
        catch(error) {


            console.error(
                "DX Summit error",
                error
            );


        }


    }







    disconnect() {


        if(this.timer) {

            clearInterval(
                this.timer
            );

        }


    }


}
