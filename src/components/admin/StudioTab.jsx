import React, { useMemo, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Plus, Edit3, Trash2, Users, FolderTree, ScrollText, Image as ImageIcon,
  Upload, Link2, MessageSquare, Film, ChevronUp, ChevronDown, X,
} from "lucide-react";
import { supabase } from "@/api/supabaseClient";
import { uploadFile } from "@/utils/uploadFile";
import { useAuth } from "@/lib/AuthContext";

// Gallery media: accepted upload types + their MIME map. SVG is allowed
// here because the public gallery renders it only via <img src> (never
// inlined), so it cannot execute scripts. Validation runs locally below;
// uploadFile is then called WITHOUT an uploadType so the shared validator
// (which rejects avif/svg/video) is skipped while the quota bump still runs.
const GALLERY_MEDIA = {
  image: {
    exts: ["png", "jpg", "jpeg", "avif", "gif", "svg"],
    mimes: ["image/png", "image/jpeg", "image/avif", "image/gif", "image/svg+xml"],
  },
  video: {
    exts: ["webm", "mov"],
    mimes: ["video/webm", "video/quicktime"],
  },
};
const GALLERY_ACCEPT =
  ".png,.jpg,.jpeg,.avif,.gif,.svg,.webm,.mov," +
  "image/png,image/jpeg,image/avif,image/gif,image/svg+xml,video/webm,video/quicktime";

// Classify a picked file by extension + MIME. Extension is authoritative;
// MIME must agree or be blank (browsers often omit it for .avif/.mov).
function classifyMediaFile(file) {
  const name = file?.name || "";
  const ext = name.includes(".") ? name.split(".").pop().toLowerCase() : "";
  const mime = (file?.type || "").toLowerCase();
  for (const type of ["image", "video"]) {
    const cfg = GALLERY_MEDIA[type];
    if (cfg.exts.includes(ext) && (!mime || cfg.mimes.includes(mime))) return { ok: true, type };
    if (!ext && cfg.mimes.includes(mime)) return { ok: true, type };
  }
  return { ok: false, type: null };
}

/**
 * Admin → Studio.
 *
 * Single home for everything that drives the public Attributions /
 * studio-gallery experience. Mirrors HomepageTab's mutation+toast
 * pattern; every write invalidates both the admin and public query
 * keys so the live page reflects edits immediately.
 *
 *   Team               — team_members (grouped), avatar upload + monogram
 *   Groups             — team_groups CRUD
 *   Licenses & Credits — attribution_entries CRUD (by section)
 *   Gallery            — gallery_pieces moderation + upload + comments
 *
 * ⚠️ Writes are gated by the is_staff() RLS predicate (company email
 * domain). A team member signed in on a personal email will get RLS
 * errors here — surfaced via the toast on failure.
 */
const SUB_TABS = [
  { id: "team", label: "Team", icon: Users },
  { id: "groups", label: "Groups", icon: FolderTree },
  { id: "credits", label: "Licenses & Credits", icon: ScrollText },
  { id: "gallery", label: "Gallery", icon: ImageIcon },
];

