import { supabase } from "@/api/supabaseClient";
import { toast } from "sonner";

/**
 * Spice wallet client — reads/writes to the personal and guild
 * wallets and appends every movement to the `spice_transactions`
 * ledger. Credits/debits go through the atomic `add_spice` /
 * `spend_spice` RPCs so concurrent updates can't race. `balance_after`
 * is returned by the RPC and written to the ledger row so the ledger
 * alone can reconstruct the wallet timeline.
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
  });
  if (error) throw error;

  await supabase.from("spice_transactions").insert({
    user_id: userId,
    amount,
    balance_after: newBalance,
    transaction_type: type,
    description,
    reference_id: referenceId,
  });

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
    });
    if (error) throw error;

    await supabase.from("spice_transactions").insert({
      user_id: userId,
      amount: -amount,
      balance_after: newBalance,
      transaction_type: type,
      description,
      reference_id: referenceId,
    });

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

// Guild wallet — read-modify-write pattern. Not as airtight as the
// personal RPCs but sufficient while guild spending is GM-gated.
// Swap to a dedicated RPC if contention shows up.
export async function addGuildSpice(guildId, amount, description) {
  if (!guildId || !amount || amount <= 0) return 0;

  const { data: wallet } = await supabase
    .from("guild_spice_wallets")
    .select("balance, lifetime_total")
    .eq("guild_id", guildId)
    .maybeSingle();

  let newBalance;
  if (wallet) {
    newBalance = (wallet.balance || 0) + amount;
    await supabase
      .from("guild_spice_wallets")
      .update({
        balance: newBalance,
        lifetime_total: (wallet.lifetime_total || 0) + amount,
        updated_at: new Date().toISOString(),
      })
      .eq("guild_id", guildId);
  } else {
    newBalance = amount;
    await supabase.from("guild_spice_wallets").insert({
      guild_id: guildId,
      balance: amount,
      lifetime_total: amount,
    });
  }

  await supabase.from("spice_transactions").insert({
    guild_id: guildId,
    amount,
    balance_after: newBalance,
    transaction_type: "guild_stipend",
    description: description || "Guild Spice credit",
  });

  return newBalance;
}

export async function spendGuildSpice(guildId, amount, description) {
  if (!guildId || !amount || amount <= 0) {
    return { success: false, reason: "invalid" };
  }

  const { data: wallet } = await supabase
    .from("guild_spice_wallets")
    .select("balance, spending_restricted")
    .eq("guild_id", guildId)
    .maybeSingle();

  if (!wallet || wallet.balance < amount) {
    toast.error("Not enough Spice in the Guild Wallet!");
    return { success: false, reason: "insufficient" };
  }

  const newBalance = wallet.balance - amount;
  await supabase
    .from("guild_spice_wallets")
    .update({
      balance: newBalance,
      updated_at: new Date().toISOString(),
    })
    .eq("guild_id", guildId);

  await supabase.from("spice_transactions").insert({
    guild_id: guildId,
    amount: -amount,
    balance_after: newBalance,
    transaction_type: "item_purchase",
    description: description || "Guild Spice spend",
  });

  return { success: true, balance: newBalance };
}
