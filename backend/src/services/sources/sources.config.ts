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
        name: "DXSpider #1",

        type: "dxspider",

        host: "CHANGE_ME",

        port: 7300,

        callsign: "HB9OM",

        password: "",

        enabled: true,

        reconnect: true,

        reconnectDelay: 30
    },




    {
        name: "DXSpider #2",

        type: "dxspider",

        host: "CHANGE_ME",

        port: 7300,

        callsign: "HB9OM",

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

        host: "CHANGE_ME",

        port: 0,

        callsign: "HB9OM",

        enabled: true,

        reconnect: false,

        reconnectDelay: 0
    }



];
