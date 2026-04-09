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

    async list() {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .order('created_at', { ascending: false })
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
  Artifact:             createEntity('artifacts'),
  Campaign:             createEntity('campaigns'),
  CampaignInvitation:   createEntity('campaign_invitations'),
  CampaignItem:         createEntity('campaign_items'),
  CampaignLogEntry:     createEntity('campaign_log_entries'),
  CampaignMap:          createEntity('campaign_maps'),
  CampaignNPC:          createEntity('campaign_npcs'),
  CampaignUpdate:       createEntity('campaign_updates'),
  Character:            createEntity('characters'),
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
  User:                 createEntity('user_profiles'),
  UserProfile:          createEntity('user_profiles'),
  WorldLoreComment:     createEntity('world_lore_comments'),
  WorldLoreEntry:       createEntity('world_lore_entries'),
  WorldLoreRumor:       createEntity('world_lore_rumors'),
  WorldLoreUpdate:      createEntity('world_lore_updates'),
}

export const Query = entities
export const User = null

export default entities