/**
 * Règles d'alerte fatigue (fonction pure, testable). Seuils volontairement prudents
 * pour éviter les fausses alertes : une alerte doit rester rare pour être lue.
 */
export interface FatigueInput {
  tsb: number
  hrv: number | null
  hrvBaseline: number | null
  perceivedFatigue: number | null
}

export function fatigueReasons({ tsb, hrv, hrvBaseline, perceivedFatigue }: FatigueInput): string[] {
  const reasons: string[] = []
  if (tsb < -30) reasons.push(`Fraîcheur (TSB) très basse : ${Math.round(tsb)} (seuil d’alerte : −30)`)
  if (hrv != null && hrvBaseline != null && hrv < hrvBaseline * 0.85) {
    reasons.push(`VFC du jour ${hrv} ms, ${Math.round((1 - hrv / hrvBaseline) * 100)} % sous votre référence de ${hrvBaseline} ms`)
  }
  if (perceivedFatigue != null && perceivedFatigue >= 8) reasons.push(`Fatigue ressentie : ${perceivedFatigue}/10`)
  // Une seule raison « faible » ne suffit pas : TSB très bas seul, ou au moins deux signaux
  const strong = tsb < -40
  return strong || reasons.length >= 2 ? reasons : []
}
