import {
    ShackSettings
} from "../../config/settings.config.js";

import {
    operator
} from "../../config/operator.config.js";


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


export function createClusterSources(
    settings: ShackSettings
): ClusterSource[] {

    const sources: ClusterSource[] = [];


    /*
        DXSpider
    */

    if (
        settings.sources.dxspider
    ) {

        for (
            const dx of settings.dxspiders
        ) {

            if (!dx.enabled) {
                continue;
            }


            sources.push({

                name:
                    dx.name,

                type:
                    "dxspider",

                host:
                    dx.host,

                port:
                    dx.port,

                callsign:
                    settings.callsign,

                password:
                    dx.password ?? "",

                enabled:
                    true,

                reconnect:
                    true,

                reconnectDelay:
                    30

            });

        }

    }


    /*
        HolyCluster
    */

    if (
        settings.sources.holycluster
    ) {

        sources.push({

            name:
                "HolyCluster",

            type:
                "holycluster",

            enabled:
                true,

            reconnect:
                true,

            reconnectDelay:
                30

        });

    }


    /*
        DX Summit
    */

    if (
        settings.sources.dxsummit
    ) {

        sources.push({

            name:
                "DX Summit",

            type:
                "dxsummit",

            enabled:
                true,

            reconnect:
                false,

            reconnectDelay:
                0,

            interval:
                60

        });

    }


    return sources;

}
