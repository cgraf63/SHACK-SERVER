#!/usr/bin/env python3
"""
Builds the SHACK-SERVER manual as PDF (and Word) from the Markdown files.

    python3 docs/manual/build.py            -> docs/manual/out/*.pdf, *.docx
    python3 docs/manual/build.py --lang de  -> only German

Needs: pandoc, Python packages playwright + pypdf, Chromium for
playwright (python -m playwright install chromium), font "Inter".

How it works:
  1. pandoc: Markdown -> HTML (template.html + manual.css)
  2. Chromium prints the cover and the body separately (the body with
     page numbers in the footer and PDF bookmarks)
  3. the bookmarks give the page of every chapter -> the page numbers
     go into the table of contents, the body is printed again
  4. cover + body are joined
"""

import argparse
import datetime
import html
import json
import re
import subprocess
import sys
import unicodedata
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO = HERE.parent.parent
OUT = HERE / "out"

LANGS = {
    "de": {
        "source": "MANUAL_DE.md",
        "pdf": "SHACK-SERVER_Handbuch_DE.pdf",
        "docx": "SHACK-SERVER_Handbuch_DE.docx",
        "toc": "Inhalt",
        "version": "Version",
        "page": "Seite",
        "months": ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli",
                   "August", "September", "Oktober", "November", "Dezember"],
    },
    "en": {
        "source": "MANUAL_EN.md",
        "pdf": "SHACK-SERVER_Manual_EN.pdf",
        "docx": "SHACK-SERVER_Manual_EN.docx",
        "toc": "Contents",
        "version": "Version",
        "page": "Page",
        "months": ["January", "February", "March", "April", "May", "June", "July",
                   "August", "September", "October", "November", "December"],
    },
}


def run(args, **kwargs):
    return subprocess.run(args, check=True, text=True, capture_output=True, **kwargs).stdout


def front_matter(markdown):
    match = re.match(r"^---\n(.*?)\n---\n", markdown, re.S)
    meta = {}
    if match:
        for line in match.group(1).splitlines():
            if ":" in line:
                key, value = line.split(":", 1)
                meta[key.strip()] = value.strip().strip('"')
    return meta


def doc_date(source, lang):
    """Date of the last commit of the manual (today when not committed)."""
    try:
        stamp = run(["git", "-C", str(REPO), "log", "-1", "--format=%cs", "--", str(source)]).strip()
        day = datetime.date.fromisoformat(stamp) if stamp else datetime.date.today()
    except (subprocess.CalledProcessError, ValueError, FileNotFoundError):
        day = datetime.date.today()
    if lang == "de":
        return f"{day.day}. {LANGS[lang]['months'][day.month - 1]} {day.year}"
    return f"{day.day} {LANGS[lang]['months'][day.month - 1]} {day.year}"


def to_html(lang, meta, date):
    source = HERE / LANGS[lang]["source"]
    body = run([
        "pandoc", str(source), "--from", "markdown", "--to", "html5",
        "--toc", "--toc-depth=2", "--section-divs", "--wrap=none",
        "--template", str(HERE / "template.html"),
        "--metadata", f"toc-title={LANGS[lang]['toc']}",
        "--metadata", f"date={date}",
        "--metadata", f"pagetitle={meta.get('title', 'SHACK-SERVER')} {meta.get('subtitle', '')}",
    ], cwd=HERE)
    return body


def footer(lang, meta):
    text = html.escape(f"{meta.get('title', 'SHACK-SERVER')} · {meta.get('subtitle', '')} · "
                       f"{LANGS[lang]['version']} {meta.get('version', '')}")
    return (
        "<div style=\"width:100%;font-family:Inter,'Helvetica Neue',Arial,sans-serif;font-size:7.5pt;"
        "color:#7b8794;padding:0 16mm;display:flex;justify-content:space-between\">"
        f"<span>{text}</span><span class=\"pageNumber\"></span></div>"
    )


def outline_pages(pdf_path):
    """(title, page) of all bookmarks in document order, page 1-based."""
    from pypdf import PdfReader
    reader = PdfReader(str(pdf_path))
    result = []

    def walk(items):
        for item in items:
            if isinstance(item, list):
                walk(item)
            else:
                result.append((item.title.strip(), reader.get_destination_page_number(item) + 1))

    walk(reader.outline)
    return result, len(reader.pages)


def normalize(text):
    # NFC: Chromium may write "Ü" decomposed into the bookmarks
    text = unicodedata.normalize("NFC", text)
    return re.sub(r"\s+", " ", re.sub(r"^[\d.]+\s+", "", text)).strip().casefold()


