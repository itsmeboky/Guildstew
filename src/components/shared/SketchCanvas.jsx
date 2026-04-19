import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Pencil, X, Save } from "lucide-react";
import { toast } from "sonner";
import { uploadFile } from "@/utils/uploadFile";

/**
 * Sketch pad backed by Excalidraw. The Excalidraw bundle is ~1.5 MB
 * so we lazy-import it only when the user clicks Sketch. Without
 * this split, every route that touches EntryForm / PlayerNotesTab
 * would pay the Excalidraw cost up front.
 *
 * "Save Sketch" exports to PNG, uploads via uploadFile, then hands
 * the resulting url back through `onSave(url)` so the caller can
 * attach it to whatever entity triggered the sketch.
 */
export default function SketchCanvas({ onSave, campaignId, label = "Sketch" }) {
  const [isOpen, setIsOpen] = useState(false);

  if (!isOpen) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="text-slate-300 border-slate-600 hover:border-[#37F2D1] hover:text-[#37F2D1]"
      >
        <Pencil className="w-4 h-4 mr-1.5" /> {label}
      </Button>
    );
  }

  return (
    <SketchModal
      campaignId={campaignId}
      onClose={() => setIsOpen(false)}
      onSave={onSave}
    />
  );
}

function SketchModal({ campaignId, onClose, onSave }) {
  const [saving, setSaving] = useState(false);
  const [mod, setMod] = useState(null);
  const apiRef = useRef(null);

  // Load Excalidraw on-demand and cache the module. The stylesheet
  // import lives inside the dynamic chunk too so the main bundle
  // isn't bloated.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const m = await import("@excalidraw/excalidraw");
        await import("@excalidraw/excalidraw/index.css");
        if (!cancelled) setMod(m);
      } catch (err) {
        console.error("Excalidraw load failed:", err);
        if (!cancelled) toast.error("Couldn't load the sketch pad.");
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleSave = async () => {
    const api = apiRef.current;
    if (!api || !mod) return;
    setSaving(true);
    try {
      const elements = api.getSceneElements();
      const appState = api.getAppState();
      const blob = await mod.exportToBlob({
        elements,
        appState: { ...appState, exportBackground: false },
        files: api.getFiles(),
        getDimensions: () => ({ width: 1200, height: 800, scale: 2 }),
      });
      const file = new File([blob], `sketch-${Date.now()}.png`, { type: "image/png" });
      const bucket = "user-assets";
      const folder = campaignId ? `${campaignId}/sketches` : "sketches";
      const { file_url } = await uploadFile(file, bucket, folder, { uploadType: "worldLore" });
      onSave?.(file_url);
      onClose();
    } catch (err) {
      console.error("Sketch save failed:", err);
      toast.error(err?.message || "Couldn't save that sketch.");
    } finally {
      setSaving(false);
    }
  };

  const Excalidraw = mod?.Excalidraw;

  return (
    <div className="fixed inset-0 z-[200] bg-black/85 flex flex-col">
      <div className="flex justify-between items-center p-3 bg-[#1a1f2e] border-b border-slate-700">
        <span className="text-white font-semibold">Sketch Pad</span>
        <div className="flex gap-2">
          <Button
            onClick={handleSave}
            disabled={saving || !mod}
            className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#050816] font-bold"
          >
            <Save className="w-4 h-4 mr-1.5" /> {saving ? "Saving…" : "Save Sketch"}
          </Button>
          <Button variant="outline" onClick={onClose}>
            <X className="w-4 h-4 mr-1.5" /> Cancel
          </Button>
        </div>
      </div>
      <div className="flex-1 min-h-0">
        {Excalidraw ? (
          <Excalidraw excalidrawAPI={(a) => { apiRef.current = a; }} theme="dark" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm">
            Loading sketch pad…
          </div>
        )}
      </div>
    </div>
  );
}
