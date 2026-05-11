import { supabase } from "@/api/supabaseClient";
import { MONTHLY_STIPENDS } from "@/config/spiceConfig";
import { addSpice, addGuildSpice } from "@/lib/spiceWallet";

/**
 * Monthly stipend grant.
 *
 * Called once on login / app boot for subscribed users. Idempotent by
 * the `last_stipend_at` timestamp on `spice_wallets`: a grant only
 * lands if 30+ days have passed since the last one (or if none has
 * ever landed). Guild tier members get the guild stipend deposited to
 * the shared `guild_spice_wallets` row so the whole table benefits
 * from any member's subscription; all other tiers credit the personal
 * wallet.
 *
 * Free tier is a no-op.
 */

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export async function checkAndGrantStipend(userId, tier, guildId = null) {
  if (!userId) return { granted: false, reason: "no_user" };

  const stipendAmount = MONTHLY_STIPENDS[tier] || 0;
  if (stipendAmount === 0) return { granted: false, reason: "no_tier" };

  const { data: wallet } = await supabase
    .from("spice_wallets")
    .select("last_stipend_at")
    .eq("user_id", userId)
    .maybeSingle();

  const lastStipend = wallet?.last_stipend_at ? new Date(wallet.last_stipend_at) : null;
  const now = new Date();

  if (lastStipend && now - lastStipend < THIRTY_DAYS_MS) {
    return { granted: false, reason: "too_soon", nextAt: new Date(lastStipend.getTime() + THIRTY_DAYS_MS) };
  }

  if (tier === "guild" && guildId) {
    await addGuildSpice(guildId, stipendAmount, "Monthly guild stipend");
  } else {
    await addSpice(userId, stipendAmount, "stipend", `Monthly ${tier} stipend`);
  }

  // Stamp last_stipend_at via the SECURITY DEFINER RPC. Direct
  // upsert on spice_wallets is RLS-rejected — see
  // 20261213_spice_ledger_atomic_rpcs.sql.
  await supabase.rpc("mark_stipend_granted", { p_user_id: userId });

  return { granted: true, amount: stipendAmount, tier };
}
