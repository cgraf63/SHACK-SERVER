CTR2-MIDI Integration

Overview

SHACK-SERVER supports the Lynovation CTR2-MIDI controller through the browser using WebHID.

The CTR2-MIDI is connected by USB to the computer or tablet running the SHACK-SERVER Remote interface. It does not need to be connected directly to the Raspberry Pi.

CTR2-MIDI
    │
    │ USB
    ▼
Browser / remote.html
    │
    │ WebHID
    ▼
SHACK-SERVER
    │
    │ CAT
    ▼
FTDX10

Requirements

CTR2-MIDI connected via USB

Browser with WebHID support

SHACK-SERVER Remote accessed via HTTPS

CTR2 firmware compatible with the current WebHID implementation

Expected USB device:

Device: XIAO_ESP32S3

VID: 0x2886

PID: 0x0056

VFO Encoder

The main CTR2 encoder is used to change the frequency of the active VFO.

The encoder generates HID reports which are interpreted by the Remote interface.

Current frequency step:

10 Hz per encoder click

Clockwise:

b0 64 41 00 00 00 00 00

Counter-clockwise:

b0 64 3f 00 00 00 00 00

The active VFO (A or B) is handled by SHACK-SERVER. The resulting frequency change is sent to the radio through the existing CAT interface.

Why HTTPS is required

WebHID is a browser security feature and requires a secure context.

Therefore the Remote interface should be accessed using HTTPS, for example:

https://192.168.1.128/remote.html

Caddy provides the HTTPS endpoint for SHACK-SERVER.

Data flow

CTR2 encoder
    ↓
USB HID report
    ↓
Browser WebHID
    ↓
Remote JavaScript
    ↓
/api/radio/frequency
    ↓
SHACK-SERVER radio manager
    ↓
FTDX10 CAT

The CTR2 therefore acts as a browser-side control device. SHACK-SERVER remains responsible for selecting the active VFO and communicating with the FTDX10.
