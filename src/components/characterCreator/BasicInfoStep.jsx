import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const alignments = [
  "Lawful Good", "Neutral Good", "Chaotic Good",
  "Lawful Neutral", "True Neutral", "Chaotic Neutral",
  "Lawful Evil", "Neutral Evil", "Chaotic Evil"
];

const backgrounds = [
  "Acolyte", "Charlatan", "Criminal", "Entertainer", "Folk Hero",
  "Guild Artisan", "Hermit", "Noble", "Outlander", "Sage",
  "Sailor", "Soldier", "Urchin"
];

export default function BasicInfoStep({ characterData, updateCharacterData }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#FF5722] mb-4">Basic Information</h2>
        <p className="text-gray-400 mb-6">Let's start with the basics about your character</p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div>
          <Label className="text-white mb-2 block">Character Name *</Label>
          <Input
            value={characterData.name}
            onChange={(e) => updateCharacterData({ name: e.target.value })}
            placeholder="Enter character name"
            className="bg-[#1E2430] border-gray-600 text-white"
          />
        </div>

        <div>
          <Label className="text-white mb-2 block">Background</Label>
          <Select
            value={characterData.background}
            onValueChange={(value) => updateCharacterData({ background: value })}
          >
            <SelectTrigger className="bg-[#1E2430] border-gray-600 text-white">
              <SelectValue placeholder="Select background" />
            </SelectTrigger>
            <SelectContent className="bg-[#2A3441] border-gray-600">
              {backgrounds.map((bg) => (
                <SelectItem key={bg} value={bg}>{bg}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label className="text-white mb-2 block">Alignment</Label>
        <Select
          value={characterData.alignment}
          onValueChange={(value) => updateCharacterData({ alignment: value })}
        >
          <SelectTrigger className="bg-[#1E2430] border-gray-600 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-[#2A3441] border-gray-600">
            {alignments.map((align) => (
              <SelectItem key={align} value={align}>{align}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-white mb-2 block">Character Description</Label>
        <Textarea
          value={characterData.description}
          onChange={(e) => updateCharacterData({ description: e.target.value })}
          placeholder="Tell us about your character's backstory, personality, and motivations..."
          className="bg-[#1E2430] border-gray-600 text-white min-h-32"
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label className="text-white mb-2 block">Age</Label>
          <Input
            type="number"
            value={characterData.appearance?.age || ""}
            onChange={(e) => updateCharacterData({
              appearance: { ...characterData.appearance, age: parseInt(e.target.value) }
            })}
            placeholder="25"
            className="bg-[#1E2430] border-gray-600 text-white"
          />
        </div>
        <div>
          <Label className="text-white mb-2 block">Height</Label>
          <Input
            value={characterData.appearance?.height || ""}
            onChange={(e) => updateCharacterData({
              appearance: { ...characterData.appearance, height: e.target.value }
            })}
            placeholder="5'10&quot;"
            className="bg-[#1E2430] border-gray-600 text-white"
          />
        </div>
        <div>
          <Label className="text-white mb-2 block">Weight</Label>
          <Input
            value={characterData.appearance?.weight || ""}
            onChange={(e) => updateCharacterData({
              appearance: { ...characterData.appearance, weight: e.target.value }
            })}
            placeholder="180 lbs"
            className="bg-[#1E2430] border-gray-600 text-white"
          />
        </div>
      </div>
    </div>
  );
}