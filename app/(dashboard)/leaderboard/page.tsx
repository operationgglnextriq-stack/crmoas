'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Lead, Deal, OutreachLead } from '@/types'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

const COLORS = ['#6B3FA0', '#1B2A4A', '#1A7A3A', '#E67E22', '#CC0000']

export default function LeaderboardPage() {
  const supabase = createClient()
  const [leads, setLeads] = useState<Lead[]>([])
  const [deals, setDeals] = useState<Deal[]>([])
  const [outreach, setOutreach] = useState<OutreachLead[]>([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<'week' | 'month'>('week')

  useEffect(() => {
    const now = new Date()
    const [start, end] = period === 'week'
      ? [startOfWeek(now, { weekStartsOn: 1 }), endOfWeek(now, { weekStartsOn: 1 })]
      : [startOfMonth(now), endOfMonth(now)]

    Promise.all([
      supabase.from('leads').select('*').gte('created_at', start.toISOString()).lte('created_at', end.toISOString()),
      supabase.from('deals').select('*').gte('created_at', start.toISOString()).lte('created_at', end.toISOString()),
      supabase.from('outreach_leads').select('*').gte('created_at', start.toISOString()).lte('created_at', end.toISOString()),
    ]).then(([l, d, o]) => {
      setLeads(l.data ?? [])
      setDeals(d.data ?? [])
      setOutreach(o.data ?? [])
      setLoading(false)
    })
  }, [period])

  // Aggregeer data
  const setterMap: Record<string, { leads: number; omzet: number }> = {}
  leads.forEach(l => {
    if (!setterMap[l.setter_naam]) setterMap[l.setter_naam] = { leads: 0, omzet: 0 }
    setterMap[l.setter_naam].leads++
  })

  const closerMap: Record<string, { deals: number; omzet: number }> = {}
  deals.forEach(d => {
    if (!d.closer_naam) return
    if (!closerMap[d.closer_naam]) closerMap[d.closer_naam] = { deals: 0, omzet: 0 }
    closerMap[d.closer_naam].deals++
    closerMap[d.closer_naam].omzet += d.deal_waarde ?? 0
  })

  const outreachMap: Record<string, number> = {}
  outreach.forEach(o => {
    outreachMap[o.outreacher_naam] = (outreachMap[o.outreacher_naam] ?? 0) + 1
  })

  const topSetters = Object.entries(setterMap).sort((a, b) => b[1].leads - a[1].leads).slice(0, 5)
  const topClosers = Object.entries(closerMap).sort((a, b) => b[1].omzet - a[1].omzet).slice(0, 5)
  const topOutreachers = Object.entries(outreachMap).sort((a, b) => b[1] - a[1]).slice(0, 5)

  const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣']

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-6">
      {/* Period toggle */}
      <div className="flex gap-2">
        {(['week', 'month'] as const).map(p => (
          <button
            key={p}
            onClick={() => { setPeriod(p); setLoading(true) }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              period === p ? 'bg-[#6B3FA0] text-white' : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {p === 'week' ? 'Deze week' : 'Deze maand'}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Setters */}
        <div className="card">
          <h3 className="font-semibold text-[#1B2A4A] mb-4">👥 Top Setters</h3>
          <p className="text-xs text-gray-400 mb-3">Leads ingevoerd</p>
          {topSetters.length > 0 ? (
            <div className="space-y-3">
              {topSetters.map(([naam, data], i) => (
                <div key={naam} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{medals[i]}</span>
                    <span className="text-sm font-medium text-gray-800">{naam}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-[#6B3FA0]">{data.leads}</span>
                    <span className="text-xs text-gray-400 ml-1">leads</span>
                  </div>
                </div>
              ))}
              <div className="mt-4 pt-4 border-t">
                <ResponsiveContainer width="100%" height={120}>
                  <BarChart data={topSetters.map(([naam, d]) => ({ naam: naam.split(' ')[0], leads: d.leads }))}>
                    <XAxis dataKey="naam" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="leads" radius={[4, 4, 0, 0]}>
                      {topSetters.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <p className="text-gray-400 text-sm py-6 text-center">Geen data</p>
          )}
        </div>

        {/* Top Closers */}
        <div className="card">
          <h3 className="font-semibold text-[#1B2A4A] mb-4">💼 Top Closers</h3>
          <p className="text-xs text-gray-400 mb-3">Omzet gegenereerd</p>
          {topClosers.length > 0 ? (
            <div className="space-y-3">
              {topClosers.map(([naam, data], i) => (
                <div key={naam} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{medals[i]}</span>
                    <span className="text-sm font-medium text-gray-800">{naam}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-[#1A7A3A]">€{data.omzet.toLocaleString('nl-NL')}</span>
                    <p className="text-xs text-gray-400">{data.deals} deals</p>
                  </div>
                </div>
              ))}
              <div className="mt-4 pt-4 border-t">
                <ResponsiveContainer width="100%" height={120}>
                  <BarChart data={topClosers.map(([naam, d]) => ({ naam: naam.split(' ')[0], omzet: d.omzet }))}>
                    <XAxis dataKey="naam" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v: unknown) => typeof v === 'number' ? `€${v.toLocaleString('nl-NL')}` : String(v)} />
                    <Bar dataKey="omzet" radius={[4, 4, 0, 0]}>
                      {topClosers.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <p className="text-gray-400 text-sm py-6 text-center">Geen data</p>
          )}
        </div>

        {/* Top Outreachers */}
        <div className="card">
          <h3 className="font-semibold text-[#1B2A4A] mb-4">📞 Top Outreachers</h3>
          <p className="text-xs text-gray-400 mb-3">Contacten benaderd</p>
          {topOutreachers.length > 0 ? (
            <div className="space-y-3">
              {topOutreachers.map(([naam, count], i) => (
                <div key={naam} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{medals[i]}</span>
                    <span className="text-sm font-medium text-gray-800">{naam}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-[#E67E22]">{count}</span>
                    <span className="text-xs text-gray-400 ml-1">contacten</span>
                  </div>
                </div>
              ))}
              <div className="mt-4 pt-4 border-t">
                <ResponsiveContainer width="100%" height={120}>
                  <BarChart data={topOutreachers.map(([naam, count]) => ({ naam: naam.split(' ')[0], count }))}>
                    <XAxis dataKey="naam" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {topOutreachers.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <p className="text-gray-400 text-sm py-6 text-center">Geen data</p>
          )}
        </div>
      </div>
    </div>
  )
}
