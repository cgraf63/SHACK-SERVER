# SHACK-SERVER – Installationsanleitung

## 1. Übersicht

SHACK-SERVER ist ein Node.js/TypeScript-Server für den Amateurfunkbetrieb mit REST-API, WebSocket-Unterstützung, DX-Cluster-Anbindungen, Geo-/QRZ-Anreicherung und Weboberfläche.

Zusätzlich kann SHACK-SERVER Stationen von DX Summit (`dxsummit.fi`) und HolyCluster (`holycluster.org`) integrieren. Bei den Live-Spots wird angezeigt, über welche DX-Cluster eine Station gefunden wurde. Das System berechnet daraus einen Score: Je mehr unabhängige Cluster dieselbe Station melden, desto höher ist der Score.

Für SOTA- und POTA-Aktivierungen wird neben dem Callsign ein kleines Dreieck angezeigt – grün für POTA und weiss für SOTA.

Die Applikation kann die gefundenen Callsigns auf Wunsch auf einer zoombaren Karte darstellen. Zusätzlich beinhaltet SHACK-SERVER ein einfaches Logprogramm mit ADIF-Import und ADIF-Export.

Diese Anleitung beschreibt die Installation auf einem Raspberry Pi mit:

- Debian GNU/Linux 13 (Trixie)
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

Zusätzlich benötigt der Raspberry ausgehende TCP-Verbindungen zu den konfigurierten DX-Cluster-Servern.

---

# 2. Voraussetzungen

Benötigt werden:

- Raspberry Pi mit 64-Bit-Debian
- Netzwerkverbindung
- SSH-Zugang
- Benutzer mit `sudo`-Rechten
- Git
- Node.js >= 22
- npm
- PM2
- Zugriff auf die benötigten externen Dienste

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

---

# 3. System aktualisieren

```bash
sudo apt update
sudo apt upgrade -y
```

Benötigte Grundpakete installieren:

```bash
sudo apt install -y git curl build-essential netcat-openbsd
```

---

# 4. Node.js installieren

SHACK-SERVER benötigt Node.js 22 oder neuer.

Version prüfen:

```bash
node --version
npm --version
```

Auf dem Referenzsystem:

```text
Node.js v22.23.1
npm 10.9.8
```

Falls Node.js noch nicht installiert ist, kann Node.js 22 über die gewünschte System-/Node-Installationsmethode eingerichtet werden.

Nach der Installation erneut prüfen:

```bash
node --version
npm --version
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

# 6. SHACK-SERVER installieren

Repository klonen:

```bash
cd ~
git clone <REPOSITORY-URL> SHACK-SERVER
cd ~/SHACK-SERVER
```

Falls das Repository bereits vorhanden ist:

```bash
cd ~/SHACK-SERVER
git pull
```

---

# 7. Abhängigkeiten installieren

Im Projektverzeichnis:

```bash
cd ~/SHACK-SERVER
npm install
```

Danach sollte `node_modules` vorhanden sein.

---

# 8. Umgebungsvariablen (.env)

SHACK-SERVER verwendet eine `.env`-Datei für standortspezifische Einstellungen und Zugangsdaten.

Die Anwendung lädt `.env` über:

```typescript
import "dotenv/config";
```

in `src/app.ts`.

Die Datei wird deshalb nicht über PM2 konfiguriert.

Datei anlegen:

```bash
cd ~/SHACK-SERVER
nano .env
```

Beispielstruktur:

```env
# Operator
SHACK_CALLSIGN=HB9xxx

# QRZ
QRZ_USER=HB9xxx
QRZ_PASSWORD=xxxxxxxxxx


# DXSpider #1
DXSPIDER1_HOST=
DXSPIDER1_PORT=7300
DXSPIDER1_CALLSIGN=HB9xxx
DXSPIDER1_PASSWORD=


# DXSpider #2
DXSPIDER2_HOST=
DXSPIDER2_PORT=7300
DXSPIDER2_CALLSIGN=HB9xxx
DXSPIDER2_PASSWORD=


