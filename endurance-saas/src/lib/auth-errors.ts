import { isAuthRetryableFetchError, type AuthError } from '@supabase/supabase-js'

/** Traduit les erreurs Supabase Auth en messages français compréhensibles. */
export function authErrorMessage(error: AuthError, fallback: string): string {
  if (isAuthRetryableFetchError(error)) {
    return 'Service indisponible. Vérifiez votre connexion et réessayez.'
  }
  switch (error.code) {
    case 'invalid_credentials':
      return 'Email ou mot de passe incorrect.'
    case 'email_not_confirmed':
      return 'Compte non confirmé : cliquez sur le lien reçu par email.'
    case 'user_already_exists':
    case 'email_exists':
      return 'Un compte existe déjà avec cette adresse email.'
    case 'weak_password':
      return 'Mot de passe trop faible (6 caractères minimum).'
    case 'over_request_rate_limit':
    case 'over_email_send_rate_limit':
      return 'Trop de tentatives. Patientez quelques minutes.'
    default:
      return fallback
  }
}
