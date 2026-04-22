import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  CreditCard, ArrowRight, Check, X, ExternalLink, ChevronRight, Sparkles,
} from "lucide-react";
import SpiceIcon from "@/components/tavern/SpiceIcon";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { useAuth } from "@/lib/AuthContext";
import { useSubscription } from "@/lib/SubscriptionContext";
import { TIERS, openBillingPortal, startCheckout } from "@/api/billingClient";
import { getWalletBalance } from "@/lib/spiceWallet";
import { formatSpice } from "@/config/spiceConfig";
import { createPageUrl } from "@/utils";
import BuySpiceDialog from "@/components/tavern/BuySpiceDialog";

/**
 * /account/billing
 *
 * Four sections:
 *   1. Current Plan — tier + price + next-billing; upgrade / cancel
 *   2. Payment Method — opens Stripe Customer Portal
 *   3. Billing History — invoices from Stripe (stub until webhook lands)
 *   4. Spice Balance — wallet summary + Buy Spice shortcut
 *
 * All the destructive / paid actions route through existing
 * billingClient exports, which in turn hit the billing Edge
 * Functions. Free-tier users see the tier comparison as the
 * Current Plan section so the upgrade path is the obvious default.
 */
const UPGRADE_TIERS = ["adventurer", "veteran", "guild"];

