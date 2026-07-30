import {
    DatabaseSync
} from "node:sqlite";


import {
    DxLocation
} from "./geo.model.js";


export class GeoCacheService {


    private db =
        new DatabaseSync(
            "./data/geo-cache.db"
        );



    constructor() {


        this.db.exec(`

            CREATE TABLE IF NOT EXISTS geo_cache (

                call TEXT PRIMARY KEY,

                locator TEXT,

                latitude REAL,

                longitude REAL,

                updated INTEGER

            )

        `);

    }



    get(
        call: string
    ): DxLocation | undefined {


        const stmt =
            this.db.prepare(`

                SELECT *

                FROM geo_cache

                WHERE call = ?

            `);



        const row =
            stmt.get(
                call.toUpperCase()
            ) as any;



        if (!row) {

            return undefined;

        }



        return {

    call: row.call,

    locator: row.locator,

    latitude: row.latitude,

    longitude: row.longitude,

    updated: row.updated

};
    }




    set(
        location: DxLocation
    ): void {


        const stmt =
            this.db.prepare(`

                INSERT OR REPLACE INTO geo_cache

                (
                    call,
                    locator,
                    latitude,
                    longitude,
                    updated
                )

                VALUES (?, ?, ?, ?, ?)

            `);



        stmt.run(

            location.call.toUpperCase(),

            location.locator ?? null,

            location.latitude ?? null,

            location.longitude ?? null,

            Date.now()

        );

    }

}