# HolyCluster
HOLYCLUSTER_HOST=
HOLYCLUSTER_PORT=7300
HOLYCLUSTER_CALLSIGN=HB9xxx
HOLYCLUSTER_PASSWORD=


# DX Summit
DXSUMMIT_HOST=www.dxsummit.fi
DXSUMMIT_ENABLED=true
```

Die oben gezeigten Werte sind nur Beispiele bzw. anonymisierte Werte.

Die tatsächlichen Werte müssen für den jeweiligen Standort eingesetzt werden.

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

# 9. .env nicht in Git übernehmen

`.env` darf nicht in das Repository eingecheckt werden.

`.gitignore` muss mindestens enthalten:

```gitignore
.env
.env.*
```

Prüfen:

```bash
grep -n "^\.env" .gitignore
```

---

# 10. Konfiguration prüfen

Aktuell existieren unter `src/config` unter anderem:

```text
src/config/location.config.ts
src/config/operator.config.ts
src/config/qrz.config.ts
src/config/settings.config.ts
```

Die standortspezifischen Werte müssen beim neuen Raspberry kontrolliert werden.

Besonders relevant sind:

- Callsign
- Operator
- Locator
- Shack-/Standortdaten
- DXSpider-Verbindungen
- QRZ-Zugangsdaten
- HolyCluster
- DX Summit

Die `.env` und die TypeScript-Konfiguration müssen zum installierten Stand des Projekts passen.

---

# 11. Build durchführen

Vor dem ersten Start:

```bash
cd ~/SHACK-SERVER
npm run build
```

Der Build führt unter anderem TypeScript-Kompilierung durch und kopiert die Weboberfläche nach `dist/public`.

Nach erfolgreichem Build muss das Verzeichnis `dist` vorhanden sein:

```bash
ls -la dist
```

---

# 12. SHACK-SERVER testweise starten

Vor der Einrichtung von PM2 kann der Server testweise direkt gestartet werden:

```bash
cd ~/SHACK-SERVER
node dist/index.js
```

Dabei sollte unter anderem der HTTP-Server starten.

Mit `Ctrl+C` wieder beenden.

---

# 13. SHACK-SERVER mit PM2 starten

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

---

# 14. PM2 dauerhaft aktivieren

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

# 15. HTTP-Port 3000 prüfen

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

# 16. Port 8000 prüfen

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

# 17. DXSpider-Verbindungen prüfen

Die konfigurierten externen DXSpider-Server müssen vom Raspberry aus erreichbar sein.

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

# 18. Logs prüfen

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

---

# 19. Diagnose-API

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

# 20. QRZ prüfen

QRZ benötigt gültige Zugangsdaten in `.env`:

```env
QRZ_USER=...
QRZ_PASSWORD=...
```

Die Anwendung lädt diese über `dotenv`.

Bei einem neuen Raspberry zuerst prüfen:

```bash
grep -n "QRZ" .env
```

Dabei niemals das Passwort in Logs oder Screenshots veröffentlichen.

Wenn QRZ nicht funktioniert, zunächst die PM2-Logs prüfen:

```bash
pm2 logs shack-server --lines 100 --nostream
```

Ein nicht bei QRZ vorhandenes Rufzeichen ist **kein Serverfehler**. Nicht jedes Rufzeichen muss bei QRZ vorhanden sein.

---

# 21. Firewall

Wenn `ufw` oder eine andere Firewall verwendet wird, müssen die benötigten Ports freigegeben werden.

Beispiel für UFW:

```bash
sudo ufw allow 3000/tcp
sudo ufw allow 8000/tcp
```

Danach:

```bash
sudo ufw status
```

Die ausgehenden Verbindungen zu den externen DX-Cluster-Servern müssen ebenfalls erlaubt sein.

---

# 22. Neustart-Test

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

---

# 23. Abschluss-Checkliste

| Prüfung | Kommando |
|---|---|
| Debian | `cat /etc/os-release` |
| Architektur | `uname -m` |
| Node.js | `node --version` |
| npm | `npm --version` |
| PM2 | `pm2 --version` |
| Build | `npm run build` |
| PM2 | `pm2 status` |
| HTTP 3000 | `ss -lntp \| grep ':3000'` |
| Telnet 8000 | `ss -lntp \| grep ':8000'` |
| API | `curl -s http://localhost:3000/api/diagnostics` |
| Logs | `pm2 logs shack-server --lines 50 --nostream` |
| Autostart | `pm2 save` / Neustart testen |
| DXSpider | `nc -vz <host> <port>` |

