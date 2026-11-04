import { createContext, useContext, useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from './supabase'

interface Session {
  user: User | null
  loading: boolean
}

const SessionContext = createContext<Session>({ user: null, loading: true })

/** Session Supabase (stockée dans le navigateur, renouvelée automatiquement). */
export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<Session>({ user: null, loading: true })
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setState({ user: data.session?.user ?? null, loading: false }))
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setState({ user: session?.user ?? null, loading: false }))
    return () => data.subscription.unsubscribe()
  }, [])
  return <SessionContext.Provider value={state}>{children}</SessionContext.Provider>
}

export const useSession = () => useContext(SessionContext)

/** L'utilisateur connecté (les pages protégées ne s'affichent qu'une fois la session connue). */
export function useUser(): User {
  const { user } = useSession()
  if (!user) throw new Error('Session absente')
  return user
}

/** Chargement de données avec rechargement à la demande. */
export function useData<T>(load: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [version, setVersion] = useState(0)
  useEffect(() => {
    let alive = true
    load()
      .then((d) => alive && (setData(d), setError(null)))
      .catch((e) => alive && setError(e instanceof Error ? e.message : 'Erreur de chargement'))
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, version])
  return { data, error, reload: () => setVersion((v) => v + 1) }
}
