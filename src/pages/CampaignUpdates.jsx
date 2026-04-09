import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle, Upload, X, Pin, Trash2 } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { motion } from "framer-motion";
import LazyImage from "@/components/ui/LazyImage";

export default function CampaignUpdates() {
  const urlParams = new URLSearchParams(window.location.search);
  const campaignId = urlParams.get('id');
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newUpdate, setNewUpdate] = useState({ title: "", content: "", image_url: "" });
  const [uploadingImage, setUploadingImage] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: campaign } = useQuery({
    queryKey: ['campaign', campaignId],
    queryFn: () => base44.entities.Campaign.filter({ id: campaignId }).then(c => c[0]),
    enabled: !!campaignId
  });

  const { data: updates = [] } = useQuery({
    queryKey: ['campaignUpdates', campaignId],
    queryFn: () => base44.entities.CampaignUpdate.filter({ campaign_id: campaignId }, '-created_date'),
    enabled: !!campaignId,
    refetchInterval: 5000
  });

  const isGM = user?.id === campaign?.game_master_id || campaign?.co_dm_ids?.includes(user?.id);

  const createUpdateMutation = useMutation({
    mutationFn: (data) => base44.entities.CampaignUpdate.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaignUpdates', campaignId] });
      setNewUpdate({ title: "", content: "", image_url: "" });
      setShowCreateForm(false);
      toast.success("Update posted!");
    }
  });

  const deleteUpdateMutation = useMutation({
    mutationFn: (updateId) => base44.entities.CampaignUpdate.delete(updateId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaignUpdates', campaignId] });
      toast.success("Update deleted");
    }
  });

  const togglePinMutation = useMutation({
    mutationFn: ({ id, isPinned }) => base44.entities.CampaignUpdate.update(id, { is_pinned: !isPinned }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaignUpdates', campaignId] });
    }
  });

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setNewUpdate({ ...newUpdate, image_url: file_url });
      toast.success("Image uploaded");
    } catch (error) {
      toast.error("Failed to upload image");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = () => {
    if (!newUpdate.title.trim() || !newUpdate.content.trim()) {
      toast.error("Title and content are required");
      return;
    }

    createUpdateMutation.mutate({
      campaign_id: campaignId,
      title: newUpdate.title,
      content: newUpdate.content,
      image_url: newUpdate.image_url || null
    });
  };

  const pinnedUpdates = updates.filter(u => u.is_pinned);
  const regularUpdates = updates.filter(u => !u.is_pinned);

  return (
    <div className="min-h-screen bg-[#1E2430] p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <Button
              variant="ghost"
              className="mb-4 pl-0 text-gray-400 hover:text-white"
              onClick={() => navigate(createPageUrl(isGM ? "CampaignGMPanel" : "CampaignPanel") + `?id=${campaignId}`)}
            >
              ← Back to Campaign
            </Button>
            <h1 className="text-4xl font-bold text-white mb-2">Campaign Updates</h1>
            <p className="text-gray-400">{campaign?.title}</p>
          </div>
          {isGM && (
            <Button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="bg-gradient-to-r from-[#FF5722] to-[#37F2D1] hover:from-[#FF6B3D] hover:to-[#2dd9bd] text-white"
            >
              <PlusCircle className="w-4 h-4 mr-2" />
              New Update
            </Button>
          )}
        </div>

        {/* Create Form */}
        {showCreateForm && isGM && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-[#2A3441] to-[#1a1f2e] rounded-2xl p-6 mb-8 border border-[#FF5722]/30"
          >
            <h3 className="text-xl font-bold text-white mb-4">Create New Update</h3>
            <div className="space-y-4">
              <Input
                placeholder="Update title..."
                value={newUpdate.title}
                onChange={(e) => setNewUpdate({ ...newUpdate, title: e.target.value })}
                className="bg-[#1E2430] border-gray-700 text-white"
              />
              
              {newUpdate.image_url && (
                <div className="relative">
                  <LazyImage src={newUpdate.image_url} alt="Cover" className="w-full h-48 rounded-lg" />
                  <button
                    onClick={() => setNewUpdate({ ...newUpdate, image_url: "" })}
                    className="absolute top-2 right-2 bg-red-500 rounded-full p-2 hover:bg-red-600"
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
                </div>
              )}

              <Textarea
                placeholder="Write your update here... (Markdown supported)"
                value={newUpdate.content}
                onChange={(e) => setNewUpdate({ ...newUpdate, content: e.target.value })}
                rows={8}
                className="bg-[#1E2430] border-gray-700 text-white"
              />

              <div className="flex items-center gap-3">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  id="cover-upload"
                />
                <label
                  htmlFor="cover-upload"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#2A3441] text-white rounded-lg cursor-pointer hover:bg-[#37F2D1] transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  {uploadingImage ? "Uploading..." : "Add Cover Image"}
                </label>
                
                <Button
                  onClick={handleSubmit}
                  disabled={createUpdateMutation.isPending}
                  className="ml-auto bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#1E2430]"
                >
                  Post Update
                </Button>
                <Button
                  onClick={() => setShowCreateForm(false)}
                  className="bg-[#FF5722] hover:bg-[#FF6B3D] text-white"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Pinned Updates */}
        {pinnedUpdates.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-[#37F2D1] mb-4">📌 Pinned Updates</h2>
            <div className="space-y-4">
              {pinnedUpdates.map(update => (
                <UpdateCard
                  key={update.id}
                  update={update}
                  isGM={isGM}
                  onDelete={() => deleteUpdateMutation.mutate(update.id)}
                  onTogglePin={() => togglePinMutation.mutate({ id: update.id, isPinned: update.is_pinned })}
                />
              ))}
            </div>
          </div>
        )}

        {/* Regular Updates */}
        <div className="space-y-4">
          {regularUpdates.map(update => (
            <UpdateCard
              key={update.id}
              update={update}
              isGM={isGM}
              onDelete={() => deleteUpdateMutation.mutate(update.id)}
              onTogglePin={() => togglePinMutation.mutate({ id: update.id, isPinned: update.is_pinned })}
            />
          ))}
        </div>

        {updates.length === 0 && (
          <div className="text-center py-16">
            <p className="text-gray-500 text-lg">No updates yet</p>
            {isGM && <p className="text-gray-600 text-sm mt-2">Create your first update to keep players informed!</p>}
          </div>
        )}
      </div>
    </div>
  );
}

function UpdateCard({ update, isGM, onDelete, onTogglePin }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-[#2A3441] to-[#1a1f2e] rounded-2xl overflow-hidden border border-[#FF5722]/20 hover:border-[#37F2D1]/50 transition-all"
    >
      {update.image_url && (
        <LazyImage src={update.image_url} alt={update.title} className="w-full h-64" />
      )}
      
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-2xl font-bold text-white mb-2">{update.title}</h3>
            <p className="text-gray-400 text-sm">
              Posted {new Date(update.created_date).toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          </div>
          
          {isGM && (
            <div className="flex gap-2">
              <Button
                size="icon"
                variant="ghost"
                onClick={onTogglePin}
                className={`${update.is_pinned ? 'text-[#37F2D1]' : 'text-gray-400'} hover:text-[#37F2D1]`}
              >
                <Pin className="w-4 h-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={onDelete}
                className="text-red-400 hover:text-red-300"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>

        <ReactMarkdown
          className="prose prose-invert prose-sm max-w-none text-gray-300"
          components={{
            h1: ({ children }) => <h1 className="text-2xl font-bold text-white mb-3">{children}</h1>,
            h2: ({ children }) => <h2 className="text-xl font-bold text-white mb-2">{children}</h2>,
            h3: ({ children }) => <h3 className="text-lg font-bold text-white mb-2">{children}</h3>,
            p: ({ children }) => <p className="mb-3 leading-relaxed">{children}</p>,
            ul: ({ children }) => <ul className="list-disc list-inside mb-3 space-y-1">{children}</ul>,
            ol: ({ children }) => <ol className="list-decimal list-inside mb-3 space-y-1">{children}</ol>,
            code: ({ inline, children }) => inline ? (
              <code className="bg-[#1E2430] px-1.5 py-0.5 rounded text-[#37F2D1] text-sm">{children}</code>
            ) : (
              <pre className="bg-[#1E2430] p-4 rounded-lg overflow-x-auto mb-3">
                <code className="text-[#37F2D1] text-sm">{children}</code>
              </pre>
            ),
            blockquote: ({ children }) => (
              <blockquote className="border-l-4 border-[#37F2D1] pl-4 italic text-gray-400 mb-3">
                {children}
              </blockquote>
            ),
          }}
        >
          {update.content}
        </ReactMarkdown>
      </div>
    </motion.div>
  );
}