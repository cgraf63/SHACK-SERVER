# TX-5DR Installation auf dem SHACK-SERVER

## Übersicht

TX-5DR wurde auf dem SHACK-SERVER als Docker-Anwendung installiert und betrieben. Die Anwendung befindet sich unter:

```text
/home/admin/tx5dr/app
```

Die Weboberfläche läuft auf Port:

```text
8076
```

Lokal:

```text
http://127.0.0.1:8076/
```

Im LAN beispielsweise:

```text
http://192.168.1.128:8076/
```

---

# 1. Voraussetzungen

Benötigt werden für den Betrieb:

- Linux / Raspberry Pi OS
- Docker Engine
- Docker Compose
- Git bzw. die TX-5DR-Quellen

Prüfen:

```bash
docker --version
docker compose version
```

Node.js und npm werden nur benötigt, wenn TX-5DR außerhalb des Containers gebaut, entwickelt oder die Quellen angepasst werden. Der normale Betrieb erfolgt über Docker.

---

# 2. Installationsverzeichnis

```bash
cd /home/admin/tx5dr/app
```

Die Installation enthält mehrere Packages:

```text
packages/
├── server
├── web
├── core
├── plugin-api
├── builtin-plugins
├── contracts
├── shared-config
├── electron-main
├── electron-preload
└── rigctld-server
```

---

# 3. Docker-Installation und Container

Die TX-5DR-Quellen befinden sich auf dem Host unter:

```text
/home/admin/tx5dr/app
```

Der eigentliche Betrieb erfolgt jedoch in Docker-Containern.

Zuerst in das TX-5DR-Verzeichnis wechseln:

```bash
cd /home/admin/tx5dr/app
```

Die vorhandene Docker-/Compose-Konfiguration prüfen:

```bash
find . -maxdepth 2 \
    \( \
    -name "docker-compose*.yml" -o \
    -name "docker-compose*.yaml" -o \
    -name "compose.yml" -o \
    -name "compose.yaml" -o \
    -name "Dockerfile*" \
    \) -print
```

Laufende TX-5DR-Container anzeigen:

```bash
docker ps
```

Alle Container, auch gestoppte:

```bash
docker ps -a
```

Falls eine Compose-Datei im Verzeichnis vorhanden ist, Status prüfen:

```bash
docker compose ps
```

Logs:

```bash
docker compose logs --tail 100
```

Live-Logs:

```bash
docker compose logs -f
```

Der genaue Service-Name wird mit `docker compose ps` ermittelt.

---

# 4. Konfiguration und Daten

Die persistierten TX-5DR-Daten befinden sich gemäß der aktuellen Installation unter:

```text
/home/admin/tx5dr/app/data/
```

Dieses Verzeichnis ist für die Docker-Installation wichtig, damit Konfiguration und Token außerhalb des flüchtigen Container-Dateisystems erhalten bleiben.

Der Admin-Token liegt unter:

```text
/home/admin/tx5dr/app/data/config/.admin-token
```

Prüfen:

```bash
cat /home/admin/tx5dr/app/data/config/.admin-token
```

Der Token sollte nicht öffentlich weitergegeben werden.

---

# 5. Start und Kontrolle

Ins Application-Verzeichnis wechseln:

```bash
cd /home/admin/tx5dr/app
```

Docker-Compose-Stack starten:

```bash
docker compose up -d
```

Status prüfen:

```bash
docker compose ps
```

Stack stoppen:

```bash
docker compose down
```

Nach Änderungen an Image oder Build-Konfiguration kann ein Neubau erforderlich sein:

```bash
docker compose up -d --build
```

Hinweis: Diese Befehle setzen voraus, dass die Compose-Datei im aktuellen Verzeichnis bzw. über die Docker-Compose-Konfiguration erreichbar ist.

Prüfen, ob Port `8076` aktiv ist:

```bash
ss -tulpn | grep 8076
```

HTTP-Test:

```bash
curl http://127.0.0.1:8076/
```

---

# 5a. Docker-Diagnose

Container und verwendete Images:

```bash
docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}"
```

Compose-Konfiguration anzeigen:

```bash
cd /home/admin/tx5dr/app
docker compose config
```

Umgebungsvariablen und Volume-Mounts eines Containers prüfen:

```bash
docker inspect <CONTAINER-NAME>
```

Gezielt nach Port `8076` suchen:

```bash
docker ps --format "table {{.Names}}\t{{.Ports}}" | grep 8076
```

Logs eines einzelnen Containers:

```bash
docker logs --tail 100 <CONTAINER-NAME>
```

Live:

```bash
docker logs -f <CONTAINER-NAME>
```

---

# 6. Weboberfläche

Lokal:

```text
http://127.0.0.1:8076/
```

Im LAN:

```text
http://<IP-DES-SHACK-SERVERS>:8076/
```

Aktuelles Beispiel:

```text
http://192.168.1.128:8076/
```

Bei einer Installation auf einem anderen Raspberry Pi ändert sich nur die IP-Adresse. Der Port bleibt:

```text
8076
```

---

# 7. HTTP-Authentifizierung

TX-5DR stellt folgenden Login-Endpunkt bereit:

```text
POST /api/auth/login
```

Der Admin-Token wird verwendet, um ein JWT zu erhalten.

Beispiel:

```bash
TOKEN=$(cat /home/admin/tx5dr/app/data/config/.admin-token)

curl   -X POST   http://127.0.0.1:8076/api/auth/login   -H "Content-Type: application/json"   -d "{"token":"$TOKEN"}"
```

Bei erfolgreicher Anmeldung liefert TX-5DR ein JWT zurück.

---

# 8. WebSocket-Schnittstelle

