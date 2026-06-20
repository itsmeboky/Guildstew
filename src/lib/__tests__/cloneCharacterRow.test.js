// Locks the campaign-clone row shape so the lobby and application-accept
// paths can't drift, and the clone/legacy discriminator the kick guard
// depends on.

import { test } from "node:test";
import assert from "node:assert/strict";

import { buildCampaignCloneRow, isProvableClone } from "../cloneCharacterRow.js";

test("buildCampaignCloneRow strips volatile fields, sets clone markers, preserves the rest", () => {
  const lib = {
    id: "lib-1",
    created_at: "t0",
    updated_at: "t1",
    last_played: "lp",
    active_session_id: "sess-1",
    name: "Aria",
    user_id: "u1",
    created_by: "u1@example.com",
    campaign_id: null,
    is_campaign_copy: false,
    level: 5,
    creator_data: { allies: { deity: { name: "Pelor" } } },
    companions: [{ id: "c1" }],
  };

  const row = buildCampaignCloneRow(lib, { campaignId: "camp-9" });

  // Volatile fields stripped (not carried from the source).
  assert.equal("id" in row, false);
  assert.equal("created_at" in row, false);
  assert.equal("updated_at" in row, false);

  // Clone markers set.
  assert.equal(row.campaign_id, "camp-9");
  assert.equal(row.is_campaign_copy, true);
  assert.equal(row.source_character_id, "lib-1");
  assert.equal(row.active_session_id, null);
  assert.equal(row.last_played, null);

  // Owner + payload preserved (so the player's own-character lookup finds it).
  assert.equal(row.user_id, "u1");
  assert.equal(row.created_by, "u1@example.com");
  assert.equal(row.level, 5);
  assert.deepEqual(row.creator_data, lib.creator_data);
  assert.deepEqual(row.companions, lib.companions);
});

test("buildCampaignCloneRow output is byte-identical to the lobby path's historical construction", () => {
  const lib = { id: "x", created_at: 1, updated_at: 2, last_played: 3, active_session_id: 4, foo: "bar", user_id: "p", created_by: "p@e.com" };

  const helper = buildCampaignCloneRow(lib, { campaignId: "C" });

  // The exact construction CharacterPickerView.cloneMutation used before
  // the extraction — regression guard.
  const legacyLobby = (() => {
    const {
      id: _id, created_at: _c, updated_at: _u, last_played: _lp, active_session_id: _as, ...rest
    } = lib;
    return {
      ...rest,
      campaign_id: "C",
      is_campaign_copy: true,
      source_character_id: lib.id,
      active_session_id: null,
      last_played: null,
    };
  })();

  assert.deepEqual(helper, legacyLobby);
});

test("isProvableClone distinguishes clone / legacy / library / junk", () => {
  // Genuine clone — safe to delete on kick.
  assert.equal(isProvableClone({ is_campaign_copy: true, source_character_id: "lib-1" }), true);
  // Legacy in-place row (20261128 backfill set is_campaign_copy, left source NULL) — NOT safe.
  assert.equal(isProvableClone({ is_campaign_copy: true, source_character_id: null }), false);
  // Library original.
  assert.equal(isProvableClone({ is_campaign_copy: false, source_character_id: null }), false);
  // Defensive.
  assert.equal(isProvableClone(null), false);
  assert.equal(isProvableClone(undefined), false);
});
