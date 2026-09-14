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
    }

    getAll(): WatchlistEntry[] {
        return this.db
            .prepare(`
                SELECT id, callsign, created_at
                FROM watchlist
                ORDER BY id ASC
            `)
            .all() as unknown as WatchlistEntry[];
    }

    add(callsign: string): WatchlistEntry | null {
        const normalized = callsign.trim().toUpperCase();

        if (!normalized) {
            return null;
        }

        this.db
            .prepare(`
                INSERT OR IGNORE INTO watchlist (callsign)
                VALUES (?)
            `)
            .run(normalized);

        return this.db
            .prepare(`
                SELECT id, callsign, created_at
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

        return Number(result.changes) > 0;
    }
}

export const watchlistService = new WatchlistService();
