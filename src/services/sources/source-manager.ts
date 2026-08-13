import {
    createClusterSources,
    ClusterSource
} from "./sources.config.js";

import {
    settingsService
} from "../settings/settings.service.js";

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

import {
    SourceStatusService
} from "./source-status.service.js";


export class SourceManager {


    private dxspiderConnectors:
        DXSpiderConnector[] = [];


    private dxsummitConnectors:
        DXSummitConnector[] = [];


    private holyClusterConnectors:
        HolyClusterConnector[] = [];


    constructor(

        private fusionEngine: FusionEngine,
        private sourceStatus: SourceStatusService

    ) {

        settingsService.onUpdate(
            () => {

                console.log(
                    "Settings changed - refreshing sources..."
                );


                this.refresh();

            }
        );

    }


    start(): void {

        console.log(
            "Starting source manager..."
        );


        const settings =
            settingsService.get();


        const clusterSources =
            createClusterSources(
                settings
            );


        clusterSources
            .filter(
                (source: ClusterSource) =>
                    source.enabled
            )
            .forEach(
                (source: ClusterSource) => {

                    this.startSource(
                        source
                    );

                }
            );

    }


    private startSource(
        source: ClusterSource
    ): void {

        switch (source.type) {


            case "dxspider":

                console.log(
                    `Starting ${source.name}`
                );


                const dxspider =
                    new DXSpiderConnector(
                        source,
                        this.fusionEngine,
                        this.sourceStatus
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
                        this.fusionEngine,
                        this.sourceStatus
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
                        this.fusionEngine,
                        this.sourceStatus
                    );


                this.holyClusterConnectors.push(
                    holyCluster
                );


                holyCluster.connect();

                break;

        }

    }


    stop(): void {

        console.log(
            "Stopping source manager..."
        );


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


        this.holyClusterConnectors.forEach(
            connector => {

                connector.disconnect();

            }
        );


        this.dxspiderConnectors = [];

        this.dxsummitConnectors = [];

        this.holyClusterConnectors = [];

    }


    refresh(): void {

        console.log(
            "Refreshing source manager..."
        );


        this.stop();


        this.start();

    }


    restart(): void {

        console.log(
            "Restarting source manager..."
        );


        this.refresh();

    }

}
