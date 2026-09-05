import net from "node:net";

import {
    settingsService
} from "../settings/settings.service.js";

import {
    ShackLocationService
} from "../geo/shack-location.service.js";

import {
    DistanceService
} from "../geo/distance.service.js";

import {
    MaidenheadService
} from "../geo/maidenhead.service.js";

import {
    RbnSpot,
    parseRbnLine
} from "./rbn.parser.js";

import {
    RbnGeoService
} from "./rbn-geo.service.js";


const RBN_HOST =
    "telnet.reversebeacon.net";

const RBN_PORT =
    7000;

const MAX_SPOTS =
    200;


export class RbnConnector {


    private socket:
        net.Socket | undefined;


    private buffer =
        "";


    private spots:
        RbnSpot[] = [];


    private rbnGeoService =
        new RbnGeoService();


    private shackLocationService =
        new ShackLocationService();


    private distanceService =
        new DistanceService();


    private maidenheadService =
        new MaidenheadService();


    connect(): void {

        const settings =
            settingsService.get();


        const callsign =
            String(
                settings.callsign || ""
            )
            .trim()
            .toUpperCase();


        if (!callsign) {

            console.error(
                "RBN: Own callsign is missing"
            );

            return;

        }


        console.log(
            `RBN: Connecting to ${RBN_HOST}:${RBN_PORT}`
        );


        this.socket =
            new net.Socket();


        this.socket.connect(

            RBN_PORT,

            RBN_HOST,

            () => {

                console.log(
                    "RBN: Connected"
                );


                this.socket?.write(
                    `${callsign}\r\n`
                );


                console.log(
                    `RBN: Login sent for ${callsign}`
                );

            }

        );


        this.socket.on(

            "data",

            data => {

                this.buffer +=
                    data.toString();


                const lines =
                    this.buffer.split(
                        /\r?\n/
                    );


                this.buffer =
                    lines.pop() || "";


                for (
                    const line of lines
                ) {

                    this.handleLine(
                        line
                    );

                }

            }

        );


        this.socket.on(

            "close",

            () => {

                console.log(
                    "RBN: Disconnected"
                );

            }

        );


        this.socket.on(

            "error",

            error => {

                console.error(
                    "RBN:",
                    error.message
                );

            }

        );

    }


    private async handleLine(
        line: string
    ): Promise<void> {

        const spot =
            parseRbnLine(
                line
            );


        if (!spot) {
            return;
        }


        const settings =
            settingsService.get();


        const ownCall =
            String(
                settings.callsign || ""
            )
            .trim()
            .toUpperCase();


        /*
         * Only keep RBN spots
         * for our own callsign.
         */
        if (
            spot.callsign.toUpperCase() !==
            ownCall
        ) {

            return;

        }


        /*
         * Determine the RBN spotter
         * grid square.
         */
        const spotterGrid =
            await this.rbnGeoService.getSpotterGrid(
                ownCall,
                spot.spotter
            );


        if (spotterGrid) {

            spot.spotterGrid =
                spotterGrid;


            try {

                /*
                 * Current shack location
                 * comes from Settings.
                 */
                const shackCoordinates =
                    this.shackLocationService.getCoordinates();


                /*
                 * Convert the RBN spotter
                 * grid square to coordinates.
                 */
                const spotterCoordinates =
                    this.maidenheadService.locatorToCoordinates(
                        spotterGrid
                    );


                if (spotterCoordinates) {

                    /*
                     * Distance is always:
                     *
                     * Shack → RBN spotter
                     */
                    spot.distanceKm =
                        this.distanceService.distanceKm(
                            shackCoordinates,
                            spotterCoordinates
                        );

                }

            }
            catch (error) {

                console.error(
                    "RBN Geo:",
                    error
                );

            }

        }


        this.spots.unshift(
            spot
        );


        if (
            this.spots.length >
            MAX_SPOTS
        ) {

            this.spots.length =
                MAX_SPOTS;

        }


        console.log(
            "RBN SPOT:",
            spot
        );

    }


    getSpots(): RbnSpot[] {

        return [
            ...this.spots
        ];

    }


    disconnect(): void {

        if (
            this.socket
        ) {

            console.log(
                "RBN: Disconnect requested"
            );


            this.socket.destroy();


            this.socket =
                undefined;

        }

    }

}
