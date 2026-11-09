# SHACK-SERVER – Installationsanleitung

## 1. Übersicht
===============

SHACK-SERVER ist ein Node.js/TypeScript-Server für den Amateurfunkbetrieb mit REST-API, WebSocket-Unterstützung, DX-Cluster-Anbindungen, Geo-/QRZ-Anreicherung und Weboberfläche.

Zusätzlich kann SHACK-SERVER Stationen von DX Summit (`dxsummit.fi`) und HolyCluster (`holycluster.org`) integrieren. Bei den Live-Spots wird angezeigt, über welche DX-Cluster eine Station gefunden wurde. Das System berechnet daraus einen Score: Je mehr unabhängige Cluster dieselbe Station melden, desto höher ist der Score.

Für SOTA- und POTA-Aktivierungen wird neben dem Callsign ein kleines Dreieck angezeigt – grün für POTA und weiss für SOTA.

Die Applikation kann die gefundenen Callsigns auf Wunsch auf einer zoombaren Karte darstellen. Zusätzlich beinhaltet SHACK-SERVER ein einfaches Logprogramm mit ADIF-Import und ADIF-Export sowie eine Contest-Konsole.

Transceiver werden per CAT angesteuert: mit eigenen Treibern (Yaesu FTDX10, Yaesu FTX-1, RGO-One, Icom CI-V, QRP Labs QMX) und über **Hamlib** für mehrere Hundert weitere Modelle.

Diese Anleitung beschreibt die Installation auf einem Raspberry Pi mit:

- Debian GNU/Linux 13 (Trixie) / Raspberry Pi OS Lite (64-bit)
- ARM64 / `aarch64`
- Node.js 22
- npm 10
- PM2 7
- Projektverzeichnis `~/SHACK-SERVER`

### Ports

| Port | Funktion |
|---|---|
| TCP 3000 | SHACK-SERVER Weboberfläche / REST API |
| TCP 8000 | integrierter DX-Cluster-Telnet-Server |
| TCP 80 / 443 | Caddy (HTTPS), falls eingerichtet |

Zusätzlich benötigt der Raspberry ausgehende TCP-Verbindungen zu den konfigurierten DX-Cluster-Servern.

---

# Schnellinstallation (empfohlen)

Für die meisten Benutzer genügt ein einziger Befehl. Er richtet alles ein, was die folgenden Kapitel von Hand beschreiben.

**Voraussetzungen:** Raspberry Pi mit **64-Bit** Raspberry Pi OS (Debian 13), Netzwerk, ein Benutzer mit `sudo`-Rechten (siehe Kapitel 2).

Als normaler Benutzer (nicht als root) im Terminal des Raspberry:

```bash
curl -fsSL https://raw.githubusercontent.com/cgraf63/SHACK-SERVER/main/scripts/install.sh | bash
```

Der Installer

1. prüft das System (64 Bit, Arbeitsspeicher, Internet),
2. installiert die Systempakete inkl. **Hamlib** (für weitere Transceiver) und **Node.js 22**,
3. installiert **pm2** und richtet den **Autostart** ein,
4. gibt dem Benutzer Zugriff auf die seriellen Schnittstellen (Gruppe `dialout`),
5. lädt SHACK-SERVER von GitHub nach `~/SHACK-SERVER` und baut ihn,
6. startet den Setup-Assistenten für `.env` / QRZ (`scripts/shack-server-setup`),
7. richtet auf Wunsch **Caddy** für **HTTPS im Heimnetz** ein (`https://<IP>` und `https://<hostname>.local`) – optional zusätzlich einen **öffentlichen Hostnamen hinter Cloudflare**.

Am Ende zeigt er die Adresse für den Browser an. Danach in den **Settings** Station und **Transceivers** einrichten (Kapitel 16).

Wurde der Benutzer neu zur Gruppe `dialout` hinzugefügt, einmal neu starten (`sudo reboot`).

### Update

```bash
bash ~/SHACK-SERVER/scripts/install.sh --update
```

Holt die neueste Version (`git pull`), baut sie und startet SHACK-SERVER neu. Lokale Änderungen an Dateien werden erkannt; der Installer fragt dann nach, bevor er etwas überschreibt.

### Wichtige Optionen

| Option | Wirkung |
|---|---|
| `--update` | Nur aktualisieren (ohne Fragen) |
| `--no-caddy` | Caddy nicht einrichten |
| `--dir DIR` | Anderes Installationsverzeichnis |
| `--repo URL` | Andere Repository-Adresse |
| `--dry-run` | Nur anzeigen, was gemacht würde |

### Caddy und eine bestehende Konfiguration

Eine **selbst gepflegte** `/etc/caddy/Caddyfile` wird **nie ohne Rückfrage** ersetzt (Standard: behalten). Der Installer legt dann einen Vorschlag in `~/SHACK-SERVER/Caddyfile.shack-server` ab.

