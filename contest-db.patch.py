from pathlib import Path
import shutil

FILE = Path("src/services/contest/contest.service.ts")
BACKUP = Path("src/services/contest/contest.service.ts.bak")

if not FILE.exists():
    raise SystemExit(f"ERROR: {FILE} nicht gefunden")

original = FILE.read_text(encoding="utf-8")
text = original


def require(condition, message):
    if not condition:
        raise SystemExit("ERROR: " + message)


def replace_once(old, new, description):
    global text

    count = text.count(old)

    require(
        count == 1,
        f"{description}: erwartet 1 Treffer, gefunden {count}"
    )

    text = text.replace(old, new, 1)
    print("OK:", description)


# ============================================================
# 1. ContestSession Interface
# ============================================================

replace_once(
    """    station_callsign: string;

    station_grid: string;
""",
    """    station_callsign: string;

    club: string;

    station_grid: string;
""",
    "ContestSession.club"
)


# ============================================================
# 2. Doppelte contest_definitions entfernen
# ============================================================

start_marker = """        this.db.exec(`
            CREATE TABLE IF NOT EXISTS contest_definitions ("""

start_positions = []
pos = 0

while True:
    pos = text.find(start_marker, pos)

    if pos == -1:
        break

    start_positions.append(pos)
    pos += len(start_marker)

require(
    len(start_positions) == 2,
    f"contest_definitions: erwartet 2 CREATE-Blöcke, gefunden {len(start_positions)}"
)

# Wir suchen das Ende des zweiten CREATE-Blocks.
second_start = start_positions[1]

end_marker = """        `);"""

second_end = text.find(
    end_marker,
    second_start
)

require(
    second_end != -1,
    "Ende des zweiten contest_definitions-Blocks nicht gefunden"
)

second_end += len(end_marker)

# Eventuelle Leerzeilen danach mitnehmen.
while second_end < len(text) and text[second_end] in "\r\n":
    second_end += 1

text = (
    text[:second_start]
    + text[second_end:]
)

print("OK: doppelten contest_definitions-Block entfernt")


# ============================================================
# 3. contest_sessions um club erweitern
# ============================================================

replace_once(
    """                operator_name TEXT NOT NULL,

                station_callsign TEXT NOT NULL,

                station_grid TEXT NOT NULL,
""",
    """                operator_name TEXT NOT NULL,

                station_callsign TEXT NOT NULL,

                club TEXT NOT NULL DEFAULT '',

                station_grid TEXT NOT NULL,
""",
    "contest_sessions.club"
)


# ============================================================
# 4. Migration + contest_qsos direkt vor Index-Bereich
# ============================================================

index_marker = """        /*
            Indexes
        */
"""

require(
    text.count(index_marker) >= 1,
    "Index-Bereich nicht gefunden"
)

database_block = """        /*
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


"""

# Erstes "Indexes"-Vorkommen ersetzen.
text = text.replace(
    index_marker,
    database_block + index_marker,
    1
)

print("OK: contest_qsos + Migration eingefügt")


# ============================================================
# 5. Doppelte Index-Definition entfernen
# ============================================================

index_block = """        /*
            Indexes
        */

        this.db.exec(`
            CREATE INDEX IF NOT EXISTS
            idx_contest_definitions_enabled
            ON contest_definitions(enabled);
        `);
"""

require(
    text.count(index_block) == 2,
    "Die zwei erwarteten Index-Blöcke wurden nicht gefunden"
)

# Zweiten entfernen.
second = text.find(
    index_block,
    text.find(index_block) + len(index_block)
)

text = (
    text[:second]
    + text[second + len(index_block):]
)

print("OK: doppelten Index entfernt")


# ============================================================
# 6. INSERT contest_sessions
# ============================================================

replace_once(
    """                    operator_name,
                    station_callsign,
                    station_grid,

                    started_at,
""",
    """                    operator_name,
                    station_callsign,
                    club,
                    station_grid,

                    started_at,
""",
    "Session INSERT Feld club"
)

replace_once(
    """                session.operator_name.trim(),

                session.station_callsign
                    .trim()
                    .toUpperCase(),

                session.station_grid
""",
    """                session.operator_name.trim(),

                session.station_callsign
                    .trim()
                    .toUpperCase(),

                session.club
                    .trim(),

                session.station_grid
""",
    "Session INSERT Wert club"
)

replace_once(
    """                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
""",
    """                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
""",
    "Session INSERT VALUES"
)


# ============================================================
# 7. Session SELECTs
# ============================================================

old = """                    operator_name,
                    station_callsign,
                    station_grid,
                    started_at,
"""

new = """                    operator_name,
                    station_callsign,
                    club,
                    station_grid,
                    started_at,
"""

count = text.count(old)

require(
    count == 2,
    f"Session SELECTs: erwartet 2 Treffer, gefunden {count}"
)

text = text.replace(old, new)

print("OK: Session SELECTs")


# ============================================================
# 8. Row-Typen
# ============================================================

old = """                station_callsign: string;

                station_grid: string;

                started_at: string | null;
"""

new = """                station_callsign: string;

                club: string;

                station_grid: string;

                started_at: string | null;
"""

count = text.count(old)

require(
    count == 2,
    f"Row-Typen: erwartet 2 Treffer, gefunden {count}"
)

text = text.replace(old, new)

print("OK: Row-Typen")


# ============================================================
# 9. Return-Objekte
# ============================================================

old = """            station_callsign:
                row.station_callsign,

            station_grid:
                row.station_grid,
"""

new = """            station_callsign:
                row.station_callsign,

            club:
                row.club,

            station_grid:
                row.station_grid,
"""

count = text.count(old)

require(
    count == 2,
    f"Return-Objekte: erwartet 2 Treffer, gefunden {count}"
)

text = text.replace(old, new)

print("OK: Return-Objekte")


# ============================================================
# 10. Erst jetzt Backup + Schreiben
# ============================================================

shutil.copy2(FILE, BACKUP)

FILE.write_text(
    text,
    encoding="utf-8"
)

print()
print("========================================")
print("PATCH ERFOLGREICH ANGEWENDET")
print("========================================")
print("Datei :", FILE)
print("Backup:", BACKUP)
