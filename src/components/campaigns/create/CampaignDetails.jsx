import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Upload, FileText } from "lucide-react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

export default function CampaignDetails({ data, onChange }) {
  const [uploading, setUploading] = useState(false);
  const [uploadedImages, setUploadedImages] = useState([]);

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setUploadedImages([...uploadedImages, file_url]);
    } catch (error) {
      console.error("Failed to upload image:", error);
    } finally {
      setUploading(false);
    }
  };

  const quillModules = {
    toolbar: [
      [{ header: [1, 2, 3, false] }],
      ["bold", "italic", "underline", "strike"],
      [{ list: "ordered" }, { list: "bullet" }],
      ["blockquote", "code-block"],
      [{ color: [] }, { background: [] }],
      ["link"],
      ["clean"]
    ]
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-6">Campaign Details</h2>
        <p className="text-gray-400 mb-6">
          Build your campaign world. Add lore, homebrew rules, notes, and upload reference images.
        </p>
      </div>

      <Tabs defaultValue="description" className="w-full">
        <TabsList className="bg-[#1E2430] mb-4">
          <TabsTrigger value="description">Description</TabsTrigger>
          <TabsTrigger value="worldlore">World Lore</TabsTrigger>
          <TabsTrigger value="homebrew">Homebrew Rules</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
          <TabsTrigger value="images">Images</TabsTrigger>
        </TabsList>

        <TabsContent value="description">
          <div className="space-y-4">
            <Label className="text-white">Campaign Description</Label>
            <Textarea
              value={data.description}
              onChange={(e) => onChange({ description: e.target.value })}
              placeholder="A brief description of your campaign..."
              className="bg-[#1E2430] border-gray-700 text-white min-h-[200px]"
            />
          </div>
        </TabsContent>

        <TabsContent value="worldlore">
          <div className="space-y-4">
            <Label className="text-white">World Lore & Setting</Label>
            <div className="bg-[#1E2430] rounded-lg overflow-hidden">
              <ReactQuill
                value={data.world_lore}
                onChange={(value) => onChange({ world_lore: value })}
                modules={quillModules}
                placeholder="Describe your campaign world, its history, factions, and key locations..."
                className="text-white quill-dark"
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="homebrew">
          <div className="space-y-4">
            <Label className="text-white">Homebrew Rules & Modifications</Label>
            <div className="bg-[#1E2430] rounded-lg overflow-hidden">
              <ReactQuill
                value={data.homebrew_rules}
                onChange={(value) => onChange({ homebrew_rules: value })}
                modules={quillModules}
                placeholder="Document any custom rules, modifications, or house rules..."
                className="text-white quill-dark"
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="notes">
          <div className="space-y-4">
            <Label className="text-white">Campaign Notes</Label>
            <div className="bg-[#1E2430] rounded-lg overflow-hidden">
              <ReactQuill
                value={data.notes}
                onChange={(value) => onChange({ notes: value })}
                modules={quillModules}
                placeholder="Keep track of important events, NPCs, plot threads..."
                className="text-white quill-dark"
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="images">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Label className="text-white">Campaign Images & Maps</Label>
              <label htmlFor="detail-upload">
                <Button
                  type="button"
                  variant="outline"
                  disabled={uploading}
                  className="text-[#2A3441]"
                  onClick={() => document.getElementById('detail-upload').click()}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {uploading ? "Uploading..." : "Upload Image"}
                </Button>
                <input
                  id="detail-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
            </div>

            <div className="grid grid-cols-3 gap-4">
              {uploadedImages.map((url, idx) => (
                <div key={idx} className="aspect-video rounded-lg overflow-hidden border-2 border-gray-700">
                  <img src={url} alt={`Campaign asset ${idx + 1}`} className="w-full h-full object-cover" />
                </div>
              ))}
              {uploadedImages.length === 0 && (
                <div className="col-span-3 text-center py-12 text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No images uploaded yet</p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <style jsx global>{`
        .quill-dark .ql-toolbar {
          background: #1E2430;
          border: 1px solid #374151;
          border-radius: 8px 8px 0 0;
        }
        .quill-dark .ql-container {
          background: #1E2430;
          border: 1px solid #374151;
          border-top: none;
          border-radius: 0 0 8px 8px;
          min-height: 300px;
        }
        .quill-dark .ql-editor {
          color: white;
          min-height: 300px;
        }
        .quill-dark .ql-editor.ql-blank::before {
          color: #9CA3AF;
        }
        .quill-dark .ql-stroke {
          stroke: #9CA3AF;
        }
        .quill-dark .ql-fill {
          fill: #9CA3AF;
        }
        .quill-dark .ql-picker-label {
          color: #9CA3AF;
        }
      `}</style>
    </div>
  );
}