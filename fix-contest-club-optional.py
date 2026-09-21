from pathlib import Path

file = Path("src/services/contest/contest.service.ts")

text = file.read_text(encoding="utf-8")

old = """    club: string;
"""

new = """    club?: string;
"""

if text.count(old) != 1:
    raise SystemExit(
        f"Erwartet 1 'club: string;', gefunden {text.count(old)}"
    )

text = text.replace(old, new, 1)

old = """                session.club
                    .trim(),
"""

new = """                (session.club || "")
                    .trim(),
"""

if text.count(old) != 1:
    raise SystemExit(
        f"Erwarteter INSERT-Block nicht gefunden: {text.count(old)}"
    )

text = text.replace(old, new, 1)

file.write_text(text, encoding="utf-8")

print("Patch erfolgreich.")
