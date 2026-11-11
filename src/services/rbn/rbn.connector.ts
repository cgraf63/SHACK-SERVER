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
    CallsignResolverService
} from "../geo/callsign-resolver.service.js";



import {
    RbnSpot,
    parseRbnLine
} from "./rbn.parser.js";

import {
    RbnGeoService
} from "./rbn-geo.service.js";
import {
    heardService,
    bandOfKhz
} from "../needed/heard.service.js";


const RBN_HOST =
    "telnet.reversebeacon.net";

const RBN_PORT =
    7000;

const MAX_SPOTS =
    100;


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
private callsignResolverService =
    new CallsignResolverService();

    private stopped = false;
    private reconnectTimer: NodeJS.Timeout | undefined;

    /*
     * Watchdog: the RBN sends several lines per second. A connection that
     * stays silent (half-open TCP after a network or router hiccup) is
     * never closed by the OS - then "heard near you" (NEAR) dies quietly.
     * No data for 3 minutes -> reconnect.
     */
    private lastData = 0;
    private watchdog: NodeJS.Timeout | undefined;
    private static readonly SILENCE_MS = 3 * 60_000;

    /* for the diagnostics: last data received, lines since the start */
    getStatus(): { connected: boolean; lastData: number; lines: number } {
        return {
            connected: !!this.socket && !this.socket.destroyed && this.socket.readyState === "open",
            lastData: this.lastData,
            lines: this.lines
        };
    }

    private lines = 0;

    connect(): void {

        this.stopped = false;

        this.socket?.removeAllListeners();
        this.socket?.destroy();
        this.socket = undefined;
        this.buffer = "";

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

        this.socket.setKeepAlive(true, 60_000);

        this.lastData = Date.now();

        this.watchdog ??= setInterval(() => {
            if (this.stopped || !this.socket || this.socket.destroyed) return;
            if (Date.now() - this.lastData > RbnConnector.SILENCE_MS) {
                console.warn(`RBN: no data for ${Math.round((Date.now() - this.lastData) / 1000)} s - reconnecting`);
                this.lastData = Date.now();
                // "close" -> reconnect in 30 s
                this.socket.destroy();
            }
        }, 30_000);
        this.watchdog.unref?.();


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

                this.lastData = Date.now();

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

                /* reconnect unless disconnect() was requested */
                if (!this.stopped) {
                    this.reconnectTimer ??= setTimeout(() => {
                        this.reconnectTimer = undefined;
                        console.log("RBN: Reconnecting");
                        this.connect();
                    }, 30_000);
                }

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

        this.lines++;

        const spot =
            parseRbnLine(
                line
            );


        if (!spot) {
            return;
        }


        /*
         * Every skimmer spot (any callsign) goes to the "heard near you"
         * index - not to the spot list.
         */
        await this.recordHeard(spot);


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

const spotterInfo =
    this.callsignResolverService.resolve(
        spot.spotter.split("-")[0] || ""
    );

if (spotterInfo) {

    spot.spotterCountryCode =
        spotterInfo.countryCode;

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


    private async recordHeard(spot: RbnSpot): Promise<void> {

        try {

            const spotter =
                spot.spotter.replace(/-(#|\d+)$/, "").toUpperCase();

            const grid =
                await this.rbnGeoService.getSpotterGrid("", spot.spotter);

            heardService.report(spot.callsign, {
                spotter,
                source: "RBN",
                band: bandOfKhz(spot.frequency),
                at: Date.now(),
                snr: spot.snr,
                ...(grid ? { locator: grid } : {})
            });

        }
        catch {
            // index only
        }

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

            this.stopped = true;

            if (this.reconnectTimer) {
                clearTimeout(this.reconnectTimer);
                this.reconnectTimer = undefined;
            }


            this.socket.destroy();


            this.socket =
                undefined;

        }

    }

}
