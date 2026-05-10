# Campaign Chat & Combat Event Log — Discovery Recon

Recon-only diagnosis, no fix code in this doc. Two issues
motivate the audit:

1. Chat messages cannot be sent reliably — the send flow has a
   silent-failure path.
2. Session events (rolls, damage, conditions, turn changes) should
   auto-emit into the campaign log; coverage today is partial.

The build plan that follows this doc keys off the gaps documented
below.

## Section 1 — Existing Chat UI

### Chat component

- **File:** `src/components/chat/ChatPanel.jsx`
- **Mount point:** `src/Layout.jsx:1022-1029` (mounted globally; visible across all routes when the chat is open)
- **Layout shape:** floating bottom-right widget, fixed position (~350×450px), modeled after the LoL client chat. Conversation-list ↔ active-thread toggle within the same panel.
- **Visibility:** all authenticated users; conversation participation gates which threads appear.
- **Conversation types supported:** DMs, group chats, and campaign group threads.
- **Cap:** 50-message paging in the active thread.

### Send flow — the bug

**Location of `handleSend`:** `src/components/chat/ChatPanel.jsx:133-157`.

```js
const handleSend = useCallback(async () => {
  if (!messageText.trim() || !selectedConversationId || !user) return;
  const text = messageText.trim();
  setMessageText("");                     // ← optimistic clear
  try {
    await base44.entities.Message.create({
      conversation_id: selectedConversationId,
      sender_id: user.id,
      content: text,
      read_by: [user.id],
    });
    // … updates conversation metadata
  } catch (err) {
    console.error("Chat send failed:", err);   // ← silent swallow
  }
}, [messageText, selectedConversationId, user, queryClient]);
```

**Smoking gun (`ChatPanel.jsx:154-156`):**

- The catch block only logs to `console.error()` — no toast, no
  banner, no in-form error state.
- The input field is cleared **before** the awaited write
  (`setMessageText("")` at line 136). If the write throws (RLS
  rejection, network blip, schema mismatch, missing
  `conversation_id`), the user's text vanishes and they see
  nothing wrong on the surface.
- Whether the underlying write is failing intermittently or
  100% of the time is unanswerable from static analysis. The
  visible symptom — "messages cannot be sent" — is consistent
  with EITHER (a) the write succeeds but optimistic clear
  combined with the 3s polling cadence makes it feel slow /
  lost, or (b) the write is genuinely rejected server-side and
  the user has no idea. Without surfacing the error, we can't
  tell the alpha tester which it is.

**Send button gating** (line 395): `disabled={!messageText.trim()}` is
correct — empty messages are blocked, full messages aren't. Not the
bug.

**Message table:** `base44.entities.Message` →
`src/api/entities.js:131` → table `messages`.

### Render flow

- **Polling, not realtime:** `refetchInterval: 3000` on messages
  (line 93); `refetchInterval: isOpen ? 5000 : 15000` on the
  conversation list (line 67, adaptive based on whether the chat
  panel is open).
- Auto-scrolls to bottom on message-list change (lines 97-101).
- 3-5 second visible lag between sender hitting Send and other
  participants seeing the message.

## Section 2 — Existing Event/Log Infrastructure

### Storage

- **Table:** `campaign_log_entries` (entity:
  `src/api/entities.js:87`).
- **Polymorphic shape:** `type` field discriminates entry kind;
  `metadata` JSONB carries the payload.

### Render

- **Component:** `src/components/gm/CampaignLog.jsx`
- **Mount points:**
  - `src/pages/GMPanel.jsx:49` (GM session view)
  - `src/pages/CampaignPlayerPanel.jsx:16` (player session view)
  - `src/components/player/PlayerRightPanel.jsx`
- **Polling:** `refetchInterval: 5000` (line 44) with retry
  fallback (2 retries, 5s delay) for schema-migration resilience.
- **Display:** scrollable history; tab filter for `all` / `chat` /
  `combat`.

### Schema quirk

