# Transceiver im SHACK-SERVER integrieren

## 1. Transceiver in der Konfiguration anlegen

**Datei:** `src/config/radios.config.ts`

Jeder Transceiver benötigt einen Eintrag in:

``` ts
export const radios: RadioConfig[] = [
```

Beispiel:

``` ts
{
    id: "ftx-1",
    name: "YAESU FTX-1",
    protocol: "yaesu",
    device: "",
    baudRate: 38400,
    enabled: true
}
```

### Bedeutung der Parameter

  Parameter    Bedeutung
  ------------ -----------------------------
  `id`         Eindeutige interne Kennung
  `name`       Anzeigename im Webinterface
  `protocol`   CAT-Protokoll bzw. Service
  `device`     Serielles Gerät für CAT
  `baudRate`   CAT-Baudrate
  `enabled`    Transceiver aktivieren

Unterstützte Protokolle sind aktuell:

``` ts
"rgo-one"
"yaesu"
"icom"
```

------------------------------------------------------------------------

## 2. Transceiver nur als UI-Kachel hinzufügen

Wenn ein Transceiver bereits im Interface erscheinen soll, aber CAT noch
nicht eingerichtet ist:

``` ts
{
    id: "ftx-1",
    name: "YAESU FTX-1",
    protocol: "yaesu",
    device: "",
    baudRate: 38400,
    enabled: true
}
```

Wichtig: `enabled: true` führt dazu, dass der Transceiver im Interface
erscheint.

Ein leeres:

``` ts
device: ""
```

bedeutet, dass noch kein CAT-Service gestartet wird.

Die Anzeige zeigt dann beispielsweise:

``` text
YAESU FTX-1  🔴 CAT
---.--- MHz · UNKNOWN · 0 W
```

------------------------------------------------------------------------

## 3. CAT-Verbindung aktivieren

Sobald der Transceiver über USB oder eine serielle Schnittstelle
erreichbar ist, wird das Gerät eingetragen:

``` ts
device: "/dev/serial/by-id/..."
```

Beispiel:

``` ts
{
    id: "rgo-one",
    name: "RGO ONE",
    protocol: "rgo-one",
    device: "/dev/serial/by-id/usb-STMicroelectronics_STM32_Virtual_ComPort_207335B95832-if00",
    baudRate: 9600,
    enabled: true
}
```

Danach wird der entsprechende Service durch den `RadioManager`
gestartet.

------------------------------------------------------------------------

## 4. Wie der richtige CAT-Service ausgewählt wird

**Datei:** `src/services/radio/radio-manager.ts`

Der `protocol`-Eintrag bestimmt, welcher Service verwendet wird:

``` ts
switch (config.protocol) {
    case "rgo-one":
        service = new RgoOneService(
            config.device,
            config.baudRate
        );
        break;

    case "yaesu":
        service = new YaesuService(
            config.device,
            config.baudRate
        );
        break;

    case "icom":
        service = new IcomService(
            config.device,
            config.baudRate
        );
        break;
}
```

### Bereits unterstütztes Protokoll

Beispielsweise ein weiterer Yaesu:

``` ts
protocol: "yaesu"
```

Dann kann der bestehende `YaesuService` verwendet werden.

### Neues Protokoll

Falls ein völlig neues CAT-Protokoll benötigt wird:

1.  Neuen Service erstellen: `src/services/radio/mein-radio.service.ts`
2.  `RadioService` implementieren.
3.  Neues Protokoll in `RadioConfig` ergänzen.
4.  `RadioManager` um den neuen Service erweitern.

------------------------------------------------------------------------

## 5. Aktuelle RadioService-Schnittstelle

Die Transceiver-Services folgen einer gemeinsamen Schnittstelle. Ein
Service muss mindestens Funktionen für folgende Bereiche bereitstellen:

``` text
start()
getFrequency()
getMode()
getPower()
setFrequency()
setMode()
```

Dadurch kann das Webinterface unabhängig vom tatsächlichen Transceiver
arbeiten.

------------------------------------------------------------------------

## 6. Transceiver im Webinterface

Die Station-Anzeige lädt:

``` text
/api/radio
```

Die Daten werden automatisch verarbeitet:

``` js
const radios = data.radios || [];
```

Anschließend wird für jeden Transceiver eine Karte erzeugt:

``` js
radios.forEach(
    radio => {
        // Transceiver-Kachel erzeugen
    }
);
```

Es ist deshalb **keine Änderung am JavaScript nötig**, wenn ein weiterer
Transceiver in `radios.config.ts` ergänzt wird.

------------------------------------------------------------------------

## 7. Aktuelles UI-Verhalten

Das Layout unterstützt dynamisch mehrere Transceiver.

Aktuell verwendet jede Kachel:

``` css
.station-inline-radio {
    flex: 1;
    min-width: 0;
}
```

Dadurch verteilt der Browser die verfügbare Breite automatisch auf alle
aktiven Transceiver.

Aktuell getestet:

``` text
RGO ONE        YAESU FTDX10        YAESU FTX-1
```

Jede Kachel besteht aus zwei Zeilen:

``` text
RGO ONE  🟢 CAT
21.358 MHz · USB · 0 W
```

Nicht verbundene Geräte:

``` text
YAESU FTX-1  🔴 CAT
---.--- MHz · UNKNOWN · 0 W
```

------------------------------------------------------------------------

## 8. Neuer Transceiver -- Kurzablauf

1.  Konfiguration in `src/config/radios.config.ts` ergänzen.
2.  Transceiver aktivieren:

``` ts
enabled: true
```

3.  Für reine UI-Anzeige:

``` ts
device: ""
```

4.  Für CAT-Anbindung:

``` ts
device: "/dev/serial/by-id/..."
```

5.  Passendes Protokoll wählen:

``` ts
protocol: "yaesu"
```

oder:

``` ts
protocol: "icom"
```

6.  Build und Neustart:

``` bash
cd ~/SHACK-SERVER
npm run build
pm2 restart shack-server
```

------------------------------------------------------------------------

## Aktuelle Architektur

``` text
radios.config.ts
        │
        ▼
    RadioManager
        │
        ├── RgoOneService
        ├── YaesuService
        └── IcomService
        │
        ▼
      /api/radio
        │
        ▼
   propagation.js
        │
        ▼
  Station-Kacheln
```

## Zusammenfassung

Neue Transceiver können zunächst ohne CAT als UI-Kachel hinzugefügt und
später unabhängig davon mit CAT-Funktionalität erweitert werden. Die
aktuelle Architektur trennt Konfiguration, Radio-Service, API und
Benutzeroberfläche sauber voneinander.
