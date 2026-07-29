import net from "node:net";


import {
    FusionEngine
} from "../fusion/fusion-engine.js";



import {
    DXSpiderParser
} from "./dxspider.parser.js";




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


    private socket: net.Socket | undefined;


    private parser: DXSpiderParser;




    constructor(

        private config: DXSpiderConfig,

        fusionEngine: FusionEngine

    ) {


        this.parser =
            new DXSpiderParser(

                fusionEngine,

                config.name

            );


    }






    connect() {


        console.log(
            `Connecting ${this.config.name}...`
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




        this.socket.write(

            `${this.config.callsign}\r\n`

        );



        if(this.config.password) {


            this.socket.write(

                `${this.config.password}\r\n`

            );


        }


    }







    disconnect() {


        if(this.socket) {


            this.socket.destroy();


            this.socket = undefined;


        }


    }



}
