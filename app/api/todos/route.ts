import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

function getAdminSupabaseClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function getUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.replace('Bearer ', '')
    const admin = getAdminSupabaseClient()
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

// READ
export async function GET(request: NextRequest) {
  const user = await getUser(request)
  if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const id = request.nextUrl.searchParams.get('id')
  const admin = await createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q = (admin.from('todos' as any) as any).select('*').order('created_at', { ascending: false })
  if (id) q = q.eq('id', id).single()

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

// CREATE
export async function POST(request: NextRequest) {
  const user = await getUser(request)
  if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const data = await request.json()
  const admin = await createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: result, error } = await (admin.from('todos' as any) as any).insert(data).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(result)
}

// UPDATE
export async function PATCH(request: NextRequest) {
  const user = await getUser(request)
  if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const { id, data } = await request.json()
  if (!id) return NextResponse.json({ error: 'ID vereist' }, { status: 400 })

  const admin = await createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: result, error } = await (admin.from('todos' as any) as any).update(data).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(result)
}

// DELETE
export async function DELETE(request: NextRequest) {
  const user = await getUser(request)
  if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const { id } = await request.json()
  if (!id) return NextResponse.json({ error: 'ID vereist' }, { status: 400 })

  const admin = await createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin.from('todos' as any) as any).delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
