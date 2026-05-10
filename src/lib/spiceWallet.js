import { supabase } from "@/api/supabaseClient";
import { toast } from "sonner";

/**
 * Spice wallet client — reads from spice_wallets / guild_spice_wallets
 * and routes every credit / debit through a SECURITY DEFINER RPC.
 *
 * The RPCs (add_spice, spend_spice, add_guild_spice, spend_guild_spice)
 * each handle the wallet UPDATE *and* the spice_transactions audit-row
 * INSERT in one atomic body, bypassing RLS. spice_wallets and
 * spice_transactions have no direct INSERT / UPDATE policies — see
 * 20261213_spice_ledger_atomic_rpcs.sql.
 *
 * Do not add a direct .insert() / .update() to either of those tables
 * from this file. RLS will reject it, and the wallet would drift from
 * the ledger.
 */

const EMPTY_WALLET = {
  balance: 0,
  lifetime_earned: 0,
  lifetime_spent: 0,
  lifetime_purchased: 0,
};

const EMPTY_GUILD_WALLET = {
  balance: 0,
  lifetime_total: 0,
  spending_restricted: false,
};

export async function getWalletBalance(userId) {
  if (!userId) return { ...EMPTY_WALLET };
  const { data } = await supabase
    .from("spice_wallets")
    .select("balance, lifetime_earned, lifetime_spent, lifetime_purchased")
    .eq("user_id", userId)
    .maybeSingle();
  return data || { ...EMPTY_WALLET };
}

export async function getGuildWalletBalance(guildId) {
  if (!guildId) return { ...EMPTY_GUILD_WALLET };
  const { data } = await supabase
    .from("guild_spice_wallets")
    .select("balance, lifetime_total, spending_restricted")
    .eq("guild_id", guildId)
    .maybeSingle();
  return data || { ...EMPTY_GUILD_WALLET };
}

export async function addSpice(userId, amount, type, description, referenceId = null) {
  if (!userId || !amount || amount <= 0) return 0;

  const { data: newBalance, error } = await supabase.rpc("add_spice", {
    p_user_id: userId,
    p_amount: amount,
    p_type: type,
    p_description: description ?? null,
    p_reference_id: referenceId,
  });
  if (error) throw error;
  return newBalance;
}

export async function spendSpice(userId, amount, type, description, referenceId = null) {
  if (!userId || !amount || amount <= 0) {
    return { success: false, reason: "invalid" };
  }

  try {
    const { data: newBalance, error } = await supabase.rpc("spend_spice", {
      p_user_id: userId,
      p_amount: amount,
      p_type: type,
      p_description: description ?? null,
      p_reference_id: referenceId,
    });
    if (error) throw error;
    return { success: true, balance: newBalance };
  } catch (err) {
    if (err?.message?.includes("Insufficient")) {
      toast.error("Not enough Spice! Purchase more in the Tavern.");
      return { success: false, reason: "insufficient" };
    }
    throw err;
  }
}

export async function getTransactionHistory(userId, limit = 50) {
  if (!userId) return [];
  const { data } = await supabase
    .from("spice_transactions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return data || [];
}

export async function addGuildSpice(guildId, amount, description) {
  if (!guildId || !amount || amount <= 0) return 0;

  const { data: newBalance, error } = await supabase.rpc("add_guild_spice", {
    p_guild_id: guildId,
    p_amount: amount,
    p_type: "guild_stipend",
    p_description: description || "Guild Spice credit",
  });
  if (error) throw error;
  return newBalance;
}

export async function spendGuildSpice(guildId, amount, description) {
  if (!guildId || !amount || amount <= 0) {
    return { success: false, reason: "invalid" };
  }

  // spending_restricted is enforced at the call site via getGuildWalletBalance
  // (PurchaseConfirmDialog / GuildSettingsDialog already gate the leader-only
  // path). The RPC itself only checks balance — keeping it permission-agnostic
  // means the same RPC works for stipend, refund, and other future paths.
  try {
    const { data: newBalance, error } = await supabase.rpc("spend_guild_spice", {
      p_guild_id: guildId,
      p_amount: amount,
      p_type: "item_purchase",
      p_description: description || "Guild Spice spend",
    });
    if (error) throw error;
    return { success: true, balance: newBalance };
  } catch (err) {
    if (err?.message?.includes("Insufficient")) {
      toast.error("Not enough Spice in the Guild Wallet!");
      return { success: false, reason: "insufficient" };
    }
    throw err;
  }
}
