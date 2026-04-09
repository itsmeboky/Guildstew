import { supabase } from './supabaseClient'
import { entities } from './entities'

export const base44 = {
  entities,

  auth: {
async updateMe(updates) {
      const { data: { user }, error } = await supabase.auth.getUser()
      if (error || !user) throw new Error('Not authenticated')

      const { data, error: updateError } = await supabase
        .from('user_profiles')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .select()
        .single()
      
      if (updateError) throw updateError
      return data
    },

    logout(redirectUrl) {
      supabase.auth.signOut()
      if (redirectUrl) window.location.href = redirectUrl
    },

    redirectToLogin(redirectUrl) {
      localStorage.setItem('post_login_redirect', redirectUrl)
      window.location.href = '/login'
    }
  },

functions: {
    async invoke(functionName, payload) {
      try {
        const { data, error } = await supabase.functions.invoke(functionName, {
          body: payload
        })
        if (error) {
          console.warn(`Edge Function "${functionName}" not available yet:`, error.message)
          return null
        }
        return data
      } catch (err) {
        console.warn(`Edge Function "${functionName}" not available yet:`, err.message)
        return null
      }
    }
  },

  integrations: {
    Core: {
      async InvokeLLM(params) {
        const { data, error } = await supabase.functions.invoke('invoke-llm', { body: params })
        if (error) throw error
        return data
      },
      async GenerateImage(params) {
        const { data, error } = await supabase.functions.invoke('generate-image', { body: params })
        if (error) throw error
        return data
      },
      async SendEmail(params) {
        const { data, error } = await supabase.functions.invoke('send-email', { body: params })
        if (error) throw error
        return data
      },
      async SendSMS() { console.warn('SMS not implemented yet') },
async UploadFile({ file, bucket = 'campaign-assets', path = '' }) {
        const actualFile = file instanceof File ? file : file;
        const filePath = path 
          ? `${path}/${Date.now()}_${actualFile.name}`
          : `${Date.now()}_${actualFile.name}`;
        
        const { error } = await supabase.storage
          .from(bucket)
          .upload(filePath, actualFile);
        if (error) throw error;
        
        const { data } = supabase.storage
          .from(bucket)
          .getPublicUrl(filePath);
        
        return { file_url: data.publicUrl, url: data.publicUrl };
      },
      async ExtractDataFromUploadedFile() { console.warn('Not implemented yet') }
    }
  }
}