# User manual / Benutzerhandbuch

| | |
|---|---|
| `MANUAL_DE.md` | Benutzerhandbuch (Deutsch) |
| `MANUAL_EN.md` | User manual (English) |
| `images/` | screenshots of the manual (the README screenshots in `docs/images/screenshots` are used too) |
| `template.html`, `manual.css` | PDF layout (cover, contents with page numbers, chapter numbers) |
| `build.py` | builds PDF + Word: `python3 docs/manual/build.py` → `docs/manual/out/` |

Every change pushed to `main` builds both languages on GitHub (workflow *Manual*) and
replaces the files in the release **manual** – the download links stay the same:

- https://github.com/cgraf63/SHACK-SERVER/releases/download/manual/SHACK-SERVER_Handbuch_DE.pdf
- https://github.com/cgraf63/SHACK-SERVER/releases/download/manual/SHACK-SERVER_Manual_EN.pdf
- the same names with `.docx` for Word

Version: `version:` at the top of each file. The date on the cover is the date of the last change.
New features: update both languages together (the installation guides too).
