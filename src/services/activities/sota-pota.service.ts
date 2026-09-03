import * as net from "node:net";

interface SotaSpot {

    activatorCallsign: string;

    summitCode: string;

    timeStamp: string;

}


interface PotaSpot {

    activator: string;

    reference: string;

    spotTime: string;

    expire: number;

}


export class SotaPotaService {


    private sotaCalls =
        new Set<string>();


    private potaCalls =
        new Set<string>();


    private timer:
        NodeJS.Timeout | undefined;


    private sotaClusterSocket:
        net.Socket | undefined;


    private sotaClusterReconnectTimer:
        NodeJS.Timeout | undefined;


    private sotaClusterKeepaliveTimer:
        NodeJS.Timeout | undefined;


    private sotaClusterCalls =
        new Set<string>();


    private sotaClusterBuffer =
        "";



    start() {

        console.log(
            "Starting SOTA/POTA service..."
        );

console.log("SOTA CLUSTER START TEST");

        this.startSotaCluster();


        this.update();


        this.timer =
            setInterval(
                () => this.update(),
               5 * 60 * 1000
            );

    }


    stop() {

        if (
            this.timer
        ) {

            clearInterval(
                this.timer
            );


            this.timer =
                undefined;

        }


        this.stopSotaCluster();

    }


isSota(
    call: string
): boolean {

    const base =
        this.baseCall(call);

    return (
        this.sotaCalls.has(base) ||
        this.sotaClusterCalls.has(base)
    );

}

    isPota(
        call: string
    ): boolean {

        return this.potaCalls.has(
            this.baseCall(call)
        );

    }


    private baseCall(
        call: string
    ): string {

        return call
            .toUpperCase()
            .split("/")[0]!
            .trim();

    }


    private async update() {

        try {

            await Promise.all([

                this.updateSota(),

                this.updatePota()

            ]);


            console.log(

                `SOTA/POTA updated: ` +

                `${this.sotaCalls.size} SOTA, ` +

                `${this.potaCalls.size} POTA`

            );

        }
        catch (error) {

            console.error(
                "SOTA/POTA update error",
                error
            );

        }

    }


    private startSotaCluster() {

        if (
            this.sotaClusterSocket &&
            !this.sotaClusterSocket.destroyed
        ) {
            return;
        }

console.log(
    "SOTA cluster connecting to cluster.sota.org.uk:73xx"
);

        const socket =
            net.createConnection(
                {
                    host:
                        "cluster.sota.org.uk",
                    port:
                        7373
                }
            );


        this.sotaClusterSocket =
            socket;


        socket.setEncoding(
            "utf8"
        );


        socket.on(
            "connect",
            () => {

                console.log(
                    "SOTA cluster connected"
                );


                const login =
                    (
                        process.env.STATION_CALLSIGN ||
                        process.env.CALLSIGN ||
                        "HB9ISO"
                    ).trim();


                socket.write(
                    `${login}\r\n`
                );


                this.sotaClusterKeepaliveTimer =
                    setInterval(
                        () => {

                            if (
                                !socket.destroyed
                            ) {

                                socket.write(
                                    "\r\n"
                                );

                            }

                        },
                        15 * 60 * 1000
                    );

            }
        );


        socket.on(
            "data",
            (
                chunk: string
            ) => {

                this.sotaClusterBuffer +=
                    chunk;


                const lines =
                    this.sotaClusterBuffer.split(
                        /\r?\n/
                    );


                this.sotaClusterBuffer =
                    lines.pop() || "";


                for (
                    const line of lines
                ) {

                    this.handleSotaClusterLine(
                        line
                    );

                }

            }
        );


        socket.on(
            "error",
            error => {

                console.error(
                    "SOTA cluster error:",
                    error.message
                );

            }
        );


        socket.on(
            "close",
            () => {

                if (
                    this.sotaClusterKeepaliveTimer
                ) {

                    clearInterval(
                        this.sotaClusterKeepaliveTimer
                    );

                    this.sotaClusterKeepaliveTimer =
                        undefined;

                }


                this.sotaClusterSocket =
                    undefined;


                if (
                    !this.sotaClusterReconnectTimer
                ) {

                    this.sotaClusterReconnectTimer =
                        setTimeout(
                            () => {

                                this.sotaClusterReconnectTimer =
                                    undefined;

                                this.startSotaCluster();

                            },
                            30 * 1000
                        );

                }

            }
        );

    }


    private stopSotaCluster() {

        if (
            this.sotaClusterKeepaliveTimer
        ) {

            clearInterval(
                this.sotaClusterKeepaliveTimer
            );

            this.sotaClusterKeepaliveTimer =
                undefined;

        }


        if (
            this.sotaClusterReconnectTimer
        ) {

            clearTimeout(
                this.sotaClusterReconnectTimer
            );

            this.sotaClusterReconnectTimer =
                undefined;

        }


        if (
            this.sotaClusterSocket
        ) {

            this.sotaClusterSocket.destroy();

            this.sotaClusterSocket =
                undefined;

        }


        this.sotaClusterBuffer =
            "";

    }


    private handleSotaClusterLine(
        line: string
    ) {

        const match =
            line.match(
                /^DX de [^:]+:\s+\S+\s+(\S+)\s+([A-Z0-9]+\/[A-Z0-9]+-\d{3,4})\s+\d{4}Z\s*$/i
            );


        if (!match) {
            return;
        }


        const callValue = match[1];
        const summitValue = match[2];

        if (!callValue || !summitValue) {
            return;
        }


        const call =
            this.baseCall(
                callValue
            );


        const summitCode =
            summitValue.toUpperCase();


        if (!call) {
            return;
        }


        const wasKnown =
            this.sotaClusterCalls.has(
                call
            );


        this.sotaClusterCalls.add(
            call
        );


        if (!wasKnown) {

            console.log(
                `SOTA cluster spot: ${call} ${summitCode}`
            );

        }

    }


    private async updateSota() {

        const response =
            await fetch(
                "https://api2.sota.org.uk/api/spots/50/all/all",
                {
                    headers: {
                        "User-Agent":
                            "SHACK-SERVER/1.0 (HB9ISO)"
                    }
                }
            );


        if (
            !response.ok
        ) {

            throw new Error(
                `HTTP ${response.status}`
            );

        }


        const spots: SotaSpot[] =
    	    await response.json();


        const calls =
            new Set<string>();


        for (
            const spot of spots
        ) {

            if (
                !spot.activatorCallsign
            ) {

                continue;

            }


            calls.add(
                this.baseCall(
                    spot.activatorCallsign
                )
            );

        }


        this.sotaCalls =
            calls;

    }


    private async updatePota() {

        const response =
            await fetch(
                "https://api.pota.app/spot/activator"
            );


        if (
            !response.ok
        ) {

            throw new Error(
                `HTTP ${response.status}`
            );

        }


        const spots: PotaSpot[] =
    await response.json();


        const calls =
            new Set<string>();


        for (
            const spot of spots
        ) {

            if (
                !spot.activator
            ) {

                continue;

            }


            calls.add(
                this.baseCall(
                    spot.activator
                )
            );

        }


        this.potaCalls =
            calls;

    }

}
