import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const table = request.nextUrl.searchParams.get('table')
  if (!table) return NextResponse.json({ error: 'Geen tabel' }, { status: 400 })

  const allowed = ['leads', 'deals', 'outreach_leads', 'team_members', 'dagrapporten', 'marktdata']
  if (!allowed.includes(table)) return NextResponse.json({ error: 'Niet toegestaan' }, { status: 403 })

  const admin = await createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin.from(table as any).select('*') as any)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data ?? [])
}
