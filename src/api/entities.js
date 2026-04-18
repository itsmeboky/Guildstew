import { supabase } from './supabaseClient'

function createEntity(tableName) {
  return {
    async filter(filters = {}, sort, limit) {
      let query = supabase.from(tableName).select('*')
      for (const [key, value] of Object.entries(filters)) {
        query = query.eq(key, value)
      }
      if (sort) {
        const desc = sort.startsWith('-')
        const field = desc ? sort.slice(1) : sort
        query = query.order(field, { ascending: !desc })
      }
      if (limit) {
        query = query.limit(limit)
      }
      const { data, error } = await query
      if (error) throw error
      return data || []
    },

async list(sort, limit) {
      let query = supabase.from(tableName).select('*')
      
      if (sort) {
        const desc = sort.startsWith('-')
        const field = desc ? sort.slice(1) : sort
        query = query.order(field, { ascending: !desc })
      } else {
        query = query.order('created_at', { ascending: false })
      }
      
      if (limit) {
        query = query.limit(limit)
      }
      
      const { data, error } = await query
      if (error) throw error
      return data || []
    },

    async create(obj) {
      console.log(`CREATE ${tableName}:`, JSON.stringify(obj, null, 2))
      const { data, error } = await supabase
        .from(tableName)
        .insert(obj)
        .select()
        .single()
      if (error) {
        console.error(`CREATE ${tableName} FAILED:`, error.message, error.details, error.hint)
        throw error
      }
      return data
    }, 

    async update(id, updates) {
      const { data, error } = await supabase
        .from(tableName)
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },

    async delete(id) {
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', id)
      if (error) throw error
      return true
    }
  }
}

export const entities = {
  Achievement:          createEntity('achievements'),
  AdminAction:          createEntity('admin_actions'),
  AnalyticsEvent:       createEntity('analytics_events'),
  Artifact:             createEntity('artifacts'),
  Campaign:             createEntity('campaigns'),
  CampaignInvitation:   createEntity('campaign_invitations'),
  CampaignItem:         createEntity('campaign_items'),
  CampaignLogEntry:     createEntity('campaign_log_entries'),
  CampaignAbility:      createEntity('campaign_abilities'),
  CampaignHomebrew:     createEntity('campaign_homebrew'),
  CampaignMap:          createEntity('campaign_maps'),
  CampaignNPC:          createEntity('campaign_npcs'),
  CampaignUpdate:       createEntity('campaign_updates'),
  // Shared SRD reference tables. Read-only from the app's
  // perspective (populated by seed scripts). The per-campaign
  // tables (monsters / campaign_items / spells / campaign_abilities)
  // now only hold GM homebrew — a campaign-create trigger used to
  // copy SRD rows in but it's gone.
  Dnd5eAbility:         createEntity('dnd5e_abilities'),
  Dnd5eItem:            createEntity('dnd5e_items'),
  Dnd5eMonster:         createEntity('dnd5e_monsters'),
  Dnd5eSpell:            createEntity('dnd5e_spells'),
  HomebrewRule:         createEntity('homebrew_rules'),
  HomebrewReview:       createEntity('homebrew_reviews'),
  Character:            createEntity('characters'),
  CharacterStat:        createEntity('character_stats'),
  ChatConversation:     createEntity('chat_conversations'),
  Constellation:        createEntity('constellations'),
  Deity:                createEntity('deities'),
  Faction:              createEntity('factions'),
  Friend:               createEntity('friends'),
  GuildHall:            createEntity('guild_halls'),
  GuildHallOption:      createEntity('guild_hall_options'),
  MapEntry:             createEntity('map_entries'),
  Message:              createEntity('messages'),
  Monster:              createEntity('monsters'),
  PlayerDiary:          createEntity('player_diaries'),
  Post:                 createEntity('posts'),
  Product:              createEntity('products'),
  Recipe:               createEntity('recipes'),
  Region:               createEntity('regions'),
  Sect:                 createEntity('sects'),
  SessionReminder:      createEntity('session_reminders'),
  Spell:                createEntity('spells'),
  SupportTicket:        createEntity('support_tickets'),
  TicketResponse:       createEntity('ticket_responses'),
  TradeOffer:           createEntity('trade_offers'),
  User:                 createEntity('user_profiles'),
  UserReport:           createEntity('user_reports'),
  UserProfile:          createEntity('user_profiles'),
  WorldLoreComment:     createEntity('world_lore_comments'),
  WorldLoreEntry:       createEntity('world_lore_entries'),
  WorldLoreRumor:       createEntity('world_lore_rumors'),
  WorldLoreUpdate:      createEntity('world_lore_updates'),
}

export const Query = entities
export const User = null

export default entities