def build_pdf(lang, browser):
    meta = front_matter((HERE / LANGS[lang]["source"]).read_text(encoding="utf-8"))
    date = doc_date(HERE / LANGS[lang]["source"], lang)
    page_html = to_html(lang, meta, date)

    work = OUT / f"_{lang}"
    work.mkdir(parents=True, exist_ok=True)
    html_file = HERE / f"_{lang}.html"   # next to the images (relative paths)
    html_file.write_text(page_html, encoding="utf-8")

    page = browser.new_page()
    try:
        page.goto(html_file.as_uri(), wait_until="networkidle")
        page.evaluate("document.fonts.ready")

        # cover alone, no footer
        page.emulate_media(media="print")
        page.evaluate("document.body.classList.add('only-cover')")
        page.pdf(path=str(work / "cover.pdf"), format="A4", print_background=True,
                 margin={"top": "0", "bottom": "0", "left": "0", "right": "0"})
        page.evaluate("document.body.classList.remove('only-cover'); document.body.classList.add('no-cover')")

        pdf_options = dict(
            format="A4", print_background=True, display_header_footer=True,
            header_template="<span></span>", footer_template=footer(lang, meta),
            margin={"top": "18mm", "bottom": "20mm", "left": "16mm", "right": "16mm"},
            outline=True, tagged=True,
        )

        # pass 1: where does every chapter start?
        page.pdf(path=str(work / "body1.pdf"), **pdf_options)
        bookmarks, _ = outline_pages(work / "body1.pdf")

        # TOC entries in document order -> page numbers (titles may repeat:
        # walk the bookmarks in order)
        entries = page.evaluate("""() => [...document.querySelectorAll('#TOC a')].map(a => a.textContent)""")
        numbers = []
        position = 0
        for entry in entries:
            wanted = normalize(entry)
            found = ""
            for index in range(position, len(bookmarks)):
                if normalize(bookmarks[index][0]) == wanted:
                    found = str(bookmarks[index][1])
                    position = index + 1
                    break
            numbers.append(found)

        missing = [e for e, n in zip(entries, numbers) if not n]
        if missing:
            print(f"  warning: no page for {missing}", file=sys.stderr)

        page.evaluate("""numbers => {
            document.querySelectorAll('#TOC a').forEach((a, i) => {
                const span = document.createElement('span');
                span.className = 'toc-page';
                span.textContent = numbers[i] || '';
                a.appendChild(span);
            });
        }""", numbers)

        # pass 2 with page numbers in the TOC
        page.pdf(path=str(work / "body.pdf"), **pdf_options)
        _, body_pages = outline_pages(work / "body.pdf")
    finally:
        page.close()
        html_file.unlink(missing_ok=True)

    from pypdf import PdfWriter, PdfReader
    writer = PdfWriter()
    writer.append(PdfReader(str(work / "cover.pdf")), import_outline=False)
    writer.append(PdfReader(str(work / "body.pdf")))
    writer.add_metadata({
        "/Title": f"{meta.get('title', '')} – {meta.get('subtitle', '')}",
        "/Author": meta.get("author", ""),
        "/Subject": f"{LANGS[lang]['version']} {meta.get('version', '')}, {date}",
    })
    writer.page_mode = "/UseOutlines"
    target = OUT / LANGS[lang]["pdf"]
    with open(target, "wb") as handle:
        writer.write(handle)

    for name in ("cover.pdf", "body1.pdf", "body.pdf"):
        (work / name).unlink(missing_ok=True)
    work.rmdir()

    print(f"  {target.relative_to(REPO)}: {body_pages + 1} pages")
    return target


def build_docx(lang):
    source = HERE / LANGS[lang]["source"]
    target = OUT / LANGS[lang]["docx"]
    args = ["pandoc", str(source), "--from", "markdown", "--to", "docx",
            "--toc", "--toc-depth=2", "--number-sections",
            "--metadata", f"toc-title={LANGS[lang]['toc']}",
            "--resource-path", str(HERE), "-o", str(target)]
    reference = HERE / "reference.docx"
    if reference.exists():
        args += ["--reference-doc", str(reference)]
    run(args, cwd=HERE)
    print(f"  {target.relative_to(REPO)}")
    return target


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--lang", choices=sorted(LANGS), action="append")
    parser.add_argument("--no-docx", action="store_true")
    args = parser.parse_args()

    langs = args.lang or [l for l in LANGS if (HERE / LANGS[l]["source"]).exists()]
    OUT.mkdir(exist_ok=True)

    from playwright.sync_api import sync_playwright
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch()
        try:
            for lang in langs:
                print(f"{lang}:")
                build_pdf(lang, browser)
                if not args.no_docx:
                    build_docx(lang)
        finally:
            browser.close()


if __name__ == "__main__":
    main()
