import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

function getAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function getUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.replace('Bearer ', '')
    const admin = getAdminClient()
    const { data: { user } } = await admin.auth.getUser(token)
    return user
  }
  const { createServerClient } = await import('@supabase/ssr')
  const { cookies } = await import('next/headers')
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() }, setAll(c) { try { c.forEach(({name,value,options}) => cookieStore.set(name,value,options)) } catch {} } } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function POST(request: NextRequest) {
  const user = await getUser(request)
  if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const body = await request.json()
  const { email, password, naam, rol, afdeling, commissie_pct, discord_naam } = body

  // Protect info@nextriq.nl - always assign founder role
  const effectiefRol = email === 'info@nextriq.nl' ? 'founder' : rol

  if (!email || !password || !naam || !rol) {
    return NextResponse.json({ error: 'Verplichte velden ontbreken' }, { status: 400 })
  }

  const supabase = getAdminClient()

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
    rol: effectiefRol,
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
