import {
    ClusterSource
} from "./sources.config.js";
import {
    SourceStatusService
} from "./source-status.service.js";
import net from "node:net";


import {
    FusionEngine
} from "../fusion/fusion-engine.js";



import {
    DXSpiderParser
} from "./dxspider.parser.js";



export class DXSpiderConnector {


    private socket: net.Socket | undefined;


    private parser: DXSpiderParser;




    constructor(

        private config: ClusterSource,

        fusionEngine: FusionEngine,
 	sourceStatus: SourceStatusService

    ) {


        this.parser =
    new DXSpiderParser(

        this.config,

        fusionEngine,

        config.name,

        sourceStatus

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

console.log(
    "DXSPIDER RAW:",
    text
);



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
