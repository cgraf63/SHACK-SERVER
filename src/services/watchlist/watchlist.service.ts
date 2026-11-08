import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import fs from "node:fs";

const dataDirectory = path.resolve(process.cwd(), "data");
fs.mkdirSync(dataDirectory, { recursive: true });

const databasePath = path.join(dataDirectory, "shack-server.db");

export interface WatchlistEntry {
    id: number;
    callsign: string;
    created_at: string;
    /* 1 = push notification to the phone when spotted */
    push: number;
}

export class WatchlistService {
    private db: DatabaseSync;

    constructor() {
        this.db = new DatabaseSync(databasePath);
        this.initialize();
    }

    private initialize(): void {
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS watchlist (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                callsign TEXT NOT NULL UNIQUE,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
        `);

        const columns =
            this.db.prepare("PRAGMA table_info(watchlist)").all() as Array<{ name: string }>;

        if (!columns.some(column => column.name === "push")) {
            this.db.exec("ALTER TABLE watchlist ADD COLUMN push INTEGER NOT NULL DEFAULT 1");
        }
    }

    /* Callsigns as a set, for the spot check (cached, rebuilt on changes) */
    private cache: Map<string, WatchlistEntry> | null = null;

    lookup(callsign: string): WatchlistEntry | undefined {

        if (!this.cache) {
            this.cache = new Map(this.getAll().map(entry => [entry.callsign, entry]));
        }

        return this.cache.get(callsign.trim().toUpperCase());

    }

    setPush(callsign: string, push: boolean): WatchlistEntry | null {

        const normalized = callsign.trim().toUpperCase();

        this.db
            .prepare("UPDATE watchlist SET push = ? WHERE callsign = ?")
            .run(push ? 1 : 0, normalized);

        this.cache = null;

        return this.db
            .prepare("SELECT id, callsign, created_at, push FROM watchlist WHERE callsign = ?")
            .get(normalized) as unknown as WatchlistEntry | null;

    }

    getAll(): WatchlistEntry[] {
        return this.db
            .prepare(`
                SELECT id, callsign, created_at, push
                FROM watchlist
                ORDER BY id ASC
            `)
            .all() as unknown as WatchlistEntry[];
    }

    add(callsign: string, push = true): WatchlistEntry | null {
        const normalized = callsign.trim().toUpperCase();

        if (!/^[A-Z0-9]{1,10}(\/[A-Z0-9]{1,10}){0,2}$/.test(normalized)) {
            return null;
        }

        this.db
            .prepare(`
                INSERT OR IGNORE INTO watchlist (callsign, push)
                VALUES (?, ?)
            `)
            .run(normalized, push ? 1 : 0);

        this.cache = null;

        return this.db
            .prepare(`
                SELECT id, callsign, created_at, push
                FROM watchlist
                WHERE callsign = ?
            `)
            .get(normalized) as unknown as WatchlistEntry | null;
    }

    remove(callsign: string): boolean {
        const normalized = callsign.trim().toUpperCase();

        if (!normalized) {
            return false;
        }

        const result = this.db
            .prepare(`
                DELETE FROM watchlist
                WHERE callsign = ?
            `)
            .run(normalized);

        this.cache = null;

        return Number(result.changes) > 0;
    }
}

export const watchlistService = new WatchlistService();
