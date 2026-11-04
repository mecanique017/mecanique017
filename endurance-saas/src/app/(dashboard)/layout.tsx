import Link from 'next/link'
import { Activity, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { signOut } from './dashboard/actions'

const NAV = [
  { href: '/dashboard', label: 'Tableau de bord' },
  { href: '/dashboard/calendar', label: 'Calendrier' },
  { href: '/dashboard/activities/new', label: 'Nouvelle séance' },
  { href: '/dashboard/activities/import', label: 'Importer' },
  { href: '/dashboard/wellness', label: 'Bien-être' },
  { href: '/dashboard/profile', label: 'Profil' },
  { href: '/pricing', label: 'Offres' },
]

export default function DashboardLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-screen">
      <header className="border-b">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <Link href="/dashboard" className="flex items-center gap-2 font-bold">
            <Activity className="size-5 text-emerald-500" aria-hidden />
            Endurance SaaS
          </Link>
          <nav className="order-last w-full sm:order-none sm:w-auto -mx-2 flex gap-1 overflow-x-auto text-sm">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="whitespace-nowrap rounded-md px-2 py-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <form action={signOut} className="ml-auto">
            <Button variant="ghost" size="sm" type="submit">
              <LogOut className="h-4 w-4" /> Déconnexion
            </Button>
          </form>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-6 md:py-8">{children}</main>
    </div>
  )
}
