import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const admin = await createAdminClient()

  // Check of huidige user manager/founder is
  const { data: me } = await admin.from('team_members').select('rol').eq('email', user.email).single()
  if (!me || !['founder','sales_manager'].includes(me.rol)) {
    return NextResponse.json({ error: 'Geen toegang' }, { status: 403 })
  }

  const { userId, newPassword } = await request.json()
  if (!userId || !newPassword || newPassword.length < 6) {
    return NextResponse.json({ error: 'Ongeldig verzoek (wachtwoord min. 6 tekens)' }, { status: 400 })
  }

  const { error } = await admin.auth.admin.updateUserById(userId, { password: newPassword })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ success: true })
}
