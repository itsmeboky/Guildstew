import React, { createContext, useState, useContext, useEffect } from 'react'
import { supabase } from '@/api/supabaseClient'

const AuthContext = createContext()

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoadingAuth, setIsLoadingAuth] = useState(true)
  const [authError, setAuthError] = useState(null)

  useEffect(() => {
    checkAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setUser(session.user)
          setIsAuthenticated(true)
          fetchProfile(session.user.id).catch(() => {})
        } else {
          setUser(null)
          setProfile(null)
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

    console.log('AUTH: profile result:', data, error)

    if (data) {
      setProfile(data)
    } else if (error && error.code !== 'PGRST116') {
      console.error('Profile fetch error:', error)
    }
  }

  const logout = async (shouldRedirect = true) => {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    setIsAuthenticated(false)
    if (shouldRedirect) window.location.href = '/'
  }

  const navigateToLogin = () => {
    window.location.href = '/login'
  }

  const mergedUser = user ? {
    id: user.id,
    email: user.email,
    ...(profile || {})
  } : null

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