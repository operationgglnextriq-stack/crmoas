'use client'
export const dynamic = "force-dynamic";

import { useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { createClient } from '@/lib/supabase/client'
import { apiFetch } from '@/lib/apiFetch'
import KPICard from '@/components/ui/KPICard'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Lead, Deal, OutreachLead, Dagrapport, Marktdata, LeadActie, TeamMember, KwalificatieStatus } from '@/types'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isToday, isAfter, startOfDay, endOfDay, isBefore } from 'date-fns'
import { nl } from 'date-fns/locale'

// ─── Types ────────────────────────────────────────────────────────────────────
interface LeadActieWithLead extends LeadActie {
  leads?: { bedrijfsnaam: string } | null
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const KWALI_CONFIG: { key: KwalificatieStatus; label: string; color: string; badge: string }[] = [
  { key: 'followup_1', label: 'Follow-up 1',          color: 'bg-blue-100 border-blue-300',      badge: 'bg-blue-600 text-white' },
  { key: 'followup_2', label: 'Follow-up 2',          color: 'bg-blue-50 border-blue-200',       badge: 'bg-blue-400 text-white' },
  { key: 'followup_3', label: 'Follow-up 3',          color: 'bg-sky-50 border-sky-200',         badge: 'bg-sky-400 text-white' },
  { key: 'warm',       label: 'Warm 🔥',               color: 'bg-orange-50 border-orange-300',   badge: 'bg-orange-500 text-white' },
  { key: 'geboekt',   label: 'Geboekt ✅',             color: 'bg-green-50 border-green-300',     badge: 'bg-green-600 text-white' },
  { key: 'niet',      label: 'Niet geïnteresseerd',   color: 'bg-gray-100 border-gray-300',      badge: 'bg-gray-500 text-white' },
  { key: 'afwijzing', label: 'Afwijzing',             color: 'bg-red-50 border-red-300',         badge: 'bg-red-500 text-white' },
]

const ACTIE_TYPE_LABELS: Record<string, string> = {
  eerste_contact:  'Eerste contact',
  follow_up_1:     'Follow-up 1',
  follow_up_2:     'Follow-up 2',
  follow_up_3:     'Follow-up 3',
  terugbellen:     'Terugbellen',
  offerte_sturen:  'Offerte sturen',
}

function formatDate(iso: string) {
  try { return format(new Date(iso), 'd MMM HH:mm', { locale: nl }) } catch { return iso }
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { teamMember, loading: authLoading } = useAuth()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)

  // existing state
  const [leads, setLeads] = useState<Lead[]>([])
  const [allLeads, setAllLeads] = useState<Lead[]>([])
  const [deals, setDeals] = useState<Deal[]>([])
  const [allDeals, setAllDeals] = useState<Deal[]>([])
  const [outreach, setOutreach] = useState<OutreachLead[]>([])
  const [dagrapporten, setDagrapporten] = useState<Dagrapport[]>([])
  const [marktdata, setMarktdata] = useState<Marktdata[]>([])

  // new state
  const [acties, setActies] = useState<LeadActieWithLead[]>([])
  const [teamLeden, setTeamLeden] = useState<TeamMember[]>([])

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
    const today = format(now, 'yyyy-MM-dd')

    // Fetch acties via API
    const actiesRes = await apiFetch('/api/lead-acties').catch(() => null)
    const actiesData: LeadActieWithLead[] = actiesRes?.ok ? await actiesRes.json() : []

    // Fetch team members
    const ledenRes = await apiFetch('/api/crud?table=team_members').catch(() => null)
    const ledenData: TeamMember[] = ledenRes?.ok ? await ledenRes.json() : []

    const [l, allL, d, ad, o, dr, md] = await Promise.all([
      supabase.from('leads').select('*').gte('created_at', weekStart).lte('created_at', weekEnd),
      supabase.from('leads').select('*'),
      supabase.from('deals').select('*').gte('created_at', monthStart).lte('created_at', monthEnd),
      supabase.from('deals').select('*'),
      supabase.from('outreach_leads').select('*').gte('created_at', weekStart).lte('created_at', weekEnd),
      supabase.from('dagrapporten').select('*').eq('rapport_datum', today),
      supabase.from('marktdata').select('*'),
    ])

