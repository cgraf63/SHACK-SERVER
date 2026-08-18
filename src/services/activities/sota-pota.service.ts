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


    start() {

        console.log(
            "Starting SOTA/POTA service..."
        );


        this.update();


        this.timer =
            setInterval(
                () => this.update(),
                60 * 1000
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

    }


    isSota(
        call: string
    ): boolean {

        return this.sotaCalls.has(
            this.baseCall(call)
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


    private async updateSota() {

        const response =
            await fetch(
                "https://api-db2.sota.org.uk/api/spots/50/all/all"
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
