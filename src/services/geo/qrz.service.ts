import {
    DxLocation
} from "./geo.model.js";


export class QRZService {


    async lookup(
        call: string
    ): Promise<DxLocation | null> {


        const database: Record<string, DxLocation> = {


            "N4LR": {

                call: "N4LR",
                locator: "EM63",
                latitude: 33.0,
                longitude: -86.0,
                updated: Date.now()

            },


            "K1JT": {

                call: "K1JT",
                locator: "FN42",
                latitude: 42.3,
                longitude: -71.8,
                updated: Date.now()

            },


            "HB9ON": {

                call: "HB9ON",
                locator: "JN47",
                latitude: 47.0,
                longitude: 8.5,
                updated: Date.now()

            }

        };



        return (
            database[
                call.toUpperCase()
            ]
            ?? null
        );

    }

}
