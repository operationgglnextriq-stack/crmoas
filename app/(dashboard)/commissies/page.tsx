'use client'

import { useEffect, useState, useCallback } from 'react'
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

  const fetchAll = useCallback(async () => {
    const [dealsRes, ledenRes] = await Promise.all([
      apiFetch('/api/crud?table=deals'),
      apiFetch('/api/crud?table=team_members'),
    ])
    const dealsData = await dealsRes.json()
    const ledenData = await ledenRes.json()
    setDeals(Array.isArray(dealsData) ? dealsData : [])
    setLeden(Array.isArray(ledenData) ? ledenData.filter((l: TeamMember) => l.actief) : [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  if (loading) return <LoadingSpinner />

  const naam = teamMember?.naam ?? ''
  const filterNaam = isManager ? (selectedLid || null) : naam

  // Alle deals met commissie-relevante status
  const gesloten = deals.filter(d =>
    d.deal_status === 'gesloten' || d.deal_status === 'betaald' || d.deal_status === 'opgeleverd'
  )

  // Gefilterd op persoon (of alle als manager zonder selectie)
  const gefilterd = filterNaam
    ? gesloten.filter(d =>
        d.closer_naam === filterNaam || d.setter_naam === filterNaam ||
        d.creator_naam === filterNaam || d.ambassadeur_naam === filterNaam
      )
    : gesloten

  const getCommissie = (deal: Deal, n: string) => {
    const lid = leden.find(l => l.naam === n)
    const pct = lid ? lid.commissie_pct / 100 : 0
    const waarde = deal.deal_waarde ?? 0

    let total = 0

    // Closer
    if (deal.closer_naam === n) {
      total += (deal.commissie_closer && deal.commissie_closer > 0)
        ? deal.commissie_closer
        : Math.round(waarde * pct)
    }
    // Setter
    if (deal.setter_naam === n) {
      total += (deal.commissie_setter && deal.commissie_setter > 0)
        ? deal.commissie_setter
        : Math.round(waarde * pct)
    }
    // Creator
    if (deal.creator_naam === n) {
      total += (deal.commissie_creator && deal.commissie_creator > 0)
        ? deal.commissie_creator
        : Math.round(waarde * pct)
    }
    // Ambassadeur
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dealAny = deal as any
    if (dealAny.ambassadeur_naam === n) {
      total += (dealAny.commissie_ambassadeur && dealAny.commissie_ambassadeur > 0)
        ? dealAny.commissie_ambassadeur
        : Math.round(waarde * pct)
    }

    return total
  }

  // Sales manager commissie (5% over alle deals)
  const currentLid = leden.find(l => l.naam === filterNaam)
  const salesManagerCommOpen = currentLid?.rol === 'sales_manager'
    ? gesloten.filter(d => !d.commissie_betaald).reduce((s, d) => s + (d.commissie_manager ?? 0), 0)
    : 0
  const salesManagerCommBetaald = currentLid?.rol === 'sales_manager'
    ? gesloten.filter(d => d.commissie_betaald).reduce((s, d) => s + (d.commissie_manager ?? 0), 0)
    : 0

  // KPI totals
  const totaalOpen = isManager && !selectedLid
    ? gesloten.filter(d => !d.commissie_betaald).reduce((s, d) =>
        s + (d.commissie_closer ?? 0) + (d.commissie_setter ?? 0) + (d.commissie_creator ?? 0) +
        (d.commissie_ambassadeur ?? 0) + (d.commissie_manager ?? 0), 0)
    : gefilterd.filter(d => !d.commissie_betaald).reduce((s, d) =>
        s + getCommissie(d, filterNaam ?? ''), 0) + salesManagerCommOpen

  const totaalBetaald = isManager && !selectedLid
    ? gesloten.filter(d => d.commissie_betaald).reduce((s, d) =>
        s + (d.commissie_closer ?? 0) + (d.commissie_setter ?? 0) + (d.commissie_creator ?? 0) +
        (d.commissie_ambassadeur ?? 0) + (d.commissie_manager ?? 0), 0)
    : gefilterd.filter(d => d.commissie_betaald).reduce((s, d) =>
        s + getCommissie(d, filterNaam ?? ''), 0) + salesManagerCommBetaald

  // Manager overzicht per teamlid (geen filter op €0)
  const managerOverzicht = leden.map(lid => {
    const lidDeals = gesloten.filter(d =>
      d.closer_naam === lid.naam || d.setter_naam === lid.naam ||
      d.creator_naam === lid.naam || d.ambassadeur_naam === lid.naam
    )
    const managerCommOpen = lid.rol === 'sales_manager'
      ? gesloten.filter(d => !d.commissie_betaald).reduce((s, d) => s + (d.commissie_manager ?? 0), 0)
      : 0
    const managerCommBetaald = lid.rol === 'sales_manager'
      ? gesloten.filter(d => d.commissie_betaald).reduce((s, d) => s + (d.commissie_manager ?? 0), 0)
      : 0
    const open = lidDeals.filter(d => !d.commissie_betaald).reduce((s, d) => s + getCommissie(d, lid.naam), 0) + managerCommOpen
    const betaald = lidDeals.filter(d => d.commissie_betaald).reduce((s, d) => s + getCommissie(d, lid.naam), 0) + managerCommBetaald
    return { lid, open, betaald, deals: lidDeals.length }
  })

  // Niet toegewezen deals (alle naam velden leeg)
  const nietToegewezen = gesloten.filter(d =>
    !d.closer_naam && !d.setter_naam && !d.creator_naam
  )

  // Recurring commissies
  const PRODUCT_LABELS_SHORT: Record<string, string> = {
    hosting: 'Hosting', ai_agency: 'AI Agency', comm_klant: 'Comm. Klant',
    comm_extern: 'Comm. Extern', website_std: 'Website', website_maat: 'Maatwerk',
  }
  const recurringFilter = deals.filter(d => d.recurring && ['gesloten', 'betaald', 'opgeleverd'].includes(d.deal_status))
  const recurringDeals: Array<{ deal: Deal; rol: string; maandbedrag: number; commissieMaand: number; product: string }> = []

  for (const deal of recurringFilter) {
    const maandbedrag = deal.recurring_maand_bedrag || Math.round((deal.deal_waarde ?? 0) / 12)
    const product = PRODUCT_LABELS_SHORT[deal.product ?? ''] ?? deal.product ?? '-'

    const addEntry = (lidNaam: string | null, opgeslagenComm: number | null, rol: string) => {
      if (!lidNaam) return
      if (filterNaam && lidNaam !== filterNaam) return
      const lid = leden.find(l => l.naam === lidNaam)
      const pct = lid ? lid.commissie_pct / 100 : 0
      const commissieMaand = opgeslagenComm && opgeslagenComm > 0
        ? Math.round(opgeslagenComm / 12)
        : Math.round(maandbedrag * pct)
      if (commissieMaand > 0) recurringDeals.push({ deal, rol, maandbedrag, commissieMaand, product })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recurringLeden: string[] | null = (deal as any).recurring_commissie_leden
    const heeftSelectie = recurringLeden && recurringLeden.length > 0

    if (heeftSelectie) {
      // Alleen geselecteerde leden
      for (const naam of recurringLeden!) {
        const lid = leden.find(l => l.naam === naam)
        if (!lid) continue
        if (filterNaam && naam !== filterNaam) continue
        const pct = lid.commissie_pct / 100
        const commissieMaand = Math.round(maandbedrag * pct)
        if (commissieMaand > 0) {
          recurringDeals.push({ deal, rol: lid.rol, maandbedrag, commissieMaand, product })
        }
      }
    } else {
      // Fallback: gebruik de naam-velden zoals voorheen
      addEntry(deal.setter_naam, deal.commissie_setter, 'Setter')
      addEntry(deal.closer_naam, deal.commissie_closer, 'Closer')
      addEntry(deal.creator_naam, deal.commissie_creator, 'Creator')
      const sm = leden.find(l => l.rol === 'sales_manager')
      if (sm && (!filterNaam || sm.naam === filterNaam)) {
        const smComm = Math.round(maandbedrag * 0.05)
        if (smComm > 0) recurringDeals.push({ deal, rol: 'Team Manager', maandbedrag, commissieMaand: smComm, product })
      }
    }
  }

  const totalRecurringMaand = recurringDeals.reduce((s, r) => s + r.commissieMaand, 0)

  const handleUitbetalen = async (dealId: string) => {
    await apiFetch('/api/crud', {
      method: 'PATCH',
      body: JSON.stringify({ table: 'deals', id: dealId, data: { commissie_betaald: true } }),
    })
    await fetchAll()
  }

  const statusBadge = (deal: Deal) =>
    deal.commissie_betaald
      ? <span className="badge bg-green-100 text-green-700">✓ Uitbetaald</span>
      : <span className="badge bg-orange-100 text-orange-700">⏳ Openstaand</span>

  return (
    <div className="space-y-6">
      {/* Header */}
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
      <div className="grid grid-cols-3 gap-4">
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
        <div className="card !p-5 border-l-4 border-l-purple-500">
          <p className="text-xs text-gray-500 mb-1">Recurring /maand</p>
          <p className="text-2xl font-bold text-purple-600">€{totalRecurringMaand.toLocaleString('nl-NL')}</p>
          <p className="text-xs text-gray-400 mt-1">Vaste terugkerende commissie</p>
        </div>
      </div>

      {/* Manager: overzicht per persoon + alle deals */}
      {isManager && !selectedLid && (
        <>
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
                    <tr
                      key={r.lid.id}
                      className={`border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${i % 2 === 1 ? 'bg-gray-50/50' : ''}`}
                      onClick={() => setSelectedLid(r.lid.naam)}
                    >
                      <td className="px-4 py-3 font-medium text-[#1B2A4A]">{r.lid.naam}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{r.lid.rol}</td>
                      <td className="px-4 py-3 text-right">{r.deals}</td>
                      <td className="px-4 py-3 text-right font-semibold text-orange-600">€{r.open.toLocaleString('nl-NL')}</td>
                      <td className="px-4 py-3 text-right font-semibold text-green-600">€{r.betaald.toLocaleString('nl-NL')}</td>
                    </tr>
                  ))}
                  {nietToegewezen.length > 0 && (
                    <tr className="border-b border-gray-100 bg-yellow-50/40">
                      <td className="px-4 py-3 font-medium text-gray-500 italic" colSpan={2}>Niet toegewezen</td>
                      <td className="px-4 py-3 text-right text-gray-500">{nietToegewezen.length}</td>
                      <td className="px-4 py-3 text-right font-semibold text-orange-400">
                        €{nietToegewezen.filter(d => !d.commissie_betaald).reduce((s, d) => s + (d.deal_waarde ?? 0), 0).toLocaleString('nl-NL')}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-green-400">€0</td>
                    </tr>
                  )}
                  {managerOverzicht.length === 0 && (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Geen teamleden gevonden</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Alle gesloten deals */}
          <div className="card !p-0 overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b">
              <h3 className="font-semibold text-gray-700">Alle gesloten deals ({gesloten.length})</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">Bedrijf</th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-700">Waarde</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">Status</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">Setter</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">Closer</th>
                    <th className="text-right px-4 py-3 font-semibold text-purple-600">Manager comm.</th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-700">Totale comm.</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">Comm. status</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">Actie</th>
                  </tr>
                </thead>
                <tbody>
                  {gesloten.map((deal, i) => {
                    const totComm = (deal.commissie_closer ?? 0) + (deal.commissie_setter ?? 0) + (deal.commissie_creator ?? 0) + (deal.commissie_ambassadeur ?? 0) + (deal.commissie_manager ?? 0)
                    return (
                      <tr key={deal.id} className={`border-b border-gray-100 hover:bg-gray-50 ${i % 2 === 1 ? 'bg-gray-50/50' : ''}`}>
                        <td className="px-4 py-3 font-medium text-[#1B2A4A]">{deal.bedrijfsnaam}</td>
                        <td className="px-4 py-3 text-right">€{(deal.deal_waarde ?? 0).toLocaleString('nl-NL')}</td>
                        <td className="px-4 py-3">
                          <span className="badge bg-green-100 text-green-700">{deal.deal_status}</span>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{deal.setter_naam ?? '—'}</td>
                        <td className="px-4 py-3 text-gray-600">{deal.closer_naam ?? '—'}</td>
                        <td className="px-4 py-3 text-right font-semibold text-purple-600">€{(deal.commissie_manager ?? 0).toLocaleString('nl-NL')}</td>
                        <td className="px-4 py-3 text-right font-bold text-[#1A7A3A]">€{totComm.toLocaleString('nl-NL')}</td>
                        <td className="px-4 py-3">{statusBadge(deal)}</td>
                        <td className="px-4 py-3">
                          {!deal.commissie_betaald && (
                            <button
                              onClick={() => handleUitbetalen(deal.id)}
                              className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700 transition-colors"
                            >
                              ✓ Uitbetalen
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                  {gesloten.length === 0 && (
                    <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400">Geen gesloten deals</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Niet toegewezen deals sectie */}
          {nietToegewezen.length > 0 && (
            <div className="card !p-0 overflow-hidden">
              <div className="px-4 py-3 bg-yellow-50 border-b border-yellow-200">
                <h3 className="font-semibold text-yellow-800">Niet toegewezen deals ({nietToegewezen.length})</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b">
                      <th className="text-left px-4 py-3 font-semibold text-gray-700">Bedrijfsnaam</th>
                      <th className="text-right px-4 py-3 font-semibold text-gray-700">Deal waarde</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-700">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {nietToegewezen.map((deal, i) => (
                      <tr key={deal.id} className={`border-b border-gray-100 ${i % 2 === 1 ? 'bg-gray-50/50' : ''}`}>
                        <td className="px-4 py-3 font-medium text-[#1B2A4A]">{deal.bedrijfsnaam}</td>
                        <td className="px-4 py-3 text-right">€{(deal.deal_waarde ?? 0).toLocaleString('nl-NL')}</td>
                        <td className="px-4 py-3"><span className="badge bg-gray-100 text-gray-600">{deal.deal_status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Detail per deal (specifiek teamlid of niet-manager) */}
      {/* Sales manager commissie sectie */}
      {(selectedLid || !isManager) && currentLid?.rol === 'sales_manager' && (
        <div className="card !p-5 border-l-4 border-l-purple-500">
          <p className="text-xs text-gray-500 mb-1 font-semibold uppercase tracking-wide">Manager commissie (5% over alle deals)</p>
          <div className="flex gap-6 mt-2">
            <div>
              <p className="text-xs text-gray-400">Openstaand</p>
              <p className="text-xl font-bold text-orange-600">€{salesManagerCommOpen.toLocaleString('nl-NL')}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Uitbetaald</p>
              <p className="text-xl font-bold text-green-600">€{salesManagerCommBetaald.toLocaleString('nl-NL')}</p>
            </div>
          </div>
        </div>
      )}

      {/* Recurring commissies sectie */}
      <div className="card !p-0 overflow-hidden">
        <div className="px-4 py-3 bg-purple-50 border-b border-purple-100 flex items-center gap-2">
          <span>🔄</span>
          <h3 className="font-semibold text-purple-800">Recurring Commissies — Maandoverzicht</h3>
          <span className="ml-auto text-sm text-purple-600 font-medium">
            Totaal/maand: €{totalRecurringMaand.toLocaleString('nl-NL')}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Bedrijf</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Product</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-700">Maandbedrag</th>
                <th className="text-right px-4 py-3 font-semibold text-purple-700">Commissie/maand</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-500">Jaarlijks</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Rol</th>
              </tr>
            </thead>
            <tbody>
              {recurringDeals.map((item, i) => (
                <tr key={item.deal.id + item.rol} className={`border-b border-gray-100 ${i % 2 === 1 ? 'bg-gray-50/50' : ''}`}>
                  <td className="px-4 py-3 font-medium text-[#1B2A4A]">{item.deal.bedrijfsnaam}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{item.product}</td>
                  <td className="px-4 py-3 text-right">€{item.maandbedrag.toLocaleString('nl-NL')}</td>
                  <td className="px-4 py-3 text-right font-bold text-purple-700">€{item.commissieMaand.toLocaleString('nl-NL')}</td>
                  <td className="px-4 py-3 text-right text-gray-500">€{(item.commissieMaand * 12).toLocaleString('nl-NL')}</td>
                  <td className="px-4 py-3"><span className="badge bg-purple-100 text-purple-700">{item.rol}</span></td>
                </tr>
              ))}
              {recurringDeals.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Geen recurring deals</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {(selectedLid || !isManager) && (
        <div className="card !p-0 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b flex items-center justify-between">
            <h3 className="font-semibold text-gray-700">Deals — {filterNaam}</h3>
            {isManager && selectedLid && (
              <button onClick={() => setSelectedLid('')} className="text-xs text-gray-500 hover:text-gray-700">
                ← Terug naar overzicht
              </button>
            )}
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
                  {isManager && <th className="text-left px-4 py-3 font-semibold text-gray-700">Actie</th>}
                </tr>
              </thead>
              <tbody>
                {gefilterd.map((deal, i) => {
                  const n = filterNaam ?? ''
                  const rol = deal.closer_naam === n ? 'Closer' : deal.setter_naam === n ? 'Setter' : deal.creator_naam === n ? 'Creator' : deal.ambassadeur_naam === n ? 'Ambassadeur' : 'Overig'
                  const comm = getCommissie(deal, n)
                  return (
                    <tr key={deal.id} className={`border-b border-gray-100 hover:bg-gray-50 ${i % 2 === 1 ? 'bg-gray-50/50' : ''}`}>
                      <td className="px-4 py-3 font-medium text-[#1B2A4A]">{deal.bedrijfsnaam}</td>
                      <td className="px-4 py-3"><span className="badge bg-purple-100 text-purple-700">{rol}</span></td>
                      <td className="px-4 py-3 text-right">€{(deal.deal_waarde ?? 0).toLocaleString('nl-NL')}</td>
                      <td className="px-4 py-3 text-right font-bold text-[#1A7A3A]">€{comm.toLocaleString('nl-NL')}</td>
                      <td className="px-4 py-3">{statusBadge(deal)}</td>
                      {isManager && (
                        <td className="px-4 py-3">
                          {!deal.commissie_betaald && (
                            <button
                              onClick={() => handleUitbetalen(deal.id)}
                              className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700 transition-colors"
                            >
                              ✓ Uitbetalen
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  )
                })}
                {gefilterd.length === 0 && (
                  <tr>
                    <td colSpan={isManager ? 6 : 5} className="px-4 py-8 text-center text-gray-400">
                      Geen afgesloten deals gevonden
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
