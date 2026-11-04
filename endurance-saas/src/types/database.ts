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
export type SportType = 'run' | 'ride' | 'swim'
export type SubscriptionTier = 'free' | 'pro' | 'premium'

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
          rpe_score: number | null
          athlete_notes: string | null
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
          rpe_score?: number | null
          athlete_notes?: string | null
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
    }
    Views: { [_ in never]: never }
    Functions: { [_ in never]: never }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']
