
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dices, HelpCircle, X } from "lucide-react";
import { getRacialAbilityBonuses } from "@/components/dnd5e/raceData";

const abilities = [
  { key: "str", name: "Strength", description: "Physical power, athleticism, and carrying capacity" },
  { key: "dex", name: "Dexterity", description: "Agility, reflexes, and balance" },
  { key: "con", name: "Constitution", description: "Health and stamina" },
  { key: "int", name: "Intelligence", description: "Reasoning and memory" },
  { key: "wis", name: "Wisdom", description: "Awareness and insight" },
  { key: "cha", name: "Charisma", description: "Force of personality" }
];

const classRecommendations = {
  Barbarian: { primary: "str", secondary: "con", reasoning: "Barbarians need Strength for powerful melee attacks and Constitution for maximum hit points to survive in the thick of combat." },
  Bard: { primary: "cha", secondary: "dex", reasoning: "Bards use Charisma for spellcasting and social interaction, while Dexterity helps with armor class and initiative." },
  Cleric: { primary: "wis", secondary: "con", reasoning: "Clerics cast spells using Wisdom and need Constitution to maintain concentration and survive frontline combat." },
  Druid: { primary: "wis", secondary: "con", reasoning: "Druids use Wisdom for spellcasting and Constitution helps them survive in Wild Shape forms and maintain concentration." },
  Fighter: { primary: "str", secondary: "con", reasoning: "Fighters rely on Strength (or Dexterity) for attacks and Constitution for staying power in long battles." },
  Monk: { primary: "dex", secondary: "wis", reasoning: "Monks use Dexterity for attacks and AC, while Wisdom boosts their AC further and powers some abilities." },
  Paladin: { primary: "str", secondary: "cha", reasoning: "Paladins need Strength for melee combat and Charisma for spellcasting and their aura abilities." },
  Ranger: { primary: "dex", secondary: "wis", reasoning: "Rangers use Dexterity for attacks and AC, with Wisdom powering their spellcasting and survival skills." },
  Rogue: { primary: "dex", secondary: "int", reasoning: "Rogues rely on Dexterity for attacks, AC, and stealth, while Intelligence boosts Investigation and other skills." },
  Sorcerer: { primary: "cha", secondary: "con", reasoning: "Sorcerers use Charisma for spellcasting and Constitution to maintain concentration and boost low hit points." },
  Warlock: { primary: "cha", secondary: "con", reasoning: "Warlocks cast with Charisma and benefit from Constitution for concentration and survivability." },
  Wizard: { primary: "int", secondary: "con", reasoning: "Wizards use Intelligence for spellcasting and need Constitution for concentration and to compensate for low hit points." }
};

