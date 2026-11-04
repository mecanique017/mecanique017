import { z } from 'zod'

/** Champ numérique de formulaire : '' → undefined, sinon nombre. */
export const optionalNumber = (schema: z.ZodNumber) =>
  z.preprocess((v) => (v === '' || v == null ? undefined : Number(v)), schema.optional())

export const requiredNumber = (schema: z.ZodNumber) =>
  z.preprocess((v) => (v === '' || v == null ? undefined : Number(v)), schema)

/** Texte optionnel : '' → null. */
export const optionalText = (max: number) =>
  z.preprocess((v) => (typeof v === 'string' && v.trim() !== '' ? v.trim() : null), z.string().max(max).nullable())

/** Premier message d'erreur par champ, pour l'affichage sous chaque input. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? 'form')
    out[key] ??= issue.message
  }
  return out
}

export interface FormState {
  ok?: boolean
  message?: string
  errors?: Record<string, string>
}
