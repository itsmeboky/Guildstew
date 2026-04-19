import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FlaskConical, Power, PowerOff, Trash2, ChevronUp, ChevronDown, AlertCircle, ExternalLink,
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import {
  loadCampaignMods,
  uninstallMod,
  forceUninstallMod,
  setModStatus,
  setModPriority,
  validateInstalledMods,
} from "@/lib/modEngine";
import { supabase } from "@/api/supabaseClient";

/**
 * Campaign Settings — Brewery Mods manager.
 *
 * Lists every install row (`campaign_installed_mods`) with type badge,
 * pinned version, status dot, and priority controls. Per-mod actions:
 * enable/disable toggle, uninstall (with dependency warning), update
 * to the latest version on the underlying `brewery_mods` row when one
 * is available. A Validate button runs `validateInstalledMods` which
 * flips broken mods to status=error so the session-start gate can
 * surface them.
 */
export default function BreweryModsPanel({ campaignId, canEdit = true }) {
  const queryClient = useQueryClient();
  const [uninstallPrompt, setUninstallPrompt] = useState(null);

  const { data: installed = [], isLoading } = useQuery({
    queryKey: ["campaignInstalledMods", campaignId],
    queryFn: () => loadCampaignMods(campaignId),
    enabled: !!campaignId,
    initialData: [],
  });

  // Pull the catalog rows for each installed mod so the "update available"
  // badge + type label work without a second refetch.
  const modIds = installed.map((i) => i.mod_id).filter(Boolean);
  const { data: catalogMods = [] } = useQuery({
    queryKey: ["breweryCatalog", modIds.sort().join(",")],
    queryFn: async () => {
      if (modIds.length === 0) return [];
      const { data } = await supabase.from("brewery_mods").select("*").in("id", modIds);
      return data || [];
    },
    enabled: modIds.length > 0,
    initialData: [],
  });
  const catalogById = new Map(catalogMods.map((m) => [m.id, m]));

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["campaignInstalledMods", campaignId] });
  };

  const toggleStatus = useMutation({
    mutationFn: async ({ modId, nextStatus }) => setModStatus(campaignId, modId, nextStatus),
    onSuccess: () => { refresh(); toast.success("Mod status updated."); },
    onError: (err) => toast.error(err?.message || "Couldn't update mod"),
  });

  const priorityMutation = useMutation({
    mutationFn: async ({ modId, priority }) => setModPriority(campaignId, modId, priority),
    onSuccess: refresh,
    onError: (err) => toast.error(err?.message || "Couldn't reorder mod"),
  });

  const uninstall = useMutation({
    mutationFn: async ({ modId }) => uninstallMod(campaignId, modId),
    onSuccess: (res, vars) => {
      if (!res.success && res.warning) {
        setUninstallPrompt({ modId: vars.modId, message: res.message, affected: res.affected_characters });
        return;
      }
      if (!res.success) {
        toast.error(res.reason || "Uninstall failed");
        return;
      }
      refresh();
      toast.success("Mod uninstalled");
    },
  });

  const forceUninstall = useMutation({
    mutationFn: async ({ modId }) => forceUninstallMod(campaignId, modId),
    onSuccess: () => {
      refresh();
      toast.success("Mod uninstalled");
      setUninstallPrompt(null);
    },
  });

  const validate = useMutation({
    mutationFn: async () => validateInstalledMods(campaignId),
    onSuccess: (errors) => {
      refresh();
      if (errors.length === 0) toast.success("All mods validated clean.");
      else toast.error(`${errors.length} mod(s) have errors — open each to see details.`);
    },
  });

  const updateMod = useMutation({
    mutationFn: async ({ install, catalog }) => {
      await supabase
        .from("campaign_installed_mods")
        .update({
          installed_version: catalog.version || "1.0.0",
          pinned_patches: catalog.patches || [],
          pinned_metadata: {
            ...(catalog.metadata || {}),
            mod_type: catalog.mod_type,
            name: catalog.name,
          },
          status: "active",
          error_message: null,
        })
        .eq("id", install.id);
    },
    onSuccess: () => { refresh(); toast.success("Mod updated to latest version."); },
    onError: (err) => toast.error(err?.message || "Update failed"),
  });

  const sorted = [...installed].sort((a, b) => (a.priority || 0) - (b.priority || 0));

  return (
    <div className="bg-[#2A3441] rounded-xl p-6 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold mb-1 flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-[#37F2D1]" /> Brewery Mods
          </h2>
          <p className="text-sm text-slate-400">
            Installed mods patch this campaign's rules, races, classes, and combat formulas.
            Uninstall to roll back; the base rules are always recoverable.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => validate.mutate()}
            disabled={validate.isPending}
          >
            {validate.isPending ? "Validating…" : "Validate Mods"}
          </Button>
          <Link
            to={createPageUrl("Brewery")}
            className="text-xs text-[#37F2D1] border border-[#37F2D1]/40 hover:bg-[#37F2D1]/10 rounded px-3 py-1.5 inline-flex items-center gap-1"
          >
            Browse Brewery <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {isLoading ? (
        <p className="text-xs text-slate-500 italic">Loading installed mods…</p>
      ) : sorted.length === 0 ? (
        <p className="text-xs text-slate-500 italic py-2">
          No mods installed. Browse The Brewery to add races, classes, variant rules, and more.
        </p>
      ) : (
        <div className="space-y-2">
          {sorted.map((install, idx) => {
            const catalog = catalogById.get(install.mod_id);
            const updateAvailable =
              catalog && catalog.version && catalog.version !== install.installed_version;
            const errored = install.status === "error";
            const disabled = install.status === "disabled";
            const statusDot =
              errored  ? "bg-red-500" :
              disabled ? "bg-amber-400" :
              "bg-emerald-400";
            return (
              <div
                key={install.id}
                className={`bg-[#1E2430] border rounded-lg p-3 ${errored ? "border-red-500/60" : "border-[#111827]"}`}
              >
                <div className="flex items-start gap-3 flex-wrap">
                  <span className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${statusDot}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-bold text-white truncate">
                        {install.pinned_metadata?.name || "Unknown mod"}
                      </h3>
                      <Badge variant="outline" className="text-[9px] uppercase tracking-widest text-slate-300 border-slate-600">
                        {install.pinned_metadata?.mod_type || "mod"}
                      </Badge>
                      <span className="text-[10px] text-slate-500">v{install.installed_version}</span>
                      {updateAvailable && (
                        <Badge className="text-[9px] bg-[#37F2D1]/20 text-[#37F2D1] border border-[#37F2D1]/40">
                          Update → v{catalog.version}
                        </Badge>
                      )}
                    </div>
                    {errored && install.error_message && (
                      <div className="mt-1 text-[11px] text-red-300 flex items-start gap-1">
                        <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                        <span>{install.error_message}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      title="Move up"
                      disabled={!canEdit || idx === 0}
                      onClick={() =>
                        priorityMutation.mutate({
                          modId: install.mod_id,
                          priority: (install.priority || 0) - 1,
                        })
                      }
                      className="p-1 text-slate-400 hover:text-white disabled:opacity-30"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      title="Move down"
                      disabled={!canEdit || idx === sorted.length - 1}
                      onClick={() =>
                        priorityMutation.mutate({
                          modId: install.mod_id,
                          priority: (install.priority || 0) + 1,
                        })
                      }
                      className="p-1 text-slate-400 hover:text-white disabled:opacity-30"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                    {updateAvailable && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={!canEdit || updateMod.isPending}
                        onClick={() => updateMod.mutate({ install, catalog })}
                        className="text-xs"
                      >
                        Update
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={!canEdit || toggleStatus.isPending}
                      onClick={() =>
                        toggleStatus.mutate({
                          modId: install.mod_id,
                          nextStatus: disabled ? "active" : "disabled",
                        })
                      }
                      className={disabled ? "text-emerald-300" : "text-amber-300"}
                    >
                      {disabled ? <Power className="w-3 h-3 mr-1" /> : <PowerOff className="w-3 h-3 mr-1" />}
                      {disabled ? "Enable" : "Disable"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={!canEdit || uninstall.isPending}
                      onClick={() => uninstall.mutate({ modId: install.mod_id })}
                      className="text-red-400"
                    >
                      <Trash2 className="w-3 h-3 mr-1" /> Uninstall
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <AlertDialog
        open={!!uninstallPrompt}
        onOpenChange={(o) => { if (!o) setUninstallPrompt(null); }}
      >
        <AlertDialogContent className="bg-[#1E2430] border border-gray-700 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Characters depend on this mod</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              {uninstallPrompt?.message}
              {Array.isArray(uninstallPrompt?.affected) && uninstallPrompt.affected.length > 0 && (
                <ul className="list-disc list-inside mt-2 text-rose-300">
                  {uninstallPrompt.affected.map((name, i) => (<li key={i}>{name}</li>))}
                </ul>
              )}
              <span className="block mt-2">Uninstalling may break those characters. Continue?</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-gray-600 text-white hover:bg-gray-800 hover:text-white">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => uninstallPrompt && forceUninstall.mutate({ modId: uninstallPrompt.modId })}
              className="bg-red-600 hover:bg-red-500 text-white"
            >
              Force Uninstall
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
