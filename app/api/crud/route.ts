import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'

const ALLOWED = ['leads', 'deals', 'outreach_leads', 'team_members', 'dagrapporten', 'marktdata']

async function getUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

// READ
export async function GET(request: NextRequest) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const table = request.nextUrl.searchParams.get('table')
  const id = request.nextUrl.searchParams.get('id')
  if (!table || !ALLOWED.includes(table)) return NextResponse.json({ error: 'Ongeldig' }, { status: 400 })

  const admin = await createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q = (admin.from(table as any) as any).select('*')
  if (id) q = q.eq('id', id).single()

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

// CREATE
export async function POST(request: NextRequest) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const { table, data } = await request.json()
  if (!table || !ALLOWED.includes(table)) return NextResponse.json({ error: 'Ongeldig' }, { status: 400 })

  const admin = await createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: result, error } = await (admin.from(table as any) as any).insert(data).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(result)
}

// UPDATE
export async function PATCH(request: NextRequest) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const { table, id, data } = await request.json()
  if (!table || !id || !ALLOWED.includes(table)) return NextResponse.json({ error: 'Ongeldig' }, { status: 400 })

  const admin = await createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: result, error } = await (admin.from(table as any) as any).update(data).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(result)
}

// DELETE
export async function DELETE(request: NextRequest) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const { table, id } = await request.json()
  if (!table || !id || !ALLOWED.includes(table)) return NextResponse.json({ error: 'Ongeldig' }, { status: 400 })

  const admin = await createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin.from(table as any) as any).delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
