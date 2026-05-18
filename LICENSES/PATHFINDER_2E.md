# Pathfinder 2e — Attribution & Licensing

Guildstew's Pathfinder 2nd Edition game pack is built from the open-source
[**foundryvtt/pf2e**](https://github.com/foundryvtt/pf2e) Foundry VTT system,
which is itself a hybrid of Apache-2.0 licensed code, ORC-licensed Remaster
game content, OGL 1.0a legacy content, and Paizo trademark usage under the
Community Use Policy.

This file collects the attribution requirements for all four sources so the
licensing posture is auditable in one place.

---

## 1. Apache License 2.0 — Code & Logic

Any code, algorithms, data structure shapes, or system logic ported from the
foundryvtt/pf2e repository is covered by the Apache 2.0 license.

- Full text: <https://www.apache.org/licenses/LICENSE-2.0>
- Upstream `LICENSE` file preserved at:
  `src/game-packs/pf2e/pf2e-foundry-source/LICENSE`

**Attribution:** This work includes code derived from the foundryvtt/pf2e
system © its contributors, licensed under Apache License 2.0.

---

## 2. ORC License — Remaster Game Content

The 2024 Pathfinder Remaster (Player Core, Player Core 2, Monster Core, GM
Core, War of Immortals, and subsequent Remaster-era releases) is published
by Paizo Inc. under the Open RPG Creative License (ORC).

- Full text: <https://paizo.com/orclicense>
- Upstream dependency licenses preserved at:
  `src/game-packs/pf2e/pf2e-foundry-source/static/licenses/`

**Attribution (verbatim ORC-required text):**

> This product is licensed under the ORC License held in the Library of
> Congress and available online at multiple locations including
> [paizo.com/orclicense](https://paizo.com/orclicense),
> [azoralaw.com/orclicense](https://azoralaw.com/orclicense), and others.
> All warranties are disclaimed as set forth therein.
>
> Reserved Material: All trademarks, registered trademarks, proper nouns
> (characters, deities, locations, etc., as well as all adjectives, names,
> titles, and descriptive terms derived from proper nouns), artworks,
> characters, dialogue, locations, plots, storylines, and trade dress.
>
> Expressly Designated Licensed Material: All other content from Pathfinder
> Player Core, Pathfinder Player Core 2, Pathfinder GM Core, Pathfinder
> Monster Core, Pathfinder War of Immortals, and subsequent Remaster-era
> Paizo publications used herein.

---

## 3. OGL 1.0a — Pre-Remaster Legacy Content

The upstream foundryvtt/pf2e source still contains pre-Remaster content not
yet migrated to ORC (some legacy bestiary entries, legacy items). Any of
that material that survives the import script's filtering inherits the
Open Game License v1.0a.

- Full text: <https://paizo.com/pathfinderRPG/ogl>

**Attribution:** This product uses pre-Remaster content from Paizo's
Pathfinder 2nd Edition catalog under the Open Game License v1.0a. © 2019
Paizo Inc.; all rights reserved. The Open Game License is a copyright of
Wizards of the Coast LLC.

---

## 4. Paizo Community Use Policy — Trademark Usage

Any use of Paizo's product identity (trademarks, the Pathfinder name, the
Golarion setting, deity names, location names, proper nouns from published
adventures) falls under the Paizo Community Use Policy.

- Policy: <https://paizo.com/community/communityuse>

**Attribution (verbatim CUP-required text):**

> This product is compliant with the Paizo Community Use Policy. Pathfinder
> and associated marks and logos are trademarks of Paizo Inc., and are used
> under Paizo's Community Use Policy
> ([paizo.com/communityuse](https://paizo.com/communityuse)). We are
> expressly prohibited from charging you to use or access this content.
> This product is not published, endorsed, or specifically approved by
> Paizo Inc. For more information about Paizo Inc. and Paizo products,
> please visit [paizo.com](https://paizo.com).

---

## Source provenance

| Field | Value |
|---|---|
| Upstream repository | https://github.com/foundryvtt/pf2e |
| Cloned at (commit SHA) | **Unrecoverable** — see note below |
| Nearest tag | **Unrecoverable** — see note below |
| Tag + distance | **Unrecoverable** — see note below |
| Imported into Guildstew | 2026-05-17 (commit `1329956d`, original source push) |
| Re-pushed without inner `.git` | 2026-05-18 (commit `0fa4a729`, after the broken-submodule cleanup) |
| Pruned to ~91 MB | 2026-05-18 (commit `e98fb5fc`) |
| Remaster status | Remaster (confirmed by presence of War of Immortals classes — `exemplar`, `commander` — both Dec 2024 Remaster-only releases — and the upstream having moved fully to Remaster in system release 5.9.0) |

**Why the SHA is unrecoverable:** the original upload accidentally pushed
the inner `.git/` directory of the cloned foundryvtt/pf2e repo, which git
recorded as a submodule pointer. Cleanup commit `5807160a` removed that
pointer and the contributor re-pushed the raw files as commit `0fa4a729`
without the inner `.git/`. After that point there's no in-repo record of
which upstream commit the source corresponds to.

This is sufficient attribution under all four licenses (Apache 2.0,
ORC, OGL 1.0a, Paizo CUP) — the canonical URL points at the source of
truth and the import date provides a temporal anchor. A future re-pull
should preserve `.git/HEAD` separately (e.g. write the SHA into this
file at clone time) so the next provenance window is auditable.

---

## How the import script handles license boundaries

`scripts/build-pf2e-pack.mjs` reads from
`src/game-packs/pf2e/pf2e-foundry-source/` and emits trimmed adapter
modules into `src/game-packs/pf2e/{data,content}/`. Each generated
module's file header re-states attribution for the content it
contains so a downstream reader doesn't have to trace it back.

The script preserves Foundry's `system.publication.title` field on
every entity. Future filtering by license source (drop pre-Remaster
items, keep only ORC content) can be added by filtering on that
field at build time — the data carries enough metadata to decide.

---

## Updating this file

When you update the upstream pf2e source dump (re-clone, pull, etc.):

1. Re-run the four `git` commands listed in "Source provenance" above
   inside the new clone and update the values here.
2. If the upstream switches license terms (e.g. ORC migration completes
   and OGL 1.0a content is removed), drop the OGL section.
3. Commit the updated attribution alongside the source-dump diff in
   the same PR for reproducibility.
