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
