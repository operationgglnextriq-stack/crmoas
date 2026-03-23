import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const admin = await createAdminClient()
  const { data: me } = await admin.from('team_members').select('rol').eq('email', user.email).single()
  if (!me || !['founder','sales_manager'].includes(me.rol)) {
    return NextResponse.json({ error: 'Geen toegang' }, { status: 403 })
  }

  const { email, naam, rol, afdeling, commissie_pct, discord_naam } = await request.json()
  if (!email || !naam || !rol) return NextResponse.json({ error: 'Verplichte velden ontbreken' }, { status: 400 })

  // Maak team_member record aan (als nog niet bestaat)
  const { error: dbError } = await admin.from('team_members').upsert({
    naam, email, rol, afdeling: afdeling ?? null,
    commissie_pct: commissie_pct ?? 0, discord_naam: discord_naam ?? null, actief: true,
  }, { onConflict: 'email' })

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 400 })

  // Stuur Supabase uitnodigingsmail
  const redirectUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://crmoas.vercel.app'}/login`
  const { data: inviteData, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: redirectUrl,
    data: { naam, rol }
  })

  if (inviteError) return NextResponse.json({ error: inviteError.message }, { status: 400 })

  return NextResponse.json({ success: true, userId: inviteData.user?.id })
}
