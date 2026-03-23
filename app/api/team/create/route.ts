import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { email, password, naam, rol, afdeling, commissie_pct, discord_naam } = body

  if (!email || !password || !naam || !rol) {
    return NextResponse.json({ error: 'Verplichte velden ontbreken' }, { status: 400 })
  }

  const supabase = await createAdminClient()

  // Maak Supabase Auth account aan
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 400 })
  }

  // Maak team_members record aan
  const { error: dbError } = await supabase.from('team_members').insert({
    naam,
    email,
    rol,
    afdeling: afdeling ?? null,
    commissie_pct: commissie_pct ?? 0,
    discord_naam: discord_naam ?? null,
    actief: true,
  })

  if (dbError) {
    // Verwijder auth account als DB insert faalt
    await supabase.auth.admin.deleteUser(authData.user.id)
    return NextResponse.json({ error: dbError.message }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}
