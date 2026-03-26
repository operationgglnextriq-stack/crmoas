export const dynamic = "force-dynamic";
'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { createClient } from '@/lib/supabase/client'
import KPICard from '@/components/ui/KPICard'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Lead, Deal, OutreachLead, Dagrapport, Marktdata } from '@/types'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns'

export default function DashboardPage() {
  const { teamMember, loading: authLoading } = useAuth()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [leads, setLeads] = useState<Lead[]>([])
  const [deals, setDeals] = useState<Deal[]>([])
  const [allDeals, setAllDeals] = useState<Deal[]>([])
  const [outreach, setOutreach] = useState<OutreachLead[]>([])
  const [dagrapporten, setDagrapporten] = useState<Dagrapport[]>([])
  const [marktdata, setMarktdata] = useState<Marktdata[]>([])

  const isManager = teamMember?.rol === 'founder' || teamMember?.rol === 'sales_manager'

  useEffect(() => {
    if (authLoading) return
    if (!teamMember) { setLoading(false); return }
    fetchData()
  }, [teamMember, authLoading])

  const fetchData = async () => {
    const now = new Date()
    const weekStart = startOfWeek(now, { weekStartsOn: 1 }).toISOString()
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 }).toISOString()
    const monthStart = startOfMonth(now).toISOString()
    const monthEnd = endOfMonth(now).toISOString()

    const [l, d, ad, o, dr, md] = await Promise.all([
      supabase.from('leads').select('*').gte('created_at', weekStart).lte('created_at', weekEnd),
      supabase.from('deals').select('*').gte('created_at', monthStart).lte('created_at', monthEnd),
      supabase.from('deals').select('*'),
      supabase.from('outreach_leads').select('*').gte('created_at', weekStart).lte('created_at', weekEnd),
      supabase.from('dagrapporten').select('*').eq('rapport_datum', format(now, 'yyyy-MM-dd')),
      supabase.from('marktdata').select('*'),
    ])

    setLeads(l.data ?? [])
    setDeals(d.data ?? [])
    setAllDeals(ad.data ?? [])
    setOutreach(o.data ?? [])
    setDagrapporten(dr.data ?? [])
    setMarktdata(md.data ?? [])
    setLoading(false)
  }

  if (loading) return <LoadingSpinner />

  if (!teamMember) {
    return (
      <div className="card text-center py-16">
        <p className="text-3xl mb-3">⚠️</p>
        <p className="text-lg font-bold text-[#1B2A4A] mb-2">Account niet gevonden</p>
        <p className="text-sm text-gray-400">Je account is niet gekoppeld aan een teamlid. Neem contact op met de beheerder.</p>
      </div>
    )
  }

  // Personal dashboard for non-managers
  if (!isManager) {
    const myLeads = leads.filter(l =>
      l.setter_naam === teamMember?.naam ||
      l.closer_naam === teamMember?.naam
    )
    const myDeals = deals.filter(d =>
      d.closer_naam === teamMember?.naam ||
      d.setter_naam === teamMember?.naam
    )
    const myOutreach = outreach.filter(o => o.outreacher_naam === teamMember?.naam)
    const todayReport = dagrapporten.find(dr => dr.naam === teamMember?.naam)

    return (
      <div className="space-y-6">
        {/* Dagrapport status */}
        <div className={`p-4 rounded-xl border-l-4 ${todayReport ? 'bg-green-50 border-green-500' : 'bg-red-50 border-red-500'}`}>
          <p className="font-medium text-sm">
            {todayReport ? '✅ Dagrapport vandaag ingediend' : '⚠️ Dagrapport nog NIET ingediend vandaag'}
          </p>
          {!todayReport && (
            <a href="/dagrapporten" className="text-sm text-[#CC0000] underline mt-1 inline-block">
              Indienen →
            </a>
          )}
        </div>

        {/* Personal KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KPICard title="Leads deze week" value={myLeads.length} icon="👥" color="navy" />
          <KPICard title="Deals deze maand" value={myDeals.length} icon="💼" color="purple" />
          <KPICard title="Outreach deze week" value={myOutreach.length} icon="📞" color="green" />
          <KPICard
            title="Omzet deze maand"
            value={`€${myDeals.reduce((s, d) => s + (d.deal_waarde ?? 0), 0).toLocaleString('nl-NL')}`}
            icon="💰"
            color="orange"
          />
        </div>

        <div className="card">
          <h3 className="font-semibold text-[#1B2A4A] mb-3">Welkom, {teamMember?.naam}!</h3>
          <p className="text-gray-500 text-sm">Gebruik de navigatie links om leads, outreach of je pipeline te bekijken.</p>
        </div>
      </div>
    )
  }

  // Manager/Founder dashboard
  const ACTIEVE_STATUSSEN = ['call', 'offerte', 'onderhand', 'gesloten', 'betaald', 'levering']
  const pipelineWaarde = allDeals
    .filter(d => ACTIEVE_STATUSSEN.includes(d.deal_status))
    .reduce((s, d) => s + (d.deal_waarde ?? 0), 0)
  const geslotenDeals = deals.filter(d => d.deal_status === 'gesloten' || d.deal_status === 'betaald')
  const openCommissies = allDeals
    .filter(d => !d.commissie_betaald && (d.deal_status === 'gesloten' || d.deal_status === 'betaald' || d.deal_status === 'opgeleverd'))
    .reduce((s, d) => s + (d.commissie_closer ?? 0) + (d.commissie_setter ?? 0) + (d.commissie_creator ?? 0) + (d.commissie_manager ?? 0) + (d.commissie_web_developer ?? 0), 0)

  // Leads per setter chart
  const setterMap: Record<string, number> = {}
  leads.forEach(l => {
    setterMap[l.setter_naam] = (setterMap[l.setter_naam] ?? 0) + 1
  })
  const setterData = Object.entries(setterMap).map(([name, count]) => ({ name, leads: count }))

  // Deals per closer chart
  const closerMap: Record<string, number> = {}
  geslotenDeals.forEach(d => {
    if (d.closer_naam) closerMap[d.closer_naam] = (closerMap[d.closer_naam] ?? 0) + 1
  })
  const closerData = Object.entries(closerMap).map(([name, count]) => ({ name, deals: count }))

  // Outreach per outreacher
  const outreachMap: Record<string, number> = {}
  outreach.forEach(o => {
    outreachMap[o.outreacher_naam] = (outreachMap[o.outreacher_naam] ?? 0) + 1
  })
  const outreachData = Object.entries(outreachMap).map(([name, count]) => ({ name, pogingen: count }))

  // Pijnpunten top 5
  const pijnMap: Record<string, number> = {}
  marktdata.forEach(m => {
    if (m.pijnpunt) pijnMap[m.pijnpunt] = (pijnMap[m.pijnpunt] ?? 0) + m.frequentie
  })
  const topPijnpunten = Object.entries(pijnMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  const productkansen = marktdata.filter(m => m.product_kans).length

  // Deal counts per stage
  const dealStages = [
    { key: 'call', label: '📞 Call', color: 'bg-blue-100' },
    { key: 'offerte', label: '📄 Offerte', color: 'bg-purple-100' },
    { key: 'onderhand', label: '🤝 Onderhand.', color: 'bg-yellow-100' },
    { key: 'gesloten', label: '✅ Gesloten', color: 'bg-green-100' },
    { key: 'betaald', label: '💰 Betaald', color: 'bg-green-200' },
    { key: 'levering', label: '🔄 Levering', color: 'bg-orange-100' },
    { key: 'opgeleverd', label: '🏁 Opgeleverd', color: 'bg-teal-100' },
    { key: 'verloren', label: '❌ Verloren', color: 'bg-red-100' },
  ]

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Pipeline waarde"
          value={`€${pipelineWaarde.toLocaleString('nl-NL')}`}
          icon="💼"
          color="navy"
          subtitle="Alle open deals"
        />
        <KPICard title="Leads deze week" value={leads.length} icon="👥" color="purple" />
        <KPICard title="Deals gesloten (maand)" value={geslotenDeals.length} icon="✅" color="green" />
        <KPICard
          title="Openstaande commissies"
          value={`€${openCommissies.toLocaleString('nl-NL')}`}
          icon="💰"
          color="orange"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Leads per setter */}
        <div className="card">
          <h3 className="font-semibold text-[#1B2A4A] mb-4">Leads per setter (week)</h3>
          {setterData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={setterData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="leads" fill="#6B3FA0" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-400 text-sm py-8 text-center">Geen data deze week</p>
          )}
        </div>

        {/* Deals per closer */}
        <div className="card">
          <h3 className="font-semibold text-[#1B2A4A] mb-4">Deals per closer (maand)</h3>
          {closerData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={closerData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="deals" fill="#1B2A4A" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-400 text-sm py-8 text-center">Geen data deze maand</p>
          )}
        </div>
      </div>

      {/* Outreach + Pipeline mini */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Outreach per outreacher */}
        <div className="card">
          <h3 className="font-semibold text-[#1B2A4A] mb-4">Outreach per outreacher (week)</h3>
          {outreachData.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={outreachData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="pogingen" fill="#1A7A3A" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-400 text-sm py-8 text-center">Geen data deze week</p>
          )}
        </div>

        {/* Mini pipeline */}
        <div className="card">
          <h3 className="font-semibold text-[#1B2A4A] mb-4">Pipeline overzicht</h3>
          <div className="grid grid-cols-2 gap-2">
            {dealStages.map(stage => {
              const count = deals.filter(d => d.deal_status === stage.key).length
              return (
                <div key={stage.key} className={`${stage.color} rounded-lg p-3 text-center`}>
                  <p className="text-xs font-medium text-gray-700">{stage.label}</p>
                  <p className="text-xl font-bold text-gray-900">{count}</p>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Leaderboard + Marktdata */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Leaderboard */}
        <div className="card">
          <h3 className="font-semibold text-[#1B2A4A] mb-4">🏆 Leaderboard week</h3>
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Top setters</p>
              {setterData.sort((a, b) => b.leads - a.leads).slice(0, 3).map((s, i) => (
                <div key={s.name} className="flex items-center justify-between py-1.5 border-b border-gray-100 last:border-0">
                  <span className="text-sm">
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'} {s.name}
                  </span>
                  <span className="text-sm font-semibold text-[#6B3FA0]">{s.leads} leads</span>
                </div>
              ))}
              {setterData.length === 0 && <p className="text-gray-400 text-xs">Geen data</p>}
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Top closers</p>
              {closerData.sort((a, b) => b.deals - a.deals).slice(0, 3).map((c, i) => (
                <div key={c.name} className="flex items-center justify-between py-1.5 border-b border-gray-100 last:border-0">
                  <span className="text-sm">
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'} {c.name}
                  </span>
                  <span className="text-sm font-semibold text-[#1B2A4A]">{c.deals} deals</span>
                </div>
              ))}
              {closerData.length === 0 && <p className="text-gray-400 text-xs">Geen data</p>}
            </div>
          </div>
        </div>

        {/* Marktdata signalen */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-[#1B2A4A]">📊 Marktdata signalen</h3>
            <span className="badge bg-orange-100 text-orange-800">🚀 {productkansen} kansen</span>
          </div>
          <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Top pijnpunten</p>
          {topPijnpunten.map(([pijnpunt, freq], i) => (
            <div key={i} className="flex items-center justify-between py-1.5 border-b border-gray-100 last:border-0">
              <span className="text-sm text-gray-700 truncate flex-1 mr-3">{pijnpunt}</span>
              <span className="text-sm font-semibold text-[#6B3FA0]">×{freq}</span>
            </div>
          ))}
          {topPijnpunten.length === 0 && <p className="text-gray-400 text-xs">Geen marktdata ingediend</p>}
        </div>
      </div>
    </div>
  )
}
