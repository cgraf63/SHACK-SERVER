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


import WebSocket from "ws";



export class HolyClusterConnector {


    private socket: WebSocket | undefined;

    /*
     * Reconnect: after a close / error (10 s, up to 2 min when it keeps
     * failing) and when no message arrived for 10 minutes (connection
     * dropped somewhere without a close). Ping every 30 s keeps NAT
     * and proxies open.
     */
    private reconnectTimer: NodeJS.Timeout | undefined;
    private keepaliveTimer: NodeJS.Timeout | undefined;
    private lastMessage = 0;
    private failures = 0;

    private static readonly SILENT_MS = 10 * 60 * 1000;
    private static readonly PING_MS = 30 * 1000;


    private normalizer: SpotNormalizer =
        new SpotNormalizer();




   constructor(

    private source: ClusterSource,
    private fusionEngine: FusionEngine,
    private sourceStatus: SourceStatusService

) {}






    connect() {

        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = undefined;
        }

        this.stopKeepalive();


        console.log(
            `HolyCluster connecting: ${this.source.name}`
        );



        this.socket =
            new WebSocket(
                "wss://holycluster.iarc.org/spots_ws"
            );



        const socket =
            this.socket;

        this.lastMessage = Date.now();



        socket.on(
            "open",
            () => {

                console.log(
                    "HolyCluster connected"
                );

                this.failures = 0;
                this.lastMessage = Date.now();
                this.startKeepalive(socket);

            }
        );





        socket.on(
            "message",
            (data: WebSocket.Data) => {

                this.lastMessage = Date.now();


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


				    comment:
					raw.comment,
                                    snr:
                                        this.extractSnr(
                                            raw.comment
                                        )


                                },


                                "HolyCluster"

                            );





  if (spot) {

    console.log(
        "HolyCluster normalized:",
        spot
    );

    this.sourceStatus.touch(
        "HolyCluster"
    );

    this.fusionEngine.addSpot(
        spot
    );

}   // <-- Ende if(spot)


// danach weiter mit socket.on(...)

    
  }   // Ende for                           

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
                    "HolyCluster error:",
                    error instanceof Error ? error.message : error
                );

                // "close" follows and reconnects

            }
        );



        socket.on(
            "close",
            () => {

                console.log(
                    "HolyCluster disconnected"
                );

                if (this.socket === socket) {
                    this.stopKeepalive();
                    this.scheduleReconnect();
                }

            }
        );


    }



    private scheduleReconnect(): void {

        if (this.reconnectTimer) {
            return;
        }

        this.failures++;

        const delay =
            Math.min(120_000, 10_000 * this.failures);

        console.log(
            `HolyCluster reconnect in ${Math.round(delay / 1000)} s`
        );

        this.reconnectTimer =
            setTimeout(() => {
                this.reconnectTimer = undefined;
                this.connect();
            }, delay);

    }



    private startKeepalive(socket: WebSocket): void {

        this.stopKeepalive();

        this.keepaliveTimer =
            setInterval(() => {

                if (socket.readyState !== WebSocket.OPEN) {
                    return;
                }

                if (Date.now() - this.lastMessage > HolyClusterConnector.SILENT_MS) {

                    console.log(
                        "HolyCluster: no data for 10 minutes - reconnecting"
                    );

                    // terminate() fires "close" -> scheduleReconnect()
                    socket.terminate();
                    return;

                }

                try {
                    socket.ping();
                }
                catch {
                    // close follows
                }

            }, HolyClusterConnector.PING_MS);

    }



    private stopKeepalive(): void {

        if (this.keepaliveTimer) {
            clearInterval(this.keepaliveTimer);
            this.keepaliveTimer = undefined;
        }

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
