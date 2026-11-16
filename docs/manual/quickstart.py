#!/usr/bin/env python3
"""
SHACK-SERVER quick start (one A4 page): installation from the image.

    python3 docs/manual/quickstart.py   -> docs/manual/out/SHACK-SERVER_Kurzanleitung_DE.pdf
                                           docs/manual/out/SHACK-SERVER_QuickStart_EN.pdf

Called by build.py too (same release "manual"). Text in TEXT below,
layout in CSS below - both languages from one template.
"""

import base64
import html
from pathlib import Path

HERE = Path(__file__).resolve().parent
OUT = HERE / "out"

MANUAL_URL = {
    "de": "github.com/cgraf63/SHACK-SERVER/releases/download/manual/SHACK-SERVER_Handbuch_DE.pdf",
    "en": "github.com/cgraf63/SHACK-SERVER/releases/download/manual/SHACK-SERVER_Manual_EN.pdf",
}

TEXT = {
    "de": {
        "file": "SHACK-SERVER_Kurzanleitung_DE.pdf",
        "title": "Kurzanleitung",
        "subtitle": "Installation ab Image – in 10 Minuten zur Station",
        "need_title": "Du brauchst",
        "need": [
            "<b>Raspberry Pi 4 / 5</b> – oder <b>Pi Zero 2 W</b> für eine Station mit einem Transceiver (ohne SDR)",
            "<b>microSD-Karte</b> ab 16 GB, am besten „High Endurance“ oder A2",
            "<b>Netzteil</b> für den Pi (Pi 4: 15 W USB-C, Zero 2 W: 2,5 A Micro-USB)",
            "<b>USB-Kabel</b> zum Transceiver (Zero 2 W: mit OTG-Adapter)",
            "das Image <b>shack-server-x.y.z-arm64.img.xz</b>",
        ],
        "steps": [
            ("Karte schreiben",
             "<b>Raspberry Pi Imager</b> öffnen → Modell wählen → Betriebssystem: "
             "<b>Eigenes Image verwenden</b> → die <b>.img.xz</b> wählen → Speicher → <b>Schreiben</b>. "
             "Anpassungen (WLAN, Benutzer) sind nicht nötig – das macht SHACK-SERVER selbst."),
            ("Anschliessen und einschalten",
             "Karte in den Pi, Transceiver per USB anschliessen und einschalten, dann den Pi mit Strom versorgen. "
             "Der erste Start dauert 1–2 Minuten (Zero 2 W: 3–4 Minuten)."),
            ("Netzwerk",
             "<b>Mit Netzwerkkabel:</b> nichts zu tun, weiter mit Schritt 4.<br>"
             "<b>Mit WLAN:</b> nach etwa 2 Minuten erscheint das WLAN <b>SHACK-SERVER-Setup</b>. "
             "Mit dem Handy verbinden – die Einrichtungsseite öffnet sich (sonst <b>http://10.42.0.1</b>). "
             "Eigenes WLAN wählen, Passwort, <b>Connect</b>. Das Setup-WLAN verschwindet danach."),
            ("SHACK-SERVER öffnen",
             "Im Browser (PC, Tablet oder Handy im selben Netz): "
             "<span class='url'>http://shack-server.local:3000</span>"
             "Der <b>Einrichtungs-Assistent</b> fragt Rufzeichen, Locator und Transceiver ab, "
             "optional den QRZ.com-Zugang."),
            ("Fertig – und immer aktuell",
             "Das Dashboard zeigt Spots, Ausbreitung und den Transceiver. Neue Versionen: "
             "<b>Settings → Software update → Update now</b>, danach im Browser <b>Ctrl+F5</b>."),
        ],
        "help_title": "Wenn etwas nicht klappt",
        "help": [
            ("shack-server.local geht nicht",
             "Im Router die IP-Adresse von „shack-server“ nachsehen und <b>http://&lt;IP&gt;:3000</b> öffnen."),
            ("Setup-WLAN kommt wieder",
             "Das WLAN-Passwort war falsch – einfach nochmals verbinden und neu eingeben."),
            ("Transceiver wird nicht gefunden",
             "USB-Kabel prüfen, Transceiver einschalten; im Assistenten den Treiber und Port wählen."),
            ("Service-Zugang (SSH)",
             "Datei <b>shack-access.txt</b> mit <i>user=admin</i> und <i>password=…</i> auf die Partition "
             "<b>bootfs</b> der Karte legen – wird beim Start gelesen und gelöscht."),
        ],
        "manual": "Ausführliches Handbuch (PDF):",
        "footer": "SHACK-SERVER",
    },
    "en": {
        "file": "SHACK-SERVER_QuickStart_EN.pdf",
        "title": "Quick start",
        "subtitle": "Installation from the image – on the air in 10 minutes",
        "need_title": "You need",
        "need": [
            "<b>Raspberry Pi 4 / 5</b> – or a <b>Pi Zero 2 W</b> for a station with one transceiver (no SDR)",
            "<b>microSD card</b> 16 GB or more, ideally “High Endurance” or A2",
            "<b>Power supply</b> for the Pi (Pi 4: 15 W USB-C, Zero 2 W: 2.5 A micro-USB)",
            "<b>USB cable</b> to the transceiver (Zero 2 W: with an OTG adapter)",
            "the image <b>shack-server-x.y.z-arm64.img.xz</b>",
        ],
        "steps": [
            ("Write the card",
             "Open the <b>Raspberry Pi Imager</b> → choose the model → operating system: "
             "<b>Use custom</b> → choose the <b>.img.xz</b> → storage → <b>Write</b>. "
             "No customisation (Wi-Fi, user) needed – SHACK-SERVER does that itself."),
            ("Connect and power on",
             "Card into the Pi, connect the transceiver via USB and switch it on, then power the Pi. "
             "The first start takes 1–2 minutes (Zero 2 W: 3–4 minutes)."),
            ("Network",
             "<b>With a network cable:</b> nothing to do, go on with step 4.<br>"
             "<b>With Wi-Fi:</b> after about 2 minutes the Wi-Fi <b>SHACK-SERVER-Setup</b> appears. "
             "Join it with your phone – the setup page opens (otherwise <b>http://10.42.0.1</b>). "
             "Choose your Wi-Fi, password, <b>Connect</b>. The setup Wi-Fi disappears afterwards."),
            ("Open SHACK-SERVER",
             "In a browser (PC, tablet or phone in the same network): "
             "<span class='url'>http://shack-server.local:3000</span>"
             "The <b>setup assistant</b> asks for callsign, locator and transceiver, "
             "optionally the QRZ.com login."),
            ("Done – and always up to date",
             "The dashboard shows spots, propagation and the transceiver. New versions: "
             "<b>Settings → Software update → Update now</b>, then <b>Ctrl+F5</b> in the browser."),
        ],
        "help_title": "If something does not work",
        "help": [
            ("shack-server.local does not open",
             "Look up the IP address of “shack-server” in your router and open <b>http://&lt;IP&gt;:3000</b>."),
            ("The setup Wi-Fi comes back",
             "The Wi-Fi password was wrong – just join it again and enter it once more."),
            ("Transceiver not found",
             "Check the USB cable, switch the transceiver on; choose driver and port in the assistant."),
            ("Service access (SSH)",
             "Put a file <b>shack-access.txt</b> with <i>user=admin</i> and <i>password=…</i> on the "
             "<b>bootfs</b> partition of the card – read at boot and deleted."),
        ],
        "manual": "Full manual (PDF):",
        "footer": "SHACK-SERVER",
    },
}

