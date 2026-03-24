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
        setAll(cookiesToSet) {
          try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch {}
        },
      },
    }
  )
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function GET(request: NextRequest) {
  const user = await getUser(request)
  if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const naam = request.nextUrl.searchParams.get('naam')
  if (!naam || naam.length < 2) {
    return NextResponse.json({ duplicaat: false })
  }

  const supabase = getAdminClient()

  const [{ data: leads }, { data: outreach }] = await Promise.all([
    supabase
      .from('leads')
      .select('bedrijfsnaam,setter_naam,created_at,afdeling')
      .ilike('bedrijfsnaam', `%${naam}%`)
      .limit(1),
    supabase
      .from('outreach_leads')
      .select('bedrijfsnaam,outreacher_naam,created_at')
      .ilike('bedrijfsnaam', `%${naam}%`)
      .limit(1),
  ])

  if (leads && leads.length > 0) {
    return NextResponse.json({
      duplicaat: true,
      bron: 'leads',
      ingevoerd_door: leads[0].setter_naam,
      afdeling: leads[0].afdeling ?? 'sales',
      datum: leads[0].created_at,
    })
  }

  if (outreach && outreach.length > 0) {
    return NextResponse.json({
      duplicaat: true,
      bron: 'outreach',
      ingevoerd_door: outreach[0].outreacher_naam,
      afdeling: 'outreach',
      datum: outreach[0].created_at,
    })
  }

  return NextResponse.json({ duplicaat: false })
}
