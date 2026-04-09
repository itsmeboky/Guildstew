import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import ReactQuill from 'react-quill';
import { Plus, Trash2, Pin, PinOff, FolderPlus, ArrowLeft, Upload, Eye, EyeOff, Lock, Edit, Send, MessageSquare, ChevronLeft, ChevronRight } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import { getUserCampaignRole, isGMOrCoGM } from "@/components/campaigns/permissions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { motion } from "framer-motion";
import CalendarBuilder from "@/components/worldLore/CalendarBuilder";
import CalendarViewer from "@/components/worldLore/CalendarViewer";
import ConstellationEditor from "@/components/worldLore/ConstellationEditor";
import CelestialViewer from "@/components/worldLore/CelestialViewer";
import RegionHeader from "@/components/worldLore/RegionHeader";
import RegionStats from "@/components/worldLore/RegionStats";
import RegionEditor from "@/components/worldLore/RegionEditor";
import FactionHeader from "@/components/worldLore/FactionHeader";
import FactionStats from "@/components/worldLore/FactionStats";
import HistoryTimeline from "@/components/worldLore/HistoryTimeline";
import PlayerLegendTracker from "@/components/worldLore/PlayerLegendTracker";
import SpellEditor from "@/components/worldLore/SpellEditor";
import GrimoireViewer from "@/components/worldLore/GrimoireViewer";
import RecipeEditor from "@/components/worldLore/RecipeEditor";
import RecipeBookViewer from "@/components/worldLore/RecipeBookViewer";
import DeityEditor from "@/components/worldLore/DeityEditor";
import PantheonViewer from "@/components/worldLore/PantheonViewer";
import FactionEditor from "@/components/worldLore/FactionEditor";
import FactionViewer from "@/components/worldLore/FactionViewer";
import SectEditor from "@/components/worldLore/SectEditor";
import SectViewer from "@/components/worldLore/SectViewer";
import GuildHallManager from "@/components/worldLore/GuildHallManager";
import PlayerDiarySection from "@/components/worldLore/PlayerDiarySection";
import MonsterLibrary from "@/components/worldLore/MonsterLibrary";
import MonsterEditor from "@/components/worldLore/MonsterEditor";
import ArtifactViewer from "@/components/worldLore/ArtifactViewer";
import ArtifactEditor from "@/components/worldLore/ArtifactEditor";

