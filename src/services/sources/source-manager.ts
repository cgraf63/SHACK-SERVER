import {
    clusterSources,
    ClusterSource
} from "./sources.config.js";



import {
    DXSpiderConnector
} from "./dxspider.connector.js";



import {
    DXSummitConnector
} from "./dxsummit.connector.js";

import {
    HolyClusterConnector
} from "./holycluster.connector.js";

import {
    FusionEngine
} from "../fusion/fusion-engine.js";







export class SourceManager {



    private dxspiderConnectors:
        DXSpiderConnector[] = [];



    private dxsummitConnectors:
        DXSummitConnector[] = [];

    private holyClusterConnectors:
        HolyClusterConnector[] = [];





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



                console.log(

                    `Starting ${source.name}`

                );



                const dxspider =

                    new DXSpiderConnector(

                        source,

                        this.fusionEngine

                    );



                this.dxspiderConnectors.push(

                    dxspider

                );



                dxspider.connect();



                break;









            case "dxsummit":



                console.log(

                    `Starting ${source.name}`

                );



                const dxsummit =

                    new DXSummitConnector(

                        source,

                        this.fusionEngine

                    );



                this.dxsummitConnectors.push(

                    dxsummit

                );



                dxsummit.connect();



                break;









            case "holycluster":


    console.log(
        `Starting ${source.name}`
    );


    const holyCluster =

        new HolyClusterConnector(

            source,

            this.fusionEngine

        );


    this.holyClusterConnectors.push(

        holyCluster

    );


    holyCluster.connect();


    break;


                



        }


    }









    stop() {



        this.dxspiderConnectors.forEach(

            connector => {

                connector.disconnect();

            }

        );





        this.dxsummitConnectors.forEach(

            connector => {

                connector.disconnect();

            }

        );


    }



}
