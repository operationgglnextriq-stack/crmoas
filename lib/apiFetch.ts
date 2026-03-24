import { createClient } from '@/lib/supabase/client'

/**
 * Wrapper rond fetch die automatisch de Supabase access token meestuurt.
 * Gebruik dit voor alle /api/ calls vanuit de client.
 */
export async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> ?? {}),
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  return fetch(url, { ...options, headers })
}
