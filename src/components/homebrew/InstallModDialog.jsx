import React, { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { AlertTriangle, Code2 } from "lucide-react";
import { installMod } from "@/lib/modEngine";
import { useSubscription } from "@/lib/SubscriptionContext";
import { tierAtLeast } from "@/api/billingClient";

/**
 * Shared install confirmation.
 *
 * Handles the two install quirks that other mod types don't have:
 *
 *   1. Code mods show a rose warning banner — "This mod uses
 *      custom formulas. If errors occur, disable or uninstall it
 *      in Campaign Settings → Brewery Mods." — plus a tier check:
 *      installing code mods requires Adventurer+ (creation is
 *      Veteran+; installation is one tier looser so players can
 *      use what others make).
 *
 *   2. Code mods with `config_schema` render a values form before
 *      the Install button so the GM can tune the author's
 *      configurable parameters; defaults pre-populate.
 *
 * Every other mod type (race / class / reskin / sheet_mod /
 * content_pack) passes through with the standard description
 * preview + Install button.
 */
export default function InstallModDialog({ open, onClose, mod, campaignId, userId }) {
  const queryClient = useQueryClient();
  const sub = useSubscription();
  const tier = sub?.tier || "free";
  const isCodeMod = mod?.mod_type === "code_mod";
  const canInstallCodeMod = tierAtLeast(tier, "adventurer");

  const schema = Array.isArray(mod?.metadata?.config_schema) ? mod.metadata.config_schema : [];
  const [configValues, setConfigValues] = useState({});

  useEffect(() => {
    if (!open) return;
    const defaults = {};
    for (const p of schema) {
      if (!p?.key) continue;
      defaults[p.key] = p.default;
    }
    setConfigValues(defaults);
  }, [open, mod?.id]);

  const setParam = (key, value) =>
    setConfigValues((v) => ({ ...v, [key]: value }));

  const installMutation = useMutation({
    mutationFn: async () => {
      if (!mod?.id || !campaignId || !userId) {
        throw new Error("Missing mod, campaign, or user.");
      }
      if (isCodeMod && !canInstallCodeMod) {
        throw new Error("Installing code mods requires an Adventurer subscription or higher.");
      }
      const result = await installMod(campaignId, mod.id, userId, {
        configValues: isCodeMod ? configValues : undefined,
      });
      if (!result.success) {
        throw new Error(result.reason || "Install failed.");
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaignInstalledMods", campaignId] });
      toast.success(`${mod?.name || "Mod"} installed.`);
      onClose?.();
    },
    onError: (err) => toast.error(err?.message || "Install failed."),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose?.(); }}>
      <DialogContent className="bg-[#1E2430] border border-gray-700 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isCodeMod && <Code2 className="w-5 h-5 text-[#37F2D1]" />}
            Install {mod?.name || "Mod"}
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            {mod?.description || "Review the mod details before installing."}
          </DialogDescription>
        </DialogHeader>

        {isCodeMod && (
          <div className="bg-rose-500/10 border border-rose-500/40 rounded-lg p-3 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-300 mt-0.5 shrink-0" />
            <p className="text-[11px] text-rose-100">
              This mod uses custom formulas. If it causes errors, you can disable or uninstall it
              in <strong>Campaign Settings → Brewery Mods</strong>. A broken formula flips the
              mod to an error state and blocks session start until it's disabled.
            </p>
          </div>
        )}

        {isCodeMod && !canInstallCodeMod && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-300 mt-0.5 shrink-0" />
            <p className="text-[11px] text-amber-100">
              Installing code mods requires an <strong>Adventurer</strong> subscription or higher.
              Upgrade to use this mod.
            </p>
          </div>
        )}

        {isCodeMod && (
          <TriggerSummary triggers={mod?.metadata?.triggers || []} />
        )}

        {isCodeMod && schema.length > 0 && (
          <div className="bg-[#0b1220] border border-[#1e293b] rounded-xl p-4 space-y-3">
            <h3 className="text-sm font-black uppercase tracking-wider text-[#37F2D1]">
              Configure
            </h3>
            <p className="text-[11px] text-slate-500 -mt-1">
              Parameters the author exposed for you to tune before install.
            </p>
            {schema.map((p) => (
              <ConfigParamField
                key={p.key}
                param={p}
                value={configValues[p.key]}
                onChange={(v) => setParam(p.key, v)}
              />
            ))}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => installMutation.mutate()}
            disabled={installMutation.isPending || (isCodeMod && !canInstallCodeMod)}
            className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#050816] font-bold disabled:opacity-50"
          >
            {installMutation.isPending ? "Installing…" : "Install to Campaign"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TriggerSummary({ triggers }) {
  if (!triggers || triggers.length === 0) return null;
  return (
    <div className="bg-[#050816] border border-slate-700 rounded-lg p-3">
      <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-2">
        Triggers ({triggers.length})
      </p>
      <ul className="space-y-1.5">
        {triggers.map((t, i) => (
          <li key={t.id || i} className="text-xs">
            <span className="text-[#37F2D1] font-bold">{t.name || `Trigger ${i + 1}`}</span>
            <span className="text-slate-500"> · {t.event?.replace(/_/g, " ") || "event"}</span>
            {t.effect?.type && (
              <span className="text-slate-500"> → {t.effect.type.replace(/_/g, " ")}</span>
            )}
            {t.description && (
              <div className="text-[11px] text-slate-400 mt-0.5">{t.description}</div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ConfigParamField({ param, value, onChange }) {
  const { key, label, type, options, min, max } = param || {};
  if (type === "boolean") {
    return (
      <div className="flex items-center justify-between">
        <Label className="text-xs text-slate-300">{label || key}</Label>
        <Switch checked={!!value} onCheckedChange={onChange} />
      </div>
    );
  }
  if (type === "select") {
    const opts = Array.isArray(options) ? options : [];
    return (
      <div>
        <Label className="text-xs text-slate-300 mb-1 block">{label || key}</Label>
        <Select value={value != null ? String(value) : ""} onValueChange={onChange}>
          <SelectTrigger className="bg-[#050816] border-slate-700 text-white"><SelectValue /></SelectTrigger>
          <SelectContent>
            {opts.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    );
  }
  if (type === "number") {
    return (
      <div>
        <Label className="text-xs text-slate-300 mb-1 block">{label || key}</Label>
        <Input
          type="number"
          value={value ?? 0}
          min={min}
          max={max}
          onChange={(e) => onChange(Number(e.target.value) || 0)}
          className="bg-[#050816] border-slate-700 text-white"
        />
        {(min != null || max != null) && (
          <p className="text-[10px] text-slate-500 mt-1">
            Range: {min ?? "—"} to {max ?? "—"}
          </p>
        )}
      </div>
    );
  }
  return (
    <div>
      <Label className="text-xs text-slate-300 mb-1 block">{label || key}</Label>
      <Input
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className="bg-[#050816] border-slate-700 text-white"
      />
    </div>
  );
}
