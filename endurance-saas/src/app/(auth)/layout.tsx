import { Activity } from 'lucide-react'
import { CurrentYear } from '@/components/current-year'

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
      {/* Branding / côté gauche */}
      <div className="hidden lg:flex flex-col justify-between bg-zinc-900 p-12 text-white border-r border-zinc-800">
        <div className="flex items-center gap-2 text-xl font-bold">
          <Activity className="h-6 w-6 text-emerald-500" />
          <span>Endurance SaaS</span>
        </div>
        <div className="space-y-4">
          <h1 className="text-3xl font-extrabold tracking-tight">
            Optimisez vos entraînements avec la puissance de l&apos;IA.
          </h1>
          <p className="text-zinc-400">
            Suivi physiologique (ATL, CTL, TSB), gestion intelligente des charges d&apos;effort et
            débriefings de séances automatisés.
          </p>
        </div>
        <div className="text-xs text-zinc-500">
          © <CurrentYear /> Endurance SaaS. Tous droits réservés.
        </div>
      </div>

      {/* Formulaires / côté droit */}
      <div className="flex items-center justify-center p-6 sm:p-12 bg-background">
        <div className="w-full max-w-md space-y-6">
          <div className="lg:hidden flex items-center justify-center gap-2 mb-6 text-xl font-bold">
            <Activity className="h-6 w-6 text-emerald-500" />
            <span>Endurance SaaS</span>
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}