`CampaignLog.jsx:30-36` tries `created_date` first and falls back
to `created_at` — strongly suggests an in-flight (or never
finished) column rename. The dual-column query is brittle and
needs to settle on one canonical timestamp column.

### Event types currently being logged (confirmed emit sites)

| Event(s) | Emit site | Notes |
|---|---|---|
| `attack_hit`, `attack_miss` | `CombatDiceWindow.jsx:793-810` | actor, target, weapon, roll, AC, outcome |
| `damage_applied`, `damage_modified`, `temp_hp_absorbed` | `GMPanel.jsx:3544-3580` | amount, new HP, resistance/vuln |
| `heal_applied` | `GMPanel.jsx:3568-3579` | amount, new HP |
| `death_save_*` (nat20, nat1, success, failure) | `CampaignPlayerPanel.jsx:533-539` | roll, success flag |
| `downed` | `GMPanel.jsx:3556-3565` | character name |
| `rage_start`, `rage_end` | `GMPanel.jsx:2093, 2109` | actor name |
| spell-cast (generic) | `CombatDiceWindow.jsx:1025` | |
| `uses_lucky`, `uses_inspiration` | `CombatDiceWindow.jsx:912, 952` | reroll / advantage grant |
| `damage_reduction` (Uncanny Dodge) | `CombatDiceWindow.jsx:1331` | |
| `round_divider`, `combat_started` | `GMPanel.jsx:871-872` | round number |
| `combat_ended` | `GMPanel.jsx:1013` | duration |
| `trade_offer_sent` | `TradeOfferDialog.jsx:110` | |
| `loot_distributed`, `loot_retracted` | `LootManager.jsx:260-342` | |
| `chat` | `CampaignLog.jsx:102-116` | manual chat-tab post |

### Event types missing (gaps)

For each, the location where the event already happens — emit
helpers just need to be wired in.

| Missing event | Where it happens (no emit today) | Priority |
|---|---|---|
| `turn_change` | `GMPanel.jsx:4050-4058` (END TURN button rotates order) | high |
| `condition_applied`, `condition_removed` | `GMPanel.jsx:1444-1458` (`toggleCondition`) | high |
| `exhaustion_changed` | similar pattern | medium |
| `skill_check`, `ability_check` | no central emit point — search d20 sites | high |
| `save_throw` | not centralised | high |
| general `hp_change` (rest healing) | `GMPanel.jsx:947-954` | medium |
| `spell_slot_used` | CombatActionBar / CombatDiceWindow on slot consume | medium |
| `concentration_gained`, `concentration_lost` | concentration state changes silently | medium |
| `inspiration_granted` (the grant action) | grant exists; only the consume side logs today | medium |
| class resource use (ki, sorcery point, channel divinity, bardic, lay-on-hands, etc.) | spread across CombatActionBar | medium |
| `rest_started`, `rest_ended` | `GMPanel.jsx:945-956` | low |

### Event shape today

```jsonc
{
  id: UUID,
  campaign_id: UUID,
  type: "chat" | "combat_log" | "system" | "dice_roll",
  entry_type: <alternative name; usage varies>,
  content: string,                  // human-readable narrative
  user_id: UUID | null,             // null for system events
  user_name: string,
  user_avatar: string,
  character_id: UUID | null,
  character_name: string | null,
  is_whisper: boolean,
  is_gm_only: boolean,
  whisper_target_ids: UUID[],
  metadata: {
    event: string,                  // machine slug ("attack_hit")
    category: string,               // "attack" | "damage" | …
    actor?, target?, roll?, ac?, damage?, heal?,
    current?, max?, weapon?, d20?, crit?, kind?,
    [key: string]: any              // free-form extension
  },
  created_date: ISO8601,            // primary timestamp
  created_at: ISO8601,              // fallback (schema-quirk)
  updated_at: ISO8601
}
```

## Section 3 — Privacy Model

### Today's enforcement (`CampaignLog.jsx:134-147`)

