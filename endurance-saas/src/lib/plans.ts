import type { SubscriptionTier } from '@/types/database'

/**
 * Offres et quotas — SOURCE UNIQUE utilisée par la page Tarifs et par l'API coach.
 * Les prix ne sont PAS écrits ici : ils sont lus dans Stripe (voir lib/stripe-prices.ts).
 * Quotas à ajuster selon votre modèle économique.
 */
export interface Plan {
  tier: SubscriptionTier
  name: string
  tagline: string
  /** Analyses du coach IA par mois calendaire (null = illimité) */
  monthlyCoachAnalyses: number | null
  /** Plans d'entraînement générés par mois (null = illimité) */
  monthlyTrainingPlans: number | null
  /** Athlètes suivis dans l'espace coach (0 = pas d'espace coach) */
  maxCoachedAthletes: number
  features: string[]
}

export const PLANS: Plan[] = [
  {
    tier: 'free',
    name: 'Gratuit',
    tagline: 'Pour suivre sa charge d’entraînement',
    monthlyCoachAnalyses: 3,
    monthlyTrainingPlans: 1,
    maxCoachedAthletes: 0,
    features: [
      'Saisie illimitée des séances',
      'Calcul automatique du TSS',
      'Courbes de forme CTL / ATL / TSB',
      '3 analyses du coach IA par mois',
      '1 plan d’entraînement IA par mois',
    ],
  },
  {
    tier: 'pro',
    name: 'Pro',
    tagline: 'Pour progresser avec un retour après chaque séance',
    monthlyCoachAnalyses: 30,
    monthlyTrainingPlans: 4,
    maxCoachedAthletes: 0,
    features: ['Tout le plan Gratuit', '30 analyses du coach IA par mois', '4 plans d’entraînement IA par mois', 'Alertes de fatigue'],
  },
  {
    tier: 'premium',
    name: 'Premium',
    tagline: 'Pour les athlètes qui s’entraînent tous les jours',
    monthlyCoachAnalyses: null,
    monthlyTrainingPlans: null,
    maxCoachedAthletes: 20,
    features: ['Tout le plan Pro', 'Analyses et plans d’entraînement IA illimités', 'Espace coach : suivez jusqu’à 20 athlètes'],
  },
]

export function getPlan(tier: SubscriptionTier): Plan {
  return PLANS.find((p) => p.tier === tier) ?? PLANS[0]
}
