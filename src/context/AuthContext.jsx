/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from 'react'
import { requireSupabase, supabase } from '../services/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(Boolean(supabase))

  useEffect(() => {
    if (!supabase) return undefined
    let active = true
    const loadProfile = async (nextSession) => {
      setSession(nextSession)
      if (!nextSession) {
        setProfile(null)
        setLoading(false)
        return
      }
      const { data, error } = await supabase.from('profiles').select('*').eq('id', nextSession.user.id).maybeSingle()
      if (!active) return
      setProfile(error ? null : data)
      setLoading(false)
    }
    supabase.auth.getSession().then(({ data }) => loadProfile(data.session))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      if (!nextSession) setProfile(null)
      else window.setTimeout(() => loadProfile(nextSession), 0)
    })
    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [])

  const value = {
    session, profile, loading,
    async signIn(email, password) {
      const { data, error } = await requireSupabase().auth.signInWithPassword({ email, password })
      if (error) throw error
      const { data: userProfile } = await requireSupabase().from('profiles').select('*').eq('id', data.user.id).single()
      setProfile(userProfile)
      return userProfile
    },
    async signUp({ email, password, ...details }) {
      const { data, error } = await requireSupabase().auth.signUp({
        email,
        password,
        options: { data: details },
      })
      if (error) throw error
      return data
    },
    async signOut() {
      const { error } = await requireSupabase().auth.signOut()
      if (error) throw error
      setProfile(null)
    },
    async updateProfile(updates) {
      const { data, error } = await requireSupabase().from('profiles').update(updates).eq('id', session.user.id).select().single()
      if (error) throw error
      setProfile(data)
      return data
    },
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used within AuthProvider')
  return value
}