```js
const visibleEntries = logEntries.filter((entry) => {
  if (entry.is_gm_only && !isGM) return false;
  if (entry.is_whisper && entry.user_id !== currentUser?.id && !isGM) {
    if (!entry.whisper_target_ids?.includes(currentUser?.id)) return false;
  }
  if (feedFilter === "chat" && entry.type && entry.type !== "chat") return false;
  if (feedFilter === "combat" && entry.type === "chat") return false;
  return true;
});
```

Two binary flags: `is_gm_only` and `is_whisper` (plus
`whisper_target_ids[]`). **Filter is client-side only** — if RLS
isn't enforcing the same rules, a player could query the API and
read GM-only entries. Verify before trusting the privacy model.

### DM Screen Mode

No per-event "hide from players" flag exists today. DM Screen
Mode toggles the visibility of monster math (initiative numbers,
crit/miss math), but doesn't yet feed into the log entries.

### Per-event recommendations

| Event | Visibility | Why |
|---|---|---|
| Chat / GM narration | public | roleplay |
| Whispers | sender + targets + GM | narrative secrecy |
| Attack rolls | public | tactics depend on hit/miss |
| Damage / heal | public | HP state is shared knowledge |
| Death save rolls | GM + affected player | personal fate roll |
| Conditions apply/remove | public | status affects choices |
| Skill check vs enemy (Stealth, Deception) | GM + actor | hidden by design |
| Skill check vs environment | public | exploration is shared |
| Loot distribution | public | treasure is group |
| Round dividers, turn changes | public | pacing |
| Spell slot expenditure | caster + GM | resource management |
| Concentration changes | GM + caster | spell mechanics |
| Trade offers | participants + GM | commerce privacy |

## Section 4 — Sync Architecture

- **Realtime is wired for presence**, not for log entries:
  - `GMPanel.jsx:250-282` — GM presence channel
  - `CampaignPlayerPanel.jsx:325-345` — player presence channel
  - Pattern: `supabase.channel('session:{campaignId}')`
- **Logs poll**: ChatPanel 3s/5s/15s adaptive; CampaignLog 5s.
- **Lag**: 3-5s observable between event emission and visibility on
  another client.
- **Recommendation**: graduate logs to `postgres_changes`
  Realtime listeners. The presence pattern is already proven in
  the codebase; same channel scope, different filter. Cuts log
  latency to <100ms and removes the polling load.

## Section 5 — Data Shape Recommendation

Existing shape is close to the proposed unified target. Don't
restructure — extend.

### Proposed canonical shape

```jsonc
{
  id: UUID,
  campaign_id: UUID,
  timestamp: ISO8601,                  // single canonical (replace created_date/created_at duality)
  type: "chat" | "combat_log" | "system" | "dice_roll",
  event: string,                       // machine slug
  category: "chat" | "attack" | "damage" | "heal" | "spell"
          | "condition" | "death_save" | "turn" | "round"
          | "initiative" | "rest" | "loot" | "trade" | "misc",
  actor_id: UUID | null,
  actor_name: string | null,
  target_id: UUID | null,
  target_name: string | null,
  content: string,
  visibility: "public" | "gm_only" | "whisper",
  whisper_target_ids: UUID[] | null,
  metadata: {
    weapon?, roll?, dc?, damage?, heal?,
    hp_before?, hp_after?, max_hp?,
    spell_name?, spell_slot_level?,
    condition_name?,
    resource_type?, resource_amount?,
    crit?, nat1?, source?,
    [key: string]: any
  }
}
```

### Storage decision: keep `campaign_log_entries`

Don't split into per-type tables. Reasons:

1. Single scrolling feed serves roleplay + mechanics equally.
2. Polling / Realtime hooks are simpler against one table.
3. Volume per session (100-500 entries / 4 hours) is well below
   any performance cliff.
4. RLS lives in one place.
5. One sort + one cursor for pagination.

### Schema changes needed

1. Add canonical `timestamp` column; backfill from `created_date`;
   drop the `created_date` / `created_at` fallback in
   `CampaignLog.jsx:30-36` after backfill.