    setLeads(l.data ?? [])
    setAllLeads(allL.data ?? [])
    setDeals(d.data ?? [])
    setAllDeals(ad.data ?? [])
    setOutreach(o.data ?? [])
    setDagrapporten(dr.data ?? [])
    setMarktdata(md.data ?? [])
    setActies(Array.isArray(actiesData) ? actiesData : [])
    setTeamLeden(Array.isArray(ledenData) ? ledenData.filter(l => l.actief) : [])
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

  // ── Acties helpers ────────────────────────────────────────────────────────
  const openActies = acties.filter(a => a.status === 'open')
  const todayDateStr = format(nowDate, 'yyyy-MM-dd')
  const gedaanVandaag = acties.filter(a => a.status === 'gedaan' && a.afgerond_op && a.afgerond_op.startsWith(todayDateStr))
  const myOpenActies = isManager
    ? openActies
    : openActies.filter(a => a.toegewezen_aan === teamMember?.naam)

  const nowDate = new Date()
  const todayStart = startOfDay(nowDate)
  const todayEnd = endOfDay(nowDate)
  const weekEnd2 = endOfWeek(nowDate, { weekStartsOn: 1 })

  const actiesToday = myOpenActies.filter(a => {
    const d = new Date(a.gepland_op)
    return d >= todayStart && d <= todayEnd
  })
  const actiesThisWeek = myOpenActies.filter(a => {
    const d = new Date(a.gepland_op)
    return d > todayEnd && d <= weekEnd2
  })
  const actiesVerlopen = myOpenActies.filter(a => isBefore(new Date(a.gepland_op), todayStart))

  const upcomingActies = myOpenActies
    .filter(a => !isBefore(new Date(a.gepland_op), todayStart))
    .sort((a, b) => new Date(a.gepland_op).getTime() - new Date(b.gepland_op).getTime())
    .slice(0, 5)

  // ── Leads pipeline helpers ────────────────────────────────────────────────
  const pipelineLeads = isManager
    ? allLeads
    : allLeads.filter(l => l.setter_naam === teamMember?.naam || l.closer_naam === teamMember?.naam)

  // ── Dagrapporten helpers (manager only) ───────────────────────────────────
  const vandaag = format(nowDate, 'yyyy-MM-dd')
  const vandaagRapporten = dagrapporten.filter(r => r.rapport_datum === vandaag)
  const ingediendNamen = vandaagRapporten.map(r => r.naam)
  const actieveVerkoopLeden = teamLeden.filter(l => ['setter', 'closer', 'outreacher'].includes(l.rol))
  const nietIngediend = actieveVerkoopLeden.filter(l => !ingediendNamen.includes(l.naam))

  // ── Follow-ups (manager only) ─────────────────────────────────────────────
  const followupLeads = allLeads
    .filter(l => ['followup_1', 'followup_2', 'followup_3'].includes(l.kwalificatiestatus))
    .slice(0, 10)

  const followupByStatus: Record<string, Lead[]> = {}
  followupLeads.forEach(l => {
    if (!followupByStatus[l.kwalificatiestatus]) followupByStatus[l.kwalificatiestatus] = []
    followupByStatus[l.kwalificatiestatus].push(l)
  })

  // ─────────────────────────────────────────────────────────────────────────
  // Personal dashboard for non-managers
  // ─────────────────────────────────────────────────────────────────────────
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

        {/* Leads Pipeline widget */}
        <LeadsPipelineWidget leads={pipelineLeads} />

        {/* Acties widget */}
        <ActiesWidget
          actiesToday={actiesToday}
          actiesThisWeek={actiesThisWeek}
          actiesVerlopen={actiesVerlopen}
          upcomingActies={upcomingActies}
        />

        <div className="card">
          <h3 className="font-semibold text-[#1B2A4A] mb-3">Welkom, {teamMember?.naam}!</h3>
          <p className="text-gray-500 text-sm">Gebruik de navigatie links om leads, outreach of je pipeline te bekijken.</p>
        </div>
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Manager/Founder dashboard
  // ─────────────────────────────────────────────────────────────────────────
  const ACTIEVE_STATUSSEN = ['call', 'offerte', 'onderhand', 'gesloten', 'betaald', 'levering']
  const pipelineWaarde = allDeals
    .filter(d => ACTIEVE_STATUSSEN.includes(d.deal_status))
    .reduce((s, d) => s + (d.deal_waarde ?? 0), 0)
  const geslotenDeals = deals.filter(d => d.deal_status === 'gesloten' || d.deal_status === 'betaald')
  const openCommissies = allDeals
    .filter(d => !d.commissie_betaald && (d.deal_status === 'gesloten' || d.deal_status === 'betaald' || d.deal_status === 'opgeleverd'))
    .reduce((s, d) => s + (d.commissie_closer ?? 0) + (d.commissie_setter ?? 0) + (d.commissie_creator ?? 0) + (d.commissie_manager ?? 0) + (d.commissie_web_developer ?? 0), 0)

