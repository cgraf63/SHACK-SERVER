# SHACK-SERVER – Contest Operator Handbuch

## 1. Zweck

Dieses Handbuch beschreibt die Bedienung des Contest-Moduls von SHACK-SERVER aus Sicht des Operators.

Die Contest-Oberfläche ist für gemeinsame Contest-Sessions mit mehreren Operatoren und verteilten Stationen ausgelegt.

---

## 2. Contest-Oberfläche

Das Contest-Modul wird über `/contest` aufgerufen.

Die Navigation besteht aus:

- **CONSOLE** – eigentliche Contest-Bedienung
- **QSOs** – Übersicht der Contest-QSOs
- **SESSIONS** – Verwaltung und Übersicht der Contest-Sessions
- **UTC-Uhr** – aktuelle UTC-Zeit rechts in der Navigation

---

## 3. Contest Session

Eine Contest-Session ist die gemeinsame Arbeitsumgebung für einen Contest.

Sie enthält unter anderem:

- Contest
- Status
- Club
- Grid
- zugeordnete Operatoren
- Startzeit
- Contest-QSOs

### Session-Status

**READY**  
Session vorbereitet, aber noch nicht gestartet.

**RUNNING**  
Contest aktiv. QSOs können geloggt werden.

**PAUSED**  
Contest vorübergehend unterbrochen.

**FINISHED**  
Contest-Session beendet.

### Session-Steuerung

- **Start Contest** – Session starten
- **Pause** – laufende Session pausieren
- **Resume** – pausierte Session fortsetzen
- **Finish** – Session beenden

---

## 4. Active Operator

Im Bereich **ACTIVE OPERATOR** wird der Operator ausgewählt, der aktuell am Browser arbeitet.

Die Auswahl ist browserbezogen.

Das bedeutet:

- Mehrere Operatoren können gleichzeitig arbeiten.
- Jeder Browser kann einen anderen Operator auswählen.
- Alle Operatoren können dieselbe Contest-Session verwenden.
- Ein Operatorwechsel beendet die Session nicht.

### Operatorwechsel

1. Unter **ACTIVE OPERATOR** den eigenen Operator auswählen.
2. Band und Mode kontrollieren.
3. Weiterarbeiten.

Es ist kein Neustart der Session notwendig.

---

## 5. Contest Console

Die **CONSOLE** ist die eigentliche Arbeitsoberfläche während des Contests.

Der normale Ablauf ist:

1. Spot auswählen oder Callsign eingeben
2. Frequenz, Band und Mode kontrollieren
3. QRZ-Informationen prüfen
4. RST und Exchange erfassen
5. QSO loggen

---

## 6. Spots

Ein Spot enthält typischerweise:

- Callsign
- Frequenz
- Band
- Mode

### Spot anklicken

Beim Anklicken eines Spots werden automatisch übernommen:

- **CALLSIGN**
- **FREQUENCY**
- **BAND**
- **MODE**

Zusätzlich wird für das Callsign automatisch die QRZ-Abfrage gestartet.

---

## 7. Callsign

Das Feld **CALLSIGN** kann manuell ausgefüllt oder durch einen Spot übernommen werden.

Das Rufzeichen vor dem Loggen immer kontrollieren.

---

## 8. Frequency

**FREQUENCY** enthält die aktuelle QSO-Frequenz.

Bei einem Spot wird die Frequenz automatisch übernommen.

Die Frequenz wird in kHz dargestellt.

Vor dem Loggen kontrollieren.

---

## 9. Band

**BAND** enthält das verwendete Contest-Band.

Für CQ WW stehen zur Verfügung:

- 160 m
- 80 m
- 40 m
- 20 m
- 15 m
- 10 m

Bei einem Spot wird das Band automatisch übernommen.

---

## 10. Mode

**MODE** enthält die Betriebsart.

Für den CQ WW SSB Contest wird **SSB** verwendet.

Bei einem Spot wird die Mode automatisch übernommen, sofern sie einem verfügbaren Auswahlwert entspricht.

---

## 11. QRZ-Daten

Nach Eingabe bzw. Übernahme eines Callsigns wird eine QRZ-Abfrage ausgelöst.

Die Oberfläche kann folgende Informationen anzeigen:

- **NAME FROM QRZ**
- **COUNTRY**
- **LOCATOR**

Diese Informationen sind Hilfsinformationen. Der Operator bleibt für die korrekte Aufnahme des Contest-Austauschs verantwortlich.

---

## 12. RST

Es gibt zwei RST-Felder:

- **RST Sent**
- **RST Received**

Vor dem Loggen beide Werte kontrollieren.

