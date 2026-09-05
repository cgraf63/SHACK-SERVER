interface RbnSkimmer {

    callsign: string;

    grid: string;

}


const RBN_SKIMMER_URL =
    "https://reversebeacon.net/cont_includes/status.php?t=skt";


const CACHE_TIME_MS =
    60 * 60 * 1000;


export class RbnGeoService {


    private skimmers:
        Map<string, string> =
        new Map();


    private lastUpdate =
        0;


    private loading:
        Promise<void> | null =
        null;


    async getSpotterGrid(
        _callsign: string,
        spotter: string
    ): Promise<string | null> {

        await this.updateCache();


        const normalizedSpotter =
            this.normalizeSpotter(
                spotter
            );


        return (
            this.skimmers.get(
                normalizedSpotter
            )
            ?? null
        );

    }


    private async updateCache(): Promise<void> {

        const now =
            Date.now();


        if (
            this.skimmers.size > 0 &&
            now - this.lastUpdate <
                CACHE_TIME_MS
        ) {

            return;

        }


        if (this.loading) {

            await this.loading;

            return;

        }


        this.loading =
            this.loadSkimmers();


        try {

            await this.loading;

        }
        finally {

            this.loading =
                null;

        }

    }


    private async loadSkimmers(): Promise<void> {

        try {

            const response =
                await fetch(
                    RBN_SKIMMER_URL
                );


            if (!response.ok) {

                console.error(
                    "RBN Skimmer API:",
                    response.status
                );

                return;

            }


            const html =
                await response.text();


            const skimmers =
                this.parseSkimmers(
                    html
                );


            if (
                skimmers.length === 0
            ) {

                console.error(
                    "RBN Skimmer API: no skimmers found"
                );

                return;

            }


            this.skimmers.clear();


            for (
                const skimmer of skimmers
            ) {

                this.skimmers.set(
                    skimmer.callsign,
                    skimmer.grid
                );

            }


            this.lastUpdate =
                Date.now();


            console.log(
                `RBN: Loaded ${skimmers.length} skimmers`
            );

        }
        catch (error) {

            console.error(
                "RBN Skimmer API failed:",
                error
            );

        }

    }


    private parseSkimmers(
        html: string
    ): RbnSkimmer[] {

        const result:
            RbnSkimmer[] = [];


        const rowPattern =
            /<tr[^>]*>[\s\S]*?<a[^>]*\?f=0&c=([^"&]+)[^>]*>[\s\S]*?\s+([^<]+?)\s*<\/a>\s*<\/td>[\s\S]*?<td[^>]*>[\s\S]*?<\/td>\s*<td>\s*([A-R]{2}\d{2}[A-X]{2})\s*<\/td>/gi;


        let match:
            RegExpExecArray | null;


        while (
            (match =
                rowPattern.exec(html)) !== null
        ) {

            const callsign =
                match[1]!
                    .trim()
                    .toUpperCase();


            const grid =
                match[3]!
                    .trim()
                    .toUpperCase();


            if (
                callsign &&
                grid
            ) {

                result.push({

                    callsign,

                    grid

                });

            }

        }


        return result;

    }


    private normalizeSpotter(
        value: string
    ): string {

        return value
            .toUpperCase()
            .split("-")[0]
            ?.trim()
            ?? "";

    }

}
