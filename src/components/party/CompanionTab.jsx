import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
  { value: "Beast",     cls: "bg-orange-500/20 text-orange-300 border-orange-500/40" },
  { value: "Familiar",  cls: "bg-purple-500/20 text-purple-300 border-purple-500/40" },
  { value: "Mount",     cls: "bg-amber-500/20 text-amber-300 border-amber-500/40" },
  { value: "Summon",    cls: "bg-blue-500/20 text-blue-300 border-blue-500/40" },
  { value: "Other",     cls: "bg-slate-500/20 text-slate-300 border-slate-500/40" },
];
const TYPE_MAP = Object.fromEntries(TYPES.map((t) => [t.value, t]));

/**
 * Companions persist in the `companions` table now, not as a
 * JSONB array on the character row. Each row carries name, type,
 * description, stats JSONB (species / ac / speed / abilities),
 * image_url, hp_current, hp_max. The Adventuring Party panel is
 * the only surface that reads/writes them; deletion cascades when
 * the owning character is removed.
 */
export default function CompanionTab({ character, canEdit }) {
  const queryClient = useQueryClient();

  const { data: companions = [] } = useQuery({
    queryKey: ["companions", character?.id],
    queryFn: () => base44.entities.Companion
      .filter({ character_id: character.id })
      .catch(() => []),
    enabled: !!character?.id,
    initialData: [],
  });

  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["companions", character?.id] });
  };

  const addMutation = useMutation({
    mutationFn: (entry) => base44.entities.Companion.create({
      campaign_id: character.campaign_id,
      character_id: character.id,
      name: entry.name,
      type: entry.type,
      description: entry.description,
      hp_current: entry.hp_current,
      hp_max: entry.hp_max,
      image_url: entry.image_url,
      stats: entry.stats || {},
    }),
    onSuccess: () => { invalidate(); setAdding(false); toast.success("Companion added."); },
    onError: (err) => toast.error(err?.message || "Couldn't save that companion."),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, patch }) => base44.entities.Companion.update(id, patch),
    onSuccess: () => { invalidate(); setEditingId(null); toast.success("Companion updated."); },
    onError: (err) => toast.error(err?.message || "Couldn't update that companion."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Companion.delete(id),
    onSuccess: () => { invalidate(); toast.success("Companion removed."); },
    onError: (err) => toast.error(err?.message || "Couldn't remove that companion."),
  });

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
          onSave={(entry) => addMutation.mutate(entry)}
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
              onSave={(entry) => updateMutation.mutate({ id: c.id, patch: entry })}
            />
          ) : (
            <CompanionCard
              key={c.id}
              companion={c}
              canEdit={canEdit}
              onEdit={() => setEditingId(c.id)}
              onRemove={() => {
                if (confirm("Remove this companion?")) deleteMutation.mutate(c.id);
              }}
            />
          ),
        )}
      </div>
    </div>
  );
}

function CompanionCard({ companion: c, canEdit, onEdit, onRemove }) {
  const typeStyle = TYPE_MAP[c.type] || TYPE_MAP.Beast;
  const stats = c?.stats || {};
  const hp = Number(c.hp_current ?? stats.hp ?? 0) || 0;
  const maxHp = Number(c.hp_max ?? stats.max_hp ?? stats.maxHp ?? hp) || 0;
  const hpPct = maxHp > 0 ? Math.round((hp / maxHp) * 100) : 0;
  const species = c?.stats?.species || "";
  const ac = c?.stats?.ac ?? "—";
  const speed = c?.stats?.speed ? `${c.stats.speed} ft` : "—";
  const abilities = Array.isArray(c?.stats?.abilities) ? c.stats.abilities : [];

  return (
    <div className="bg-[#0b1220] border border-[#1e293b] rounded-xl p-3">
      <div className="flex items-start gap-3">
        {c.image_url ? (
          <img src={c.image_url} alt="" className="w-20 h-20 rounded-lg object-cover flex-shrink-0" />
        ) : (
          <div className="w-20 h-20 rounded-lg bg-slate-800 flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="text-base font-bold text-white truncate">{c.name || "Unnamed"}</div>
            <Badge variant="outline" className={`text-[10px] ${typeStyle.cls}`}>{c.type || "Beast"}</Badge>
          </div>
          <div className="text-[11px] text-slate-400">{species}</div>

          <div className="grid grid-cols-3 gap-2 mt-2 text-[11px]">
            <StatBox icon={Heart} label="HP" value={`${hp}/${maxHp || "?"}`} color="#ef4444" />
            <StatBox icon={Shield} label="AC" value={ac} color="#3b82f6" />
            <StatBox icon={Footprints} label="Speed" value={speed} color="#22c55e" />
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

          {abilities.length > 0 && (
            <div className="mt-3">
              <div className="text-[10px] uppercase tracking-widest text-amber-400 font-bold mb-1">Abilities</div>
              <ul className="space-y-1">
                {abilities.map((a, idx) => (
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
  const stats = value?.stats || {};
  const [name, setName] = useState(value?.name || "");
  const [species, setSpecies] = useState(stats.species || "");
  const [type, setType] = useState(value?.type || "Beast");
  const [hp, setHp] = useState(value?.hp_current ?? 0);
  const [maxHp, setMaxHp] = useState(value?.hp_max ?? 0);
  const [ac, setAc] = useState(stats.ac ?? 10);
  const [speed, setSpeed] = useState(stats.speed ?? 30);
  const [description, setDescription] = useState(value?.description || "");
  const [imageUrl, setImageUrl] = useState(value?.image_url || "");
  const [abilities, setAbilities] = useState(Array.isArray(stats.abilities) ? stats.abilities : []);
  const [uploading, setUploading] = useState(false);

  const handleImage = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await uploadFile(file, "avatars", "companions");
      setImageUrl(file_url);
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
      type,
      description: description.trim(),
      image_url: imageUrl || null,
      hp_current: Number(hp) || 0,
      hp_max: Number(maxHp) || 0,
      stats: {
        species: species.trim() || null,
        ac: Number(ac) || 10,
        speed: Number(speed) || 30,
        abilities: abilities
          .map((a) => ({ name: (a.name || "").trim(), desc: (a.desc || "").trim() }))
          .filter((a) => a.name),
      },
    });
  };

  return (
    <div className="bg-[#0b1220] border border-[#37F2D1]/40 rounded-xl p-3 space-y-2 col-span-1 md:col-span-2">
      <div className="flex items-start gap-3">
        <div className="flex flex-col items-center gap-2 flex-shrink-0">
          {imageUrl ? (
            <img src={imageUrl} alt="" className="w-20 h-20 rounded-lg object-cover" />
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
