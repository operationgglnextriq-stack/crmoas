'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/context/AuthContext'
import { Deal } from '@/types'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { format, startOfMonth, endOfMonth, subMonths, addDays, isAfter } from 'date-fns'
import { nl } from 'date-fns/locale'

interface CommissiePersoon {
  naam: string
  rol: string
  deals: number
  omzet: number
  teBetalen: number
  betaald: number
  openstaand: number
  dealIds: string[]
}

export default function CommissiesPage() {
  const { teamMember } = useAuth()
  const supabase = createClient()
  const [deals, setDeals] = useState<Deal[]>([])
  const [loading, setLoading] = useState(true)
  const [maand, setMaand] = useState(format(new Date(), 'yyyy-MM'))

  const isManager = teamMember?.rol === 'founder' || teamMember?.rol === 'sales_manager'

  useEffect(() => {
    if (!isManager) return
    const date = new Date(maand + '-01')
    const start = startOfMonth(date).toISOString()
    const end = endOfMonth(date).toISOString()
    supabase.from('deals')
      .select('*')
      .gte('created_at', start)
      .lte('created_at', end)
      .then(({ data }) => {
        setDeals(data ?? [])
        setLoading(false)
      })
  }, [maand, isManager])

  const markeerBetaald = async (dealIds: string[]) => {
    await supabase.from('deals').update({ commissie_betaald: true }).in('id', dealIds)
    setDeals(prev => prev.map(d => dealIds.includes(d.id) ? { ...d, commissie_betaald: true } : d))
  }

  if (!isManager) {
    return (
      <div className="card text-center py-12 text-gray-400">
        Geen toegang tot commissies overzicht.
      </div>
    )
  }

  if (loading) return <LoadingSpinner />

  // Calculate commissies per persoon
  const personenMap: Record<string, CommissiePersoon> = {}

  const ensurePersoon = (naam: string, rol: string) => {
    if (!personenMap[naam]) {
      personenMap[naam] = { naam, rol, deals: 0, omzet: 0, teBetalen: 0, betaald: 0, openstaand: 0, dealIds: [] }
    }
  }

  // Manager Kim gets 5% of all deals this month
  const totaleOmzetMaand = deals.reduce((s, d) => s + (d.deal_waarde ?? 0), 0)
  const kimCommissie = totaleOmzetMaand * 0.05

  deals.forEach(deal => {
    const waarde = deal.deal_waarde ?? 0
    const is30DagenNa = deal.betaaldatum
      ? isAfter(new Date(), addDays(new Date(deal.betaaldatum), 30))
      : false

    // Setter commissie 6%
    if (deal.setter_naam) {
      ensurePersoon(deal.setter_naam, 'Setter')
      const p = personenMap[deal.setter_naam]
      const c = waarde * 0.06
      p.deals++
      p.omzet += waarde
      p.dealIds.push(deal.id)
      if (deal.commissie_betaald) p.betaald += c
      else if (is30DagenNa && deal.betaling_ontvangen) p.teBetalen += c
      else p.openstaand += c
    }

    // Closer commissie 10%
    if (deal.closer_naam) {
      ensurePersoon(deal.closer_naam, 'Closer')
      const p = personenMap[deal.closer_naam]
      const c = waarde * 0.10
      if (!deal.setter_naam || deal.closer_naam !== deal.setter_naam) p.deals++
      p.omzet += deal.setter_naam === deal.closer_naam ? 0 : waarde
      p.dealIds.push(deal.id)
      if (deal.commissie_betaald) p.betaald += c
      else if (is30DagenNa && deal.betaling_ontvangen) p.teBetalen += c
      else p.openstaand += c
    }

    // Creator/ambassadeur 10%
    if (deal.creator_naam) {
      ensurePersoon(deal.creator_naam, 'Creator')
      const p = personenMap[deal.creator_naam]
      const c = waarde * 0.10
      p.deals++
      p.omzet += waarde
      p.dealIds.push(deal.id)
      if (deal.commissie_betaald) p.betaald += c
      else if (is30DagenNa && deal.betaling_ontvangen) p.teBetalen += c
      else p.openstaand += c
    }
  })

  const personen = Object.values(personenMap)

  // Add Kim as sales manager
  const kimBetaald = deals.filter(d => d.commissie_betaald).reduce((s, d) => s + (d.deal_waarde ?? 0), 0) * 0.05
  const kimTeBetalen = kimCommissie - kimBetaald

  const fmt = (n: number) => `€${Math.round(n).toLocaleString('nl-NL')}`

  // Months for selector
  const maanden = Array.from({ length: 12 }, (_, i) => {
    const d = subMonths(new Date(), i)
    return { value: format(d, 'yyyy-MM'), label: format(d, 'MMMM yyyy', { locale: nl }) }
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <select
          value={maand}
          onChange={e => { setMaand(e.target.value); setLoading(true) }}
          className="input !w-48"
        >
          {maanden.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
        <div className="text-sm text-gray-500">
          Totale omzet: <span className="font-bold text-[#1B2A4A]">{fmt(totaleOmzetMaand)}</span>
        </div>
      </div>

      {/* Kim manager commissie */}
      <div className="card border-l-4 border-l-[#6B3FA0]">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-[#1B2A4A]">Kim — Sales Manager</p>
            <p className="text-xs text-gray-500 mt-0.5">5% van totale maandomzet</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-[#6B3FA0]">{fmt(kimCommissie)}</p>
            <p className="text-xs text-gray-500">Te betalen: {fmt(Math.max(0, kimTeBetalen))}</p>
          </div>
        </div>
      </div>

      {/* Team commissies tabel */}
      <div className="card !p-0 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="font-semibold text-[#1B2A4A]">Team commissies</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Naam</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Rol</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-700">Deals</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-700">Omzet</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-700">Te betalen</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-700">Betaald</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-700">Openstaand</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Actie</th>
              </tr>
            </thead>
            <tbody>
              {personen.map((p, i) => {
                const isLaat = p.openstaand > 0
                return (
                  <tr key={p.naam} className={`border-b border-gray-100 ${i % 2 === 1 ? 'bg-gray-50/50' : ''} ${isLaat ? 'bg-red-50/30' : ''}`}>
                    <td className="px-4 py-3 font-medium text-[#1B2A4A]">{p.naam}</td>
                    <td className="px-4 py-3 text-gray-500">{p.rol}</td>
                    <td className="px-4 py-3 text-right">{p.deals}</td>
                    <td className="px-4 py-3 text-right font-medium">{fmt(p.omzet)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-[#1A7A3A]">{fmt(p.teBetalen)}</td>
                    <td className="px-4 py-3 text-right text-gray-500">{fmt(p.betaald)}</td>
                    <td className="px-4 py-3 text-right">
                      {p.openstaand > 0 ? (
                        <span className="text-[#CC0000] font-semibold">⚠️ {fmt(p.openstaand)}</span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {p.teBetalen > 0 && (
                        <button
                          onClick={() => markeerBetaald(p.dealIds)}
                          className="text-xs px-3 py-1 rounded bg-green-50 text-green-700 hover:bg-green-100 border border-green-200"
                        >
                          ✓ Betaald
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
              {personen.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-400">
                    Geen deals gevonden voor deze maand
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Info */}
      <div className="card !p-4 bg-blue-50 border-blue-200">
        <p className="text-xs text-blue-700 font-medium">ℹ️ Commissies worden uitbetaald na 30 dagen na de betaaldatum. Rood = uitbetaling &gt;30 dagen uitstaat.</p>
        <p className="text-xs text-blue-600 mt-1">Setter: 6% · Closer: 10% · Creator/Ambassadeur: 10% · Manager: 5% van maandomzet</p>
      </div>
    </div>
  )
}
