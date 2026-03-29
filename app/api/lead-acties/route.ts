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
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(c) { try { c.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch {} },
      },
    }
  )
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

// GET: ?lead_id=uuid | ?vandaag=true | ?openstaand=true
export async function GET(request: NextRequest) {
  const user = await getUser(request)
  if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const admin = getAdminClient()
  const { searchParams } = request.nextUrl
  const lead_id = searchParams.get('lead_id')
  const vandaag = searchParams.get('vandaag') === 'true'
  const openstaand = searchParams.get('openstaand') === 'true'

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q = (admin.from('lead_acties') as any).select('*, leads(bedrijfsnaam)').order('gepland_op', { ascending: true })

  if (lead_id) {
    q = q.eq('lead_id', lead_id)
  }

  if (vandaag) {
    const today = new Date()
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString()
    const end = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString()
    q = q.gte('gepland_op', start).lt('gepland_op', end).eq('status', 'open')
  }

  if (openstaand) {
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    q = q.lt('gepland_op', todayStart.toISOString()).eq('status', 'open')
  }

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

// POST: create new actie
export async function POST(request: NextRequest) {
  const user = await getUser(request)
  if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const body = await request.json()
  const { lead_id, toegewezen_aan, type, gepland_op, notitie } = body

  if (!lead_id || !toegewezen_aan || !type || !gepland_op) {
    return NextResponse.json({ error: 'Verplichte velden ontbreken' }, { status: 400 })
  }

  const admin = getAdminClient()
  const { data, error } = await admin.from('lead_acties').insert({
    lead_id, toegewezen_aan, type, gepland_op, notitie: notitie ?? null, status: 'open',
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
