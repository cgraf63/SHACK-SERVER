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

import {
    systemLog
} from "../diagnostics/system-log.service.js";


export class DXSpiderConnector {


    private socket:
        net.Socket | undefined;


    private parser:
        DXSpiderParser;


    constructor(

        private config: ClusterSource,

        fusionEngine: FusionEngine,

        private sourceStatus:
            SourceStatusService

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


        if (
            this.config.host === undefined ||
            this.config.port === undefined
        ) {

            console.error(
                `${this.config.name}: DXSpider host or port is missing`
            );


            systemLog.error(
                this.config.name,
                "DXSpider",
                "Host or port is missing"
            );


            return;

        }


        systemLog.info(
            this.config.name,
            "DXSpider",
            `Connecting to ${this.config.host}:${this.config.port}`
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


                systemLog.info(
                    this.config.name,
                    "DXSpider",
                    "Connected"
                );


                this.login();

            }

        );


        this.socket.on(

            "data",

            data => {

                const text =
                    data.toString();


                /*
                 * Datenempfang bedeutet:
                 *
                 * Der Cluster liefert Daten.
                 *
                 * Deshalb wird der Source-Status
                 * bereits hier aktualisiert.
                 *
                 * Nicht erst nach erfolgreichem Parsing.
                 */

                this.sourceStatus.touch(
                    this.config.name
                );


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


                systemLog.info(
                    this.config.name,
                    "DXSpider",
                    "Disconnected"
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


                systemLog.error(
                    this.config.name,
                    "DXSpider",
                    error.message
                );

            }

        );

    }


    private login() {

        if (
            !this.socket
        ) {

            return;

        }


        this.socket.write(
            `${this.config.callsign}\r\n`
        );


        if (
            this.config.password
        ) {

            this.socket.write(
                `${this.config.password}\r\n`
            );

        }


        systemLog.info(
            this.config.name,
            "DXSpider",
            "Login credentials sent"
        );

    }


    disconnect() {

        if (
            this.socket
        ) {

            systemLog.info(
                this.config.name,
                "DXSpider",
                "Disconnect requested"
            );


            this.socket.destroy();

            this.socket =
                undefined;

        }

    }

}
