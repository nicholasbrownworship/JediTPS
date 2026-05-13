# Jedi — Design Document

**First Measure Studios | Working Document | v0.2**

---

## 1. Concept Overview

A third-person action game featuring an original Jedi character surviving in the post-Order 66 galaxy. Inspired by Jedi: Fallen Order and Jedi: Survivor — soulslike rhythm, parry-focused combat, semi-open world exploration. The player is hunted by Inquisitors and must navigate a galaxy that has turned against the Jedi.

| Parameter | Decision |
|---|---|
| Player character | Original Jedi (unnamed) |
| Era | Post-Order 66 |
| Primary antagonist | Inquisitors |
| Combat reference | Jedi: Fallen Order / Survivor |
| Combat feel | Parry-focused, soulslike rhythm |
| Weapon | Single lightsaber |
| Tone | Balanced — neither full power fantasy nor full grimdark |
| World scope | Semi-open world |
| Project purpose | UE5 learning project — systems prototype |
| Project base | Game Animation Sample |

---

## 2. Player Character System

### 2.1 Movement

- **Default state**: Orient-to-movement — character body faces the direction of movement, camera is independent on right stick / mouse
- **Lock-on / target held state**: Strafe mode — character body faces the target, camera locks toward target, movement becomes relative to that facing
- The switch between modes triggers the moment the target button is held or lock-on becomes active

### 2.2 Camera

- Based on Game Animation Sample defaults, tuned for action game feel
- Camera remains independent of character facing in orient-to-movement mode
- Will continue to be refined throughout development

### 2.3 Character Variables

All stats are stored directly on the Character Blueprint as integers. No fractional values needed.

| Variable | Default Value | Notes |
|---|---|---|
| Max Health | 100 | |
| Current Health | Set to Max on Begin Play | |
| Max Stamina | 100 | |
| Current Stamina | Set to Max on Begin Play | |
| Max Healing Charges | 2 | |
| Current Healing Charges | Set to Max on Begin Play | |
| Current XP | 0 | |
| Max XP | 100 | Represents XP threshold to next level. Recalculated on level up via uniform scaling formula |
| Current Level | 1 | |
| Unlocked Abilities | Empty array | Placeholder — populated as abilities are designed and chosen on level up |

### 2.4 Healing System

- Button press decrements Current Healing Charges by 1
- Gated by a branch checking Current Healing Charges is greater than 0
- No charges remaining: healing does nothing

### 2.5 Force Powers

- **No Force resource meter** — Jedi do not run out of Force
- Force powers are not gated by any resource
- Force powers to be designed in a future session

---

## 3. Combat System

### 3.1 Defensive System — Block and Parry

#### Input Setup

- Single button (e.g. LB) — same button for both actions
- Two separate Input Actions — one with Tap trigger, one with Hold trigger
- Tap trigger: parry attempt
- Hold trigger: sustained block

#### Parry State

- Triggers immediately on button press (tap Input Action)
- Opens a timing window (duration TBD — placeholder, tune during implementation)
- Always available regardless of stamina — no stamina check
- If a hit lands within the timing window: perfect parry
  - Melee attacks: fully countered, enemy opened for punish
  - Blaster bolts: reflected back at the shooter
- Window expires naturally — no explicit cancellation needed
- If no hit lands: transitions to block if button is still held

#### Block State

- Activates when hold threshold is met
- Stamina check occurs here — not at parry
- If stamina above zero: block activates
  - Blaster bolts deflect in random directions
  - Melee attacks absorbed but not countered
  - Stamina decrements while block is held
- If stamina at zero: block does not activate — player is exposed
- Releasing button: block ends

#### Failed State

- Block never activated (stamina empty) and parry window missed
- Player takes full damage

### 3.2 Stamina System

- Gates block state only — does not gate parry
- Decrements continuously while block is held
- Reaches zero: block is force-exited, player exposed
- Regen triggers when player is not blocking
- Brief cooldown delay before regen begins after releasing block
- Regen rate: TBD — tune during implementation

### 3.3 Offensive System — To Be Scoped

- Melee attack chain
- Hit detection
- Enemy stagger and punish windows

---

## 4. Progression System

### 4.1 XP and Leveling

- XP is awarded in whole numbers (integer)
- Max XP represents the threshold required to reach the next level
- Scaling is uniform — Max XP recalculates on level up via a simple formula
- On level up: Current XP resets, Max XP recalculates, Current Level increments

### 4.2 Ability System

- On each level up, the player is presented with a choice of 2 abilities
- The player must choose one — the unchosen ability is permanently locked out
- Abilities from previous levels cannot be chosen at later level ups
- Chosen abilities are stored in the Unlocked Abilities array on the Character Blueprint
- Ability definitions are stored in a Data Table, looked up by row name matching the level number (e.g. level 2 abilities are in row "2")
- Actual abilities to be designed in a future session

---

## 5. Equipment

- Equipment will have real mechanical effects — not purely cosmetic changes
- This is a key differentiator from Jedi: Fallen Order and Jedi: Survivor
- Equipment system to be designed and implemented in a later tier
- A defense stat or similar variable may be added to the Character Blueprint when equipment is designed

---