  const setterMap: Record<string, number> = {}
  leads.forEach(l => { setterMap[l.setter_naam] = (setterMap[l.setter_naam] ?? 0) + 1 })
  const setterData = Object.entries(setterMap).map(([name, count]) => ({ name, leads: count }))

  const closerMap: Record<string, number> = {}
  geslotenDeals.forEach(d => { if (d.closer_naam) closerMap[d.closer_naam] = (closerMap[d.closer_naam] ?? 0) + 1 })
  const closerData = Object.entries(closerMap).map(([name, count]) => ({ name, deals: count }))

  const outreachMap: Record<string, number> = {}
  outreach.forEach(o => { outreachMap[o.outreacher_naam] = (outreachMap[o.outreacher_naam] ?? 0) + 1 })
  const outreachData = Object.entries(outreachMap).map(([name, count]) => ({ name, pogingen: count }))

  const pijnMap: Record<string, number> = {}
  marktdata.forEach(m => { if (m.pijnpunt) pijnMap[m.pijnpunt] = (pijnMap[m.pijnpunt] ?? 0) + m.frequentie })
  const topPijnpunten = Object.entries(pijnMap).sort((a, b) => b[1] - a[1]).slice(0, 5)
  const productkansen = marktdata.filter(m => m.product_kans).length

  const dealStages = [
    { key: 'call',       label: '📞 Call',       color: 'bg-blue-100' },
    { key: 'offerte',    label: '📄 Offerte',     color: 'bg-purple-100' },
    { key: 'onderhand',  label: '🤝 Onderhand.',  color: 'bg-yellow-100' },
    { key: 'gesloten',   label: '✅ Gesloten',    color: 'bg-green-100' },
    { key: 'betaald',    label: '💰 Betaald',     color: 'bg-green-200' },
    { key: 'levering',   label: '🔄 Levering',    color: 'bg-orange-100' },
    { key: 'opgeleverd', label: '🏁 Opgeleverd',  color: 'bg-teal-100' },
    { key: 'verloren',   label: '❌ Verloren',    color: 'bg-red-100' },
  ]

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Pipeline waarde" value={`€${pipelineWaarde.toLocaleString('nl-NL')}`} icon="💼" color="navy" subtitle="Alle open deals" />
        <KPICard title="Leads deze week" value={leads.length} icon="👥" color="purple" />
        <KPICard title="Deals gesloten (maand)" value={geslotenDeals.length} icon="✅" color="green" />
        <KPICard title="Openstaande commissies" value={`€${openCommissies.toLocaleString('nl-NL')}`} icon="💰" color="orange" />
      </div>

      {/* Leads Pipeline widget */}
      <LeadsPipelineWidget leads={pipelineLeads} />

      {/* Acties widget */}
      <ActiesWidget
        actiesToday={actiesToday}
        actiesThisWeek={actiesThisWeek}
        actiesVerlopen={actiesVerlopen}
        upcomingActies={upcomingActies}
      />

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

      {/* Dagrapporten vandaag + Follow-ups (manager only) */}
      <DagrapportOverzicht
        vandaagRapporten={vandaagRapporten}
        actieveVerkoopLeden={actieveVerkoopLeden}
        nietIngediend={nietIngediend}
        openActies={openActies}
      />

      <FollowUpsOverzicht followupByStatus={followupByStatus} />

