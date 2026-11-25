# Changelog

What changed in SHACK-SERVER, written for the operator. Only milestone
versions are listed; the automatic versions in between (1.4.1, 1.4.2 …)
are collected in the next milestone. Update: **Settings → Software update**,
then reload the page with **Ctrl+F5**.

## 1.4.0 – 2026-11-25

### New

- **QRP Labs QMX / QMX+**: full CAT control and a remote page in the style of
  the yellow QMX display, with VFO knob, band versions (80–20, 60–15,
  20–10 incl. 11 m, QMX+ 160–6, detected automatically) and support for
  older firmware.
- **RGO ONE**: every control of the remote page works – power, RF / mic gain,
  preamp, ATT, NB, AGC, break-in, internal ATU, meter (S / PWR / ALC / SWR /
  COMP), split, DIG, VFO knob with tuning steps, RX audio in the browser and
  CTR2-MIDI. The waterfall works on an antenna or on the 9 MHz IF output.
- **CW decoder and CW encoder** at the bottom of the dashboard and in the
  contest console (switched on separately in Settings): decodes the RX audio
  of the transceiver, sends typed text and macros (CQ, MY, 5NN, TU) as CW.
  A click on a decoded callsign puts it into Manual QSO or the contest entry.
- **Call check while typing** in the contest console and in Manual QSO
  (SCP database, "?" for unknown characters). In an empty field it shows who
  is on the air near your frequency; picking a station tunes the transceiver.
  Esc clears the field.
- **Best Opportunity** is now a real suggestion: a needed station that is
  workable right now, with the reason (new DXCC, new band, near you); a click
  tunes the transceiver.
- **Settings in tabs**: Station, Spots & DX, Operating, Log, System.
- **Version numbers** in Software update and on the About page.
- **RBN page** redesigned: summary (skimmers, best signal, farthest skimmer,
  last report) and one line per skimmer with a signal bar, sortable, per band;
  the map works, the country appears on mouse-over of the flag.
- **Setting for an external tuner** (FTDX10): no internal tuner start before
  CW text.
- **Raspberry Pi Zero 2 W** supported: swap file on small Pis, SDR switched
  off below 768 MB RAM.
- **Quick start** on one A4 page (DE / EN) for the installation from the image.

### Improved

- **Manual QSO** follows the transceiver: band, mode and frequency update on
  every change of the radio and every spot click.
- **Live spots**: as many rows as fit in the window, a scroll bar whose
  handle shows how much of the list you see, a working search field, all
  sources on mouse-over of the SOURCE column.
- **Needed callsigns**: flags, VIEW / LOG buttons, and the whole list of the
  last 3 hours with ▲ ▼ (also with the mouse wheel).
- **DX CLUSTER** card (formerly Cluster connections): ▲ ▼ for more than 5
  clusters.
- **Band conditions** as a curve: one point per band, green / yellow / red.
- **Propagation bar** with one font style for titles and values.
- **Worked colours**: station worked = yellow, country + band = orange.
- **Flags and countries** come from the DXCC entity (e.g. Puerto Rico,
  Guinea); distance and azimuth work without a QRZ account.
- **Sidebar** the same on every page (Bandplan works everywhere), now also on
  the RBN page.
- **CW decoder** is on STOP after a start of SHACK-SERVER and ignores receiver
  noise (no more strings of E and T).

### Fixed

- A spot from England, Scotland, Wales or Northern Ireland emptied the live
  spot table.
- DISCONNECT on the SDR page did not stop the SDR when another page was
  still open (100 % CPU); dead browser connections are now dropped.
- FTDX10: the tuner check before CW text did not really ask the radio, and
  "tuner on" was misread.
- CW memory keys: "Tuning failed" when the CAT connection was actually closed
  – now the message says so.
- Setup hotspot: the first connection showed an empty page (Windows
  "msftconnecttest").
- RGO ONE: tuner and TX state were read from the wrong digits.

## 1.0.0

First release with the ready-made Raspberry Pi image.
