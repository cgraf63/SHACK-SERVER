# SHACK-SERVER

> **An Open-Source Platform for Intelligent Amateur Radio Information Processing**

*"Turning amateur radio data into actionable information."*

---

## Vision

Modern amateur radio generates more information than ever before.

The problem is no longer the lack of information.

The problem is information overload.

Traditional DX Cluster software displays everything.

**SHACK-SERVER takes a different approach.**

It collects information from multiple sources, merges identical information, evaluates relevance and presents only what matters to the operator.

> **Don't show everything. Show what matters.**

---

# What is SHACK-SERVER?

SHACK-SERVER is an intelligent information processing platform for amateur radio.

It is **not** another DX Cluster client.

Instead, it acts as a central information hub that combines data from multiple sources and transforms raw information into meaningful operating decisions.

---

# Project Goals

- Collect information from multiple amateur radio sources
- Merge identical information
- Remove duplicates
- Evaluate relevance
- Apply user-defined rules
- Deliver only meaningful information
- Provide a modern web-based dashboard
- Run on Raspberry Pi and Linux servers

---

# Supported Data Sources

## Spider DX Clusters

- HB9ON
- HB9IAC
- Additional Spider clusters

## Planned

- Holy Cluster
- DX Summit
- WSJT-X
- Log4OM
- N1MM Logger
- Yaesu Radios
- SDR Receivers
- Rotor Controllers
- POTA
- SOTA

---

# Main Features

- Multiple data sources
- Modular architecture
- Intelligent message classification
- Duplicate detection
- Fusion Engine
- Rule Engine
- Live Dashboard
- Replay System
- WebSocket API
- Docker Support
- Raspberry Pi Support

---

# Architecture

SHACK-SERVER follows a modular pipeline architecture.

Each component has exactly one responsibility.

```text
                     +------------------+
                     |  Spider Cluster  |
                     | HB9ON / HB9IAC   |
                     +---------+--------+
                               |
                               v
                    +--------------------+
                    | SpiderCollector    |
                    | TCP / Login / Init |
                    +---------+----------+
                              |
                              v
                    +--------------------+
                    | LineRecorder       |
                    | Capture Everything |
                    +---------+----------+
                              |
          +-------------------+------------------+
          |                                      |
          v                                      v
+--------------------+                +----------------------+
| Capture Files      |                | MessageClassifier    |
| Replay / Tests     |                | DX / WWV / WCY / SYS |
+--------------------+                +----------+-----------+
                                                 |
                  +------------------------------+------------------------------+
                  |               |                  |             |
                  v               v                  v             v
          +--------------+ +--------------+ +--------------+ +--------------+
          | DXSpotParser | | WWVParser    | | WCYParser    | | SystemParser |
          +------+-------+ +--------------+ +--------------+ +--------------+
                 |
                 v
          +--------------+
          | Spot Model   |
          +------+-------+
                 |
                 v
          +--------------+
          | Fusion Engine|
          +------+-------+
                 |
                 v
          +--------------+
          | Rule Engine  |
          +------+-------+
                 |
                 v
          +--------------+
          | EventBus     |
          +------+-------+
                 |
                 v
      +----------+-----------+
      |                      |
      v                      v
+-------------+      +----------------+
| Dashboard   |      | WebSocket API  |
+-------------+      +----------------+
```

---

# Design Principles

Each component has exactly one responsibility.

## SpiderCollector

Responsible only for communication with Spider DX Clusters.

- TCP connection
- Login
- Initialization
- Receive data

---

## LineRecorder

Records every received message.

Benefits:

- Replay
- Offline development
- Debugging
- Parser testing
- Regression testing

---

## MessageClassifier

Determines the type of each incoming message.

Supported message types:

- DX Spot
- WWV
- WCY
- System Message
- Unknown

---

## Parsers

Each parser is responsible for exactly one message type.

Examples:

- DXSpotParser
- WWVParser
- WCYParser
- SystemParser

---

## Fusion Engine

The Fusion Engine combines identical information from multiple sources.

Example:

Instead of

```
HB9ON     VK9AA
HB9IAC    VK9AA
DX Summit VK9AA
```

SHACK-SERVER produces

```
VK9AA

Sources

✓ HB9ON
✓ HB9IAC
✓ DX Summit

Confidence:
98%
```

---

## Rule Engine

The Rule Engine decides what is important.

Example rules:

- New DXCC
- New Band
- New Mode
- POTA
- SOTA
- Rare Prefix
- CQ Zone Needed
- IOTA Needed

---

## Dashboard

The dashboard displays information instead of raw data.

The goal is not to show more.

The goal is to show what matters.

---

# Development Status

## Core Infrastructure

- ✅ GitHub Repository
- ✅ Project Documentation
- ✅ Settings Engine
- ✅ Operator Configuration
- ✅ Spider Cluster Configuration
- ✅ SpiderCollector
- ✅ TCP Communication
- ✅ Cluster Login
- ✅ Cluster Initialization
- ✅ Line Recorder
- ✅ Message Classifier

---

## Currently in Development

- 🚧 DXSpotParser
- 🚧 Replay Collector
- 🚧 Spot Model
- 🚧 Fusion Engine
- 🚧 Rule Engine

---

## Planned

- 📋 Multi Cluster Support
- 📋 Holy Cluster
- 📋 DX Summit
- 📋 WebSocket API
- 📋 Live Dashboard
- 📋 User Authentication
- 📋 Docker Deployment
- 📋 Raspberry Pi Image

---

# Technology Stack

Backend

- Python 3.13
- FastAPI
- SQLAlchemy
- Pydantic
- APScheduler
- WebSockets

Frontend

- React
- TypeScript
- Tailwind CSS

Deployment

- Docker
- Docker Compose
- Raspberry Pi
- Linux

---

# Development Philosophy

Every component must satisfy three rules.

## 1. Testable

Every module can be tested independently.

## 2. Replayable

Every data stream can be replayed offline.

## 3. Replaceable

Every module can be replaced without affecting the rest of the system.

---

# Long-Term Vision

SHACK-SERVER should become the central information platform for amateur radio stations.

It should combine information from multiple sources, process it intelligently and present only what is relevant for the operator.

Not another DX Cluster.

Not another Logger.

A completely new way of processing amateur radio information.

---

# Contributing

Contributions are welcome.

Whether you are interested in software development, amateur radio, testing or documentation, every contribution helps improve SHACK-SERVER.

---

# License

MIT License

---

## SHACK-SERVER

**Turning Amateur Radio Data into Actionable Information.**

**Don't show everything. Show what matters.**



