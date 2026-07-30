# SHACK-SERVER - DXSpider hinzufügen

## Operator konfigurieren

Datei:

src/config/operator.config.ts


Beispiel:

```typescript
export const operator: OperatorConfig = {
    callsign: "HB9ISO",
    name: "Christoph",
    club: "HB9OM"
};
# SHACK-SERVER - DXSpider hinzufügen

## Operator konfigurieren

Datei:

src/config/operator.config.ts


Beispiel:

```typescript
export const operator: OperatorConfig = {
    callsign: "HB9ISO",
    name: "Christoph",
    club: "HB9OM"
};

# SHACK-SERVER - DXSpider hinzufügen

## Operator konfigurieren

Datei:

src/config/operator.config.ts


Beispiel:

```typescript
export const operator: OperatorConfig = {
    callsign: "HB9ISO",
    name: "Christoph",
    club: "HB9OM"
};



Neue DXSpider Quelle hinzufügen

Datei:

src/services/sources/sources.config.ts

Neue Quelle in clusterSources[] ergänzen:

{
    name: "NEUER-SPIDER",

    type: "dxspider",

    host: "hostname.example.org",

    port: 8000,

    callsign: operator.callsign,

    password: "",

    enabled: true,

    reconnect: true,

    reconnectDelay: 30
}
Neue DXSpider Quelle hinzufügen

Datei:

src/services/sources/sources.config.ts

Neue Quelle in clusterSources[] ergänzen:

{
    name: "NEUER-SPIDER",

    type: "dxspider",

    host: "hostname.example.org",

    port: 8000,

    callsign: operator.callsign,

    password: "",

    enabled: true,

    reconnect: true,

    reconnectDelay: 30
}
Bedeutung der Felder
Feld	Bedeutung
name	Anzeige im Dashboard
type	muss dxspider sein
host	Adresse des DXSpider
port	normalerweise 8000
callsign	automatisch vom Operator
password	falls erforderlich
enabled	Quelle aktivieren/deaktivieren
reconnect	automatische Wiederverbindung
reconnectDelay	Zeit zwischen Verbindungsversuchen
Aktuelle DXSpider Quellen

HB9ON-8

host: spider.hb9on.net
port: 8000

HB9IAC-8

host: dxc.iapc.ch
port: 8000
Test nach Änderungen

Server starten:

npm run dev

API prüfen:

curl -s http://localhost:3000/api/spots

In den Daten sollte die neue Quelle erscheinen:

source: "NEUER-SPIDER"
Fehler suchen

DXSpider Meldungen:

npm run dev

Nach Meldungen suchen:

DXSpider started
DXSpider connected
DXSpider processed

Danach speichern:


CTRL + O
ENTER
CTRL + X


Dann:

```bash
git add docs/DXSPIDER_ADD.md
git commit -m "Add DXSpider administration guide"

Damit ist die Anleitung Teil des Projekts. 👍📡

Danach würde ich als nächstes noch einen kleinen Blick auf operator.config.ts werfen, ob wir HB9ISO bewusst lassen oder auf den Club-Call HB9OM umstellen wollen. Das sollte man nicht nebenbei ändern, weil es den Login bei den Clustern beeinflusst.
