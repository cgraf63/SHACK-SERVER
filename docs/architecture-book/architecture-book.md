---
title: SHACK-SERVER Architecture Book
subtitle: Part I – Core Architecture
version: 1.0
status: Draft
author: Christoph Graf
language: English
---

# SHACK-SERVER Architecture Book

> Transforming Amateur Radio Information into Knowledge.

# Chapter 1 – Project Identity

## Purpose

SHACK-SERVER is an open-source platform for intelligent amateur radio information processing.

It collects information from multiple sources, transforms observations into knowledge and provides recommendations for the operator.

## Vision

> Transforming Amateur Radio Information into Knowledge.

## Guiding Principle

> Collect. Fuse. Prioritize.

# Chapter 2 – The Problem

Amateur radio operators receive information from many independent systems. These systems often contain duplicate, incomplete or conflicting observations.

SHACK-SERVER fills the missing information processing layer between information sources and the operator.

# Chapter 3 – Design Goals

Primary goals:

- Information Fusion
- Decision Support
- Simplicity
- Modularity
- Extensibility

Operational goals:

- Raspberry Pi First
- Headless operation
- Vendor independent

Non-goals:

- Logging application
- Contest logger
- Radio control application
- SDR application

# Chapter 4 – Core Principles

- Operator First
- Knowledge Before Presentation
- Multi-Source First
- Explainable Decisions
- Modular by Design
- Vendor Independent
- Raspberry Pi First
- Headless First
- Keep It Simple

# Chapter 5 – Ubiquitous Language

| Term | Definition |
|------|------------|
| Operator | Amateur radio operator |
| Incoming Spot | A single received observation |
| Evidence | Supporting information |
| Master Spot | Consolidated knowledge |
| Recommendation | Output of the Rule Engine |



# Chapter 6 – Domain Model

## Purpose

The domain model describes how information flows through SHACK-SERVER.

Incoming Spot → Evidence → Master Spot → Recommendation

Design Principle:

> Information becomes knowledge before it becomes a recommendation.

---

# Chapter 7 – System Architecture

Pipeline:

Data Sources → Collectors → Message Classifier → Spot Parser → Incoming Spot → Fusion Engine → Master Spot → Spot Store → Rule Engine → Recommendation → Output Interfaces

---

# Chapter 8 – Data Sources

Source categories:

- DX Clusters
- Radio Equipment
- Future Sources

Sources are independent and may provide duplicate or conflicting observations.

---

# Chapter 9 – Collectors

Collectors connect SHACK-SERVER to external systems.

Responsibilities:

- receive raw data
- maintain connections
- reconnect automatically
- forward messages

Collectors do not interpret information.

---

# Chapter 10 – Message Classifier

The Message Classifier determines the type of each incoming message and routes it to the appropriate parser.

Responsibilities:

- identify message type
- validate basic format
- select parser
- reject unsupported messages

The classifier is deterministic, lightweight and stateless.


# Chapter 11 – Spot Parser

## Purpose

The Spot Parser converts classified messages into structured Incoming Spots.

Responsibilities:

- parse messages
- extract fields
- validate mandatory data
- create Incoming Spots

---

# Chapter 12 – Fusion Engine

## The Heart of SHACK-SERVER

The Fusion Engine transforms observations into consolidated knowledge.

Architectural Principle:

> Fusion combines observations into knowledge. It does not decide what is important.

Responsibilities:

- create Master Spots
- update Master Spots
- attach Evidence
- resolve conflicts
- detect duplicates

---

# Chapter 13 – Spot Store

The Spot Store maintains all active Master Spots.

It is the runtime memory and the single source of truth for the current operating picture.

---

# Chapter 14 – Rule Engine

The Rule Engine evaluates Master Spots and generates Recommendations.

Architectural Principle:

> The Fusion Engine answers: What do we know?

> The Rule Engine answers: What should the operator know now?

Responsibilities:

- evaluate rules
- assign priorities
- generate recommendations
- explain decisions

---

# Chapter 15 – Output Interfaces

Supported interfaces:

- Dashboard
- REST API
- WebSocket
- Telnet

Architectural Principle:

> One knowledge model — multiple views.

---

# Glossary

| Term | Definition |
|------|------------|
| Incoming Spot | Single observation |
| Evidence | Supporting information |
| Master Spot | Consolidated knowledge |
| Recommendation | Result of Rule Engine |
