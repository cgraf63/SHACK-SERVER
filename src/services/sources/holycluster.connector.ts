import {
    ClusterSource
} from "./sources.config.js";


import {
    FusionEngine
} from "../fusion/fusion-engine.js";


import {
    SpotNormalizer
} from "../fusion/spot-normalizer.js";


import WebSocket from "ws";



export class HolyClusterConnector {


    private socket: WebSocket | undefined;


    private normalizer: SpotNormalizer =
        new SpotNormalizer();




    constructor(

        private source: ClusterSource,

        private fusionEngine: FusionEngine

    ) {}







    connect() {


        console.log(
            `HolyCluster connecting: ${this.source.name}`
        );



        this.socket =
            new WebSocket(
                "wss://holycluster.iarc.org/spots_ws"
            );



        const socket =
            this.socket;



        socket.on(
            "open",
            () => {

                console.log(
                    "HolyCluster connected"
                );

            }
        );





        socket.on(
            "message",
            (data: WebSocket.Data) => {


                try {


                    const message =
                        JSON.parse(
                            data.toString()
                        );



                    if (
                        message.type !== "update"
                    ) {

                        return;

                    }



                    for (
                        const raw of message.spots
                    ) {



                        const spot =

                            this.normalizer.normalize(

                                {

                                    call:
                                        raw.dx_callsign,


                                    frequency:
                                        raw.freq,


                                    mode:
                                        raw.mode,


                                    snr:
                                        this.extractSnr(
                                            raw.comment
                                        )


                                },


                                "HolyCluster"

                            );





                        if (
                            spot
                        ) {


                            console.log(
                                "HolyCluster normalized:",
                                spot
                            );



                            this.fusionEngine.addSpot(
                                spot
                            );


                        }


                    }



                }
                catch(error) {


                    console.error(
                        "HolyCluster parse error",
                        error
                    );


                }


            }
        );





        socket.on(
            "error",
            error => {

                console.error(
                    "HolyCluster error",
                    error
                );

            }
        );



        socket.on(
            "close",
            () => {

                console.log(
                    "HolyCluster disconnected"
                );

            }
        );


    }









    private extractSnr(

        comment: string | undefined

    ): number | undefined {


        if (
            !comment
        ) {

            return undefined;

        }



        const match =
            comment.match(
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


        if (
            this.socket
        ) {


            this.socket.close();


        }


    }


}
