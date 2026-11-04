import { Suspense } from 'react'
import type { Metadata } from 'next'
import { LoginForm } from './login-form'

export const metadata: Metadata = { title: 'Connexion — Endurance SaaS' }

export default function LoginPage() {
  // useSearchParams() (message d'erreur du callback) impose une frontière Suspense.
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
