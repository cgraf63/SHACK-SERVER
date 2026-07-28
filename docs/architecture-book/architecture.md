# SHACK-SERVER Architecture Book

Version: **1.1**

> This file contains the Architecture Book v1.1 created during the design phase.

## Table of Contents

1. Vision
2. Design Principles
3. High-Level Architecture
4. Core Components
5. Data Flow
6. Collector Subsystem
7. Fusion Engine
8. Rule Engine
9. Recommendation Model
10. Configuration System
11. Station Subsystem
12. Logging
13. Statistics
14. Web API
15. Web UI
16. Logbook
17. Synchronizers
18. Scheduler
19. Database Architecture
20. Security
21. Future Components
22. Architectural Decisions
23. Glossary
24. Conclusion

---

# Vision

SHACK-SERVER is the central backend of an amateur radio station. It collects,
normalizes, fuses and evaluates information from multiple sources and exposes
it through a unified API.

## Design Principles

- Raspberry Pi First
- Operator First
- Modular Architecture
- Event Driven
- Collector Independence
- Configuration over Code
- Evidence before Recommendation

## High-Level Processing

```text
Collectors
    ↓
Fusion
    ↓
Master Spot
    ↓
Rule Engine
    ↓
Recommendation
    ↓
API
    ↓
Clients
```

## Collector Subsystem

Supports:

- DXSpider (multi-host)
- HolyCluster
- DX Summit

Managed by the Collector Manager.

## Fusion

Collector events become immutable Evidence objects.

Evidence is merged into Master Spots.

The Rule Engine never evaluates raw collector events.

## Rule Engine

Rules evaluate Master Spots and create explainable recommendations.

## Station

Modules:

- CAT
- Rotor
- Amplifier
- Antenna
- Audio
- PTT
- Sensors

## Future

- Logbook
- Synchronizers
- Scheduler
- AI-assisted recommendations

## ADR

- Fusion before Rules
- Collector Independence
- Multiple DXSpider Hosts
- Raspberry Pi First
- Operator First
- API First

## Glossary

Collector, Evidence, Master Spot, Rule, Recommendation, Station,
Synchronizer, Scheduler, Logbook.
