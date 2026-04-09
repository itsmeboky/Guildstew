import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, Eye, EyeOff, Edit, Trash2 } from "lucide-react";
import { motion } from "framer-motion";

const RELATIONSHIP_COLORS = {
  ally: "#10b981",
  enemy: "#ef4444",
  rival: "#f59e0b",
  parent: "#8b5cf6",
  child: "#ec4899",
  spouse: "#f472b6",
  neutral: "#6b7280"
};

export default function PantheonViewer({ deities, entries, canEdit, onSelectDeity, onDeleteDeity }) {
  const [selectedDeity, setSelectedDeity] = useState(null);

  const visibleDeities = canEdit ? deities : deities.filter(d => d.discovered);
  const linkedEntry = selectedDeity && entries?.find(e => e.id === selectedDeity.entry_id);

  const getDeityName = (deityId) => {
    return deities.find(d => d.id === deityId)?.name || "Unknown";
  };

  return (
    <div className="space-y-6">
      {/* Deity Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {visibleDeities.map(deity => (
          <motion.div
            key={deity.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`bg-[#2A3441]/90 backdrop-blur-sm rounded-xl overflow-hidden border cursor-pointer transition-all hover:border-[#37F2D1] ${
              selectedDeity?.id === deity.id 
                ? 'border-[#37F2D1] ring-2 ring-[#37F2D1]/20' 
                : 'border-cyan-400/30'
            } ${!deity.discovered && canEdit ? 'opacity-60' : ''}`}
            onClick={() => setSelectedDeity(deity)}
          >
            {deity.image_url && (
              <div className="w-full h-40 bg-[#1E2430] overflow-hidden">
                <img 
                  src={deity.image_url} 
                  alt={deity.name}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            {!deity.image_url && deity.symbol_url && (
              <div className="w-full h-32 bg-[#1E2430] flex items-center justify-center p-4">
                <img 
                  src={deity.symbol_url} 
                  alt={deity.name}
                  className="max-w-full max-h-full object-contain"
                />
              </div>
            )}
            <div className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    {deity.name}
                    {!deity.discovered && canEdit && (
                      <EyeOff className="w-4 h-4 text-gray-500" />
                    )}
                  </h3>
                  {deity.title && (
                    <p className="text-sm text-[#37F2D1] italic">{deity.title}</p>
                  )}
                </div>
              </div>

              {deity.domains && deity.domains.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {deity.domains.slice(0, 3).map((domain, idx) => (
                    <span key={idx} className="text-xs px-2 py-0.5 bg-[#37F2D1]/20 text-[#37F2D1] rounded">
                      {domain}
                    </span>
                  ))}
                  {deity.domains.length > 3 && (
                    <span className="text-xs px-2 py-0.5 text-gray-400">+{deity.domains.length - 3}</span>
                  )}
                </div>
              )}

              {deity.alignment && (
                <p className="text-xs text-gray-400 mt-2">{deity.alignment}</p>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {visibleDeities.length === 0 && (
        <div className="text-center py-12">
          <Sparkles className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-500">
            {canEdit ? "No deities created yet. Create your pantheon!" : "The divine realm remains shrouded in mystery..."}
          </p>
        </div>
      )}

      {/* Selected Deity Details */}
      {selectedDeity && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#2A3441]/90 backdrop-blur-sm rounded-xl overflow-hidden border border-cyan-400/30"
        >
          {selectedDeity.image_url && (
            <div className="w-full h-64 bg-[#1E2430] overflow-hidden">
              <img 
                src={selectedDeity.image_url} 
                alt={selectedDeity.name}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          
          <div className="p-6 space-y-4">
            {selectedDeity.symbol_url && (
              <div className="flex justify-center mb-4">
                <div className="w-24 h-24 bg-[#1E2430] rounded-lg flex items-center justify-center p-3 border border-gray-700">
                  <img 
                    src={selectedDeity.symbol_url} 
                    alt="Symbol"
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
              </div>
            )}
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-3xl font-bold text-white">{selectedDeity.name}</h2>
                {selectedDeity.title && (
                  <p className="text-xl text-[#37F2D1] italic mt-1">{selectedDeity.title}</p>
                )}
              </div>
              {canEdit && (
                <div className="flex gap-2">
                  <Button
                    onClick={(e) => { e.stopPropagation(); onSelectDeity(selectedDeity); }}
                    size="sm"
                    className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#1E2430]"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    onClick={(e) => { e.stopPropagation(); onDeleteDeity(selectedDeity.id); }}
                    size="sm"
                    variant="destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>

            {selectedDeity.domains && selectedDeity.domains.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-400 mb-2">Domains</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedDeity.domains.map((domain, idx) => (
                    <span key={idx} className="px-3 py-1 bg-[#37F2D1]/20 text-[#37F2D1] rounded-lg text-sm font-semibold">
                      {domain}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {selectedDeity.alignment && (
              <div>
                <h4 className="text-sm font-semibold text-gray-400 mb-1">Alignment</h4>
                <p className="text-white">{selectedDeity.alignment}</p>
              </div>
            )}

            {selectedDeity.holy_text && (
              <div>
                <h4 className="text-sm font-semibold text-gray-400 mb-1">Holy Text</h4>
                <p className="text-white italic">{selectedDeity.holy_text}</p>
              </div>
            )}

            {selectedDeity.description && (
              <div>
                <h4 className="text-sm font-semibold text-gray-400 mb-2">Divine Lore</h4>
                <p className="text-gray-300 whitespace-pre-wrap">{selectedDeity.description}</p>
              </div>
            )}

            {selectedDeity.followers && (
              <div>
                <h4 className="text-sm font-semibold text-gray-400 mb-2">Followers</h4>
                <p className="text-gray-300 whitespace-pre-wrap">{selectedDeity.followers}</p>
              </div>
            )}

            {selectedDeity.relationships && selectedDeity.relationships.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-400 mb-3">Divine Relationships</h4>
                <div className="space-y-2">
                  {selectedDeity.relationships.map((rel, idx) => (
                    <div 
                      key={idx} 
                      className="bg-[#1E2430] rounded-lg p-3 border-l-4"
                      style={{ borderLeftColor: RELATIONSHIP_COLORS[rel.relationship_type] }}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span 
                          className="text-xs font-semibold px-2 py-0.5 rounded"
                          style={{ backgroundColor: RELATIONSHIP_COLORS[rel.relationship_type], color: 'white' }}
                        >
                          {rel.relationship_type.toUpperCase()}
                        </span>
                        <span className="text-white font-semibold">{getDeityName(rel.deity_id)}</span>
                      </div>
                      {rel.description && (
                        <p className="text-sm text-gray-400">{rel.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {linkedEntry && (
              <div className="bg-[#1E2430] rounded-lg p-4 border border-gray-700">
                <h4 className="text-lg font-semibold text-[#37F2D1] mb-2">
                  {linkedEntry.title}
                </h4>
                <div 
                  className="prose prose-invert prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: linkedEntry.content || '<p class="text-gray-400">No lore written yet.</p>' }}
                />
              </div>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}