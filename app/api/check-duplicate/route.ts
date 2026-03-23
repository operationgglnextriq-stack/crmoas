import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const naam = request.nextUrl.searchParams.get('naam')
  if (!naam || naam.length < 2) {
    return NextResponse.json({ duplicaat: false })
  }

  const supabase = await createClient()

  const [{ data: leads }, { data: outreach }] = await Promise.all([
    supabase
      .from('leads')
      .select('bedrijfsnaam,setter_naam,created_at,afdeling')
      .ilike('bedrijfsnaam', `%${naam}%`)
      .limit(1),
    supabase
      .from('outreach_leads')
      .select('bedrijfsnaam,outreacher_naam,created_at')
      .ilike('bedrijfsnaam', `%${naam}%`)
      .limit(1),
  ])

  if (leads && leads.length > 0) {
    return NextResponse.json({
      duplicaat: true,
      bron: 'leads',
      ingevoerd_door: leads[0].setter_naam,
      afdeling: leads[0].afdeling ?? 'sales',
      datum: leads[0].created_at,
    })
  }

  if (outreach && outreach.length > 0) {
    return NextResponse.json({
      duplicaat: true,
      bron: 'outreach',
      ingevoerd_door: outreach[0].outreacher_naam,
      afdeling: 'outreach',
      datum: outreach[0].created_at,
    })
  }

  return NextResponse.json({ duplicaat: false })
}
