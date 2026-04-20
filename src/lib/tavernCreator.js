import { supabase } from "@/api/supabaseClient";
import { spendSpice, addSpice } from "@/lib/spiceWallet";
import { MIN_CASHOUT } from "@/config/spiceConfig";

/**
 * Creator helpers.
 *
 * - getMyListings: the creator's own items (all statuses).
 * - getMySalesLedger: sale_earning + upload_fee ledger rows for the
 *   creator, with the joined item for display.
 * - calcSalesThisMonth / calcTotalEarnings: summary numbers for the
 *   earnings card.
 * - requestCashout: debits the creator's wallet via spendSpice('cashout')
 *   and inserts a cashout_requests row. On insert failure the Spice
 *   is refunded so the creator never loses balance to a DB error.
 *
 * Cashout fee policy: the payout processing fee (Stripe's ~2.9% + $0.30)
 * is deducted from the creator's gross payout, not absorbed by
 * Guildstew. `estimateCashout` computes the net.
 */

const STRIPE_PCT = 0.029;
const STRIPE_FIXED = 0.30;

export function estimateCashout(spiceAmount) {
  const gross = spiceAmount / 250;
  const fee = Math.max(0, gross * STRIPE_PCT + STRIPE_FIXED);
  const net = Math.max(0, gross - fee);
  return {
    spice: spiceAmount,
    gross: Number(gross.toFixed(2)),
    fee: Number(fee.toFixed(2)),
    net: Number(net.toFixed(2)),
  };
}

export async function getMyListings(creatorId) {
  if (!creatorId) return [];
  const { data } = await supabase
    .from("tavern_items")
    .select("*")
    .eq("creator_id", creatorId)
    .order("created_at", { ascending: false });
  return data || [];
}

export async function getMySalesLedger(creatorId, { limit = 100 } = {}) {
  if (!creatorId) return [];
  const { data } = await supabase
    .from("spice_transactions")
    .select("*")
    .eq("user_id", creatorId)
    .in("transaction_type", ["sale_earning", "upload_fee", "cashout", "refund"])
    .order("created_at", { ascending: false })
    .limit(limit);
  return data || [];
}

export async function calcEarnings(creatorId) {
  if (!creatorId) return { total: 0, thisMonth: 0 };
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const { data: allSales } = await supabase
    .from("spice_transactions")
    .select("amount, created_at")
    .eq("user_id", creatorId)
    .eq("transaction_type", "sale_earning");

  const total = (allSales || []).reduce((a, t) => a + (t.amount || 0), 0);
  const thisMonth = (allSales || [])
    .filter((t) => new Date(t.created_at) >= monthStart)
    .reduce((a, t) => a + (t.amount || 0), 0);

  return { total, thisMonth };
}

export async function getMyCashoutRequests(creatorId, { limit = 20 } = {}) {
  if (!creatorId) return [];
  const { data } = await supabase
    .from("cashout_requests")
    .select("*")
    .eq("user_id", creatorId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return data || [];
}

export async function requestCashout(creatorId, spiceAmount) {
  if (!creatorId) return { success: false, reason: "no_user" };
  if (spiceAmount < MIN_CASHOUT) {
    return { success: false, reason: "below_minimum" };
  }

  const estimate = estimateCashout(spiceAmount);

  // Debit first — if the wallet doesn't have it, we never create the
  // request. The Spice leaves `balance` so the creator can't double-
  // cashout the same Spice while the request is pending.
  const debit = await spendSpice(
    creatorId,
    spiceAmount,
    "cashout",
    `Cashout requested — $${estimate.gross.toFixed(2)} gross`,
  );
  if (!debit?.success) return { success: false, reason: debit?.reason || "spend_failed" };

  const { data, error } = await supabase
    .from("cashout_requests")
    .insert({
      user_id: creatorId,
      spice_amount: spiceAmount,
      usd_amount: estimate.gross,
    })
    .select()
    .maybeSingle();

  if (error) {
    // Refund — creator shouldn't pay for our DB failure.
    await addSpice(creatorId, spiceAmount, "refund", "Refund: cashout request failed").catch(() => {});
    return { success: false, reason: error.message };
  }

  return { success: true, request: data, estimate };
}

/**
 * Admin helpers — pending queue + approve/reject.
 */
export async function listPendingCashouts() {
  const { data } = await supabase
    .from("cashout_requests")
    .select("*")
    .in("status", ["pending", "processing"])
    .order("created_at", { ascending: true });
  return data || [];
}

export async function listAllCashouts({ limit = 100 } = {}) {
  const { data } = await supabase
    .from("cashout_requests")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  return data || [];
}

export async function markCashoutStatus(requestId, nextStatus, { notes = null } = {}) {
  await supabase
    .from("cashout_requests")
    .update({
      status: nextStatus,
      processed_at: new Date().toISOString(),
      ...(notes ? { notes } : {}),
    })
    .eq("id", requestId);
}

/**
 * Reject a cashout and refund the Spice. The caller supplies the
 * original request (spice_amount + user_id) so we don't need another
 * round-trip.
 */
export async function rejectCashout(request, { notes = "" } = {}) {
  if (!request?.id) return;
  await addSpice(
    request.user_id,
    request.spice_amount,
    "refund",
    `Cashout rejected — refunded ${request.spice_amount} Spice`,
  );
  await markCashoutStatus(request.id, "rejected", { notes });
}