2. Confirm `metadata` is JSONB (not TEXT).
3. Index `(campaign_id, timestamp DESC)` for the page query.
4. RLS — verify visibility filtering is enforced server-side, not
   only client-side.

## Section 6 — Build Plan Recommendation

| # | Commit | Scope | Complexity | Risk | Depends on |
|---|---|---|---|---|---|
| C1 | Fix chat send silent failure (toast on error, preserve input on failure, pending state) | small | high (UX-critical surface) | — |
| C2 | Add `turn_change`, `condition_applied`, `condition_removed`, `exhaustion_changed` emit hooks | small | low | C1 |
| C3 | Add `skill_check`, `ability_check`, `save_throw` emit hooks | medium | low | C1 |
| C4 | Add `spell_slot_used`, `concentration_*`, class-resource emit hooks | medium | medium | C1 |
| C5 | Add `rest_started`, `rest_ended`, rest-healing `hp_change` hooks | small | low | C1 |
| C6 | Schema normalise `timestamp`, backfill, index, drop fallback; wire Realtime postgres_changes for `campaign_log_entries` | large | medium | C1-C5 |

## Section 7 — Smells filed during recon

1. **Timestamp column duality** — `created_date` / `created_at`
   fallback in `CampaignLog.jsx:30-36`. Picking one name and
   migrating away from the other is the cleanup.
2. **Silent-error-swallowing pattern** — `ChatPanel.jsx:155`'s
   catch-and-`console.error` is likely repeated elsewhere. A
   centralised error helper that always toasts would prevent
   the same bug recurring on every async write.
3. **Polling over Realtime** — Realtime is wired for presence;
   logs and chat still poll. The pattern is in the codebase, just
   underused.
4. **Visibility filter is client-side only** — enforce in RLS or
   the privacy model is advisory.
5. **Conditions held in memory only** — `activeConditions` in
   GMPanel doesn't appear to persist across refresh. Check
   whether condition state is durable elsewhere; if not, persist
   to `campaign.combat_data` on every change.
6. **`campaign_log_entries` has no `(campaign_id, timestamp)`
   index** — the query path scans by `campaign_id` and sorts by
   timestamp every refresh; index would be free.
7. **`metadata` is unbounded JSONB** — no schema validation; risk
   of inconsistent keys ("damage" vs "dmg", "actor" vs
   "actor_id"). Document a per-event-type metadata schema before
   the surface fragments further.
8. **Combat events fire as fire-and-forget** — `logCombatEvent()`
   doesn't block on the underlying write; if a damage application
   succeeds and the log emit fails, the source-of-truth diverges.
   Acceptable for alpha; flag if it bites.
9. **No "load earlier" / pagination** — `CampaignLog` always
   fetches the whole list with a 50-entry cap. Long sessions
   would benefit from cursor-based pagination.
10. **No audit trail for whispers** — admins can't review them.
    Out of scope for chat fix; flagged for moderation work.

## Summary table

| Issue | Severity | File:line | Effort |
|---|---|---|---|
| Chat send silent failure | critical | `ChatPanel.jsx:154-156` | ~30 min |
| Turn changes not logged | high | `GMPanel.jsx:4050` | ~15 min |
| Conditions apply/remove not logged | high | `GMPanel.jsx:1444` | ~15 min |
| Skill / ability / save not logged | high | scattered | 2-4 h |
| Spell slots not logged | medium | CombatActionBar / DiceWindow | 2-3 h |
| Rest healing not logged | medium | `GMPanel.jsx:945` | ~30 min |
| Class resource use not logged | medium | combat surfaces | 4-6 h |
| Timestamp column duality | medium | `CampaignLog.jsx:30-36` | 1 h + migration |
| Polling vs Realtime | low (but UX-visible) | global | 4-6 h |
| Client-side privacy filter | low (if RLS exists) | `CampaignLog.jsx:134` | verify + document |
| Conditions not persisted across refresh | medium | GMPanel state | 1-2 h |
