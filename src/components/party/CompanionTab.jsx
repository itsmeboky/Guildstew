import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { uploadFile } from "@/utils/uploadFile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Pencil, Trash2, Plus, X, Save, Shield, Footprints, Heart, Upload,
} from "lucide-react";

const TYPES = [
  { value: "Pet",               cls: "bg-orange-500/20 text-orange-300 border-orange-500/40" },
  { value: "Familiar",          cls: "bg-purple-500/20 text-purple-300 border-purple-500/40" },
  { value: "Mount",             cls: "bg-amber-500/20 text-amber-300 border-amber-500/40" },
  { value: "Animal Companion",  cls: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" },
];
const TYPE_MAP = Object.fromEntries(TYPES.map((t) => [t.value, t]));

function uid() {
  return `comp_${Math.random().toString(36).slice(2, 10)}`;
}

export default function CompanionTab({ character, canEdit }) {
  const queryClient = useQueryClient();
  const companions = Array.isArray(character?.companions) ? character.companions : [];
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const writeMutation = useMutation({
    mutationFn: async (next) => base44.entities.Character.update(character.id, { companions: next }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaignCharacters", character.campaign_id] });
    },
    onError: (err) => toast.error(err?.message || "Couldn't save that companion."),
  });

  const persist = (next) => writeMutation.mutate(next);

  const addOne = (entry) => { persist([...companions, { id: uid(), ...entry }]); setAdding(false); };
  const updateOne = (id, patch) => {
    persist(companions.map((c) => (c.id === id ? { ...c, ...patch } : c)));
    setEditingId(null);
  };
  const removeOne = (id) => {
    if (!confirm("Remove this companion?")) return;
    persist(companions.filter((c) => c.id !== id));
  };

  return (
    <div className="space-y-3">
      {canEdit && !adding && (
        <div className="flex justify-end">
          <Button
            size="sm"
            onClick={() => setAdding(true)}
            className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#050816] font-bold"
          >
            <Plus className="w-3 h-3 mr-1" /> Add Companion
          </Button>
        </div>
      )}

      {adding && (
        <CompanionForm
          onCancel={() => setAdding(false)}
          onSave={addOne}
        />
      )}

      {companions.length === 0 && !adding && (
        <div className="bg-[#0b1220] border border-[#1e293b] rounded-xl p-8 text-center text-slate-500 text-sm">
          No companions yet.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {companions.map((c) =>
          editingId === c.id ? (
            <CompanionForm
              key={c.id}
              value={c}
              onCancel={() => setEditingId(null)}
              onSave={(entry) => updateOne(c.id, entry)}
            />
          ) : (
            <CompanionCard
              key={c.id}
              companion={c}
              canEdit={canEdit}
              onEdit={() => setEditingId(c.id)}
              onRemove={() => removeOne(c.id)}
            />
          ),
        )}
      </div>
    </div>
  );
}

function CompanionCard({ companion: c, canEdit, onEdit, onRemove }) {
  const typeStyle = TYPE_MAP[c.type] || TYPE_MAP.Pet;
  const hp = Number(c.hp) || 0;
  const maxHp = Number(c.max_hp ?? c.maxHp ?? hp) || 0;
  const hpPct = maxHp > 0 ? Math.round((hp / maxHp) * 100) : 0;

  return (
    <div className="bg-[#0b1220] border border-[#1e293b] rounded-xl p-3">
      <div className="flex items-start gap-3">
        {c.portrait_url ? (
          <img src={c.portrait_url} alt="" className="w-20 h-20 rounded-lg object-cover flex-shrink-0" />
        ) : (
          <div className="w-20 h-20 rounded-lg bg-slate-800 flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="text-base font-bold text-white truncate">{c.name || "Unnamed"}</div>
            <Badge variant="outline" className={`text-[10px] ${typeStyle.cls}`}>{c.type || "Pet"}</Badge>
          </div>
          <div className="text-[11px] text-slate-400">{c.species || ""}</div>

          <div className="grid grid-cols-3 gap-2 mt-2 text-[11px]">
            <StatBox icon={Heart} label="HP" value={`${hp}/${maxHp || "?"}`} color="#ef4444" />
            <StatBox icon={Shield} label="AC" value={c.ac ?? "—"} color="#3b82f6" />
            <StatBox icon={Footprints} label="Speed" value={c.speed ? `${c.speed} ft` : "—"} color="#22c55e" />
          </div>

          {maxHp > 0 && (
            <div className="h-1.5 bg-slate-800 rounded-full mt-2 overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{ width: `${hpPct}%`, backgroundColor: hpPct > 40 ? "#22c55e" : "#ef4444" }}
              />
            </div>
          )}

          {c.description && (
            <p className="text-xs text-slate-300 mt-2 whitespace-pre-wrap leading-relaxed">{c.description}</p>
          )}

          {Array.isArray(c.abilities) && c.abilities.length > 0 && (
            <div className="mt-3">
              <div className="text-[10px] uppercase tracking-widest text-amber-400 font-bold mb-1">Abilities</div>
              <ul className="space-y-1">
                {c.abilities.map((a, idx) => (
                  <li key={idx} className="text-[11px]">
                    <span className="text-white font-bold">{a.name}. </span>
                    <span className="text-slate-300">{a.desc || a.description}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        {canEdit && (
          <div className="flex flex-col gap-1">
            <button onClick={onEdit} className="p-1 rounded hover:bg-[#1e293b] text-slate-300" title="Edit">
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button onClick={onRemove} className="p-1 rounded hover:bg-red-500/20 text-red-400" title="Remove">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function StatBox({ icon: Icon, label, value, color }) {
  return (
    <div className="bg-[#050816] border border-[#1e293b] rounded p-1.5 text-center">
      <Icon className="w-3 h-3 mx-auto" style={{ color }} />
      <div className="text-[9px] uppercase tracking-widest text-slate-500 font-bold">{label}</div>
      <div className="text-xs text-white font-bold">{value}</div>
    </div>
  );
}

function CompanionForm({ value, onSave, onCancel }) {
  const [name, setName] = useState(value?.name || "");
  const [species, setSpecies] = useState(value?.species || "");
  const [type, setType] = useState(value?.type || "Pet");
  const [hp, setHp] = useState(value?.hp ?? 0);
  const [maxHp, setMaxHp] = useState(value?.max_hp ?? value?.maxHp ?? 0);
  const [ac, setAc] = useState(value?.ac ?? 10);
  const [speed, setSpeed] = useState(value?.speed ?? 30);
  const [description, setDescription] = useState(value?.description || "");
  const [portraitUrl, setPortraitUrl] = useState(value?.portrait_url || "");
  const [abilities, setAbilities] = useState(Array.isArray(value?.abilities) ? value.abilities : []);
  const [uploading, setUploading] = useState(false);

  const handleImage = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await uploadFile(file, "avatars", "companions");
      setPortraitUrl(file_url);
    } catch (err) {
      toast.error(err?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const addAbility = () => setAbilities([...abilities, { name: "", desc: "" }]);
  const updateAbility = (i, patch) => setAbilities(abilities.map((a, idx) => (idx === i ? { ...a, ...patch } : a)));
  const removeAbility = (i) => setAbilities(abilities.filter((_, idx) => idx !== i));

  const handleSave = () => {
    if (!name.trim()) { toast.error("Name your companion."); return; }
    onSave({
      name: name.trim(),
      species: species.trim(),
      type,
      hp: Number(hp) || 0,
      max_hp: Number(maxHp) || 0,
      ac: Number(ac) || 10,
      speed: Number(speed) || 30,
      description: description.trim(),
      portrait_url: portraitUrl || null,
      abilities: abilities
        .map((a) => ({ name: (a.name || "").trim(), desc: (a.desc || "").trim() }))
        .filter((a) => a.name),
    });
  };

  return (
    <div className="bg-[#0b1220] border border-[#37F2D1]/40 rounded-xl p-3 space-y-2 col-span-1 md:col-span-2">
      <div className="flex items-start gap-3">
        <div className="flex flex-col items-center gap-2 flex-shrink-0">
          {portraitUrl ? (
            <img src={portraitUrl} alt="" className="w-20 h-20 rounded-lg object-cover" />
          ) : (
            <div className="w-20 h-20 rounded-lg bg-slate-800" />
          )}
          <label className="inline-flex items-center gap-1 text-[10px] text-slate-300 cursor-pointer bg-[#050816] border border-slate-700 px-2 py-1 rounded hover:border-[#37F2D1]">
            <Upload className="w-3 h-3" />
            {uploading ? "Uploading…" : "Portrait"}
            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImage(e.target.files?.[0])} disabled={uploading} />
          </label>
        </div>
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-2">
          <Field label="Name">
            <Input value={name} onChange={(e) => setName(e.target.value)} className="bg-[#050816] border-slate-700 text-white h-9 text-xs" />
          </Field>
          <Field label="Species">
            <Input value={species} onChange={(e) => setSpecies(e.target.value)} placeholder="e.g. Wolf, Imp, Warhorse" className="bg-[#050816] border-slate-700 text-white h-9 text-xs" />
          </Field>
          <Field label="Type">
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="bg-[#050816] border-slate-700 text-white h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.value}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <div className="grid grid-cols-4 gap-2">
            <Field label="HP"><Input type="number" value={hp} onChange={(e) => setHp(e.target.value)} className="bg-[#050816] border-slate-700 text-white h-9 text-xs" /></Field>
            <Field label="Max"><Input type="number" value={maxHp} onChange={(e) => setMaxHp(e.target.value)} className="bg-[#050816] border-slate-700 text-white h-9 text-xs" /></Field>
            <Field label="AC"><Input type="number" value={ac} onChange={(e) => setAc(e.target.value)} className="bg-[#050816] border-slate-700 text-white h-9 text-xs" /></Field>
            <Field label="Speed"><Input type="number" value={speed} onChange={(e) => setSpeed(e.target.value)} className="bg-[#050816] border-slate-700 text-white h-9 text-xs" /></Field>
          </div>
        </div>
      </div>

      <Field label="Description">
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="bg-[#050816] border-slate-700 text-white text-xs" />
      </Field>

      <div>
        <div className="flex items-center justify-between">
          <Label className="text-[10px] uppercase tracking-widest text-slate-400">Abilities</Label>
          <Button size="sm" variant="outline" onClick={addAbility} className="text-xs h-7">
            <Plus className="w-3 h-3 mr-1" /> Add
          </Button>
        </div>
        <div className="space-y-2 mt-2">
          {abilities.map((a, i) => (
            <div key={i} className="grid grid-cols-[1fr,2fr,auto] gap-2 items-center">
              <Input
                value={a.name}
                onChange={(e) => updateAbility(i, { name: e.target.value })}
                placeholder="Keen Smell"
                className="bg-[#050816] border-slate-700 text-white h-8 text-xs"
              />
              <Input
                value={a.desc}
                onChange={(e) => updateAbility(i, { desc: e.target.value })}
                placeholder="Advantage on Perception checks using smell."
                className="bg-[#050816] border-slate-700 text-white h-8 text-xs"
              />
              <button onClick={() => removeAbility(i)} className="p-1 text-red-400 hover:bg-red-500/20 rounded">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 pt-1">
        <Button variant="outline" size="sm" onClick={onCancel}>
          <X className="w-3 h-3 mr-1" /> Cancel
        </Button>
        <Button
          size="sm"
          onClick={handleSave}
          className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#050816] font-bold"
        >
          <Save className="w-3 h-3 mr-1" /> Save
        </Button>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <Label className="text-[10px] uppercase tracking-widest text-slate-400">{label}</Label>
      {children}
    </div>
  );
}
