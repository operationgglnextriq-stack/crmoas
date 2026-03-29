'use client'
export const dynamic = "force-dynamic";

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { apiFetch } from '@/lib/apiFetch'
import { useAuth } from '@/context/AuthContext'
import { Lead, ProductInteresse } from '@/types'
import { BANTBadge, KwalificatieBadge } from '@/components/ui/Badge'
import { calcBANT } from '@/types'
import { ConfirmModal } from '@/components/ui/Modal'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import Link from 'next/link'
import { format } from 'date-fns'
import { nl } from 'date-fns/locale'

const PRODUCT_PILLS: { label: string; value: ProductInteresse | '' }[] = [
  { label: 'Alle producten', value: '' },
  { label: 'Website', value: 'website' },
  { label: 'AI Scan', value: 'ai_scan' },
  { label: 'AI Agency', value: 'ai_agency' },
  { label: 'InkApprove', value: 'ink' },
  { label: 'Community', value: 'community' },
  { label: 'Onbekend', value: 'onbekend' },
]

export default function LeadsPage() {
  const { teamMember, loading: authLoading } = useAuth()
  const supabase = createClient()
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterSetter, setFilterSetter] = useState('')
  const [filterKanaal, setFilterKanaal] = useState('')
  const [filterSector, setFilterSector] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterProduct, setFilterProduct] = useState<ProductInteresse | ''>('')
  const [showDuplicaten, setShowDuplicaten] = useState(false)
  const [filterKoud, setFilterKoud] = useState(false)
  const [setters, setSetters] = useState<string[]>([])
  const [deleteTarget, setDeleteTarget] = useState<Lead | null>(null)

  const isManager = teamMember?.rol === 'founder' || teamMember?.rol === 'sales_manager'

  const fetchLeads = useCallback(async () => {
    let query = supabase.from('leads').select('*').order('created_at', { ascending: false })
    if (!isManager && teamMember) query = query.eq('setter_naam', teamMember.naam)
    const { data } = await query
    setLeads(data ?? [])
    setSetters(Array.from(new Set((data ?? []).map((l: Lead) => l.setter_naam))))
    setLoading(false)
  }, [teamMember, isManager])

  useEffect(() => {
    if (authLoading) return
    if (!teamMember) { setLoading(false); return }
    fetchLeads()
  }, [teamMember, authLoading, fetchLeads])

  const filtered = leads.filter(l => {
    if (search && !l.bedrijfsnaam.toLowerCase().includes(search.toLowerCase())) return false
    if (filterSetter && l.setter_naam !== filterSetter) return false
    if (filterKanaal && l.kanaal !== filterKanaal) return false
    if (filterSector && l.sector !== filterSector) return false
    if (filterStatus && l.kwalificatiestatus !== filterStatus) return false
    if (filterProduct && l.product_interesse !== filterProduct) return false
    if (showDuplicaten && !l.is_duplicaat) return false
    if (filterKoud && !(l.kanaal === 'outbound' || l.kwalificatiestatus?.startsWith('followup'))) return false
    return true
  })

  const handleDelete = async (lead: Lead) => {
    await apiFetch('/api/crud', { method: 'DELETE', body: JSON.stringify({table:'leads', id: lead.id}) })
    setLeads(prev => prev.filter(l => l.id !== lead.id))
  }

  const handleNaarDeal = async (lead: Lead) => {
    const { error } = await supabase.from('deals').insert({
      lead_id: lead.id, bedrijfsnaam: lead.bedrijfsnaam,
      deal_status: 'call', closer_naam: lead.closer_naam,
      setter_naam: lead.setter_naam, kanaal: lead.kanaal,
    })
    if (!error) alert(`Deal aangemaakt voor ${lead.bedrijfsnaam}!`)
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-gray-500 text-sm">{filtered.length} leads gevonden</p>
        {/* Desktop new lead button */}
        <Link href="/leads/nieuw" className="btn-primary hidden md:inline-flex">+ Nieuwe lead</Link>
      </div>

      {/* Product filter pills */}
      <div className="flex flex-wrap gap-2">
        {PRODUCT_PILLS.map(pill => (
          <button
            key={pill.value}
            onClick={() => setFilterProduct(pill.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              filterProduct === pill.value
                ? 'bg-[#1B2A4A] text-white'
                : 'border border-gray-300 text-gray-600 hover:border-[#1B2A4A] hover:text-[#1B2A4A]'
            }`}
          >
            {pill.label}
          </button>
        ))}
      </div>

      {/* Filter bar — sticky on mobile */}
      <div className="card !p-3 md:!p-4 sticky top-12 md:top-16 z-10 shadow-md md:shadow-sm">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 md:gap-3">
          <input
            placeholder="🔍 Bedrijfsnaam..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input col-span-2 md:col-span-1"
          />
          {isManager && (
            <select value={filterSetter} onChange={e => setFilterSetter(e.target.value)} className="input">
              <option value="">Alle setters</option>
              {setters.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          )}
          <select value={filterKanaal} onChange={e => setFilterKanaal(e.target.value)} className="input">
            <option value="">Alle kanalen</option>
            {['instagram_dm','tiktok','linkedin','biolink','outbound','referral','checkout','whatsapp','web_form'].map(k => (
              <option key={k} value={k}>{k.replace(/_/g,' ')}</option>
            ))}
          </select>
          <select value={filterSector} onChange={e => setFilterSector(e.target.value)} className="input">
            <option value="">Alle sectoren</option>
            {['ecommerce','horeca','zakelijk','zorg','bouw','retail','tech','schoonmaak','finance','overig'].map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="input">
            <option value="">Alle statussen</option>
            {['warm','followup_1','followup_2','followup_3','geboekt','niet','afwijzing'].map(s => (
              <option key={s} value={s}>{s.replace('_',' ')}</option>
            ))}
          </select>
          <div className="col-span-2 md:col-span-1 flex gap-3 items-center">
            <label className="flex items-center gap-1.5 text-sm cursor-pointer">
              <input type="checkbox" checked={filterKoud} onChange={e => setFilterKoud(e.target.checked)} className="rounded" />
              Koud
            </label>
            <label className="flex items-center gap-1.5 text-sm cursor-pointer">
              <input type="checkbox" checked={showDuplicaten} onChange={e => setShowDuplicaten(e.target.checked)} className="rounded" />
              Duplicaten
            </label>
          </div>
        </div>
      </div>

      {/* Mobile card view */}
      <div className="md:hidden space-y-3">
        {filtered.map(lead => (
          <div key={lead.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex-1 min-w-0">
                <span className="font-semibold text-[#1B2A4A] text-sm leading-tight block truncate">
                  {lead.bedrijfsnaam}
                </span>
                {lead.is_duplicaat && (
                  <span className="badge bg-orange-100 text-orange-800 text-xs mt-0.5">Duplicaat</span>
                )}
                {lead.contactpersoon && (
                  <p className="text-xs text-gray-400 mt-0.5 truncate">{lead.contactpersoon}</p>
                )}
              </div>
              <KwalificatieBadge status={lead.kwalificatiestatus} />
            </div>
            <div className="flex items-center gap-2 flex-wrap mb-3">
              <BANTBadge score={calcBANT(lead)} />
              {lead.product_interesse && (
                <span className="text-xs text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">
                  {lead.product_interesse.replace(/_/g,' ')}
                </span>
              )}
              {lead.kanaal && (
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                  {lead.kanaal.replace(/_/g,' ')}
                </span>
              )}
              {lead.sector && (
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                  {lead.sector}
                </span>
              )}
              <span className="text-xs text-gray-400 ml-auto">
                {format(new Date(lead.created_at), 'd MMM', { locale: nl })}
              </span>
            </div>
            {lead.setter_naam && (
              <p className="text-xs text-gray-500 mb-3">🎯 {lead.setter_naam}</p>
            )}
            <div className="flex gap-2 border-t border-gray-100 pt-3">
              <Link
                href={`/leads/${lead.id}`}
                className="flex-1 text-center text-xs py-2 rounded-lg bg-blue-50 text-blue-700 font-medium"
              >
                Bekijk
              </Link>
              {isManager && (
                <>
                  <button
                    onClick={() => handleNaarDeal(lead)}
                    className="flex-1 text-xs py-2 rounded-lg bg-green-50 text-green-700 font-medium"
                  >
                    → Deal
                  </button>
                  <button
                    onClick={() => setDeleteTarget(lead)}
                    className="px-4 text-xs py-2 rounded-lg bg-red-50 text-red-700 font-medium"
                  >
                    ×
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-12 text-gray-400">Geen leads gevonden</div>
        )}
      </div>

      {/* Desktop table view */}
      <div className="card !p-0 overflow-hidden hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Bedrijf</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Setter</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Kanaal</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Sector</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Product</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">BANT</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Status</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Datum</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Acties</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((lead, i) => (
                <tr key={lead.id} className={`border-b border-gray-100 hover:bg-gray-50 ${i % 2 === 1 ? 'bg-gray-50/50' : ''}`}>
                  <td className="px-4 py-3">
                    <div>
                      <span className="font-medium text-[#1B2A4A]">{lead.bedrijfsnaam}</span>
                      {lead.is_duplicaat && <span className="ml-2 badge bg-orange-100 text-orange-800 text-xs">Dup.</span>}
                      {lead.contactpersoon && <p className="text-xs text-gray-400">{lead.contactpersoon}</p>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{lead.setter_naam}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{lead.kanaal?.replace(/_/g,' ')}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{lead.sector}</td>
                  <td className="px-4 py-3">
                    {lead.product_interesse ? (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                        {lead.product_interesse.replace(/_/g,' ')}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3"><BANTBadge score={calcBANT(lead)} /></td>
                  <td className="px-4 py-3"><KwalificatieBadge status={lead.kwalificatiestatus} /></td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{format(new Date(lead.created_at), 'd MMM', { locale: nl })}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <Link href={`/leads/${lead.id}`} className="text-xs px-2 py-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100">Bekijk</Link>
                      {isManager && (
                        <>
                          <button onClick={() => handleNaarDeal(lead)} className="text-xs px-2 py-1 rounded bg-green-50 text-green-700 hover:bg-green-100">→ Deal</button>
                          <button onClick={() => setDeleteTarget(lead)} className="text-xs px-2 py-1 rounded bg-red-50 text-red-700 hover:bg-red-100">×</button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={9} className="px-4 py-12 text-center text-gray-400">Geen leads gevonden</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
        title="Lead verwijderen"
        message={`Weet je zeker dat je "${deleteTarget?.bedrijfsnaam}" wilt verwijderen?`}
      />

      {/* Floating Action Button — mobile only */}
      <Link
        href="/leads/nieuw"
        className="fixed bottom-20 right-4 w-14 h-14 bg-[#6B3FA0] text-white rounded-full shadow-lg flex items-center justify-center text-2xl font-bold md:hidden z-30 active:scale-95 transition-transform"
        aria-label="Nieuwe lead"
      >
        +
      </Link>
    </div>
  )
}
