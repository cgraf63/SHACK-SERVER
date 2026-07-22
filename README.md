# SHACK-SERVER

<p align="center">
  <img src="docs/images/logo.png" width="220">
</p>

<h3 align="center">
Collect. Fuse. Prioritize.
</h3>

<p align="center">
Open-source platform for intelligent amateur radio information processing.
</p>

---

## Why SHACK-SERVER?

Modern amateur radio operators receive information from many independent systems.

- DX Clusters
- DX Summit
- SOTAWatch
- POTA
- Reverse Beacon Network
- PSK Reporter
- Radio CAT interfaces
- WWV / WCY
- Logbooks

Each system provides only a fragment of the complete picture.

SHACK-SERVER transforms fragmented information into a unified, explainable knowledge model that helps operators make better decisions in real time.

> **SHACK-SERVER is not another DX Cluster.**
>
> It is an **Amateur Radio Intelligence Platform.**

---

# Architecture

```text
                               SHACK-SERVER Architecture

                           Data Sources
                                 │
      ┌──────────────────────────┼──────────────────────────┐
      │                          │                          │
   DX Clusters              Radio Interface          External Services
      │                          │                          │
 HB9ON / HB9IAC              Yaesu / Icom          SOTA / POTA / RBN
 DX Summit                   Kenwood               WWV / WCY / ...
      └──────────────────────────┼──────────────────────────┘
                                 │
                           Collectors
                                 │
                                 ▼
                          Message Classifier
                                 │
                                 ▼
                            Spot Parser
                                 │
                                 ▼
                           Incoming Spot
                                 │
                                 ▼
                           Fusion Engine
      ┌────────────────────────────────────────────────────────────┐
      │                                                            │
      │  • Duplicate Detection                                     │
      │  • Source Correlation                                      │
      │  • Context Enrichment                                      │
      │  • Distance Calculation                                    │
      │  • Bearing Calculation                                     │
      │  • Confidence Score                                        │
      └────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
                            Master Spot
                                 │
                                 ▼
                            Rule Engine
      ┌────────────────────────────────────────────────────────────┐
      │                                                            │
      │  • Relevance Calculation                                   │
      │  • Operator Preferences                                    │
      │  • Explainable Decisions                                   │
      └────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
                             Output Layer
                 ┌──────────────┼──────────────┬──────────────┐
                 ▼              ▼              ▼              ▼
            Dashboard      Telnet Server    REST API     WebSocket
