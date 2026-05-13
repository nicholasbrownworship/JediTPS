# JEDI

> *"The Force will be with you. Always."*

![Status](https://img.shields.io/badge/status-in%20development-blueviolet?style=flat-square)
![Engine](https://img.shields.io/badge/engine-Unreal%20Engine%205-black?style=flat-square&logo=unrealengine)
![Blueprint](https://img.shields.io/badge/scripting-Blueprint-blue?style=flat-square)
![License](https://img.shields.io/badge/license-not%20for%20release-red?style=flat-square)

**First Measure Studios — Learning Project — Not for Commercial Release**

---

A third-person soulslike action game set in the Star Wars universe. You are an original, unnamed Jedi — one of the last — surviving in the shadows of a post-Order 66 galaxy. The Empire's Inquisitors are hunting you. The world has turned against your kind. There is no Order to return to.

---

## Overview

| | |
|---|---|
| **Genre** | Third-person soulslike action |
| **Era** | Post-Order 66 |
| **Primary Antagonist** | Inquisitors |
| **Combat Reference** | Jedi: Fallen Order / Jedi: Survivor |
| **Combat Feel** | Parry-focused, soulslike rhythm |
| **Weapon** | Single lightsaber |
| **World Scope** | Semi-open world |
| **Engine** | Unreal Engine 5 |
| **Base Project** | Game Animation Sample |
| **Scripting** | Blueprint (no C++) |

---

## Design Goals

- **Parry-focused combat** — timing and reads matter; aggression is punished
- **Fluid movement** — vaulting, dashing, and traversal built on Epic's Game Animation Sample
- **Equipment with real mechanical weight** — gear changes how you play, not just how you look
- **Permanent ability choices** — every level-up decision forecloses something forever

---

## Project Structure

```
docs/
  DESIGN.md       — Full design document (player systems, combat, progression)
  SYSTEMS.md      — Systems map organized by build priority (Tier 1–4)
  SESSIONS.md     — Session log tracking completed work and decisions
```

---

## Combat System

Combat is built around a **single button for both parry and block**:

- **Tap** — Parry attempt. Opens a tight timing window. Perfect parry counters melee attacks and reflects blaster bolts. No stamina cost.
- **Hold** — Block. Deflects blaster bolts randomly, absorbs melee hits. Drains stamina continuously. Expires when stamina hits zero.
- **Fail** — No stamina, missed parry window. Take full damage.

Stamina gates block, not parry. Force powers are ungated — Jedi do not run out of Force.

---

## Systems Roadmap

| Tier | Systems | Status |
|---|---|---|
| **Tier 1 — Core** | Player Character, Combat, Health/Death, Enemy AI, Force Powers, Game State | In Progress |
| **Tier 2 — Secondary** | Progression, World Design, Stealth, Enemy Variety, Inventory, Equipment, Narrative | Planned |
| **Tier 3 — Polish** | UI/HUD, Audio, Game Feel, Animation, Art | Planned |
| **Tier 4 — Stretch** | Map/Exploration, Companion System, Accessibility | Planned |

---

## Session Log

| Session | Focus |
|---|---|
| **Session 1** | Project setup, character variables, healing system |

See [`docs/SESSIONS.md`](docs/SESSIONS.md) for full notes and decisions.

---

## About

This is a UE5 learning project and systems prototype by **First Measure Studios**. It is not intended for commercial release. The Star Wars universe and all related intellectual property belong to Lucasfilm Ltd. and The Walt Disney Company.
