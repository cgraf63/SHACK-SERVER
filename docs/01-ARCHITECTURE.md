"The SHACK-SERVER Core has no knowledge of amateur radio sources. It only processes events and standardized objects."# SHACK-SERVER Architecture
"DX Intelligence CORE"

Version: 0.1

---

# 1. Goal

SHACK-SERVER is an Amateur Radio Information Platform.

It collects information from multiple sources, normalizes the data,
combines duplicate information, evaluates relevance and presents the
results in a modern web interface.

The software is NOT a DX Cluster client.

It is an information processing platform.


"The SHACK-SERVER Core has no knowledge of amateur radio sources. It only processes events and standardized objects."
---

# 2. Layers

                           Sources
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
     HB9ON              Holy Cluster          DX Summit
        │                     │                     │
        └─────────────── Collectors ────────────────┘
                              │
                         Raw Spot Event
                              │
                         Event Bus
                              │
                         Normalizer
                              │
                           Spot Event
                              │
        ┌───────────────┬───────────────┬───────────────┐
        │               │               │
 Duplicate Engine   Rule Engine   History Engine
        │               │               │
        └───────────────┴───────────────┘
                              │
                        Spot Manager
                              │
                    ┌─────────┴─────────┐
                    │                   │
                 SQLite            WebSocket
                    │                   │
                    └─────────┬─────────┘
                              │
                         Dashboard


VERZEICHNISSTRUKTUR

backend/

core/
    event_bus.py
    scheduler.py
    config.py

collectors/
    hb9on/
    holycluster/
    dxsummit/

models/
    source.py
    rawspot.py
    spot.py
    rule.py
    profile.py
    event.py

engines/
    normalizer.py
    fusion.py
    rule_engine.py
    score_engine.py
    confidence_engine.py

services/
    source_manager.py
    spot_manager.py

api/
database/


---

# 3. Sources

Internet

- HB9ON
- Holy Cluster
- DX Summit

Local

- Yaesu FTDX10
- Yaesu FTX-1
- RGO ONE

Future

- RBN
- POTA
- SOTA
- LoTW

---

# 4. Internal Data Model

Every source produces the same object.

Spot

Source

Rule

Profile

---

# 5. Design Principles

Source independent

Event driven

Plugin based

Explainable

Modular

Testable
