'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'
import { createClient } from '@/lib/supabase/client'
import { format, isToday, isBefore, isAfter, addDays, startOfDay } from 'date-fns'
import { nl } from 'date-fns/locale'
import { Lead } from '@/types'

interface Actie {
  id: string
  lead_id: string
  toegewezen_aan: string
  type: string
  gepland_op: string
  notitie: string | null
  status: string
  leads?: { bedrijfsnaam: string } | null
}

const TYPE_LABELS: Record<string, string> = {
  eerste_contact: 'Eerste contact',
  follow_up_1: 'Follow-up 1',
  follow_up_2: 'Follow-up 2',
  follow_up_3: 'Follow-up 3',
  terugbellen: 'Terugbellen',
  offerte_sturen: 'Offerte sturen',
}

const STATUS_COLORS: Record<string, string> = {
  followup_1: 'bg-blue-100 text-blue-800 border-blue-200',
  followup_2: 'bg-blue-200 text-blue-900 border-blue-300',
  followup_3: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  warm: 'bg-orange-100 text-orange-800 border-orange-200',
  geboekt: 'bg-green-100 text-green-800 border-green-200',
  niet: 'bg-gray-100 text-gray-600 border-gray-200',
  afwijzing: 'bg-red-100 text-red-700 border-red-200',
}

const STATUS_LABELS: Record<string, string> = {
  benaderd: 'Benaderd',
  followup_1: 'Follow-up 1',
  followup_2: 'Follow-up 2',
  followup_3: 'Follow-up 3',
  warm: 'Warm',
  geboekt: 'Geboekt ✅',
  niet: 'Niet geïnteresseerd',
  afwijzing: 'Afwijzing',
}