Eine vom Installer erzeugte Caddyfile beginnt mit der Zeile `# SHACK-SERVER: managed by scripts/install.sh` und wird bei jedem Lauf neu geschrieben (vorher Backup). Soll sie von Hand gepflegt werden: diese erste Zeile löschen.

**Sicherheit:** SHACK-SERVER hat **keine eigene Anmeldung** und kann den Transceiver steuern, inklusive PTT und Remote-Mikrofon. Ein öffentlicher Zugang darf deshalb nur über einen geschützten Weg laufen, z. B. **Cloudflare Tunnel mit Cloudflare Access** (siehe Kapitel 18).

### Browser-Warnung im Heimnetz

Caddy stellt im Heimnetz ein eigenes Zertifikat aus („tls internal“). Damit der Browser nicht warnt, das Stammzertifikat

```
/var/lib/caddy/.local/share/caddy/pki/authorities/local/root.crt
```

auf PC, Tablet und Handy als vertrauenswürdig installieren. Tipp: Im Router eine **feste IP** für den Raspberry vergeben.

Die folgenden Kapitel beschreiben die manuelle Installation Schritt für Schritt.

---

# 2. Voraussetzungen

Benötigt werden:

- Raspberry Pi (empfohlen: Raspberry Pi 4 oder 5) mit **64-Bit**-Betriebssystem
- Netzwerkverbindung
- SSH-Zugang
- Benutzer mit `sudo`-Rechten
- Zugriff auf die benötigten externen Dienste (GitHub, DX-Cluster, QRZ)

### Empfohlenes Betriebssystem

Für den SHACK-SERVER wird **Raspberry Pi OS Lite (64-bit)** empfohlen.

Eine grafische Oberfläche wird nicht benötigt. Der SHACK-SERVER läuft als Serverdienst und wird über das Netzwerk bzw. einen Webbrowser administriert. Die Lite-Version benötigt weniger Ressourcen und installiert keine unnötigen Desktop-Komponenten.

Beim Schreiben der SD-Karte mit dem **Raspberry Pi Imager** können direkt gesetzt werden:

- Hostname (z. B. `shack-server`)
- Benutzer und Passwort
- WLAN (falls kein Netzwerkkabel)
- **SSH aktivieren**

Empfohlene Kontrolle des Systems:

```bash
cat /etc/os-release
uname -m
```

Erwartet wird unter anderem:

```text
Debian GNU/Linux 13
aarch64
```

Ein 32-Bit-System (`armv7l`) wird nicht unterstützt – für Node.js 22 gibt es dafür keine Pakete mehr.

---

# 3. System aktualisieren

```bash
sudo apt update
sudo apt upgrade -y
```

Benötigte Grundpakete installieren:

```bash
sudo apt install -y git curl ca-certificates gnupg build-essential netcat-openbsd libhamlib-utils avahi-daemon
```

| Paket | Wozu |
|---|---|
| `git` | Code von GitHub holen und aktualisieren |
| `build-essential` | Fallback, falls ein npm-Paket kompiliert werden muss |
| `netcat-openbsd` | Verbindungstests (`nc`) |
| `libhamlib-utils` | Hamlib (`rigctl`, `rigctld`, `rotctld`) für den Hamlib-Transceivertreiber und den Antennenrotor |
| `avahi-daemon` | Erreichbarkeit als `<hostname>.local` im Heimnetz |

---

# 4. Node.js 22 installieren

