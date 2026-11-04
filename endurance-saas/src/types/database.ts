/**
 * Types Supabase — écrits à la main d'après supabase/migrations/.
 * Une fois le projet créé, régénérer pour rester synchronisé :
 *   npx supabase gen types typescript --project-id <id> > src/types/database.ts
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type SportDiscipline = 'running' | 'cycling' | 'triathlon'
export type { SportKey as SportType } from '@/lib/sports'
import type { SportKey as SportType } from '@/lib/sports'
export type SubscriptionTier = 'free' | 'pro' | 'premium'
export type ActivitySource = 'manual' | 'fit' | 'gpx' | 'tcx' | 'polar' | 'demo' | 'live'
export type PlannedSource = 'manual' | 'ai' | 'demo'
export type AiUsageKind = 'coach_analysis' | 'training_plan'

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          updated_at: string
          full_name: string | null
          avatar_url: string | null
          sport_discipline: SportDiscipline
          age: number | null
          weight: number | null
          height: number | null
          hr_max: number
          hr_rest: number
          ftp: number
          vma: number
          lactate_threshold_hr: number
          stripe_customer_id: string | null
          subscription_tier: SubscriptionTier
          subscription_status: string
          notify_weekly: boolean
          notify_fatigue: boolean
          last_fatigue_alert_at: string | null
          trial_ends_at: string | null
        }
        Insert: {
          id: string
          updated_at?: string
          full_name?: string | null
          avatar_url?: string | null
          sport_discipline?: SportDiscipline
          age?: number | null
          weight?: number | null
          height?: number | null
          hr_max?: number
          hr_rest?: number
          ftp?: number
          vma?: number
          lactate_threshold_hr?: number
          stripe_customer_id?: string | null
          subscription_tier?: SubscriptionTier
          subscription_status?: string
          notify_weekly?: boolean
          notify_fatigue?: boolean
          last_fatigue_alert_at?: string | null
          trial_ends_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
        Relationships: []
      }
      daily_metrics: {
        Row: {
          id: string
          user_id: string
          date: string
          hrv: number | null
          resting_hr: number | null
          sleep_score: number | null
          perceived_fatigue: number | null
          atl: number
          ctl: number
          tsb: number
          is_demo: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          date: string
          hrv?: number | null
          resting_hr?: number | null
          sleep_score?: number | null
          perceived_fatigue?: number | null
          atl?: number
          ctl?: number
          tsb?: number
          is_demo?: boolean
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['daily_metrics']['Insert']>
        Relationships: []
      }
      activities: {
        Row: {
          id: string
          user_id: string
          title: string
          sport_type: SportType
          start_time: string
          duration_seconds: number
          distance_meters: number
          elevation_gain_meters: number
          avg_hr: number | null
          max_hr: number | null
          avg_watts: number | null
          max_watts: number | null
          tss: number
          intensity_factor: number
          fit_file_path: string | null
          raw_telemetry: Json | null
          best_efforts: Json | null
          rpe_score: number | null
          athlete_notes: string | null
          normalized_power: number | null
          source: ActivitySource
          external_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          sport_type: SportType
          start_time: string
          duration_seconds: number
          distance_meters?: number
          elevation_gain_meters?: number
          avg_hr?: number | null
          max_hr?: number | null
          avg_watts?: number | null
          max_watts?: number | null
          tss?: number
          intensity_factor?: number
          fit_file_path?: string | null
          raw_telemetry?: Json | null
          best_efforts?: Json | null
          rpe_score?: number | null
          athlete_notes?: string | null
          normalized_power?: number | null
          source?: ActivitySource
          external_id?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['activities']['Insert']>
        Relationships: []
      }
      planned_workouts: {
        Row: {
          id: string
          user_id: string
          scheduled_date: string
          title: string
          description: string | null
          sport_type: SportType
          target_duration_seconds: number | null
          target_tss: number | null
          workout_structure: Json | null
          is_completed: boolean
          activity_id: string | null
          source: PlannedSource
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          scheduled_date: string
          title: string
          description?: string | null
          sport_type: SportType
          target_duration_seconds?: number | null
          target_tss?: number | null
          workout_structure?: Json | null
          is_completed?: boolean
          activity_id?: string | null
          source?: PlannedSource
          created_by?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['planned_workouts']['Insert']>
        Relationships: []
      }
      coach_insights: {
        Row: {
          id: string
          user_id: string
          activity_id: string | null
          summary: string
          fatigue_alert: boolean
          suggested_adjustments: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          activity_id?: string | null
          summary: string
          fatigue_alert?: boolean
          suggested_adjustments?: Json | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['coach_insights']['Insert']>
        Relationships: []
      }
      polar_connections: {
        Row: {
          user_id: string
          polar_user_id: number
          access_token: string
          ai_consent_at: string
          connected_at: string
          last_sync_at: string | null
          last_sync_error: string | null
        }
        Insert: {
          user_id: string
          polar_user_id: number
          access_token: string
          ai_consent_at: string
          connected_at?: string
          last_sync_at?: string | null
          last_sync_error?: string | null
        }
        Update: Partial<Database['public']['Tables']['polar_connections']['Insert']>
        Relationships: []
      }
      coach_athletes: {
        Row: {
          id: string
          coach_id: string
          athlete_id: string | null
          invited_email: string
          invite_token_hash: string | null
          status: 'pending' | 'active' | 'revoked'
          created_at: string
          expires_at: string
          accepted_at: string | null
        }
        Insert: {
          id?: string
          coach_id: string
          athlete_id?: string | null
          invited_email: string
          invite_token_hash?: string | null
          status?: 'pending' | 'active' | 'revoked'
          created_at?: string
          expires_at?: string
          accepted_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['coach_athletes']['Insert']>
        Relationships: []
      }
      ai_usage: {
        Row: { id: string; user_id: string; kind: AiUsageKind; created_at: string }
        Insert: { id?: string; user_id: string; kind: AiUsageKind; created_at?: string }
        Update: Partial<Database['public']['Tables']['ai_usage']['Insert']>
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: {
      is_coach_of: { Args: { athlete: string }; Returns: boolean }
      expire_premium_trials: { Args: Record<string, never>; Returns: number }
      coached_athletes: {
        Args: Record<string, never>
        Returns: {
          relation_id: string
          athlete_id: string
          full_name: string | null
          sport_discipline: string
          ftp: number
          hr_max: number
          hr_rest: number
          lactate_threshold_hr: number
          vma: number
          accepted_at: string
        }[]
      }
      my_coaches: {
        Args: Record<string, never>
        Returns: { relation_id: string; coach_id: string; full_name: string | null; accepted_at: string }[]
      }
    }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']
