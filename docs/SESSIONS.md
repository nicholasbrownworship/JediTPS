# Jedi — Session Log

---

## Session 1

**Focus:** Project setup, character variable foundation, healing system

**Completed:**
- Evaluated Third Person Template vs Game Animation Sample — chose Game Animation Sample for superior out-of-the-box movement (vaulting, dashing, etc.)
- Verified Game Animation Sample uses Enhanced Input
- Created project named Jedi from Game Animation Sample base
- Tuned camera from default settings — will continue refining throughout development
- Confirmed movement design: orient-to-movement by default, switches to strafe on lock-on or target button held
- Added all core character variables to Character Blueprint (all integers):
  - Max Health (100) / Current Health
  - Max Stamina (100) / Current Stamina
  - Max Healing Charges (2) / Current Healing Charges
  - Current XP / Max XP (100)
  - Current Level (1)
  - Unlocked Abilities (array placeholder)
- On Begin Play: Current Health, Current Stamina, Current Healing Charges all set to their Max values
- Implemented healing system: button press decrements Current Healing Charges by 1, gated by branch checking charges > 0

**Next Steps:**
- Set up Data Table structure skeleton for ability system (columns only, no data yet)
- Implement basic health and death system
  - Take Damage function
  - Death condition check
  - Death animation montage (source from FAB, compatible with UE5 Mannequin skeleton)
  - Ragdoll on death
  - No respawn needed yet — end PIE session serves as reset

**Key Decisions Made:**
- No Force resource meter — Jedi do not run out of Force
- XP scaling is uniform, not Data Table driven
- Max XP represents the level-up threshold, recalculates on level up
- Ability choices are permanent and exclusive — unchosen abilities from prior levels are locked out forever
- Equipment will have mechanical effects (deferred to later tier)
- Defense stat deferred until equipment system is designed