      {/* Leaderboard + Marktdata */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="font-semibold text-[#1B2A4A] mb-4">🏆 Leaderboard week</h3>
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Top setters</p>
              {setterData.sort((a, b) => b.leads - a.leads).slice(0, 3).map((s, i) => (
                <div key={s.name} className="flex items-center justify-between py-1.5 border-b border-gray-100 last:border-0">
                  <span className="text-sm">{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'} {s.name}</span>
                  <span className="text-sm font-semibold text-[#6B3FA0]">{s.leads} leads</span>
                </div>
              ))}
              {setterData.length === 0 && <p className="text-gray-400 text-xs">Geen data</p>}
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Top closers</p>
              {closerData.sort((a, b) => b.deals - a.deals).slice(0, 3).map((c, i) => (
                <div key={c.name} className="flex items-center justify-between py-1.5 border-b border-gray-100 last:border-0">
                  <span className="text-sm">{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'} {c.name}</span>
                  <span className="text-sm font-semibold text-[#1B2A4A]">{c.deals} deals</span>
                </div>
              ))}
              {closerData.length === 0 && <p className="text-gray-400 text-xs">Geen data</p>}
            </div>
          </div>
        </div>

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

// ─── Widget: Leads Pipeline ───────────────────────────────────────────────────
function LeadsPipelineWidget({ leads }: { leads: Lead[] }) {
  const counts = KWALI_CONFIG.map(cfg => ({
    ...cfg,
    count: leads.filter(l => l.kwalificatiestatus === cfg.key).length,
  }))

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h3 className="text-[#1B2A4A] font-semibold mb-4">📊 Leads pipeline</h3>
      <div className="flex flex-wrap gap-3">
        {counts.map(item => (
          <div
            key={item.key}
            className={`flex items-center gap-2 px-4 py-2 rounded-full border ${item.color} flex-shrink-0`}
          >
            <span className="text-sm font-medium text-gray-700">{item.label}</span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${item.badge}`}>
              {item.count}
            </span>
          </div>
        ))}
      </div>
      {leads.length === 0 && <p className="text-gray-400 text-sm mt-2">Nog geen leads</p>}
    </div>
  )
}

// ─── Widget: Acties ───────────────────────────────────────────────────────────
function ActiesWidget({
  actiesToday,
  actiesThisWeek,
  actiesVerlopen,
  upcomingActies,
}: {
  actiesToday: LeadActieWithLead[]
  actiesThisWeek: LeadActieWithLead[]
  actiesVerlopen: LeadActieWithLead[]
  upcomingActies: LeadActieWithLead[]
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h3 className="text-[#1B2A4A] font-semibold">🗓️ Openstaande acties</h3>
        <a href="/vandaag" className="text-sm text-blue-600 hover:underline">Bekijk alle →</a>
      </div>

      {/* Counts row */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="bg-blue-50 rounded-lg px-4 py-2 text-center min-w-[80px]">
          <p className="text-2xl font-bold text-blue-700">{actiesToday.length}</p>
          <p className="text-xs text-gray-500 mt-0.5">Vandaag</p>
        </div>
        <div className="bg-purple-50 rounded-lg px-4 py-2 text-center min-w-[80px]">
          <p className="text-2xl font-bold text-purple-700">{actiesThisWeek.length}</p>
          <p className="text-xs text-gray-500 mt-0.5">Deze week</p>
        </div>
        <div className={`rounded-lg px-4 py-2 text-center min-w-[80px] ${actiesVerlopen.length > 0 ? 'bg-red-50' : 'bg-gray-50'}`}>
          <p className={`text-2xl font-bold ${actiesVerlopen.length > 0 ? 'text-red-600' : 'text-gray-500'}`}>
            {actiesVerlopen.length}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">Verlopen</p>
        </div>
      </div>

      {/* Upcoming list */}
      {upcomingActies.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Eerstvolgende acties</p>
          {upcomingActies.map(a => (
            <div key={a.id} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 py-2 border-b border-gray-100 last:border-0">
              <div className="flex flex-col">
                <span className="text-sm font-medium text-[#1B2A4A]">
                  {a.leads?.bedrijfsnaam ?? a.lead_id.slice(0, 8)}
                </span>
                <span className="text-xs text-gray-500">{ACTIE_TYPE_LABELS[a.type] ?? a.type}</span>
              </div>
              <div className="flex flex-col items-end text-right">
                <span className="text-xs text-gray-700 font-medium">{formatDate(a.gepland_op)}</span>
                <span className="text-xs text-gray-400">{a.toegewezen_aan}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-400 text-sm">Geen aankomende acties</p>
      )}
    </div>
  )
}

// ─── Widget: Dagrapport overzicht (manager) ───────────────────────────────────
function DagrapportOverzicht({
  vandaagRapporten,
  actieveVerkoopLeden,
  nietIngediend,
  openActies,
  gedaanVandaag,
}: {
  vandaagRapporten: Dagrapport[]
  actieveVerkoopLeden: TeamMember[]
  nietIngediend: TeamMember[]
  openActies: LeadActieWithLead[]
  gedaanVandaag: LeadActieWithLead[]
}) {
  const totaal = actieveVerkoopLeden.length
  const ingediend = vandaagRapporten.length

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h3 className="text-[#1B2A4A] font-semibold">📊 Dagrapporten vandaag</h3>
        <span className={`text-sm font-semibold px-3 py-1 rounded-full ${
          ingediend >= totaal ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
        }`}>
          {ingediend} / {totaal} ingediend
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Ingediend */}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase mb-2">✅ Ingediend</p>
          {vandaagRapporten.length > 0 ? (
            <div className="space-y-2">
              {vandaagRapporten.map(r => (
                <div key={r.id} className="bg-green-50 rounded-lg p-3">
                  <div className="flex items-center justify-between flex-wrap gap-1">
                    <span className="text-sm font-semibold text-[#1B2A4A]">{r.naam}</span>
                    <span className="text-xs text-gray-500">{r.afdeling}</span>
                  </div>
                  <div className="flex flex-wrap gap-3 mt-1 text-xs text-gray-600">
                    <span>👥 {r.leads_benaderd} leads</span>
                    <span>📞 {r.cold_calls} calls</span>
                    <span className="text-green-700 font-medium">✅ {r.calls_geboekt} geboekt</span>
                    {(() => {
                      const open = openActies.filter(a => a.toegewezen_aan === r.naam).length
                      return (
                        <>
                          {gedaanVandaag.filter((a: {toegewezen_aan: string}) => a.toegewezen_aan === r.naam).length > 0 && (
                            <span className="text-green-600 font-medium">✅ {gedaanVandaag.filter((a: {toegewezen_aan: string}) => a.toegewezen_aan === r.naam).length} gedaan</span>
                          )}
                          {open > 0 && <span className="text-blue-700 font-medium">📋 {open} open</span>}
                        </>
                      )
                    })()}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-sm">Nog niemand ingediend</p>
          )}
        </div>

        {/* Niet ingediend */}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase mb-2">⏳ Nog niet ingediend</p>
          {nietIngediend.length > 0 ? (
            <div className="space-y-2">
              {nietIngediend.map(l => (
                <div key={l.id} className="bg-orange-50 border border-orange-200 rounded-lg p-3 flex items-center justify-between">
                  <span className="text-sm font-medium text-orange-800">{l.naam}</span>
                  <span className="text-xs text-orange-600">{l.afdeling ?? l.rol}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-green-600 text-sm font-medium">🎉 Iedereen heeft ingediend!</p>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Widget: Openstaande follow-ups (manager) ─────────────────────────────────
function FollowUpsOverzicht({ followupByStatus }: { followupByStatus: Record<string, Lead[]> }) {
  const statusKeys: KwalificatieStatus[] = ['followup_1', 'followup_2', 'followup_3']
  const hasAny = statusKeys.some(k => (followupByStatus[k]?.length ?? 0) > 0)

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h3 className="text-[#1B2A4A] font-semibold">📋 Openstaande follow-ups</h3>
        <a href="/leads" className="text-sm text-blue-600 hover:underline">Bekijk alle leads →</a>
      </div>

      {hasAny ? (
        <div className="space-y-4">
          {statusKeys.map(key => {
            const items = followupByStatus[key] ?? []
            if (items.length === 0) return null
            const cfg = KWALI_CONFIG.find(c => c.key === key)!
            return (
              <div key={key}>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${cfg.badge}`}>
                    {cfg.label}
                  </span>
                  <span className="text-xs text-gray-400">{items.length} lead{items.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {items.map(l => (
                    <div key={l.id} className={`flex flex-col px-3 py-2 rounded-lg border text-sm ${cfg.color}`}>
                      <span className="font-medium text-[#1B2A4A]">{l.bedrijfsnaam}</span>
                      <span className="text-xs text-gray-500">{l.setter_naam}</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <p className="text-gray-400 text-sm">Geen openstaande follow-ups</p>
      )}
    </div>
  )
}
