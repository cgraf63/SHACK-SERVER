import net from "node:net";

import { DXSpiderParser } from "./dxspider.parser.js";
import { FusionEngine } from "../fusion/fusion-engine.js";



export interface DXSpiderConfig {


    name: string;


    host: string;


    port: number;


    callsign: string;


    password?: string;


    reconnect?: boolean;


    reconnectDelay?: number;


}





export class DXSpiderConnector {



    private socket?: net.Socket;


    private parser: DXSpiderParser;



    constructor(

        private config: DXSpiderConfig,

        private fusionEngine: FusionEngine

    ) {


        this.parser =
            new DXSpiderParser(

                this.fusionEngine,

                this.config.name

            );


    }







    connect() {


        console.log(

            `Connecting to ${this.config.name}...`

        );



        this.socket =
            new net.Socket();




        this.socket.connect(

            this.config.port,

            this.config.host,

            () => {


                console.log(

                    `${this.config.name} connected`

                );


                this.login();


            }

        );






        this.socket.on(

            "data",

            data => {


                const text =
                    data.toString();


                this.parser.parse(
                    text
                );


            }

        );







        this.socket.on(

            "close",

            () => {


                console.log(

                    `${this.config.name} disconnected`

                );



                this.handleReconnect();


            }

        );







        this.socket.on(

            "error",

            error => {


                console.error(

                    `${this.config.name}:`,

                    error.message

                );


            }

        );



    }









    private login() {


        if(!this.socket)

            return;




        /*
            DXSpider Login

            meistens:
            CALLSIGN
            PASSWORD (optional)

        */


        this.socket.write(

            `${this.config.callsign}\r\n`

        );




        if(this.config.password) {


            this.socket.write(

                `${this.config.password}\r\n`

            );


        }



    }









    private handleReconnect() {


        if(
            !this.config.reconnect
        )

            return;



        const delay =

            (this.config.reconnectDelay || 30)
            * 1000;





        console.log(

            `${this.config.name}: reconnect in ${delay / 1000}s`

        );




        setTimeout(

            () => {

                this.connect();

            },

            delay

        );


    }








    disconnect() {


        if(this.socket) {


            this.socket.destroy();


            this.socket = undefined;


        }


    }



}
