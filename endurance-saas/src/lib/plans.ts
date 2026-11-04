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
  features: string[]
}

export const PLANS: Plan[] = [
  {
    tier: 'free',
    name: 'Gratuit',
    tagline: 'Pour suivre sa charge d’entraînement',
    monthlyCoachAnalyses: 3,
    features: [
      'Saisie illimitée des séances',
      'Calcul automatique du TSS',
      'Courbes de forme CTL / ATL / TSB',
      '3 analyses du coach IA par mois',
    ],
  },
  {
    tier: 'pro',
    name: 'Pro',
    tagline: 'Pour progresser avec un retour après chaque séance',
    monthlyCoachAnalyses: 30,
    features: ['Tout le plan Gratuit', '30 analyses du coach IA par mois', 'Alertes de fatigue'],
  },
  {
    tier: 'premium',
    name: 'Premium',
    tagline: 'Pour les athlètes qui s’entraînent tous les jours',
    monthlyCoachAnalyses: null,
    features: ['Tout le plan Pro', 'Analyses du coach IA illimitées'],
  },
]

export function getPlan(tier: SubscriptionTier): Plan {
  return PLANS.find((p) => p.tier === tier) ?? PLANS[0]
}