Die WebSocket-Adresse lautet:

```text
ws://127.0.0.1:8076/api/ws
```

Der Ablauf ist:

```text
Client
  │
  ▼
WebSocket verbinden
  │
  ▼
authRequired
  │
  ▼
authToken + JWT
  │
  ▼
authResult
  │
  ▼
clientHandshake
  │
  ▼
serverHandshakeComplete
  │
  ▼
slotPackUpdated
```

---

# 9. Testprogramm

Für die Integration wurde ein Testprogramm verwendet:

```text
test-tx5dr-ws.js
```

Das Programm:

1. liest den Admin-Token
2. fordert ein JWT über `/api/auth/login` an
3. verbindet sich mit `/api/ws`
4. wartet auf `authRequired`
5. sendet `authToken`
6. prüft `authResult`
7. sendet `clientHandshake`
8. wartet auf `serverHandshakeComplete`
9. empfängt FT8-Daten über `slotPackUpdated`

Damit wurde die TX-5DR-WebSocket-Integration erfolgreich getestet.

---

# 10. Integration mit dem SHACK-SERVER

Der SHACK-SERVER läuft auf:

```text
http://127.0.0.1:3000
```

TX-5DR läuft auf:

```text
http://127.0.0.1:8076
```

Der SHACK-SERVER enthält:

```text
src/services/ft8/tx5dr.service.ts
```

Die kompilierte Version:

```text
dist/services/ft8/tx5dr.service.js
```

Der Service:

- verbindet sich mit TX-5DR
- fordert ein JWT an
- authentifiziert sich per WebSocket
- führt den Client-Handshake durch
- empfängt `slotPackUpdated`
- speichert die aktuellen FT8-Decodes im Speicher

---

# 11. FT8-API im SHACK-SERVER

Status:

```bash
curl -s http://127.0.0.1:3000/api/ft8/status
```

Beispiel:

```json
{
  "connected": true,
  "authenticated": true,
  "handshakeComplete": true,
  "frameCount": 16
}
```

Aktuelle Decodes:

```bash
curl -s http://127.0.0.1:3000/api/ft8/decodes
```

---

# 12. PM2-Logs

Nur TX5DR-Meldungen anzeigen:

```bash
pm2 logs shack-server   --lines 100   --nostream   | grep "TX5DR"
```

Live:

```bash
pm2 logs shack-server   | grep --line-buffered "TX5DR"
```

Typische erfolgreiche Meldungen:

```text
[TX5DR] Connecting to TX-5DR...
[TX5DR] WebSocket connected
[TX5DR] Authentication required
[TX5DR] JWT length: 271
[TX5DR] TX: authToken
[TX5DR] Authentication successful
[TX5DR] Handshake complete
```

---

# 13. FT8-Anzeige

Die Browser-Anzeige verwendet:

```text
src/public/js/ft8.js
```

Die Daten werden über:

```text
/api/ft8/decodes
```

geladen.

Der Status kommt von:

```text
/api/ft8/status
```

In der Sidebar sind:

```text
FT8
TX5-DR
```

Der Eintrag `TX5-DR` führt zur TX-5DR-Weboberfläche.

---

# 14. Plugin-System

TX-5DR enthält ein eigenes Plugin-System.

Relevante Verzeichnisse:

```text
packages/plugin-api
packages/builtin-plugins
packages/server/src/plugin
/home/admin/tx5dr/data/plugins
```

Für die spätere Logbuch-Integration ist insbesondere folgender Hook vorhanden:

```ts
onQSOComplete(
    record: QSORecord,
    ctx: PluginContextFor<Permissions>
)
```

Dieser Hook wird ausgelöst, nachdem ein QSO erfolgreich abgeschlossen und gespeichert wurde.

Geplante Architektur:

```text
TX-5DR
   │
   │ onQSOComplete(record)
   ▼
TX-5DR Plugin
   │
   │ HTTP POST
   ▼
SHACK-SERVER
   │
   ▼
Zentrales QSO-Log
```

Damit soll künftig kein manueller ADIF-Export zwischen TX-5DR und dem zentralen SHACK-SERVER-Logbuch erforderlich sein.

---

# 15. Wichtige Pfade

| Zweck | Pfad |
|---|---|
| TX-5DR Host-/Quellverzeichnis | `/home/admin/tx5dr/app` |
| TX-5DR persistente Daten | `/home/admin/tx5dr/app/data` |
| Admin-Token | `/home/admin/tx5dr/app/data/config/.admin-token` |
| Plugin-Daten | `/home/admin/tx5dr/data/plugins` |
| SHACK-SERVER | `/home/admin/SHACK-SERVER` |
| FT8-Service | `src/services/ft8/tx5dr.service.ts` |
| FT8 Frontend | `src/public/js/ft8.js` |

---

# 16. Ports

| Dienst | Port |
|---|---:|
| SHACK-SERVER | `3000` |
| TX-5DR | `8076` |

---

# 17. Aktueller Status

Die Integration funktioniert aktuell erfolgreich:

- TX-5DR läuft containerisiert unter Docker
- HTTP-Zugriff auf TX-5DR
- JWT-Authentifizierung
- WebSocket-Verbindung
- Client-Handshake
- Empfang von FT8 `slotPackUpdated`
- Bereitstellung über `/api/ft8/decodes`
- Status über `/api/ft8/status`
- Anzeige der FT8-Decodes im SHACK-SERVER

## Nächster Schritt

Ein TX-5DR-Plugin soll den Hook:

```text
onQSOComplete
```

verwenden und abgeschlossene FT8-QSOs direkt an das zentrale SHACK-SERVER-Logbuch übertragen.
