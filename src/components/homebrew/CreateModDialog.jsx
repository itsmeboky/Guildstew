import React, { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Sparkles, ShieldHalf, Package, Code2, Wand2 } from "lucide-react";
import { useSubscription } from "@/lib/SubscriptionContext";
import { tierAtLeast } from "@/api/billingClient";
import CreateRaceModDialog from "./CreateRaceModDialog";
import CreateClassModDialog from "./CreateClassModDialog";
import CreateReskinModDialog from "./CreateReskinModDialog";

/**
 * Brewery → Create New Mod entry point.
 *
 * The Brewery's mod scope is intentionally narrow: races, classes,
 * pre-bundled content packs, and code mods. Per-campaign homebrew
 * (custom monster, custom item, custom spell, custom class feature,
 * single-toggle rule changes) lives outside the Brewery — those use
 * CreateHomebrewDialog from the campaign pages and HouseRulesPanel
 * for toggles.
 *
 * Picking a type here closes the chooser and opens the matching
 * creator. Race + Class dialogs already exist; Content Pack +
 * Code Mod open a "coming soon" toast in the chooser callback for
 * now (their full creators land in their own follow-up parts).
 */

const MOD_TYPES = [
  {
    value: "race",
    label: "Race",
    icon: Sparkles,
    description: "A new playable race with abilities, traits, and subraces.",
    veteranOnly: false,
  },
  {
    value: "class",
    label: "Class",
    icon: ShieldHalf,
    description: "A new playable class with features, subclasses, and an optional resource.",
    veteranOnly: false,
  },
  {
    value: "content_pack",
    label: "Content Pack",
    icon: Package,
    description: "Bundle pre-made monsters, items, spells, and class features for others to install.",
    veteranOnly: false,
  },
  {
    value: "reskin",
    label: "Reskin",
    icon: Wand2,
    description: "Rename game terms (HP → Wounds, STR → Might) without changing any math. Pick a genre preset to start.",
    veteranOnly: false,
  },
  {
    value: "code_mod",
    label: "Code Mod",
    icon: Code2,
    description: "Custom triggers and formulas. Veteran tier required.",
    veteranOnly: true,
  },
];

export default function CreateModDialog({ open, onClose }) {
  const sub = useSubscription();
  const tier = sub?.tier || "free";
  const isVeteran = tierAtLeast(tier, "veteran");

  const [openType, setOpenType] = useState(null);

  const pick = (type) => {
    if (type.veteranOnly && !isVeteran) return;
    setOpenType(type.value);
  };

  const closeChild = () => {
    setOpenType(null);
    onClose?.();
  };

  return (
    <>
      <Dialog open={open && !openType} onOpenChange={(isOpen) => { if (!isOpen) onClose?.(); }}>
        <DialogContent className="bg-[#1E2430] border border-gray-700 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create a Brewery Mod</DialogTitle>
            <DialogDescription className="text-slate-400">
              Mods change the game's systems or ship bundled content. For per-campaign tweaks
              (custom monsters / items / spells, banned spells / classes, house rules) use
              your campaign's Homebrew or House Rules pages instead.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
            {MOD_TYPES.map((t) => {
              const Icon = t.icon;
              const locked = t.veteranOnly && !isVeteran;
              return (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => pick(t)}
                  disabled={locked}
                  className={`text-left p-4 rounded-lg border transition-colors ${
                    locked
                      ? "bg-[#050816] border-slate-800 opacity-60 cursor-not-allowed"
                      : "bg-[#050816] border-slate-700 hover:border-[#37F2D1]/60"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className="w-5 h-5 text-[#37F2D1]" />
                    <span className="text-base font-bold text-white">{t.label}</span>
                    {t.veteranOnly && (
                      <span className="text-[9px] uppercase tracking-widest text-amber-300 ml-auto">
                        Veteran+
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400">{t.description}</p>
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Race + Class creators hand back through onClose; the
          parent decides whether to reopen the chooser or close the
          flow entirely. We close everything so a successful save
          returns the user to the Brewery page. */}
      <CreateRaceModDialog
        open={openType === "race"}
        onClose={closeChild}
      />
      <CreateClassModDialog
        open={openType === "class"}
        onClose={closeChild}
      />
      <CreateReskinModDialog
        open={openType === "reskin"}
        onClose={closeChild}
      />

      {/* Content Pack creator + Code Mod creator land in their own
          parts. Until then the picker still closes cleanly. */}
      {openType === "content_pack" && (
        <ComingSoonDialog
          title="Content Pack creator"
          note="The bundled-monsters / items / spells / features creator lands in a follow-up part. The install + uninstall pipeline is already wired, so packs published from the API can be installed now."
          onClose={closeChild}
        />
      )}
      {openType === "code_mod" && (
        <ComingSoonDialog
          title="Code Mod creator"
          note="Custom triggers and formulas land in a follow-up part. The mod engine's validateFormula already gates against unsafe expressions — the editor + signing flow is the missing piece."
          onClose={closeChild}
        />
      )}
    </>
  );
}

function ComingSoonDialog({ title, note, onClose }) {
  return (
    <Dialog open={true} onOpenChange={(isOpen) => { if (!isOpen) onClose?.(); }}>
      <DialogContent className="bg-[#1E2430] border border-gray-700 text-white max-w-md">
        <DialogHeader>
          <DialogTitle>{title} — coming soon</DialogTitle>
          <DialogDescription className="text-slate-400">
            {note}
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