---

# 24. Referenzsystem

Der derzeit funktionierende SHACK-SERVER läuft auf:

```text
OS:       Debian GNU/Linux 13 (Trixie)
Arch:     aarch64
Node:     v22.23.1
npm:      10.9.8
PM2:      7.0.3

Projekt:
~/SHACK-SERVER

HTTP:
TCP/3000

DX Cluster Telnet:
TCP/8000

PM2 Script:
~/SHACK-SERVER/dist/index.js
```

Die Konfigurationsdatei `.env` enthält standortspezifische und vertrauliche Daten und wird **nicht** ins Repository übernommen.

---

# 25. Update einer bestehenden Installation

Projekt aktualisieren:

```bash
cd ~/SHACK-SERVER
git pull
```

Abhängigkeiten aktualisieren:

```bash
npm install
```

Neu bauen:

```bash
npm run build
```

Server neu starten:

```bash
pm2 restart shack-server
```

Status prüfen:

```bash
pm2 status
```

Diagnose prüfen:

```bash
curl -s http://localhost:3000/api/diagnostics
```

Logs:

```bash
pm2 logs shack-server --lines 50 --nostream
```

---

# 26. Wichtige Hinweise

- `.env` enthält vertrauliche Daten und darf nicht veröffentlicht werden.
- QRZ-Benutzerdaten gehören ausschließlich in `.env`.
- Die anonymisierten Werte in dieser Dokumentation sind durch die tatsächlichen Werte des jeweiligen Standorts zu ersetzen.
- Port 3000 ist die Web-/API-Schnittstelle.
- Port 8000 ist der integrierte DX-Cluster-Telnet-Server.
- Externe DXSpider-Verbindungen verwenden die jeweils konfigurierte Zieladresse und den konfigurierten Zielport.
- Nach Änderungen an TypeScript-Dateien ist `npm run build` erforderlich.
- Nach einem neuen Build muss der laufende PM2-Prozess neu gestartet werden.


## Node.js 22 installieren

Der SHACK-SERVER benötigt Node.js 22 oder neuer. Auf Debian 13 ARM64 wird Node.js 22 über NodeSource installiert.

### 1. System aktualisieren und curl installieren

```bash
sudo apt update
sudo apt install -y curl
```

### 2. NodeSource für Node.js 22 einrichten

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
```

### 3. Node.js installieren

```bash
sudo apt install -y nodejs
```

### 4. Installation prüfen

```bash
node --version
npm --version
```

Es sollte eine Node.js-Version `v22.x.x` angezeigt werden.

Der SHACK-SERVER definiert in `package.json`:

```json
"engines": {
  "node": ">=22"
}
```

### 5. PM2 installieren

Nach Node.js wird PM2 global installiert:

```bash
sudo npm install -g pm2
```

Prüfen:

```bash
pm2 --version
```

## Voraussetzungen

### Empfohlenes Betriebssystem

Für den SHACK-SERVER wird **Raspberry Pi OS Lite (64-bit)** empfohlen.

Eine grafische Oberfläche wird nicht benötigt. Der SHACK-SERVER läuft als Serverdienst und wird über das Netzwerk bzw. einen Webbrowser administriert. Dadurch ist die Lite-Version besonders geeignet, da sie weniger Ressourcen benötigt und keine unnötigen Desktop-Komponenten installiert.

**Empfehlung:**
- Raspberry Pi OS Lite (64-bit)
- keine Desktop-/GUI-Installation erforderlich
- Netzwerkverbindung zum Raspberry Pi
- SSH-Zugriff für die Installation und Administration

