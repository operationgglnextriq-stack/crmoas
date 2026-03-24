'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { apiFetch } from '@/lib/apiFetch'
import { Deal, TeamMember } from '@/types'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

export default function CommissiesPage() {
  const { teamMember } = useAuth()
  const [deals, setDeals] = useState<Deal[]>([])
  const [leden, setLeden] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedLid, setSelectedLid] = useState<string>('')

  const isManager = teamMember?.rol === 'founder' || teamMember?.rol === 'sales_manager'

  useEffect(() => {
    const fetchAll = async () => {
      const [dealsRes, ledenRes] = await Promise.all([
        apiFetch('/api/crud?table=deals'),
        apiFetch('/api/crud?table=team_members'),
      ])
      const dealsData = await dealsRes.json()
      const ledenData = await ledenRes.json()
      setDeals(Array.isArray(dealsData) ? dealsData : [])
      setLeden(Array.isArray(ledenData) ? ledenData.filter((l: TeamMember) => l.actief) : [])
      setLoading(false)
    }
    fetchAll()
  }, [])

  if (loading) return <LoadingSpinner />

  const naam = teamMember?.naam ?? ''
  const filterNaam = isManager ? (selectedLid || null) : naam

  // Deals gefilterd op persoon
  const gefilterd = deals.filter(d => {
    if (!filterNaam) return true
    return d.closer_naam === filterNaam || d.setter_naam === filterNaam ||
           d.creator_naam === filterNaam || d.ambassadeur_naam === filterNaam
  }).filter(d => d.deal_status === 'gesloten' || d.deal_status === 'betaald' || d.deal_status === 'opgeleverd')

  const getCommissie = (deal: Deal, n: string) => {
    if (deal.closer_naam === n) return deal.commissie_closer ?? 0
    if (deal.setter_naam === n) return deal.commissie_setter ?? 0
    if (deal.creator_naam === n) return deal.commissie_creator ?? 0
    if ((deal as unknown as Record<string,number>).commissie_web_developer && deal.closer_naam !== n && deal.setter_naam !== n && deal.creator_naam !== n) return (deal as unknown as Record<string,number>).commissie_web_developer ?? 0
    return 0
  }

  const totaalOpen = gefilterd.filter(d => !d.commissie_betaald)
    .reduce((s, d) => {
      const n = filterNaam ?? ''
      return s + getCommissie(d, n)
    }, 0)

  const totaalBetaald = gefilterd.filter(d => d.commissie_betaald)
    .reduce((s, d) => {
      const n = filterNaam ?? ''
      return s + getCommissie(d, n)
    }, 0)

  // Manager totaaloverzicht per persoon
  const managerOverzicht = leden.map(lid => {
    const lidDeals = deals.filter(d =>
      (d.deal_status === 'gesloten' || d.deal_status === 'betaald' || d.deal_status === 'opgeleverd') &&
      (d.closer_naam === lid.naam || d.setter_naam === lid.naam || d.creator_naam === lid.naam)
    )
    const open = lidDeals.filter(d => !d.commissie_betaald).reduce((s, d) => s + getCommissie(d, lid.naam), 0)
    const betaald = lidDeals.filter(d => d.commissie_betaald).reduce((s, d) => s + getCommissie(d, lid.naam), 0)
    return { lid, open, betaald, deals: lidDeals.length }
  }).filter(r => r.open > 0 || r.betaald > 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-lg font-bold text-[#1B2A4A]">
          {isManager ? 'Commissies — Overzicht' : `Mijn commissies — ${naam}`}
        </h2>
        {isManager && (
          <select className="input !w-52" value={selectedLid} onChange={e => setSelectedLid(e.target.value)}>
            <option value="">Alle teamleden</option>
            {leden.map(l => <option key={l.id} value={l.naam}>{l.naam}</option>)}
          </select>
        )}
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="card !p-5 border-l-4 border-l-orange-400">
          <p className="text-xs text-gray-500 mb-1">Openstaand</p>
          <p className="text-2xl font-bold text-orange-600">€{totaalOpen.toLocaleString('nl-NL')}</p>
          <p className="text-xs text-gray-400 mt-1">Nog niet uitbetaald</p>
        </div>
        <div className="card !p-5 border-l-4 border-l-green-500">
          <p className="text-xs text-gray-500 mb-1">Uitbetaald</p>
          <p className="text-2xl font-bold text-green-600">€{totaalBetaald.toLocaleString('nl-NL')}</p>
          <p className="text-xs text-gray-400 mt-1">Totaal ontvangen</p>
        </div>
      </div>

      {/* Manager: overzicht per persoon */}
      {isManager && !selectedLid && (
        <div className="card !p-0 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b">
            <h3 className="font-semibold text-gray-700">Overzicht per teamlid</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Naam</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Rol</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-700">Deals</th>
                  <th className="text-right px-4 py-3 font-semibold text-orange-600">Openstaand</th>
                  <th className="text-right px-4 py-3 font-semibold text-green-600">Uitbetaald</th>
                </tr>
              </thead>
              <tbody>
                {managerOverzicht.map((r, i) => (
                  <tr key={r.lid.id} className={`border-b border-gray-100 hover:bg-gray-50 ${i % 2 === 1 ? 'bg-gray-50/50' : ''}`}>
                    <td className="px-4 py-3 font-medium text-[#1B2A4A]">{r.lid.naam}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{r.lid.rol}</td>
                    <td className="px-4 py-3 text-right">{r.deals}</td>
                    <td className="px-4 py-3 text-right font-semibold text-orange-600">€{r.open.toLocaleString('nl-NL')}</td>
                    <td className="px-4 py-3 text-right font-semibold text-green-600">€{r.betaald.toLocaleString('nl-NL')}</td>
                  </tr>
                ))}
                {managerOverzicht.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Geen openstaande commissies</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detail per deal */}
      {(selectedLid || !isManager) && (
        <div className="card !p-0 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b">
            <h3 className="font-semibold text-gray-700">Deals — {filterNaam}</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Bedrijf</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Rol</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-700">Deal waarde</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-700">Commissie</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Status</th>
                </tr>
              </thead>
              <tbody>
                {gefilterd.map((deal, i) => {
                  const n = filterNaam ?? ''
                  const rol = deal.closer_naam === n ? 'Closer' : deal.setter_naam === n ? 'Setter' : deal.creator_naam === n ? 'Creator' : 'Overig'
                  const comm = getCommissie(deal, n)
                  return (
                    <tr key={deal.id} className={`border-b border-gray-100 hover:bg-gray-50 ${i % 2 === 1 ? 'bg-gray-50/50' : ''}`}>
                      <td className="px-4 py-3 font-medium text-[#1B2A4A]">{deal.bedrijfsnaam}</td>
                      <td className="px-4 py-3"><span className="badge bg-purple-100 text-purple-700">{rol}</span></td>
                      <td className="px-4 py-3 text-right">€{(deal.deal_waarde ?? 0).toLocaleString('nl-NL')}</td>
                      <td className="px-4 py-3 text-right font-bold text-[#1A7A3A]">€{comm.toLocaleString('nl-NL')}</td>
                      <td className="px-4 py-3">
                        {deal.commissie_betaald
                          ? <span className="badge bg-green-100 text-green-700">✓ Uitbetaald</span>
                          : <span className="badge bg-orange-100 text-orange-700">⏳ Openstaand</span>}
                      </td>
                    </tr>
                  )
                })}
                {gefilterd.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Geen afgesloten deals gevonden</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
