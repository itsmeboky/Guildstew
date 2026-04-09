import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Upload, Search, Check, Sparkles, Swords, Zap } from "lucide-react";
import { toast } from "sonner";
import { allItemsWithEnchanted as allItems } from "@/components/dnd5e/itemData";
import { abilityIcons, abilityDetails, allAbilities, saveAbilityIcons, loadAbilityIcons } from "@/components/dnd5e/abilityData";

export default function BackendAdmin() {
  const [activeTab, setActiveTab] = useState("items");
  const [searchQuery, setSearchQuery] = useState("");
  const [uploadingItems, setUploadingItems] = useState(new Set());
  const [uploadedItems, setUploadedItems] = useState(new Set());
  
  // Ability icons state
  const [currentAbilityIcons, setCurrentAbilityIcons] = useState(() => loadAbilityIcons());
  const [uploadingAbilities, setUploadingAbilities] = useState(new Set());
  const [uploadedAbilities, setUploadedAbilities] = useState(new Set());
  const [abilitySearchQuery, setAbilitySearchQuery] = useState("");
  const [abilityClassFilter, setAbilityClassFilter] = useState("all");
  
  const [itemIcons, setItemIcons] = useState({
    "Club": "https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/6917dd35b600199681c5b960/2bbbf582f_2.png",
    "Dagger": "https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/6917dd35b600199681c5b960/b9b10c0b6_75.png",
    "Greatclub": "https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/6917dd35b600199681c5b960/e181c5a02_8.png",
    "Handaxe": "https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/6917dd35b600199681c5b960/56adc2044_6.png",
    "Javelin": "https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/6917dd35b600199681c5b960/ee091b851_3.png",
    "Light Hammer": "https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/6917dd35b600199681c5b960/bfdffca4d_39.png",
    "Mace": "https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/6917dd35b600199681c5b960/6dd43d4ff_17.png",
    "Quarterstaff": "https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/6917dd35b600199681c5b960/9405b3fd8_3.png",
    "Sickle": "https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/6917dd35b600199681c5b960/9bd585ec0_29.png",
    "Spear": "https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/6917dd35b600199681c5b960/65ca04514_62.png",
    "Light Crossbow": "https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/6917dd35b600199681c5b960/d9bd348be_34.png",
    "Dart": "https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/6917dd35b600199681c5b960/2fff5789f_15.png",
    "Shortbow": "https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/6917dd35b600199681c5b960/ddfd54307_3.png",
    "Battleaxe": "https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/6917dd35b600199681c5b960/a943ad99c_41.png",
    "Flail": "https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/6917dd35b600199681c5b960/9cf1255fc_6.png",
    "Glaive": "https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/6917dd35b600199681c5b960/5fbb3e9a4_16.png",
    "Greataxe": "https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/6917dd35b600199681c5b960/ca3d2ddc8_48.png",
    "Sling": "https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/6917dd35b600199681c5b960/8ead95583_ChatGPTImageNov23202506_41_49PM.png",
    "Greatsword": "https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/6917dd35b600199681c5b960/a4f90fb36_13.png",
    "Lance": "https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/6917dd35b600199681c5b960/a8000b674_392.png",
    "Longsword": "https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/6917dd35b600199681c5b960/4544800a5_10.png",
    "Maul": "https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/6917dd35b600199681c5b960/46ae9a8e3_33.png",
    "Morningstar": "https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/6917dd35b600199681c5b960/de11bb69b_18.png",
    "Pike": "https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/6917dd35b600199681c5b960/48e76a858_47.png",
    "Rapier": "https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/6917dd35b600199681c5b960/40de4fb67_8.png",
    "Scimitar": "https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/6917dd35b600199681c5b960/26c7adb23_9.png",
    "Shortsword": "https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/6917dd35b600199681c5b960/48ccd3d89_1.png",
    "Trident": "https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/6917dd35b600199681c5b960/f87a0b7ea_38.png",
    "War Pick": "https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/6917dd35b600199681c5b960/b06cd1778_26.png",
    "Warhammer": "https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/6917dd35b600199681c5b960/c3035e244_47.png",
    "Whip": "https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/6917dd35b600199681c5b960/7d36cfe51_33.png",
    "Halberd": "https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/6917dd35b600199681c5b960/6975294e7_ChatGPTImageNov23202506_48_03PM.png",
    "Hand Crossbow": "https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/6917dd35b600199681c5b960/8cb465fd3_38.png",
    "Heavy Crossbow": "https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/6917dd35b600199681c5b960/02c94c830_36.png",
    "Longbow": "https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/6917dd35b600199681c5b960/0b6793ed2_16.png",
    "Padded Armor": "https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/6917dd35b600199681c5b960/3102b0c64_18.png",
    "Leather Armor": "https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/6917dd35b600199681c5b960/faebe8827_18.png",
    "Studded Leather Armor": "https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/6917dd35b600199681c5b960/720dadbfb_15.png",
    "Hide Armor": "https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/6917dd35b600199681c5b960/2a1c5544a_19.png",
    "Chain Shirt": "https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/6917dd35b600199681c5b960/95ecc8459_ChatGPTImageNov23202510_43_24PM.png",
    "Scale Mail": "https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/6917dd35b600199681c5b960/0822a9aca_34.png",
    "Breastplate": "https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/6917dd35b600199681c5b960/dd42107e8_31.png",
    "Half Plate Armor": "https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/6917dd35b600199681c5b960/ad30b5c58_21.png",
    "Blowgun": "https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/6917dd35b600199681c5b960/4bc4e3ff8_ChatGPTImageNov23202506_51_37PM.png",
    "Net": "https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/6917dd35b600199681c5b960/21d28d511_ChatGPTImageNov23202510_51_11PM.png",
    "Ring Mail": "https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/6917dd35b600199681c5b960/8a4d8a8a4_28.png",
    "Chain Mail": "https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/6917dd35b600199681c5b960/59c024995_ChatGPTImageNov23202510_46_07PM.png",
    "Splint Armor": "https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/6917dd35b600199681c5b960/247d86965_36.png",
    "Plate Armor": "https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/6917dd35b600199681c5b960/8ba174655_22.png",
    "Shield": "https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/6917dd35b600199681c5b960/69f6a6eca_1.png",
    "Blanket": "https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/6917dd35b600199681c5b960/b600e1846_Blanket.png",
    "Bell": "https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/6917dd35b600199681c5b960/84a9fbc1f_Bell.png",
    "Bedroll": "https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/6917dd35b600199681c5b960/1bbeaa59a_Bedroll.png",
    "Basket": "https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/6917dd35b600199681c5b960/a1dd271f4_Basket.png",
    "Barrel": "https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/6917dd35b600199681c5b960/877cd4cc4_Barrel.png",
    "Backpack": "https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/6917dd35b600199681c5b960/1071981c9_Backpack.png",
    "Ammunition (Sling Bullets, 20)": "https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/6917dd35b600199681c5b960/f5c1d8fce_AmmunitionSlingBullets20.png",
    "Ammunition (Crossbow Bolts, 20)": "https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/6917dd35b600199681c5b960/7ab2ca128_AmmunitionCrossbowBolts20.png",
    "Ammunition (Blowgun Needles, 50)": "https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/6917dd35b600199681c5b960/6c9cc6a8e_AmmunitionBlowgunNeedles50.png",
    "Ammunition (Arrows, 20)": "https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/6917dd35b600199681c5b960/624430ed4_AmmunitionArrows20.png",
    "Abacus": "https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/6917dd35b600199681c5b960/c02bf73c0_Abacus.png",
    "Acid (vial)": "https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/6917dd35b600199681c5b960/0d722f82e_22.png",
    "Alchemist's Fire (flask)": "https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/6917dd35b600199681c5b960/573121f1b_34.png",
    "Ball Bearings (bag of 1,000)": "https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/6917dd35b600199681c5b960/1f1595e04_BallBearings.png",
    "Antitoxin (vial)": "https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/6917dd35b600199681c5b960/fd930a0bf_47.png",
    "Book": "https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/6917dd35b600199681c5b960/87f3de690_12.png",
    "Shield +1": "https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/6917dd35b600199681c5b960/ab598942f_32.png",
    "Shield +2": "https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/6917dd35b600199681c5b960/c4a17c82c_2.png",
    "Shield +3": "https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/6917dd35b600199681c5b960/84f5d2d76_27.png",
    "Bottle, Glass": "https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/6917dd35b600199681c5b960/9b7a6e374_BottleGlass.png",
    "Longbow +1": "https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/6917dd35b600199681c5b960/375343954_5.png",
    "Longbow +2": "https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/6917dd35b600199681c5b960/cf9e2a586_4.png",
    "Longbow +3": "https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/6917dd35b600199681c5b960/b0273522a_9.png",
    "Heavy Crossbow +1": "https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/6917dd35b600199681c5b960/4552403a3_31.png",
    "Heavy Crossbow +2": "https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/6917dd35b600199681c5b960/f624ebc5f_32.png",
    "Heavy Crossbow +3": "https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/6917dd35b600199681c5b960/6f5ac4258_48.png",
    "Hand Crossbow +1": "https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/6917dd35b600199681c5b960/4102459a1_50.png",
    "Hand Crossbow +2": "https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/6917dd35b600199681c5b960/98d4b53a0_41.png",
    "Hand Crossbow +3": "https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/6917dd35b600199681c5b960/da2441b82_35.png",
    "Bucket": "https://base44.app/api/apps/6917dd35b600199681c5b960/files/public/6917dd35b600199681c5b960/c76f998e7_Bucket.png"
  });

  // Load existing item icons from itemData on mount
  React.useEffect(() => {
    setUploadedItems(new Set(Object.keys(itemIcons)));
  }, []);

  // Load existing ability icons on mount
  React.useEffect(() => {
    const loaded = loadAbilityIcons();
    setCurrentAbilityIcons(loaded);
    setUploadedAbilities(new Set(Object.keys(loaded).filter(k => loaded[k])));
  }, []);

  const filteredItems = React.useMemo(() => {
    if (!searchQuery) return allItems;
    return allItems.filter(item => 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);

  const handleFileUpload = async (itemName, file) => {
    if (!file) return;

    setUploadingItems(prev => new Set([...prev, itemName]));
    
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      setItemIcons(prev => ({ ...prev, [itemName]: file_url }));
      setUploadedItems(prev => new Set([...prev, itemName]));
      toast.success(`Uploaded icon for ${itemName}`);
    } catch (error) {
      toast.error(`Failed to upload icon for ${itemName}`);
    } finally {
      setUploadingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(itemName);
        return newSet;
      });
    }
  };

  const handleGenerateIcon = async (item) => {
    setUploadingItems(prev => new Set([...prev, item.name]));
    
    try {
      const { url } = await base44.integrations.Core.GenerateImage({
        prompt: `3D rendered game icon 512x512px: ${item.name}. ${item.description}. LARGE item filling 70% of frame, stylized diagonal positioning, centered on dark gradient background (purple-orange), dramatic lighting, rich textures, magical glow, professional RPG inventory icon style like Diablo/WoW, highly detailed, close-up view.`
      });
      
      setItemIcons(prev => ({ ...prev, [item.name]: url }));
      setUploadedItems(prev => new Set([...prev, item.name]));
      toast.success(`Generated icon for ${item.name}`);
    } catch (error) {
      toast.error(`Failed to generate icon for ${item.name}`);
    } finally {
      setUploadingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(item.name);
        return newSet;
      });
    }
  };

  const handleBulkUpload = async (files) => {
    for (const file of files) {
      const fileName = file.name.replace(/\.(png|jpg|jpeg|webp)$/i, '').trim();
      
      // Try to match filename to item name
      const matchedItem = allItems.find(item => 
        item.name.toLowerCase() === fileName.toLowerCase() ||
        item.name.toLowerCase().replace(/[^a-z0-9]/g, '') === fileName.toLowerCase().replace(/[^a-z0-9]/g, '')
      );

      if (matchedItem && !itemIcons[matchedItem.name]) {
        await handleFileUpload(matchedItem.name, file);
      }
    }
  };

  const exportItemIcons = () => {
    const dataStr = JSON.stringify(itemIcons, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = 'item-icons.json';
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    toast.success('Exported item icons mapping');
  };

  // Ability icon handlers
  const filteredAbilities = React.useMemo(() => {
    return allAbilities.filter(name => {
      const ability = abilityDetails[name];
      if (abilitySearchQuery && !name.toLowerCase().includes(abilitySearchQuery.toLowerCase())) {
        return false;
      }
      if (abilityClassFilter !== "all") {
        if (abilityClassFilter === "racial") {
          if (!ability.race) return false;
        } else if (ability.class !== abilityClassFilter) {
          return false;
        }
      }
      return true;
    });
  }, [abilitySearchQuery, abilityClassFilter]);

  const handleAbilityFileUpload = async (abilityName, file) => {
    if (!file) return;

    setUploadingAbilities(prev => new Set([...prev, abilityName]));
    
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      const newIcons = { ...currentAbilityIcons, [abilityName]: file_url };
      setCurrentAbilityIcons(newIcons);
      saveAbilityIcons(newIcons);
      setUploadedAbilities(prev => new Set([...prev, abilityName]));
      toast.success(`Uploaded icon for ${abilityName}`);
    } catch (error) {
      toast.error(`Failed to upload icon for ${abilityName}`);
    } finally {
      setUploadingAbilities(prev => {
        const newSet = new Set(prev);
        newSet.delete(abilityName);
        return newSet;
      });
    }
  };

  const handleGenerateAbilityIcon = async (abilityName) => {
    const ability = abilityDetails[abilityName];
    setUploadingAbilities(prev => new Set([...prev, abilityName]));
    
    try {
      const { url } = await base44.integrations.Core.GenerateImage({
        prompt: `3D rendered game ability icon 512x512px: ${abilityName}. ${ability.description}. Stylized magical ability icon, glowing effects, dynamic energy, centered on dark gradient background (purple-blue), dramatic lighting, professional RPG skill icon style like World of Warcraft, highly detailed, action-oriented.`
      });
      
      const newIcons = { ...currentAbilityIcons, [abilityName]: url };
      setCurrentAbilityIcons(newIcons);
      saveAbilityIcons(newIcons);
      setUploadedAbilities(prev => new Set([...prev, abilityName]));
      toast.success(`Generated icon for ${abilityName}`);
    } catch (error) {
      toast.error(`Failed to generate icon for ${abilityName}`);
    } finally {
      setUploadingAbilities(prev => {
        const newSet = new Set(prev);
        newSet.delete(abilityName);
        return newSet;
      });
    }
  };

  const handleAbilityBulkUpload = async (files) => {
    for (const file of files) {
      const fileName = file.name.replace(/\.(png|jpg|jpeg|webp)$/i, '').trim();
      
      const matchedAbility = allAbilities.find(name => 
        name.toLowerCase() === fileName.toLowerCase() ||
        name.toLowerCase().replace(/[^a-z0-9]/g, '') === fileName.toLowerCase().replace(/[^a-z0-9]/g, '')
      );

      if (matchedAbility && !currentAbilityIcons[matchedAbility]) {
        await handleAbilityFileUpload(matchedAbility, file);
      }
    }
  };

  const exportAbilityIcons = () => {
    const dataStr = JSON.stringify(currentAbilityIcons, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', 'ability-icons.json');
    linkElement.click();
    
    toast.success('Exported ability icons mapping');
  };

  const uniqueClasses = React.useMemo(() => {
    const classes = new Set();
    Object.values(abilityDetails).forEach(ability => {
      if (ability.class) classes.add(ability.class);
      if (ability.race) classes.add("racial");
    });
    return Array.from(classes).sort();
  }, []);

  return (
    <div className="min-h-screen bg-[#1E2430] text-white p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">D&D 5e Asset Manager</h1>
            <p className="text-gray-400">
              Manage icons for items and abilities from the Player's Handbook
            </p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-[#2A3441] p-1">
            <TabsTrigger value="items" className="data-[state=active]:bg-[#FF5722] px-6 py-2">
              <Swords className="w-4 h-4 mr-2" />
              Items ({allItems.length})
            </TabsTrigger>
            <TabsTrigger value="abilities" className="data-[state=active]:bg-[#37F2D1] data-[state=active]:text-[#1E2430] px-6 py-2">
              <Zap className="w-4 h-4 mr-2" />
              Abilities ({allAbilities.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="items" className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex-1 mr-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search items..."
                    className="bg-[#2A3441] border-gray-700 text-white pl-10"
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <div>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => handleBulkUpload(Array.from(e.target.files))}
                    className="hidden"
                    id="bulk-upload"
                  />
                  <label
                    htmlFor="bulk-upload"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-[#FF5722] hover:bg-[#FF6B3D] rounded-lg font-semibold cursor-pointer transition-colors"
                  >
                    <Upload className="w-5 h-5" />
                    Bulk Upload
                  </label>
                </div>
                <Button
                  onClick={exportItemIcons}
                  disabled={Object.keys(itemIcons).length === 0}
                  className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#1E2430]"
                >
                  Export ({Object.keys(itemIcons).length})
                </Button>
              </div>
            </div>

            <div className="bg-[#2A3441] rounded-xl p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredItems.map(item => {
                  const isUploading = uploadingItems.has(item.name);
                  const isUploaded = uploadedItems.has(item.name);
                  
                  return (
                    <div
                      key={item.name}
                      className={`bg-[#1E2430] rounded-lg p-4 border-2 transition-colors ${
                        isUploaded ? 'border-green-500' : 'border-gray-700'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0">
                          {itemIcons[item.name] ? (
                            <img
                              src={itemIcons[item.name]}
                              alt={item.name}
                              className="w-16 h-16 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="w-16 h-16 rounded-lg bg-[#2A3441] border-2 border-dashed border-gray-600 flex items-center justify-center">
                              <Upload className="w-6 h-6 text-gray-500" />
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <h3 className="font-semibold text-sm truncate">{item.name}</h3>
                            {isUploaded && (
                              <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-gray-400 mb-1">{item.type}</p>
                          <p className="text-xs text-gray-500 mb-2">{item.cost}</p>

                          <div className="flex gap-2">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleFileUpload(item.name, e.target.files[0])}
                              className="hidden"
                              id={`upload-${item.name.replace(/\s/g, '-')}`}
                              disabled={isUploading}
                            />
                            <label
                              htmlFor={`upload-${item.name.replace(/\s/g, '-')}`}
                              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                                isUploading
                                  ? 'bg-gray-600 cursor-not-allowed'
                                  : itemIcons[item.name]
                                  ? 'bg-[#37F2D1]/20 text-[#37F2D1] hover:bg-[#37F2D1]/30'
                                  : 'bg-[#FF5722] hover:bg-[#FF6B3D] text-white'
                              }`}
                            >
                              <Upload className="w-3 h-3" />
                              {isUploading ? 'Uploading...' : itemIcons[item.name] ? 'Replace' : 'Upload'}
                            </label>
                            
                            <button
                              onClick={() => handleGenerateIcon(item)}
                              disabled={isUploading}
                              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                                isUploading
                                  ? 'bg-gray-600 cursor-not-allowed'
                                  : 'bg-purple-600 hover:bg-purple-700 text-white'
                              }`}
                            >
                              <Sparkles className="w-3 h-3" />
                              {isUploading ? 'Generating...' : itemIcons[item.name] ? 'Regenerate' : 'AI Generate'}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {filteredItems.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-400">No items found</p>
                </div>
              )}
            </div>

            <div className="mt-6 bg-[#2A3441] rounded-xl p-4">
              <h3 className="text-sm font-semibold mb-2">Bulk Upload Instructions:</h3>
              <ul className="text-xs text-gray-400 space-y-1">
                <li>• Name your files exactly as the item name (e.g., "Longsword.png")</li>
                <li>• The system will automatically match files to items</li>
                <li>• Supported formats: PNG, JPG, JPEG, WEBP</li>
                <li>• Export the JSON mapping when done to save the icon URLs</li>
              </ul>
            </div>
          </TabsContent>

          {/* ABILITIES TAB */}
          <TabsContent value="abilities" className="space-y-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 flex gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    value={abilitySearchQuery}
                    onChange={(e) => setAbilitySearchQuery(e.target.value)}
                    placeholder="Search abilities..."
                    className="bg-[#2A3441] border-gray-700 text-white pl-10"
                  />
                </div>
                <select
                  value={abilityClassFilter}
                  onChange={(e) => setAbilityClassFilter(e.target.value)}
                  className="bg-[#2A3441] border border-gray-700 rounded-lg px-4 py-2 text-white"
                >
                  <option value="all">All Classes</option>
                  {uniqueClasses.map(cls => (
                    <option key={cls} value={cls}>{cls}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3">
                <div>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => handleAbilityBulkUpload(Array.from(e.target.files))}
                    className="hidden"
                    id="ability-bulk-upload"
                  />
                  <label
                    htmlFor="ability-bulk-upload"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-[#FF5722] hover:bg-[#FF6B3D] rounded-lg font-semibold cursor-pointer transition-colors"
                  >
                    <Upload className="w-5 h-5" />
                    Bulk Upload
                  </label>
                </div>
                <Button
                  onClick={exportAbilityIcons}
                  disabled={uploadedAbilities.size === 0}
                  className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#1E2430]"
                >
                  Export ({uploadedAbilities.size})
                </Button>
              </div>
            </div>

            <div className="bg-[#2A3441] rounded-xl p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredAbilities.map(abilityName => {
                  const ability = abilityDetails[abilityName];
                  const isUploading = uploadingAbilities.has(abilityName);
                  const isUploaded = uploadedAbilities.has(abilityName);
                  
                  return (
                    <div
                      key={abilityName}
                      className={`bg-[#1E2430] rounded-lg p-4 border-2 transition-colors ${
                        isUploaded ? 'border-green-500' : 'border-gray-700'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0">
                          {currentAbilityIcons[abilityName] ? (
                            <img
                              src={currentAbilityIcons[abilityName]}
                              alt={abilityName}
                              className="w-16 h-16 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="w-16 h-16 rounded-lg bg-[#2A3441] border-2 border-dashed border-gray-600 flex items-center justify-center">
                              <Zap className="w-6 h-6 text-gray-500" />
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <h3 className="font-semibold text-sm truncate">{abilityName}</h3>
                            {isUploaded && (
                              <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-[#37F2D1] mb-1">
                            {ability.class || ability.race || 'Unknown'}
                            {ability.subclass && ` • ${ability.subclass}`}
                          </p>
                          <p className="text-xs text-gray-400 mb-1">
                            {ability.actionType} • Lvl {ability.level}
                          </p>

                          <div className="flex gap-2 mt-2">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleAbilityFileUpload(abilityName, e.target.files[0])}
                              className="hidden"
                              id={`ability-upload-${abilityName.replace(/\s/g, '-')}`}
                              disabled={isUploading}
                            />
                            <label
                              htmlFor={`ability-upload-${abilityName.replace(/\s/g, '-')}`}
                              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                                isUploading
                                  ? 'bg-gray-600 cursor-not-allowed'
                                  : currentAbilityIcons[abilityName]
                                  ? 'bg-[#37F2D1]/20 text-[#37F2D1] hover:bg-[#37F2D1]/30'
                                  : 'bg-[#FF5722] hover:bg-[#FF6B3D] text-white'
                              }`}
                            >
                              <Upload className="w-3 h-3" />
                              {isUploading ? '...' : currentAbilityIcons[abilityName] ? 'Replace' : 'Upload'}
                            </label>
                            
                            <button
                              onClick={() => handleGenerateAbilityIcon(abilityName)}
                              disabled={isUploading}
                              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                                isUploading
                                  ? 'bg-gray-600 cursor-not-allowed'
                                  : 'bg-purple-600 hover:bg-purple-700 text-white'
                              }`}
                            >
                              <Sparkles className="w-3 h-3" />
                              AI
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {filteredAbilities.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-400">No abilities found</p>
                </div>
              )}
            </div>

            <div className="bg-[#2A3441] rounded-xl p-4">
              <h3 className="text-sm font-semibold mb-2">Ability Icons Instructions:</h3>
              <ul className="text-xs text-gray-400 space-y-1">
                <li>• Name files exactly as the ability name (e.g., "Rage.png", "Divine Smite.png")</li>
                <li>• Icons are saved to localStorage and used in the GM Panel and Character sheets</li>
                <li>• Use AI Generate for quick placeholder icons</li>
                <li>• Export the JSON to back up your icon mappings</li>
              </ul>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}