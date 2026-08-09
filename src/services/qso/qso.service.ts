import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import fs from "node:fs";

export interface QsoRecord {
    id?: number;

    qso_date: string;
    time_on_utc: string;
    time_off_utc?: string | null;

    call: string;

    frequency: number;
    band: string;
    mode: string;

    rst_sent: string;
    rst_rcvd: string;

    my_callsign: string;
    my_grid: string;
    operator_name: string;

    name?: string | null;
    qth?: string | null;
    dx_grid?: string | null;

    notes?: string | null;

    spot_source?: string | null;
    spot_id?: string | null;

    created_at?: string;
}


const dataDirectory =
    path.resolve(
        process.cwd(),
        "data"
    );


fs.mkdirSync(
    dataDirectory,
    {
        recursive: true
    }
);


const databasePath =
    path.join(
        dataDirectory,
        "shack-server.db"
    );


export class QsoService {

    private db: DatabaseSync;


    constructor() {

        this.db =
            new DatabaseSync(
                databasePath
            );

        this.initialize();

    }


    private initialize(): void {

        this.db.exec(`
            CREATE TABLE IF NOT EXISTS qso (
                id INTEGER PRIMARY KEY AUTOINCREMENT,

                qso_date TEXT NOT NULL,
                time_on_utc TEXT NOT NULL,
                time_off_utc TEXT,

                call TEXT NOT NULL,

                frequency REAL NOT NULL,
                band TEXT NOT NULL,
                mode TEXT NOT NULL,

                rst_sent TEXT NOT NULL DEFAULT '59',
                rst_rcvd TEXT NOT NULL DEFAULT '59',

                my_callsign TEXT NOT NULL,
                my_grid TEXT NOT NULL,
                operator_name TEXT NOT NULL,

                name TEXT,
                qth TEXT,
                dx_grid TEXT,

                notes TEXT,

                spot_source TEXT,
                spot_id TEXT,

                created_at TEXT NOT NULL
            );
        `);


        this.db.exec(`
            CREATE INDEX IF NOT EXISTS
            idx_qso_call
            ON qso(call);
        `);


        this.db.exec(`
            CREATE INDEX IF NOT EXISTS
            idx_qso_date
            ON qso(qso_date);
        `);

    }


    createQso(
        qso: QsoRecord
    ): QsoRecord {

        const createdAt =
            new Date().toISOString();


        const statement =
            this.db.prepare(`
                INSERT INTO qso (
                    qso_date,
                    time_on_utc,
                    time_off_utc,
                    call,
                    frequency,
                    band,
                    mode,
                    rst_sent,
                    rst_rcvd,
                    my_callsign,
                    my_grid,
                    operator_name,
                    name,
                    qth,
                    dx_grid,
                    notes,
                    spot_source,
                    spot_id,
                    created_at
                )

                VALUES (
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    ?
                )
            `);


        const result =
            statement.run(

                qso.qso_date,

                qso.time_on_utc,

                qso.time_off_utc ?? null,

                qso.call,

                qso.frequency,

                qso.band,

                qso.mode,

                qso.rst_sent || "59",

                qso.rst_rcvd || "59",

                qso.my_callsign,

                qso.my_grid,

                qso.operator_name,

                qso.name ?? null,

                qso.qth ?? null,

                qso.dx_grid ?? null,

                qso.notes ?? null,

                qso.spot_source ?? null,

                qso.spot_id ?? null,

                createdAt

            );


        return {

            ...qso,

            id:
                Number(
                    result.lastInsertRowid
                ),

            created_at:
                createdAt

        };

    }


    getQso(
        id: number
    ): QsoRecord | null {

        const statement =
            this.db.prepare(`
                SELECT *
                FROM qso
                WHERE id = ?
            `);


        const row =
            statement.get(id);


        if (!row) {

            return null;

        }


        return row as unknown as QsoRecord;

    }


    getAllQso(): QsoRecord[] {

        const statement =
            this.db.prepare(`
                SELECT *
                FROM qso
                ORDER BY
                    qso_date DESC,
                    time_on_utc DESC
            `);


        return statement.all() as unknown as QsoRecord[];

    }


    deleteQso(
        id: number
    ): boolean {

        const statement =
            this.db.prepare(`
                DELETE FROM qso
                WHERE id = ?
            `);


        const result =
            statement.run(id);


        return result.changes > 0;

    }

}
