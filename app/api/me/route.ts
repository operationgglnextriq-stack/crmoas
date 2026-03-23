import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })
  }

  const admin = await createAdminClient()
  const { data, error } = await admin
    .from('team_members')
    .select('*')
    .eq('email', user.email)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Teamlid niet gevonden' }, { status: 404 })
  }

  return NextResponse.json(data)
}