export default function CampaignWorldLore() {
  const location = useLocation();
  const urlParams = new URLSearchParams(window.location.search);
  const campaignId = urlParams.get('id');
  const category = urlParams.get('category');
  const subcategory = urlParams.get('subcategory');
  const navigate = useNavigate();
  
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [showNewEntry, setShowNewEntry] = useState(false);
  const [newEntryTitle, setNewEntryTitle] = useState("");
  const [newEntryContent, setNewEntryContent] = useState("");
  const [newEntryVisibility, setNewEntryVisibility] = useState("public");
  const [newEntryEventDate, setNewEntryEventDate] = useState({ month: null, day: null, recurring: true });
  const [newEntryHistoricalDate, setNewEntryHistoricalDate] = useState({ year: null, era: '' });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [newGMUpdate, setNewGMUpdate] = useState("");
  const [newGMUpdateImage, setNewGMUpdateImage] = useState("");
  const [floraPage, setFloraPage] = useState(0);
  const [renamingSubcategory, setRenamingSubcategory] = useState(null);
  const [newSubcategoryName, setNewSubcategoryName] = useState("");
  const [subcategoryDialog, setSubcategoryDialog] = useState(null);
  const [subcategoryInput, setSubcategoryInput] = useState("");
  const [newRumor, setNewRumor] = useState({ content: '', is_true: true, truth_note: '', source_npc: '', mole_accessible: false });
  const [editingRumor, setEditingRumor] = useState(null);
  const [newEntrySubcategory, setNewEntrySubcategory] = useState("");
  const [editingConstellation, setEditingConstellation] = useState(null);
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [editingRegion, setEditingRegion] = useState(null);
  const [editingSpell, setEditingSpell] = useState(null);
  const [editingRecipe, setEditingRecipe] = useState(null);
  const [editingDeity, setEditingDeity] = useState(null);
  const [editingFaction, setEditingFaction] = useState(null);
  const [selectedFaction, setSelectedFaction] = useState(null);
  const [editingSect, setEditingSect] = useState(null);
  const [editingMonster, setEditingMonster] = useState(null);
  const [editingArtifact, setEditingArtifact] = useState(null);
  
  const quillRef = useRef(null);
  const newEntryQuillRef = useRef(null);

  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: campaign } = useQuery({
    queryKey: ['campaign', campaignId],
    queryFn: () => base44.entities.Campaign.filter({ id: campaignId }).then(c => c[0]),
    enabled: !!campaignId
  });

  const { data: userProfile } = useQuery({
    queryKey: ['userProfile', user?.id],
    queryFn: () => base44.entities.UserProfile.filter({ user_id: user?.id }).then(p => p[0]),
    enabled: !!user?.id
  });

  const userRole = getUserCampaignRole(campaign, user?.id);
  const canEdit = isGMOrCoGM(campaign, user?.id);

  const { data: allEntries = [] } = useQuery({
    queryKey: ['worldLoreEntries', campaignId],
    queryFn: async () => {
      return base44.entities.WorldLoreEntry.filter({ campaign_id: campaignId });
    },
    enabled: !!campaignId
  });

  const { data: comments = [] } = useQuery({
    queryKey: ['worldLoreComments', campaignId, category],
    queryFn: () => base44.entities.WorldLoreComment.filter({ 
      campaign_id: campaignId,
      category: category || null
    }, '-created_date'),
    enabled: !!campaignId
  });

  const { data: gmUpdates = [] } = useQuery({
    queryKey: ['worldLoreUpdates', campaignId],
    queryFn: () => base44.entities.WorldLoreUpdate.filter({ campaign_id: campaignId }, '-created_date'),
    enabled: !!campaignId && !category
  });

  const { data: rumors = [] } = useQuery({
    queryKey: ['worldLoreRumors', campaignId, category],
    queryFn: () => base44.entities.WorldLoreRumor.filter({ campaign_id: campaignId, category: category }, '-created_date'),
    enabled: !!campaignId && (category === 'political' || category === 'cultures')
  });

  const { data: constellations = [] } = useQuery({
    queryKey: ['constellations', campaignId],
    queryFn: () => base44.entities.Constellation.filter({ campaign_id: campaignId }),
    enabled: !!campaignId && category === 'cosmology'
  });

  const { data: regions = [] } = useQuery({
    queryKey: ['regions', campaignId],
    queryFn: () => base44.entities.Region.filter({ campaign_id: campaignId }, 'order'),
    enabled: !!campaignId && category === 'geography'
  });

  const { data: spells = [] } = useQuery({
    queryKey: ['spells', campaignId],
    queryFn: () => base44.entities.Spell.filter({ campaign_id: campaignId }),
    enabled: !!campaignId && category === 'magic'
  });

  const { data: recipes = [] } = useQuery({
    queryKey: ['recipes', campaignId],
    queryFn: () => base44.entities.Recipe.filter({ campaign_id: campaignId }),
    enabled: !!campaignId && category === 'technology'
  });

  const { data: deities = [] } = useQuery({
    queryKey: ['deities', campaignId],
    queryFn: () => base44.entities.Deity.filter({ campaign_id: campaignId }),
    enabled: !!campaignId && category === 'religions'
  });

  const { data: factions = [] } = useQuery({
    queryKey: ['factions', campaignId],
    queryFn: () => base44.entities.Faction.filter({ campaign_id: campaignId }, 'order'),
    enabled: !!campaignId && category === 'political'
  });

  const { data: sects = [] } = useQuery({
    queryKey: ['sects', campaignId],
    queryFn: () => base44.entities.Sect.filter({ campaign_id: campaignId }, 'order'),
    enabled: !!campaignId && category === 'religions'
  });

  const { data: monsters = [] } = useQuery({
    queryKey: ['monsters', campaignId],
    queryFn: () => base44.entities.Monster.filter({ campaign_id: campaignId }),
    enabled: !!campaignId && category === 'monsters'
  });

  const { data: artifacts = [] } = useQuery({
    queryKey: ['artifacts', campaignId],
    queryFn: () => base44.entities.Artifact.filter({ campaign_id: campaignId }),
    enabled: !!campaignId && category === 'artifacts'
  });

  const { data: guildHall } = useQuery({
    queryKey: ['guildHall', campaignId],
    queryFn: async () => {
      const halls = await base44.entities.GuildHall.filter({ campaign_id: campaignId });
      if (halls.length === 0 && canEdit) {
        return base44.entities.GuildHall.create({ campaign_id: campaignId });
      }
      return halls[0];
    },
    enabled: !!campaignId && category === 'misc'
  });

  const { data: guildHallOptions = [] } = useQuery({
    queryKey: ['guildHallOptions', campaignId],
    queryFn: () => base44.entities.GuildHallOption.filter({ campaign_id: campaignId }),
    enabled: !!campaignId && category === 'misc'
  });

  const { data: playerDiaries = [] } = useQuery({
    queryKey: ['playerDiaries', campaignId],
    queryFn: () => base44.entities.PlayerDiary.filter({ campaign_id: campaignId }),
    enabled: !!campaignId && category === 'misc'
  });

  const { data: allPlayerProfiles = [] } = useQuery({
    queryKey: ['allPlayerProfiles'],
    queryFn: () => base44.entities.UserProfile.list(),
    enabled: !!campaignId && category === 'misc'
  });

  const { data: characters = [] } = useQuery({
    queryKey: ['campaignCharacters', campaignId],
    queryFn: () => base44.entities.Character.filter({ campaign_id: campaignId }),
    enabled: !!campaignId && (category === 'religions' || category === 'monsters')
  });

  const { data: campaignNPCs = [] } = useQuery({
    queryKey: ['campaignNPCs', campaignId],
    queryFn: () => base44.entities.CampaignNPC.filter({ campaign_id: campaignId }),
    enabled: !!campaignId && (category === 'religions' || category === 'political')
  });

  const { data: allUserProfiles = [] } = useQuery({
    queryKey: ['allUserProfiles'],
    queryFn: () => base44.entities.UserProfile.list(),
    enabled: !!campaignId && (category === 'political' || category === 'cultures')
  });

  const entries = React.useMemo(() => {
    if (!allEntries || !user || !campaign) return [];
    
    // GMs should see everything
    if (canEdit) {
      return allEntries;
    }
    
    return allEntries.filter(entry => {
      const visibility = entry.visibility || 'public';
      
      if (visibility === 'public') return true;
      if (visibility === 'gm_mole') {
        return userRole === 'mole';
      }
      
      return false;
    });
  }, [allEntries, user, campaign, userRole, canEdit]);

  const createEntryMutation = useMutation({
    mutationFn: (data) => base44.entities.WorldLoreEntry.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['worldLoreEntries'] });
      setShowNewEntry(false);
      setNewEntryTitle("");
      setNewEntryContent("");
      setNewEntrySubcategory("");
      setNewEntryEventDate({ month: null, day: null, recurring: true });
      setNewEntryHistoricalDate({ year: null, era: '' });
    }
  });

  const updateEntryMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.WorldLoreEntry.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['worldLoreEntries'] });
      setSelectedEntry(null);
    }
  });

  const deleteEntryMutation = useMutation({
    mutationFn: (id) => base44.entities.WorldLoreEntry.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['worldLoreEntries'] });
      setSelectedEntry(null);
    }
  });

  const togglePinMutation = useMutation({
    mutationFn: ({ id, isPinned }) => base44.entities.WorldLoreEntry.update(id, { is_pinned: !isPinned }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['worldLoreEntries'] });
    }
  });

  const promoteToSubcategoryMutation = useMutation({
    mutationFn: ({ id, subcategoryName }) => base44.entities.WorldLoreEntry.update(id, { subcategory: subcategoryName }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['worldLoreEntries'] });
      setSubcategoryDialog(null);
      setSubcategoryInput("");
      toast.success("Entry added to subcategory");
    }
  });

  const removeSubcategoryMutation = useMutation({
    mutationFn: (id) => base44.entities.WorldLoreEntry.update(id, { subcategory: null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['worldLoreEntries'] });
    }
  });

  const renameSubcategoryMutation = useMutation({
    mutationFn: async ({ oldName, newName }) => {
      const entriesToUpdate = allEntries.filter(e => e.subcategory === oldName && e.campaign_id === campaignId);
      await Promise.all(
        entriesToUpdate.map(entry => 
          base44.entities.WorldLoreEntry.update(entry.id, { 
            subcategory: newName,
            title: entry.title === oldName ? newName : entry.title
          })
        )
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['worldLoreEntries'] });
      setRenamingSubcategory(null);
      setNewSubcategoryName("");
      toast.success("Subcategory renamed");
    }
  });

  const createCommentMutation = useMutation({
    mutationFn: (data) => base44.entities.WorldLoreComment.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['worldLoreComments'] });
      setNewComment("");
    }
  });

  const deleteCommentMutation = useMutation({
    mutationFn: (id) => base44.entities.WorldLoreComment.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['worldLoreComments'] });
    }
  });

  const createGMUpdateMutation = useMutation({
    mutationFn: (data) => base44.entities.WorldLoreUpdate.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['worldLoreUpdates'] });
      setNewGMUpdate("");
    }
  });

  const deleteGMUpdateMutation = useMutation({
    mutationFn: (id) => base44.entities.WorldLoreUpdate.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['worldLoreUpdates'] });
    }
  });

  const createRumorMutation = useMutation({
    mutationFn: (data) => base44.entities.WorldLoreRumor.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['worldLoreRumors'] });
      setNewRumor({ content: '', is_true: true, truth_note: '', source_npc: '', mole_accessible: false });
    }
  });

  const updateRumorMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.WorldLoreRumor.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['worldLoreRumors'] });
    }
  });

  const deleteRumorMutation = useMutation({
    mutationFn: (id) => base44.entities.WorldLoreRumor.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['worldLoreRumors'] });
    }
  });

  const rollForInfoMutation = useMutation({
    mutationFn: async ({ rumorId }) => {
      const rumor = rumors.find(r => r.id === rumorId);
      if (!rumor) return;

      const revealedTo = rumor.revealed_to || [];
      if (!revealedTo.includes(user.id)) {
        revealedTo.push(user.id);
        await base44.entities.WorldLoreRumor.update(rumorId, { revealed_to: revealedTo });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['worldLoreRumors'] });
      toast.success("Information revealed!");
    }
  });

  const createConstellationMutation = useMutation({
    mutationFn: (data) => base44.entities.Constellation.create({ ...data, campaign_id: campaignId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['constellations'] });
      setEditingConstellation(null);
      toast.success("Constellation saved");
    }
  });

  const updateConstellationMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Constellation.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['constellations'] });
      setEditingConstellation(null);
      toast.success("Constellation updated");
    }
  });

  const deleteConstellationMutation = useMutation({
    mutationFn: (id) => base44.entities.Constellation.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['constellations'] });
      toast.success("Constellation deleted");
    }
  });

  const createRegionMutation = useMutation({
    mutationFn: (data) => base44.entities.Region.create({ ...data, campaign_id: campaignId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['regions'] });
      setEditingRegion(null);
      toast.success("Region created");
    }
  });

  const updateRegionMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Region.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['regions'] });
      setEditingRegion(null);
      toast.success("Region updated");
    }
  });

  const deleteRegionMutation = useMutation({
    mutationFn: (id) => base44.entities.Region.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['regions'] });
      setSelectedRegion(null);
      toast.success("Region deleted");
    }
  });

  const createSpellMutation = useMutation({
    mutationFn: (data) => base44.entities.Spell.create({ ...data, campaign_id: campaignId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spells'] });
      setEditingSpell(null);
      toast.success("Spell created");
    }
  });

  const updateSpellMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Spell.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spells'] });
      setEditingSpell(null);
      toast.success("Spell updated");
    }
  });

  const deleteSpellMutation = useMutation({
    mutationFn: (id) => base44.entities.Spell.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spells'] });
      toast.success("Spell deleted");
    }
  });

  const createRecipeMutation = useMutation({
    mutationFn: (data) => base44.entities.Recipe.create({ ...data, campaign_id: campaignId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
      setEditingRecipe(null);
      toast.success("Recipe created");
    }
  });

  const updateRecipeMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Recipe.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
      setEditingRecipe(null);
      toast.success("Recipe updated");
    }
  });

  const deleteRecipeMutation = useMutation({
    mutationFn: (id) => base44.entities.Recipe.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
      toast.success("Recipe deleted");
    }
  });

  const createDeityMutation = useMutation({
    mutationFn: (data) => base44.entities.Deity.create({ ...data, campaign_id: campaignId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deities'] });
      setEditingDeity(null);
      toast.success("Deity created");
    }
  });

  const updateDeityMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Deity.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deities'] });
      setEditingDeity(null);
      toast.success("Deity updated");
    }
  });

  const deleteDeityMutation = useMutation({
    mutationFn: (id) => base44.entities.Deity.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deities'] });
      toast.success("Deity deleted");
    }
  });

  const createFactionMutation = useMutation({
    mutationFn: (data) => base44.entities.Faction.create({ ...data, campaign_id: campaignId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['factions'] });
      setEditingFaction(null);
      toast.success("Faction created");
    }
  });

  const updateFactionMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Faction.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['factions'] });
      setEditingFaction(null);
      toast.success("Faction updated");
    }
  });

  const deleteFactionMutation = useMutation({
    mutationFn: (id) => base44.entities.Faction.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['factions'] });
      setSelectedFaction(null);
      toast.success("Faction deleted");
    }
  });

  const createSectMutation = useMutation({
    mutationFn: (data) => base44.entities.Sect.create({ ...data, campaign_id: campaignId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sects'] });
      setEditingSect(null);
      toast.success("Sect created");
    }
  });

  const updateSectMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Sect.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sects'] });
      setEditingSect(null);
      toast.success("Sect updated");
    }
  });

  const deleteSectMutation = useMutation({
    mutationFn: (id) => base44.entities.Sect.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sects'] });
      toast.success("Sect deleted");
    }
  });

  const createMonsterMutation = useMutation({
    mutationFn: (data) => base44.entities.Monster.create({ ...data, campaign_id: campaignId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monsters'] });
      setEditingMonster(null);
      toast.success("Monster created");
    }
  });

  const updateMonsterMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Monster.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monsters'] });
      setEditingMonster(null);
      toast.success("Monster updated");
    }
  });

  const deleteMonsterMutation = useMutation({
    mutationFn: (id) => base44.entities.Monster.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monsters'] });
      toast.success("Monster deleted");
    }
  });

  const createArtifactMutation = useMutation({
    mutationFn: (data) => base44.entities.Artifact.create({ ...data, campaign_id: campaignId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['artifacts'] });
      setEditingArtifact(null);
      toast.success("Artifact created");
    }
  });

  const updateArtifactMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Artifact.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['artifacts'] });
      setEditingArtifact(null);
      toast.success("Artifact updated");
    }
  });

  const deleteArtifactMutation = useMutation({
    mutationFn: (id) => base44.entities.Artifact.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['artifacts'] });
      toast.success("Artifact deleted");
    }
  });

  const updatePlayerDiaryMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PlayerDiary.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playerDiaries'] });
      toast.success("Diary updated");
    }
  });

  const createPlayerDiaryMutation = useMutation({
    mutationFn: (data) => base44.entities.PlayerDiary.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playerDiaries'] });
    }
  });

  const handleSaveConstellation = (constellationData) => {
    console.log("handleSaveConstellation called with:", constellationData);
    const { id, ...dataWithoutId } = constellationData;
    console.log("ID:", id, "Data:", dataWithoutId);
    
    if (id) {
      console.log("Updating constellation");
      updateConstellationMutation.mutate({ id, data: dataWithoutId });
    } else {
      console.log("Creating new constellation");
      createConstellationMutation.mutate(dataWithoutId);
    }
  };

  const handleSaveRegion = (regionData) => {
    const { id, ...dataWithoutId } = regionData;
    if (id) {
      updateRegionMutation.mutate({ id, data: dataWithoutId });
    } else {
      createRegionMutation.mutate(dataWithoutId);
    }
  };

  const handleSaveSpell = (spellData) => {
    const { id, ...dataWithoutId } = spellData;
    if (id) {
      updateSpellMutation.mutate({ id, data: dataWithoutId });
    } else {
      createSpellMutation.mutate(dataWithoutId);
    }
  };

  const handleSaveRecipe = (recipeData) => {
    const { id, ...dataWithoutId } = recipeData;
    if (id) {
      updateRecipeMutation.mutate({ id, data: dataWithoutId });
    } else {
      createRecipeMutation.mutate(dataWithoutId);
    }
  };

  const handleSaveDeity = (deityData) => {
    const { id, ...dataWithoutId } = deityData;
    if (id) {
      updateDeityMutation.mutate({ id, data: dataWithoutId });
    } else {
      createDeityMutation.mutate(dataWithoutId);
    }
  };

  const handleSaveFaction = (factionData) => {
    const { id, ...dataWithoutId } = factionData;
    if (id) {
      updateFactionMutation.mutate({ id, data: dataWithoutId });
    } else {
      createFactionMutation.mutate(dataWithoutId);
    }
  };

  const handleSaveSect = (sectData) => {
    const { id, ...dataWithoutId } = sectData;
    if (id) {
      updateSectMutation.mutate({ id, data: dataWithoutId });
    } else {
      createSectMutation.mutate(dataWithoutId);
    }
  };

  const handleUpdatePlayerDiary = async (diaryData) => {
    if (diaryData.id) {
      updatePlayerDiaryMutation.mutate({ id: diaryData.id, data: diaryData });
    } else {
      createPlayerDiaryMutation.mutate({
        campaign_id: campaignId,
        user_id: user.id,
        ...diaryData
      });
    }
  };

  const handleSaveMonster = (monsterData) => {
    const { id, ...dataWithoutId } = monsterData;
    if (id) {
      updateMonsterMutation.mutate({ id, data: dataWithoutId });
    } else {
      createMonsterMutation.mutate(dataWithoutId);
    }
  };

  const handleSaveArtifact = (artifactData) => {
    const { id, ...dataWithoutId } = artifactData;
    if (id) {
      updateArtifactMutation.mutate({ id, data: dataWithoutId });
    } else {
      createArtifactMutation.mutate(dataWithoutId);
    }
  };

  const handleImageUpload = async (isNewEntry = false) => {
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/*');
    input.click();

    input.onchange = async () => {
      const file = input.files[0];
      if (!file) return;

      setUploadingImage(true);
      try {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        
        const quill = isNewEntry ? newEntryQuillRef.current?.getEditor() : quillRef.current?.getEditor();
        if (quill) {
          const range = quill.getSelection();
          quill.insertEmbed(range ? range.index : 0, 'image', file_url);
        }
        toast.success("Image uploaded");
      } catch (error) {
        toast.error("Failed to upload image");
      } finally {
        setUploadingImage(false);
      }
    };
  };

  const quillModules = {
    toolbar: {
      container: [
        [{ 'header': [1, 2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
        [{ 'color': [] }, { 'background': [] }],
        [{ 'align': [] }],
        ['blockquote', 'code-block'],
        ['link'],
        ['clean']
      ]
    }
  };

  React.useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      .ql-editor img {
        max-width: 100%;
        height: auto;
        cursor: nwse-resize;
        transition: opacity 0.2s;
      }
      .ql-editor img:hover {
        opacity: 0.8;
        outline: 2px solid #37F2D1;
      }
      .ql-editor img.resizing {
        opacity: 0.6;
      }
    `;
    document.head.appendChild(style);

    const handleImageClick = (e) => {
      if (e.target.tagName === 'IMG' && e.target.closest('.ql-editor')) {
        const img = e.target;
        const startWidth = img.offsetWidth;
        const startX = e.clientX;
        
        const handleMouseMove = (moveEvent) => {
          const diff = moveEvent.clientX - startX;
          const newWidth = Math.max(100, Math.min(800, startWidth + diff));
          img.style.width = newWidth + 'px';
          img.classList.add('resizing');
        };
        
        const handleMouseUp = () => {
          img.classList.remove('resizing');
          document.removeEventListener('mousemove', handleMouseMove);
          document.removeEventListener('mouseup', handleMouseUp);
        };
        
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
      }
    };

    document.addEventListener('mousedown', handleImageClick);

    return () => {
      document.head.removeChild(style);
      document.removeEventListener('mousedown', handleImageClick);
    };
  }, []);

  const handleCreateEntry = () => {
    if (!newEntryTitle.trim()) return;
    
    const entryData = {
      campaign_id: campaignId,
      category: category,
      subcategory: newEntrySubcategory || null,
      title: newEntryTitle,
      content: newEntryContent,
      visibility: newEntryVisibility,
      is_pinned: false,
      order: entries.length
    };

    // Add event date if specified (for calendar entries)
    if (category === 'calendar' && newEntryEventDate.month && newEntryEventDate.day) {
      entryData.event_date = {
        month: newEntryEventDate.month,
        day: newEntryEventDate.day,
        recurring: newEntryEventDate.recurring
      };
    }

    // Add historical date if specified (for history entries)
    if (category === 'history' && newEntryHistoricalDate.year) {
      entryData.historical_date = {
        year: newEntryHistoricalDate.year,
        era: newEntryHistoricalDate.era || null
      };
    }

    createEntryMutation.mutate(entryData);
  };

  const handlePostComment = () => {
    if (!newComment.trim()) return;
    
    createCommentMutation.mutate({
      campaign_id: campaignId,
      category: category || null,
      user_id: user.id,
      user_name: userProfile?.username || user.full_name,
      user_avatar: userProfile?.avatar_url,
      content: newComment
    });
  };

  const handlePostGMUpdate = () => {
    if (!newGMUpdate.trim()) return;

    createGMUpdateMutation.mutate({
      campaign_id: campaignId,
      content: newGMUpdate,
      image_url: newGMUpdateImage || null
    });
  };

  const handlePostRumor = () => {
    if (!newRumor.content.trim()) return;

    createRumorMutation.mutate({
      campaign_id: campaignId,
      category: category,
      content: newRumor.content,
      author_id: user.id,
      author_name: userProfile?.username,
      is_true: newRumor.is_true,
      truth_note: newRumor.truth_note || null,
      source_npc: newRumor.source_npc || null,
      mole_accessible: newRumor.mole_accessible
    });
  };

  const canSeeRumorSource = (rumor) => {
    if (canEdit) return true;
    if (rumor.revealed_to?.includes(user?.id)) return true;
    if (userRole === 'mole' && rumor.mole_accessible) return true;
    return false;
  };

  const canSeeRumorTruth = (rumor) => {
    return canEdit || rumor.revealed_to?.includes(user?.id) || (userRole === 'mole' && rumor.mole_accessible);
  };

  const handleGMUpdateImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setNewGMUpdateImage(file_url);
      toast.success("Image uploaded");
    } catch (error) {
      toast.error("Failed to upload image");
    } finally {
      setUploadingImage(false);
    }
  };

  const getVisibilityIcon = (visibility) => {
    if (visibility === 'gm_only') return <Lock className="w-4 h-4 text-red-500" />;
    if (visibility === 'gm_mole') return <EyeOff className="w-4 h-4 text-yellow-500" />;
    return <Eye className="w-4 h-4 text-green-500" />;
  };

  const getVisibilityLabel = (visibility) => {
    if (visibility === 'gm_only') return 'GM Only';
    if (visibility === 'gm_mole') return 'GM & Mole';
    return 'Public';
  };

  const handleSaveEntry = (entry, content) => {
    updateEntryMutation.mutate({
      id: entry.id,
      data: { ...entry, content }
    });
  };

  const updateCampaignCalendarMutation = useMutation({
    mutationFn: (data) => base44.entities.Campaign.update(campaignId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign', campaignId] });
      toast.success("Calendar updated successfully");
    }
  });

  // Calculate all derived data BEFORE any conditional returns
  const subcategories = React.useMemo(() => {
    const unique = new Set();
    entries.forEach(entry => {
      if (entry.category === category && entry.subcategory && entry.subcategory !== entry.title) {
        unique.add(entry.subcategory);
      }
    });
    return Array.from(unique);
  }, [entries, category]);

  const categoryEntries = React.useMemo(() => {
    return entries.filter(e => category ? e.category === category : true);
  }, [entries, category]);

  const filteredEntries = React.useMemo(() => {
    let filtered;
    
    if (category === 'flora' && !location.search.includes('view=entries')) {
      filtered = subcategory 
        ? categoryEntries.filter(e => e.subcategory === subcategory)
        : categoryEntries;
    } else {
      filtered = subcategory 
        ? categoryEntries.filter(e => e.subcategory === subcategory)
        : categoryEntries.filter(e => (!e.subcategory || e.subcategory === e.title) && e.category === category);
    }
    
    return filtered.sort((a, b) => {
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;
      return (a.order || 0) - (b.order || 0);
    });
  }, [categoryEntries, category, subcategory, location.search]);

  const pinnedEntries = React.useMemo(() => 
    filteredEntries.filter(e => e.is_pinned),
    [filteredEntries]
  );

  const recentEntry = React.useMemo(() => {
    const sorted = [...filteredEntries].sort((a, b) => 
      new Date(b.updated_date) - new Date(a.updated_date)
    );
    return sorted[0];
  }, [filteredEntries]);

  const recentEntriesAcrossCategories = React.useMemo(() => {
    const allCategoryEntries = entries.filter(e => !e.subcategory || e.subcategory === e.title);
    return [...allCategoryEntries]
      .sort((a, b) => new Date(b.updated_date) - new Date(a.updated_date))
      .slice(0, 5);
  }, [entries]);

  const isRumorCategory = category === 'cultures';
  const showingCategoryMain = category && !subcategory && !location.search.includes('view=entries');
  const viewMode = urlParams.get('mode') || 'main';

  const upcomingEvents = React.useMemo(() => {
    if (category !== 'calendar' || !showingCategoryMain || viewMode === 'settings') return [];
    return categoryEntries
      .filter(entry => entry.event_date)
      .map(entry => ({
        ...entry,
        ...entry.event_date
      }))
      .sort((a, b) => {
        const aDate = a.month * 100 + a.day;
        const bDate = b.month * 100 + b.day;
        return aDate - bDate;
      })
      .slice(0, 5);
  }, [categoryEntries, category, showingCategoryMain, viewMode]);

  // Main World Lore page (no category selected)
  if (!category) {
    return (
      <>
        <div 
          className="fixed inset-0 z-0"
          style={{
            backgroundImage: campaign?.world_lore_image_url 
              ? `url(${campaign.world_lore_image_url})`
              : 'linear-gradient(to bottom right, #0f1419, #1a1f2e, #0f1419)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundAttachment: 'fixed'
          }}
        >
          {campaign?.world_lore_image_url && (
            <div className="absolute inset-0 bg-black/50" />
          )}
        </div>
        <div className="min-h-screen p-8 relative z-10">
        <div className="max-w-6xl mx-auto relative z-10">
          <Button
            onClick={() => navigate(createPageUrl("CampaignArchives") + `?id=${campaignId}`)}
            variant="ghost"
            className="mb-4 text-gray-400 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Campaign Archives
          </Button>

          <h1 className="text-4xl font-bold mb-8">World Lore</h1>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Recent Entries Across All Categories */}
              <div className="bg-[#2A3441]/90 backdrop-blur-sm rounded-xl p-6 border border-cyan-400/30">
                <h2 className="text-2xl font-bold mb-4 text-[#37F2D1]">Recent Updates</h2>
                {recentEntriesAcrossCategories.length > 0 ? (
                  <div className="space-y-3">
                    {recentEntriesAcrossCategories.map(entry => (
                      <a
                        key={entry.id}
                        href={`?id=${campaignId}&category=${entry.category}`}
                        className="block bg-[#1E2430] rounded-lg p-4 hover:bg-[#1E2430]/80 transition-colors border border-gray-700/50"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="text-lg font-bold text-white">{entry.title}</h3>
                            <p className="text-sm text-gray-400 capitalize">{entry.category.replace('_', ' & ')}</p>
                          </div>
                          <span className="text-xs text-gray-500">
                            {new Date(entry.updated_date).toLocaleDateString()}
                          </span>
                        </div>
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400">No entries yet. Start adding lore!</p>
                )}
              </div>

              {/* Commentary Feed */}
              <div className="bg-[#2A3441]/90 backdrop-blur-sm rounded-xl p-6 border border-cyan-400/30">
                <h2 className="text-2xl font-bold mb-4 text-[#37F2D1]">
                  <MessageSquare className="w-6 h-6 inline mr-2" />
                  Commentary
                </h2>
                <div className="space-y-4 mb-4 max-h-96 overflow-y-auto">
                  {comments.map(comment => (
                    <motion.div
                      key={comment.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-[#1E2430] rounded-lg p-4 border border-gray-700/50"
                    >
                      <div className="flex items-start gap-3">
                        {comment.user_avatar && (
                          <img src={comment.user_avatar} alt="" className="w-8 h-8 rounded-full" />
                        )}
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-semibold text-white">{comment.user_name}</span>
                            <span className="text-xs text-gray-500">
                              {new Date(comment.created_date).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-gray-300 text-sm">{comment.content}</p>
                        </div>
                        {(canEdit || comment.user_id === user?.id) && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deleteCommentMutation.mutate(comment.id)}
                            className="text-red-400 hover:text-red-300"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Add your thoughts..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="bg-[#1E2430] border-gray-700 text-white"
                    rows={2}
                  />
                  <Button
                    onClick={handlePostComment}
                    disabled={!newComment.trim()}
                    className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#1E2430]"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Sidebar - World News */}
            {canEdit && (
              <div className="space-y-6">
                <div className="bg-[#2A3441]/90 backdrop-blur-sm rounded-xl p-6 border border-[#FF5722]/50">
                  <h2 className="text-xl font-bold mb-4 text-[#FF5722]">World News</h2>
                  <p className="text-sm text-gray-400 mb-4">Share the latest happenings in your world</p>
                  <div className="space-y-3 mb-4 max-h-96 overflow-y-auto">
                    {gmUpdates.map(update => (
                      <div key={update.id} className="bg-[#1E2430] rounded-lg p-3 border border-gray-700/50">
                        <div className="flex items-start justify-between mb-2">
                          <span className="text-xs text-gray-500">
                            {new Date(update.created_date).toLocaleDateString()}
                          </span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deleteGMUpdateMutation.mutate(update.id)}
                            className="text-red-400 hover:text-red-300 h-6 w-6 p-0"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                        {update.image_url && (
                          <img src={update.image_url} alt="" className="w-full rounded-lg mb-2" />
                        )}
                        <p className="text-gray-300 text-sm">{update.content}</p>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-2">
                    {newGMUpdateImage && (
                      <div className="relative">
                        <img src={newGMUpdateImage} alt="" className="w-full rounded-lg" />
                        <button
                          onClick={() => setNewGMUpdateImage("")}
                          className="absolute top-2 right-2 bg-red-500 rounded-full p-1 hover:bg-red-600"
                        >
                          <Trash2 className="w-3 h-3 text-white" />
                        </button>
                      </div>
                    )}
                    <Textarea
                      placeholder="What's happening in the world?"
                      value={newGMUpdate}
                      onChange={(e) => setNewGMUpdate(e.target.value)}
                      className="bg-[#1E2430] border-gray-700 text-white"
                      rows={3}
                    />
                    <div className="flex gap-2">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleGMUpdateImageUpload}
                        className="hidden"
                        id="gm-update-image"
                      />
                      <label
                        htmlFor="gm-update-image"
                        className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#1E2430] text-white rounded-lg cursor-pointer hover:bg-[#37F2D1] hover:text-[#1E2430] transition-colors text-sm"
                      >
                        <Upload className="w-4 h-4" />
                        {uploadingImage ? "Uploading..." : "Add Image"}
                      </label>
                      <Button
                        onClick={handlePostGMUpdate}
                        disabled={!newGMUpdate.trim()}
                        className="flex-1 bg-[#FF5722] hover:bg-[#FF6B3D] text-white"
                      >
                        Post Update
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        </div>
      </>
    );
  }

  // Political Structure - Faction-based View (like Geography & Regions)
  if (showingCategoryMain && category === 'political') {
    return (
      <>
        <div 
          className="fixed inset-0 z-0"
          style={{
            backgroundImage: campaign?.political_image_url 
              ? `url(${campaign.political_image_url})`
              : 'linear-gradient(to bottom right, #0f1419, #1a1f2e, #0f1419)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundAttachment: 'fixed'
          }}
        >
          {campaign?.political_image_url && (
            <div className="absolute inset-0 bg-black/50" />
          )}
        </div>
        <div className="min-h-screen p-8 relative z-10">
          <div className="max-w-6xl mx-auto relative z-10">
            <Button
              onClick={() => navigate(createPageUrl("CampaignWorldLore") + `?id=${campaignId}`)}
              variant="ghost"
              className="mb-4 text-gray-400 hover:text-white"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to World Lore
            </Button>

            <div className="flex items-center justify-between mb-8">
              <h1 className="text-4xl font-bold">Political Structure</h1>
              <div className="flex gap-2">
                {canEdit && (
                  <button
                    onClick={() => setEditingFaction({})}
                    className="px-4 py-2 rounded-lg text-white font-semibold flex items-center gap-2 transition-colors"
                    style={{ backgroundColor: '#37F2D1' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2dd9bd'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#37F2D1'}
                  >
                    <Plus className="w-4 h-4" />
                    Create Faction
                  </button>
                )}
                <button
                  onClick={() => navigate(createPageUrl("CampaignWorldLore") + `?id=${campaignId}&category=${category}&view=entries`)}
                  className="px-4 py-2 rounded-lg text-white font-semibold flex items-center gap-2 transition-colors"
                  style={{ backgroundColor: '#FF5722' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#FF6B3D'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#FF5722'}
                >
                  View All Entries
                </button>
              </div>
            </div>

            {/* Factions List */}
            <div className="space-y-6">
              {factions.length > 0 ? (
                factions.map(faction => {
                  const isExpanded = selectedFaction?.id === faction.id;
                  const factionEntries = categoryEntries.filter(e => e.subcategory === faction.name);

                  return (
                    <div key={faction.id} className="bg-[#2A3441]/90 backdrop-blur-sm rounded-xl overflow-hidden border border-gray-700">
                      {/* Faction Header - Clickable */}
                      <div
                        onClick={() => setSelectedFaction(isExpanded ? null : faction)}
                        className="cursor-pointer hover:opacity-90 transition-opacity"
                      >
                        <FactionHeader faction={faction} />
                      </div>

                      {/* Expanded Content */}
                      {isExpanded && (
                        <div className="p-6">
                          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                            {/* Faction Stats Sidebar */}
                            <div className="lg:col-span-1">
                              <FactionStats faction={faction} />
                              {canEdit && (
                                <div className="mt-4 space-y-2">
                                  <button
                                    onClick={() => setEditingFaction(faction)}
                                    className="w-full px-4 py-2 rounded-lg text-white font-semibold transition-colors"
                                    style={{ backgroundColor: '#37F2D1' }}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2dd9bd'}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#37F2D1'}
                                  >
                                    Edit Faction
                                  </button>
                                  <button
                                    onClick={() => {
                                      if (confirm(`Delete ${faction.name}?`)) {
                                        deleteFactionMutation.mutate(faction.id);
                                      }
                                    }}
                                    className="w-full px-4 py-2 rounded-lg text-white font-semibold transition-colors"
                                    style={{ backgroundColor: '#EF4444' }}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#DC2626'}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#EF4444'}
                                  >
                                    Delete Faction
                                  </button>
                                </div>
                              )}
                            </div>

                            {/* Faction Entries */}
                            <div className="lg:col-span-3 space-y-4">
                              {factionEntries.length > 0 ? (
                                factionEntries.map(entry => (
                                  <div
                                    key={entry.id}
                                    onClick={() => navigate(createPageUrl("CampaignWorldLore") + `?id=${campaignId}&category=${category}&view=entries#${entry.id}`)}
                                    className="bg-[#1E2430] rounded-xl p-6 border border-gray-700 hover:border-[#37F2D1] transition-colors cursor-pointer"
                                  >
                                    <h3 className="text-xl font-bold text-white mb-2">{entry.title}</h3>
                                    <div 
                                      className="prose prose-invert prose-sm max-w-none line-clamp-3"
                                      dangerouslySetInnerHTML={{ __html: entry.content || '<p class="text-gray-400">No content yet.</p>' }}
                                    />
                                  </div>
                                ))
                              ) : (
                                <div className="bg-[#1E2430] rounded-xl p-12 border border-gray-700 text-center">
                                  <p className="text-gray-400">No entries for this faction yet.</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="bg-[#2A3441]/90 backdrop-blur-sm rounded-xl p-12 border border-gray-700 text-center">
                  <p className="text-gray-400 text-lg">No factions created yet. Create your first faction!</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {editingFaction && (
          <FactionEditor
            faction={editingFaction}
            entries={categoryEntries}
            npcs={campaignNPCs}
            onSave={handleSaveFaction}
            onCancel={() => setEditingFaction(null)}
          />
        )}
      </>
    );
  }

  if (showingCategoryMain && isRumorCategory) {
    const categoryTitle = 'Cultures & Peoples';
    const categoryImageField = `${category}_image_url`;

    return (
          <>
            <div 
              className="fixed inset-0 z-0"
              style={{
                backgroundImage: campaign?.[categoryImageField] 
                  ? `url(${campaign[categoryImageField]})`
                  : 'linear-gradient(to bottom right, #0f1419, #1a1f2e, #0f1419)',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundAttachment: 'fixed'
              }}
            >
              {campaign?.[categoryImageField] && (
                <div className="absolute inset-0 bg-black/50" />
              )}
            </div>
            <div className="min-h-screen p-8 relative z-10">
            <div className="max-w-6xl mx-auto relative z-10">
          <Button
            onClick={() => navigate(createPageUrl("CampaignWorldLore") + `?id=${campaignId}`)}
            variant="ghost"
            className="mb-4 text-gray-400 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to World Lore
          </Button>

          <div className="flex items-center justify-between mb-8">
            <h1 className="text-4xl font-bold capitalize">{categoryTitle}</h1>
            <Button
              onClick={() => navigate(createPageUrl("CampaignWorldLore") + `?id=${campaignId}&category=${category}&view=entries`)}
              className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#1E2430]"
            >
              View All Entries
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Recent Entries */}
              {categoryEntries.length > 0 && (
                <div className="bg-[#2A3441]/90 backdrop-blur-sm rounded-xl p-6 border border-cyan-400/30">
                  <h2 className="text-2xl font-bold mb-4 text-[#37F2D1]">Recent Updates</h2>
                  <div className="space-y-3">
                    {[...categoryEntries]
                      .sort((a, b) => new Date(b.updated_date) - new Date(a.updated_date))
                      .slice(0, 5)
                      .map(entry => (
                      <a
                        key={entry.id}
                        href={`?id=${campaignId}&category=${entry.category}&view=entries`}
                        className="block bg-[#1E2430] rounded-lg p-4 hover:bg-[#1E2430]/80 transition-colors border border-gray-700/50"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="text-lg font-bold text-white">{entry.title}</h3>
                          </div>
                          <span className="text-xs text-gray-500">
                            {new Date(entry.updated_date).toLocaleDateString()}
                          </span>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Commentary Feed */}
              <div className="bg-[#2A3441]/90 backdrop-blur-sm rounded-xl p-6 border border-cyan-400/30">
                <h2 className="text-2xl font-bold mb-4 text-[#37F2D1]">
                  <MessageSquare className="w-6 h-6 inline mr-2" />
                  Commentary
                </h2>
                <div className="space-y-4 mb-4 max-h-96 overflow-y-auto">
                  {comments.map(comment => (
                    <motion.div
                      key={comment.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-[#1E2430] rounded-lg p-4 border border-gray-700/50"
                    >
                      <div className="flex items-start gap-3">
                        {comment.user_avatar && (
                          <img src={comment.user_avatar} alt="" className="w-8 h-8 rounded-full" />
                        )}
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-semibold text-white">{comment.user_name}</span>
                            <span className="text-xs text-gray-500">
                              {new Date(comment.created_date).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-gray-300 text-sm">{comment.content}</p>
                        </div>
                        {(canEdit || comment.user_id === user?.id) && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deleteCommentMutation.mutate(comment.id)}
                            className="text-red-400 hover:text-red-300"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Add your thoughts..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="bg-[#1E2430] border-gray-700 text-white"
                    rows={2}
                  />
                  <Button
                    onClick={handlePostComment}
                    disabled={!newComment.trim()}
                    className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#1E2430]"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Sidebar - Rumors & Gossip */}
            <div className="space-y-6">
              <div className="bg-[#2A3441]/90 backdrop-blur-sm rounded-xl p-6 border border-[#FF5722]/50">
                <h2 className="text-xl font-bold mb-4 text-[#FF5722]">Rumors & Gossip</h2>
                <p className="text-sm text-gray-400 mb-4">Whispers in the shadows...</p>

                <div className="space-y-3 mb-4 max-h-96 overflow-y-auto">
                  {rumors.map(rumor => {
                    const showSource = canSeeRumorSource(rumor);
                    const showTruth = canSeeRumorTruth(rumor);
                    const authorRole = rumor.author_id === campaign?.game_master_id ? 'GM' :
                                      campaign?.co_dm_ids?.includes(rumor.author_id) ? 'Co-GM' :
                                      campaign?.mole_player_id === rumor.author_id ? (canEdit ? 'Mole' : 'Player') :
                                      'Player';
                    const authorProfile = allUserProfiles.find(p => p.user_id === rumor.author_id);
                    const displayName = authorProfile?.username || 'Anonymous';

                    return (
                      <div key={rumor.id} className="bg-[#1E2430] rounded-lg p-3 border border-gray-700/50">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-xs text-gray-400">{displayName}</span>
                              <span className={`text-xs px-2 py-0.5 rounded ${
                                authorRole === 'GM' || authorRole === 'Co-GM' ? 'bg-[#FF5722]/20 text-[#FF5722]' :
                                authorRole === 'Mole' ? 'bg-yellow-500/20 text-yellow-500' :
                                'bg-[#37F2D1]/20 text-[#37F2D1]'
                              }`}>
                                {authorRole}
                              </span>
                            </div>
                            <p className="text-gray-300 text-sm mb-2">{rumor.content}</p>

                            {showSource && rumor.source_npc && (
                              <p className="text-xs text-[#37F2D1] mb-1">— {rumor.source_npc}</p>
                            )}

                            {!showSource && !canEdit && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => rollForInfoMutation.mutate({ rumorId: rumor.id })}
                                className="text-xs mt-2"
                              >
                                Roll for Info
                              </Button>
                            )}

                            {showTruth && (
                              <div className="mt-2 p-2 bg-[#2A3441] rounded border-l-2 border-[#37F2D1]">
                                <p className="text-xs text-white font-semibold">
                                  {rumor.is_true ? '✓ True' : '✗ False'}
                                </p>
                                {rumor.truth_note && (
                                  <p className="text-xs text-gray-400 mt-1">{rumor.truth_note}</p>
                                )}
                              </div>
                            )}
                          </div>

                          {(canEdit || rumor.author_id === user?.id) && (
                            <div className="flex gap-1">
                              {canEdit && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setEditingRumor(rumor)}
                                  className="text-gray-400 hover:text-[#37F2D1] h-6 w-6 p-0"
                                >
                                  <Edit className="w-3 h-3" />
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => deleteRumorMutation.mutate(rumor.id)}
                                className="text-red-400 hover:text-red-300 h-6 w-6 p-0"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="space-y-2">
                  <Textarea
                    placeholder="Share a rumor or gossip..."
                    value={newRumor.content}
                    onChange={(e) => setNewRumor({ ...newRumor, content: e.target.value })}
                    className="bg-[#1E2430] border-gray-700 text-white"
                    rows={3}
                  />

                  {canEdit && (
                    <div className="space-y-2">
                      <Input
                        placeholder="Source (NPC name or general gossip)"
                        value={newRumor.source_npc}
                        onChange={(e) => setNewRumor({ ...newRumor, source_npc: e.target.value })}
                        className="bg-[#1E2430] border-gray-700 text-white text-sm"
                      />

                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="is-true"
                          checked={newRumor.is_true}
                          onChange={(e) => setNewRumor({ ...newRumor, is_true: e.target.checked })}
                          className="rounded"
                        />
                        <label htmlFor="is-true" className="text-sm text-gray-300">This is true</label>
                      </div>

                      {!newRumor.is_true && (
                        <Input
                          placeholder="Truth note (explain the reality)"
                          value={newRumor.truth_note}
                          onChange={(e) => setNewRumor({ ...newRumor, truth_note: e.target.value })}
                          className="bg-[#1E2430] border-gray-700 text-white text-sm"
                        />
                      )}

                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="mole-access"
                          checked={newRumor.mole_accessible}
                          onChange={(e) => setNewRumor({ ...newRumor, mole_accessible: e.target.checked })}
                          className="rounded"
                        />
                        <label htmlFor="mole-access" className="text-sm text-gray-300">Mole can see source</label>
                      </div>
                    </div>
                  )}

                  <Button
                    onClick={handlePostRumor}
                    disabled={!newRumor.content.trim()}
                    className="w-full bg-[#FF5722] hover:bg-[#FF6B3D] text-white"
                  >
                    Post Rumor
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Edit Rumor Dialog */}
        {editingRumor && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-[#1E2430] border border-[#2A3441] rounded-xl p-8 max-w-md w-full mx-4">
              <h2 className="text-2xl font-bold mb-6">Edit Rumor</h2>
              <div className="space-y-4">
                <Textarea
                  value={editingRumor.content}
                  onChange={(e) => setEditingRumor({ ...editingRumor, content: e.target.value })}
                  className="bg-[#2A3441] border-gray-700 text-white"
                  rows={3}
                />

                <Input
                  placeholder="Source"
                  value={editingRumor.source_npc || ''}
                  onChange={(e) => setEditingRumor({ ...editingRumor, source_npc: e.target.value })}
                  className="bg-[#2A3441] border-gray-700 text-white"
                />

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="edit-is-true"
                    checked={editingRumor.is_true}
                    onChange={(e) => setEditingRumor({ ...editingRumor, is_true: e.target.checked })}
                    className="rounded"
                  />
                  <label htmlFor="edit-is-true" className="text-sm text-gray-300">This is true</label>
                </div>

                {!editingRumor.is_true && (
                  <Input
                    placeholder="Truth note"
                    value={editingRumor.truth_note || ''}
                    onChange={(e) => setEditingRumor({ ...editingRumor, truth_note: e.target.value })}
                    className="bg-[#2A3441] border-gray-700 text-white"
                  />
                )}

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="edit-mole-access"
                    checked={editingRumor.mole_accessible}
                    onChange={(e) => setEditingRumor({ ...editingRumor, mole_accessible: e.target.checked })}
                    className="rounded"
                  />
                  <label htmlFor="edit-mole-access" className="text-sm text-gray-300">Mole can see source</label>
                </div>

                <div className="flex gap-2 justify-end">
                  <Button
                    onClick={() => setEditingRumor(null)}
                    variant="ghost"
                    className="text-gray-400"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => {
                      updateRumorMutation.mutate({ id: editingRumor.id, data: editingRumor });
                      setEditingRumor(null);
                    }}
                    className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#1E2430]"
                  >
                    Save
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
        </div>
      </>
    );
  }

  // History & Timelines special view
  if (showingCategoryMain && category === 'history') {
    return (
      <>
        <div 
          className="fixed inset-0 z-0"
          style={{
            backgroundImage: campaign?.history_image_url 
              ? `url(${campaign.history_image_url})`
              : 'linear-gradient(to bottom right, #0f1419, #1a1f2e, #0f1419)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundAttachment: 'fixed'
          }}
        >
          {campaign?.history_image_url && (
            <div className="absolute inset-0 bg-black/50" />
          )}
        </div>
        <div className="min-h-screen p-8 relative z-10">
          <div className="max-w-6xl mx-auto relative z-10">
            <Button
              onClick={() => navigate(createPageUrl("CampaignWorldLore") + `?id=${campaignId}`)}
              variant="ghost"
              className="mb-4 text-gray-400 hover:text-white"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to World Lore
            </Button>

            <div className="flex items-center justify-between mb-8">
              <h1 className="text-4xl font-bold">History & Timelines</h1>
              <Button
                onClick={() => navigate(createPageUrl("CampaignWorldLore") + `?id=${campaignId}&category=${category}&view=entries`)}
                className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#1E2430]"
              >
                View All Entries
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Content */}
              <div className="lg:col-span-2 space-y-6">
                {/* Recent Entries */}
                {categoryEntries.length > 0 && (
                  <div className="bg-[#2A3441]/90 backdrop-blur-sm rounded-xl p-6 border border-cyan-400/30">
                    <h2 className="text-2xl font-bold mb-4 text-[#37F2D1]">Recent Updates</h2>
                    <div className="space-y-3">
                      {[...categoryEntries]
                        .sort((a, b) => new Date(b.updated_date) - new Date(a.updated_date))
                        .slice(0, 5)
                        .map(entry => (
                        <a
                          key={entry.id}
                          href={`?id=${campaignId}&category=${entry.category}&view=entries#${entry.id}`}
                          className="block bg-[#1E2430] rounded-lg p-4 hover:bg-[#1E2430]/80 transition-colors border border-gray-700/50"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="text-lg font-bold text-white">{entry.title}</h3>
                              {entry.historical_date && (
                                <p className="text-sm text-[#37F2D1]">
                                  {campaign?.calendar_system?.year_name || 'Year'} {entry.historical_date.year}
                                  {entry.historical_date.era && ` ${entry.historical_date.era}`}
                                </p>
                              )}
                            </div>
                            <span className="text-xs text-gray-500">
                              {new Date(entry.updated_date).toLocaleDateString()}
                            </span>
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Commentary Feed */}
                <div className="bg-[#2A3441]/90 backdrop-blur-sm rounded-xl p-6 border border-cyan-400/30">
                  <h2 className="text-2xl font-bold mb-4 text-[#37F2D1]">
                    <MessageSquare className="w-6 h-6 inline mr-2" />
                    Commentary
                  </h2>
                  <div className="space-y-4 mb-4 max-h-96 overflow-y-auto">
                    {comments.map(comment => (
                      <motion.div
                        key={comment.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-[#1E2430] rounded-lg p-4 border border-gray-700/50"
                      >
                        <div className="flex items-start gap-3">
                          {comment.user_avatar && (
                            <img src={comment.user_avatar} alt="" className="w-8 h-8 rounded-full" />
                          )}
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-semibold text-white">{comment.user_name}</span>
                              <span className="text-xs text-gray-500">
                                {new Date(comment.created_date).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-gray-300 text-sm">{comment.content}</p>
                          </div>
                          {(canEdit || comment.user_id === user?.id) && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => deleteCommentMutation.mutate(comment.id)}
                              className="text-red-400 hover:text-red-300"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Textarea
                      placeholder="Add your thoughts..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      className="bg-[#1E2430] border-gray-700 text-white"
                      rows={2}
                    />
                    <Button
                      onClick={handlePostComment}
                      disabled={!newComment.trim()}
                      className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#1E2430]"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Sidebar - Timeline */}
              <div>
                <HistoryTimeline 
                  entries={categoryEntries} 
                  campaign={campaign}
                  onSelectEntry={(entry) => navigate(createPageUrl("CampaignWorldLore") + `?id=${campaignId}&category=${category}&view=entries#${entry.id}`)}
                />
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Calendar & Time special view
  if (showingCategoryMain && category === 'calendar') {
    if (viewMode === 'settings' && canEdit) {
      return (
        <>
          <div 
            className="fixed inset-0 z-0"
            style={{
              backgroundImage: campaign?.calendar_image_url 
                ? `url(${campaign.calendar_image_url})`
                : 'linear-gradient(to bottom right, #0f1419, #1a1f2e, #0f1419)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundAttachment: 'fixed'
            }}
          >
            {campaign?.calendar_image_url && (
              <div className="absolute inset-0 bg-black/50" />
            )}
          </div>
          <div className="min-h-screen p-8 relative z-10">
          <div className="max-w-6xl mx-auto relative z-10">
            <Button
              onClick={() => navigate(createPageUrl("CampaignWorldLore") + `?id=${campaignId}&category=calendar`)}
              variant="ghost"
              className="mb-4 text-gray-400 hover:text-white"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Calendar
            </Button>

            <h1 className="text-4xl font-bold mb-8">Calendar Settings</h1>

            <CalendarBuilder 
              campaign={campaign} 
              onUpdate={(data) => updateCampaignCalendarMutation.mutate(data)}
            />
          </div>
          </div>
        </>
      );
    }

    return (
      <>
        <div 
          className="fixed inset-0 z-0"
          style={{
            backgroundImage: campaign?.calendar_image_url 
              ? `url(${campaign.calendar_image_url})`
              : 'linear-gradient(to bottom right, #0f1419, #1a1f2e, #0f1419)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundAttachment: 'fixed'
          }}
        >
          {campaign?.calendar_image_url && (
            <div className="absolute inset-0 bg-black/50" />
          )}
        </div>
        <div className="min-h-screen p-8 relative z-10">
        <div className="max-w-6xl mx-auto relative z-10">
          <Button
            onClick={() => navigate(createPageUrl("CampaignWorldLore") + `?id=${campaignId}`)}
            variant="ghost"
            className="mb-4 text-gray-400 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to World Lore
          </Button>

          <div className="flex items-center justify-between mb-8">
            <h1 className="text-4xl font-bold">Calendar & Time</h1>
            <div className="flex gap-2">
              {canEdit && (
                <Button
                  onClick={() => navigate(createPageUrl("CampaignWorldLore") + `?id=${campaignId}&category=calendar&mode=settings`)}
                  variant="outline"
                  className="border-gray-700 text-white"
                >
                  Calendar Settings
                </Button>
              )}
              <Button
                onClick={() => navigate(createPageUrl("CampaignWorldLore") + `?id=${campaignId}&category=${category}&view=entries`)}
                className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#1E2430]"
              >
                View All Entries
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Calendar */}
            <div className="lg:col-span-2">
              <CalendarViewer campaign={campaign} entries={categoryEntries} />
            </div>

            {/* Sidebar - Upcoming Events */}
            <div className="space-y-6">
              <div className="bg-[#2A3441] rounded-xl p-6 border border-gray-700">
                <h2 className="text-xl font-bold mb-4 text-[#37F2D1]">Upcoming Events</h2>
                {upcomingEvents.length > 0 ? (
                  <div className="space-y-3">
                    {upcomingEvents.map(event => (
                      <a
                        key={event.id}
                        href={`?id=${campaignId}&category=calendar&view=entries#${event.id}`}
                        className="block bg-[#1E2430] rounded-lg p-3 hover:bg-[#1E2430]/80 transition-colors border border-gray-700/50"
                      >
                        <div className="flex items-start justify-between mb-1">
                          <h3 className="font-bold text-white text-sm">{event.title}</h3>
                          <span className="text-xs text-gray-400">
                            {campaign?.calendar_system?.month_names?.[event.month - 1] || `Month ${event.month}`} {event.day}
                          </span>
                        </div>
                        {event.recurring && (
                          <span className="text-xs text-[#37F2D1]">Recurring annually</span>
                        )}
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400 text-sm">No events scheduled. Create entries with dates to see them here!</p>
                )}
              </div>

              {/* Commentary */}
              <div className="bg-[#2A3441] rounded-xl p-6 border border-gray-700">
                <h2 className="text-xl font-bold mb-4 text-[#37F2D1]">
                  <MessageSquare className="w-5 h-5 inline mr-2" />
                  Commentary
                </h2>
                <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
                  {comments.slice(0, 3).map(comment => (
                    <motion.div
                      key={comment.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-[#1E2430] rounded-lg p-3 border border-gray-700/50"
                    >
                      <div className="flex items-start gap-2">
                        {comment.user_avatar && (
                          <img src={comment.user_avatar} alt="" className="w-6 h-6 rounded-full" />
                        )}
                        <div className="flex-1 min-w-0">
                          <span className="font-semibold text-white text-xs block">{comment.user_name}</span>
                          <p className="text-gray-300 text-xs">{comment.content}</p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
                <Textarea
                  placeholder="Add your thoughts..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="bg-[#1E2430] border-gray-700 text-white text-sm mb-2"
                  rows={2}
                />
                <Button
                  onClick={handlePostComment}
                  disabled={!newComment.trim()}
                  size="sm"
                  className="w-full bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#1E2430]"
                >
                  <Send className="w-3 h-3 mr-2" />
                  Post
                </Button>
              </div>
            </div>
          </div>
        </div>
        </div>
      </>
    );
  }

  // Cosmology & Origins - Constellation Viewer
  if (showingCategoryMain && category === 'cosmology') {
    return (
      <>
        <div 
          className="fixed inset-0 z-0"
          style={{
            backgroundImage: campaign?.cosmology_image_url 
              ? `url(${campaign.cosmology_image_url})`
              : 'linear-gradient(to bottom right, #0f1419, #1a1f2e, #0f1419)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundAttachment: 'fixed'
          }}
        >
          {campaign?.cosmology_image_url && (
            <div className="absolute inset-0 bg-black/50" />
          )}
        </div>
        <div className="min-h-screen p-8 relative z-10">
          <div className="max-w-6xl mx-auto relative z-10">
            <Button
              onClick={() => navigate(createPageUrl("CampaignWorldLore") + `?id=${campaignId}`)}
              variant="ghost"
              className="mb-4 text-gray-400 hover:text-white"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to World Lore
            </Button>

            <div className="flex items-center justify-between mb-8">
              <h1 className="text-4xl font-bold">Cosmology & Origins</h1>
              <div className="flex gap-2">
                {canEdit && (
                  <button
                    onClick={() => setEditingConstellation({})}
                    className="px-4 py-2 rounded-lg text-white font-semibold flex items-center gap-2 transition-colors"
                    style={{ backgroundColor: '#37F2D1' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2dd9bd'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#37F2D1'}
                  >
                    <Plus className="w-4 h-4" />
                    New Constellation
                  </button>
                )}
                <button
                  onClick={() => navigate(createPageUrl("CampaignWorldLore") + `?id=${campaignId}&category=${category}&view=entries`)}
                  className="px-4 py-2 rounded-lg text-white font-semibold flex items-center gap-2 transition-colors"
                  style={{ backgroundColor: '#FF5722' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#FF6B3D'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#FF5722'}
                >
                  View All Entries
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Content - Celestial Viewer */}
              <div className="lg:col-span-2 space-y-6">
                <CelestialViewer
                  constellations={constellations}
                  entries={categoryEntries}
                  canEdit={canEdit}
                  onSelectConstellation={(constellation) => setEditingConstellation(constellation)}
                />

                {/* Recent Entries */}
                {categoryEntries.length > 0 && (
                  <div className="bg-[#2A3441]/90 backdrop-blur-sm rounded-xl p-6 border border-cyan-400/30">
                    <h2 className="text-2xl font-bold mb-4 text-[#37F2D1]">Recent Lore</h2>
                    <div className="space-y-3">
                      {[...categoryEntries]
                        .sort((a, b) => new Date(b.updated_date) - new Date(a.updated_date))
                        .slice(0, 5)
                        .map(entry => (
                        <a
                          key={entry.id}
                          href={`?id=${campaignId}&category=${entry.category}&view=entries#${entry.id}`}
                          className="block bg-[#1E2430] rounded-lg p-4 hover:bg-[#1E2430]/80 transition-colors border border-gray-700/50"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="text-lg font-bold text-white">{entry.title}</h3>
                            </div>
                            <span className="text-xs text-gray-500">
                              {new Date(entry.updated_date).toLocaleDateString()}
                            </span>
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Sidebar - Constellations List */}
              <div className="space-y-6">
                {constellations.length > 0 && (
                  <div className="bg-[#2A3441]/90 backdrop-blur-sm rounded-xl p-6 border border-cyan-400/30">
                    <h2 className="text-xl font-bold mb-4">Constellations</h2>
                    <div className="space-y-2">
                      {constellations.map(constellation => (
                        <div
                          key={constellation.id}
                          className="bg-[#1E2430] rounded-lg p-3 border border-gray-700/50 hover:bg-[#1E2430]/80 transition-colors"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h3 className="text-sm font-semibold text-white">{constellation.name}</h3>
                              {constellation.description && (
                                <p className="text-xs text-gray-400 mt-1">{constellation.description}</p>
                              )}
                              {!constellation.discovered && canEdit && (
                                <span className="text-xs text-yellow-500 mt-1 block">Hidden from players</span>
                              )}
                            </div>
                            {canEdit && (
                              <div className="flex gap-1 ml-2">
                                <Button
                                  onClick={() => setEditingConstellation(constellation)}
                                  variant="ghost"
                                  size="sm"
                                  className="text-gray-400 hover:text-[#37F2D1] h-6 w-6 p-0"
                                >
                                  <Edit className="w-3 h-3" />
                                </Button>
                                <Button
                                  onClick={() => deleteConstellationMutation.mutate(constellation.id)}
                                  variant="ghost"
                                  size="sm"
                                  className="text-gray-400 hover:text-red-400 h-6 w-6 p-0"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Commentary */}
                <div className="bg-[#2A3441]/90 backdrop-blur-sm rounded-xl p-6 border border-cyan-400/30">
                  <h2 className="text-xl font-bold mb-4 text-[#37F2D1]">
                    <MessageSquare className="w-5 h-5 inline mr-2" />
                    Commentary
                  </h2>
                  <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
                    {comments.slice(0, 3).map(comment => (
                      <motion.div
                        key={comment.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-[#1E2430] rounded-lg p-3 border border-gray-700/50"
                      >
                        <div className="flex items-start gap-2">
                          {comment.user_avatar && (
                            <img src={comment.user_avatar} alt="" className="w-6 h-6 rounded-full" />
                          )}
                          <div className="flex-1 min-w-0">
                            <span className="font-semibold text-white text-xs block">{comment.user_name}</span>
                            <p className="text-gray-300 text-xs">{comment.content}</p>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                  <Textarea
                    placeholder="Share your thoughts on the cosmos..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="bg-[#1E2430] border-gray-700 text-white text-sm mb-2"
                    rows={2}
                  />
                  <Button
                    onClick={handlePostComment}
                    disabled={!newComment.trim()}
                    size="sm"
                    className="w-full bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#1E2430]"
                  >
                    <Send className="w-3 h-3 mr-2" />
                    Post
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Constellation Editor */}
        {editingConstellation && (
          <ConstellationEditor
            constellation={editingConstellation}
            entries={categoryEntries}
            onSave={handleSaveConstellation}
            onCancel={() => setEditingConstellation(null)}
          />
        )}
      </>
    );
  }

  // Geography & Regions - Region-based View
  if (showingCategoryMain && category === 'geography') {
    return (
      <>
        <div 
          className="fixed inset-0 z-0"
          style={{
            backgroundImage: campaign?.geography_image_url 
              ? `url(${campaign.geography_image_url})`
              : 'linear-gradient(to bottom right, #0f1419, #1a1f2e, #0f1419)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundAttachment: 'fixed'
          }}
        >
          {campaign?.geography_image_url && (
            <div className="absolute inset-0 bg-black/50" />
          )}
        </div>
        <div className="min-h-screen p-8 relative z-10">
          <div className="max-w-6xl mx-auto relative z-10">
            <Button
              onClick={() => navigate(createPageUrl("CampaignWorldLore") + `?id=${campaignId}`)}
              variant="ghost"
              className="mb-4 text-gray-400 hover:text-white"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to World Lore
            </Button>

            <div className="flex items-center justify-between mb-8">
              <h1 className="text-4xl font-bold">Geography & Regions</h1>
              <div className="flex gap-2">
                {canEdit && (
                  <button
                    onClick={() => setEditingRegion({})}
                    className="px-4 py-2 rounded-lg text-white font-semibold flex items-center gap-2 transition-colors"
                    style={{ backgroundColor: '#37F2D1' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2dd9bd'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#37F2D1'}
                  >
                    <Plus className="w-4 h-4" />
                    Create Region
                  </button>
                )}
                <button
                  onClick={() => navigate(createPageUrl("CampaignWorldLore") + `?id=${campaignId}&category=${category}&view=entries`)}
                  className="px-4 py-2 rounded-lg text-white font-semibold flex items-center gap-2 transition-colors"
                  style={{ backgroundColor: '#FF5722' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#FF6B3D'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#FF5722'}
                >
                  View All Entries
                </button>
              </div>
            </div>

            {/* Regions List */}
            <div className="space-y-6">
              {regions.length > 0 ? (
                regions.map(region => {
                  const isExpanded = selectedRegion?.id === region.id;
                  const regionEntries = categoryEntries.filter(e => e.subcategory === region.name);

                  return (
                    <div key={region.id} className="bg-[#2A3441]/90 backdrop-blur-sm rounded-xl overflow-hidden border border-gray-700">
                      {/* Region Header - Clickable */}
                      <div
                        onClick={() => setSelectedRegion(isExpanded ? null : region)}
                        className="cursor-pointer hover:opacity-90 transition-opacity"
                      >
                        <RegionHeader region={region} />
                      </div>

                      {/* Expanded Content */}
                      {isExpanded && (
                        <div className="p-6">
                          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                            {/* Region Stats Sidebar */}
                            <div className="lg:col-span-1">
                              <RegionStats region={region} />
                              {canEdit && (
                                <div className="mt-4 space-y-2">
                                  <button
                                    onClick={() => setEditingRegion(region)}
                                    className="w-full px-4 py-2 rounded-lg text-white font-semibold transition-colors"
                                    style={{ backgroundColor: '#37F2D1' }}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2dd9bd'}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#37F2D1'}
                                  >
                                    Edit Region
                                  </button>
                                  <button
                                    onClick={() => {
                                      if (confirm(`Delete ${region.name}?`)) {
                                        deleteRegionMutation.mutate(region.id);
                                      }
                                    }}
                                    className="w-full px-4 py-2 rounded-lg text-white font-semibold transition-colors"
                                    style={{ backgroundColor: '#EF4444' }}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#DC2626'}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#EF4444'}
                                  >
                                    Delete Region
                                  </button>
                                </div>
                              )}
                            </div>

                            {/* Region Entries */}
                            <div className="lg:col-span-3 space-y-4">
                              {regionEntries.length > 0 ? (
                                regionEntries.map(entry => (
                                  <div
                                    key={entry.id}
                                    onClick={() => navigate(createPageUrl("CampaignWorldLore") + `?id=${campaignId}&category=${category}&view=entries#${entry.id}`)}
                                    className="bg-[#1E2430] rounded-xl p-6 border border-gray-700 hover:border-[#37F2D1] transition-colors cursor-pointer"
                                  >
                                    <h3 className="text-xl font-bold text-white mb-2">{entry.title}</h3>
                                    <div 
                                      className="prose prose-invert prose-sm max-w-none line-clamp-3"
                                      dangerouslySetInnerHTML={{ __html: entry.content || '<p class="text-gray-400">No content yet.</p>' }}
                                    />
                                  </div>
                                ))
                              ) : (
                                <div className="bg-[#1E2430] rounded-xl p-12 border border-gray-700 text-center">
                                  <p className="text-gray-400">No entries for this region yet.</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="bg-[#2A3441]/90 backdrop-blur-sm rounded-xl p-12 border border-gray-700 text-center">
                  <p className="text-gray-400 text-lg">No regions created yet. Create your first region!</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {editingRegion && (
          <RegionEditor
            region={editingRegion}
            onSave={handleSaveRegion}
            onCancel={() => setEditingRegion(null)}
          />
        )}
      </>
    );
  }

  // Technology & Craft - Recipe Book View
  if (showingCategoryMain && category === 'technology') {
    return (
      <>
        <div 
          className="fixed inset-0 z-0"
          style={{
            backgroundImage: campaign?.technology_image_url 
              ? `url(${campaign.technology_image_url})`
              : 'linear-gradient(to bottom right, #0f1419, #1a1f2e, #0f1419)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundAttachment: 'fixed'
          }}
        >
          {campaign?.technology_image_url && (
            <div className="absolute inset-0 bg-black/50" />
          )}
        </div>
        <div className="min-h-screen p-8 relative z-10">
          <div className="max-w-6xl mx-auto relative z-10">
            <Button
              onClick={() => navigate(createPageUrl("CampaignWorldLore") + `?id=${campaignId}`)}
              variant="ghost"
              className="mb-4 text-gray-400 hover:text-white"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to World Lore
            </Button>

            <div className="flex items-center justify-between mb-8">
              <h1 className="text-4xl font-bold">Technology & Craft</h1>
              <Button
                onClick={() => navigate(createPageUrl("CampaignWorldLore") + `?id=${campaignId}&category=${category}&view=entries`)}
                className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#1E2430]"
              >
                View All Entries
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Content - Recipe Book */}
              <div className="lg:col-span-2">
                <RecipeBookViewer
                  recipes={recipes}
                  entries={categoryEntries}
                  canEdit={canEdit}
                  onEdit={(recipe) => setEditingRecipe(recipe)}
                  onDelete={(recipeId) => deleteRecipeMutation.mutate(recipeId)}
                />
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {canEdit && (
                  <div className="bg-[#2A3441]/90 backdrop-blur-sm rounded-xl p-6 border border-cyan-400/30">
                    <button
                      onClick={() => setEditingRecipe({})}
                      className="w-full px-4 py-2 rounded-lg text-white font-semibold flex items-center justify-center gap-2 transition-colors"
                      style={{ backgroundColor: '#37F2D1' }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2dd9bd'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#37F2D1'}
                    >
                      <Plus className="w-4 h-4" />
                      Create Recipe
                    </button>
                  </div>
                )}

                {/* Recent Lore Entries */}
                {categoryEntries.length > 0 && (
                  <div className="bg-[#2A3441]/90 backdrop-blur-sm rounded-xl p-6 border border-cyan-400/30">
                    <h2 className="text-xl font-bold mb-4 text-[#37F2D1]">Recent Crafting Lore</h2>
                    <div className="space-y-2">
                      {[...categoryEntries]
                        .sort((a, b) => new Date(b.updated_date) - new Date(a.updated_date))
                        .slice(0, 5)
                        .map(entry => (
                        <a
                          key={entry.id}
                          href={`?id=${campaignId}&category=${entry.category}&view=entries#${entry.id}`}
                          className="block bg-[#1E2430] rounded-lg p-3 hover:bg-[#1E2430]/80 transition-colors border border-gray-700/50"
                        >
                          <h3 className="text-sm font-bold text-white">{entry.title}</h3>
                          <span className="text-xs text-gray-500">
                            {new Date(entry.updated_date).toLocaleDateString()}
                          </span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Commentary */}
                <div className="bg-[#2A3441]/90 backdrop-blur-sm rounded-xl p-6 border border-cyan-400/30">
                  <h2 className="text-xl font-bold mb-4 text-[#37F2D1]">
                    <MessageSquare className="w-5 h-5 inline mr-2" />
                    Commentary
                  </h2>
                  <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
                    {comments.slice(0, 3).map(comment => (
                      <motion.div
                        key={comment.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-[#1E2430] rounded-lg p-3 border border-gray-700/50"
                      >
                        <div className="flex items-start gap-2">
                          {comment.user_avatar && (
                            <img src={comment.user_avatar} alt="" className="w-6 h-6 rounded-full" />
                          )}
                          <div className="flex-1 min-w-0">
                            <span className="font-semibold text-white text-xs block">{comment.user_name}</span>
                            <p className="text-gray-300 text-xs">{comment.content}</p>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                  <Textarea
                    placeholder="Share your thoughts on crafting..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="bg-[#1E2430] border-gray-700 text-white text-sm mb-2"
                    rows={2}
                  />
                  <Button
                    onClick={handlePostComment}
                    disabled={!newComment.trim()}
                    size="sm"
                    className="w-full bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#1E2430]"
                  >
                    <Send className="w-3 h-3 mr-2" />
                    Post
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recipe Editor */}
        {editingRecipe && (
          <RecipeEditor
            recipe={editingRecipe}
            entries={categoryEntries}
            onSave={handleSaveRecipe}
            onCancel={() => setEditingRecipe(null)}
          />
        )}
      </>
    );
  }

  // Magic & Arcana - Grimoire View
  if (showingCategoryMain && category === 'magic') {
    return (
      <>
        <div 
          className="fixed inset-0 z-0"
          style={{
            backgroundImage: campaign?.magic_image_url 
              ? `url(${campaign.magic_image_url})`
              : 'linear-gradient(to bottom right, #0f1419, #1a1f2e, #0f1419)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundAttachment: 'fixed'
          }}
        >
          {campaign?.magic_image_url && (
            <div className="absolute inset-0 bg-black/50" />
          )}
        </div>
        <div className="min-h-screen p-8 relative z-10">
          <div className="max-w-6xl mx-auto relative z-10">
            <Button
              onClick={() => navigate(createPageUrl("CampaignWorldLore") + `?id=${campaignId}`)}
              variant="ghost"
              className="mb-4 text-gray-400 hover:text-white"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to World Lore
            </Button>

            <div className="flex items-center justify-between mb-8">
              <h1 className="text-4xl font-bold">Magic & Arcana</h1>
              <Button
                onClick={() => navigate(createPageUrl("CampaignWorldLore") + `?id=${campaignId}&category=${category}&view=entries`)}
                className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#1E2430]"
              >
                View All Entries
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Content - Grimoire */}
              <div className="lg:col-span-2">
                <GrimoireViewer
                  spells={spells}
                  entries={categoryEntries}
                  canEdit={canEdit}
                  onSelectSpell={(spell) => setEditingSpell(spell)}
                  onDelete={(spellId) => deleteSpellMutation.mutate(spellId)}
                />
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Recent Lore Entries */}
                {categoryEntries.length > 0 && (
                  <div className="bg-[#2A3441]/90 backdrop-blur-sm rounded-xl p-6 border border-cyan-400/30">
                    <h2 className="text-xl font-bold mb-4 text-[#37F2D1]">Recent Arcane Lore</h2>
                    <div className="space-y-2">
                      {[...categoryEntries]
                        .sort((a, b) => new Date(b.updated_date) - new Date(a.updated_date))
                        .slice(0, 5)
                        .map(entry => (
                        <a
                          key={entry.id}
                          href={`?id=${campaignId}&category=${entry.category}&view=entries#${entry.id}`}
                          className="block bg-[#1E2430] rounded-lg p-3 hover:bg-[#1E2430]/80 transition-colors border border-gray-700/50"
                        >
                          <h3 className="text-sm font-bold text-white">{entry.title}</h3>
                          <span className="text-xs text-gray-500">
                            {new Date(entry.updated_date).toLocaleDateString()}
                          </span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Commentary */}
                <div className="bg-[#2A3441]/90 backdrop-blur-sm rounded-xl p-6 border border-cyan-400/30">
                  <h2 className="text-xl font-bold mb-4 text-[#37F2D1]">
                    <MessageSquare className="w-5 h-5 inline mr-2" />
                    Commentary
                  </h2>
                  <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
                    {comments.slice(0, 3).map(comment => (
                      <motion.div
                        key={comment.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-[#1E2430] rounded-lg p-3 border border-gray-700/50"
                      >
                        <div className="flex items-start gap-2">
                          {comment.user_avatar && (
                            <img src={comment.user_avatar} alt="" className="w-6 h-6 rounded-full" />
                          )}
                          <div className="flex-1 min-w-0">
                            <span className="font-semibold text-white text-xs block">{comment.user_name}</span>
                            <p className="text-gray-300 text-xs">{comment.content}</p>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                  <Textarea
                    placeholder="Share your thoughts on the arcane..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="bg-[#1E2430] border-gray-700 text-white text-sm mb-2"
                    rows={2}
                  />
                  <Button
                    onClick={handlePostComment}
                    disabled={!newComment.trim()}
                    size="sm"
                    className="w-full bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#1E2430]"
                  >
                    <Send className="w-3 h-3 mr-2" />
                    Post
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Spell Editor */}
        {editingSpell && (
          <SpellEditor
            spell={editingSpell}
            entries={categoryEntries}
            onSave={handleSaveSpell}
            onCancel={() => setEditingSpell(null)}
          />
        )}

        {/* Recipe Editor */}
        {editingRecipe && (
          <RecipeEditor
            recipe={editingRecipe}
            entries={categoryEntries}
            onSave={handleSaveRecipe}
            onCancel={() => setEditingRecipe(null)}
          />
        )}
      </>
    );
  }

  // Religions & Organizations - Pantheon & Faction View
  if (showingCategoryMain && category === 'religions') {
    return (
      <>
        <div 
          className="fixed inset-0 z-0"
          style={{
            backgroundImage: campaign?.religions_image_url 
              ? `url(${campaign.religions_image_url})`
              : 'linear-gradient(to bottom right, #0f1419, #1a1f2e, #0f1419)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundAttachment: 'fixed'
          }}
        >
          {campaign?.religions_image_url && (
            <div className="absolute inset-0 bg-black/50" />
          )}
        </div>
        <div className="min-h-screen p-8 relative z-10">
          <div className="max-w-6xl mx-auto relative z-10">
            <Button
              onClick={() => navigate(createPageUrl("CampaignWorldLore") + `?id=${campaignId}`)}
              variant="ghost"
              className="mb-4 text-gray-400 hover:text-white"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to World Lore
            </Button>

            <div className="flex items-center justify-between mb-8">
              <h1 className="text-4xl font-bold">Religions & Organizations</h1>
              <Button
                onClick={() => navigate(createPageUrl("CampaignWorldLore") + `?id=${campaignId}&category=${category}&view=entries`)}
                className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#1E2430]"
              >
                View All Entries
              </Button>
            </div>

            <div className="space-y-8">
              {/* Pantheon Section */}
              <div className="bg-[#2A3441]/90 backdrop-blur-sm rounded-xl p-6 border border-cyan-400/30">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-3xl font-bold text-[#37F2D1]">Pantheon</h2>
                  {canEdit && (
                    <button
                      onClick={() => setEditingDeity({})}
                      className="px-4 py-2 rounded-lg text-white font-semibold flex items-center gap-2 transition-colors"
                      style={{ backgroundColor: '#37F2D1' }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2dd9bd'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#37F2D1'}
                    >
                      <Plus className="w-4 h-4" />
                      Create Deity
                    </button>
                  )}
                </div>
                <PantheonViewer
                  deities={deities}
                  entries={categoryEntries}
                  canEdit={canEdit}
                  onSelectDeity={(deity) => setEditingDeity(deity)}
                  onDeleteDeity={(deityId) => deleteDeityMutation.mutate(deityId)}
                />
              </div>

              {/* Sects Section */}
              <div className="bg-[#2A3441]/90 backdrop-blur-sm rounded-xl p-6 border border-cyan-400/30">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-3xl font-bold text-[#37F2D1]">Sects & Organizations</h2>
                  {canEdit && (
                    <button
                      onClick={() => setEditingSect({})}
                      className="px-4 py-2 rounded-lg text-white font-semibold flex items-center gap-2 transition-colors"
                      style={{ backgroundColor: '#37F2D1' }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2dd9bd'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#37F2D1'}
                    >
                      <Plus className="w-4 h-4" />
                      Create Sect
                    </button>
                  )}
                </div>
                <SectViewer
                  sects={sects}
                  entries={categoryEntries}
                  characters={characters}
                  npcs={campaignNPCs}
                  canEdit={canEdit}
                  onSelectSect={(sect) => setEditingSect(sect)}
                  onDeleteSect={(sectId) => deleteSectMutation.mutate(sectId)}
                />
              </div>

              {/* Commentary */}
              <div className="bg-[#2A3441]/90 backdrop-blur-sm rounded-xl p-6 border border-cyan-400/30">
                <h2 className="text-2xl font-bold mb-4 text-[#37F2D1]">
                  <MessageSquare className="w-6 h-6 inline mr-2" />
                  Commentary
                </h2>
                <div className="space-y-4 mb-4 max-h-96 overflow-y-auto">
                  {comments.map(comment => (
                    <motion.div
                      key={comment.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-[#1E2430] rounded-lg p-4 border border-gray-700/50"
                    >
                      <div className="flex items-start gap-3">
                        {comment.user_avatar && (
                          <img src={comment.user_avatar} alt="" className="w-8 h-8 rounded-full" />
                        )}
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-semibold text-white">{comment.user_name}</span>
                            <span className="text-xs text-gray-500">
                              {new Date(comment.created_date).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-gray-300 text-sm">{comment.content}</p>
                        </div>
                        {(canEdit || comment.user_id === user?.id) && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deleteCommentMutation.mutate(comment.id)}
                            className="text-red-400 hover:text-red-300"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Add your thoughts..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="bg-[#1E2430] border-gray-700 text-white"
                    rows={2}
                  />
                  <Button
                    onClick={handlePostComment}
                    disabled={!newComment.trim()}
                    className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#1E2430]"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Deity Editor */}
        {editingDeity && (
          <DeityEditor
            deity={editingDeity}
            deities={deities}
            entries={categoryEntries}
            onSave={handleSaveDeity}
            onCancel={() => setEditingDeity(null)}
          />
        )}

        {/* Sect Editor */}
        {editingSect && (
          <SectEditor
            sect={editingSect}
            entries={categoryEntries}
            npcs={campaignNPCs}
            onSave={handleSaveSect}
            onCancel={() => setEditingSect(null)}
          />
        )}
      </>
    );
  }

  // Monster Compendium View
  if (showingCategoryMain && category === 'monsters') {
    return (
      <>
        <div 
          className="fixed inset-0 z-0"
          style={{
            backgroundImage: campaign?.monsters_image_url 
              ? `url(${campaign.monsters_image_url})`
              : 'linear-gradient(to bottom right, #0f1419, #1a1f2e, #0f1419)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundAttachment: 'fixed'
          }}
        >
          {campaign?.monsters_image_url && (
            <div className="absolute inset-0 bg-black/50" />
          )}
        </div>
        <div className="min-h-screen p-8 relative z-10">
          <div className="max-w-6xl mx-auto relative z-10">
            <Button
              onClick={() => navigate(createPageUrl("CampaignWorldLore") + `?id=${campaignId}`)}
              variant="ghost"
              className="mb-4 text-gray-400 hover:text-white"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to World Lore
            </Button>

            <div className="flex items-center justify-between mb-8">
              <h1 className="text-4xl font-bold">Monster Compendium</h1>
              <Button
                onClick={() => navigate(createPageUrl("CampaignWorldLore") + `?id=${campaignId}&category=${category}&view=entries`)}
                className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#1E2430]"
              >
                View All Entries
              </Button>
            </div>

            <MonsterLibrary
              monsters={monsters}
              currentCharacter={characters.find(c => c.created_by === user?.id)}
              canEdit={canEdit}
              onSelectMonster={(monster) => setEditingMonster(monster)}
              onDeleteMonster={(monsterId) => deleteMonsterMutation.mutate(monsterId)}
              onRefresh={() => queryClient.invalidateQueries({ queryKey: ['monsters'] })}
            />
          </div>
        </div>

        {/* Monster Editor */}
        {editingMonster && (
          <MonsterEditor
            monster={editingMonster}
            characters={characters}
            entries={categoryEntries}
            onSave={handleSaveMonster}
            onCancel={() => setEditingMonster(null)}
          />
        )}
      </>
    );
  }

  // Artifacts & Relics View
  if (showingCategoryMain && category === 'artifacts') {
    return (
      <>
        <div 
          className="fixed inset-0 z-0"
          style={{
            backgroundImage: campaign?.artifacts_image_url 
              ? `url(${campaign.artifacts_image_url})`
              : 'linear-gradient(to bottom right, #0f1419, #1a1f2e, #0f1419)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundAttachment: 'fixed'
          }}
        >
          {campaign?.artifacts_image_url && (
            <div className="absolute inset-0 bg-black/50" />
          )}
        </div>
        <div className="min-h-screen p-8 relative z-10">
          <div className="max-w-6xl mx-auto relative z-10">
            <Button
              onClick={() => navigate(createPageUrl("CampaignWorldLore") + `?id=${campaignId}`)}
              variant="ghost"
              className="mb-4 text-gray-400 hover:text-white"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to World Lore
            </Button>

            <ArtifactViewer
              artifacts={artifacts}
              entries={categoryEntries}
              canEdit={canEdit}
              onSelectArtifact={(artifact) => setEditingArtifact(artifact)}
              onDeleteArtifact={(artifactId) => deleteArtifactMutation.mutate(artifactId)}
            />

            <div className="mt-6 flex justify-center">
              <Button
                onClick={() => navigate(createPageUrl("CampaignWorldLore") + `?id=${campaignId}&category=${category}&view=entries`)}
                className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#1E2430]"
              >
                View All Lore Entries
              </Button>
            </div>
          </div>
        </div>

        {/* Artifact Editor */}
        {editingArtifact && (
          <ArtifactEditor
            artifact={editingArtifact}
            entries={categoryEntries}
            onSave={handleSaveArtifact}
            onCancel={() => setEditingArtifact(null)}
          />
        )}
      </>
    );
  }

  if (showingCategoryMain && category === 'myth') {
    return (
      <>
        <div 
          className="fixed inset-0 z-0"
          style={{
            backgroundImage: campaign?.myth_image_url 
              ? `url(${campaign.myth_image_url})`
              : 'linear-gradient(to bottom right, #0f1419, #1a1f2e, #0f1419)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundAttachment: 'fixed'
          }}
        >
          {campaign?.myth_image_url && (
            <div className="absolute inset-0 bg-black/50" />
          )}
        </div>
        <div className="min-h-screen p-8 relative z-10">
          <div className="max-w-6xl mx-auto relative z-10">
            <Button
              onClick={() => navigate(createPageUrl("CampaignWorldLore") + `?id=${campaignId}`)}
              variant="ghost"
              className="mb-4 text-gray-400 hover:text-white"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to World Lore
            </Button>

            <div className="flex items-center justify-between mb-8">
              <h1 className="text-4xl font-bold">Myth & Legend</h1>
              <Button
                onClick={() => navigate(createPageUrl("CampaignWorldLore") + `?id=${campaignId}&category=${category}&view=entries`)}
                className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#1E2430]"
              >
                View All Entries
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Content */}
              <div className="lg:col-span-2 space-y-6">
                {/* Recent Entries */}
                {categoryEntries.length > 0 && (
                  <div className="bg-[#2A3441]/90 backdrop-blur-sm rounded-xl p-6 border border-cyan-400/30">
                    <h2 className="text-2xl font-bold mb-4 text-[#37F2D1]">Recent Legends</h2>
                    <div className="space-y-3">
                      {[...categoryEntries]
                        .sort((a, b) => new Date(b.updated_date) - new Date(a.updated_date))
                        .slice(0, 5)
                        .map(entry => (
                        <a
                          key={entry.id}
                          href={`?id=${campaignId}&category=${entry.category}&view=entries#${entry.id}`}
                          className="block bg-[#1E2430] rounded-lg p-4 hover:bg-[#1E2430]/80 transition-colors border border-gray-700/50"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="text-lg font-bold text-white">{entry.title}</h3>
                            </div>
                            <span className="text-xs text-gray-500">
                              {new Date(entry.updated_date).toLocaleDateString()}
                            </span>
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Commentary Feed */}
                <div className="bg-[#2A3441]/90 backdrop-blur-sm rounded-xl p-6 border border-cyan-400/30">
                  <h2 className="text-2xl font-bold mb-4 text-[#37F2D1]">
                    <MessageSquare className="w-6 h-6 inline mr-2" />
                    Commentary
                  </h2>
                  <div className="space-y-4 mb-4 max-h-96 overflow-y-auto">
                    {comments.map(comment => (
                      <motion.div
                        key={comment.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-[#1E2430] rounded-lg p-4 border border-gray-700/50"
                      >
                        <div className="flex items-start gap-3">
                          {comment.user_avatar && (
                            <img src={comment.user_avatar} alt="" className="w-8 h-8 rounded-full" />
                          )}
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-semibold text-white">{comment.user_name}</span>
                              <span className="text-xs text-gray-500">
                                {new Date(comment.created_date).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-gray-300 text-sm">{comment.content}</p>
                          </div>
                          {(canEdit || comment.user_id === user?.id) && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => deleteCommentMutation.mutate(comment.id)}
                              className="text-red-400 hover:text-red-300"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Textarea
                      placeholder="Add your thoughts..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      className="bg-[#1E2430] border-gray-700 text-white"
                      rows={2}
                    />
                    <Button
                      onClick={handlePostComment}
                      disabled={!newComment.trim()}
                      className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#1E2430]"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Sidebar - Legend System */}
              <div>
                <PlayerLegendTracker campaignId={campaignId} canEdit={canEdit} />
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Miscellaneous - Guild Hall & Player Diaries
  if (showingCategoryMain && category === 'misc') {
    const playerIds = [...new Set(campaign?.player_ids || [])];
    
    return (
      <>
        <div 
          className="fixed inset-0 z-0"
          style={{
            backgroundImage: campaign?.misc_image_url 
              ? `url(${campaign.misc_image_url})`
              : 'linear-gradient(to bottom right, #0f1419, #1a1f2e, #0f1419)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundAttachment: 'fixed'
          }}
        >
          {campaign?.misc_image_url && (
            <div className="absolute inset-0 bg-black/50" />
          )}
        </div>
        <div className="min-h-screen p-8 relative z-10">
          <div className="max-w-6xl mx-auto relative z-10">
            <Button
              onClick={() => navigate(createPageUrl("CampaignWorldLore") + `?id=${campaignId}`)}
              variant="ghost"
              className="mb-4 text-gray-400 hover:text-white"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to World Lore
            </Button>

            <div className="flex items-center justify-between mb-8">
              <h1 className="text-4xl font-bold">Guild Hall</h1>
              <Button
                onClick={() => navigate(createPageUrl("CampaignWorldLore") + `?id=${campaignId}&category=${category}&view=entries`)}
                className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#1E2430]"
              >
                View All Entries
              </Button>
            </div>

            <div className="space-y-8">
              {/* Guild Hall Section */}
              <GuildHallManager
                campaign={campaign}
                guildHall={guildHall}
                options={guildHallOptions}
                canEdit={canEdit}
                onUpdate={(data) => base44.entities.GuildHall.update(guildHall.id, data)}
                onRefresh={() => {
                  queryClient.invalidateQueries({ queryKey: ['guildHall'] });
                  queryClient.invalidateQueries({ queryKey: ['guildHallOptions'] });
                }}
              />

              {/* Player Diaries */}
              {playerIds.map(playerId => {
                const playerProfile = allPlayerProfiles.find(p => p.user_id === playerId);
                const playerDiary = playerDiaries.find(d => d.user_id === playerId);
                const isOwner = user?.id === playerId;

                return (
                  <PlayerDiarySection
                    key={playerId}
                    diary={playerDiary}
                    userProfile={playerProfile}
                    isOwner={isOwner}
                    onUpdate={handleUpdatePlayerDiary}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </>
    );
  }

  if (showingCategoryMain) {
    const categoryImageField = `${category}_image_url`;

    return (
      <>
        <div 
          className="fixed inset-0 z-0"
          style={{
            backgroundImage: campaign?.[categoryImageField] 
              ? `url(${campaign[categoryImageField]})`
              : 'linear-gradient(to bottom right, #0f1419, #1a1f2e, #0f1419)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundAttachment: 'fixed'
          }}
        >
          {campaign?.[categoryImageField] && (
            <div className="absolute inset-0 bg-black/50" />
          )}
        </div>
        <div className="min-h-screen p-8 relative z-10">
        <div className="max-w-6xl mx-auto relative z-10">
          <Button
            onClick={() => navigate(createPageUrl("CampaignWorldLore") + `?id=${campaignId}`)}
            variant="ghost"
            className="mb-4 text-gray-400 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to World Lore
          </Button>

          <div className="flex items-center justify-between mb-8">
            <h1 className="text-4xl font-bold capitalize">
              {category === 'flora' ? 'Field Guide' : category === 'misc' ? 'Guild Hall' : category.replace('_', ' & ')}
            </h1>
            <Button
              onClick={() => navigate(createPageUrl("CampaignWorldLore") + `?id=${campaignId}&category=${category}&view=entries`)}
              className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#1E2430]"
            >
              View All Entries
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Flora & Fauna Compendium */}
              {category === 'flora' && filteredEntries.length > 0 ? (
                <div className="bg-[#2A3441] rounded-xl p-6 border border-gray-700">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-bold text-[#37F2D1]">Field Guide</h2>
                    {subcategory && (
                      <Button
                        onClick={() => navigate(createPageUrl("CampaignWorldLore") + `?id=${campaignId}&category=${category}`)}
                        variant="outline"
                        size="sm"
                        className="text-gray-300 hover:text-[#37F2D1]"
                      >
                        Clear Filter
                      </Button>
                    )}
                  </div>
                  <div className="bg-[#1E2430] rounded-lg p-8 border border-gray-700/50">
                    {(() => {
                      const sortedEntries = [...filteredEntries].sort((a, b) => a.title.localeCompare(b.title));
                      const currentEntries = sortedEntries.slice(floraPage * 2, floraPage * 2 + 2);
                      const hasNext = floraPage * 2 + 2 < sortedEntries.length;
                      const hasPrev = floraPage > 0;

                      return (
                        <>
                          <div className="grid grid-cols-2 gap-12 mb-8">
                            {currentEntries.map(entry => {
                              const tempDiv = document.createElement('div');
                              tempDiv.innerHTML = entry.content || '';
                              const firstImg = tempDiv.querySelector('img');
                              const imageUrl = firstImg ? firstImg.src : null;

                              // Remove image from content
                              if (firstImg) {
                                firstImg.remove();
                              }
                              const textContent = tempDiv.innerHTML;

                              return (
                                <div key={entry.id} className="space-y-3">
                                  <h3 className="text-xl font-bold text-white border-b border-gray-700 pb-2">
                                    {entry.title}
                                  </h3>
                                  <div className="w-full h-64 bg-[#2A3441] rounded-lg overflow-hidden border border-gray-700">
                                    {imageUrl ? (
                                      <img 
                                        src={imageUrl} 
                                        alt={entry.title}
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center text-gray-600">
                                        No image
                                      </div>
                                    )}
                                  </div>
                                  <div className="bg-[#2A3441] rounded-lg p-4 border border-gray-700 h-[400px] overflow-y-auto">
                                    <div 
                                      className="prose prose-invert prose-sm max-w-none text-gray-300"
                                      dangerouslySetInnerHTML={{ __html: textContent || '<p class="text-gray-400">No content yet.</p>' }}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          <div className="flex justify-between items-center pt-4 border-t border-gray-700">
                            {hasPrev ? (
                              <Button
                                onClick={() => setFloraPage(floraPage - 1)}
                                variant="ghost"
                                className="text-gray-300 hover:text-[#37F2D1]"
                              >
                                <ChevronLeft className="w-4 h-4 mr-2" />
                                Previous Page
                              </Button>
                            ) : <div />}

                            {hasNext && (
                              <Button
                                onClick={() => setFloraPage(floraPage + 1)}
                                variant="ghost"
                                className="text-gray-300 hover:text-[#37F2D1] ml-auto"
                              >
                                Next Page
                                <ChevronRight className="w-4 h-4 ml-2" />
                              </Button>
                            )}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              ) : (
                <>
                  {/* Most Recent Entry */}
                  {recentEntry && (
                    <div className="bg-[#2A3441] rounded-xl p-6 border border-gray-700">
                      <h2 className="text-2xl font-bold mb-4 text-[#37F2D1]">Most Recent Entry</h2>
                      <div className="bg-[#1E2430] rounded-lg p-6 border border-gray-700/50">
                        <div className="flex items-start justify-between mb-4">
                          <h3 className="text-2xl font-bold text-white">{recentEntry.title}</h3>
                          <span className="text-xs text-gray-500">
                            {new Date(recentEntry.updated_date).toLocaleDateString()}
                          </span>
                        </div>
                        <div 
                          className="prose prose-invert max-w-none max-h-[500px] overflow-y-auto"
                          dangerouslySetInnerHTML={{ __html: recentEntry.content || '<p class="text-gray-400">No content yet.</p>' }}
                        />
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Pinned Entries */}
              {category !== 'flora' && pinnedEntries.length > 0 && (
                <div className="bg-[#2A3441] rounded-xl p-6 border border-gray-700">
                  <h2 className="text-2xl font-bold mb-4 text-[#FF5722]">
                    <Pin className="w-6 h-6 inline mr-2" />
                    Pinned Entries
                  </h2>
                  <div className="space-y-3">
                    {pinnedEntries.map(entry => (
                      <a
                        key={entry.id}
                        href={`?id=${campaignId}&category=${category}&view=entries#${entry.id}`}
                        className="block bg-[#1E2430] rounded-lg p-4 hover:bg-[#1E2430]/80 transition-colors border border-gray-700/50"
                      >
                        <h3 className="text-lg font-bold text-white">{entry.title}</h3>
                        {entry.subcategory && entry.subcategory !== entry.title && (
                          <p className="text-sm text-gray-400">{entry.subcategory}</p>
                        )}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Commentary Feed */}
              <div className="bg-[#2A3441]/90 backdrop-blur-sm rounded-xl p-6 border border-cyan-400/30">
                <h2 className="text-2xl font-bold mb-4 text-[#37F2D1]">
                  <MessageSquare className="w-6 h-6 inline mr-2" />
                  Commentary
                </h2>
                <div className="space-y-4 mb-4 max-h-96 overflow-y-auto">
                  {comments.map(comment => (
                    <motion.div
                      key={comment.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-[#1E2430] rounded-lg p-4 border border-gray-700/50"
                    >
                      <div className="flex items-start gap-3">
                        {comment.user_avatar && (
                          <img src={comment.user_avatar} alt="" className="w-8 h-8 rounded-full" />
                        )}
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-semibold text-white">{comment.user_name}</span>
                            <span className="text-xs text-gray-500">
                              {new Date(comment.created_date).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-gray-300 text-sm">{comment.content}</p>
                        </div>
                        {(canEdit || comment.user_id === user?.id) && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deleteCommentMutation.mutate(comment.id)}
                            className="text-red-400 hover:text-red-300"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Add your thoughts about this category..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="bg-[#1E2430] border-gray-700 text-white"
                    rows={2}
                  />
                  <Button
                    onClick={handlePostComment}
                    disabled={!newComment.trim()}
                    className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#1E2430]"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Sidebar - Only show for Flora */}
            {category === 'flora' && subcategories.length > 0 && (
              <div className="space-y-6">
                <div className="bg-[#2A3441] rounded-xl p-6 border border-gray-700">
                  <h2 className="text-xl font-bold mb-4">Subcategories</h2>
                  <div className="space-y-2">
                    {subcategories.map(sub => (
                      <div
                        key={sub}
                        className="bg-[#1E2430] rounded-lg p-3 border border-gray-700/50"
                      >
                        <div className="flex items-center justify-between">
                          <a
                            href={`?id=${campaignId}&category=${category}&subcategory=${sub}`}
                            className="flex-1 hover:text-[#37F2D1] transition-colors"
                          >
                            <h3 className="text-sm font-semibold text-white">{sub}</h3>
                          </a>
                          {canEdit && (
                            <Button
                              onClick={() => {
                                setRenamingSubcategory(sub);
                                setNewSubcategoryName(sub);
                              }}
                              variant="ghost"
                              size="sm"
                              className="text-gray-400 hover:text-[#37F2D1] h-6 w-6 p-0"
                              title="Rename Subcategory"
                            >
                              <Edit className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        </div>
      </>
    );
  }

  // Entries list view
  const categoryImageField = `${category}_image_url`;

  return (
    <>
      <div 
        className="fixed inset-0 z-0"
        style={{
          backgroundImage: campaign?.[categoryImageField] 
            ? `url(${campaign[categoryImageField]})`
            : 'linear-gradient(to bottom right, #0f1419, #1a1f2e, #0f1419)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed'
        }}
      >
        {campaign?.[categoryImageField] && (
          <div className="absolute inset-0 bg-black/50" />
        )}
      </div>
      <div className="min-h-screen p-8 relative z-10">
      <div className="max-w-6xl mx-auto relative z-10">
        <Button
          onClick={() => navigate(createPageUrl("CampaignWorldLore") + `?id=${campaignId}&category=${category}`)}
          variant="ghost"
          className="mb-4 text-gray-400 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to World Lore
        </Button>

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold capitalize">{category.replace('_', ' & ')}</h1>
            {subcategory && (
              <div className="flex items-center gap-2 mt-2">
                <span className="text-gray-400">Subcategory:</span>
                <span className="text-[#37F2D1] font-semibold">{subcategory}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(createPageUrl("CampaignWorldLore") + `?id=${campaignId}&category=${category}`)}
                  className="text-gray-400 hover:text-white"
                >
                  ✕ Clear
                </Button>
              </div>
            )}
          </div>
          {canEdit && (
            <Button 
              onClick={() => setShowNewEntry(true)}
              className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#1E2430]"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Entry
            </Button>
          )}
        </div>

        {/* Subcategories */}
        {subcategories.length > 0 && !subcategory && (
          <div className="grid grid-cols-4 gap-4 mb-8">
            {subcategories.map((sub, idx) => (
              <a
                key={sub}
                href={`?id=${campaignId}&category=${category}&subcategory=${sub}`}
                className="relative h-40 rounded-xl overflow-hidden cursor-pointer group bg-[#2A3441]/80 backdrop-blur-sm"
              >
                {/* Corner Decorations */}
                <div className="absolute top-0 left-0 w-12 h-12 border-l-2 border-t-2 border-cyan-400/50" />
                <div className="absolute top-0 right-0 w-12 h-12 border-r-2 border-t-2 border-cyan-400/50" />
                <div className="absolute bottom-0 left-0 w-12 h-12 border-l-2 border-b-2 border-cyan-400/50" />
                <div className="absolute bottom-0 right-0 w-12 h-12 border-r-2 border-b-2 border-cyan-400/50" />

                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />

                {/* Content */}
                <div className="absolute inset-0 p-4 flex flex-col justify-center">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center">
                      <span className="text-sm font-bold text-white">{String(idx + 1).padStart(2, '0')}</span>
                    </div>
                  </div>
                  <h3 className="text-lg font-bold text-white">{sub}</h3>
                </div>
              </a>
            ))}
          </div>
        )}

        {/* Entries List */}
        <div className="space-y-4">
          {filteredEntries.slice(0, 5).map(entry => (
            <div
              key={entry.id}
              className={`bg-[#2A3441] rounded-xl p-6 border transition-all ${
                selectedEntry?.id === entry.id ? 'border-[#37F2D1]' : 'border-gray-700'
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-2xl font-bold text-white">{entry.title}</h3>
                    {entry.is_pinned && (
                      <Pin className="w-5 h-5 text-[#FF5722] fill-current" />
                    )}
                    <div className="flex items-center gap-1 text-xs" title={getVisibilityLabel(entry.visibility)}>
                      {getVisibilityIcon(entry.visibility)}
                    </div>
                  </div>
                  {entry.subcategory && entry.subcategory !== entry.title && (
                    <p className="text-sm text-gray-400 mt-1">{entry.subcategory}</p>
                  )}
                </div>
                {canEdit && (
                  <div className="flex gap-2">
                  <Button
                    onClick={() => setSelectedEntry({ ...entry })}
                    variant="ghost"
                    size="sm"
                    className="text-gray-400 hover:text-[#37F2D1]"
                    title="Edit Entry"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    onClick={() => togglePinMutation.mutate({ id: entry.id, isPinned: entry.is_pinned })}
                    variant="ghost"
                    size="sm"
                    className="text-gray-400 hover:text-[#FF5722]"
                  >
                    {entry.is_pinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
                  </Button>
                  {!entry.subcategory ? (
                   <Button
                     onClick={() => {
                       setSubcategoryDialog(entry);
                       setSubcategoryInput("");
                     }}
                     variant="ghost"
                     size="sm"
                     className="text-gray-400 hover:text-[#37F2D1]"
                     title="Add to Subcategory"
                   >
                     <FolderPlus className="w-4 h-4" />
                   </Button>
                  ) : (
                   <Button
                     onClick={() => removeSubcategoryMutation.mutate(entry.id)}
                     variant="ghost"
                     size="sm"
                     className="text-gray-400 hover:text-yellow-400"
                     title="Remove from Subcategory"
                   >
                     <FolderPlus className="w-4 h-4" style={{ transform: 'rotate(45deg)' }} />
                   </Button>
                  )}
                    <Button
                      onClick={() => deleteEntryMutation.mutate(entry.id)}
                      variant="ghost"
                      size="sm"
                      className="text-gray-400 hover:text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>

              {selectedEntry?.id === entry.id && canEdit ? null : (
                <div 
                  className="prose prose-invert max-w-none max-h-[500px] overflow-y-auto"
                  dangerouslySetInnerHTML={{ __html: entry.content || '<p class="text-gray-400">No content yet.</p>' }}
                />
              )}
            </div>
            ))}
            {filteredEntries.length > 5 && (
            <div className="text-center pt-4">
              <Button
                variant="outline"
                className="text-gray-400 hover:text-white border-gray-700"
              >
                See Older Entries ({filteredEntries.length - 5} more)
              </Button>
            </div>
            )}
            </div>

            {/* Edit Entry Dialog */}
        {selectedEntry && canEdit && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto">
            <div className="bg-[#1E2430] border border-[#2A3441] rounded-xl p-8 max-w-4xl w-full mx-4 my-8">
              <h2 className="text-2xl font-bold mb-6">Edit: {selectedEntry.title}</h2>
              <div className="space-y-4">
                <div className="flex gap-4 mb-4">
                  <Button
                    onClick={() => handleImageUpload(false)}
                    disabled={uploadingImage}
                    variant="outline"
                    size="sm"
                    className="bg-[#2A3441] border-gray-700 text-white hover:bg-[#37F2D1] hover:text-[#1E2430]"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {uploadingImage ? 'Uploading...' : 'Upload Image'}
                  </Button>
                  <Select 
                    value={selectedEntry.visibility || 'public'}
                    onValueChange={(value) => setSelectedEntry({ ...selectedEntry, visibility: value })}
                  >
                    <SelectTrigger className="w-48 bg-[#2A3441] border-gray-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">
                        <div className="flex items-center gap-2">
                          <Eye className="w-4 h-4 text-green-500" />
                          Public
                        </div>
                      </SelectItem>
                      <SelectItem value="gm_mole">
                        <div className="flex items-center gap-2">
                          <EyeOff className="w-4 h-4 text-yellow-500" />
                          GM & Mole Only
                        </div>
                      </SelectItem>
                      <SelectItem value="gm_only">
                        <div className="flex items-center gap-2">
                          <Lock className="w-4 h-4 text-red-500" />
                          GM Only
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex-1">
                   <label className="text-xs text-gray-400 mb-1 block">
                     {category === 'geography' ? 'Region (optional)' : 
                      category === 'political' ? 'Faction (optional)' : 
                      'Subcategory (optional)'}
                   </label>
                   {category === 'geography' ? (
                     <select
                       value={selectedEntry.subcategory || ''}
                       onChange={(e) => setSelectedEntry({ ...selectedEntry, subcategory: e.target.value || null })}
                       className="w-full bg-[#2A3441] border border-gray-700 text-white rounded-lg px-3 py-2"
                     >
                       <option value="">Select a region...</option>
                       {regions.map(region => (
                         <option key={region.id} value={region.name}>{region.name}</option>
                       ))}
                     </select>
                   ) : category === 'political' ? (
                     <select
                       value={selectedEntry.subcategory || ''}
                       onChange={(e) => setSelectedEntry({ ...selectedEntry, subcategory: e.target.value || null })}
                       className="w-full bg-[#2A3441] border border-gray-700 text-white rounded-lg px-3 py-2"
                     >
                       <option value="">Select a faction...</option>
                       {factions.map(faction => (
                         <option key={faction.id} value={faction.name}>{faction.name}</option>
                       ))}
                     </select>
                   ) : (
                      <>
                        <Input
                          placeholder="Enter subcategory name or leave blank..."
                          value={selectedEntry.subcategory || ''}
                          onChange={(e) => setSelectedEntry({ ...selectedEntry, subcategory: e.target.value || null })}
                          list="edit-subcategory-list"
                          className="bg-[#2A3441] border-gray-700 text-white"
                        />
                        <datalist id="edit-subcategory-list">
                          {subcategories.map(sub => (
                            <option key={sub} value={sub} />
                          ))}
                        </datalist>
                      </>
                    )}
                  </div>
                </div>
                <ReactQuill
                  ref={quillRef}
                  theme="snow"
                  value={selectedEntry.content || ""}
                  onChange={(content) => setSelectedEntry({ ...selectedEntry, content })}
                  modules={quillModules}
                  className="bg-white text-black rounded-lg"
                  style={{ height: '400px', marginBottom: '50px' }}
                />
                <div className="flex gap-2 justify-end">
                  <Button
                    onClick={() => setSelectedEntry(null)}
                    variant="ghost"
                    className="text-gray-400"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => handleSaveEntry(selectedEntry, selectedEntry.content)}
                    className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#1E2430]"
                    disabled={updateEntryMutation.isPending}
                  >
                    {updateEntryMutation.isPending ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Add to Subcategory Dialog */}
        {subcategoryDialog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-[#1E2430] border border-[#2A3441] rounded-xl p-8 max-w-md w-full mx-4">
              <h2 className="text-2xl font-bold mb-6">Add to Subcategory</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Entry</label>
                  <div className="text-white font-semibold">{subcategoryDialog.title}</div>
                </div>
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Subcategory Name</label>
                  <Input
                    value={subcategoryInput}
                    onChange={(e) => setSubcategoryInput(e.target.value)}
                    className="bg-[#2A3441] border-gray-700 text-white"
                    placeholder="Enter new or existing subcategory..."
                    list="existing-subcategories"
                  />
                  <datalist id="existing-subcategories">
                    {subcategories.map(sub => (
                      <option key={sub} value={sub} />
                    ))}
                  </datalist>
                </div>
                {subcategories.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-500 mb-2">Or select existing:</p>
                    <div className="flex flex-wrap gap-2">
                      {subcategories.map(sub => (
                        <button
                          key={sub}
                          onClick={() => setSubcategoryInput(sub)}
                          className="px-3 py-1 bg-[#2A3441] hover:bg-[#37F2D1] hover:text-[#1E2430] rounded-lg text-sm transition-colors"
                        >
                          {sub}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex gap-2 justify-end">
                  <Button
                    onClick={() => {
                      setSubcategoryDialog(null);
                      setSubcategoryInput("");
                    }}
                    variant="ghost"
                    className="text-gray-400"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => promoteToSubcategoryMutation.mutate({ 
                      id: subcategoryDialog.id, 
                      subcategoryName: subcategoryInput 
                    })}
                    className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#1E2430]"
                    disabled={!subcategoryInput.trim()}
                  >
                    Add to Subcategory
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Rename Subcategory Dialog */}
        {renamingSubcategory && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-[#1E2430] border border-[#2A3441] rounded-xl p-8 max-w-md w-full mx-4">
              <h2 className="text-2xl font-bold mb-6">Rename Subcategory</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Current Name</label>
                  <div className="text-white font-semibold">{renamingSubcategory}</div>
                </div>
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">New Name</label>
                  <Input
                    value={newSubcategoryName}
                    onChange={(e) => setNewSubcategoryName(e.target.value)}
                    className="bg-[#2A3441] border-gray-700 text-white"
                    placeholder="Enter new subcategory name..."
                  />
                </div>
                <p className="text-xs text-gray-500">
                  This will rename all entries in this subcategory.
                </p>
                <div className="flex gap-2 justify-end">
                  <Button
                    onClick={() => {
                      setRenamingSubcategory(null);
                      setNewSubcategoryName("");
                    }}
                    variant="ghost"
                    className="text-gray-400"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => renameSubcategoryMutation.mutate({ 
                      oldName: renamingSubcategory, 
                      newName: newSubcategoryName 
                    })}
                    className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#1E2430]"
                    disabled={!newSubcategoryName.trim() || newSubcategoryName === renamingSubcategory}
                  >
                    Rename
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* New Entry Dialog */}
        {showNewEntry && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-[#1E2430] border border-[#2A3441] rounded-xl p-8 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold mb-6">New Entry</h2>
              <div className="space-y-4">
                <Input
                  placeholder="Entry title..."
                  value={newEntryTitle}
                  onChange={(e) => setNewEntryTitle(e.target.value)}
                  className="bg-[#2A3441] border-gray-700 text-white"
                />
                {category === 'geography' ? (
                 <div className="space-y-2">
                   <label className="text-sm text-gray-400">Region (optional)</label>
                   <select
                     value={newEntrySubcategory}
                     onChange={(e) => setNewEntrySubcategory(e.target.value)}
                     className="w-full bg-[#2A3441] border border-gray-700 text-white rounded-lg px-3 py-2"
                   >
                     <option value="">Select a region...</option>
                     {regions.map(region => (
                       <option key={region.id} value={region.name}>{region.name}</option>
                     ))}
                   </select>
                 </div>
                ) : category === 'political' ? (
                 <div className="space-y-2">
                   <label className="text-sm text-gray-400">Faction (optional)</label>
                   <select
                     value={newEntrySubcategory}
                     onChange={(e) => setNewEntrySubcategory(e.target.value)}
                     className="w-full bg-[#2A3441] border border-gray-700 text-white rounded-lg px-3 py-2"
                   >
                     <option value="">Select a faction...</option>
                     {factions.map(faction => (
                       <option key={faction.id} value={faction.name}>{faction.name}</option>
                     ))}
                   </select>
                 </div>
                ) : (
                  <div className="space-y-2">
                    <label className="text-sm text-gray-400">Subcategory (optional)</label>
                    <Input
                      placeholder="Enter subcategory name or leave blank..."
                      value={newEntrySubcategory}
                      onChange={(e) => setNewEntrySubcategory(e.target.value)}
                      list="subcategory-list"
                      className="bg-[#2A3441] border-gray-700 text-white"
                    />
                    <datalist id="subcategory-list">
                      {subcategories.map(sub => (
                        <option key={sub} value={sub} />
                      ))}
                    </datalist>
                  </div>
                )}

                {/* Historical Date for History entries */}
                {category === 'history' && campaign?.calendar_system && (
                  <div className="space-y-2 p-4 bg-[#2A3441] rounded-lg border border-gray-700">
                    <label className="text-sm font-semibold text-white">Historical Date (optional)</label>
                    <p className="text-xs text-gray-400 mb-2">Set when this event occurred in history</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-gray-400">{campaign.calendar_system.year_name || 'Year'}</label>
                        <Input
                          type="number"
                          placeholder="Year"
                          value={newEntryHistoricalDate.year || ''}
                          onChange={(e) => {
                            const year = parseInt(e.target.value) || null;
                            setNewEntryHistoricalDate(prev => ({...prev, year}));
                          }}
                          className="bg-[#1E2430] border-gray-700 text-white"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-400">Era (optional)</label>
                        <Input
                          placeholder="e.g., BC, AD, AE..."
                          value={newEntryHistoricalDate.era || ''}
                          onChange={(e) => {
                            setNewEntryHistoricalDate(prev => ({...prev, era: e.target.value}));
                          }}
                          className="bg-[#1E2430] border-gray-700 text-white"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Event Date for Calendar entries */}
                {category === 'calendar' && campaign?.calendar_system && (
                  <div className="space-y-2 p-4 bg-[#2A3441] rounded-lg border border-gray-700">
                    <label className="text-sm font-semibold text-white">Event Date (optional)</label>
                    <p className="text-xs text-gray-400 mb-2">Set a date to show this event on the calendar</p>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="text-xs text-gray-400">Month</label>
                        <Input
                          type="number"
                          min="1"
                          max={campaign.calendar_system.months_per_year}
                          placeholder="Month"
                          value={newEntryEventDate.month || ''}
                          onChange={(e) => {
                            const month = parseInt(e.target.value) || null;
                            setNewEntryEventDate(prev => ({...prev, month}));
                          }}
                          className="bg-[#1E2430] border-gray-700 text-white"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-400">Day</label>
                        <Input
                          type="number"
                          min="1"
                          max={campaign.calendar_system.days_per_week * campaign.calendar_system.weeks_per_month}
                          placeholder="Day"
                          value={newEntryEventDate.day || ''}
                          onChange={(e) => {
                            const day = parseInt(e.target.value) || null;
                            setNewEntryEventDate(prev => ({...prev, day}));
                          }}
                          className="bg-[#1E2430] border-gray-700 text-white"
                        />
                      </div>
                      <div className="flex items-end">
                        <label className="flex items-center gap-2 text-sm text-gray-300">
                          <input
                            type="checkbox"
                            checked={newEntryEventDate.recurring}
                            onChange={(e) => {
                              setNewEntryEventDate(prev => ({...prev, recurring: e.target.checked}));
                            }}
                            className="rounded"
                          />
                          Recurring
                        </label>
                      </div>
                    </div>
                  </div>
                )}
                <div className="flex gap-4 mb-4">
                  <Button
                    onClick={() => handleImageUpload(true)}
                    disabled={uploadingImage}
                    variant="outline"
                    size="sm"
                    className="bg-[#2A3441] border-gray-700 text-white hover:bg-[#37F2D1] hover:text-[#1E2430]"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {uploadingImage ? 'Uploading...' : 'Upload Image'}
                  </Button>
                  <Select 
                    value={newEntryVisibility}
                    onValueChange={setNewEntryVisibility}
                  >
                    <SelectTrigger className="w-48 bg-[#2A3441] border-gray-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">
                        <div className="flex items-center gap-2">
                          <Eye className="w-4 h-4 text-green-500" />
                          Public
                        </div>
                      </SelectItem>
                      <SelectItem value="gm_mole">
                        <div className="flex items-center gap-2">
                          <EyeOff className="w-4 h-4 text-yellow-500" />
                          GM & Mole Only
                        </div>
                      </SelectItem>
                      <SelectItem value="gm_only">
                        <div className="flex items-center gap-2">
                          <Lock className="w-4 h-4 text-red-500" />
                          GM Only
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <ReactQuill
                  ref={newEntryQuillRef}
                  theme="snow"
                  value={newEntryContent}
                  onChange={setNewEntryContent}
                  modules={quillModules}
                  className="bg-white text-black rounded-lg"
                  style={{ height: '400px', marginBottom: '50px' }}
                  placeholder="Write your lore entry..."
                />
                <div className="flex gap-2 justify-end">
                  <Button
                    onClick={() => {
                      setShowNewEntry(false);
                      setNewEntryTitle("");
                      setNewEntryContent("");
                      setNewEntrySubcategory("");
                      setNewEntryEventDate({ month: null, day: null, recurring: true });
                    }}
                    variant="ghost"
                    className="text-gray-400"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreateEntry}
                    className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#1E2430]"
                    disabled={createEntryMutation.isPending}
                  >
                    {createEntryMutation.isPending ? 'Creating...' : 'Create Entry'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      </div>
    </>
  );
}