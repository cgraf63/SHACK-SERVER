# SHACK-SERVER API Reference

**Version:** Current project documentation  
**Base URL:** `http://<server>:3000`  
**API Base Path:** `/api`

## 1. Overview

SHACK-SERVER provides HTTP APIs for radio control, DX spots, propagation, recommendations, station data, system status, diagnostics, network information, settings and QSO logging.

Unless otherwise stated, responses are JSON.

### Common status codes

| Status | Meaning |
|---|---|
| 200 | Successful request |
| 201 | Resource created |
| 400 | Invalid request |
| 404 | Resource not found |
| 500 | Internal server error |
| 503 | Service unavailable |

---

# 2. Radio API

## GET `/api/radio`

Returns the active radio and all configured radios.

```bash
curl -s http://localhost:3000/api/radio
```

Example:

```json
{
  "radio": "RGO ONE",
  "activeRadioId": "rgo-one",
  "frequency": 14074000,
  "mode": "CW",
  "power": 10,
  "connected": true,
  "radios": [
    {
      "id": "rgo-one",
      "name": "RGO ONE",
      "frequency": 14074000,
      "mode": "CW",
      "power": 10,
      "connected": true,
      "active": true
    }
  ]
}
```

A configured radio may be visible even if no CAT device is currently connected.

## POST `/api/radio/active`

Selects the active radio.

```bash
curl -X POST http://localhost:3000/api/radio/active \
  -H "Content-Type: application/json" \
  -d '{"radioId":"rgo-one"}'
```

Response:

```json
{
  "success": true,
  "activeRadioId": "rgo-one"
}
```

## POST `/api/radio/tune`

Tunes the active radio.

```bash
curl -X POST http://localhost:3000/api/radio/tune \
  -H "Content-Type: application/json" \
  -d '{"frequency":14074000,"mode":"CW"}'
```

Request fields:

| Field | Type | Required | Description |
|---|---|---|---|
| `frequency` | number | yes | Frequency in Hz |
| `mode` | string | yes | Operating mode |

Supported modes:

```text
LSB
USB
SSB
CW
CW-R
AM
FM
```

`SSB` is mapped as follows:

```text
below 10 MHz  -> LSB
10 MHz and up -> USB
```

Response:

```json
{
  "success": true,
  "radioId": "rgo-one",
  "frequency": 14074000,
  "mode": "CW"
}
```

---

# 3. Propagation API

## GET `/api/propagation`

```bash
curl -s http://localhost:3000/api/propagation
```

Example:

```json
{
  "solarFlux": 158,
  "aIndex": 12,
  "kIndex": 3,
  "muf": 21.5,
  "bands": [
    {
      "band": "6m",
      "score": 20,
      "condition": "Poor"
    },
    {
      "band": "10m",
      "score": 45,
      "condition": "Fair"
    },
    {
      "band": "15m",
      "score": 95,
      "condition": "Excellent"
    }
  ],
  "updated": "2026-08-26T18:03:26.578Z"
}
```

### Band object

| Field | Description |
|---|---|
| `band` | Amateur radio band |
| `score` | Propagation score, normally 0–100 |
| `condition` | Human-readable condition |

**Important:** `bands` is an array of objects, not an object indexed by band name.

---

# 4. Live Spots API

## GET `/api/spots`

```bash
curl -s http://localhost:3000/api/spots
```

Returns the normalized/fused DX spots used by the Live Spot Activity view.

Typical spot information can include:

```json
{
  "call": "HB9XYZ",
  "frequency": 14074,
  "band": "20m",
  "mode": "FT8",
  "country": "Switzerland",
  "source": "DX Summit",
  "age": 15
}
```

The exact spot model can contain additional source and enrichment fields.

---

# 5. Best Band API

## GET `/api/best-band`

```bash
curl -s http://localhost:3000/api/best-band
```

Returns the current band recommendation used by the dashboard.

---

# 6. Station API

## GET `/api/station`

```bash
curl -s http://localhost:3000/api/station
```

Returns station and operator information used by the dashboard and QSO functions.

---

# 7. System Status API

## GET `/api/system-status`

```bash
curl -s http://localhost:3000/api/system-status
```

Depending on the platform, the response includes information such as:

- CPU temperature
- memory
- disk usage
- network interfaces
- Docker status
- SQLite status

Example structure:

```json
{
  "temperature": 52.4,
  "disk": {},
  "docker": {},
  "sqlite": {}
}
```

---

# 8. Diagnostics API

## GET `/api/diagnostics`

```bash
curl -s http://localhost:3000/api/diagnostics
```

Provides diagnostic information including:

- DX source status
- fusion information
- geographic/statistical information
- system log entries

Useful for troubleshooting source connections and internal processing.

---

# 9. Network API

## GET `/api/network`

```bash
curl -s http://localhost:3000/api/network
```

Typical response:

