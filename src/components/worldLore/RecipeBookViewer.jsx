import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Edit, Trash2, BookOpen, Clock, Wrench, CheckSquare, Eye, EyeOff } from "lucide-react";
import { motion } from "framer-motion";

const CATEGORIES = [
  { value: "all", label: "All", color: "#6B7280" },
  { value: "potion", label: "Potion", color: "#8B5CF6" },
  { value: "weapon", label: "Weapon", color: "#EF4444" },
  { value: "armor", label: "Armor", color: "#3B82F6" },
  { value: "tool", label: "Tool", color: "#F59E0B" },
  { value: "construct", label: "Construct", color: "#10B981" },
  { value: "mechanism", label: "Mechanism", color: "#6366F1" },
  { value: "other", label: "Other", color: "#6B7280" }
];

const DIFFICULTIES = [
  { value: "all", label: "All" },
  { value: "trivial", label: "Trivial", color: "#10B981" },
  { value: "easy", label: "Easy", color: "#3B82F6" },
  { value: "medium", label: "Medium", color: "#F59E0B" },
  { value: "hard", label: "Hard", color: "#EF4444" },
  { value: "legendary", label: "Legendary", color: "#8B5CF6" }
];

export default function RecipeBookViewer({ recipes, entries, canEdit, onEdit, onDelete }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedDifficulty, setSelectedDifficulty] = useState("all");
  const [selectedRecipe, setSelectedRecipe] = useState(null);

  const visibleRecipes = canEdit ? recipes : recipes.filter(r => r.discovered);

  const filteredRecipes = visibleRecipes.filter(recipe => {
    const matchesSearch = recipe.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         recipe.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "all" || recipe.category === selectedCategory;
    const matchesDifficulty = selectedDifficulty === "all" || recipe.difficulty === selectedDifficulty;
    
    return matchesSearch && matchesCategory && matchesDifficulty;
  });

  const groupedRecipes = CATEGORIES.slice(1).reduce((acc, cat) => {
    acc[cat.value] = filteredRecipes.filter(r => r.category === cat.value);
    return acc;
  }, {});

  const linkedEntry = selectedRecipe && entries?.find(e => e.id === selectedRecipe.entry_id);
  const difficultyData = DIFFICULTIES.find(d => d.value === selectedRecipe?.difficulty);

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-[#2A3441]/90 backdrop-blur-sm rounded-xl p-4 border border-cyan-400/30 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search recipes..."
            className="pl-10 bg-[#1E2430] border-gray-700 text-white"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-400 mb-2">Category</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.value}
                  onClick={() => setSelectedCategory(cat.value)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    selectedCategory === cat.value
                      ? 'ring-2 ring-white'
                      : 'opacity-60 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: cat.color }}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-2">Difficulty</label>
            <div className="flex flex-wrap gap-2">
              {DIFFICULTIES.map(diff => (
                <button
                  key={diff.value}
                  onClick={() => setSelectedDifficulty(diff.value)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    selectedDifficulty === diff.value
                      ? 'ring-2 ring-white'
                      : 'opacity-60 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: diff.color || '#6B7280' }}
                >
                  {diff.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recipe Grid */}
      <div className="space-y-6">
        {Object.entries(groupedRecipes).map(([category, categoryRecipes]) => {
          if (categoryRecipes.length === 0) return null;
          
          const categoryData = CATEGORIES.find(c => c.value === category);
          
          return (
            <div key={category}>
              <h3 className="text-xl font-bold mb-3 flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: categoryData.color }}
                />
                {categoryData.label}s
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                {categoryRecipes.map(recipe => {
                  const difficulty = DIFFICULTIES.find(d => d.value === recipe.difficulty);
                  
                  return (
                    <motion.div
                      key={recipe.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`bg-[#2A3441]/90 backdrop-blur-sm rounded-xl overflow-hidden border cursor-pointer transition-all hover:border-[#37F2D1] ${
                        selectedRecipe?.id === recipe.id 
                          ? 'border-[#37F2D1] ring-2 ring-[#37F2D1]/20' 
                          : 'border-cyan-400/30'
                      } ${!recipe.discovered && canEdit ? 'opacity-60' : ''}`}
                      onClick={() => setSelectedRecipe(recipe)}
                    >
                      {recipe.image_url && (
                        <div className="w-full h-32 overflow-hidden">
                          <img 
                            src={recipe.image_url} 
                            alt={recipe.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <div className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h4 className="font-bold text-white flex items-center gap-2">
                              {recipe.name}
                              {!recipe.discovered && canEdit && (
                                <EyeOff className="w-4 h-4 text-gray-500" />
                              )}
                            </h4>
                            {recipe.description && (
                              <p className="text-sm text-gray-400 mt-1">{recipe.description}</p>
                            )}
                          </div>
                        
                        {canEdit && (
                          <div className="flex gap-1 ml-2">
                            <Button
                              onClick={(e) => {
                                e.stopPropagation();
                                onEdit(recipe);
                              }}
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-[#37F2D1] hover:bg-[#37F2D1]/10"
                            >
                              <Edit className="w-3 h-3" />
                            </Button>
                            <Button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm('Delete this recipe?')) {
                                  onDelete(recipe.id);
                                }
                              }}
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-red-400 hover:bg-red-500/10"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        )}
                        </div>

                        <div className="flex items-center gap-2 mt-3">
                          <span 
                            className="text-xs px-2 py-1 rounded font-semibold"
                            style={{ backgroundColor: difficulty?.color }}
                          >
                            {difficulty?.label}
                          </span>
                          {recipe.crafting_time && (
                            <span className="text-xs text-gray-400 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {recipe.crafting_time}
                            </span>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {filteredRecipes.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No recipes found. {canEdit ? "Create your first recipe!" : "Check back later for new recipes."}</p>
          </div>
        )}
      </div>

      {/* Selected Recipe Details */}
      {selectedRecipe && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#2A3441]/90 backdrop-blur-sm rounded-xl overflow-hidden border border-cyan-400/30"
        >
          {selectedRecipe.image_url && (
            <div className="w-full h-64 overflow-hidden">
              <img 
                src={selectedRecipe.image_url} 
                alt={selectedRecipe.name}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <div className="p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-2xl font-bold text-white">{selectedRecipe.name}</h3>
                {selectedRecipe.description && (
                  <p className="text-gray-400 mt-1">{selectedRecipe.description}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span 
                  className="text-sm px-3 py-1 rounded-lg font-semibold"
                  style={{ backgroundColor: difficultyData?.color }}
                >
                  {difficultyData?.label}
                </span>
              </div>
            </div>

          {selectedRecipe.crafting_time && (
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-[#37F2D1]" />
              <span className="text-gray-300">
                <strong>Crafting Time:</strong> {selectedRecipe.crafting_time}
              </span>
            </div>
          )}

          {selectedRecipe.required_materials?.length > 0 && (
            <div>
              <h4 className="text-lg font-semibold text-[#37F2D1] mb-2 flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                Required Materials
              </h4>
              <div className="space-y-1">
                {selectedRecipe.required_materials.map((material, idx) => (
                  <div key={idx} className="text-sm text-gray-300 bg-[#1E2430] rounded-lg p-3">
                    <span className="font-semibold">{material.name}</span>
                    {material.quantity && <span className="text-gray-400"> × {material.quantity}</span>}
                    {material.notes && <span className="text-gray-500"> - {material.notes}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedRecipe.required_tools?.length > 0 && (
            <div>
              <h4 className="text-lg font-semibold text-[#37F2D1] mb-2 flex items-center gap-2">
                <Wrench className="w-5 h-5" />
                Required Tools
              </h4>
              <div className="flex flex-wrap gap-2">
                {selectedRecipe.required_tools.map((tool, idx) => (
                  <span 
                    key={idx} 
                    className="text-sm bg-[#1E2430] text-gray-300 px-3 py-1 rounded-lg"
                  >
                    {tool}
                  </span>
                ))}
              </div>
            </div>
          )}

          {selectedRecipe.skill_checks?.length > 0 && (
            <div>
              <h4 className="text-lg font-semibold text-[#37F2D1] mb-2 flex items-center gap-2">
                <CheckSquare className="w-5 h-5" />
                Required Skill Checks
              </h4>
              <div className="space-y-1">
                {selectedRecipe.skill_checks.map((check, idx) => (
                  <div key={idx} className="text-sm text-gray-300 bg-[#1E2430] rounded-lg p-3">
                    <span className="font-semibold">{check.skill}</span>
                    <span className="text-gray-400"> DC {check.dc}</span>
                    {check.notes && <span className="text-gray-500"> - {check.notes}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedRecipe.result_description && (
            <div>
              <h4 className="text-lg font-semibold text-[#37F2D1] mb-2">Result</h4>
              <p className="text-sm text-gray-300 bg-[#1E2430] rounded-lg p-3">
                {selectedRecipe.result_description}
              </p>
            </div>
          )}

          {linkedEntry && (
            <div className="bg-[#1E2430] rounded-lg p-4 border border-gray-700">
              <h4 className="text-lg font-semibold text-[#37F2D1] mb-2">
                Related Lore: {linkedEntry.title}
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