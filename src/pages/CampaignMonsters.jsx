import React, { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2, Search, Swords, Skull, X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";

/**
 * Campaign Monsters tab. Shows both SRD monsters (is_system = true)
 * and custom GM-created monsters (is_system = false) in one list.
 * SRD entries get an "SRD" badge and can't be deleted; custom ones
 * get a "Custom" badge plus an edit/delete affordance.
 *
 * Clicking a row opens a stat-block dialog — traits, ability
 * scores, actions, legendary actions, reactions — pulled off the
 * monster's `stats` JSONB and rendered in the same shape as the GM
 * Panel's info panel.
 */
export default function CampaignMonsters() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const params = new URLSearchParams(window.location.search);
  const campaignId = params.get("id");
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [creating, setCreating] = useState(false);

  const { data: campaign } = useQuery({
    queryKey: ["campaign", campaignId],
    queryFn: () => base44.entities.Campaign.filter({ id: campaignId }).then((r) => r[0]),
    enabled: !!campaignId,
  });
  const isGM = !!campaign && (
    campaign.game_master_id === user?.id
    || (Array.isArray(campaign.co_dm_ids) && campaign.co_dm_ids.includes(user?.id))
  );

  // SRD monsters live campaign-less; custom ones filter by campaign.
  // Merge both into a single view and tag each row with `is_system`.
  const { data: srd = [] } = useQuery({
    queryKey: ["monsters", "srd"],
    queryFn: () => base44.entities.Monster.filter({ is_system: true }).catch(() => []),
    initialData: [],
  });
  const { data: custom = [] } = useQuery({
    queryKey: ["monsters", "campaign", campaignId],
    queryFn: () => base44.entities.Monster.filter({ campaign_id: campaignId }).catch(() => []),
    enabled: !!campaignId,
    initialData: [],
  });

  const merged = useMemo(() => {
    const byId = new Map();
    for (const row of [...srd, ...custom]) {
      if (!row?.id || byId.has(row.id)) continue;
      byId.set(row.id, row);
    }
    return Array.from(byId.values());
  }, [srd, custom]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = merged;
    if (q) {
      rows = rows.filter((m) =>
        (m.name || "").toLowerCase().includes(q)
        || (m.type || m.monster_type || "").toLowerCase().includes(q),
      );
    }
    return rows.slice().sort((a, b) => {
      const ac = crToNumber(a);
      const bc = crToNumber(b);
      if (ac !== bc) return ac - bc;
      return (a.name || "").localeCompare(b.name || "");
    });
  }, [merged, search]);

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Monster.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["monsters", "campaign", campaignId] });
      setSelected(null);
      toast.success("Monster removed.");
    },
    onError: (err) => toast.error(err?.message || "Delete failed."),
  });

  const createMutation = useMutation({
    mutationFn: (payload) => base44.entities.Monster.create({
      ...payload,
      campaign_id: campaignId,
      is_system: false,
      created_by: user?.id || null,
      created_at: new Date().toISOString(),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["monsters", "campaign", campaignId] });
      setCreating(false);
      toast.success("Custom monster saved.");
    },
    onError: (err) => toast.error(err?.message || "Save failed."),
  });

  const back = () => {
    if (!campaignId) { navigate(-1); return; }
    navigate(createPageUrl("CampaignArchives") + `?id=${campaignId}`);
  };

  return (
    <div className="min-h-screen bg-[#0f1219] text-white p-6">
      <div className="max-w-5xl mx-auto">
        <header className="flex items-center justify-between gap-3 mb-6 flex-wrap">
          <div className="flex items-center gap-3">
            <Button
              onClick={back}
              variant="outline"
              size="sm"
              className="text-[#37F2D1] border-[#37F2D1]/60 hover:bg-[#37F2D1]/10 hover:text-[#37F2D1]"
            >
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Archives
            </Button>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Skull className="w-5 h-5 text-[#37F2D1]" /> Monsters
            </h1>
          </div>
          {isGM && (
            <Button
              onClick={() => setCreating(true)}
              className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#050816] font-bold"
            >
              <Plus className="w-4 h-4 mr-1" /> New Monster
            </Button>
          )}
        </header>

        <div className="relative mb-4">
          <Search className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-slate-500" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search monsters by name or type…"
            className="pl-7 bg-[#1a1f2e] border-slate-600 text-white placeholder:text-slate-500"
          />
        </div>

        <div className="bg-[#1a1f2e] border border-slate-700/50 rounded-lg overflow-hidden">
          {filtered.length === 0 ? (
            <p className="text-sm text-slate-500 italic text-center py-12">
              No monsters match. {isGM && "Create one with the button above."}
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-[10px] uppercase tracking-widest text-slate-500 bg-[#0f1219]">
                <tr>
                  <th className="text-left px-4 py-2">Name</th>
                  <th className="text-left px-4 py-2 hidden md:table-cell">Type</th>
                  <th className="text-right px-4 py-2">CR</th>
                  <th className="text-right px-4 py-2 hidden md:table-cell">HP</th>
                  <th className="text-right px-4 py-2 hidden md:table-cell">AC</th>
                  <th className="text-right px-4 py-2">Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/30">
                {filtered.map((m) => {
                  const hp = typeof m.hit_points === "object" ? (m.hit_points?.max ?? "—") : (m.hit_points ?? m.stats?.hit_points ?? "—");
                  const ac = m.armor_class ?? m.stats?.armor_class ?? "—";
                  return (
                    <tr
                      key={m.id}
                      onClick={() => setSelected(m)}
                      className="hover:bg-[#252b3d] cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-2.5 text-white font-semibold">{m.name}</td>
                      <td className="px-4 py-2.5 text-slate-400 hidden md:table-cell">
                        {m.type || m.monster_type || "—"}
                      </td>
                      <td className="px-4 py-2.5 text-right text-amber-300 font-bold">{m.challenge_rating ?? m.cr ?? "?"}</td>
                      <td className="px-4 py-2.5 text-right text-slate-300 hidden md:table-cell">{hp}</td>
                      <td className="px-4 py-2.5 text-right text-slate-300 hidden md:table-cell">{ac}</td>
                      <td className="px-4 py-2.5 text-right">
                        {m.is_system ? (
                          <Badge variant="outline" className="text-[10px] border-slate-500 text-slate-300">SRD</Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] border-[#37F2D1]/60 text-[#37F2D1]">Custom</Badge>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <StatBlockDialog
        monster={selected}
        isGM={isGM}
        onClose={() => setSelected(null)}
        onDelete={() => {
          if (!selected) return;
          if (selected.is_system) {
            toast.error("SRD monsters can't be deleted.");
            return;
          }
          if (confirm(`Delete "${selected.name}"?`)) deleteMutation.mutate(selected.id);
        }}
      />

      <NewMonsterDialog
        open={creating}
        onClose={() => setCreating(false)}
        onSave={(payload) => createMutation.mutate(payload)}
        saving={createMutation.isPending}
      />
    </div>
  );
}

function crToNumber(m) {
  const raw = m?.challenge_rating ?? m?.cr;
  if (raw === undefined || raw === null || raw === "") return 99;
  if (typeof raw === "number") return raw;
  const s = String(raw);
  if (s.includes("/")) {
    const [a, b] = s.split("/");
    const na = Number(a), nb = Number(b);
    if (Number.isFinite(na) && Number.isFinite(nb) && nb !== 0) return na / nb;
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : 99;
}

function StatBlockDialog({ monster, isGM, onClose, onDelete }) {
  if (!monster) return null;
  const stats = monster.stats || {};
  const abilities = stats.abilities || stats.attributes || {};
  const traits = stats.traits || stats.special_abilities || stats.special_traits || monster.special_abilities || [];
  const actions = stats.actions || monster.actions || [];
  const reactions = stats.reactions || monster.reactions || [];
  const legendary = stats.legendary_actions || monster.legendary_actions || [];

  const getAbility = (key) => {
    const k = key.toLowerCase();
    const K = key.toUpperCase();
    return abilities[k] ?? abilities[K] ?? stats[k] ?? 10;
  };
  const mod = (score) => {
    const m = Math.floor((Number(score) - 10) / 2);
    return m >= 0 ? `+${m}` : `${m}`;
  };

  return (
    <Dialog open={!!monster} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-[#1a1f2e] border border-slate-700 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            <span>{monster.name}</span>
            {monster.is_system ? (
              <Badge variant="outline" className="text-[10px] border-slate-500 text-slate-300">SRD</Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] border-[#37F2D1]/60 text-[#37F2D1]">Custom</Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-4 gap-2 text-[11px] bg-[#0f1219] p-3 rounded-lg border border-slate-700">
          <Stat label="AC"    value={monster.armor_class ?? stats.armor_class ?? "—"} />
          <Stat label="HP"    value={typeof monster.hit_points === "object" ? monster.hit_points?.max : (monster.hit_points ?? stats.hit_points ?? "—")} />
          <Stat label="Speed" value={monster.speed ?? stats.speed ?? "—"} />
          <Stat label="CR"    value={monster.challenge_rating ?? monster.cr ?? "?"} accent />
        </div>

        <div className="grid grid-cols-6 gap-2">
          {["STR","DEX","CON","INT","WIS","CHA"].map((k) => (
            <div key={k} className="bg-[#0f1219] border border-slate-700 rounded p-2 text-center">
              <div className="text-[9px] uppercase tracking-widest text-amber-400 font-bold">{k}</div>
              <div className="text-white font-bold">{getAbility(k)}</div>
              <div className="text-xs text-slate-400">{mod(getAbility(k))}</div>
            </div>
          ))}
        </div>

        {traits.length > 0 && (
          <Section label="Traits" colour="text-amber-400">
            {traits.map((t, i) => (
              <Trait key={i} item={t} />
            ))}
          </Section>
        )}

        {actions.length > 0 && (
          <Section label="Actions" colour="text-red-400">
            {actions.map((a, i) => <Trait key={i} item={a} />)}
          </Section>
        )}

        {reactions.length > 0 && (
          <Section label="Reactions" colour="text-orange-400">
            {reactions.map((r, i) => <Trait key={i} item={r} />)}
          </Section>
        )}

        {legendary.length > 0 && (
          <Section label="Legendary Actions" colour="text-purple-400">
            {legendary.map((a, i) => <Trait key={i} item={a} />)}
          </Section>
        )}

        <DialogFooter>
          {isGM && !monster.is_system && (
            <Button variant="outline" onClick={onDelete} className="text-red-400 border-red-700">
              <Trash2 className="w-3 h-3 mr-1" /> Delete
            </Button>
          )}
          <Button onClick={onClose}>
            <X className="w-3 h-3 mr-1" /> Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Stat({ label, value, accent }) {
  return (
    <div className="text-center">
      <div className="text-[9px] uppercase tracking-widest text-slate-500 font-bold">{label}</div>
      <div className={`font-bold text-sm ${accent ? "text-amber-400" : "text-white"}`}>{value}</div>
    </div>
  );
}

function Section({ label, colour, children }) {
  return (
    <section>
      <p className={`text-[10px] uppercase tracking-wide mb-2 font-bold border-b border-slate-700/50 pb-1 ${colour}`}>{label}</p>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function Trait({ item }) {
  return (
    <div className="text-[11px]">
      <span className="text-white font-bold">{item.name}. </span>
      <span className="text-slate-300 leading-relaxed">{item.desc || item.description}</span>
    </div>
  );
}

function NewMonsterDialog({ open, onClose, onSave, saving }) {
  const [name, setName] = useState("");
  const [type, setType] = useState("");
  const [cr, setCr] = useState("");
  const [ac, setAc] = useState(10);
  const [hp, setHp] = useState(10);
  const [description, setDescription] = useState("");

  const reset = () => { setName(""); setType(""); setCr(""); setAc(10); setHp(10); setDescription(""); };

  const handleSave = () => {
    if (!name.trim()) { toast.error("Name the monster."); return; }
    onSave({
      name: name.trim(),
      type: type.trim() || null,
      challenge_rating: cr.trim() || null,
      armor_class: Number(ac) || 10,
      hit_points: Number(hp) || 10,
      description: description.trim() || null,
      stats: {},
    });
    reset();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-[#1a1f2e] border border-slate-700 text-white max-w-md">
        <DialogHeader>
          <DialogTitle>New Custom Monster</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs text-slate-300">Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="bg-[#0f1219] border-slate-600 text-white mt-1" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs text-slate-300">Type</Label>
              <Input value={type} onChange={(e) => setType(e.target.value)} placeholder="e.g. beast, undead"
                className="bg-[#0f1219] border-slate-600 text-white mt-1" />
            </div>
            <div>
              <Label className="text-xs text-slate-300">Challenge Rating</Label>
              <Input value={cr} onChange={(e) => setCr(e.target.value)} placeholder="e.g. 1/2, 5"
                className="bg-[#0f1219] border-slate-600 text-white mt-1" />
            </div>
            <div>
              <Label className="text-xs text-slate-300">AC</Label>
              <Input type="number" value={ac} onChange={(e) => setAc(e.target.value)}
                className="bg-[#0f1219] border-slate-600 text-white mt-1" />
            </div>
            <div>
              <Label className="text-xs text-slate-300">HP</Label>
              <Input type="number" value={hp} onChange={(e) => setHp(e.target.value)}
                className="bg-[#0f1219] border-slate-600 text-white mt-1" />
            </div>
          </div>
          <div>
            <Label className="text-xs text-slate-300">Description (optional)</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
              className="bg-[#0f1219] border-slate-600 text-white mt-1" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#050816] font-bold"
          >
            {saving ? "Saving…" : "Save Monster"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
