'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'
import { apiFetch } from '@/lib/apiFetch'
import { Deal, DealStatus } from '@/types'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

const STATUS_LABELS: Record<DealStatus, string> = {
  call: '📞 Call',
  offerte: '📄 Offerte',
  onderhand: '🤝 Onderhandeling',
  gesloten: '✅ Gesloten',
  betaald: '💰 Betaald',
  levering: '🔄 Levering',
  opgeleverd: '🏁 Opgeleverd',
  verloren: '❌ Verloren',
}

const STATUS_COLORS: Record<DealStatus, string> = {
  call: 'bg-blue-100 text-blue-700',
  offerte: 'bg-purple-100 text-purple-700',
  onderhand: 'bg-yellow-100 text-yellow-700',
  gesloten: 'bg-green-100 text-green-700',
  betaald: 'bg-green-200 text-green-800',
  levering: 'bg-orange-100 text-orange-700',
  opgeleverd: 'bg-teal-100 text-teal-700',
  verloren: 'bg-red-100 text-red-700',
}

const PRODUCT_LABELS: Record<string, string> = {
  website_std: 'Website Std',
  website_maat: 'Website Maat',
  hosting: 'Hosting',
  ai_scan_pro: 'AI Scan Pro',
  ai_scan_dig: 'AI Scan Dig',
  ai_agency: 'AI Agency',
  ink: 'INK',
  comm_klant: 'Comm. Klant',
  comm_extern: 'Comm. Extern',
}

const ACTIEVE_STATUSSEN: DealStatus[] = ['call', 'offerte', 'onderhand', 'gesloten', 'betaald', 'levering']
const GESLOTEN_STATUSSEN: DealStatus[] = ['gesloten', 'betaald', 'opgeleverd']

export default function DealsPage() {
  const { teamMember } = useAuth()
  const [deals, setDeals] = useState<Deal[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<DealStatus | ''>('')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const isManager = teamMember?.rol === 'founder' || teamMember?.rol === 'sales_manager'

  const fetchDeals = useCallback(async () => {
    const res = await apiFetch('/api/crud?table=deals')
    const data = await res.json()
    setDeals(Array.isArray(data) ? data : [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchDeals() }, [fetchDeals])

  if (loading) return <LoadingSpinner />

  const gefilterd = filterStatus ? deals.filter(d => d.deal_status === filterStatus) : deals

  const pipelineWaarde = deals
    .filter(d => ACTIEVE_STATUSSEN.includes(d.deal_status))
    .reduce((s, d) => s + (d.deal_waarde ?? 0), 0)

  const aantalGesloten = deals.filter(d => GESLOTEN_STATUSSEN.includes(d.deal_status)).length

  const totaleOmzet = deals
    .filter(d => GESLOTEN_STATUSSEN.includes(d.deal_status))
    .reduce((s, d) => s + (d.deal_waarde ?? 0), 0)

  const handleDelete = async (id: string) => {
    if (!confirm('Weet je zeker dat je deze deal wilt verwijderen?')) return
    setDeletingId(id)
    await apiFetch('/api/crud', {
      method: 'DELETE',
      body: JSON.stringify({ table: 'deals', id }),
    })
    await fetchDeals()
    setDeletingId(null)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-lg font-bold text-[#1B2A4A]">💼 Alle Deals</h2>
        <select
          className="input !w-48"
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value as DealStatus | '')}
        >
          <option value="">Alle statussen</option>
          {(Object.keys(STATUS_LABELS) as DealStatus[]).map(s => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card !p-5 border-l-4 border-l-[#1B2A4A]">
          <p className="text-xs text-gray-500 mb-1">Pipeline waarde</p>
          <p className="text-2xl font-bold text-[#1B2A4A]">€{pipelineWaarde.toLocaleString('nl-NL')}</p>
          <p className="text-xs text-gray-400 mt-1">Actieve deals</p>
        </div>
        <div className="card !p-5 border-l-4 border-l-green-500">
          <p className="text-xs text-gray-500 mb-1">Gesloten deals</p>
          <p className="text-2xl font-bold text-green-600">{aantalGesloten}</p>
          <p className="text-xs text-gray-400 mt-1">Gesloten / betaald / opgeleverd</p>
        </div>
        <div className="card !p-5 border-l-4 border-l-[#6B3FA0]">
          <p className="text-xs text-gray-500 mb-1">Totale omzet</p>
          <p className="text-2xl font-bold text-[#6B3FA0]">€{totaleOmzet.toLocaleString('nl-NL')}</p>
          <p className="text-xs text-gray-400 mt-1">Gesloten + betaald + opgeleverd</p>
        </div>
      </div>

      {/* Tabel */}
      <div className="card !p-0 overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b">
          <h3 className="font-semibold text-gray-700">Deals ({gefilterd.length})</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Bedrijfsnaam</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Product</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-700">Waarde</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Status</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Setter</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Closer</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Datum</th>
                {isManager && <th className="text-left px-4 py-3 font-semibold text-gray-700">Acties</th>}
              </tr>
            </thead>
            <tbody>
              {gefilterd.map((deal, i) => (
                <tr
                  key={deal.id}
                  className={`border-b border-gray-100 hover:bg-gray-50 ${i % 2 === 1 ? 'bg-gray-50/50' : ''}`}
                >
                  <td className="px-4 py-3 font-medium text-[#1B2A4A]">{deal.bedrijfsnaam}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {deal.product ? (PRODUCT_LABELS[deal.product] ?? deal.product) : '—'}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">
                    €{(deal.deal_waarde ?? 0).toLocaleString('nl-NL')}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`badge ${STATUS_COLORS[deal.deal_status]}`}>
                      {STATUS_LABELS[deal.deal_status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{deal.setter_naam ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{deal.closer_naam ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {new Date(deal.created_at).toLocaleDateString('nl-NL')}
                  </td>
                  {isManager && (
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleDelete(deal.id)}
                        disabled={deletingId === deal.id}
                        className="text-xs text-red-500 hover:text-red-700 transition-colors disabled:opacity-50"
                        title="Verwijderen"
                      >
                        {deletingId === deal.id ? '...' : '🗑️'}
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {gefilterd.length === 0 && (
                <tr>
                  <td
                    colSpan={isManager ? 8 : 7}
                    className="px-4 py-12 text-center text-gray-400"
                  >
                    Geen deals gevonden
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