CSS = """
@page { size: A4; margin: 0; }
* { box-sizing: border-box; }
html { font-family: "Inter", "Helvetica Neue", Arial, sans-serif; color: #1c2530;
       -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body { margin: 0; width: 210mm; height: 297mm; position: relative; overflow: hidden; }
.head { background: #08131b; color: #e8f1f5; padding: 12mm 14mm 9mm; display: flex; align-items: center; gap: 7mm; }
.head img { width: 25mm; height: 25mm; border-radius: 4mm; }
.head .brand { font-size: 9pt; letter-spacing: 3px; color: #00e5ff; font-weight: 700; }
.head h1 { margin: 1mm 0 1.5mm; font-size: 25pt; color: #fff; letter-spacing: -0.3px; }
.head p { margin: 0; font-size: 11pt; color: #9fb4bf; }
.main { padding: 8mm 14mm 0; display: grid; grid-template-columns: 1fr 58mm; gap: 8mm; }
.steps { display: grid; gap: 4.2mm; align-content: start; }
.step { display: grid; grid-template-columns: 10mm 1fr; gap: 4mm; }
.num { width: 10mm; height: 10mm; border-radius: 50%; background: #0a8fa3; color: #fff;
       font-weight: 800; font-size: 13pt; display: flex; align-items: center; justify-content: center; }
.step h2 { margin: 0.8mm 0 1.2mm; font-size: 12.5pt; color: #0b5f6d; }
.step p { margin: 0; font-size: 9.6pt; line-height: 1.5; }
.url { display: block; margin: 2mm 0; padding: 2.2mm 3.5mm; border-radius: 2mm; background: #08131b;
       color: #00e5ff; font-weight: 700; font-size: 12pt; letter-spacing: .2px; }
.side { display: grid; gap: 5mm; align-content: start; }
.box { background: #f2f6f8; border: 1px solid #d6dde4; border-radius: 3mm; padding: 4mm 4.5mm; }
.box h3 { margin: 0 0 2.5mm; font-size: 10.5pt; color: #0b5f6d; text-transform: uppercase; letter-spacing: 1px; }
.box ul { margin: 0; padding-left: 4mm; font-size: 8.6pt; line-height: 1.45; }
.box li { margin-bottom: 1.6mm; }
.help { margin: 7mm 14mm 0; border-top: 2px solid #0a8fa3; padding-top: 4mm; }
.help h3 { margin: 0 0 3mm; font-size: 11pt; color: #0b5f6d; }
.help-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 3mm 8mm; font-size: 8.6pt; line-height: 1.45; }
.help-grid b.t { display: block; color: #1c2530; margin-bottom: .5mm; }
.foot { position: absolute; left: 14mm; right: 14mm; bottom: 9mm; display: flex; justify-content: space-between;
        font-size: 8pt; color: #5d6b78; border-top: 1px solid #d6dde4; padding-top: 3mm; }
.foot .link { color: #0a8fa3; font-weight: 600; }
.foot > span:first-child { flex: 1; padding-right: 6mm; }
.foot > span:last-child { white-space: nowrap; }
"""


