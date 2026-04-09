import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Edit, Trash2, BookOpen } from "lucide-react";
import { motion } from "framer-motion";

export default function PlayerDiarySection({ diary, userProfile, isOwner, onUpdate }) {
  const [editingName, setEditingName] = useState(false);
  const [sectionName, setSectionName] = useState(diary?.section_name || "My Journal");
  const [newEntry, setNewEntry] = useState({ title: "", content: "" });
  const [showNewEntry, setShowNewEntry] = useState(false);

  const entries = diary?.entries || [];

  const handleUpdateName = () => {
    onUpdate({ ...diary, section_name: sectionName });
    setEditingName(false);
  };

  const handleAddEntry = () => {
    if (!newEntry.title.trim() || !newEntry.content.trim()) return;
    
    const updatedEntries = [
      ...entries,
      { ...newEntry, created_at: new Date().toISOString() }
    ];
    
    onUpdate({ ...diary, entries: updatedEntries });
    setNewEntry({ title: "", content: "" });
    setShowNewEntry(false);
  };

  const handleDeleteEntry = (index) => {
    const updatedEntries = entries.filter((_, i) => i !== index);
    onUpdate({ ...diary, entries: updatedEntries });
  };

  return (
    <div className="bg-[#2A3441]/90 backdrop-blur-sm rounded-xl p-6 border border-cyan-400/30">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          {userProfile?.avatar_url && (
            <img src={userProfile.avatar_url} alt="" className="w-10 h-10 rounded-full border-2 border-[#37F2D1]" />
          )}
          <div>
            {editingName && isOwner ? (
              <div className="flex gap-2">
                <Input
                  value={sectionName}
                  onChange={(e) => setSectionName(e.target.value)}
                  className="bg-[#1E2430] border-gray-700 text-white"
                />
                <Button onClick={handleUpdateName} size="sm" className="bg-[#37F2D1] text-[#1E2430]">
                  Save
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold text-white">{sectionName}</h3>
                {isOwner && (
                  <button onClick={() => setEditingName(true)} className="text-gray-400 hover:text-[#37F2D1]">
                    <Edit className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
            <p className="text-sm text-gray-400">{userProfile?.username || "Player"}'s notes</p>
          </div>
        </div>
        {isOwner && (
          <Button onClick={() => setShowNewEntry(true)} className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#1E2430]">
            <Plus className="w-4 h-4 mr-2" />
            New Entry
          </Button>
        )}
      </div>

      {entries.length > 0 ? (
        <div className="space-y-3">
          {[...entries].reverse().map((entry, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[#1E2430] rounded-lg p-4 border border-gray-700"
            >
              <div className="flex items-start justify-between mb-2">
                <h4 className="text-lg font-bold text-white">{entry.title}</h4>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">{new Date(entry.created_at).toLocaleDateString()}</span>
                  {isOwner && (
                    <button
                      onClick={() => handleDeleteEntry(entries.length - 1 - idx)}
                      className="text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
              <p className="text-gray-300 text-sm whitespace-pre-wrap">{entry.content}</p>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <BookOpen className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-500">{isOwner ? "Start writing your adventure diary!" : "No entries yet."}</p>
        </div>
      )}

      {showNewEntry && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1E2430] border border-[#37F2D1] rounded-xl p-6 max-w-2xl w-full">
            <h3 className="text-2xl font-bold mb-4">New Journal Entry</h3>
            <div className="space-y-3">
              <Input
                placeholder="Entry title"
                value={newEntry.title}
                onChange={(e) => setNewEntry({ ...newEntry, title: e.target.value })}
                className="bg-[#2A3441] border-gray-700 text-white"
              />
              <Textarea
                placeholder="Write your thoughts..."
                value={newEntry.content}
                onChange={(e) => setNewEntry({ ...newEntry, content: e.target.value })}
                className="bg-[#2A3441] border-gray-700 text-white"
                rows={8}
              />
              <div className="flex gap-2">
                <Button onClick={handleAddEntry} className="flex-1 bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#1E2430]">
                  Save Entry
                </Button>
                <Button onClick={() => setShowNewEntry(false)} variant="outline" className="flex-1">
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}