export default function PlanningPage() {
  const { teamMember } = useAuth()
  const supabase = createClient()
  const isManager = teamMember?.rol === 'founder' || teamMember?.rol === 'sales_manager'

  const [acties, setActies] = useState<Actie[]>([])
  const [leads, setLeads] = useState<Lead[]>([])
  const [filter, setFilter] = useState('alle')
  const [medewerkers, setMedewerkers] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [actiesRes, leadsRes] = await Promise.all([
        fetch('/api/lead-acties'),
        supabase.from('leads').select('*'),
      ])
      const actiesData: Actie[] = actiesRes.ok ? await actiesRes.json() : []
      setActies(actiesData)
      setLeads(leadsRes.data ?? [])
      const namen = [...new Set(actiesData.map(a => a.toegewezen_aan))].sort()
      setMedewerkers(namen)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => { fetchData() }, [fetchData])

  const markDone = async (id: string) => {
    await fetch(`/api/lead-acties/${id}`, { method: 'PATCH' })
    fetchData()
  }

  const now = new Date()
  const todayStart = startOfDay(now)
  const weekEnd = addDays(todayStart, 7)

  const filteredActies = acties.filter(a => {
    if (!isManager && a.toegewezen_aan !== teamMember?.naam) return false
    if (isManager && filter !== 'alle' && a.toegewezen_aan !== filter) return false
    return true
  })

  const openActies = filteredActies.filter(a => a.status === 'open')
  const verlopen = openActies.filter(a => isBefore(new Date(a.gepland_op), todayStart))
  const vandaag = openActies.filter(a => isToday(new Date(a.gepland_op)))
  const dezeWeek = openActies.filter(a => {
    const d = new Date(a.gepland_op)
    return isAfter(d, now) && isBefore(d, weekEnd) && !isToday(d)
  })

  // Groepeer komende week per dag
  const dezeWeekPerDag: Record<string, Actie[]> = {}
  dezeWeek.forEach(a => {
    const dag = format(new Date(a.gepland_op), 'yyyy-MM-dd')
    if (!dezeWeekPerDag[dag]) dezeWeekPerDag[dag] = []
    dezeWeekPerDag[dag].push(a)
  })

  // Pipeline leads
  const pipelineLeads = isManager ? leads : leads.filter(l =>
    l.setter_naam === teamMember?.naam || l.closer_naam === teamMember?.naam
  )
  const pipelineStatussen = ['benaderd', 'followup_1', 'followup_2', 'followup_3', 'warm', 'geboekt', 'niet', 'afwijzing']

  const getBedrijfsnaam = (a: Actie) => a.leads?.bedrijfsnaam ?? leads.find(l => l.id === a.lead_id)?.bedrijfsnaam ?? '—'

  const ActieKaart = ({ a, rood = false }: { a: Actie; rood?: boolean }) => (
    <div className={`rounded-xl border p-4 ${rood ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'}`}>
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-[#1B2A4A] text-sm truncate">{getBedrijfsnaam(a)}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {TYPE_LABELS[a.type] ?? a.type}
            {isManager && <span className="ml-2 text-gray-400">· {a.toegewezen_aan}</span>}
          </p>
          <p className={`text-xs mt-1 font-medium ${rood ? 'text-red-600' : 'text-gray-500'}`}>
            🕐 {format(new Date(a.gepland_op), 'd MMM HH:mm', { locale: nl })}
          </p>
          {a.notitie && <p className="text-xs text-gray-400 mt-1 italic">"{a.notitie}"</p>}
        </div>
        <button
          onClick={() => markDone(a.id)}
          className="text-xs px-3 py-2 bg-green-600 text-white rounded-lg font-medium whitespace-nowrap hover:bg-green-700 min-h-[36px]"
        >
          ✓ Gedaan
        </button>
      </div>
    </div>
  )

  if (loading) return <div className="flex items-center justify-center h-40"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1B2A4A]" /></div>

  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-[#1B2A4A]">📅 Planning</h1>
        {isManager && (
          <select value={filter} onChange={e => setFilter(e.target.value)} className="input text-sm max-w-[200px]">
            <option value="alle">Alle medewerkers</option>
            {medewerkers.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        )}
      </div>

      {/* Verlopen */}
      {verlopen.length > 0 && (
        <div>
          <h2 className="text-sm font-bold text-red-600 uppercase mb-3">🔴 Verlopen ({verlopen.length})</h2>
          <div className="space-y-3">
            {verlopen.map(a => <ActieKaart key={a.id} a={a} rood />)}
          </div>
        </div>
      )}

      {/* Vandaag */}
      <div>
        <h2 className="text-sm font-bold text-[#1B2A4A] uppercase mb-3">📅 Vandaag ({vandaag.length})</h2>
        {vandaag.length > 0
          ? <div className="space-y-3">{vandaag.map(a => <ActieKaart key={a.id} a={a} />)}</div>
          : <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center text-green-700 font-medium">Geen acties voor vandaag 🎉</div>
        }
      </div>

      {/* Komende week */}
      <div>
        <h2 className="text-sm font-bold text-[#1B2A4A] uppercase mb-3">📆 Komende week</h2>
        {Object.keys(dezeWeekPerDag).length > 0
          ? Object.entries(dezeWeekPerDag).sort().map(([dag, items]) => (
            <div key={dag} className="mb-4">
              <p className="text-xs font-semibold text-gray-500 mb-2 uppercase">
                {format(new Date(dag), 'EEEE d MMMM', { locale: nl })}
              </p>
              <div className="space-y-3">{items.map(a => <ActieKaart key={a.id} a={a} />)}</div>
            </div>
          ))
          : <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center text-gray-400">Geen acties gepland deze week</div>
        }
      </div>

      {/* Pipeline */}
      <div>
        <h2 className="text-sm font-bold text-[#1B2A4A] uppercase mb-3">🔄 Mijn pipeline</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {pipelineStatussen.map(s => {
            const count = pipelineLeads.filter(l => l.kwalificatiestatus === s).length
            return (
              <div key={s} className={`rounded-xl border p-4 text-center ${STATUS_COLORS[s] ?? 'bg-gray-50 border-gray-200'}`}>
                <p className="text-2xl font-bold">{count}</p>
                <p className="text-xs font-medium mt-1">{STATUS_LABELS[s] ?? s}</p>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