def page_html(lang: str, logo: str, version: str) -> str:

    t = TEXT[lang]

    steps = "".join(
        f"<div class='step'><div class='num'>{i}</div><div><h2>{html.escape(title)}</h2><p>{body}</p></div></div>"
        for i, (title, body) in enumerate(t["steps"], 1))

    need = "".join(f"<li>{item}</li>" for item in t["need"])

    help_items = "".join(f"<div><b class='t'>{html.escape(title)}</b>{body}</div>" for title, body in t["help"])

    return f"""<!DOCTYPE html><html lang="{lang}"><head><meta charset="utf-8"><style>{CSS}</style></head><body>
<div class="head">
  <img src="data:image/png;base64,{logo}" alt="">
  <div><div class="brand">SHACK-SERVER</div><h1>{html.escape(t['title'])}</h1><p>{html.escape(t['subtitle'])}</p></div>
</div>
<div class="main">
  <div class="steps">{steps}</div>
  <div class="side"><div class="box"><h3>{html.escape(t['need_title'])}</h3><ul>{need}</ul></div></div>
</div>
<div class="help"><h3>{html.escape(t['help_title'])}</h3><div class="help-grid">{help_items}</div></div>
<div class="foot">
  <span>{html.escape(t['manual'])} <span class="link">{MANUAL_URL[lang]}</span></span>
  <span>{html.escape(t['footer'])}{(' · ' + html.escape(version)) if version else ''}</span>
</div>
</body></html>"""


def build(browser, version: str = "") -> None:

    OUT.mkdir(exist_ok=True)
    logo = base64.b64encode((HERE / "images" / "cover-logo.png").read_bytes()).decode()

    for lang, t in TEXT.items():
        page = browser.new_page()
        page.set_content(page_html(lang, logo, version), wait_until="load")
        page.pdf(path=str(OUT / t["file"]), format="A4", print_background=True,
                 margin={"top": "0", "bottom": "0", "left": "0", "right": "0"})
        page.close()
        print(f"quick start {lang}: {t['file']}")


if __name__ == "__main__":
    from playwright.sync_api import sync_playwright
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch()
        try:
            build(browser)
        finally:
            browser.close()
