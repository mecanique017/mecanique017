import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

/**
 * Projet Supabase « endurance-saas ». La clé anon est PUBLIQUE par conception (elle est visible
 * dans tout navigateur) : la protection des données repose sur la RLS de la base.
 */
export const SUPABASE_URL = 'https://hzuuuqumapzkfqdddbyw.supabase.co'
export const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh6dXV1cXVtYXB6a2ZxZGRkYnl3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM4MDQ3NjgsImV4cCI6MjEwOTM4MDc2OH0.nWGK-nT6-zzVxzHFe8euVnukrjU_A5Lc2GdxANSPJw0'

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, storageKey: 'endurance-essai-auth' },
})
