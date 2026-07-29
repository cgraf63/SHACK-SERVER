import {
    clusterSources,
    ClusterSource
} from "./sources.config.js";


import { DXSpiderConnector } 
from "./dxspider.connector.js";


import { FusionEngine }
from "../fusion/fusion-engine.js";



export class SourceManager {


    private connectors: DXSpiderConnector[] = [];



    constructor(

        private fusionEngine: FusionEngine

    ) {}





    start() {


        console.log(
            "Starting source manager..."
        );



        clusterSources
            .filter(
                source => source.enabled
            )
            .forEach(
                source => {

                    this.startSource(
                        source
                    );

                }
            );


    }





    private startSource(
        source: ClusterSource
    ) {


        switch(source.type) {


            case "dxspider":


                const connector =
                    new DXSpiderConnector(

                        source,

                        this.fusionEngine

                    );



                this.connectors.push(
                    connector
                );



                connector.connect();


                break;



            case "holycluster":

                console.log(
                    "HolyCluster connector pending"
                );

                break;



            case "dxsummit":

                console.log(
                    "DX Summit connector pending"
                );

                break;


        }


    }




    stop() {


        this.connectors.forEach(
            connector => {

                connector.disconnect();

            }
        );


    }


}
