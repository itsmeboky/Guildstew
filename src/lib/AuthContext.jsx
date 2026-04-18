import React, { createContext, useState, useContext, useEffect } from 'react'
import { supabase } from '@/api/supabaseClient'
import { useQueryClient } from '@tanstack/react-query'

const AuthContext = createContext()

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [profileFetched, setProfileFetched] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoadingAuth, setIsLoadingAuth] = useState(true)
  const [authError, setAuthError] = useState(null)
  const queryClient = useQueryClient()

  useEffect(() => {
    checkAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setUser(session.user)
          setIsAuthenticated(true)
          setProfileFetched(false)
          fetchProfile(session.user.id).catch(() => {})
        } else {
          setUser(null)
          setProfile(null)
          setProfileFetched(false)
          setIsAuthenticated(false)
        }
        setIsLoadingAuth(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const checkAuth = async () => {
    try {
      console.log('AUTH: checking session...')
      const { data: { session } } = await supabase.auth.getSession()
      console.log('AUTH: session result:', session ? 'found' : 'none')

      if (session?.user) {
        console.log('AUTH: user found:', session.user.id)
        setUser(session.user)
        setIsAuthenticated(true)
        fetchProfile(session.user.id).catch(err => {
          console.error('AUTH: profile fetch failed:', err)
        })
      }
    } catch (error) {
      console.error('AUTH: error:', error)
      setAuthError({ type: 'unknown', message: error.message })
    }
    setIsLoadingAuth(false)
  }

  const fetchProfile = async (userId) => {
    console.log('AUTH: fetching profile for', userId)
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (data) {
      console.log('AUTH: profile loaded:', data.username || '(no username yet)')
      setProfile(data)
    } else if (error?.code === 'PGRST116') {
      // PGRST116 = "no rows found". Brand new user who hasn't
      // created their profile row yet — let the Layout's
      // onboarding gate take them to the first-run wizard.
      console.log('AUTH: no profile yet — new user')
    } else if (error) {
      console.error('Profile fetch error:', error)
    }
    // Either way, we're done trying so the UI can stop waiting.
    setProfileFetched(true)
  }

  const logout = async (shouldRedirect = true) => {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    setIsAuthenticated(false)
    queryClient.clear()
    if (shouldRedirect) window.location.href = '/'
  }

  const navigateToLogin = () => {
    window.location.href = '/login'
  }

  const mergedUser = user ? {
    ...profile,
    id: user.id,
    email: user.email,
    profile_id: profile?.id,
    // `profile_fetched` flips true once fetchProfile resolves —
    // success OR PGRST116 "no rows" for a brand new user. Consumers
    // (Layout's onboarding gate, etc.) use it to tell "still
    // loading" apart from "no profile row exists yet".
    profile_fetched: profileFetched,
  } : null

  useEffect(() => {
    if (mergedUser) {
      queryClient.setQueryData(['currentUser'], mergedUser)
    }
  }, [mergedUser, queryClient])

  return (
    <AuthContext.Provider value={{
      user: mergedUser,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings: false,
      authError,
      appPublicSettings: null,
      logout,
      navigateToLogin,
      checkAppState: checkAuth
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}