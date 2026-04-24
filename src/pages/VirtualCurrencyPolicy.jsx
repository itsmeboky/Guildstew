import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Scale, ShieldAlert, Wallet, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import SpiceIcon from "@/components/tavern/SpiceIcon";
import { createPageUrl } from "@/utils";
import { MIN_CASHOUT } from "@/config/spiceConfig";

/**
 * /VirtualCurrencyPolicy — disclaimer surface explaining how Spice
 * works legally. Linked from the SpiceEmporium popup
 * ("View Virtual Currency Policy") and referenced by the EULA /
 * Terms pages.
 *
 * Dark navy chrome matching the campaign / settings surfaces — this
 * is a tool/legal page, not a marketing page, so it intentionally
 * skips the cream palette the shop itself uses.
 */
export default function VirtualCurrencyPolicy() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#050816] text-slate-200">
      <div className="max-w-3xl mx-auto px-4 md:px-8 py-10 space-y-6">
        <div>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </button>
          <h1 className="text-3xl font-black mt-3 flex items-center gap-3 text-white">
            <Scale className="w-7 h-7 text-[#f59e0b]" />
            Virtual Currency Policy
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            How Spice works, what it's worth, and what it isn't.
          </p>
        </div>

        <Section icon={SpiceIcon} title="Spice is a virtual currency">
          <p>
            "Spice" is Guildstew's in-app virtual currency. It exists only
            inside Guildstew and can only be spent on Guildstew goods — dice
            skins, UI themes, character portraits, sound packs, and other
            cosmetic items sold through the Tavern marketplace.
          </p>
          <p>
            Spice has <strong>no cash value</strong>. It is not legal tender
            and is not a form of money, property, stored-value instrument, or
            security. It cannot be redeemed for cash (except via the Creator
            Program cashout described below), transferred to another
            platform, gifted between accounts, or exchanged for goods or
            services outside of Guildstew.
          </p>
        </Section>

        <Section icon={Wallet} title="Purchases and refunds">
          <p>
            Spice purchases are processed through Stripe. <strong>Unspent Spice</strong>{" "}
            that is still in your wallet may be refundable through Stripe's
            standard dispute process subject to our Terms of Service.
          </p>
          <p>
            <strong>Spent Spice is final.</strong> Once you use Spice to buy
            a cosmetic, apply a bonus, or otherwise redeem it, that
            transaction is complete and cannot be reversed. This is true
            whether you spent it yourself, shared it through a Guild wallet,
            or unlocked an item for your whole table.
          </p>
          <p>
            Bonus Spice awarded with bundles (the "+X Bonus" amounts on
            pricing cards) is promotional. It is not individually
            refundable and is consumed in the same order as paid Spice
            when you buy an item.
          </p>
        </Section>

        <Section icon={ShieldAlert} title="Expiration and account closure">
          <p>
            Spice <strong>does not expire</strong> under ordinary use. If you
            close your Guildstew account, any Spice still in your wallet is
            forfeited. We will make a reasonable effort to process unspent-
            Spice refund requests submitted before account closure.
          </p>
          <p>
            Guildstew reserves the right to freeze or reverse Spice
            transactions we reasonably believe to be fraudulent, the result
            of a chargeback, or in violation of our Terms.
          </p>
        </Section>

        <Section icon={Wallet} title="Creator cashouts">
          <p>
            Members of the Creator Program can convert earned Spice — Spice
            you receive from sales of your own Tavern listings — to real
            money via Stripe. The minimum cashout balance is{" "}
            <strong className="inline-flex items-center gap-1">
              <SpiceIcon size={14} color="#f59e0b" />
              {MIN_CASHOUT.toLocaleString()} Spice
            </strong>{" "}
            (approximately $50 USD). Stripe processing fees are deducted from
            the payout; Guildstew does not charge an additional platform fee
            on cashouts.
          </p>
          <p>
            Purchased Spice (Spice you bought with money) is NOT eligible for
            cashout. Only Spice earned from creator sales can be redeemed for
            cash.
          </p>
        </Section>

        <Section icon={XCircle} title="No secondary market">
          <p>
            Spice, Spice-purchased cosmetics, and account access are
            non-transferable. Selling or trading accounts, gifting Spice
            between users, or listing Spice or Spice-funded cosmetics on
            third-party marketplaces is prohibited.
          </p>
        </Section>

        <div className="text-xs text-slate-500 pt-4">
          This policy is part of Guildstew's{" "}
          <button
            type="button"
            onClick={() => navigate(createPageUrl("Terms"))}
            className="underline text-slate-300 hover:text-white"
          >
            Terms of Service
          </button>
          . For refund requests or disputes, open a{" "}
          <button
            type="button"
            onClick={() => navigate(createPageUrl("SupportTicket"))}
            className="underline text-slate-300 hover:text-white"
          >
            support ticket
          </button>
          .
        </div>

        <div className="pt-2">
          <Button
            onClick={() => navigate(-1)}
            className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#050816] font-bold"
          >
            I understand — return to Guildstew
          </Button>
        </div>
      </div>
    </div>
  );
}

function Section({ icon: Icon, title, children }) {
  return (
    <section className="bg-[#1E2430] border border-slate-700 rounded-lg p-5 space-y-2">
      <h2 className="text-base font-black text-white flex items-center gap-2">
        {Icon ? <Icon className="w-4 h-4 text-[#f59e0b]" color="#f59e0b" size={16} /> : null}
        {title}
      </h2>
      <div className="text-sm text-slate-300 leading-relaxed space-y-2">
        {children}
      </div>
    </section>
  );
}
