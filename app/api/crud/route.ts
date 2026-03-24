import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

const ALLOWED = ['leads', 'deals', 'outreach_leads', 'team_members', 'dagrapporten', 'marktdata']

function getAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function getUser(request: NextRequest) {
  // Auth via cookie (SSR) of via Authorization header
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.replace('Bearer ', '')
    const admin = getAdminClient()
    const { data: { user } } = await admin.auth.getUser(token)
    return user
  }
  // Fallback: cookie-based via anon client
  const { createServerClient } = await import('@supabase/ssr')
  const { cookies } = await import('next/headers')
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch {}
        },
      },
    }
  )
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

// READ
export async function GET(request: NextRequest) {
  const user = await getUser(request)
  if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const table = request.nextUrl.searchParams.get('table')
  const id = request.nextUrl.searchParams.get('id')
  if (!table || !ALLOWED.includes(table)) return NextResponse.json({ error: 'Ongeldig' }, { status: 400 })

  const admin = getAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q = (admin.from(table as any) as any).select('*')
  if (id) q = q.eq('id', id).single()

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

// CREATE
export async function POST(request: NextRequest) {
  const user = await getUser(request)
  if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const { table, data } = await request.json()
  if (!table || !ALLOWED.includes(table)) return NextResponse.json({ error: 'Ongeldig' }, { status: 400 })

  const admin = getAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: result, error } = await (admin.from(table as any) as any).insert(data).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(result)
}

// UPDATE
export async function PATCH(request: NextRequest) {
  const user = await getUser(request)
  if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const { table, id, data } = await request.json()
  if (!table || !id || !ALLOWED.includes(table)) return NextResponse.json({ error: 'Ongeldig' }, { status: 400 })

  const admin = getAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: result, error } = await (admin.from(table as any) as any).update(data).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(result)
}

// DELETE
export async function DELETE(request: NextRequest) {
  const user = await getUser(request)
  if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const { table, id } = await request.json()
  if (!table || !id || !ALLOWED.includes(table)) return NextResponse.json({ error: 'Ongeldig' }, { status: 400 })

  const admin = getAdminClient()

  // Cascade: als we een lead verwijderen, ontkoppel eerst de deals
  if (table === 'leads') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin.from('deals' as any) as any).update({ lead_id: null }).eq('lead_id', id)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin.from(table as any) as any).delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