export default function AbilityScoresStep({ characterData, updateCharacterData }) {
  const [method, setMethod] = useState("manual");
  const [showHelp, setShowHelp] = useState(false);
  const [standardArray, setStandardArray] = useState([15, 14, 13, 12, 10, 8]);
  const [assignedScores, setAssignedScores] = useState({});
  const [baseScores, setBaseScores] = useState(characterData.attributes || { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 });

  const racialBonuses = getRacialAbilityBonuses(characterData.race, characterData.subrace);

  const calculateModifier = (score) => {
    const mod = Math.floor((score - 10) / 2);
    return mod >= 0 ? `+${mod}` : `${mod}`;
  };

  const getTotalScore = (abilityKey) => {
    const base = baseScores[abilityKey] || 10;
    const bonus = racialBonuses[abilityKey] || 0;
    return base + bonus;
  };

  const handleScoreChange = (key, value) => {
    const newValue = Math.max(3, Math.min(18, parseInt(value) || 8));
    const newBaseScores = { ...baseScores, [key]: newValue };
    setBaseScores(newBaseScores);
    
    // Calculate final scores with racial bonuses
    const finalScores = {};
    Object.keys(newBaseScores).forEach(k => {
      finalScores[k] = newBaseScores[k] + (racialBonuses[k] || 0);
    });
    
    updateCharacterData({ attributes: finalScores });
  };

  const rollAbilityScores = () => {
    const rollDice = () => {
      const rolls = Array(4).fill(0).map(() => Math.floor(Math.random() * 6) + 1);
      rolls.sort((a, b) => b - a);
      return rolls.slice(0, 3).reduce((a, b) => a + b, 0);
    };

    const newBaseScores = {
      str: rollDice(),
      dex: rollDice(),
      con: rollDice(),
      int: rollDice(),
      wis: rollDice(),
      cha: rollDice()
    };

    setBaseScores(newBaseScores);
    
    const finalScores = {};
    Object.keys(newBaseScores).forEach(k => {
      finalScores[k] = newBaseScores[k] + (racialBonuses[k] || 0);
    });
    
    updateCharacterData({ attributes: finalScores });
  };

  const handleStandardArrayDrop = (abilityKey, score) => {
    if (assignedScores[abilityKey] === score) return;
    
    const newAssigned = { ...assignedScores };
    const oldScore = newAssigned[abilityKey];
    
    // If the score is already assigned to another ability, swap them
    if (Object.values(newAssigned).includes(score)) {
      const swapKey = Object.keys(newAssigned).find(k => newAssigned[k] === score);
      if (swapKey) {
        newAssigned[swapKey] = oldScore; // Assign the old score to the swapped ability
      }
    }
    
    newAssigned[abilityKey] = score; // Assign the new score to the current ability
    setAssignedScores(newAssigned);
    
    const newBaseScores = { ...baseScores };
    Object.entries(newAssigned).forEach(([key, val]) => {
      if (val !== undefined) newBaseScores[key] = val;
    });
    // Ensure all abilities have a score if standard array is fully assigned, otherwise default
    abilities.forEach(ability => {
        if (!newBaseScores[ability.key] && newAssigned[ability.key] === undefined) {
            newBaseScores[ability.key] = 8; // Default value if not assigned yet
        }
    });

    setBaseScores(newBaseScores);
    
    const finalScores = {};
    Object.keys(newBaseScores).forEach(k => {
      finalScores[k] = newBaseScores[k] + (racialBonuses[k] || 0);
    });
    
    updateCharacterData({ attributes: finalScores });
  };

  const saveStandardArray = () => {
    if (Object.keys(assignedScores).length !== 6) {
      return;
    }
    setMethod("manual"); // Lock the scores by switching to manual method
  };

  const availableScores = standardArray.filter(score => 
    !Object.values(assignedScores).includes(score)
  );

  const recommendation = characterData.class ? classRecommendations[characterData.class] : null;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Explanation Section */}
      <div className="bg-[#2A3441] rounded-xl p-6 mb-8 border-2 border-[#1E2430]">
        <h2 className="text-2xl font-bold text-[#FFC6AA] mb-3">What are Ability Scores?</h2>
        <p className="text-white mb-4">
          Ability Scores are the foundation of your character. They represent your character's natural talents and capabilities. 
          Each score ranges from 3 (very poor) to 18 (exceptional). These scores determine how good your character is at different tasks.
        </p>
        <p className="text-white mb-4">
          <span className="font-bold text-[#FF5722]">The Modifier</span> is the number you'll actually use in gameplay. It's calculated from your ability score and ranges from -4 to +4 for scores between 3-18. 
          Higher scores give better modifiers!
        </p>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="bg-[#1E2430] p-3 rounded">
            <span className="font-bold text-[#FF5722]">💪 Strength:</span>
            <span className="text-white"> Melee attacks, carrying capacity</span>
          </div>
          <div className="bg-[#1E2430] p-3 rounded">
            <span className="font-bold text-[#FF5722]">🏃 Dexterity:</span>
            <span className="text-white"> Ranged attacks, sneaking, dodging</span>
          </div>
          <div className="bg-[#1E2430] p-3 rounded">
            <span className="font-bold text-[#FF5722]">❤️ Constitution:</span>
            <span className="text-white"> Hit points, endurance</span>
          </div>
          <div className="bg-[#1E2430] p-3 rounded">
            <span className="font-bold text-[#FF5722]">🧠 Intelligence:</span>
            <span className="text-white"> Knowledge, investigation</span>
          </div>
          <div className="bg-[#1E2430] p-3 rounded">
            <span className="font-bold text-[#FF5722]">👁️ Wisdom:</span>
            <span className="text-white"> Perception, insight, willpower</span>
          </div>
          <div className="bg-[#1E2430] p-3 rounded">
            <span className="font-bold text-[#FF5722]">💬 Charisma:</span>
            <span className="text-white"> Persuasion, deception, performance</span>
          </div>
        </div>
      </div>

      {/* Method Selection */}
      <div className="flex gap-3 mb-6 justify-center items-center flex-wrap">
        <Button
          onClick={() => setMethod("manual")}
          variant={method === "manual" ? "default" : "outline"}
          className={method === "manual" ? "bg-[#FF5722] hover:bg-[#FF6B3D] text-white" : "bg-[#2A3441] text-white border-[#1E2430] hover:bg-[#1E2430]"}
        >
          Manual Entry
        </Button>
        <Button
          onClick={() => { setMethod("standard"); setAssignedScores({}); }}
          variant={method === "standard" ? "default" : "outline"}
          className={method === "standard" ? "bg-[#FF5722] hover:bg-[#FF6B3D] text-white" : "bg-[#2A3441] text-white border-[#1E2430] hover:bg-[#1E2430]"}
        >
          Standard Array
        </Button>
        <Button
          onClick={() => { setMethod("roll"); rollAbilityScores(); }}
          variant={method === "roll" ? "default" : "outline"}
          className={method === "roll" ? "bg-[#FF5722] hover:bg-[#FF6B3D] text-white" : "bg-[#2A3441] text-white border-[#1E2430] hover:bg-[#1E2430]"}
        >
          <Dices className="w-4 h-4 mr-2" />
          Roll 4d6
        </Button>
        <Button
          onClick={() => setShowHelp(!showHelp)}
          variant="outline"
          className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#1E2430] border-[#37F2D1]"
        >
          <HelpCircle className="w-4 h-4 mr-2" />
          Need Help?
        </Button>
      </div>

      {/* Help Modal */}
      {showHelp && recommendation && (
        <div className="bg-[#2A3441] rounded-xl p-6 mb-6 border-2 border-[#37F2D1] relative">
          <button
            onClick={() => setShowHelp(false)}
            className="absolute top-4 right-4 text-white hover:text-[#37F2D1]"
          >
            <X className="w-5 h-5" />
          </button>
          <h3 className="text-xl font-bold text-[#37F2D1] mb-3">Recommended for {characterData.class}</h3>
          <p className="text-white mb-4">{recommendation.reasoning}</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[#1E2430] rounded-lg p-4 border-2 border-[#37F2D1]">
              <div className="text-sm text-[#37F2D1] mb-1 font-semibold">HIGHEST PRIORITY</div>
              <div className="text-2xl font-bold text-white uppercase">{recommendation.primary}</div>
              <div className="text-sm text-gray-300">Put your highest score here</div>
            </div>
            <div className="bg-[#1E2430] rounded-lg p-4 border-2 border-[#37F2D1]">
              <div className="text-sm text-[#37F2D1] mb-1 font-semibold">SECOND PRIORITY</div>
              <div className="text-2xl font-bold text-white uppercase">{recommendation.secondary}</div>
              <div className="text-sm text-gray-300">Put your second highest here</div>
            </div>
          </div>
        </div>
      )}

      {/* Standard Array Available Scores */}
      {method === "standard" && availableScores.length > 0 && (
        <div className="bg-[#2A3441] rounded-xl p-4 mb-6 border-2 border-[#37F2D1]">
          <h3 className="text-white font-semibold mb-3">Available Scores (Click to assign):</h3>
          <div className="flex gap-3 flex-wrap">
            {standardArray.map((score, idx) => {
              const isAssigned = Object.values(assignedScores).includes(score);
              return (
                <div
                  key={idx}
                  className={`
                    ${isAssigned ? "bg-gray-600 text-gray-400 cursor-not-allowed" : "bg-[#37F2D1] text-[#1E2430] cursor-pointer hover:bg-[#2dd9bd]"}
                    px-4 py-2 rounded-lg font-bold text-xl transition-colors
                  `}
                >
                  {score}
                </div>
              );
            })}
          </div>
          {Object.keys(assignedScores).length === 6 && (
            <Button
              onClick={saveStandardArray}
              className="mt-4 bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#1E2430]"
            >
              Save & Lock Scores
            </Button>
          )}
        </div>
      )}

      {/* Racial Bonus Display */}
      {Object.keys(racialBonuses).length > 0 && (
        <div className="bg-[#37F2D1]/10 border-2 border-[#37F2D1]/30 rounded-xl p-4 mb-6">
          <h3 className="text-[#37F2D1] font-bold mb-2">Racial Bonuses from {characterData.race}{characterData.subrace ? ` (${characterData.subrace})` : ''}</h3>
          <div className="flex gap-3 flex-wrap">
            {Object.entries(racialBonuses).map(([key, bonus]) => (
              <div key={key} className="bg-[#2A3441] px-3 py-1 rounded-lg">
                <span className="text-white uppercase font-bold">{key}</span>
                <span className="text-[#37F2D1] ml-2">+{bonus}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ability Score Grid */}
      <div className="grid grid-cols-3 gap-6">
        {abilities.map((ability) => {
          const baseScore = baseScores[ability.key] || 10;
          const bonus = racialBonuses[ability.key] || 0;
          const totalScore = baseScore + bonus;
          
          return (
            <div
              key={ability.key}
              className="bg-[#2A3441] rounded-xl p-6 border-2 border-[#1E2430]"
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="text-lg font-bold text-[#FFC6AA]">{ability.name}</h3>
                  <p className="text-sm text-white">{ability.description}</p>
                </div>
                <div className="text-3xl font-bold text-[#37F2D1]">
                  {calculateModifier(totalScore)}
                </div>
              </div>
              {method === "standard" ? (
                <select
                  value={assignedScores[ability.key] || ""}
                  onChange={(e) => handleStandardArrayDrop(ability.key, parseInt(e.target.value))}
                  className="w-full bg-[#1E2430] border-2 border-[#1E2430] text-white text-center text-2xl font-bold p-2 rounded"
                >
                  <option value="">Select</option>
                  {standardArray.map(score => (
                    <option 
                      key={score} 
                      value={score} 
                      disabled={Object.values(assignedScores).includes(score) && assignedScores[ability.key] !== score}
                    >
                      {score}
                    </option>
                  ))}
                </select>
              ) : (
                <Input
                  type="number"
                  min="3"
                  max="18"
                  value={baseScore}
                  onChange={(e) => handleScoreChange(ability.key, e.target.value)}
                  className="bg-[#1E2430] border-2 border-[#1E2430] text-white text-center text-2xl font-bold placeholder:text-gray-500"
                />
              )}
              
              {bonus > 0 && (
                <div className="mt-2 text-center">
                  <div className="text-sm text-white/60">
                    Base: {baseScore} + Racial: +{bonus}
                  </div>
                  <div className="text-lg font-bold text-[#37F2D1]">
                    = {totalScore}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
