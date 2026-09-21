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

    club?: string;

    station_grid: string;

    started_at?: string | null;

    ended_at?: string | null;

    created_at?: string;

}

export interface ContestOperator {

    id?: number;

    callsign: string;

    name: string;

    club: string;

    email: string;

    notes: string;

    active: boolean;

    created_at?: string;

}


export interface ContestQso {

    id?: number;

    session_id: number;

    qso_date: string;

    time_on_utc: string;

    frequency: number;

    band: string;

    mode: string;

    call: string;

    rst_sent: string;

    rst_rcvd: string;

    exchange_sent: string;

    exchange_received: string;

    operator: string;

    station_callsign: string;

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

                club TEXT NOT NULL DEFAULT '',

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
            Database migration

            Older installations may already have
            contest_sessions without the club column.
        */

        const contestSessionColumns =
            this.db.prepare(`
                PRAGMA table_info(contest_sessions)
            `).all() as Array<{
                name: string;
            }>;

        const hasClubColumn =
            contestSessionColumns.some(
                column => column.name === "club"
            );

        if (!hasClubColumn) {

            this.db.exec(`
                ALTER TABLE contest_sessions
                ADD COLUMN club TEXT NOT NULL DEFAULT '';
            `);

        }


        /*
            Contest operators

            Operators are managed independently from
            contest sessions and can participate in
            multiple sessions.
        */

        this.db.exec(`
            CREATE TABLE IF NOT EXISTS contest_operators (

                id INTEGER PRIMARY KEY AUTOINCREMENT,

                callsign TEXT NOT NULL,

                name TEXT NOT NULL,

                club TEXT NOT NULL DEFAULT '',

                email TEXT NOT NULL DEFAULT '',

                notes TEXT NOT NULL DEFAULT '',

                active INTEGER NOT NULL DEFAULT 1,

                created_at TEXT NOT NULL

            );
        `);


        /*
            Contest session operators

            A contest session may have multiple
            operators.
        */

        this.db.exec(`
            CREATE TABLE IF NOT EXISTS contest_session_operators (

                session_id INTEGER NOT NULL,

                operator_id INTEGER NOT NULL,

                PRIMARY KEY (
                    session_id,
                    operator_id
                ),

                FOREIGN KEY (
                    session_id
                )
                REFERENCES contest_sessions(id)
                ON DELETE CASCADE,

                FOREIGN KEY (
                    operator_id
                )
                REFERENCES contest_operators(id)
                ON DELETE CASCADE

            );
        `);


        this.db.exec(`
            CREATE INDEX IF NOT EXISTS
            idx_contest_session_operators_session
            ON contest_session_operators(session_id);
        `);


        this.db.exec(`
            CREATE INDEX IF NOT EXISTS
            idx_contest_session_operators_operator
            ON contest_session_operators(operator_id);
        `);


        /*
            Contest QSOs

            Contest QSOs are stored separately
            from the normal QSO log.
        */

        this.db.exec(`
            CREATE TABLE IF NOT EXISTS contest_qsos (

                id INTEGER PRIMARY KEY AUTOINCREMENT,

                session_id INTEGER NOT NULL,

                qso_date TEXT NOT NULL,

                time_on_utc TEXT NOT NULL,

                frequency REAL NOT NULL,

                band TEXT NOT NULL,

                mode TEXT NOT NULL,

                call TEXT NOT NULL,

                rst_sent TEXT NOT NULL,

                rst_rcvd TEXT NOT NULL,

                exchange_sent TEXT NOT NULL,

                exchange_received TEXT NOT NULL,

                operator TEXT NOT NULL,

                station_callsign TEXT NOT NULL,

                created_at TEXT NOT NULL,

                FOREIGN KEY (
                    session_id
                )
                REFERENCES contest_sessions(id)
                ON DELETE CASCADE,

                UNIQUE (
                    session_id,
                    call,
                    band
                )

            );
        `);


