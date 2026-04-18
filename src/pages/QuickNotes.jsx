import React, { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Save, NotebookPen, ChevronDown, ChevronRight } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { useAuth } from "@/lib/AuthContext";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { WORLD_LORE_CATEGORIES, worldLoreCategoryTitle } from "@/data/worldLoreCategories";

/**
 * GM-only quick-capture note form. Notes land in world_lore_entries
 * via the existing WorldLoreEntry entity so they show up on the
 * Campaign World Lore page under the chosen category. The "Recent
 * Notes" panel below the form lists the last five notes this GM
 * saved today so a half-finished thought can be reopened easily.
 */
export default function QuickNotes() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const params = new URLSearchParams(window.location.search);
  const campaignId = params.get("id");

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState(WORLD_LORE_CATEGORIES[0].id);
  const [subcategory, setSubcategory] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [recentOpen, setRecentOpen] = useState(true);

  const { data: campaign } = useQuery({
    queryKey: ["campaign", campaignId],
    queryFn: () => base44.entities.Campaign.filter({ id: campaignId }).then((rows) => rows[0]),
    enabled: !!campaignId,
  });

  // Every world-lore entry for this campaign — used both for the
  // "existing subcategories" suggestions in the current category and
  // for the recent-notes panel below the form.
  const { data: allEntries = [] } = useQuery({
    queryKey: ["worldLoreEntries", campaignId],
    queryFn: () => base44.entities.WorldLoreEntry.filter({ campaign_id: campaignId }),
    enabled: !!campaignId,
    initialData: [],
  });

  // Existing subcategories for the currently-selected category, so
  // the GM can tap one from a datalist instead of retyping it.
  const existingSubcategories = useMemo(() => {
    const set = new Set();
    for (const e of allEntries) {
      if (e.category === category && e.subcategory) set.add(e.subcategory);
    }
    return Array.from(set).sort();
  }, [allEntries, category]);

  // Recent notes: last 5 entries this GM saved today. Keeps the
  // panel focused on "the session I'm running right now" instead of
  // turning into another archives page.
  const recentNotes = useMemo(() => {
    if (!user?.id) return [];
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const cutoff = startOfDay.getTime();
    return allEntries
      .filter((e) => e.created_by === user.id || e.author_id === user.id)
      .filter((e) => {
        const t = new Date(e.created_at || e.created_date || 0).getTime();
        return Number.isFinite(t) && t >= cutoff;
      })
      .sort((a, b) => {
        const at = new Date(a.created_at || a.created_date || 0).getTime();
        const bt = new Date(b.created_at || b.created_date || 0).getTime();
        return bt - at;
      })
      .slice(0, 5);
  }, [allEntries, user?.id]);

  const resetForm = () => {
    setTitle("");
    setContent("");
    setSubcategory("");
    setEditingId(null);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!title.trim()) throw new Error("Give the note a title.");
      if (!content.trim()) throw new Error("Write the note's body first.");
      if (!campaignId) throw new Error("Missing campaign id — reload the page.");
      const payload = {
        campaign_id: campaignId,
        title: title.trim(),
        content: content.trim(),
        category,
        subcategory: subcategory.trim() || null,
        created_by: user?.id || null,
      };
      if (editingId) {
        return base44.entities.WorldLoreEntry.update(editingId, payload);
      }
      return base44.entities.WorldLoreEntry.create({
        ...payload,
        created_at: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      toast.success(editingId ? "Note updated." : "Note saved to World Lore!");
      queryClient.invalidateQueries({ queryKey: ["worldLoreEntries", campaignId] });
      resetForm();
    },
    onError: (err) => toast.error(err?.message || "Couldn't save the note."),
  });

  const backToSession = () => {
    if (!campaignId) { navigate(-1); return; }
    navigate(createPageUrl("CampaignGMPanel") + `?id=${campaignId}`);
  };

  const openForEdit = (note) => {
    setEditingId(note.id);
    setTitle(note.title || "");
    setContent(note.content || "");
    setCategory(note.category || WORLD_LORE_CATEGORIES[0].id);
    setSubcategory(note.subcategory || "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="h-screen w-screen bg-[#020617] text-white flex flex-col overflow-hidden">
      <header className="flex items-center gap-3 px-6 py-3 border-b border-[#1e293b] bg-[#050816] flex-shrink-0">
        <Button
          onClick={backToSession}
          variant="outline"
          size="sm"
          className="text-[#37F2D1] border-[#37F2D1]/60 hover:bg-[#37F2D1]/10 hover:text-[#37F2D1]"
        >
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Session
        </Button>
        <div className="flex items-center gap-2">
          <NotebookPen className="w-5 h-5 text-[#37F2D1]" />
          <h1 className="text-xl font-bold">Quick Notes</h1>
          {campaign?.title && (
            <span className="text-xs text-slate-500">· {campaign.title}</span>
          )}
        </div>
      </header>

      <main className="flex-1 min-h-0 overflow-y-auto">
        <div className="max-w-3xl mx-auto p-6 space-y-6">
          <div className="bg-[#1E2430] border border-[#2A3441] rounded-2xl p-5 space-y-4">
            {editingId && (
              <div className="text-[11px] text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded px-3 py-1.5 flex items-center justify-between">
                <span>Editing an existing note — saving will update it.</span>
                <button
                  onClick={resetForm}
                  className="underline font-semibold text-amber-300 hover:text-amber-200"
                >
                  Start a new one
                </button>
              </div>
            )}

            <div>
              <Label className="text-xs font-semibold text-slate-300">Note Title</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter a title for your note..."
                className="bg-[#0b1220] border-slate-700 text-white mt-1"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-300">Note Content</Label>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write your note here..."
                rows={12}
                className="bg-[#0b1220] border-slate-700 text-white mt-1 resize-none"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-slate-300">Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="bg-[#0b1220] border-slate-700 text-white mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {WORLD_LORE_CATEGORIES.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-300">Subcategory (optional)</Label>
                <Input
                  value={subcategory}
                  onChange={(e) => setSubcategory(e.target.value)}
                  placeholder="Enter or select subcategory..."
                  list="quicknotes-subcategories"
                  className="bg-[#0b1220] border-slate-700 text-white mt-1"
                />
                <datalist id="quicknotes-subcategories">
                  {existingSubcategories.map((sub) => (
                    <option key={sub} value={sub} />
                  ))}
                </datalist>
              </div>
            </div>

            <Button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || !title.trim() || !content.trim()}
              className="w-full bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#050816] font-bold h-11"
            >
              <Save className="w-4 h-4 mr-2" />
              {saveMutation.isPending
                ? "Saving…"
                : editingId
                  ? "Update Note"
                  : "Save to World Lore"}
            </Button>
          </div>

          {/* Recent notes collapsible section. Open by default because
              the whole point of it is quick re-entry into an in-flight
              note, so hiding it behind a click would defeat the
              purpose; but collapsible anyway for focus. */}
          <div className="bg-[#1E2430] border border-[#2A3441] rounded-2xl">
            <button
              type="button"
              onClick={() => setRecentOpen((o) => !o)}
              className="w-full flex items-center justify-between px-5 py-3 text-left"
            >
              <div className="flex items-center gap-2">
                {recentOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                <span className="text-sm font-bold">Recent Notes</span>
                <span className="text-[10px] text-slate-500">
                  {recentNotes.length} today
                </span>
              </div>
            </button>
            {recentOpen && (
              <div className="px-5 pb-4">
                {recentNotes.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">No notes saved yet today.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {recentNotes.map((note) => (
                      <li key={note.id}>
                        <button
                          type="button"
                          onClick={() => openForEdit(note)}
                          className="w-full text-left bg-[#0b1220] border border-slate-700 hover:border-[#37F2D1]/60 rounded-lg px-3 py-2 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-white truncate flex-1">{note.title || "Untitled"}</span>
                            <span className="text-[10px] text-slate-500 whitespace-nowrap">
                              {note.created_at ? new Date(note.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            {worldLoreCategoryTitle(note.category)}
                            {note.subcategory ? ` · ${note.subcategory}` : ""}
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