SHACK-SERVER benötigt Node.js 22 oder neuer (`package.json`: `"engines": { "node": ">=22" }`). Auf Debian 13 ARM64 wird Node.js 22 über NodeSource installiert:

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
```

Version prüfen:

```bash
node --version
npm --version
```

Es sollte eine Node.js-Version `v22.x.x` angezeigt werden. Auf dem Referenzsystem:

```text
Node.js v22.23.1
npm 10.9.8
```

---

# 5. PM2 installieren

PM2 wird für den dauerhaften Betrieb des Servers verwendet.

Installation:

```bash
sudo npm install -g pm2
```

Prüfen:

```bash
pm2 --version
```

Referenzsystem:

```text
PM2 7.0.3
```

---

# 6. Zugriff auf die Transceiver-Schnittstellen

Transceiver werden über USB-Seriell-Schnittstellen (`/dev/ttyUSB…`, `/dev/ttyACM…`) angesprochen. Dafür muss der Benutzer, unter dem SHACK-SERVER läuft, Mitglied der Gruppe `dialout` sein:

```bash
sudo usermod -aG dialout $USER
```

Die Änderung wird erst nach einem **Neustart** (oder neuer Anmeldung) wirksam:

```bash
sudo reboot
```

Prüfen:

```bash
groups
```

In der Ausgabe muss `dialout` erscheinen. Ohne diese Gruppe meldet der Verbindungstest in den Settings „No permission for the serial port“.

---

# 7. SHACK-SERVER installieren

Repository klonen:

```bash
cd ~
git clone https://github.com/cgraf63/SHACK-SERVER.git SHACK-SERVER
cd ~/SHACK-SERVER
```

Falls das Repository bereits vorhanden ist:

```bash
cd ~/SHACK-SERVER
git pull
```

---

# 8. Abhängigkeiten installieren

Im Projektverzeichnis:

```bash
cd ~/SHACK-SERVER
npm install
```

Danach sollte `node_modules` vorhanden sein.

---

# 9. Grundkonfiguration (.env)

In `.env` stehen nur noch **Zugangsdaten und technische Grundwerte**. Alles andere (Station, DX-Cluster, Transceiver) wird in der Weboberfläche eingestellt (Kapitel 10).

Am einfachsten wird `.env` mit dem Setup-Assistenten angelegt:

```bash
bash ~/SHACK-SERVER/scripts/shack-server-setup
```

Er legt vorher ein Backup an, fragt Port und QRZ-Zugangsdaten ab (Passwort und API-Key werden nicht angezeigt) und setzt die Dateirechte.

Die Anwendung lädt `.env` über `import "dotenv/config";` in `src/app.ts` – die Datei wird deshalb nicht über PM2 konfiguriert.

### Verwendete Variablen

| Variable | Bedeutung | Pflicht |
|---|---|---|
| `PORT` | HTTP-Port des SHACK-SERVER (Standard: `3000`) | nein |
| `QRZ_USER` | QRZ.com Benutzername | für QRZ-Daten |
| `QRZ_PASSWORD` | QRZ.com Passwort | für QRZ-Daten |
| `QRZ_API_KEY` | QRZ.com API-Key | für QRZ-Daten |
| `CONTEST_CONTROL_KEY` | Schlüssel für geschützte Contest-Verwaltungsfunktionen. Ohne diesen Wert sind diese Funktionen gesperrt. | nein |

Beispiel:

```env
PORT=3000

# QRZ
QRZ_USER=HB9xxx
QRZ_PASSWORD=xxxxxxxxxx
QRZ_API_KEY=xxxxxxxxxx

