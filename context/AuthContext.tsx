'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { TeamMember } from '@/types'

interface AuthContextType {
  user: User | null
  teamMember: TeamMember | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  teamMember: null,
  loading: true,
  signOut: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [teamMember, setTeamMember] = useState<TeamMember | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchTeamMember = async () => {
    try {
      // Haal token op en stuur mee als Authorization header
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      const res = await fetch('/api/me', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      })
      if (res.ok) {
        const data = await res.json()
        setTeamMember(data)
      } else {
        setTeamMember(null)
      }
    } catch (e) {
      console.error('fetchTeamMember error:', e)
      setTeamMember(null)
    }
  }

  useEffect(() => {
    let mounted = true

    const init = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!mounted) return
        setUser(user)
        if (user) {
          // Zet loading false DIRECT na user check, niet wachten op teamMember
          setLoading(false)
          await fetchTeamMember()
        } else {
          setLoading(false)
        }
      } catch (e) {
        console.error('Auth init error:', e)
        if (mounted) setLoading(false)
      }
    }

    init()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchTeamMember() // niet awaiten — loading al false
      } else {
        setTeamMember(null)
      }
    })

    return () => { mounted = false; subscription.unsubscribe() }
  }, [])

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setTeamMember(null)
  }

  return (
    <AuthContext.Provider value={{ user, teamMember, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
