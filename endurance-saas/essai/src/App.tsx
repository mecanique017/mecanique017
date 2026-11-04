import { HashRouter, Navigate, NavLink, Route, Routes } from 'react-router-dom'
import { Activity, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { supabase } from './supabase'
import { SessionProvider, useSession } from './session'
import { LoginPage } from './pages/Login'
import { DashboardPage } from './pages/Dashboard'
import { ActivityPage } from './pages/Activity'
import { NewActivityPage } from './pages/NewActivity'
import { ImportPage } from './pages/Import'
import { CalendarPage } from './pages/Calendar'
import { WellnessPage } from './pages/Wellness'
import { ProfilePage } from './pages/Profile'

const NAV = [
  { to: '/dashboard', label: 'Tableau de bord', end: true },
  { to: '/dashboard/calendar', label: 'Calendrier' },
  { to: '/dashboard/activities/import', label: 'Importer' },
  { to: '/dashboard/wellness', label: 'Bien-être' },
  { to: '/dashboard/profile', label: 'Profil' },
]

export function App() {
  return (
    <SessionProvider>
      <HashRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/dashboard/*" element={<Protected />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </HashRouter>
    </SessionProvider>
  )
}

function Protected() {
  const { user, loading } = useSession()
  if (loading) return <div className="p-6 text-sm text-muted-foreground">Chargement…</div>
  if (!user) return <Navigate to="/login" replace />
  return (
    <div className="min-h-screen">
      <header className="border-b">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <NavLink to="/dashboard" className="flex items-center gap-2 font-bold">
            <Activity className="size-5 text-emerald-500" aria-hidden />
            Endurance
            <span className="rounded bg-accent px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">ESSAI</span>
          </NavLink>
          <nav className="order-last w-full sm:order-none sm:w-auto -mx-2 flex gap-1 overflow-x-auto text-sm">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn('whitespace-nowrap rounded-md px-2 py-1.5 hover:bg-accent hover:text-foreground', isActive ? 'text-foreground bg-accent' : 'text-muted-foreground')
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <Button variant="ghost" size="sm" className="ml-auto" onClick={() => supabase.auth.signOut()}>
            <LogOut className="h-4 w-4" /> Déconnexion
          </Button>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-6 md:py-8">
        <Routes>
          <Route index element={<DashboardPage />} />
          <Route path="activities/new" element={<NewActivityPage />} />
          <Route path="activities/import" element={<ImportPage />} />
          <Route path="activities/:id" element={<ActivityPage />} />
          <Route path="calendar" element={<CalendarPage />} />
          <Route path="wellness" element={<WellnessPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>
    </div>
  )
}
