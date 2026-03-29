'use client'
export const dynamic = "force-dynamic";

import { useEffect, useState, useCallback } from 'react'
import { apiFetch } from '@/lib/apiFetch'
import { useAuth } from '@/context/AuthContext'
import { LeadActie, ActieType } from '@/types'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import Link from 'next/link'
import { format } from 'date-fns'
import { nl } from 'date-fns/locale'

const ACTIE_LABELS: Record<ActieType, string> = {
  eerste_contact: 'Eerste contact',
  follow_up_1: 'Follow-up 1',
  follow_up_2: 'Follow-up 2',
  follow_up_3: 'Follow-up 3',
  terugbellen: 'Terugbellen',
  offerte_sturen: 'Offerte sturen',
}

interface ActieMetBedrijf extends LeadActie {
  leads?: { bedrijfsnaam: string } | null
}

export default function VandaagPage() {
  const { teamMember, loading: authLoading } = useAuth()
  const [vandaag, setVandaag] = useState<ActieMetBedrijf[]>([])
  const [openstaand, setOpenstaand] = useState<ActieMetBedrijf[]>([])
  const [loading, setLoading] = useState(true)
  const [filterMedewerker, setFilterMedewerker] = useState('')
  const [medewerkers, setMedewerkers] = useState<string[]>([])

  const isManager = teamMember?.rol === 'founder' || teamMember?.rol === 'sales_manager'

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [vandaagRes, openstaandRes] = await Promise.all([
      apiFetch('/api/lead-acties?vandaag=true'),
      apiFetch('/api/lead-acties?openstaand=true'),
    ])
    const vandaagData: ActieMetBedrijf[] = await vandaagRes.json()
    const openstaandData: ActieMetBedrijf[] = await openstaandRes.json()

    setVandaag(Array.isArray(vandaagData) ? vandaagData : [])
    setOpenstaand(Array.isArray(openstaandData) ? openstaandData : [])

    // Collect unique medewerkers for manager filter
    const alle = [...(Array.isArray(vandaagData) ? vandaagData : []), ...(Array.isArray(openstaandData) ? openstaandData : [])]
    setMedewerkers(Array.from(new Set(alle.map(a => a.toegewezen_aan))))
    setLoading(false)
  }, [])

  useEffect(() => {
    if (authLoading) return
    if (!teamMember) { setLoading(false); return }
    fetchData()
  }, [teamMember, authLoading, fetchData])

  const handleGedaan = async (id: string) => {
    await apiFetch(`/api/lead-acties/${id}`, { method: 'PATCH' })
    fetchData()
  }

  const filterActies = (lijst: ActieMetBedrijf[]) => {
    if (!isManager) return lijst.filter(a => a.toegewezen_aan === teamMember?.naam)
    if (filterMedewerker) return lijst.filter(a => a.toegewezen_aan === filterMedewerker)
    return lijst
  }

  if (loading) return <LoadingSpinner />

  const vandaagFiltered = filterActies(vandaag)
  const openstaandFiltered = filterActies(openstaand)

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-[#1B2A4A]">📅 Vandaag te doen</h2>
          <p className="text-sm text-gray-500">{format(new Date(), 'EEEE d MMMM yyyy', { locale: nl })}</p>
        </div>
        {isManager && medewerkers.length > 0 && (
          <select
            value={filterMedewerker}
            onChange={e => setFilterMedewerker(e.target.value)}
            className="input w-auto"
          >
            <option value="">Alle medewerkers</option>
            {medewerkers.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        )}
      </div>

      {/* Vandaag sectie */}
      <div className="space-y-3">
        {vandaagFiltered.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-2xl mb-2">🎉</p>
            <p className="text-gray-500 font-medium">Geen acties voor vandaag</p>
            <p className="text-sm text-gray-400 mt-1">Je bent helemaal bij!</p>
          </div>
        ) : (
          vandaagFiltered.map(actie => (
            <ActieKaart key={actie.id} actie={actie} onGedaan={handleGedaan} />
          ))
        )}
      </div>

      {/* Openstaand / achterstallig sectie */}
      {openstaandFiltered.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-orange-700 flex items-center gap-2">
            <span>⚠️</span>
            <span>Openstaand ({openstaandFiltered.length})</span>
          </h3>
          {openstaandFiltered.map(actie => (
            <ActieKaart key={actie.id} actie={actie} onGedaan={handleGedaan} overdue />
          ))}
        </div>
      )}
    </div>
  )
}

function ActieKaart({
  actie,
  onGedaan,
  overdue = false,
}: {
  actie: ActieMetBedrijf
  onGedaan: (id: string) => void
  overdue?: boolean
}) {
  return (
    <div className={`card !p-4 border-l-4 ${overdue ? 'border-l-orange-400 bg-orange-50/30' : 'border-l-[#1B2A4A]'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-semibold text-[#1B2A4A] text-sm">
              {ACTIE_LABELS[actie.type as ActieType] ?? actie.type}
            </span>
            {actie.leads?.bedrijfsnaam && (
              <Link
                href={`/leads/${actie.lead_id}`}
                className="text-xs text-blue-600 hover:underline"
              >
                {actie.leads.bedrijfsnaam}
              </Link>
            )}
          </div>
          <div className="flex items-center gap-3 flex-wrap text-xs text-gray-500">
            <span>📅 {format(new Date(actie.gepland_op), 'HH:mm', { locale: nl })}</span>
            <span>👤 {actie.toegewezen_aan}</span>
            {overdue && (
              <span className="text-orange-600 font-medium">
                {format(new Date(actie.gepland_op), 'd MMM', { locale: nl })}
              </span>
            )}
          </div>
          {actie.notitie && (
            <p className="text-xs text-gray-500 mt-1.5 italic">{actie.notitie}</p>
          )}
        </div>
        <button
          onClick={() => onGedaan(actie.id)}
          className={`text-xs px-3 py-1.5 rounded-lg font-medium flex-shrink-0 ${
            overdue
              ? 'bg-orange-100 text-orange-700 hover:bg-orange-200'
              : 'bg-green-100 text-green-700 hover:bg-green-200'
          }`}
        >
          ✓ Gedaan
        </button>
      </div>
    </div>
  )
}
