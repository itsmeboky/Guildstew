import { supabase } from './supabaseClient'
import { entities } from './entities'

export const base44 = {
  entities,

  auth: {
    async me() {
      const { data: { user }, error } = await supabase.auth.getUser()
      if (error || !user) throw new Error('Not authenticated')

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single()

      return {
        id: user.id,
        email: user.email,
        ...profile
      }
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
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: payload
      })
      if (error) throw error
      return data
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
      async UploadFile(file) {
        const fileName = `${Date.now()}_${file.name}`
        const { error } = await supabase.storage.from('uploads').upload(fileName, file)
        if (error) throw error
        const { data: { publicUrl } } = supabase.storage.from('uploads').getPublicUrl(fileName)
        return { url: publicUrl }
      },
      async ExtractDataFromUploadedFile() { console.warn('Not implemented yet') }
    }
  }
}