        this.db.exec(`
            CREATE INDEX IF NOT EXISTS
            idx_contest_qsos_session
            ON contest_qsos(session_id);
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


    /*
        Contest operators
    */

    getOperators(
        includeInactive = true
    ): ContestOperator[] {

        const rows =
            this.db.prepare(`
                SELECT
                    id,
                    callsign,
                    name,
                    club,
                    email,
                    notes,
                    active,
                    created_at
                FROM contest_operators
                ${includeInactive ? "" : "WHERE active = 1"}
                ORDER BY callsign COLLATE NOCASE
            `).all() as Array<{
                id: number;
                callsign: string;
                name: string;
                club: string;
                email: string;
                notes: string;
                active: number;
                created_at: string;
            }>;


        return rows.map(
            row => ({

                id:
                    row.id,

                callsign:
                    row.callsign,

                name:
                    row.name,

                club:
                    row.club,

                email:
                    row.email,

                notes:
                    row.notes,

                active:
                    row.active === 1,

                created_at:
                    row.created_at

            })
        );

    }


    getOperatorById(
        id: number
    ): ContestOperator | null {

        const row =
            this.db.prepare(`
                SELECT
                    id,
                    callsign,
                    name,
                    club,
                    email,
                    notes,
                    active,
                    created_at
                FROM contest_operators
                WHERE id = ?
            `).get(
                id
            ) as {
                id: number;
                callsign: string;
                name: string;
                club: string;
                email: string;
                notes: string;
                active: number;
                created_at: string;
            } | undefined;


        if (!row) {

            return null;

        }


        return {

            id:
                row.id,

            callsign:
                row.callsign,

            name:
                row.name,

            club:
                row.club,

            email:
                row.email,

            notes:
                row.notes,

            active:
                row.active === 1,

            created_at:
                row.created_at

        };

    }


    createOperator(
        operator: ContestOperator
    ): ContestOperator {

        const callsign =
            operator.callsign
                .trim()
                .toUpperCase();

        const name =
            operator.name.trim();


        if (!callsign) {

            throw new Error(
                "Operator callsign is required"
            );

        }


        if (!name) {

            throw new Error(
                "Operator name is required"
            );

        }


        const existing =
            this.db.prepare(`
                SELECT id
                FROM contest_operators
                WHERE UPPER(callsign) = ?
            `).get(
                callsign
            ) as {
                id: number;
            } | undefined;


        if (existing) {

            throw new Error(
                "Operator callsign already exists"
            );

        }


        const now =
            new Date().toISOString();


        const result =
            this.db.prepare(`
                INSERT INTO contest_operators (
                    callsign,
                    name,
                    club,
                    email,
                    notes,
                    active,
                    created_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `).run(

                callsign,

                name,

                operator.club?.trim() || "",

                operator.email?.trim() || "",

                operator.notes?.trim() || "",

                operator.active === false
                    ? 0
                    : 1,

                now

            );


        return this.getOperatorById(
            Number(
                result.lastInsertRowid
            )
        )!;

    }


    updateOperator(
        id: number,
        operator: ContestOperator
    ): ContestOperator | null {

        const existing =
            this.getOperatorById(
                id
            );


        if (!existing) {

            return null;

        }


        const callsign =
            operator.callsign
                .trim()
                .toUpperCase();

        const name =
            operator.name.trim();


        if (!callsign) {

            throw new Error(
                "Operator callsign is required"
            );

        }


        if (!name) {

            throw new Error(
                "Operator name is required"
            );

        }


        const duplicate =
            this.db.prepare(`
                SELECT id
                FROM contest_operators
                WHERE UPPER(callsign) = ?
                  AND id <> ?
            `).get(
                callsign,
                id
            ) as {
                id: number;
            } | undefined;


        if (duplicate) {

            throw new Error(
                "Operator callsign already exists"
            );

        }


        this.db.prepare(`
            UPDATE contest_operators
            SET
                callsign = ?,
                name = ?,
                club = ?,
                email = ?,
                notes = ?,
                active = ?
            WHERE id = ?
        `).run(

            callsign,

            name,

            operator.club?.trim() || "",

            operator.email?.trim() || "",

            operator.notes?.trim() || "",

            operator.active === false
                ? 0
                : 1,

            id

        );


        return this.getOperatorById(
            id
        );

    }


    setOperatorActive(
        id: number,
        active: boolean
    ): ContestOperator | null {

        const existing =
            this.getOperatorById(
                id
            );


        if (!existing) {

            return null;

        }


        this.db.prepare(`
            UPDATE contest_operators
            SET active = ?
            WHERE id = ?
        `).run(

            active
                ? 1
                : 0,

            id

        );


        return this.getOperatorById(
            id
        );

    }


    getSessionOperators(
        sessionId: number
    ): ContestOperator[] {

        const rows =
            this.db.prepare(`
                SELECT
                    o.id,
                    o.callsign,
                    o.name,
                    o.club,
                    o.email,
                    o.notes,
                    o.active,
                    o.created_at
                FROM contest_session_operators so
                INNER JOIN contest_operators o
                    ON o.id = so.operator_id
                WHERE so.session_id = ?
                ORDER BY o.callsign COLLATE NOCASE
            `).all(
                sessionId
            ) as Array<{
                id: number;
                callsign: string;
                name: string;
                club: string;
                email: string;
                notes: string;
                active: number;
                created_at: string;
            }>;


        return rows.map(
            row => ({

                id:
                    row.id,

                callsign:
                    row.callsign,

                name:
                    row.name,

                club:
                    row.club,

                email:
                    row.email,

                notes:
                    row.notes,

                active:
                    row.active === 1,

                created_at:
                    row.created_at

            })
        );

    }


    addOperatorToSession(
        sessionId: number,
        operatorId: number
    ): ContestOperator[] {

        const session =
            this.getSessionById(
                sessionId
            );


        if (!session) {

            throw new Error(
                "Contest session not found"
            );

        }


        const operator =
            this.getOperatorById(
                operatorId
            );


        if (!operator) {

            throw new Error(
                "Contest operator not found"
            );

        }


        this.db.prepare(`
            INSERT OR IGNORE INTO contest_session_operators (
                session_id,
                operator_id
            )
            VALUES (?, ?)
        `).run(
            sessionId,
            operatorId
        );


        return this.getSessionOperators(
            sessionId
        );

    }


    removeOperatorFromSession(
        sessionId: number,
        operatorId: number
    ): ContestOperator[] {

        this.db.prepare(`
            DELETE FROM contest_session_operators
            WHERE session_id = ?
              AND operator_id = ?
        `).run(
            sessionId,
            operatorId
        );


        return this.getSessionOperators(
            sessionId
        );

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
                    club,
                    station_grid,

                    started_at,
                    ended_at,

                    created_at

                )

                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(

                session.contest_definition_id,

                session.name.trim(),

                session.status,

                session.operator_name.trim(),

                session.station_callsign
                    .trim()
                    .toUpperCase(),

                (session.club || "")
                    .trim(),

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


    getSessions(): ContestSession[] {

        const rows =
            this.db.prepare(`
                SELECT
                    id,
                    contest_definition_id,
                    name,
                    status,
                    operator_name,
                    station_callsign,
                    club,
                    station_grid,
                    started_at,
                    ended_at,
                    created_at

                FROM contest_sessions

                ORDER BY
                    created_at DESC,
                    id DESC
            `).all() as {

                id: number;

                contest_definition_id: number;

                name: string;

                status: ContestSessionStatus;

                operator_name: string;

                station_callsign: string;

                club: string;

                station_grid: string;

                started_at: string | null;

                ended_at: string | null;

                created_at: string;

            }[];

        return rows.map(row => ({
            id: row.id,
            contest_definition_id: row.contest_definition_id,
            name: row.name,
            status: row.status,
            operator_name: row.operator_name,
            station_callsign: row.station_callsign,
            club: row.club,
            station_grid: row.station_grid,
            started_at: row.started_at,
            ended_at: row.ended_at,
            created_at: row.created_at
        }));

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
                    club,
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

                club: string;

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

            club:
                row.club,

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
                    club,
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

                club: string;

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

            club:
                row.club,

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


    updateSession(
        id: number,
        operator_name: string,
        station_callsign: string,
        club: string,
        station_grid: string
    ): ContestSession | null {

        const existing =
            this.getSessionById(
                id
            );


        if (!existing) {

            return null;

        }


        if (existing.status !== "READY") {

            throw new Error(
                "Contest session can only be edited while READY"
            );

        }


        this.db.prepare(`
            UPDATE contest_sessions

            SET
                operator_name = ?,
                station_callsign = ?,
                club = ?,
                station_grid = ?

            WHERE
                id = ?
                AND status = 'READY'
        `).run(

            operator_name
                .trim(),

            station_callsign
                .trim()
                .toUpperCase(),

            club
                .trim(),

            station_grid
                .trim()
                .toUpperCase(),

            id

        );


        return this.getSessionById(
            id
        );

    }


    createContestQso(
        qso: ContestQso
    ): ContestQso {

        const session =
            this.getSessionById(
                qso.session_id
            );


        if (!session) {

            throw new Error(
                "Contest session not found"
            );

        }


        if (session.status !== "RUNNING") {

            throw new Error(
                "Contest session is not running"
            );

        }


        const existing =
            this.db.prepare(`
                SELECT *
                FROM contest_qsos
                WHERE
                    session_id = ?
                    AND call = ?
                    AND band = ?
                LIMIT 1
            `).get(

                qso.session_id,

                qso.call
                    .trim()
                    .toUpperCase(),

                qso.band
                    .trim()
                    .toUpperCase()

            ) as {
                id: number;
                session_id: number;
                qso_date: string;
                time_on_utc: string;
                frequency: number;
                band: string;
                mode: string;
                call: string;
                rst_sent: string;
                rst_rcvd: string;
                exchange_sent: string;
                exchange_received: string;
                operator: string;
                station_callsign: string;
                created_at: string;
            } | undefined;


        if (existing) {

            throw new Error(
                "Duplicate contest QSO"
            );

        }


        const createdAt =
            new Date().toISOString();


        const call =
            qso.call
                .trim()
                .toUpperCase();


        const band =
            qso.band
                .trim()
                .toUpperCase();


        const mode =
            qso.mode
                .trim()
                .toUpperCase();


        const operator =
            qso.operator
                .trim();


        const stationCallsign =
            qso.station_callsign
                .trim()
                .toUpperCase();


        const result =
            this.db.prepare(`
                INSERT INTO contest_qsos (

                    session_id,

                    qso_date,
                    time_on_utc,

                    frequency,

                    band,
                    mode,

                    call,

                    rst_sent,
                    rst_rcvd,

                    exchange_sent,
                    exchange_received,

                    operator,
                    station_callsign,

                    created_at

                )

                VALUES (
                    ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
                )
            `).run(

                qso.session_id,

                qso.qso_date,

                qso.time_on_utc,

                qso.frequency,

                band,

                mode,

                call,

                qso.rst_sent
                    .trim(),

                qso.rst_rcvd
                    .trim(),

                qso.exchange_sent
                    .trim(),

                qso.exchange_received
                    .trim(),

                operator,

                stationCallsign,

                createdAt

            );


        return this.getContestQsoById(
            Number(
                result.lastInsertRowid
            )
        )!;

    }


    getContestQsoById(
        id: number
    ): ContestQso | null {

        const row =
            this.db.prepare(`
                SELECT
                    id,
                    session_id,
                    qso_date,
                    time_on_utc,
                    frequency,
                    band,
                    mode,
                    call,
                    rst_sent,
                    rst_rcvd,
                    exchange_sent,
                    exchange_received,
                    operator,
                    station_callsign,
                    created_at

                FROM contest_qsos

                WHERE id = ?
            `).get(
                id
            ) as ContestQso | undefined;


        if (!row) {

            return null;

        }


        return row;

    }


    getContestQsos(
        sessionId: number
    ): ContestQso[] {

        const rows =
            this.db.prepare(`
                SELECT
                    id,
                    session_id,
                    qso_date,
                    time_on_utc,
                    frequency,
                    band,
                    mode,
                    call,
                    rst_sent,
                    rst_rcvd,
                    exchange_sent,
                    exchange_received,
                    operator,
                    station_callsign,
                    created_at

                FROM contest_qsos

                WHERE session_id = ?

                ORDER BY
                    id ASC
            `).all(
                sessionId
            ) as unknown as ContestQso[];


        return rows;

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


        if (existing.status !== "READY") {

            throw new Error(
                "Contest session can only be started while READY"
            );

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


        if (existing.status !== "RUNNING") {

            throw new Error(
                "Contest session can only be paused while RUNNING"
            );

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


    resumeSession(
        id: number
    ): ContestSession | null {

        const existing =
            this.getSessionById(
                id
            );


        if (!existing) {

            return null;

        }


        if (existing.status !== "PAUSED") {

            throw new Error(
                "Contest session can only be resumed while PAUSED"
            );

        }


        this.db.prepare(`
            UPDATE contest_sessions

            SET
                status = 'RUNNING'

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


        if (
            existing.status !== "RUNNING" &&
            existing.status !== "PAUSED"
        ) {

            throw new Error(
                "Contest session can only be finished while RUNNING or PAUSED"
            );

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