```json
{
  "networkManager": "active",
  "hostname": "SHACK-SERVER",
  "active": {
    "device": "eth0",
    "connection": "Wired connection",
    "type": "ethernet",
    "state": "connected"
  },
  "address": "192.168.1.100",
  "gateway": "192.168.1.1",
  "dns": ["192.168.1.1"],
  "wifi": {
    "ssid": null,
    "bssid": null,
    "channel": null,
    "frequency": null,
    "signal": null,
    "security": null
  },
  "interfaces": []
}
```

WiFi information can include SSID, BSSID, channel, frequency, signal strength and security.

---

# 10. Settings API

The settings subsystem manages SHACK-SERVER configuration, including:

- DX source enable/disable state
- HolyCluster
- DX Summit
- DXSpider
- individual DXSpider servers
- station-specific settings

Settings changes can trigger source refresh/restart.

The exact request schema should be kept synchronized with the current `settings` route whenever new settings are added.

---

# 11. QSO API

Base path:

```text
/api/qso
```

## POST `/api/qso`

Creates a new QSO.

```bash
curl -X POST http://localhost:3000/api/qso \
  -H "Content-Type: application/json" \
  -d '{
    "qso_date":"2026-08-26",
    "time_on_utc":"18:30:00",
    "call":"HB9XYZ",
    "frequency":14074000,
    "band":"20m",
    "mode":"CW",
    "my_callsign":"HB9ABC",
    "my_grid":"JN36XX",
    "operator_name":"Operator"
  }'
```

Fields:

| Field | Required |
|---|---|
| `qso_date` | yes |
| `time_on_utc` | yes |
| `time_off_utc` | no |
| `call` | yes |
| `frequency` | yes |
| `band` | yes |
| `mode` | yes |
| `rst_sent` | no |
| `rst_rcvd` | no |
| `my_callsign` | yes |
| `my_grid` | yes |
| `operator_name` | yes |
| `name` | no |
| `country` | no |
| `dx_grid` | no |
| `itu_zone` | no |
| `cq_zone` | no |
| `notes` | no |
| `spot_source` | no |
| `spot_id` | no |

Success returns HTTP `201`.

## GET `/api/qso`

Returns the QSO log.

```bash
curl -s http://localhost:3000/api/qso
```

## GET `/api/qso/:id`

```bash
curl -s http://localhost:3000/api/qso/123
```

Success:

```json
{
  "success": true,
  "qso": {}
}
```

Errors:

```text
400 Invalid QSO ID
404 QSO not found
500 Failed to load QSO
```

## PUT `/api/qso/:id`

Updates a QSO.

```bash
curl -X PUT http://localhost:3000/api/qso/123 \
  -H "Content-Type: application/json" \
  -d '{"mode":"SSB","notes":"Updated QSO"}'
```

## DELETE `/api/qso/:id`

```bash
curl -X DELETE http://localhost:3000/api/qso/123
```

Response:

```json
{
  "success": true
}
```

---

# 12. QRZ Lookup API

## GET `/api/qso/qrz/:call`

```bash
curl -s http://localhost:3000/api/qso/qrz/HB9XYZ
```

Success:

```json
{
  "success": true,
  "qrz": {}
}
```

Errors:

```text
400 Invalid callsign
404 QRZ callsign not found
500 QRZ lookup failed
```

---

# 13. ADIF Import API

## POST `/api/qso/import-adif`

Imports QSO records from ADIF content.

```bash
curl -X POST http://localhost:3000/api/qso/import-adif \
  -H "Content-Type: application/json" \
  -d '{"adif":"<ADIF CONTENT>"}'
```

Typical result:

```json
{
  "success": true,
  "read": 100,
  "imported": 95,
  "duplicates": 5
}
```

---

# 14. Quick API Test

```bash
curl -s http://localhost:3000/api/radio
curl -s http://localhost:3000/api/propagation
curl -s http://localhost:3000/api/spots
curl -s http://localhost:3000/api/best-band
curl -s http://localhost:3000/api/station
curl -s http://localhost:3000/api/system-status
curl -s http://localhost:3000/api/diagnostics
curl -s http://localhost:3000/api/network
curl -s http://localhost:3000/api/qso
```

Pretty-print:

```bash
curl -s http://localhost:3000/api/radio | python3 -m json.tool
```

---

# 15. Radio Architecture

The radio abstraction is designed for multiple implementations:

```text
RGO ONE
YAESU
ICOM
```

Each radio configuration contains:

```text
id
name
protocol
device
baudRate
enabled
```

The frontend works against the generic Radio API rather than directly against a manufacturer-specific CAT implementation.

This allows active-radio selection and tuning to remain independent of the actual transceiver.

---

# 16. Development Rules

When adding a new API:

1. Add the route in `src/routes/`.
2. Mount it in `src/app.ts`.
3. Keep API endpoints below `/api`.
4. Validate request data.
5. Use meaningful HTTP status codes.
6. Return JSON.
7. Return predictable error objects.
8. Add a curl example here.
9. Update the endpoint overview.

---

# 17. Future Extensions

Recommended additions:

- OpenAPI 3.1 definition
- Swagger UI
- machine-readable JSON schemas
- WebSocket event documentation
- Telnet protocol documentation
- radio capability matrix
- complete settings request/response schema
- API authentication if remote access is expanded