export default function AccountBilling() {
  const { user } = useAuth();
  const sub = useSubscription();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [spiceOpen, setSpiceOpen] = useState(false);
  const [portalBusy, setPortalBusy] = useState(false);

  const { data: wallet } = useQuery({
    queryKey: ["spiceWallet", user?.id],
    queryFn: () => getWalletBalance(user.id),
    enabled: !!user?.id,
  });

  const tier = sub.tierData || TIERS.free;
  const isFree = sub.tier === "free";

  const onPortal = async () => {
    if (!user?.id) { toast.error("Sign in first."); return; }
    setPortalBusy(true);
    try {
      await openBillingPortal(user.id);
    } catch (err) {
      toast.error(err?.message || "Billing portal unavailable.");
    } finally {
      setPortalBusy(false);
    }
  };

  const onUpgrade = async (targetTier) => {
    if (!user?.id || !user?.email) { toast.error("Sign in first."); return; }
    try {
      await startCheckout({ tier: targetTier, user_id: user.id, user_email: user.email });
    } catch (err) {
      toast.error(err?.message || "Checkout unavailable.");
    }
  };

  return (
    <div className="min-h-screen bg-[#050816] text-white">
      <div className="max-w-4xl mx-auto px-4 md:px-8 py-8 space-y-6">
        <div>
          <h1 className="text-3xl font-black flex items-center gap-3">
            <CreditCard className="w-7 h-7 text-[#37F2D1]" />
            Billing & Payments
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Your plan, payment method, invoices, and Spice balance.
          </p>
        </div>

        {/* Current plan */}
        <section className="bg-[#1E2430] border border-slate-700 rounded-lg p-6">
          <p className="text-[10px] uppercase tracking-widest text-slate-500 font-black">
            Current Plan
          </p>

          <div className="mt-2 flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h2 className="text-2xl font-black text-white flex items-center gap-2">
                {tier.badgeIcon && <span>{tier.badgeIcon}</span>}
                {tier.name}
              </h2>
              <p className="text-sm text-slate-400 mt-1">{tier.priceLabel}</p>
              {sub.periodEnd && (
                <p className="text-[11px] text-slate-500 mt-1">
                  {sub.cancelAtPeriodEnd ? "Ends" : "Renews"}{" "}
                  {new Date(sub.periodEnd).toLocaleDateString()}
                </p>
              )}
            </div>

            {isFree ? (
              <Link to={createPageUrl("Settings") + "?tab=subscription"}>
                <Button className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#050816] font-bold">
                  Upgrade <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            ) : (
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  onClick={onPortal}
                  disabled={portalBusy}
                  className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#050816] font-bold"
                >
                  {portalBusy ? "Opening…" : <>Change Plan <ExternalLink className="w-4 h-4 ml-1" /></>}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setCancelOpen(true)}
                  className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                >
                  Cancel Subscription
                </Button>
              </div>
            )}
          </div>

          {isFree && (
            <div className="mt-5 pt-5 border-t border-slate-700/50">
              <p className="text-xs text-slate-400 mb-3">What you get by upgrading:</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {UPGRADE_TIERS.map((key) => {
                  const t = TIERS[key];
                  return (
                    <div
                      key={key}
                      className="rounded-lg border p-4 bg-[#050816]"
                      style={{ borderColor: `${t.badgeColor}66` }}
                    >
                      <p className="text-lg font-black flex items-center gap-2" style={{ color: t.badgeColor }}>
                        {t.badgeIcon} {t.name}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">{t.priceLabel}</p>
                      <ul className="mt-3 space-y-1.5 text-[11px] text-slate-300">
                        {(t.features || []).slice(0, 5).map((f, i) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <Check className="w-3 h-3 text-[#37F2D1] flex-shrink-0 mt-0.5" />
                            <span>{f}</span>
                          </li>
                        ))}
                      </ul>
                      <Button
                        onClick={() => onUpgrade(key)}
                        className="w-full mt-4 bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#050816] font-bold"
                      >
                        Upgrade
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        {/* Payment method */}
        <section className="bg-[#1E2430] border border-slate-700 rounded-lg p-6">
          <p className="text-[10px] uppercase tracking-widest text-slate-500 font-black mb-2">
            Payment Method
          </p>
          <p className="text-sm text-slate-300">
            {sub.stripe_customer_id || tier.priceLabel !== "Free"
              ? "Managed in Stripe's secure billing portal."
              : "No payment method on file yet — you're on the free tier."}
          </p>
          <Button
            onClick={onPortal}
            disabled={portalBusy}
            variant="outline"
            className="mt-3"
          >
            {portalBusy ? "Opening…" : (
              <>Update Payment Method <ExternalLink className="w-4 h-4 ml-1" /></>
            )}
          </Button>
        </section>

        {/* Billing history */}
        <section className="bg-[#1E2430] border border-slate-700 rounded-lg p-6">
          <p className="text-[10px] uppercase tracking-widest text-slate-500 font-black mb-3">
            Billing History
          </p>
          <p className="text-sm text-slate-400 italic">
            Billing history will appear here once your first payment processes. Until then, invoices are
            accessible from the <button onClick={onPortal} className="underline text-[#37F2D1]">Stripe portal</button>.
          </p>
        </section>

        {/* Spice balance */}
        <section className="bg-[#1E2430] border border-amber-600/30 rounded-lg p-6">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-amber-400/70 font-black">
                Spice Balance
              </p>
              <p className="text-3xl font-black text-amber-200 flex items-center gap-2 mt-1">
                <SpiceIcon size={24} color="#fbbf24" />
                {formatSpice(wallet?.balance || 0)}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                Lifetime earned: {formatSpice(wallet?.lifetime_earned || 0)} · spent: {formatSpice(wallet?.lifetime_spent || 0)}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                onClick={() => setSpiceOpen(true)}
                className="bg-amber-500 hover:bg-amber-400 text-amber-950 font-bold"
              >
                Buy Spice
              </Button>
              <Link to={createPageUrl("CreatorDashboard")}>
                <Button variant="outline" className="border-amber-500/40 text-amber-200">
                  Transaction History <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </div>

      <BuySpiceDialog open={spiceOpen} onClose={() => setSpiceOpen(false)} />

      <CancelSubDialog
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        tier={tier}
        onOpenPortal={onPortal}
      />
    </div>
  );
}

function CancelSubDialog({ open, onClose, tier, onOpenPortal }) {
  const DOWNGRADE_TARGET = "adventurer";
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose?.(); }}>
      <DialogContent className="bg-[#1E2430] border border-gray-700 text-white max-w-md">
        <DialogHeader>
          <DialogTitle>Cancel {tier.name}?</DialogTitle>
          <DialogDescription className="text-slate-400">
            You'll keep {tier.name} features until the end of your current billing period, then drop to the Free tier.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 text-sm">
          <p className="text-slate-300">You'll lose access to:</p>
          <ul className="text-[12px] text-slate-400 space-y-1 pl-4 list-disc">
            {(tier.features || []).slice(0, 4).map((f, i) => <li key={i}>{f}</li>)}
          </ul>
        </div>

        <div className="bg-amber-500/10 border border-amber-500/30 rounded p-3 text-[12px] text-amber-100">
          <p className="font-bold flex items-center gap-1 mb-1">
            <Sparkles className="w-3 h-3" /> Consider a downgrade
          </p>
          <p>
            Most Veteran perks are also in Adventurer — {TIERS[DOWNGRADE_TARGET].priceLabel}. Switch to the Stripe portal and pick Adventurer instead of cancelling to keep most of what you love.
          </p>
        </div>

        <DialogFooter className="flex-wrap gap-2">
          <Button variant="outline" onClick={onClose}>Keep subscription</Button>
          <Button variant="outline" onClick={() => { onClose?.(); onOpenPortal(); }}>
            Downgrade instead
          </Button>
          <Button
            onClick={() => { onClose?.(); onOpenPortal(); }}
            className="bg-rose-500 hover:bg-rose-400 text-white font-bold"
          >
            Cancel via Portal <X className="w-4 h-4 ml-1" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
