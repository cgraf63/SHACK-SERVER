# SHACK-SERVER

<p align="center">
  <img src="docs/images/logos/logo_v1.png" alt="SHACK-SERVER Fusion Logo" width="220">
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
- Radio CAT interfaces
- SDR
- and you need a logbook program and/or a contest software

Each system provides only a fragment of the complete picture.

SHACK-SERVER transforms fragmented information into a unified, explainable knowledge model that helps operators make better decisions in real time.

> **SHACK-SERVER is not another DX Cluster.**
>
> It is an **Amateur Radio Intelligence Platform.**

SHACK-SERVER runs on a raspberry Pi 4 with 1GB Ram or higher. Transceivers and SDR are directly connected to the raspberry PI.
Access to the PI is achieved using http witin the lan or https over the wan. On the router you need to open just 1 port: 443. 
As an alternative you can secure the https using cloudflare.

<img width="1896" height="1002" alt="image" src="https://github.com/user-attachments/assets/ca9f4a2f-af58-4ebb-9e4b-99c063e7a1ae" />

## Super Easy to use Contest Console

<img width="1890" height="1003" alt="image" src="https://github.com/user-attachments/assets/e48e78a9-9e3f-41e2-a906-6b38bd90a0a3" />

## Remote Control for Yaesu (including audio: Mic and Speaker) and CTR2-MIDI Integration Spectrum and Waterfall plus Remote Control over https !

<img width="1916" height="1023" alt="image" src="https://github.com/user-attachments/assets/d09b5335-c229-483b-a5b9-99be8e16d3ff" />


## Fully blown internal SDR (SDR Receiver needed of Course)
<img width="1907" height="1021" alt="image" src="https://github.com/user-attachments/assets/2669fc8c-9eed-4804-9768-0d2d8181cf65" />


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
 DX Summit                   Kenwood  /SDR                  |
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


## License

SHACK-SERVER is free software: you can redistribute it and/or modify it under the terms of the **GNU Affero General Public License v3.0 only** (AGPL-3.0-only). See [LICENSE](LICENSE) for the full text.

Copyright (C) 2025-2026 Christoph Graf, HB9ISO

### License change

Starting with the release following tag `v-gpl-final`, SHACK-SERVER is licensed under the AGPL-3.0. All versions up to and including `v-gpl-final` remain available under the GNU General Public License v3.0.

**What this means for you as a user:** nothing changes. You can use, modify and run SHACK-SERVER for your own station or your club free of charge, as before.

**What the AGPL adds:** if you modify SHACK-SERVER and make it available to others over a network (for example as a hosted service), you must also make your modified source code available to those users.

### Commercial licensing

If you want to use SHACK-SERVER under terms other than the AGPL-3.0, for example in a closed-source product or service, a commercial license is available. Contact: **license@shack-server.com**

### Trademark

"SHACK-SERVER" is the name of this project. The AGPL grants rights to the code, not to the name. Forks and modified versions must use a different name.

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) first. All contributors must sign the [Contributor License Agreement](CLA.md) before a pull request can be merged.