# Contest-Verwaltung (optional, frei wählbar)
CONTEST_CONTROL_KEY=ein-langer-zufaelliger-wert
```

Die gezeigten Werte sind Beispiele und müssen durch die eigenen ersetzt werden.

**Hinweis:** Frühere Versionen dieser Anleitung enthielten Variablen wie `SHACK_CALLSIGN`, `DXSPIDER1_…`, `HOLYCLUSTER_…` oder `DXSUMMIT_…`. Diese werden **nicht mehr gelesen** und können aus einer bestehenden `.env` entfernt werden.

### Dateirechte

Da die `.env` Zugangsdaten enthält:

```bash
chmod 600 .env
```

Prüfen:

```bash
ls -l .env
```

---

# 10. Wo welche Einstellung liegt

| Was | Wo | Bearbeiten |
|---|---|---|
| QRZ-Zugangsdaten, Port, Contest-Schlüssel | `.env` | `scripts/shack-server-setup` oder Editor |
| Callsign, Operator, Locator, Club | `data/settings.json` | Weboberfläche → **Settings** → Station |
| DXSpider, HolyCluster, DX Summit | `data/settings.json` | Weboberfläche → **Settings** → DX Sources |
| Transceiver (Treiber, Port, Baudrate, Hamlib) | `data/radios.json` | Weboberfläche → **Settings** → Transceivers |
| Logbuch, Contest-Daten | `data/*.db` | Weboberfläche |

Die Dateien unter `data/` werden beim ersten Start automatisch angelegt.

Die Dateien unter `src/config/` (z. B. `settings.config.ts`, `radios.config.ts`) enthalten nur noch **Startwerte für eine neue Installation**. Änderungen dort haben bei einer bestehenden Installation keine Wirkung mehr – maßgeblich sind die Dateien unter `data/`.

`.env` und `data/` gehören **nicht** ins Repository (siehe Kapitel 11).

---

# 11. .env und Daten nicht in Git übernehmen

`.env` und die Datenbanken dürfen nicht in das Repository eingecheckt werden.

`.gitignore` muss mindestens enthalten:

```gitignore
.env
.env.*
data/*.db
data/*.db-shm
data/*.db-wal
```

Prüfen:

```bash
grep -n -E "^\.env|^data/" .gitignore
```

---

# 12. Build durchführen

Vor dem ersten Start:

```bash
cd ~/SHACK-SERVER
npm run build
```

Der Build führt die TypeScript-Kompilierung durch und kopiert die Weboberfläche nach `dist/public`.

Nach erfolgreichem Build muss das Verzeichnis `dist` vorhanden sein:

```bash
ls -la dist
```

**Wichtig:** PM2 startet `dist/index.js`. Jede Änderung unter `src/` – auch an HTML-, CSS- oder JavaScript-Dateien der Weboberfläche – wird erst nach `npm run build` und einem Neustart wirksam.

---

# 13. SHACK-SERVER testweise starten

Vor der Einrichtung von PM2 kann der Server testweise direkt gestartet werden:

```bash
cd ~/SHACK-SERVER
node dist/index.js
```

Dabei sollte unter anderem der HTTP-Server starten.

Mit `Ctrl+C` wieder beenden.

---

# 14. SHACK-SERVER mit PM2 starten

Server starten:

```bash
cd ~/SHACK-SERVER
pm2 start dist/index.js --name shack-server
```

Status prüfen:

```bash
pm2 status
```

Details anzeigen:

```bash
pm2 describe shack-server
```

Die Konfiguration des Referenzsystems sieht sinngemäß so aus:

```text
name:       shack-server
script:     /home/admin/SHACK-SERVER/dist/index.js
cwd:        /home/admin/SHACK-SERVER
interpreter: node
```

Das Arbeitsverzeichnis (`cwd`) muss `~/SHACK-SERVER` sein – dort liegen `.env` und `data/`.

---

# 15. PM2 dauerhaft aktivieren

Aktuelle Prozesse speichern:

```bash
pm2 save
```

Autostart konfigurieren:

```bash
pm2 startup
```

PM2 gibt anschließend einen `sudo ...`-Befehl aus.

Diesen exakt ausführen.

Danach erneut:

```bash
pm2 save
```

Nach einem Neustart prüfen:

```bash
pm2 status
```

---

# 16. Transceiver einrichten

Transceiver werden in der Weboberfläche eingerichtet – ohne Dateien zu bearbeiten:

**Settings → Transceivers → + Add Transceiver**

1. **Transceiver / driver** wählen:
   - eigene Treiber: Yaesu FTDX10, Yaesu FTX-1, RGO-One, Icom CI-V, QRP Labs QMX
   - **Hamlib - other transceivers** für alle weiteren Modelle (Hersteller und Modell aus der Liste wählen)
2. **Serial port** wählen. Erkannte Schnittstellen werden mit lesbarem Namen angezeigt; bei Yaesu-Geräten mit CP2105-Chip ist der CAT-Port („Interface 0“) markiert.
3. **Baud rate** – muss zur CAT-Einstellung im Menü des Transceivers passen. Bei Hamlib meist „Model default“.
4. Bei Icom zusätzlich die **CI-V-Adresse**.
5. **Test connection** – zeigt bei Erfolg die aktuelle Frequenz, sonst die Ursache im Klartext (Gerät aus, kein Zugriff, falsche Baudrate, Port belegt …).
6. **Save transceiver** – wird sofort aktiv, ohne Neustart.

Der Transceiver verbindet sich automatisch neu, wenn er eingeschaltet oder das USB-Kabel wieder eingesteckt wird.

### Transceiver mit anderen Programmen teilen

Eine serielle Schnittstelle kann nur von einem Programm gleichzeitig geöffnet werden. Soll der Transceiver zusätzlich von WSJT-X oder einem Logprogramm gesteuert werden, ein gemeinsames `rigctld` starten und in SHACK-SERVER beim Treiber **Hamlib** die Verbindung **„Existing rigctld“** (Host und Port, Standard 4532) wählen.

### Push-Benachrichtigung für die Watchlist (optional)

SHACK-SERVER prüft jeden neuen Spot gegen die **Watchlist** (Dashboard: *ADD TO WATCH*) - auch wenn kein Browser offen ist - und schickt eine Nachricht aufs Handy über **ntfy**, z. B. `FW3GT DETECTED – 14.001 MHz CW – Wallis & Futuna – via RBN`.

1. App **ntfy** installieren (Android / iOS).
2. **Settings → Watch list notifications**: *Push notifications* ankreuzen, mit **Suggest** einen schwer erratbaren Topic-Namen erzeugen, **Save**.
3. In der ntfy-App: *Subscribe to topic* → derselbe Topic-Name (Server ntfy.sh).
4. **Send test**.

Die Glocke 🔔 neben jedem Rufzeichen der Watchlist schaltet die Push-Nachricht für dieses Rufzeichen ein oder aus. Die **Sperrzeit** (Standard 15 min) verhindert wiederholte Alarme derselben Station, **Ruhezeiten** unterdrücken Nachrichten in der Nacht. **Link**: Adresse deines SHACK-SERVER (z. B. die Cloudflare-Adresse) - ein Tipp auf die Nachricht öffnet ihn. Spots in den ersten 2 Minuten nach einem Neustart lösen keinen Alarm aus.

### New – "needed" Callsigns und «Heard near you» (optional)

**Settings → New – "needed" callsigns** schickt eine Push-Nachricht (gleiches ntfy-Topic wie die Watchlist), wenn eine Station gespottet wird, die du noch brauchst - ohne Rufzeichen einzutragen. Verglichen wird mit dem Log nach **DXCC-Gebiet** (cty.dat): Ceuta & Melilla, Kanarische Inseln, asiatisches Russland usw. zählen separat.

- Stufen: **NEW COUNTRY**, **NEW BAND COUNTRY**, optional **NEW BAND** / **NEW MODE** für eine schon gearbeitete Station.
- Filter: Bänder, Modes, Mindest-Score, *nur wenn in meiner Region gehört*.
- Sperrzeit pro Land + Band (ein Pileup alarmiert einmal), Ruhezeiten und Link wie bei der Watchlist.
- Beispiel: `NEW COUNTRY: FW3GT – Wallis & Futuna Islands – 14.001 MHz CW – heard in EU (3 spotters, 18 dB) – via DX Summit, RBN`

**Heard near you**: SHACK-SERVER liest den kompletten Reverse-Beacon-Network-Feed (CW/RTTY-Skimmer mit SNR und Locator) und die Spotter-Rufzeichen der DX-Cluster. Eine Station gilt als *nah gehört*, wenn ein Spotter im eingestellten Umkreis deines QTH (Standard 1000 km) sie in den letzten 15 Minuten auf diesem Band gemeldet hat. Optional zusätzlich der **PSK-Reporter**-Live-Feed (FT8, FT4, JS8 ...; *Settings → New – "needed" callsigns → PSK Reporter*): SHACK-SERVER abonniert nur die Meldungen von Empfängern in den Locator-Feldern innerhalb des Umkreises (MQTT, mqtt.pskreporter.info, Port 1883). Live-Spots und DXpeditions-Seite zeigen ein grünes **NEAR**, der DX-Score bekommt +15. Die letzten "needed" Callsigns stehen im Dashboard unter der Watchlist (Klick = abstimmen).

### Backup (Dropbox und/oder NAS)

**Settings → Backup** sichert QSO- und Contest-Log, Einstellungen und Transceiver einmal täglich (Uhrzeit und Anzahl Sicherungen einstellbar). Beide Ziele laufen über **rclone**: `sudo apt install rclone`.

- **Dropbox** (oder Google Drive, OneDrive ...): Ziel einmalig als Benutzer `admin` einrichten: `rclone config` → *n* (new remote) → Name `dropbox` → Typ *dropbox* → Vorgaben bestätigen. Auf einem Pi ohne Desktop zeigt rclone einen Befehl (`rclone authorize "dropbox"`), den man auf einem PC mit Browser ausführt; das Ergebnis zurück einfügen. In den Settings `dropbox:SHACK-SERVER` eintragen und **Test** drücken.
- **NAS (SMB)**: Adresse, Freigabe, Ordner, Benutzer und Passwort des NAS. Kein Einbinden (mount) nötig. **Test** prüft den Zugriff.

**Backup now** sichert sofort mit den gespeicherten Einstellungen. Die letzten 3 Sicherungen bleiben zusätzlich in `data/backups` auf dem Pi.

**Wiederherstellen** (Beispiel):

```bash
mkdir ~/restore && tar -xzf shack-server-backup-2026-11-07_0315.tar.gz -C ~/restore
pm2 stop shack-server
cp ~/restore/shack-server.db ~/restore/settings.json ~/restore/radios.json ~/SHACK-SERVER/data/
rm -f ~/SHACK-SERVER/data/shack-server.db-wal ~/SHACK-SERVER/data/shack-server.db-shm
pm2 start shack-server
```

### Split (automatisch)

Steht im Spot "UP 2", "UP 1-3", "DOWN 1", "QSX 14025", "QSX 025" oder "LSN 14.205", setzt **TUNE** die Empfangsfrequenz auf VFO A, die Sendefrequenz auf VFO B und schaltet Split ein; die Live-Spots zeigen den Split als oranges Abzeichen neben der Frequenz (z. B. `UP 2`). Das Abstimmen auf einen Spot ohne Split schaltet Split wieder aus. Unterstützt: Yaesu FTDX10, RGO ONE und alle Transceiver über Hamlib mit Split-Steuerung. FT8-/FT4-Spots werden ohne Split abgestimmt (DXpedition-Modus in WSJT-X). Ausschalten unter *Settings → Split*.

### Antennenrotor (optional)

SHACK-SERVER kann die Antenne über Hamlib drehen (`rotctld`, Teil von `libhamlib-utils`). Unterstützt werden alle Steuergeräte, die Hamlib kennt, z. B. Yaesu GS-232, SPID Rot2Prog, Hy-Gain DCU-1, ERC, K3NG.

1. **Settings → Rotator** → **Use a rotator** ankreuzen.
2. **Controller on a serial port**: Hersteller, Modell und Port wählen (Baudrate meist "Model default"). SHACK-SERVER startet `rotctld` selbst.
   **Existing rotctld**: Host und Port (Standard 4533) eines bereits laufenden `rotctld`, z. B. gemeinsam mit PSTRotator oder N1MM.
3. **Test** zeigt die aktuelle Antennenrichtung.
4. **Save**.

Im Dashboard erscheint danach im Bereich Station ein Kompass mit STOP-Taste. Ein Klick auf den **AZ**-Wert eines Spots dreht die Antenne; die Spot-Details (VIEW) bieten Short Path und Long Path.

Zum Ausprobieren ohne Hardware: `rotctld -m 1 &` starten (Hamlib-Dummy-Rotor) und **Existing rotctld** mit `127.0.0.1:4533` verwenden.

### Prüfen

```bash
cat ~/SHACK-SERVER/data/radios.json
curl -s http://localhost:3000/api/radios
```

Hamlib-Modellliste:

```bash
curl -s http://localhost:3000/api/radios/hamlib-models | head -c 300
```

---

# 17. HTTPS mit Caddy (optional, empfohlen)

Für Remote-Mikrofon und USB-Bedienteile im Browser (WebHID) verlangen moderne Browser HTTPS. Caddy stellt SHACK-SERVER per HTTPS bereit.

Am einfachsten richtet der Installer Caddy ein:

```bash
bash ~/SHACK-SERVER/scripts/install.sh
```

(Der Installer überspringt bereits erledigte Schritte und fragt nach, bevor er eine bestehende Caddy-Konfiguration ersetzt.)

Die manuelle Einrichtung von Caddy ist in `docs/SETUP_RASPBERRY.md` beschrieben.

---

# 18. Zugriff von außen (optional)

SHACK-SERVER ist für das Heimnetz gedacht. Wer ihn auch unterwegs nutzen möchte, braucht einen geschützten Zugang aus dem Internet. Die Einrichtung ist Sache des Benutzers und wird hier nicht Schritt für Schritt beschrieben. Bewährt hat sich **Cloudflare Tunnel** zusammen mit **Cloudflare Access**.

### Wichtig: Sicherheit

SHACK-SERVER hat **keine eigene Anmeldung**. Wer die Seite erreicht, kann den Transceiver steuern, inklusive PTT und Remote-Mikrofon. Deshalb:

- **Keine Portweiterleitung** im Router auf Port 3000, 80 oder 443.
- Den Zugang nur über einen Tunnel herstellen, der **immer eine Anmeldung davorschaltet** – bei Cloudflare eine **Access-Regel** (z. B. Login per E-Mail-Code, nur für die eigene Adresse).
- Die Access-Regel **vor** dem ersten Test anlegen und danach aktiv lassen.

### Prinzip mit Cloudflare

1. Domain bei Cloudflare, ein **Tunnel** im Zero-Trust-Dashboard, und darin ein **öffentlicher Hostname** (z. B. `shack.example.com`).
2. Auf dem Raspberry läuft der Tunnel-Connector `cloudflared`. Cloudflare zeigt beim Anlegen des Tunnels den passenden Befehl – wahlweise als **Debian-Paket** (Systemdienst) oder als **Docker-Container**. Beides funktioniert; für das Debian-Paket muss kein Docker installiert sein. Bei Docker `--restart unless-stopped` ergänzen, damit der Tunnel nach einem Neustart wieder läuft.
3. Für denselben Hostnamen eine **Access-Application** mit passender Regel anlegen.

### Zusammenspiel mit SHACK-SERVER

- **Mit Caddy:** Der Installer fragt nach dem öffentlichen Hostnamen und legt dafür in der Caddyfile einen eigenen Eintrag `http://<hostname>` an. Im Tunnel als Ziel `http://localhost:80` eintragen.
- **Ohne Caddy:** Im Tunnel als Ziel direkt `http://localhost:3000` eintragen.
- Läuft `cloudflared` in **Docker**, bezeichnet `localhost` den Container selbst. Dann den Container mit `--network host` starten oder statt `localhost` die IP des Raspberry eintragen.

HTTPS nach außen übernimmt Cloudflare.

### Dokumentation

- Cloudflare Tunnel einrichten: https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/get-started/create-remote-tunnel
- Cloudflare Zero Trust (inkl. Access): https://developers.cloudflare.com/cloudflare-one/

---

# 19. HTTP-Port 3000 prüfen

Auf dem Raspberry:

```bash
sudo ss -lntp | grep ':3000'
```

Erwartet wird ein Listener auf Port 3000.

Lokaler Test:

```bash
curl -s http://localhost:3000/api/diagnostics
```

Wenn der Server korrekt läuft, wird eine JSON-Antwort zurückgegeben.

---

# 20. Port 8000 prüfen

SHACK-SERVER stellt selbst einen DX-Cluster-Telnet-Server auf Port 8000 bereit.

Prüfen:

```bash
sudo ss -lntp | grep ':8000'
```

Erwartet:

```text
0.0.0.0:8000
```

Der Port muss bei Bedarf auch aus dem lokalen Netzwerk erreichbar sein.

Von einem anderen Rechner kann beispielsweise geprüft werden:

```bash
nc -vz <RASPBERRY-IP> 8000
```

---

# 21. DXSpider-Verbindungen prüfen

Die in den Settings konfigurierten externen DXSpider-Server müssen vom Raspberry aus erreichbar sein.

Beispiel:

```bash
nc -vz -w 5 <DXSPIDER-HOST> 8000
```

Auf dem Referenzsystem sind die beiden DXSpider-Verbindungen über TCP/8000 erreichbar.

Wichtig:

**Port 8000 hat hier zwei unterschiedliche Bedeutungen:**

1. SHACK-SERVER selbst lauscht lokal auf TCP/8000.
2. SHACK-SERVER baut ausgehend TCP-Verbindungen zu externen DXSpider-Servern auf deren konfigurierten Ports auf.

Beide Funktionen können gleichzeitig verwendet werden.

---

# 22. Logs prüfen

PM2-Ausgabe:

```bash
pm2 logs shack-server --lines 50 --nostream
```

Nur Fehler:

```bash
tail -n 50 ~/.pm2/logs/shack-server-error.log
```

Nur normale Ausgabe:

```bash
tail -n 50 ~/.pm2/logs/shack-server-out.log
```

Nur Meldungen der Transceiver-Anbindung:

```bash
pm2 logs shack-server --lines 300 --nostream | grep -E "CAT|CI-V|HAMLIB|RADIO" | grep -v " RX\| TX"
```

---

# 23. Diagnose-API

Die Diagnose-API ist ein wichtiger Funktionstest:

```bash
curl -s http://localhost:3000/api/diagnostics
```

Bei funktionierenden Quellen sollten unter anderem die Quellen angezeigt werden.

Beispielhafte Struktur:

```json
{
  "sources": [
    {
      "name": "HB9ON-8",
      "status": "Active"
    },
    {
      "name": "HB9IAC-8",
      "status": "Active"
    },
    {
      "name": "DX Summit",
      "status": "Active"
    }
  ]
}
```

Die tatsächlichen Werte ändern sich natürlich laufend.

---

# 24. QRZ prüfen

QRZ benötigt gültige Zugangsdaten in `.env`:

```env
QRZ_USER=...
QRZ_PASSWORD=...
QRZ_API_KEY=...
```

Die Anwendung lädt diese über `dotenv`.

Bei einem neuen Raspberry zuerst prüfen (zeigt nur die Namen, nicht die Werte):

```bash
grep -o "^QRZ_[A-Z_]*" .env
```

Dabei niemals das Passwort oder den API-Key in Logs oder Screenshots veröffentlichen.

Wenn QRZ nicht funktioniert, zunächst die PM2-Logs prüfen:

```bash
pm2 logs shack-server --lines 100 --nostream
```

Ein nicht bei QRZ vorhandenes Rufzeichen ist **kein Serverfehler**. Nicht jedes Rufzeichen muss bei QRZ vorhanden sein.

---

# 25. Firewall

Wenn `ufw` oder eine andere Firewall verwendet wird, müssen die benötigten Ports freigegeben werden.

Beispiel für UFW:

```bash
sudo ufw allow 3000/tcp
sudo ufw allow 8000/tcp
```

Mit Caddy zusätzlich:

```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
```

Danach:

```bash
sudo ufw status
```

Die ausgehenden Verbindungen zu den externen DX-Cluster-Servern müssen ebenfalls erlaubt sein.

---

# 26. Neustart-Test

Nach erfolgreicher Installation sollte unbedingt ein vollständiger Neustart getestet werden:

```bash
sudo reboot
```

Nach dem Neustart:

```bash
pm2 status
```

Danach:

```bash
sudo ss -lntp | grep -E ':3000|:8000'
```

und:

```bash
curl -s http://localhost:3000/api/diagnostics
```

Anschließend die Weboberfläche von einem Rechner im Netzwerk öffnen:

```text
http://<RASPBERRY-IP>:3000
```

bzw. mit Caddy:

```text
https://<RASPBERRY-IP>
https://<hostname>.local
```

---

# 27. Abschluss-Checkliste

| Prüfung | Kommando |
|---|---|
| Debian | `cat /etc/os-release` |
| Architektur | `uname -m` |
| Node.js | `node --version` |
| npm | `npm --version` |
| PM2 | `pm2 --version` |
| Hamlib | `rigctl --version` |
| Gruppe dialout | `groups` |
| Build | `npm run build` |
| PM2 | `pm2 status` |
| HTTP 3000 | `ss -lntp \| grep ':3000'` |
| Telnet 8000 | `ss -lntp \| grep ':8000'` |
| API | `curl -s http://localhost:3000/api/diagnostics` |
| Transceiver | Settings → Transceivers → Test connection |
| Logs | `pm2 logs shack-server --lines 50 --nostream` |
| Autostart | `pm2 save` / Neustart testen |
| DXSpider | `nc -vz <host> <port>` |
| Caddy (optional) | `systemctl status caddy` |

---

# 28. Referenzsystem

Der derzeit funktionierende SHACK-SERVER läuft auf:

```text
OS:       Debian GNU/Linux 13 (Trixie)
Arch:     aarch64
Node:     v22.23.1
npm:      10.9.8
PM2:      7.0.3
Hamlib:   4.6.2

Projekt:
~/SHACK-SERVER

HTTP:
TCP/3000

DX Cluster Telnet:
TCP/8000

PM2 Script:
~/SHACK-SERVER/dist/index.js
```

Die Konfigurationsdatei `.env` und das Verzeichnis `data/` enthalten standortspezifische und vertrauliche Daten und werden **nicht** ins Repository übernommen.

---

# 29. Update einer bestehenden Installation

Empfohlen – in einem Schritt:

```bash
bash ~/SHACK-SERVER/scripts/install.sh --update
```

Manuell:

```bash
cd ~/SHACK-SERVER
git pull
npm install
npm run build
pm2 restart shack-server
```

Danach prüfen:

```bash
pm2 status
curl -s http://localhost:3000/api/diagnostics
pm2 logs shack-server --lines 50 --nostream
```

Im Browser einmal **Ctrl+F5**, damit die neue Weboberfläche geladen wird.

---

# 30. Wichtige Hinweise

- `.env` enthält vertrauliche Daten und darf nicht veröffentlicht werden.
- QRZ-Zugangsdaten gehören ausschließlich in `.env`.
- Station, DX-Cluster und Transceiver werden in der Weboberfläche (**Settings**) gepflegt und in `data/` gespeichert.
- Die anonymisierten Werte in dieser Dokumentation sind durch die tatsächlichen Werte des jeweiligen Standorts zu ersetzen.
- Port 3000 ist die Web-/API-Schnittstelle.
- Port 8000 ist der integrierte DX-Cluster-Telnet-Server.
- Externe DXSpider-Verbindungen verwenden die jeweils konfigurierte Zieladresse und den konfigurierten Zielport.
- Nach Änderungen unter `src/` ist `npm run build` erforderlich, danach muss der PM2-Prozess neu gestartet werden.
- SHACK-SERVER hat keine eigene Anmeldung: Zugriff aus dem Internet nur über einen geschützten Weg (z. B. Cloudflare Access), nie durch direkte Portweiterleitung.

## Handy-App

Auf dem Handy `https://<dein-shack-server>/m` öffnen (unterwegs: die Cloudflare-Access-Adresse + `/m`)
und **Zum Home-Bildschirm** wählen (iPhone: Teilen-Menü, Android: Browser-Menü oder der Knopf *Install*).
Die App zeigt neue "needed" Callsigns und Watchlist-Treffer, Live-Spots (antippen = abstimmen, mit Split),
den Transceiver (Band, Mode, Split aus, Rotor) und ein schnelles QSO-Log. Für die Installation ist HTTPS nötig.

**Portabel-Log:** im LOG-Tab auf **PORTABLE** umschalten: eigenes Rufzeichen mit /P oder /M, Locator vom
Handy-GPS, POTA-/SOTA-/WWFF-Referenz (und die Referenz der Gegenstation für P2P / S2S), Band und Mode mit
einem Tipp (auch 2 m / 70 cm). Ohne Netz (Gipfel, Park) bleiben die QSOs auf dem Handy und werden automatisch
hochgeladen, sobald SHACK-SERVER wieder erreichbar ist - jedes QSO nur einmal. Die Referenzen gehen in den
ADIF-Upload (MY_SIG, MY_POTA_REF, MY_SOTA_REF, ...). Der Zähler zeigt die QSOs der Aktivierung (POTA 10, SOTA 4, WWFF 44).

## Yaesu FTX-1 Remote-Seite

Ist der FTX-1 der aktive Transceiver (Auswahl im Dashboard), öffnet der Knopf **FTX-1** in der Stationszeile
eine eigene Remote-Seite (`/ftx1`): MAIN und SUB wie im Display des Geräts, S-Meter / PO / SWR / ALC,
Abstimmknopf (ziehen, Mausrad, Pfeiltasten; Schritte 10 Hz - 25 kHz), PTT (Knopf halten oder Leertaste),
Tuner, Split, alle Bänder inkl. 2 m / 70 cm / AIR, alle Modes inkl. C4FM DN / VW, Filter, DSP (DNR, NB, DNF,
Notch, Contour, APF), AF / RF / Squelch, ATT, Vorverstärker (IPO / AMP1 / AMP2 auf KW, ein / aus auf V/UHF),
AGC, FM-Relaisablage, CTCSS / DCS, Sendeleistung (Field-Head 0.5 - 10 W, SPA-1 / Optima 5 - 100 W),
Mic-Gain, Prozessor, CW-Tempo, Break-in, CW-Speicher 1 - 5 und Remote-RX-Audio.

**MEM** (Speicherkanäle): READ CHANNELS liest die Kanäle 1 - 99 mit Name, Frequenz, Mode, Ablage und Ton
(etwa 10 s, die Liste bleibt in `data/ftx1-memories.json`); Kanal auf MAIN oder SUB abrufen, zurück in den
VFO-Betrieb, CH ▲ / ▼, QMB ablegen / abrufen, aktuelle Einstellung von MAIN oder SUB in einen Kanal speichern
(mit Name, Rückfrage vor dem Überschreiben) und Kanäle umbenennen. Split läuft beim FTX-1 über TX auf SUB
(FT-Befehl), nicht über ST - mit ST sperrt die Firmware den SUB-VFO.
