import { operator } from "../../config/operator.config.js";


export interface ClusterSource {

    name: string;

    type:
        | "dxspider"
        | "holycluster"
        | "dxsummit";

    host?: string;

    port?: number;

    callsign?: string;

    password?: string;

    enabled: boolean;

    reconnect: boolean;

    reconnectDelay: number;

    interval?: number;
}


export const clusterSources: ClusterSource[] = [

    {
        name: "HB9ON-8",

        type: "dxspider",

        host: "193.108.55.24",

        port: 8000,

        callsign: operator.callsign,

        password: "",

        enabled: true,

        reconnect: true,

        reconnectDelay: 30
    },


    {
        name: "HB9IAC-8",

        type: "dxspider",

        host: "dxc.iapc.ch",

        port: 8000,

        callsign: operator.callsign,

        password: "",

        enabled: true,

        reconnect: true,

        reconnectDelay: 30
    },


    {
        name: "HolyCluster",

        type: "holycluster",

        enabled: true,

        reconnect: true,

        reconnectDelay: 30
    },


    {
        name: "DX Summit",

        type: "dxsummit",

        enabled: true,

        reconnect: false,

        reconnectDelay: 0,

        interval: 60
    }

];
