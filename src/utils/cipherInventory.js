import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import {
  cipherItemsForCharacter,
  isCipherInventoryItem,
} from "@/config/cipherInventoryItems";

/**
 * Returns true if the character's inventory already has the cipher
 * item that matches `template`. Matches by id first (new rows) and
 * by name as fallback (legacy rows).
 */
function hasItem(inventory, template) {
  if (!Array.isArray(inventory)) return false;
  return inventory.some(
    (it) => it && (it.id === template.id || it.name === template.name),
  );
}

/**
 * Returns the cipher items the character should own but doesn't.
 */
export function missingCipherItemsForCharacter(character) {
  const required = cipherItemsForCharacter(character);
  const inv = Array.isArray(character?.inventory) ? character.inventory : [];
  return required.filter((tmpl) => !hasItem(inv, tmpl));
}

/**
 * Returns true if the viewer owns the character. Matches by either
 * created_by === viewer.email or user_id === viewer.id — same dual
 * check the CipherQuickAccessBar uses to find the active character,
 * so the two paths agree on "is this mine?". If neither field is
 * populated on the character row we treat it as ownerless and let
 * the grant proceed (RLS catches misuse downstream).
 */
function isOwnedBy(character, viewer) {
  if (!character || !viewer) return false;
  const byEmail =
    character.created_by &&
    viewer.email &&
    character.created_by === viewer.email;
  const byUserId =
    character.user_id && viewer.id && character.user_id === viewer.id;
  if (byEmail || byUserId) return true;
  // Neither field populated → treat as ownerless (legacy data).
  return !character.created_by && !character.user_id;
}

/**
 * One-shot hook: when the character loads, ensure rogue/druid
 * characters carry their cipher item. Persists via Character.update
 * and invalidates the cache so downstream views see the new row.
 *
 * Idempotent — short-circuits if nothing is missing. Only fires
 * when the viewer owns the character so other players viewing a
 * teammate's sheet don't trigger spurious writes.
 */
export function useEnsureCipherItems(character, viewer) {
  const qc = useQueryClient();
  const firedRef = useRef(false);

  useEffect(() => {
    if (firedRef.current) return;
    if (!character?.id) return;
    if (!isOwnedBy(character, viewer)) return;

    const missing = missingCipherItemsForCharacter(character);
    if (missing.length === 0) return;

    firedRef.current = true;
    const inv = Array.isArray(character.inventory) ? character.inventory : [];
    const next = [
      ...inv,
      ...missing.map((tmpl) => ({ ...tmpl, equipped: false })),
    ];

    base44.entities.Character
      .update(character.id, { inventory: next })
      .then(() => {
        qc.invalidateQueries({ queryKey: ["character", character.id] });
        qc.invalidateQueries({ queryKey: ["campaignCharacters"] });
        qc.invalidateQueries({ queryKey: ["allCharacters"] });
      })
      .catch((err) => {
        firedRef.current = false;
        console.error("Cipher item auto-grant failed:", err);
      });
  }, [character, viewer, qc]);
}

/**
 * Returns the cipher rows actually present in the character's
 * inventory. Used by the quick-access bar / inventory click handler
 * to know what buttons to render.
 */
export function ownedCipherItems(character) {
  const inv = Array.isArray(character?.inventory) ? character.inventory : [];
  return inv.filter(isCipherInventoryItem);
}
