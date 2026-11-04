import { createElement } from 'react'
import { renderToBuffer } from '@react-pdf/renderer'
import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getCoachedAthletes } from '@/lib/coach'
import { getMonthlyReport } from '@/lib/reports/monthly'
import { MonthlyReportPdf } from '@/lib/reports/monthly-pdf'

export const maxDuration = 60

/**
 * GET /api/reports/monthly?month=YYYY-MM[&athlete=<id>] → PDF.
 * Sans « athlete » : bilan de l'utilisateur. Avec : seulement pour un athlète suivi (relation active).
 */
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const month = req.nextUrl.searchParams.get('month') ?? ''
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return NextResponse.json({ error: 'Mois invalide (AAAA-MM)' }, { status: 400 })

  const athleteParam = req.nextUrl.searchParams.get('athlete')
  let userId = user.id
  let name: string
  if (athleteParam && athleteParam !== user.id) {
    if (!z.uuid().safeParse(athleteParam).success) return NextResponse.json({ error: 'Athlète invalide' }, { status: 400 })
    const athlete = (await getCoachedAthletes(supabase)).find((a) => a.athlete_id === athleteParam)
    if (!athlete) return NextResponse.json({ error: 'Athlète introuvable' }, { status: 404 })
    userId = athlete.athlete_id
    name = athlete.full_name ?? 'Athlète'
  } else {
    const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()
    name = profile?.full_name ?? user.email ?? 'Athlète'
  }

  const report = await getMonthlyReport(supabase, userId, month, name)
  const pdf = await renderToBuffer(createElement(MonthlyReportPdf, { r: report }) as Parameters<typeof renderToBuffer>[0])
  const filename = `bilan-${month}-${name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w]+/g, '-').replace(/^-|-$/g, '').toLowerCase()}.pdf`

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'private, no-store',
    },
  })
}
