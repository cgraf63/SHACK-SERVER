import { DatabaseSync } from "node:sqlite";
import { existsSync } from "node:fs";

const APPLY = process.argv.includes("--apply");
const explicitFiles = process.argv.slice(2).filter(a => !a.startsWith("--"));
const files = explicitFiles.length ? explicitFiles : [
    "data/shack.db",
    "data/shack-server.db",
    "backend/data/shack_server.db",
    "backend/data/shack.db"
];

const UNIQUE_CLAUSE = /,\s*(?:CONSTRAINT\s+\S+\s+)?UNIQUE\s*\(\s*["`]?session_id["`]?\s*,\s*["`]?call["`]?\s*,\s*["`]?band["`]?\s*\)/i;
const TABLE_NAME = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?["`]?contest_qsos["`]?/i;
const UNIQUE_INDEX_SQL = /CREATE\s+UNIQUE\s+INDEX/i;

let found = 0;

for (const file of files) {
    console.log(`\n=== ${file}`);
    if (!existsSync(file)) { console.log("    not found, skipped"); continue; }

    const db = new DatabaseSync(file);
    try {
        db.exec("PRAGMA busy_timeout = 5000");
        const table = db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'contest_qsos'").get();
        if (!table) { console.log("    no table contest_qsos, skipped"); continue; }

        const rows = db.prepare("SELECT COUNT(*) AS n FROM contest_qsos").get().n;
        console.log(`    contest_qsos found, ${rows} QSOs`);

        const others = db.prepare(`SELECT type, name, sql FROM sqlite_master
            WHERE tbl_name = 'contest_qsos' AND type IN ('index','trigger') AND sql IS NOT NULL`).all();
        const uniqueIndexes = others.filter(o => o.type === "index" && UNIQUE_INDEX_SQL.test(o.sql));
        const hasClause = UNIQUE_CLAUSE.test(table.sql);

        if (!hasClause && !uniqueIndexes.length) { console.log("    no UNIQUE (session_id, call, band) - nothing to do"); continue; }
        found++;
        if (hasClause) console.log("    UNIQUE (session_id, call, band) in CREATE TABLE -> table rebuild needed");
        for (const idx of uniqueIndexes) console.log(`    UNIQUE INDEX ${idx.name} -> will be replaced by a normal index`);
        if (!APPLY) { console.log("    (check only - run again with --apply to change it)"); continue; }

        const stamp = new Date().toISOString().replace(/[:.]/g, "-");
        const backup = file.replace(/\.db$/, "") + `.backup-${stamp}.db`;
        db.exec(`VACUUM INTO '${backup.replace(/'/g, "''")}'`);
        console.log(`    backup written: ${backup}`);

        const newTableSql = table.sql.replace(TABLE_NAME, "CREATE TABLE contest_qsos_new").replace(UNIQUE_CLAUSE, "");
        const recreate = others.map(o => o.type === "index" ? o.sql.replace(UNIQUE_INDEX_SQL, "CREATE INDEX") : o.sql);

        db.exec("PRAGMA foreign_keys = OFF");
        db.exec("BEGIN IMMEDIATE");
        try {
            db.exec(newTableSql);
            db.exec("INSERT INTO contest_qsos_new SELECT * FROM contest_qsos");
            db.exec("DROP TABLE contest_qsos");
            db.exec("ALTER TABLE contest_qsos_new RENAME TO contest_qsos");
            for (const sql of recreate) db.exec(sql);
            db.exec("CREATE INDEX IF NOT EXISTS idx_contest_qsos_session_call_band ON contest_qsos (session_id, call, band)");

            const after = db.prepare("SELECT COUNT(*) AS n FROM contest_qsos").get().n;
            if (after !== rows) throw new Error(`row count mismatch: ${rows} before, ${after} after`);
            const fk = db.prepare("PRAGMA foreign_key_check").all();
            if (fk.length) throw new Error(`foreign key check failed: ${JSON.stringify(fk)}`);

            db.exec("COMMIT");
            console.log(`    DONE - constraint removed, ${after} QSOs kept`);
        } catch (error) {
            db.exec("ROLLBACK");
            console.error(`    FAILED, nothing changed: ${error.message}`);
            process.exitCode = 1;
        } finally {
            db.exec("PRAGMA foreign_keys = ON");
        }
    } finally {
        db.close();
    }
}

console.log(found ? `\n${found} database(s) with the dupe constraint.` : "\nNo database with the dupe constraint found.");
