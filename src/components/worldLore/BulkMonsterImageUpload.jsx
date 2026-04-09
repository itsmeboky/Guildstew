import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload, X, Check, AlertCircle, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function BulkMonsterImageUpload({ monsters, onComplete, onCancel }) {
  const [uploading, setUploading] = useState(false);
  const [matches, setMatches] = useState([]);
  const [uploadProgress, setUploadProgress] = useState(0);

  const normalizeString = (str) => {
    return str
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .trim();
  };

  const findMatchingMonster = (filename, monsters) => {
    const nameWithoutExt = filename.replace(/\.[^/.]+$/, "");
    const normalized = normalizeString(nameWithoutExt);
    
    return monsters.find(monster => 
      normalizeString(monster.name) === normalized
    );
  };

  const handleFileSelection = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    const newMatches = files.map(file => {
      const matchedMonster = findMatchingMonster(file.name, monsters);
      return {
        file,
        filename: file.name,
        monster: matchedMonster,
        status: matchedMonster ? 'matched' : 'unmatched',
        imageUrl: null
      };
    });

    setMatches(newMatches);
  };

  const handleManualMatch = (index, monsterId) => {
    const updated = [...matches];
    const monster = monsters.find(m => m.id === monsterId);
    updated[index].monster = monster;
    updated[index].status = monster ? 'matched' : 'unmatched';
    setMatches(updated);
  };

  const handleUploadAll = async () => {
    const matchedItems = matches.filter(m => m.monster);
    
    if (matchedItems.length === 0) {
      toast.error("No matched monsters to upload");
      return;
    }

    setUploading(true);
    let completed = 0;

    try {
      for (const match of matchedItems) {
        try {
          // Upload image
          const { file_url } = await base44.integrations.Core.UploadFile({ file: match.file });
          
          // Update monster with image
          await base44.entities.Monster.update(match.monster.id, {
            image_url: file_url
          });

          match.imageUrl = file_url;
          match.status = 'uploaded';
          completed++;
          setUploadProgress(Math.round((completed / matchedItems.length) * 100));
        } catch (error) {
          match.status = 'error';
          console.error(`Failed to upload ${match.filename}:`, error);
        }
      }

      toast.success(`Successfully uploaded ${completed} monster images!`);
      setTimeout(() => {
        onComplete();
      }, 1000);
    } catch (error) {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const matchedCount = matches.filter(m => m.monster).length;
  const unmatchedCount = matches.filter(m => !m.monster).length;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1E2430] border border-[#37F2D1] rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-white/10">
          <h2 className="text-2xl font-bold text-white">Bulk Upload Monster Images</h2>
          <p className="text-gray-400 text-sm mt-1">
            Upload multiple images at once. Filenames should match monster names (e.g., "Goblin.png", "Dragon.jpg")
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {matches.length === 0 ? (
            <div>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileSelection}
                className="hidden"
                id="bulk-upload-input"
              />
              <label
                htmlFor="bulk-upload-input"
                className="flex flex-col items-center justify-center w-full h-64 bg-[#2A3441] border-2 border-dashed border-gray-700 rounded-lg cursor-pointer hover:border-[#37F2D1] transition-colors"
              >
                <Upload className="w-12 h-12 text-gray-400 mb-4" />
                <span className="text-gray-300 text-lg font-semibold">Choose Images</span>
                <span className="text-gray-500 text-sm mt-2">Select multiple images to upload</span>
              </label>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Summary */}
              <div className="flex gap-4 mb-4">
                <div className="flex-1 bg-green-500/20 border border-green-500/30 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <Check className="w-5 h-5 text-green-400" />
                    <span className="text-white font-semibold">{matchedCount} Matched</span>
                  </div>
                </div>
                {unmatchedCount > 0 && (
                  <div className="flex-1 bg-yellow-500/20 border border-yellow-500/30 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-yellow-400" />
                      <span className="text-white font-semibold">{unmatchedCount} Unmatched</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Progress Bar */}
              {uploading && (
                <div className="bg-[#2A3441] rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white text-sm">Uploading...</span>
                    <span className="text-[#37F2D1] text-sm font-bold">{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-[#1E2430] rounded-full h-2">
                    <div 
                      className="bg-[#37F2D1] h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Matches List */}
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {matches.map((match, index) => (
                  <div 
                    key={index} 
                    className={`bg-[#2A3441] rounded-lg p-3 border ${
                      match.status === 'uploaded' ? 'border-green-500/50' :
                      match.status === 'error' ? 'border-red-500/50' :
                      match.monster ? 'border-green-500/30' : 'border-yellow-500/30'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-[#1E2430] rounded overflow-hidden flex-shrink-0">
                        <img 
                          src={URL.createObjectURL(match.file)} 
                          alt={match.filename}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-gray-400 truncate">{match.filename}</div>
                        {match.monster ? (
                          <div className="text-white font-semibold flex items-center gap-2">
                            <Check className="w-4 h-4 text-green-400" />
                            {match.monster.name}
                          </div>
                        ) : (
                          <select
                            value={match.monster?.id || ""}
                            onChange={(e) => handleManualMatch(index, e.target.value)}
                            className="mt-1 w-full bg-[#1E2430] border border-gray-700 rounded px-2 py-1 text-sm text-white"
                            disabled={uploading}
                          >
                            <option value="">Select monster...</option>
                            {monsters.map(m => (
                              <option key={m.id} value={m.id}>{m.name}</option>
                            ))}
                          </select>
                        )}
                      </div>

                      <div className="flex-shrink-0">
                        {match.status === 'uploaded' && <Check className="w-5 h-5 text-green-400" />}
                        {match.status === 'error' && <AlertCircle className="w-5 h-5 text-red-400" />}
                        {match.status === 'matched' && !uploading && <Check className="w-5 h-5 text-green-400/50" />}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-white/10 flex gap-3">
          {matches.length > 0 && (
            <Button
              onClick={handleUploadAll}
              disabled={uploading || matchedCount === 0}
              className="flex-1 bg-[#FF5722] hover:bg-[#FF6B3D] text-white"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading {uploadProgress}%
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload {matchedCount} Image{matchedCount !== 1 ? 's' : ''}
                </>
              )}
            </Button>
          )}
          <Button
            onClick={onCancel}
            variant="outline"
            disabled={uploading}
            className={matches.length > 0 ? '' : 'flex-1'}
          >
            {matches.length > 0 ? 'Cancel' : 'Close'}
          </Button>
        </div>
      </div>
    </div>
  );
}