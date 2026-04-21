import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CreditCard } from "lucide-react";
import { createPageUrl } from "@/utils";

/**
 * /account/billing shortcut.
 *
 * Billing + payment-method management already lives on the
 * Settings page under the `?tab=subscription` query string. Rather
 * than duplicating that UI we route the user there and preserve
 * the sidebar link so billing has a top-level entry.
 */
export default function AccountBilling() {
  return (
    <div className="min-h-screen bg-[#050816] text-white flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#1E2430] border border-[#2a3441] mb-4">
          <CreditCard className="w-8 h-8 text-[#37F2D1]" />
        </div>
        <h1 className="text-3xl font-black text-white">Billing & Payments</h1>
        <p className="text-sm text-slate-400 mt-2">
          Your current plan, billing history, and payment method are managed in Settings.
        </p>
        <Link
          to={createPageUrl("Settings") + "?tab=subscription"}
          className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-[#37F2D1] text-[#050816] font-bold rounded-lg hover:bg-[#2dd9bd] transition-colors"
        >
          Open Subscription Settings <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