---

## 13. Exchange

Der Bereich **EXCHANGE** enthält:

- **Exchange Sent**
- **Exchange Received**

Beim CQ WW DX Contest besteht der Austausch aus:

**RS + CQ Zone**

Es wird kein fortlaufendes Seriennummern-System verwendet.

Beispiel:

`59 14`

Die tatsächlich empfangene CQ Zone muss vom Operator korrekt aufgenommen werden.

---

## 14. QSO loggen

Vor dem Drücken von **LOG QSO** kontrollieren:

- Callsign
- Frequenz
- Band
- Mode
- RST
- Exchange
- Active Operator

Danach:

**LOG QSO**

---

## 15. Duplikate

Ein Callsign darf innerhalb einer Contest-Session auf demselben Band nicht mehrfach als neues Contest-QSO geloggt werden.

Die Duplikatprüfung basiert auf:

**Session + Callsign + Band**

Ein Callsign kann auf einem anderen Band erneut gearbeitet werden, sofern die Contest-Regeln dies erlauben.

---

## 16. Multi-Distributed Betrieb

Mehrere Operatoren bzw. Stationen können gleichzeitig innerhalb derselben Contest-Session arbeiten.

Wichtig:

- Jeder Browser verwendet seinen eigenen **ACTIVE OPERATOR**.
- Alle arbeiten mit derselben Contest-Session.
- Das Contest-Log ist gemeinsam.
- Ein Operatorwechsel beendet die Session nicht.

Die Contest-Software ersetzt nicht die organisatorische Koordination der verteilten Stationen.

Die Contest-Console darf nicht dazu verwendet werden, unzulässige QSOs über Chat, Nachrichten oder andere Internet-Kommunikation zu arrangieren oder zu bestätigen.

---

## 17. QSOs-Ansicht

Unter **QSOs** kann das Contest-Log kontrolliert werden.

Die Übersicht enthält unter anderem:

- UTC
- CALL
- BAND
- MODE
- RST S/R
- EXCHANGE
- OPERATOR
- STATION

Diese Ansicht eignet sich zur Kontrolle des laufenden Logs.

---

## 18. Sessions-Ansicht

Unter **SESSIONS** werden die vorhandenen Contest-Sessions angezeigt.

Die Übersicht enthält unter anderem:

- Status
- Contest
- Callsign
- Club
- Grid
- Operator
- Started
- Ended

---

## 19. Typischer QSO-Ablauf

### Mit Spot

1. Spot anklicken
2. Callsign wird übernommen
3. Frequenz wird übernommen
4. Band wird übernommen
5. Mode wird übernommen
6. QRZ-Daten werden geladen
7. Gegenstation arbeiten
8. RST und Exchange eintragen
9. Angaben kontrollieren
10. **LOG QSO**

### Manuell

1. Callsign eingeben
2. Frequenz kontrollieren/eingeben
3. Band kontrollieren
4. Mode kontrollieren
5. QRZ-Daten abwarten
6. RST und Exchange eintragen
7. Angaben kontrollieren
8. **LOG QSO**

---

## 20. Operator-Checkliste

Vor jedem QSO:

- [ ] Richtiger ACTIVE OPERATOR
- [ ] Richtige Station
- [ ] Richtige Frequenz
- [ ] Richtiges Band
- [ ] Richtige Mode
- [ ] Callsign korrekt
- [ ] RST korrekt
- [ ] Exchange korrekt
- [ ] Kein Duplikat auf diesem Band

Dann:

**LOG QSO**

---

## 21. Kurzreferenz

| Funktion | Bedienung |
|---|---|
| Operator auswählen | ACTIVE OPERATOR |
| Contest starten | Start Contest |
| Contest pausieren | Pause |
| Contest fortsetzen | Resume |
| Contest beenden | Finish |
| Spot übernehmen | Spot anklicken |
| Rufzeichen | CALLSIGN |
| Frequenz | FREQUENCY |
| Band | BAND |
| Mode | MODE |
| QRZ-Name | NAME FROM QRZ |
| Land | COUNTRY |
| Locator | LOCATOR |
| RST | RST Sent / Received |
| Contest-Austausch | Exchange Sent / Received |
| QSO speichern | LOG QSO |
| Log kontrollieren | QSOs |
| Sessions kontrollieren | SESSIONS |

---

## 22. Grundregel

**Spot → prüfen → arbeiten → Exchange aufnehmen → kontrollieren → LOG QSO**

Bei mehreren Operatoren:

**Eigener Browser → eigenen ACTIVE OPERATOR auswählen → gemeinsame Session weiterführen.**
