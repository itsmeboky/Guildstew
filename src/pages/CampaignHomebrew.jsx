import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, AlertCircle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

export default function CampaignHomebrew() {
  const urlParams = new URLSearchParams(window.location.search);
  const campaignId = urlParams.get('id');
  const [editingRule, setEditingRule] = useState(null);

  const queryClient = useQueryClient();

  const { data: campaign } = useQuery({
    queryKey: ['campaign', campaignId],
    queryFn: async () => {
      const campaigns = await base44.entities.Campaign.list();
      return campaigns.find(c => c.id === campaignId);
    },
    enabled: !!campaignId
  });

  const homebrewRules = campaign?.homebrew_rules ? JSON.parse(campaign.homebrew_rules) : [];

  const saveRulesMutation = useMutation({
    mutationFn: (rules) => base44.entities.Campaign.update(campaignId, { 
      homebrew_rules: JSON.stringify(rules) 
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign', campaignId] });
      setEditingRule(null);
    }
  });

  const handleAddRule = () => {
    setEditingRule({
      name: "",
      type: "spell_restriction",
      description: "",
      effect: {}
    });
  };

  const handleSaveRule = () => {
    const updatedRules = editingRule.id 
      ? homebrewRules.map(r => r.id === editingRule.id ? editingRule : r)
      : [...homebrewRules, { ...editingRule, id: Date.now().toString() }];
    
    saveRulesMutation.mutate(updatedRules);
  };

  const handleDeleteRule = (ruleId) => {
    const updatedRules = homebrewRules.filter(r => r.id !== ruleId);
    saveRulesMutation.mutate(updatedRules);
  };

  const ruleTypes = [
    { value: "spell_restriction", label: "Spell Restriction" },
    { value: "ability_modifier", label: "Ability Score Modifier" },
    { value: "class_restriction", label: "Class Restriction" },
    { value: "custom_rule", label: "Custom Rule" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1E2430] to-[#2A3441] p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold">Homebrew Rules</h1>
          <Button onClick={handleAddRule} className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#1E2430]">
            <Plus className="w-5 h-5 mr-2" />
            Add Rule
          </Button>
        </div>

        {/* Deprecation banner — custom rules are moving to The Brewery
            so mods are portable, shareable, and version-pinned. Spell
            and class restrictions now live in Campaign Settings →
            House Rules. */}
        <div className="bg-rose-500/10 border-2 border-rose-500/50 rounded-xl p-4 mb-8">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-rose-300 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-rose-100 font-black uppercase tracking-wider text-sm">
                Deprecated — moving to The Brewery
              </h3>
              <p className="text-rose-100/80 text-sm mt-1 max-w-prose">
                Custom rules are moving to <strong>The Brewery</strong>. Create your rules as
                Brewery mods for better compatibility, versioning, and sharing. Spell and class
                banning now lives in <strong>Campaign Settings → House Rules</strong>. Ability-
                score modifiers should be authored as Brewery <em>variant_rule</em> mods.
                This page will be removed in a future update.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-yellow-400/10 border border-yellow-400/30 rounded-xl p-4 mb-8">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-yellow-400 font-semibold">Important</p>
              <p className="text-white/80 text-sm">
                Homebrew rules affect how the game works in this campaign. Players will be notified of restrictions when creating/leveling characters.
              </p>
            </div>
          </div>
        </div>

        {/* Rules List */}
        <div className="space-y-4 mb-8">
          {homebrewRules.map(rule => (
            <div key={rule.id} className="bg-[#2A3441] rounded-xl p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-bold">{rule.name}</h3>
                    <Badge variant="outline">{ruleTypes.find(t => t.value === rule.type)?.label}</Badge>
                  </div>
                  <p className="text-gray-400">{rule.description}</p>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => setEditingRule(rule)} variant="outline" size="sm">
                    Edit
                  </Button>
                  <Button onClick={() => handleDeleteRule(rule.id)} variant="outline" size="sm" className="text-red-400">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {rule.type === 'spell_restriction' && rule.effect?.restricted_spells && (
                <div className="bg-[#1E2430] rounded-lg p-4">
                  <p className="text-sm text-gray-400 mb-2">Restricted Spells:</p>
                  <div className="flex flex-wrap gap-2">
                    {rule.effect.restricted_spells.map((spell, idx) => (
                      <Badge key={idx} variant="destructive">{spell}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}

          {homebrewRules.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <p>No homebrew rules yet. Click "Add Rule" to create one.</p>
            </div>
          )}
        </div>

        {/* Edit Rule Modal */}
        {editingRule && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-8">
            <div className="bg-[#2A3441] rounded-2xl max-w-2xl w-full p-8">
              <h2 className="text-3xl font-bold mb-6">{editingRule.id ? 'Edit Rule' : 'Create Rule'}</h2>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold mb-2">Rule Name</label>
                  <Input
                    value={editingRule.name}
                    onChange={(e) => setEditingRule({ ...editingRule, name: e.target.value })}
                    placeholder="e.g., No Wish Spell"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Rule Type</label>
                  <Select value={editingRule.type} onValueChange={(v) => setEditingRule({ ...editingRule, type: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ruleTypes.map(type => (
                        <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Description</label>
                  <Textarea
                    value={editingRule.description}
                    onChange={(e) => setEditingRule({ ...editingRule, description: e.target.value })}
                    placeholder="Explain what this rule does..."
                    rows={4}
                  />
                </div>

                {editingRule.type === 'spell_restriction' && (
                  <div>
                    <label className="block text-sm font-semibold mb-2">Restricted Spells (comma-separated)</label>
                    <Input
                      value={editingRule.effect?.restricted_spells?.join(', ') || ""}
                      onChange={(e) => setEditingRule({ 
                        ...editingRule, 
                        effect: { 
                          ...editingRule.effect, 
                          restricted_spells: e.target.value.split(',').map(s => s.trim()).filter(Boolean) 
                        } 
                      })}
                      placeholder="Wish, Power Word Kill, etc."
                    />
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <Button onClick={handleSaveRule} className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#1E2430]">
                    Save Rule
                  </Button>
                  <Button onClick={() => setEditingRule(null)} variant="outline">
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}