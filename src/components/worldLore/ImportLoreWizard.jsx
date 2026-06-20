import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  FileText, Loader2, AlertTriangle, CheckCircle2, XCircle, ArrowLeft,
  ArrowRight, Download, RefreshCw, Image as ImageIcon, FolderOpen,
} from "lucide-react";
import { supabase } from "@/api/supabaseClient";
import { base44 } from "@/api/base44Client";
import { sanitizeLoreHtml } from "@/lib/sanitizeForumHtml";
import { stripHtml } from "@/utils/worldLoreVisibility";
import { isPickerConfigured, pickGoogleDoc, exportDocHtml } from "@/utils/googlePicker";
import {
  extractDocTitle, splitSections, guessCategory, detectFormatChips,
} from "@/utils/googleDocImport";

/**
 * World Lore Import — Phase 2B wizard.
 *
 * Invokes the Phase 2A `importGoogleDoc` edge function, lets the GM
 * review/organize the parsed sections, then writes the chosen ones as
 * Freeform, GM-only World Lore entries — sanitizing each section's HTML
 * here (the only place import content is sanitized) and mirroring the
 * canonical entry-create shape.
 *
 * GM-gating is the caller's responsibility (the launcher only renders
 * for GM/Co-GM, same gate as "New Entry").
 */

// The five import targets. `id` is the 2A guess id; `key` is the
// category value the World Lore page actually stores/queries under
// (politics→political, religion→religions differ).
const CATEGORY_OPTIONS = [
  { id: "regions",   key: "regions",   label: "Regions & Maps" },
  { id: "politics",  key: "political", label: "Politics & Factions" },
  { id: "religion",  key: "religions", label: "Deities & Religion" },
  { id: "history",   key: "history",   label: "History & Timeline" },
  { id: "artifacts", key: "artifacts", label: "Artifacts & Relics" },
];
const ID_TO_KEY = Object.fromEntries(CATEGORY_OPTIONS.map((o) => [o.id, o.key]));
const LABEL_FOR_ID = Object.fromEntries(CATEGORY_OPTIONS.map((o) => [o.id, o.label]));
const LABEL_FOR_KEY = Object.fromEntries(CATEGORY_OPTIONS.map((o) => [o.key, o.label]));
const DEFAULT_CATEGORY_ID = "regions";

const TEMPLATE_URL =
  "https://docs.google.com/document/d/1importable-world-lore-template/copy"; // TODO(2B): swap for the real template asset when it exists.

