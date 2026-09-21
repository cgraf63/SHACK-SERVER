# SHACK-SERVER – SDRPlay RSP1B Anbindung

## 1. Zweck

Der **SDRPlay RSP1B** wird im SHACK-SERVER als separater SDR für die
Spektrum- und Wasserfallanzeige des Yaesu FTDX10 verwendet.

Der SDR ist unabhängig vom CAT-Anschluss des FTDX10. Die FTDX10-Frequenz
bestimmt, welcher Bereich des vom RSP1B gelieferten FFT-Spektrums im
Webinterface angezeigt wird.

## 2. Datenfluss

``` text
SDRPlay RSP1B
      │
      │ FFT-Daten
      ▼
SDR-WebSocket im SHACK-SERVER
      │
      │ binäre FFT-Frames
      ▼
remote.js
      │
      ├── Spectrum
      └── Waterfall
```

Die FFT-Daten werden im Browser verarbeitet und direkt auf HTML-Canvas
dargestellt.

## 3. FFT-Datenformat

Ein FFT-Frame wird im Browser als `DataView` verarbeitet:

| Offset | Typ          | Bedeutung         |
|-------:|--------------|-------------------|
|      0 | `uint16` LE  | Anzahl FFT-Bins   |
|      2 | `float32` LE | dB-Wert von Bin 0 |
|      6 | `float32` LE | dB-Wert von Bin 1 |
|      … | `float32` LE | weitere FFT-Bins  |

Framegröße:

``` text
2 + (Anzahl Bins × 4) Bytes
```

## 4. FFT-Bandbreite

Der RSP1B liefert in der aktuellen Implementierung einen
**2-MHz-FFT-Bereich**.

Die Mittenfrequenz wird aus der aktuellen FTDX10-Frequenz abgeleitet:

``` text
FFT-Start = Mittenfrequenz - 1 MHz
FFT-Ende  = Mittenfrequenz + 1 MHz
```

Aus diesem Bereich wird der jeweils gewünschte Amateurfunkbereich
herausgeschnitten.

## 5. Automatische Bandumschaltung

| Band  | Anzeige           |
|-------|-------------------|
| 160 m | 1.810–2.000 MHz   |
| 80 m  | 3.500–3.800 MHz   |
| 60 m  | 5.3515–5.3665 MHz |
| 40 m  | 7.000–7.200 MHz   |
| 30 m  | 10.100–10.150 MHz |
| 20 m  | 14.000–14.350 MHz |
| 17 m  | 18.068–18.168 MHz |
| 15 m  | 21.000–21.450 MHz |
| 12 m  | 24.890–24.990 MHz |
| 10 m  | 28.000–29.700 MHz |
| 6 m   | 50.000–52.000 MHz |

Die aktuelle FTDX10-Frequenz bestimmt automatisch das angezeigte Band.

## 6. Spectrum

Das Spectrum verwendet:

- festen Pegelbereich von **−120 bis −40 dB**
- Mittelwertbildung mehrerer FFT-Frames
- zusätzliche Display-Glättung
- horizontales Referenzraster
- automatische Bandbegrenzung
- CW/SSB-Trennlinie
- VFO-Frequenzmarker

Die Display-Glättung ist aktuell:

``` javascript
const SPECTRUM_SMOOTHING = 0.18;
```

## 7. Wasserfall

Der Wasserfall wird zeilenweise aufgebaut:

1.  Bestehender Inhalt wird um eine Pixelzeile nach unten verschoben.
2.  Der aktuelle FFT-Frame wird als neue oberste Zeile geschrieben.
3.  Jeder Pegel wird auf 0…1 normiert.
4.  Der Pegel wird in eine RGB-Farbe umgesetzt.

Der Kontrast wird dynamisch begrenzt:

``` javascript
const floor = Math.max(-120, maxDb - 65);
const range = Math.max(1, maxDb - floor);
```

## 8. Skins

### SHACK-SERVER

- Cyan Spectrum-Linie
- blau/cyan-basierte SDR-Wasserfallpalette
- dunkler blauer Füllbereich

### GREY / ORANGE

- leuchtend orange Spectrum-Linie
- helles Anthrazit unter dem Spectrum
- orange/anthrazitfarbener Wasserfall
- orange CW/SSB-Markierung
- dunkler Canvas-Hintergrund

Der Skin wird über

``` javascript
document.documentElement.dataset.skin
```

bestimmt und per `localStorage` gespeichert.

## 9. Relevante Dateien

Frontend:

``` text
src/public/remote.html
src/public/js/remote.js
src/public/css/remote.css
```

Die eigentliche Darstellung befindet sich in:

``` javascript
drawSpectrum(data)
drawWaterfall(data)
```

Der SDR-WebSocket wird beim Serverstart über

``` typescript
startSdrWebSocket(server);
```

aktiviert.

## 10. Verhältnis zum FTDX10

Der RSP1B ist **nicht** der CAT-Anschluss des FTDX10.

Der FTDX10 liefert über CAT die aktuelle Frequenz. Diese Frequenz wird
verwendet, um den relevanten Ausschnitt der RSP1B-FFT auszuwählen.

``` text
FTDX10 CAT
   │
   └── aktuelle Frequenz
             │
             ▼
       Bandauswahl
             │
             ▼
RSP1B 2-MHz-FFT ───► Spectrum / Waterfall
```

## 11. Fehleranalyse

### Spectrum und Wasserfall leer

Prüfen:

1.  SDR-WebSocket-Verbindung
2.  Empfang binärer FFT-Frames
3.  gültige Bin-Anzahl
4.  gültige `float32`-Pegelwerte
5.  gültige FTDX10-Frequenz

### Wasserfall ohne erkennbare Signale

Mögliche Ursachen:

- zu geringer Empfangspegel
- Antenne bzw. HF-Umgebung
- falsche SDR-Mittenfrequenz
- SDR-Dynamik bzw. Pegelbereich
- lokale Störungen

### Falscher Frequenzbereich

Die Bandauswahl basiert auf der aktuellen FTDX10-Frequenz. Daher zuerst
die CAT-Frequenz prüfen.

## 12. Aktueller Stand

Die RSP1B-Anbindung bietet:

- Live-Spectrum
- Live-Wasserfall
- automatische Bandumschaltung
- 2-MHz-FFT-Auswertung
- FTDX10-VFO-Frequenzbezug
- CW/SSB-Markierungen
- VFO-Frequenzmarker
- zwei visuelle Skins

Die SDR-Datenverarbeitung bleibt unabhängig von der visuellen
Skin-Auswahl.
