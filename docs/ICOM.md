# Icom CI-V Integration

## Status

Die Datei `src/services/radio/icom.service.ts` ist als Vorbereitung für eine spätere Icom-Integration vorhanden.

Aktuell ist die CI-V-Protokollstruktur vorbereitet, aber es findet noch keine echte Kommunikation mit einem Transceiver statt.

---

## Aktuell vorbereitet

Die `IcomService`-Klasse unterstützt bereits:

- Speicherung der Frequenz
- Speicherung des Betriebsmodus
- Speicherung der Leistung
- Aufbau von CI-V Frames
- Frequenz-Codierung in BCD
- Decodierung von CI-V Frequenzantworten
- Vorbereitung für eingehende CI-V Frames
- Setzen der Frequenz
- Setzen des Betriebsmodus
- konfigurierbare CI-V-Adresse

Die Klasse implementiert weiterhin `RadioService` und kann deshalb später wie die anderen Radios in den SHACK-SERVER integriert werden.

---

# CI-V Frame

Ein Icom CI-V Telegramm hat grundsätzlich folgenden Aufbau:

```text
FE FE
DESTINATION
SOURCE
COMMAND
DATA ...
FD
```

Beispiel:

```text
FE FE 94 E0 05 ... FD
```

| Feld | Bedeutung |
|---|---|
| `FE FE` | Start |
| `94` | CI-V-Adresse des Radios |
| `E0` | Computer / Controller |
| `05` | CI-V Command |
| `...` | optionale Daten |
| `FD` | Ende des Telegramms |

Die CI-V-Adresse des Radios muss später abhängig vom verwendeten Icom-Modell eingestellt werden.

---

# Aktuelle Implementierung

Die Datei verwendet aktuell:

```ts
private readonly controllerAddress =
    0xE0;
```

Die Radio-Adresse wird im Konstruktor gesetzt:

```ts
constructor(
    private device: string,
    private baudRate: number,
    civAddress = 0x94
)
```

`0x94` ist aktuell nur ein Platzhalter bzw. Defaultwert.

---

# Frequenz

## Frequenz setzen

Die vorbereitete Implementierung verwendet:

```text
Command 05
```

Die Frequenz wird in CI-V BCD codiert.

Beispiel:

```text
144088000 Hz
```

wird vor dem Senden in die entsprechende BCD-Darstellung umgewandelt.

Die Funktion:

```ts
setFrequency(
    frequency: number
)
```

erstellt bereits das CI-V Frame.

Aktuell wird dieses nur im Log ausgegeben.

---

# Betriebsart

Folgende Modes sind vorbereitet:

| Mode | CI-V Code |
|---|---|
| LSB | `00` |
| USB | `01` |
| AM | `02` |
| CW | `03` |
| RTTY | `04` |
| FM | `05` |
| WFM | `06` |
| CW-R | `07` |
| RTTY-R | `08` |
| DV | `17` |

Die Funktion:

```ts
setMode(
    mode,
    frequency
)
```

wandelt den Mode in einen CI-V Code um.

Bei:

```text
SSB
```

wird automatisch gewählt:

```text
unter 10 MHz  -> LSB
ab 10 MHz     -> USB
```

---

# Was noch fehlt

Für eine echte Verbindung mit einem Icom müssen später folgende Punkte ergänzt werden.

## 1. SerialPort

Analog zum Yaesu-Service muss eingebunden werden:

```ts
import {
    SerialPort
} from "serialport";
```

Dann wird ein Port erzeugt:

```ts
this.port =
    new SerialPort({

        path:
            this.device,

        baudRate:
            this.baudRate,

        autoOpen:
            false

    });
```

---

## 2. CI-V Daten senden

Aktuell macht:

```ts
sendFrame(
    frame
)
```

nur Logging.

Später:

```ts
this.port.write(
    Buffer.from(
        frame
    )
);
```

---

## 3. Eingehende Daten

Der SerialPort muss auf Daten reagieren:

```ts
this.port.on(
    "data",
    data => {

        // CI-V Daten sammeln
        // vollständige Frames erkennen
        // parseFrame() aufrufen

    }
);
```

Wichtig: Ein CI-V Telegramm kann in mehreren USB/Serial-Datenblöcken eintreffen.

Deshalb darf nicht davon ausgegangen werden, dass ein `data` Event genau einem CI-V Frame entspricht.

Es wird ein Buffer benötigt, der Daten sammelt, bis von:

```text
FE FE
```

bis:

```text
FD
```

ein vollständiges Frame vorhanden ist.

---

## 4. Radio abfragen

Später sollte der Service regelmässig den Radiozustand abfragen.

Vorgesehen sind mindestens:

- Frequenz
- Mode
- Leistung

Die Antworten werden über:

```ts
parseFrame()
```

verarbeitet.

---

# Leistung

Die Variable:

```ts
private power = 0;
```

ist bereits vorhanden.

Die konkrete CI-V-Abfrage und Umrechnung der Leistung muss später anhand des verwendeten Icom-Modells getestet werden.

Die Leistungsanzeige sollte deshalb erst nach einem Test mit einem echten Gerät implementiert werden.

---

# Empfohlene spätere Tests

Wenn ein Icom verfügbar ist:

1. CI-V-Adresse des Radios ermitteln.
2. Baudrate im Radio prüfen.
3. CI-V Transceive testen.
4. Verbindung über USB oder CI-V Interface herstellen.
5. Frequenz abfragen.
6. Frequenz setzen.
7. Mode abfragen.
8. Mode setzen.
9. Leistung abfragen.
10. Antworten verschiedener Icom-Modelle vergleichen.

---

# Ziel

Nach der Fertigstellung soll ein Icom Radio dieselbe Schnittstelle verwenden wie die anderen Radios:

```ts
getFrequency()

getMode()

getPower()

setFrequency()

setMode()
```

Dadurch muss der Rest des SHACK-SERVER nicht zwischen Yaesu und Icom unterscheiden.

Die radio-spezifischen Details bleiben innerhalb von:

`src/services/radio/icom.service.ts`
