import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";


export interface ContestDefinition {

    id?: number;

    name: string;

    short_name: string;

    version: string;

    description?: string | null;

    rules_json: string;

    enabled: boolean;

    created_at?: string;

    updated_at?: string;

}


export type ContestSessionStatus =
    | "READY"
    | "RUNNING"
    | "PAUSED"
    | "FINISHED";


export interface ContestSession {

    id?: number;

    contest_definition_id: number;

    name: string;

    status: ContestSessionStatus;

    operator_name: string;

    station_callsign: string;

    station_grid: string;

    started_at?: string | null;

    ended_at?: string | null;

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


export class ContestService {

    private db: DatabaseSync;


    constructor() {

        this.db =
            new DatabaseSync(
                databasePath
            );

        this.initialize();

    }


    private initialize(): void {

        /*
            Contest definitions

            This table is completely independent
            from the existing QSO table.

            The existing QSO database remains
            untouched.
        */

        this.db.exec(`
            CREATE TABLE IF NOT EXISTS contest_definitions (

                id INTEGER PRIMARY KEY AUTOINCREMENT,

                name TEXT NOT NULL,

                short_name TEXT NOT NULL,

                version TEXT NOT NULL DEFAULT '1',

                description TEXT,

                rules_json TEXT NOT NULL DEFAULT '{}',

                enabled INTEGER NOT NULL DEFAULT 1,

                created_at TEXT NOT NULL,

                updated_at TEXT NOT NULL

            );
        `)
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS contest_definitions (

                id INTEGER PRIMARY KEY AUTOINCREMENT,

                name TEXT NOT NULL,

                short_name TEXT NOT NULL,

                version TEXT NOT NULL DEFAULT '1',

                description TEXT,

                rules_json TEXT NOT NULL DEFAULT '{}',

                enabled INTEGER NOT NULL DEFAULT 1,

                created_at TEXT NOT NULL,

                updated_at TEXT NOT NULL

            );
        `);


        /*
            Contest sessions

            A session represents one actual
            instance of a contest.
        */

        this.db.exec(`
            CREATE TABLE IF NOT EXISTS contest_sessions (

                id INTEGER PRIMARY KEY AUTOINCREMENT,

                contest_definition_id INTEGER NOT NULL,

                name TEXT NOT NULL,

                status TEXT NOT NULL DEFAULT 'READY',

                operator_name TEXT NOT NULL,

                station_callsign TEXT NOT NULL,

                station_grid TEXT NOT NULL,

                started_at TEXT,

                ended_at TEXT,

                created_at TEXT NOT NULL,

                FOREIGN KEY (
                    contest_definition_id
                )
                REFERENCES contest_definitions(id)

            );
        `);


        /*
            Indexes
        */

        this.db.exec(`
            CREATE INDEX IF NOT EXISTS
            idx_contest_definitions_enabled
            ON contest_definitions(enabled);
        `);

        /*
            Indexes
        */

        this.db.exec(`
            CREATE INDEX IF NOT EXISTS
            idx_contest_definitions_enabled
            ON contest_definitions(enabled);
        `);

    }


    getAll(): ContestDefinition[] {

        const rows =
            this.db.prepare(`
                SELECT
                    id,
                    name,
                    short_name,
                    version,
                    description,
                    rules_json,
                    enabled,
                    created_at,
                    updated_at
                FROM contest_definitions
                ORDER BY name COLLATE NOCASE
            `).all() as Array<{
                id: number;
                name: string;
                short_name: string;
                version: string;
                description: string | null;
                rules_json: string;
                enabled: number;
                created_at: string;
                updated_at: string;
            }>;


        return rows.map(
            row => ({

                id:
                    row.id,

                name:
                    row.name,

                short_name:
                    row.short_name,

                version:
                    row.version,

                description:
                    row.description,

                rules_json:
                    row.rules_json,

                enabled:
                    row.enabled === 1,

                created_at:
                    row.created_at,

                updated_at:
                    row.updated_at

            })
        );

    }


    getById(
        id: number
    ): ContestDefinition | null {

        const row =
            this.db.prepare(`
                SELECT
                    id,
                    name,
                    short_name,
                    version,
                    description,
                    rules_json,
                    enabled,
                    created_at,
                    updated_at
                FROM contest_definitions
                WHERE id = ?
            `).get(
                id
            ) as {
                id: number;
                name: string;
                short_name: string;
                version: string;
                description: string | null;
                rules_json: string;
                enabled: number;
                created_at: string;
                updated_at: string;
            } | undefined;


        if (!row) {

            return null;

        }


        return {

            id:
                row.id,

            name:
                row.name,

            short_name:
                row.short_name,

            version:
                row.version,

            description:
                row.description,

            rules_json:
                row.rules_json,

            enabled:
                row.enabled === 1,

            created_at:
                row.created_at,

            updated_at:
                row.updated_at

        };

    }


    create(
        definition: ContestDefinition
    ): ContestDefinition {

        const now =
            new Date().toISOString();


        const result =
            this.db.prepare(`
                INSERT INTO contest_definitions (
                    name,
                    short_name,
                    version,
                    description,
                    rules_json,
                    enabled,
                    created_at,
                    updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `).run(

                definition.name.trim(),

                definition.short_name.trim(),

                definition.version.trim(),

                definition.description?.trim() || null,

                definition.rules_json || "{}",

                definition.enabled
                    ? 1
                    : 0,

                now,

                now

            );


        return this.getById(
            Number(
                result.lastInsertRowid
            )
        )!;

    }


    update(
        id: number,
        definition: ContestDefinition
    ): ContestDefinition | null {

        const existing =
            this.getById(
                id
            );


        if (!existing) {

            return null;

        }


        const now =
            new Date().toISOString();


        this.db.prepare(`
            UPDATE contest_definitions
            SET
                name = ?,
                short_name = ?,
                version = ?,
                description = ?,
                rules_json = ?,
                enabled = ?,
                updated_at = ?
            WHERE id = ?
        `).run(

            definition.name.trim(),

            definition.short_name.trim(),

            definition.version.trim(),

            definition.description?.trim() || null,

            definition.rules_json || "{}",

            definition.enabled
                ? 1
                : 0,

            now,

            id

        );


        return this.getById(
            id
        );

    }

    createSession(
        session: ContestSession
    ): ContestSession {

        const definition =
            this.getById(
                session.contest_definition_id
            );


        if (!definition) {

            throw new Error(
                "Contest definition not found"
            );

        }


        const now =
            new Date().toISOString();


        const result =
            this.db.prepare(`
                INSERT INTO contest_sessions (

                    contest_definition_id,
                    name,
                    status,

                    operator_name,
                    station_callsign,
                    station_grid,

                    started_at,
                    ended_at,

                    created_at

                )

                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(

                session.contest_definition_id,

                session.name.trim(),

                session.status,

                session.operator_name.trim(),

                session.station_callsign
                    .trim()
                    .toUpperCase(),

                session.station_grid
                    .trim()
                    .toUpperCase(),

                session.started_at || null,

                session.ended_at || null,

                now

            );


        return this.getSessionById(
            Number(
                result.lastInsertRowid
            )
        )!;

    }


    getSessionById(
        id: number
    ): ContestSession | null {

        const row =
            this.db.prepare(`
                SELECT
                    id,
                    contest_definition_id,
                    name,
                    status,
                    operator_name,
                    station_callsign,
                    station_grid,
                    started_at,
                    ended_at,
                    created_at

                FROM contest_sessions

                WHERE id = ?
            `).get(
                id
            ) as {

                id: number;

                contest_definition_id: number;

                name: string;

                status: ContestSessionStatus;

                operator_name: string;

                station_callsign: string;

                station_grid: string;

                started_at: string | null;

                ended_at: string | null;

                created_at: string;

            } | undefined;


        if (!row) {

            return null;

        }


        return {

            id:
                row.id,

            contest_definition_id:
                row.contest_definition_id,

            name:
                row.name,

            status:
                row.status,

            operator_name:
                row.operator_name,

            station_callsign:
                row.station_callsign,

            station_grid:
                row.station_grid,

            started_at:
                row.started_at,

            ended_at:
                row.ended_at,

            created_at:
                row.created_at

        };

    }


    getActiveSession():
        ContestSession | null {

        const row =
            this.db.prepare(`
                SELECT
                    id,
                    contest_definition_id,
                    name,
                    status,
                    operator_name,
                    station_callsign,
                    station_grid,
                    started_at,
                    ended_at,
                    created_at

                FROM contest_sessions

                WHERE status IN (
                    'READY',
                    'RUNNING',
                    'PAUSED'
                )

                ORDER BY id DESC

                LIMIT 1
            `).get() as {

                id: number;

                contest_definition_id: number;

                name: string;

                status: ContestSessionStatus;

                operator_name: string;

                station_callsign: string;

                station_grid: string;

                started_at: string | null;

                ended_at: string | null;

                created_at: string;

            } | undefined;


        if (!row) {

            return null;

        }


        return {

            id:
                row.id,

            contest_definition_id:
                row.contest_definition_id,

            name:
                row.name,

            status:
                row.status,

            operator_name:
                row.operator_name,

            station_callsign:
                row.station_callsign,

            station_grid:
                row.station_grid,

            started_at:
                row.started_at,

            ended_at:
                row.ended_at,

            created_at:
                row.created_at

        };

    }


    startSession(
        id: number
    ): ContestSession | null {

        const existing =
            this.getSessionById(
                id
            );


        if (!existing) {

            return null;

        }


        const startedAt =
            new Date().toISOString();


        this.db.prepare(`
            UPDATE contest_sessions

            SET
                status = 'RUNNING',
                started_at = ?,
                ended_at = NULL

            WHERE id = ?
        `).run(

            startedAt,

            id

        );


        return this.getSessionById(
            id
        );

    }


    pauseSession(
        id: number
    ): ContestSession | null {

        const existing =
            this.getSessionById(
                id
            );


        if (!existing) {

            return null;

        }


        this.db.prepare(`
            UPDATE contest_sessions

            SET
                status = 'PAUSED'

            WHERE id = ?
        `).run(
            id
        );


        return this.getSessionById(
            id
        );

    }


    finishSession(
        id: number
    ): ContestSession | null {

        const existing =
            this.getSessionById(
                id
            );


        if (!existing) {

            return null;

        }


        const endedAt =
            new Date().toISOString();


        this.db.prepare(`
            UPDATE contest_sessions

            SET
                status = 'FINISHED',
                ended_at = ?

            WHERE id = ?
        `).run(

            endedAt,

            id

        );


        return this.getSessionById(
            id
        );

    }



    delete(
        id: number
    ): boolean {

        const result =
            this.db.prepare(`
                DELETE FROM contest_definitions
                WHERE id = ?
            `).run(
                id
            );


        return (
            Number(
                result.changes
            ) > 0
        );

    }


    setEnabled(
        id: number,
        enabled: boolean
    ): ContestDefinition | null {

        const existing =
            this.getById(
                id
            );


        if (!existing) {

            return null;

        }


        const now =
            new Date().toISOString();


        this.db.prepare(`
            UPDATE contest_definitions
            SET
                enabled = ?,
                updated_at = ?
            WHERE id = ?
        `).run(

            enabled
                ? 1
                : 0,

            now,

            id

        );


        return this.getById(
            id
        );

    }

}


export const contestService =
    new ContestService();
