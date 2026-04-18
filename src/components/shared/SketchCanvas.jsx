import React, { useState } from "react";
import { Excalidraw, exportToBlob } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import { Button } from "@/components/ui/button";
import { Pencil, X, Save } from "lucide-react";
import { toast } from "sonner";
import { uploadFile } from "@/utils/uploadFile";

/**
 * Sketch pad backed by Excalidraw. The toggle renders a small
 * "Sketch" button; click it and a full-screen canvas takes over.
 * "Save Sketch" exports to PNG, uploads via uploadFile, then hands
 * the resulting url back through `onSave(url)` so the caller can
 * attach it to whatever entity triggered the sketch.
 */
export default function SketchCanvas({ onSave, campaignId, label = "Sketch" }) {
  const [isOpen, setIsOpen] = useState(false);
  const [api, setApi] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!api) return;
    setSaving(true);
    try {
      const elements = api.getSceneElements();
      const appState = api.getAppState();
      const blob = await exportToBlob({
        elements,
        appState: { ...appState, exportBackground: false },
        files: api.getFiles(),
        getDimensions: () => ({ width: 1200, height: 800, scale: 2 }),
      });
      const file = new File([blob], `sketch-${Date.now()}.png`, { type: "image/png" });
      const bucket = "campaign-assets";
      const folder = campaignId ? `${campaignId}/sketches` : "sketches";
      const { file_url } = await uploadFile(file, bucket, folder);
      onSave?.(file_url);
      setIsOpen(false);
    } catch (err) {
      console.error("Sketch save failed:", err);
      toast.error(err?.message || "Couldn't save that sketch.");
    } finally {
      setSaving(false);
    }
  };

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
    <div className="fixed inset-0 z-[200] bg-black/85 flex flex-col">
      <div className="flex justify-between items-center p-3 bg-[#1a1f2e] border-b border-slate-700">
        <span className="text-white font-semibold">Sketch Pad</span>
        <div className="flex gap-2">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#050816] font-bold"
          >
            <Save className="w-4 h-4 mr-1.5" /> {saving ? "Saving…" : "Save Sketch"}
          </Button>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            <X className="w-4 h-4 mr-1.5" /> Cancel
          </Button>
        </div>
      </div>
      <div className="flex-1 min-h-0">
        <Excalidraw excalidrawAPI={(a) => setApi(a)} theme="dark" />
      </div>
    </div>
  );
}
