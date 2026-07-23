# SHACK-SERVER

# UI Guidelines

**Project Horizon**

---

# Introduction

The SHACK-SERVER user interface is designed around one central idea:

> The operator should always know what is happening, what is important and what to do next.

Every screen must have a clear purpose.

Every interaction should reduce complexity rather than add to it.

---

# Design Goals

The interface should be:

- Fast
- Clean
- Predictable
- Informative
- Calm
- Professional

The UI should feel like a modern Network Operations Center rather than traditional amateur radio software.

---

# Navigation

The application consists of six primary workspaces.

## 1. Operations Center

Primary workspace.

Shows everything important at a glance.

Primary question:

> What should I do now?

Contains:

- Command Strip
- Priority DX
- Propagation Summary
- Station Status
- Live Activity
- Notifications

---

## 2. Activity

Displays worldwide amateur radio activity.

Contains:

- Live DX Spots
- Heat Map
- Spot Timeline
- Filters
- Search

Primary question:

> What is happening around the world?

---

## 3. Propagation

Shows current and predicted propagation.

Contains:

- Solar Data
- K Index
- A Index
- SFI
- MUF
- Grey Line
- Band Forecast

Primary question:

> Which bands should I use?

---

## 4. Station

Displays the complete station status.

Contains:

- Connected Radios
- CAT Status
- Audio Devices
- Antennas
- Rotor
- Power Output
- SWR
- Temperature

Primary question:

> Is my station ready?

---

## 5. Analytics

Historical information and statistics.

Contains:

- Operating Time
- Band Statistics
- DXCC Progress
- Activity Timeline
- Station Performance

Primary question:

> What can I learn from my operation?

---

## 6. Settings

Configuration of the entire platform.

Contains:

- Operator
- Station
- Radios
- Interfaces
- Clusters
- Notifications
- Appearance

Primary question:

> How is my system configured?

---

# Header

Always visible.

Contains:

- SHACK-SERVER Logo
- Current Workspace
- Connected Operator
- UTC Time
- Local Time
- Notification Icon
- Connection Status

---

# Command Strip

Located below the header.

Height approximately 50 pixels.

Displays only high-priority operational events.

Examples:

• New DXCC detected

• 10 m opening expected

• Rotor reached target

• Radio disconnected

• High priority DX spotted

This is not a news ticker.

Only actionable events belong here.

---

# Dashboard Cards

Every card answers exactly one question.

Examples:

Priority DX

What should I call now?

Propagation

Which bands are opening?

Station Status

Can I transmit?

Solar Conditions

How are conditions changing?

Weather

Can I safely operate portable?

Notifications

What requires my attention?

Cards are modular.

The operator can choose which cards are visible and where they appear.

---

# Tables

Tables should maximise information density.

Requirements:

- Sortable
- Searchable
- Compact
- Sticky headers
- Keyboard accessible

---

# Status Indicators

Green

Normal operation.

Orange

Attention recommended.

Red

Immediate action required.

Blue

Neutral information.

Grey

Unavailable.

---

# Notifications

Notifications are prioritised.

Priority 1

Critical

Priority 2

Important

Priority 3

Information

Notifications should never interrupt operation unless critical.

---

# Quick Actions

Every important object should provide context-sensitive actions.

Examples:

DX Spot

- Tune Radio
- Show Map
- Open QRZ
- Ignore

Station

- Restart CAT
- Open Settings

Propagation

- Show Forecast
- Open Details

---

# Responsive Behaviour

Desktop

Full functionality.

Tablet

Nearly full functionality.

Mobile

Monitoring only.

Configuration tasks remain desktop-oriented.

---

# Design Rules

Rule 1

Information before decoration.

Rule 2

Every screen answers one question.

Rule 3

Every click reveals more detail.

Rule 4

Important information is never hidden.

Rule 5

Reduce operator workload.

Rule 6

Consistency over creativity.

Rule 7

Performance before visual effects.

Rule 8

Every feature must help the operator make a better decision.

---

# Closing Statement

SHACK-SERVER is not intended to be another amateur radio application.

It is designed to become the Operations Center for modern amateur radio.

Designed and developed in Switzerland 🇨🇭

Made in Switzerland 🇨🇭
with ❤️ for Amateur Radio