export default function ImportLoreWizard({ open, onOpenChange, campaignId, user, onGoToCategory }) {
  const queryClient = useQueryClient();

  const [step, setStep] = useState("source"); // source | review | confirm | success
  const [docLink, setDocLink] = useState("");
  const [splitLevel, setSplitLevel] = useState("h1");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [docTitle, setDocTitle] = useState("");
  const [warnings, setWarnings] = useState([]);
  const [sections, setSections] = useState([]); // working copy with edits

  // Per-(link+level) cache of the working section state so toggling the
  // split level fetches each level at most once per session and keeps
  // the GM's edits when switching back.
  const cacheRef = useRef({});
  // Active source: { mode: "paste", docLink } or { mode: "picker", docId, html }.
  // Drives how a split-level switch re-derives sections.
  const sourceRef = useRef({ mode: null });

  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [results, setResults] = useState([]); // [{id,title,ok,error}]

  const resetAll = useCallback(() => {
    setStep("source");
    setDocLink("");
    setSplitLevel("h1");
    setLoading(false);
    setError("");
    setDocTitle("");
    setWarnings([]);
    setSections([]);
    cacheRef.current = {};
    sourceRef.current = { mode: null };
    setImporting(false);
    setProgress({ current: 0, total: 0 });
    setResults([]);
  }, []);

  // Reset whenever the dialog closes so a re-open starts clean.
  useEffect(() => {
    if (!open) resetAll();
  }, [open, resetAll]);

  // Build a fresh working section list from a 2A response, preserving
  // prior edits for sections whose ids are stable.
  const toWorking = useCallback((data, prevSections) => {
    const prevById = new Map((prevSections || []).map((s) => [s.id, s]));
    return (data.sections || []).map((sec) => {
      const old = prevById.get(sec.id);
      return {
        id: sec.id,
        html: sec.html,
        formatChips: Array.isArray(sec.formatChips) ? sec.formatChips : [],
        isIntro: !!sec.isIntro,
        guessedCategory: sec.guessedCategory,
        confidence: sec.confidence,
        // Editable state (preserved across re-splits when id matches):
        include: old ? old.include : !sec.isIntro, // intro defaults OFF
        title: old?.titleEdited ? old.title : (sec.title || "Untitled section"),
        titleEdited: old?.titleEdited || false,
        categoryId: old?.categoryEdited
          ? old.categoryId
          : (sec.guessedCategory && ID_TO_KEY[sec.guessedCategory] ? sec.guessedCategory : DEFAULT_CATEGORY_ID),
        categoryEdited: old?.categoryEdited || false,
      };
    });
  }, []);

  const cacheKeyFor = useCallback((level) => {
    const src = sourceRef.current;
    return src.mode === "picker"
      ? `picker:${src.docId}::${level}`
      : `paste:${(src.docLink || "").trim()}::${level}`;
  }, []);

  // Apply a 2A-shaped contract ({docTitle, sections, warnings}) into the
  // working state and cache it for the active source + level.
  const applyContract = useCallback((data, level) => {
    const working = toWorking(data, sections);
    cacheRef.current[cacheKeyFor(level)] = {
      docTitle: data.docTitle || "Untitled document",
      warnings: Array.isArray(data.warnings) ? data.warnings : [],
      sections: working,
    };
    setDocTitle(data.docTitle || "Untitled document");
    setWarnings(Array.isArray(data.warnings) ? data.warnings : []);
    setSections(working);
    setSplitLevel(level);
    setStep("review");
  }, [sections, toWorking, cacheKeyFor]);

  // Derive the 2A contract from already-fetched HTML, fully client-side
  // (picker path — no edge function, no image re-host).
  const contractFromHtml = useCallback((html, level) => {
    const secs = splitSections(html, level);
    return {
      docTitle: extractDocTitle(html),
      splitLevel: level,
      sections: secs.map((s) => {
        const g = s.isIntro ? { guessedCategory: null, confidence: "low" } : guessCategory(s.title);
        return {
          id: s.id, title: s.title, html: s.html, isIntro: !!s.isIntro,
          guessedCategory: g.guessedCategory, confidence: g.confidence,
          formatChips: detectFormatChips(s.html),
        };
      }),
      warnings: secs.some((s) => /<img\b/i.test(s.html))
        ? ["Images were left as Google Drive links (not copied) — they may not load for other members."]
        : [],
    };
  }, []);

  // Load sections for a split level from the active source (cache → fetch).
  const loadLevel = useCallback(async (level, { force = false } = {}) => {
    setError("");
    const cacheKey = cacheKeyFor(level);
    if (!force && cacheRef.current[cacheKey]) {
      const cached = cacheRef.current[cacheKey];
      setDocTitle(cached.docTitle);
      setWarnings(cached.warnings);
      setSections(cached.sections);
      setSplitLevel(level);
      setStep("review");
      return;
    }

    // Picker source re-derives client-side from the fetched HTML.
    if (sourceRef.current.mode === "picker") {
      applyContract(contractFromHtml(sourceRef.current.html, level), level);
      return;
    }

    // Paste source goes through the edge function.
    setLoading(true);
    try {
      const { data, error: invokeErr } = await supabase.functions.invoke("importGoogleDoc", {
        body: { docLink: (sourceRef.current.docLink || "").trim(), campaignId, splitLevel: level },
      });
      if (invokeErr) {
        // Try the function's own actionable message; otherwise the call
        // failed before reaching it (commonly: function not deployed).
        let msg = "The import service didn't respond. The doc importer may not be deployed yet — try the “Choose from Google Drive” option, or contact the GM.";
        try {
          const ctx = invokeErr.context;
          if (ctx && typeof ctx.json === "function") {
            const bodyJson = await ctx.json();
            if (bodyJson?.error) msg = bodyJson.error;
          }
        } catch { /* keep default msg */ }
        throw new Error(msg);
      }
      if (!data) throw new Error("No response from the import service. Try again in a moment.");
      if (data.error) throw new Error(data.error);
      applyContract(data, level);
    } catch (e) {
      setError(e?.message || "Import failed.");
    } finally {
      setLoading(false);
    }
  }, [campaignId, cacheKeyFor, applyContract, contractFromHtml]);

  // Start a paste-link import.
  const startPaste = useCallback(() => {
    sourceRef.current = { mode: "paste", docLink };
    loadLevel("h1", { force: true });
  }, [docLink, loadLevel]);

  // Start a Google Drive picker import (client-side fetch + parse).
  const startPicker = useCallback(async () => {
    setError("");
    setLoading(true);
    try {
      const picked = await pickGoogleDoc();
      if (!picked) return; // cancelled
      const html = await exportDocHtml(picked.id, picked.accessToken);
      sourceRef.current = { mode: "picker", docId: picked.id, html };
      applyContract(contractFromHtml(html, "h1"), "h1");
    } catch (e) {
      setError(e?.message || "Couldn't open that document from Google Drive.");
    } finally {
      setLoading(false);
    }
  }, [applyContract, contractFromHtml]);

  // Persist the current working edits into the cache for the active
  // level (so switching back restores them), then move to `level`.
  const switchLevel = useCallback((level) => {
    if (level === splitLevel) return;
    const curKey = cacheKeyFor(splitLevel);
    if (cacheRef.current[curKey]) {
      cacheRef.current[curKey] = { docTitle, warnings, sections };
    }
    loadLevel(level);
  }, [splitLevel, cacheKeyFor, docTitle, warnings, sections, loadLevel]);

  const updateSection = (id, patch) => {
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };

  const includedSections = sections.filter((s) => s.include);
  const skippedCount = sections.length - includedSections.length;

  // ── Writing ────────────────────────────────────────────────────────
  const writeSections = useCallback(async (toWrite) => {
    setImporting(true);
    setProgress({ current: 0, total: toWrite.length });
    const out = [];
    for (let i = 0; i < toWrite.length; i++) {
      const s = toWrite[i];
      setProgress({ current: i + 1, total: toWrite.length });
      try {
        const content = sanitizeLoreHtml(s.html);
        await base44.entities.WorldLoreEntry.create({
          campaign_id: campaignId,
          category: ID_TO_KEY[s.categoryId] || "regions",
          title: (s.title || "Untitled").trim(),
          content,
          template_type: "freeform",
          visibility: "gm_only",
          visible_to_players: [],
          metadata: {},
          image_url: null,
          images: [],
          knowledge_gates: [],
          language: null,
          gist: null,
          decipher_dc: null,
          created_by: user?.id || null,
          created_at: new Date().toISOString(),
        });
        out.push({ id: s.id, title: s.title, categoryKey: ID_TO_KEY[s.categoryId], ok: true });
      } catch (err) {
        out.push({ id: s.id, title: s.title, ok: false, error: err?.message || "Write failed" });
      }
    }

    // Refresh the lists so new entries appear.
    const affectedKeys = [...new Set(out.filter((r) => r.ok).map((r) => r.categoryKey))];
    affectedKeys.forEach((key) => {
      queryClient.invalidateQueries({ queryKey: ["worldLoreEntries", campaignId, key] });
    });
    queryClient.invalidateQueries({ queryKey: ["worldLoreEntriesAll", campaignId] });

    setResults(out);
    setImporting(false);
    setStep("success");
  }, [campaignId, user, queryClient]);

  const startImport = () => writeSections(includedSections);
  const retryFailed = () => {
    const failedIds = new Set(results.filter((r) => !r.ok).map((r) => r.id));
    const retry = sections.filter((s) => failedIds.has(s.id));
    if (retry.length) writeSections(retry);
  };

  const createdCount = results.filter((r) => r.ok).length;
  const failedResults = results.filter((r) => !r.ok);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#0f1219] border-slate-700 text-white max-w-3xl max-h-[88vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <FileText className="w-5 h-5 text-[#37F2D1]" />
            Import World Lore from Google Docs
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            {step === "source" && "Paste a shared Google Doc and we'll split it into reviewable lore sections."}
            {step === "review" && (docTitle ? `Reviewing “${docTitle}”` : "Review and organize the parsed sections.")}
            {step === "confirm" && "Confirm what will be created."}
            {step === "success" && "Import complete."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-1">
          {step === "source" && (
            <SourceStep
              docLink={docLink}
              setDocLink={setDocLink}
              loading={loading}
              error={error}
              onSubmit={startPaste}
              onPick={startPicker}
              pickerAvailable={isPickerConfigured()}
            />
          )}

          {step === "review" && (
            <ReviewStep
              warnings={warnings}
              sections={sections}
              splitLevel={splitLevel}
              loading={loading}
              error={error}
              includedCount={includedSections.length}
              skippedCount={skippedCount}
              onSwitchLevel={switchLevel}
              onUpdateSection={updateSection}
            />
          )}

          {step === "confirm" && (
            <ConfirmStep
              sections={includedSections}
              importing={importing}
              progress={progress}
            />
          )}

          {step === "success" && (
            <SuccessStep
              createdCount={createdCount}
              failedResults={failedResults}
              affectedKeys={[...new Set(results.filter((r) => r.ok).map((r) => r.categoryKey))]}
              onRetry={retryFailed}
              onGoToCategory={(key) => { onGoToCategory?.(key); onOpenChange(false); }}
              onImportAnother={resetAll}
            />
          )}
        </div>

        {/* Footer nav */}
        <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-700/50">
          <div>
            {step === "review" && (
              <Button variant="ghost" onClick={() => setStep("source")} className="text-slate-300">
                <ArrowLeft className="w-4 h-4 mr-1" /> Change doc
              </Button>
            )}
            {step === "confirm" && !importing && (
              <Button variant="ghost" onClick={() => setStep("review")} className="text-slate-300">
                <ArrowLeft className="w-4 h-4 mr-1" /> Back
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            {step === "source" && (
              <Button
                onClick={startPaste}
                disabled={loading || !docLink.trim()}
                className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#050816] font-bold"
              >
                {loading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <ArrowRight className="w-4 h-4 mr-1" />}
                {loading ? "Reading doc…" : "Parse document"}
              </Button>
            )}
            {step === "review" && (
              <Button
                onClick={() => setStep("confirm")}
                disabled={includedSections.length === 0 || loading}
                className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#050816] font-bold"
              >
                Next: Confirm ({includedSections.length}) <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            )}
            {step === "confirm" && (
              <Button
                onClick={startImport}
                disabled={importing || includedSections.length === 0}
                className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#050816] font-bold"
              >
                {importing
                  ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Importing {progress.current} of {progress.total}…</>
                  : <>Import {includedSections.length} {includedSections.length === 1 ? "entry" : "entries"}</>}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Step: Source ──────────────────────────────────────────────────────
function SourceStep({ docLink, setDocLink, loading, error, onSubmit, onPick, pickerAvailable }) {
  return (
    <div className="space-y-4 py-1">
      {pickerAvailable && (
        <>
          <div>
            <Button
              type="button"
              onClick={onPick}
              disabled={loading}
              variant="outline"
              className="w-full text-[#37F2D1] border-[#37F2D1]/50 hover:bg-[#37F2D1]/10"
            >
              <FolderOpen className="w-4 h-4 mr-2" /> Choose from Google Drive
            </Button>
            <p className="text-[11px] text-slate-500 mt-1.5 text-center">
              Pick any doc you own — including private ones. No sharing changes needed.
            </p>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-slate-600">
            <span className="flex-1 h-px bg-slate-700" /> or paste a share link <span className="flex-1 h-px bg-slate-700" />
          </div>
        </>
      )}

      <div>
        <Label className="text-sm text-slate-300">Google Doc share link</Label>
        <Input
          value={docLink}
          onChange={(e) => setDocLink(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && docLink.trim() && !loading) onSubmit(); }}
          placeholder="https://docs.google.com/document/d/…"
          className="bg-[#1a1f2e] border-slate-600 text-white placeholder:text-slate-500 mt-1"
        />
      </div>

      <div className="bg-[#1a1f2e] border border-slate-700/50 rounded-lg p-3 text-sm text-slate-400 space-y-2">
        <p className="flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
          <span>
            In Google Docs, set <span className="text-slate-200 font-medium">Share → General access → “Anyone with the link”</span> to
            <span className="text-slate-200 font-medium"> Viewer</span>. Private docs can’t be read.
          </span>
        </p>
        <a
          href={TEMPLATE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-[#37F2D1] hover:underline text-xs"
        >
          <Download className="w-3.5 h-3.5" /> Download a starter template
        </a>
      </div>

      {error && <ErrorNote message={error} />}
    </div>
  );
}

// ── Step: Review & organize ───────────────────────────────────────────
function ReviewStep({
  warnings, sections, splitLevel, loading, error,
  includedCount, skippedCount, onSwitchLevel, onUpdateSection,
}) {
  return (
    <div className="space-y-3 py-1">
      <div className="flex items-center justify-between gap-3 flex-wrap sticky top-0 bg-[#0f1219] py-1 z-10">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Split at:</span>
          <div className="flex rounded-lg border border-slate-700 overflow-hidden">
            {["h1", "h2"].map((lvl) => (
              <button
                key={lvl}
                type="button"
                disabled={loading}
                onClick={() => onSwitchLevel(lvl)}
                className={`px-3 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${
                  splitLevel === lvl
                    ? "bg-[#37F2D1]/15 text-[#37F2D1]"
                    : "text-slate-400 hover:text-white hover:bg-[#252b3d]"
                }`}
              >
                {lvl === "h1" ? "Heading 1" : "Heading 2"}
              </button>
            ))}
          </div>
          {loading && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
        </div>
        <div className="text-xs text-slate-300">
          <span className="text-[#37F2D1] font-semibold">{includedCount}</span> to import
          {" · "}
          <span className="text-slate-400">{skippedCount} skipped</span>
        </div>
      </div>

      {error && <ErrorNote message={error} />}

      {warnings.length > 0 && (
        <div className="bg-amber-950/20 border border-amber-900/40 rounded-lg p-3 text-xs text-amber-200/90 flex items-start gap-2">
          <ImageIcon className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
          <div>
            Some images couldn’t be copied — those entries keep the original links.
            <ul className="list-disc list-inside mt-1 text-amber-200/70 max-h-24 overflow-y-auto">
              {warnings.slice(0, 8).map((w, i) => <li key={i} className="truncate">{w}</li>)}
              {warnings.length > 8 && <li>…and {warnings.length - 8} more.</li>}
            </ul>
          </div>
        </div>
      )}

      {sections.length === 0 && !loading && (
        <div className="text-sm text-slate-500 italic text-center py-8">
          No sections found at this heading level. Try the other split level.
        </div>
      )}

      <div className="space-y-2">
        {sections.map((s) => (
          <SectionRow key={s.id} section={s} onUpdate={(patch) => onUpdateSection(s.id, patch)} />
        ))}
      </div>
    </div>
  );
}

function SectionRow({ section, onUpdate }) {
  const ambiguous = section.confidence === "low" || !section.guessedCategory;
  const preview = stripHtml(section.html).slice(0, 160);
  return (
    <div className={`bg-[#1a1f2e] border rounded-lg p-3 ${section.include ? "border-slate-700/60" : "border-slate-800 opacity-60"}`}>
      <div className="flex items-start gap-3">
        <div className="pt-1">
          <Switch checked={section.include} onCheckedChange={(v) => onUpdate({ include: !!v })} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Input
              value={section.title}
              onChange={(e) => onUpdate({ title: e.target.value, titleEdited: true })}
              className="h-8 bg-[#0f1219] border-slate-600 text-white text-sm font-semibold flex-1 min-w-[180px]"
            />
            {section.isIntro && (
              <Badge variant="outline" className="text-[10px] border-slate-600 text-slate-400">
                Untitled intro — name it or skip
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap mt-2">
            {section.formatChips.map((chip) => (
              <Badge key={chip} variant="outline" className="text-[10px] border-slate-700 text-slate-400">
                {chip}
              </Badge>
            ))}
          </div>

          {preview && (
            <p className="text-xs text-slate-500 mt-2 line-clamp-2">{preview}{stripHtml(section.html).length > 160 ? "…" : ""}</p>
          )}

          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Category</span>
            <Select value={section.categoryId} onValueChange={(v) => onUpdate({ categoryId: v, categoryEdited: true })}>
              <SelectTrigger className="h-8 w-[220px] bg-[#0f1219] border-slate-600 text-white text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_OPTIONS.map((o) => (
                  <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {ambiguous && (
              <span className="inline-flex items-center gap-1 text-[11px] text-amber-400">
                <AlertTriangle className="w-3 h-3" /> double-check
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Step: Confirm ─────────────────────────────────────────────────────
function ConfirmStep({ sections, importing, progress }) {
  const tally = {};
  for (const s of sections) {
    const label = LABEL_FOR_ID[s.categoryId] || s.categoryId;
    tally[label] = (tally[label] || 0) + 1;
  }
  return (
    <div className="space-y-4 py-1">
      <div className="bg-[#1a1f2e] border border-slate-700/50 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-white mb-2">
          {sections.length} {sections.length === 1 ? "entry" : "entries"} will be created
        </h3>
        <ul className="space-y-1">
          {Object.entries(tally).map(([label, n]) => (
            <li key={label} className="flex items-center justify-between text-sm">
              <span className="text-slate-300">{label}</span>
              <span className="text-[#37F2D1] font-semibold">{n}</span>
            </li>
          ))}
        </ul>
      </div>

      <ul className="text-xs text-slate-400 space-y-1.5">
        <li className="flex items-start gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-slate-500 mt-0.5" /> Entries land as <span className="text-slate-200">Freeform</span> — your formatting is preserved.</li>
        <li className="flex items-start gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-slate-500 mt-0.5" /> Images are copied into the campaign’s asset library.</li>
        <li className="flex items-start gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-slate-500 mt-0.5" /> Entries are <span className="text-slate-200">visible to GMs only</span> until you release them.</li>
      </ul>

      {importing && (
        <div className="space-y-1">
          <div className="h-2 bg-[#1a1f2e] rounded-full overflow-hidden border border-slate-700">
            <div
              className="h-full bg-[#37F2D1] transition-all"
              style={{ width: `${progress.total ? (progress.current / progress.total) * 100 : 0}%` }}
            />
          </div>
          <p className="text-xs text-slate-400 text-center">Importing {progress.current} of {progress.total}…</p>
        </div>
      )}
    </div>
  );
}

// ── Step: Success ─────────────────────────────────────────────────────
function SuccessStep({ createdCount, failedResults, affectedKeys, onRetry, onGoToCategory, onImportAnother }) {
  return (
    <div className="space-y-4 py-2">
      <div className="text-center">
        <CheckCircle2 className="w-12 h-12 text-[#37F2D1] mx-auto mb-2" />
        <h3 className="text-lg font-bold text-white">
          {createdCount} {createdCount === 1 ? "entry" : "entries"} imported
        </h3>
        {failedResults.length > 0 && (
          <p className="text-sm text-amber-400 mt-1">{failedResults.length} failed — you can retry them below.</p>
        )}
      </div>

      {affectedKeys.length > 0 && (
        <div className="flex items-center justify-center gap-2 flex-wrap">
          {affectedKeys.map((key) => (
            <Button
              key={key}
              variant="outline"
              size="sm"
              onClick={() => onGoToCategory(key)}
              className="text-[#37F2D1] border-[#37F2D1]/50 hover:bg-[#37F2D1]/10"
            >
              View {LABEL_FOR_KEY[key] || key}
            </Button>
          ))}
        </div>
      )}

      {failedResults.length > 0 && (
        <div className="bg-red-950/20 border border-red-900/40 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-red-300 font-semibold">Failed entries</span>
            <Button size="sm" variant="outline" onClick={onRetry} className="text-amber-300 border-amber-700 h-7">
              <RefreshCw className="w-3 h-3 mr-1" /> Retry failed
            </Button>
          </div>
          <ul className="space-y-1 max-h-32 overflow-y-auto">
            {failedResults.map((r) => (
              <li key={r.id} className="flex items-start gap-2 text-xs text-red-200/80">
                <XCircle className="w-3.5 h-3.5 text-red-400 mt-0.5 flex-shrink-0" />
                <span className="truncate"><span className="font-medium">{r.title}</span> — {r.error}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex justify-center pt-1">
        <Button variant="ghost" onClick={onImportAnother} className="text-slate-300">
          Import another
        </Button>
      </div>
    </div>
  );
}

function ErrorNote({ message }) {
  return (
    <div className="bg-red-950/30 border border-red-900/40 rounded-lg p-3 text-sm text-red-200 flex items-start gap-2">
      <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
      <span>{message}</span>
    </div>
  );
}
