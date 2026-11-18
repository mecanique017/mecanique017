/**
 * Conseils automatiques (règles simples, sans IA, disponibles hors ligne).
 * Le coach IA va plus loin (analyse de la semaine, idées de repas) quand il est activé.
 */
import type { Diet, NutritionGoal } from '@/types/database'
import type { Macros, Targets } from './calculator'

export interface Tip {
  level: 'good' | 'info' | 'warn'
  title: string
  text: string
}

export interface AdviceInput {
  goal: NutritionGoal
  diet: Diet
  weightKg: number
  targets: Targets
  today: Macros & { fiber: number }
  /** nombre d'aliments notés aujourd'hui */
  entries: number
  /** heure locale (0-23) */
  hour: number
  /** séances du jour : durée (min) et famille de sport */
  sessions: { minutes: number; family: string }[]
  /** moyennes des 7 derniers jours notés (null si moins de 3 jours notés) */
  week: (Macros & { days: number }) | null
  /** tendance du poids (kg/semaine), null si pas assez de pesées */
  trend: number | null
  rateKgWeek: number
}

const fmt = (n: number) => Math.round(n).toLocaleString('fr-FR')

export function autoAdvice(i: AdviceInput): Tip[] {
  const tips: Tip[] = []
  const t = i.targets
  const left = t.kcal - i.today.kcal
  const trainingMin = i.sessions.reduce((a, s) => a + s.minutes, 0)
  const endurance = i.sessions.some((s) => s.family !== 'other') && trainingMin >= 60

  for (const w of t.warnings) tips.push({ level: 'warn', title: 'Sécurité', text: w })

  if (!i.entries) {
    tips.push({
      level: 'info',
      title: 'Commencez votre journée',
      text: `Objectif du jour : ${fmt(t.kcal)} kcal dont ${t.protein} g de protéines. Notez vos repas au fur et à mesure : c'est plus juste que de tout saisir le soir.`,
    })
  } else {
    // Énergie
    if (left < -150)
      tips.push({
        level: i.goal === 'gain' || i.goal === 'muscle' ? 'info' : 'warn',
        title: 'Objectif calorique dépassé',
        text: `${fmt(-left)} kcal au-dessus de l'objectif. Pas de panique : c'est la moyenne de la semaine qui compte. Demain, misez sur les légumes et les protéines maigres.`,
      })
    else if (i.hour >= 19 && left > 500 && (i.goal === 'muscle' || i.goal === 'gain' || i.goal === 'performance' || endurance))
      tips.push({
        level: 'warn',
        title: 'Il vous manque de l’énergie',
        text: `Encore ${fmt(left)} kcal à prendre. Un repas complet ou une collation dense (fromage blanc + flocons d'avoine + fruit, ou tartines + beurre de cacahuète) vous aidera à récupérer.`,
      })
    else if (i.hour >= 20 && left > 700 && i.goal === 'lose')
      tips.push({
        level: 'info',
        title: 'Déficit trop important aujourd’hui',
        text: `Il reste ${fmt(left)} kcal. Un déficit trop fort fait perdre du muscle et donne faim le lendemain : un vrai dîner reste conseillé.`,
      })

    // Protéines (réparties sur la journée)
    const protShare = i.today.protein / Math.max(1, t.protein)
    const expected = i.hour < 11 ? 0.2 : i.hour < 15 ? 0.5 : i.hour < 20 ? 0.75 : 0.95
    if (protShare < expected - 0.2) {
      const src =
        i.diet === 'vegan'
          ? 'tofu, tempeh, lentilles, pois chiches, boisson soja'
          : i.diet === 'vegetarian'
            ? 'œufs, skyr, fromage blanc, lentilles, tofu'
            : i.diet === 'pescatarian'
              ? 'poisson, œufs, skyr, fromage blanc, légumineuses'
              : 'poulet, poisson, œufs, skyr, fromage blanc, légumineuses'
      tips.push({
        level: 'info',
        title: 'Pensez aux protéines',
        text: `${Math.round(i.today.protein)} g sur ${t.protein} g. Ajoutez une source à chaque repas (${src}) : 25 à 40 g par repas aident à garder et construire le muscle.`,
      })
    } else if (protShare >= 0.9) tips.push({ level: 'good', title: 'Protéines au rendez-vous', text: `${Math.round(i.today.protein)} g sur ${t.protein} g : parfait pour le muscle et la satiété.` })

    // Fibres
    if (i.hour >= 18 && i.today.fiber < t.fiber * 0.5)
      tips.push({ level: 'info', title: 'Peu de fibres', text: `${Math.round(i.today.fiber)} g sur ${t.fiber} g conseillés. Légumes, fruits, légumineuses et céréales complètes : meilleure satiété et meilleure digestion.` })
  }

  // Sport
  if (endurance) {
    const choGkg = t.carbs / i.weightKg
    tips.push({
      level: 'info',
      title: 'Jour d’entraînement',
      text: `${trainingMin} min de sport aujourd'hui : objectif relevé de ${fmt(t.exercise)} kcal (${choGkg.toFixed(1).replace('.', ',')} g de glucides par kg). Dans l'heure qui suit la séance : glucides + 20 à 30 g de protéines, et buvez environ ${t.waterL.toString().replace('.', ',')} L sur la journée.`,
    })
    if (trainingMin >= 90) tips.push({ level: 'info', title: 'Sortie longue', text: 'Au-delà de 1 h 30 d’effort, prévoyez 30 à 60 g de glucides par heure (boisson d’effort, gel, banane, pâte de fruits) pour éviter la fringale.' })
  }

  // Tendance de la semaine et du poids
  if (i.week && i.week.days >= 3) {
    const diff = i.week.kcal - t.kcal
    if (Math.abs(diff) > 250)
      tips.push({
        level: 'info',
        title: 'Moyenne de la semaine',
        text: `${fmt(i.week.kcal)} kcal par jour en moyenne (objectif ${fmt(t.kcal)}). ${diff > 0 ? 'Un peu au-dessus' : 'Un peu en dessous'} : visez la régularité plutôt que la perfection.`,
      })
  }
  if (i.trend != null) {
    const r = i.rateKgWeek
    const trendTxt = `${i.trend > 0 ? '+' : ''}${i.trend.toFixed(2).replace('.', ',')} kg/semaine`
    if (i.goal === 'lose' && i.trend > -0.1)
      tips.push({ level: 'warn', title: 'Le poids ne baisse pas', text: `Tendance : ${trendTxt}. Si cela dure deux semaines, retirez 100 à 150 kcal par jour ou ajoutez de la marche, et vérifiez que tout est bien noté (huiles, boissons, grignotages).` })
    else if (i.goal === 'lose' && i.trend < -1.5 * r - 0.2)
      tips.push({ level: 'warn', title: 'Perte trop rapide', text: `Tendance : ${trendTxt}, plus vite que prévu. Ajoutez 150 à 200 kcal par jour pour préserver le muscle et l'énergie.` })
    else if ((i.goal === 'gain' || i.goal === 'muscle') && i.trend < 0.05)
      tips.push({ level: 'warn', title: 'Le poids ne monte pas', text: `Tendance : ${trendTxt}. Ajoutez 150 à 200 kcal par jour (une collation, une cuillère d'huile, une poignée d'oléagineux).` })
    else if (i.goal === 'muscle' && i.trend > 0.5)
      tips.push({ level: 'info', title: 'Prise un peu rapide', text: `Tendance : ${trendTxt}. Au-delà de 0,25 à 0,5 kg/semaine, on stocke surtout du gras : réduisez légèrement l'apport.` })
    else tips.push({ level: 'good', title: 'Sur la bonne trajectoire', text: `Tendance du poids : ${trendTxt}. Continuez comme ça !` })
  }

  return tips
}
