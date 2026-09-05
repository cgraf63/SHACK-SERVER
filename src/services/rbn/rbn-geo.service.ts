interface RbnApiSpot {

    spotter: string;

    spotter_grid:
        string | null;

}


interface RbnApiResponse {

    spots:
        RbnApiSpot[];

}


export class RbnGeoService {


    async getSpotterGrid(
        callsign: string,
        spotter: string
    ): Promise<string | null> {

        try {

            const response =
                await fetch(
                    `https://vailrerbn.com/api/v1/spots/${encodeURIComponent(callsign)}?hours=24&limit=100`
                );


            if (!response.ok) {

                console.error(
                    "RBN Geo API:",
                    response.status
                );

                return null;

            }


            const data =
                await response.json() as RbnApiResponse;


            const spot =
                data.spots?.find(
                    item =>
                        item.spotter.toUpperCase()
                            ===
                        spotter.toUpperCase()
                    &&
                        item.spotter_grid
                );


            return (
                spot?.spotter_grid
                ?? null
            );

        }
        catch (error) {

            console.error(
                "RBN Geo API failed:",
                error
            );

            return null;

        }

    }

}
