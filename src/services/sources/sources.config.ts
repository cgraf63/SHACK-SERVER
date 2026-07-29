import {
    operator
} from "../../config/operator.config.js";



export interface ClusterSource {

    name: string;


    type:
        | "dxspider"
        | "holycluster"
        | "dxsummit";



    host: string;


    port: number;



    callsign: string;


    password?: string;



    enabled: boolean;


    reconnect: boolean;


    reconnectDelay: number;

}



export const clusterSources: ClusterSource[] = [


    {
        name: "HB9ON-8",

        type: "dxspider",

        host: "spider.hb9on.net",

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

        host: "CHANGE_ME",

        port: 7300,

        callsign: "HB9OM",

        password: "",

        enabled: true,

        reconnect: true,

        reconnectDelay: 30
    },



    {
        name: "DX Summit",

        type: "dxsummit",

        host: "www.dxsummit.fi",

        port: 0,

        callsign: "HB9OM",

        enabled: true,

        reconnect: false,

        reconnectDelay: 0
    }

];