export default function StudioTab() {
  const [sub, setSub] = useState("team");
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-white flex items-center gap-2">
          <Users className="w-5 h-5 text-[#37F2D1]" /> Studio
        </h2>
        <p className="text-xs text-slate-500">
          Crew, groups, license/credit entries, and the gallery behind the
          public Attributions page.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {SUB_TABS.map((t) => {
          const Icon = t.icon;
          const active = sub === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setSub(t.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                active ? "bg-[#37F2D1] text-[#050816]" : "bg-[#1E2430] text-slate-300 hover:text-white border border-slate-700"
              }`}
            >
              <Icon className="w-3.5 h-3.5" /> {t.label}
            </button>
          );
        })}
      </div>

      {sub === "team" && <TeamSection />}
      {sub === "groups" && <GroupsSection />}
      {sub === "credits" && <CreditsSection />}
      {sub === "gallery" && <GallerySection />}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <Label className="text-xs text-slate-300 mb-1 block">{label}</Label>
      {children}
    </div>
  );
}

const inputCls = "bg-[#050816] border-slate-700 text-white";

// ═══════════════════════════ Team ══════════════════════════════════
function TeamSection() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);

  const { data: members = [] } = useQuery({
    queryKey: ["adminStudioMembers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_members")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: groups = [] } = useQuery({
    queryKey: ["adminStudioGroups"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_groups")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["adminStudioMembers"] });
    queryClient.invalidateQueries({ queryKey: ["studioMembers"] });
  };

  const save = useMutation({
    mutationFn: async (row) => {
      const { id, ...payload } = row;
      if (id) {
        const { error } = await supabase.from("team_members").update(payload).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("team_members").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { toast.success("Saved"); invalidate(); },
    onError: (err) => { console.error("Save member", err); toast.error(`Failed to save: ${err?.message || err}`); },
  });

  const del = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from("team_members").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Deleted"); invalidate(); },
    onError: (err) => { console.error("Delete member", err); toast.error(`Failed to delete: ${err?.message || err}`); },
  });

  const groupName = (gid) => groups.find((g) => g.id === gid)?.name || "Ungrouped";
  const byGroup = useMemo(() => {
    const map = new Map();
    for (const m of members) {
      const key = m.group_id || "_none";
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(m);
    }
    return map;
  }, [members]);

  const orderedKeys = [...groups.map((g) => g.id), "_none"];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">{members.length} member{members.length === 1 ? "" : "s"}.</p>
        <Button size="sm" onClick={() => setCreating(true)} className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#050816] font-bold">
          <Plus className="w-3 h-3 mr-1" /> New Member
        </Button>
      </div>

      {members.length === 0 ? (
        <p className="text-slate-500 italic text-center py-12 bg-[#1E2430] border border-slate-700 rounded-lg">
          No team members yet.
        </p>
      ) : (
        orderedKeys.map((key) => {
          const list = byGroup.get(key) || [];
          if (!list.length) return null;
          return (
            <section key={key}>
              <p className="text-[10px] uppercase tracking-widest font-black text-slate-400 mb-2">
                {key === "_none" ? "Ungrouped" : groupName(key)} ({list.length})
              </p>
              <div className="bg-[#1E2430] border border-slate-700 rounded-lg divide-y divide-slate-800">
                {list.map((m) => (
                  <div key={m.id} className="p-3 flex items-center gap-3">
                    <Avatar member={m} />
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-bold truncate flex items-center gap-1.5">
                        {m.name}
                        {m.is_artist && <span className="text-[9px] uppercase bg-[#FF5300]/20 text-[#FF7A33] rounded px-1.5 py-0.5">artist</span>}
                        {!m.is_active && <span className="text-[9px] uppercase bg-slate-700 text-slate-400 rounded px-1.5 py-0.5">hidden</span>}
                        {m.user_id && <Link2 className="w-3 h-3 text-[#37F2D1]" title="Linked to a user account" />}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate">{m.role || "—"}</p>
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => setEditing(m)}><Edit3 className="w-3 h-3" /></Button>
                      <Button size="sm" variant="outline" onClick={() => { if (confirm(`Delete "${m.name}"? This also deletes their gallery pieces.`)) del.mutate(m.id); }} className="border-red-500/50 text-red-400">
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
        })
      )}

      {(editing || creating) && (
        <MemberEditor
          row={editing}
          groups={groups}
          defaultSortOrder={(members.at(-1)?.sort_order || 0) + 1}
          onClose={() => { setEditing(null); setCreating(false); }}
          onSave={(row) => save.mutate(row)}
        />
      )}
    </div>
  );
}

function Avatar({ member, size = 40 }) {
  if (member.avatar_url) {
    return <img src={member.avatar_url} alt="" className="rounded-full object-cover flex-shrink-0" style={{ width: size, height: size }} />;
  }
  return (
    <div
      className="rounded-full flex items-center justify-center text-white font-black flex-shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.4, background: `linear-gradient(135deg, ${member.avatar_color_1 || "#FF5300"}, ${member.avatar_color_2 || "#ff8a4d"})` }}
    >
      {(member.name || "?").charAt(0).toUpperCase()}
    </div>
  );
}

function MemberEditor({ row, groups, defaultSortOrder, onClose, onSave }) {
  const { user } = useAuth();
  const [form, setForm] = useState(() => ({
    name: row?.name || "",
    full_name: row?.full_name || "",
    role: row?.role || "",
    group_id: row?.group_id || "",
    bio: row?.bio || "",
    avatar_url: row?.avatar_url || "",
    avatar_color_1: row?.avatar_color_1 || "#FF5300",
    avatar_color_2: row?.avatar_color_2 || "#ff8a4d",
    is_artist: !!row?.is_artist,
    portfolio_url: row?.portfolio_url || "",
    commissions_open: !!row?.commissions_open,
    commission_email: row?.commission_email || "",
    business_inquiries: !!row?.business_inquiries,
    business_email: row?.business_email || "",
    sort_order: row?.sort_order ?? defaultSortOrder,
    is_active: row?.is_active !== false,
    user_id: row?.user_id || "",
  }));
  const [uploading, setUploading] = useState(false);
  const [linkEmail, setLinkEmail] = useState("");
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  const handleUpload = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await uploadFile(file, "user-assets", "team", { userId: user?.id, uploadType: "avatar" });
      set({ avatar_url: file_url });
      toast.success("Photo uploaded");
    } catch (err) {
      console.error("Upload avatar", err);
      toast.error(`Upload failed: ${err?.message || err}`);
    } finally {
      setUploading(false);
    }
  };

  const resolveEmail = async () => {
    const email = linkEmail.trim().toLowerCase();
    if (!email) return;
    const { data, error } = await supabase
      .from("user_profiles")
      .select("user_id, username, email")
      .eq("email", email)
      .maybeSingle();
    if (error) { console.error("Resolve email", error); toast.error(error.message); return; }
    if (!data?.user_id) { toast.error("No user found with that email."); return; }
    set({ user_id: data.user_id });
    toast.success(`Linked to ${data.username || data.email}`);
  };

  const submit = () => {
    if (!form.name.trim()) { toast.error("Name is required."); return; }
    const payload = {
      name: form.name.trim(),
      full_name: form.full_name.trim() || null,
      role: form.role.trim() || null,
      group_id: form.group_id || null,
      bio: form.bio.trim() || null,
      avatar_url: form.avatar_url.trim() || null,
      avatar_color_1: form.avatar_color_1 || "#FF5300",
      avatar_color_2: form.avatar_color_2 || "#ff8a4d",
      is_artist: !!form.is_artist,
      portfolio_url: form.portfolio_url.trim() || null,
      commissions_open: !!form.commissions_open,
      commission_email: form.commission_email.trim() || null,
      business_inquiries: !!form.business_inquiries,
      business_email: form.business_email.trim() || null,
      sort_order: Number(form.sort_order) || 0,
      is_active: !!form.is_active,
      user_id: form.user_id || null,
    };
    onSave(row?.id ? { ...payload, id: row.id } : payload);
    onClose?.();
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose?.(); }}>
      <DialogContent className="bg-[#1E2430] border border-gray-700 text-white max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{row?.id ? "Edit Member" : "New Member"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Field label="Name (card / known-as)"><Input value={form.name} onChange={(e) => set({ name: e.target.value })} className={inputCls} /></Field>
            <Field label="Full name (profile headline)"><Input value={form.full_name} onChange={(e) => set({ full_name: e.target.value })} className={inputCls} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Role"><Input value={form.role} onChange={(e) => set({ role: e.target.value })} className={inputCls} /></Field>
            <Field label="Group">
              <Select value={form.group_id || "none"} onValueChange={(v) => set({ group_id: v === "none" ? "" : v })}>
                <SelectTrigger className={`${inputCls} mt-0`}><SelectValue placeholder="Ungrouped" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Ungrouped</SelectItem>
                  {groups.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <Field label="Bio">
            <Textarea rows={3} value={form.bio} onChange={(e) => set({ bio: e.target.value })} className={`${inputCls} text-sm`} />
          </Field>

          {/* Avatar */}
          <div className="bg-[#050816] border border-slate-700 rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-3">
              <Avatar member={form} size={48} />
              <div className="flex-1">
                <Label className="text-xs text-slate-300 mb-1 block">Photo (overrides monogram)</Label>
                <div className="flex items-center gap-2">
                  <label className="inline-flex items-center gap-1.5 text-xs bg-[#1E2430] border border-slate-700 rounded px-2 py-1.5 cursor-pointer hover:border-[#37F2D1]/60">
                    <Upload className="w-3 h-3" /> {uploading ? "Uploading…" : "Upload"}
                    <input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={(e) => handleUpload(e.target.files?.[0])} />
                  </label>
                  {form.avatar_url && (
                    <Button size="sm" variant="outline" className="text-red-400 border-red-500/50" onClick={() => set({ avatar_url: "" })}>Remove</Button>
                  )}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <ColorField label="Monogram color 1" value={form.avatar_color_1} onChange={(v) => set({ avatar_color_1: v })} />
              <ColorField label="Monogram color 2" value={form.avatar_color_2} onChange={(v) => set({ avatar_color_2: v })} />
            </div>
          </div>

          {/* Artist block */}
          <ToggleRow label="Is an artist" checked={form.is_artist} onChange={(v) => set({ is_artist: v })} />
          {form.is_artist && (
            <div className="pl-3 border-l-2 border-[#FF5300]/40 space-y-3">
              <Field label="Portfolio URL"><Input value={form.portfolio_url} onChange={(e) => set({ portfolio_url: e.target.value })} className={inputCls} placeholder="https://…" /></Field>
              <ToggleRow label="Commissions open" checked={form.commissions_open} onChange={(v) => set({ commissions_open: v })} />
              <Field label="Commission email"><Input value={form.commission_email} onChange={(e) => set({ commission_email: e.target.value })} className={inputCls} placeholder="name@…" /></Field>
            </div>
          )}

          {/* Business block */}
          <ToggleRow label="Business inquiries" checked={form.business_inquiries} onChange={(v) => set({ business_inquiries: v })} />
          {form.business_inquiries && (
            <div className="pl-3 border-l-2 border-[#F8A47C]/50">
              <Field label="Business email"><Input value={form.business_email} onChange={(e) => set({ business_email: e.target.value })} className={inputCls} placeholder="name@…" /></Field>
            </div>
          )}

          {/* User link */}
          <div className="bg-[#050816] border border-slate-700 rounded-lg p-3 space-y-2">
            <Label className="text-xs text-slate-300 block">Linked user account (lets the artist self-manage their gallery)</Label>
            <div className="flex items-center gap-2">
              <Input value={linkEmail} onChange={(e) => setLinkEmail(e.target.value)} className={inputCls} placeholder="Resolve by email…" />
              <Button size="sm" variant="outline" onClick={resolveEmail} className="text-slate-300 whitespace-nowrap">Resolve</Button>
            </div>
            <Input value={form.user_id} onChange={(e) => set({ user_id: e.target.value })} className={`${inputCls} text-[11px]`} placeholder="user_id (UUID) — blank to unlink" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Field label="Sort order"><Input type="number" value={form.sort_order} onChange={(e) => set({ sort_order: e.target.value })} className={inputCls} /></Field>
            <ToggleRow label="Active (visible)" checked={form.is_active} onChange={(v) => set({ is_active: v })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#050816] font-bold">Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ColorField({ label, value, onChange }) {
  return (
    <div>
      <Label className="text-xs text-slate-300 mb-1 block">{label}</Label>
      <div className="flex items-center gap-2">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="w-9 h-9 rounded bg-transparent border border-slate-700 cursor-pointer" />
        <Input value={value} onChange={(e) => onChange(e.target.value)} className={`${inputCls} text-xs`} />
      </div>
    </div>
  );
}

function ToggleRow({ label, checked, onChange }) {
  return (
    <div className="flex items-center justify-between bg-[#050816] border border-slate-700 rounded p-2.5">
      <Label className="text-xs text-slate-300">{label}</Label>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

// ═══════════════════════════ Groups ════════════════════════════════
function GroupsSection() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);

  const { data: groups = [] } = useQuery({
    queryKey: ["adminStudioGroups"],
    queryFn: async () => {
      const { data, error } = await supabase.from("team_groups").select("*").order("sort_order", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["adminStudioGroups"] });
    queryClient.invalidateQueries({ queryKey: ["studioGroups"] });
  };

  const save = useMutation({
    mutationFn: async (row) => {
      const { id, ...payload } = row;
      if (id) {
        const { error } = await supabase.from("team_groups").update(payload).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("team_groups").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { toast.success("Saved"); invalidate(); },
    onError: (err) => { console.error("Save group", err); toast.error(`Failed to save: ${err?.message || err}`); },
  });

  const del = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from("team_groups").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Deleted"); invalidate(); },
    onError: (err) => { console.error("Delete group", err); toast.error(`Failed to delete: ${err?.message || err}`); },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">{groups.length} group{groups.length === 1 ? "" : "s"}.</p>
        <Button size="sm" onClick={() => setCreating(true)} className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#050816] font-bold">
          <Plus className="w-3 h-3 mr-1" /> New Group
        </Button>
      </div>
      {groups.length === 0 ? (
        <p className="text-slate-500 italic text-center py-12 bg-[#1E2430] border border-slate-700 rounded-lg">No groups yet.</p>
      ) : (
        <div className="bg-[#1E2430] border border-slate-700 rounded-lg divide-y divide-slate-800">
          {groups.map((g) => (
            <div key={g.id} className="p-3 flex items-center gap-3">
              <span className="text-[11px] text-slate-500 w-6">{g.sort_order}</span>
              <div className="flex-1 min-w-0">
                <p className="text-white font-bold truncate">{g.name}</p>
                {!g.is_active && <p className="text-[10px] text-slate-500">hidden</p>}
              </div>
              <Button size="sm" variant="outline" onClick={() => setEditing(g)}><Edit3 className="w-3 h-3" /></Button>
              <Button size="sm" variant="outline" onClick={() => { if (confirm(`Delete "${g.name}"? Members stay but become ungrouped.`)) del.mutate(g.id); }} className="border-red-500/50 text-red-400">
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
      {(editing || creating) && (
        <GroupEditor
          row={editing}
          defaultSortOrder={(groups.at(-1)?.sort_order || 0) + 1}
          onClose={() => { setEditing(null); setCreating(false); }}
          onSave={(row) => save.mutate(row)}
        />
      )}
    </div>
  );
}

function GroupEditor({ row, defaultSortOrder, onClose, onSave }) {
  const [form, setForm] = useState(() => ({
    name: row?.name || "",
    sort_order: row?.sort_order ?? defaultSortOrder,
    is_active: row?.is_active !== false,
  }));
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const submit = () => {
    if (!form.name.trim()) { toast.error("Name is required."); return; }
    const payload = { name: form.name.trim(), sort_order: Number(form.sort_order) || 0, is_active: !!form.is_active };
    onSave(row?.id ? { ...payload, id: row.id } : payload);
    onClose?.();
  };
  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose?.(); }}>
      <DialogContent className="bg-[#1E2430] border border-gray-700 text-white max-w-md">
        <DialogHeader><DialogTitle>{row?.id ? "Edit Group" : "New Group"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Field label="Name"><Input value={form.name} onChange={(e) => set({ name: e.target.value })} className={inputCls} placeholder="The Pass — Leadership" /></Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Sort order"><Input type="number" value={form.sort_order} onChange={(e) => set({ sort_order: e.target.value })} className={inputCls} /></Field>
            <ToggleRow label="Active" checked={form.is_active} onChange={(v) => set({ is_active: v })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#050816] font-bold">Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ═══════════════════════ Licenses & Credits ════════════════════════
const SECTIONS = [
  { value: "open_content", label: "Open Content" },
  { value: "tech", label: "Brewed With (tech)" },
  { value: "assets", label: "Art & Assets" },
];
const ACCENTS = ["orange", "teal", "salmon", "navy"];

function CreditsSection() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);

  const { data: rows = [] } = useQuery({
    queryKey: ["adminAttributionEntries"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attribution_entries")
        .select("*")
        .order("section", { ascending: true })
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["adminAttributionEntries"] });
    queryClient.invalidateQueries({ queryKey: ["attributionEntries"] });
  };

  const save = useMutation({
    mutationFn: async (row) => {
      const { id, ...payload } = row;
      if (id) {
        const { error } = await supabase.from("attribution_entries").update(payload).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("attribution_entries").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { toast.success("Saved"); invalidate(); },
    onError: (err) => { console.error("Save entry", err); toast.error(`Failed to save: ${err?.message || err}`); },
  });

  const del = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from("attribution_entries").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Deleted"); invalidate(); },
    onError: (err) => { console.error("Delete entry", err); toast.error(`Failed to delete: ${err?.message || err}`); },
  });

  const bySection = useMemo(() => {
    const map = new Map();
    for (const r of rows) {
      if (!map.has(r.section)) map.set(r.section, []);
      map.get(r.section).push(r);
    }
    return map;
  }, [rows]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">{rows.length} entries.</p>
        <Button size="sm" onClick={() => setCreating(true)} className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#050816] font-bold">
          <Plus className="w-3 h-3 mr-1" /> New Entry
        </Button>
      </div>
      {rows.length === 0 ? (
        <p className="text-slate-500 italic text-center py-12 bg-[#1E2430] border border-slate-700 rounded-lg">No entries yet.</p>
      ) : (
        SECTIONS.map(({ value, label }) => {
          const list = bySection.get(value) || [];
          if (!list.length) return null;
          return (
            <section key={value}>
              <p className="text-[10px] uppercase tracking-widest font-black text-slate-400 mb-2">{label} ({list.length})</p>
              <div className="bg-[#1E2430] border border-slate-700 rounded-lg divide-y divide-slate-800">
                {list.map((r) => (
                  <div key={r.id} className="p-3 flex items-center gap-3">
                    <span className="w-2 h-8 rounded-full flex-shrink-0" style={{ background: { orange: "#FF5300", teal: "#04685A", salmon: "#F8A47C", navy: "#1B2535" }[r.accent] || "#FF5300" }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-bold truncate flex items-center gap-1.5">
                        {r.title}
                        {r.tag && <span className="text-[9px] uppercase bg-slate-700 text-slate-300 rounded px-1.5 py-0.5">{r.tag}</span>}
                        {!r.is_active && <span className="text-[9px] uppercase bg-slate-700 text-slate-400 rounded px-1.5 py-0.5">hidden</span>}
                      </p>
                      <p className="text-[11px] text-slate-500 line-clamp-1">{r.body || r.link_url || "—"}</p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => setEditing(r)}><Edit3 className="w-3 h-3" /></Button>
                    <Button size="sm" variant="outline" onClick={() => { if (confirm(`Delete "${r.title}"?`)) del.mutate(r.id); }} className="border-red-500/50 text-red-400">
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </section>
          );
        })
      )}
      {(editing || creating) && (
        <EntryEditor
          row={editing}
          defaultSortOrder={(rows.at(-1)?.sort_order || 0) + 1}
          onClose={() => { setEditing(null); setCreating(false); }}
          onSave={(row) => save.mutate(row)}
        />
      )}
    </div>
  );
}

function EntryEditor({ row, defaultSortOrder, onClose, onSave }) {
  const [form, setForm] = useState(() => ({
    section: row?.section || "open_content",
    title: row?.title || "",
    body: row?.body || "",
    link_url: row?.link_url || "",
    link_label: row?.link_label || "",
    tag: row?.tag || "",
    accent: row?.accent || "orange",
    sort_order: row?.sort_order ?? defaultSortOrder,
    is_active: row?.is_active !== false,
  }));
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const submit = () => {
    if (!form.title.trim()) { toast.error("Title is required."); return; }
    const payload = {
      section: form.section,
      title: form.title.trim(),
      body: form.body.trim() || null,
      link_url: form.link_url.trim() || null,
      link_label: form.link_label.trim() || null,
      tag: form.section === "tech" ? (form.tag.trim() || null) : null,
      accent: form.accent,
      sort_order: Number(form.sort_order) || 0,
      is_active: !!form.is_active,
    };
    onSave(row?.id ? { ...payload, id: row.id } : payload);
    onClose?.();
  };
  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose?.(); }}>
      <DialogContent className="bg-[#1E2430] border border-gray-700 text-white max-w-xl max-h-[92vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{row?.id ? "Edit Entry" : "New Entry"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Field label="Section">
              <Select value={form.section} onValueChange={(v) => set({ section: v })}>
                <SelectTrigger className={inputCls}><SelectValue /></SelectTrigger>
                <SelectContent>{SECTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Accent">
              <Select value={form.accent} onValueChange={(v) => set({ accent: v })}>
                <SelectTrigger className={inputCls}><SelectValue /></SelectTrigger>
                <SelectContent>{ACCENTS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
          </div>
          <Field label="Title"><Input value={form.title} onChange={(e) => set({ title: e.target.value })} className={inputCls} /></Field>
          <Field label="Body">
            <Textarea rows={3} value={form.body} onChange={(e) => set({ body: e.target.value })} className={`${inputCls} text-sm`} placeholder="License text / credit note" />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Link URL"><Input value={form.link_url} onChange={(e) => set({ link_url: e.target.value })} className={inputCls} placeholder="https://…" /></Field>
            <Field label="Link label"><Input value={form.link_label} onChange={(e) => set({ link_label: e.target.value })} className={inputCls} /></Field>
          </div>
          {form.section === "tech" && (
            <Field label="Tag (tech chip)"><Input value={form.tag} onChange={(e) => set({ tag: e.target.value })} className={inputCls} placeholder="UI / build / 3D…" /></Field>
          )}
          <div className="grid grid-cols-2 gap-2">
            <Field label="Sort order"><Input type="number" value={form.sort_order} onChange={(e) => set({ sort_order: e.target.value })} className={inputCls} /></Field>
            <ToggleRow label="Active" checked={form.is_active} onChange={(v) => set({ is_active: v })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#050816] font-bold">Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ═══════════════════════════ Gallery ═══════════════════════════════
function GallerySection() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);
  const [commentsFor, setCommentsFor] = useState(null);

  const { data: pieces = [] } = useQuery({
    queryKey: ["adminGalleryPieces"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gallery_pieces")
        .select("*, artist:team_members(id, name)")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: artists = [] } = useQuery({
    queryKey: ["adminStudioArtists"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_members")
        .select("id, name")
        .eq("is_artist", true)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["adminGalleryPieces"] });
    queryClient.invalidateQueries({ queryKey: ["galleryPieces"] });
  };

  const save = useMutation({
    mutationFn: async (row) => {
      const { id, ...payload } = row;
      if (id) {
        const { error } = await supabase.from("gallery_pieces").update(payload).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("gallery_pieces").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { toast.success("Saved"); invalidate(); },
    onError: (err) => { console.error("Save piece", err); toast.error(`Failed to save: ${err?.message || err}`); },
  });

  const del = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from("gallery_pieces").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Deleted"); invalidate(); },
    onError: (err) => { console.error("Delete piece", err); toast.error(`Failed to delete: ${err?.message || err}`); },
  });

  const toggle = useMutation({
    mutationFn: async ({ id, field, value }) => {
      const { error } = await supabase.from("gallery_pieces").update({ [field]: value }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (err) => { console.error("Toggle piece", err); toast.error(`Failed: ${err?.message || err}`); },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">{pieces.length} piece{pieces.length === 1 ? "" : "s"} (incl. unpublished).</p>
        <Button
          size="sm"
          onClick={() => setCreating(true)}
          disabled={!artists.length}
          title={artists.length ? "" : "Add an artist (a team member with 'Is an artist' on) first"}
          className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#050816] font-bold disabled:opacity-40"
        >
          <Plus className="w-3 h-3 mr-1" /> Upload Piece
        </Button>
      </div>

      {pieces.length === 0 ? (
        <p className="text-slate-500 italic text-center py-12 bg-[#1E2430] border border-slate-700 rounded-lg">No gallery pieces yet.</p>
      ) : (
        <div className="bg-[#1E2430] border border-slate-700 rounded-lg divide-y divide-slate-800">
          {pieces.map((p) => (
            <div key={p.id} className="p-3 flex items-center gap-3">
              <div className="w-14 h-14 rounded overflow-hidden bg-[#050816] border border-slate-700 flex-shrink-0 relative">
                {(() => {
                  const cover = (Array.isArray(p.media) && p.media[0]) || (p.image_url ? { url: p.image_url, type: "image" } : null);
                  if (!cover) return <ImageIcon className="w-4 h-4 text-slate-600 m-auto" />;
                  return cover.type === "video"
                    ? <video src={cover.url} muted playsInline preload="metadata" className="w-full h-full object-cover" />
                    : <img src={cover.url} alt="" className="w-full h-full object-cover" />;
                })()}
                {Array.isArray(p.media) && p.media.length > 1 && (
                  <span className="absolute bottom-0 right-0 text-[9px] font-bold bg-[#37F2D1] text-[#050816] px-1 rounded-tl">{p.media.length}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-bold truncate">{p.title}</p>
                <p className="text-[11px] text-slate-500 truncate">{p.artist?.name || "Unknown artist"}</p>
              </div>
              <div className="flex items-center gap-3">
                <label className="text-[10px] text-slate-400 inline-flex items-center gap-1">
                  <Switch checked={!!p.is_published} onCheckedChange={(v) => toggle.mutate({ id: p.id, field: "is_published", value: v })} /> Published
                </label>
                <label className="text-[10px] text-slate-400 inline-flex items-center gap-1">
                  <Switch checked={!!p.comments_enabled} onCheckedChange={(v) => toggle.mutate({ id: p.id, field: "comments_enabled", value: v })} /> Comments
                </label>
                <Button size="sm" variant="outline" onClick={() => setCommentsFor(p)} title="View comments"><MessageSquare className="w-3 h-3" /></Button>
                <Button size="sm" variant="outline" onClick={() => setEditing(p)}><Edit3 className="w-3 h-3" /></Button>
                <Button size="sm" variant="outline" onClick={() => { if (confirm(`Delete "${p.title}"?`)) del.mutate(p.id); }} className="border-red-500/50 text-red-400"><Trash2 className="w-3 h-3" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {(editing || creating) && (
        <PieceEditor
          row={editing}
          artists={artists}
          defaultSortOrder={(pieces.at(-1)?.sort_order || 0) + 1}
          onClose={() => { setEditing(null); setCreating(false); }}
          onSave={(row) => save.mutate(row)}
        />
      )}
      {commentsFor && <CommentsModerator piece={commentsFor} onClose={() => setCommentsFor(null)} />}
    </div>
  );
}

function PieceEditor({ row, artists, defaultSortOrder, onClose, onSave }) {
  const { user } = useAuth();
  // Normalize existing media; fall back to the legacy single image_url.
  const initialMedia = Array.isArray(row?.media) && row.media.length
    ? row.media
        .filter((m) => m && m.url)
        .slice()
        .sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0))
        .map((m) => ({ url: m.url, type: m.type === "video" ? "video" : "image" }))
    : (row?.image_url ? [{ url: row.image_url, type: "image" }] : []);
  const [form, setForm] = useState(() => ({
    artist_member_id: row?.artist_member_id || artists[0]?.id || "",
    title: row?.title || "",
    description: row?.description || "",
    media: initialMedia,
    comments_enabled: row?.comments_enabled !== false,
    is_published: row?.is_published !== false,
    sort_order: row?.sort_order ?? defaultSortOrder,
  }));
  const [uploading, setUploading] = useState(false);
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  // Upload one or many files; reject unsupported types with a toast and
  // append the rest in pick order. First item ends up as the cover.
  const handleUpload = async (fileList) => {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    setUploading(true);
    const added = [];
    try {
      for (const file of files) {
        const { ok, type } = classifyMediaFile(file);
        if (!ok) {
          toast.error(`${file.name}: unsupported type. Allowed: PNG, JPG, AVIF, GIF, SVG, WEBM, MOV.`);
          continue;
        }
        try {
          // No uploadType → skip the shared image-only validator; quota
          // tracking still runs because userId is passed.
          const { file_url } = await uploadFile(file, "user-assets", "gallery", { userId: user?.id });
          added.push({ url: file_url, type });
        } catch (err) {
          console.error("Upload gallery media", err);
          toast.error(`${file.name}: ${err?.message || "upload failed"}`);
        }
      }
      if (added.length) {
        setForm((f) => ({ ...f, media: [...f.media, ...added] }));
        toast.success(`${added.length} item${added.length === 1 ? "" : "s"} uploaded`);
      }
    } finally {
      setUploading(false);
    }
  };

  const moveMedia = (i, dir) => setForm((f) => {
    const next = f.media.slice();
    const j = i + dir;
    if (j < 0 || j >= next.length) return f;
    [next[i], next[j]] = [next[j], next[i]];
    return { ...f, media: next };
  });
  const removeMedia = (i) => setForm((f) => ({ ...f, media: f.media.filter((_, k) => k !== i) }));

  const submit = () => {
    if (!form.artist_member_id) { toast.error("Choose an artist."); return; }
    if (!form.title.trim()) { toast.error("Title is required."); return; }
    if (!form.media.length) { toast.error("Add at least one image or video."); return; }
    // media is canonical (re-indexed sort); image_url stays synced to the cover.
    const media = form.media.map((m, i) => ({ url: m.url, type: m.type, sort: i }));
    const payload = {
      artist_member_id: form.artist_member_id,
      title: form.title.trim(),
      description: form.description.trim() || null,
      media,
      image_url: media[0].url,
      comments_enabled: !!form.comments_enabled,
      is_published: !!form.is_published,
      sort_order: Number(form.sort_order) || 0,
    };
    onSave(row?.id ? { ...payload, id: row.id } : payload);
    onClose?.();
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose?.(); }}>
      <DialogContent className="bg-[#1E2430] border border-gray-700 text-white max-w-xl max-h-[92vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{row?.id ? "Edit Piece" : "Upload Piece"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Field label="Artist">
            <Select value={form.artist_member_id} onValueChange={(v) => set({ artist_member_id: v })}>
              <SelectTrigger className={inputCls}><SelectValue placeholder="Choose artist" /></SelectTrigger>
              <SelectContent>{artists.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Media (first item is the cover)">
            {form.media.length > 0 && (
              <div className="space-y-1.5 mb-2">
                {form.media.map((m, i) => (
                  <div key={`${m.url}-${i}`} className="flex items-center gap-2 bg-[#050816] border border-slate-700 rounded p-1.5">
                    <div className="w-12 h-12 rounded bg-[#0b1020] overflow-hidden flex-shrink-0 grid place-items-center">
                      {m.type === "video"
                        ? <video src={m.url} muted playsInline preload="metadata" className="w-full h-full object-cover" />
                        : <img src={m.url} alt="" className="w-full h-full object-cover" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-bold text-white flex items-center gap-1">
                        {m.type === "video" ? <Film className="w-3 h-3" /> : <ImageIcon className="w-3 h-3" />}
                        {m.type}{i === 0 && <span className="text-[#37F2D1]">· cover</span>}
                      </p>
                      <p className="text-[10px] text-slate-500 truncate">{m.url.split("/").pop()}</p>
                    </div>
                    <div className="flex gap-0.5">
                      <Button size="sm" variant="outline" disabled={i === 0} onClick={() => moveMedia(i, -1)} title="Move up"><ChevronUp className="w-3 h-3" /></Button>
                      <Button size="sm" variant="outline" disabled={i === form.media.length - 1} onClick={() => moveMedia(i, 1)} title="Move down"><ChevronDown className="w-3 h-3" /></Button>
                      <Button size="sm" variant="outline" onClick={() => removeMedia(i)} title="Remove" className="border-red-500/50 text-red-400"><X className="w-3 h-3" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <label className="inline-flex items-center gap-1.5 text-xs bg-[#050816] border border-slate-700 rounded px-2 py-1.5 cursor-pointer hover:border-[#37F2D1]/60">
              <Upload className="w-3 h-3" /> {uploading ? "Uploading…" : form.media.length ? "Add more media" : "Upload media"}
              <input type="file" multiple accept={GALLERY_ACCEPT} className="hidden" disabled={uploading} onChange={(e) => { handleUpload(e.target.files); e.target.value = ""; }} />
            </label>
            <p className="text-[10px] text-slate-500 mt-1">Images: PNG, JPG, AVIF, GIF, SVG · Video: WEBM, MOV</p>
          </Field>
          <Field label="Title"><Input value={form.title} onChange={(e) => set({ title: e.target.value })} className={inputCls} /></Field>
          <Field label="Description"><Textarea rows={2} value={form.description} onChange={(e) => set({ description: e.target.value })} className={`${inputCls} text-sm`} /></Field>
          <div className="grid grid-cols-3 gap-2">
            <Field label="Sort order"><Input type="number" value={form.sort_order} onChange={(e) => set({ sort_order: e.target.value })} className={inputCls} /></Field>
            <ToggleRow label="Published" checked={form.is_published} onChange={(v) => set({ is_published: v })} />
            <ToggleRow label="Comments" checked={form.comments_enabled} onChange={(v) => set({ comments_enabled: v })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#050816] font-bold">Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CommentsModerator({ piece, onClose }) {
  const queryClient = useQueryClient();
  const { data: comments = [], isLoading } = useQuery({
    queryKey: ["adminGalleryComments", piece.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gallery_comments")
        .select("*")
        .eq("piece_id", piece.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      const list = data || [];
      const ids = [...new Set(list.map((c) => c.user_id).filter(Boolean))];
      let profiles = {};
      if (ids.length) {
        const { data: profs } = await supabase.from("user_profiles").select("user_id, username").in("user_id", ids);
        profiles = Object.fromEntries((profs || []).map((p) => [p.user_id, p]));
      }
      return list.map((c) => ({ ...c, username: profiles[c.user_id]?.username || "Adventurer" }));
    },
  });

  const del = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from("gallery_comments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Deleted"); queryClient.invalidateQueries({ queryKey: ["adminGalleryComments", piece.id] }); },
    onError: (err) => { console.error("Delete comment", err); toast.error(`Failed: ${err?.message || err}`); },
  });

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose?.(); }}>
      <DialogContent className="bg-[#1E2430] border border-gray-700 text-white max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Comments — {piece.title}</DialogTitle></DialogHeader>
        {isLoading ? (
          <p className="text-slate-500 text-sm py-6 text-center">Loading…</p>
        ) : comments.length === 0 ? (
          <p className="text-slate-500 italic text-sm py-6 text-center">No comments.</p>
        ) : (
          <ul className="divide-y divide-slate-800">
            {comments.map((c) => (
              <li key={c.id} className="py-2.5 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-white">{c.username}</p>
                  <p className="text-sm text-slate-300">{c.body}</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => { if (confirm("Delete this comment?")) del.mutate(c.id); }} className="border-red-500/50 text-red-400"><Trash2 className="w-3 h-3" /></Button>
              </li>
            ))}
          </ul>
        )}
        <DialogFooter><Button variant="outline" onClick={onClose}>Close</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
