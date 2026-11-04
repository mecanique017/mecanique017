import type { Metadata } from 'next'
import { RegisterForm } from './register-form'

export const metadata: Metadata = { title: 'Inscription — Endurance SaaS' }

export default function RegisterPage() {
  return <RegisterForm />
}
