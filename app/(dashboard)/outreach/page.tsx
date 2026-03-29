'use client'
export const dynamic = "force-dynamic";

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/context/AuthContext'
import { OutreachLead, ProductInteresse } from '@/types'
import { OutreachStatusBadge } from '@/components/ui/Badge'
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

export default function OutreachPage() {
  const { teamMember } = useAuth()
  const supabase = createClient()
  const [items, setItems] = useState<OutreachLead[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterOutreacher, setFilterOutreacher] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterMethode, setFilterMethode] = useState('')
  const [filterProduct, setFilterProduct] = useState<ProductInteresse | ''>('')
  const [outreachers, setOutreachers] = useState<string[]>([])
  const [deleteTarget, setDeleteTarget] = useState<OutreachLead | null>(null)

  const isManager = teamMember?.rol === 'founder' || teamMember?.rol === 'sales_manager'

  const fetchData = useCallback(async () => {
    let query = supabase.from('outreach_leads').select('*').order('created_at', { ascending: false })
    if (!isManager && teamMember) query = query.eq('outreacher_naam', teamMember.naam)
    const { data } = await query
    setItems(data ?? [])
    setOutreachers(Array.from(new Set((data ?? []).map((i: OutreachLead) => i.outreacher_naam))))
    setLoading(false)
  }, [teamMember, isManager])

  useEffect(() => { if (teamMember) fetchData() }, [teamMember, fetchData])

  const filtered = items.filter(i => {
    if (search && !i.bedrijfsnaam.toLowerCase().includes(search.toLowerCase())) return false
    if (filterOutreacher && i.outreacher_naam !== filterOutreacher) return false
    if (filterStatus && i.status !== filterStatus) return false
    if (filterMethode && i.methode !== filterMethode) return false
    if (filterProduct && i.product_interesse !== filterProduct) return false
    return true
  })

  const handleDelete = async (item: OutreachLead) => {
    const { error } = await supabase.from('outreach_leads').delete().eq('id', item.id)
    if (error) {
      alert('Verwijderen mislukt: ' + error.message)
      return
    }
    setItems(prev => prev.filter(i => i.id !== item.id))
  }

  const handleOmzettenNaarLead = async (item: OutreachLead) => {
    const { data: lead, error } = await supabase.from('leads').insert({
      bedrijfsnaam: item.bedrijfsnaam, website: item.website,
      contactpersoon: item.contactpersoon, telefoonnummer: item.telefoonnummer,
      emailadres: item.emailadres, sector: item.sector,
      setter_naam: item.outreacher_naam, kanaal: 'outbound',
      pijnpunt: item.pijnpunt, notities: item.notities, afdeling: 'outreach',
      product_interesse: item.product_interesse ?? null,
    }).select().single()
    if (!error && lead) {
      await supabase.from('outreach_leads').update({ omgezet_naar_lead: true, lead_id: lead.id }).eq('id', item.id)
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, omgezet_naar_lead: true, lead_id: lead.id } : i))
      alert(`${item.bedrijfsnaam} omgezet naar lead!`)
    }
  }

  if (loading) return <LoadingSpinner />

  const stats = {
    benaderd: items.filter(i => i.status === 'benaderd').length,
    interesse: items.filter(i => i.status === 'interesse').length,
    afspraak: items.filter(i => i.status === 'afspraak_gemaakt').length,
    conversie: items.length > 0 ? Math.round((items.filter(i => i.omgezet_naar_lead).length / items.length) * 100) : 0,
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-4">
        <div className="card !p-4 border-l-4 border-l-blue-400">
          <p className="text-xs text-gray-500">Benaderd</p>
          <p className="text-2xl font-bold text-blue-600">{stats.benaderd}</p>
        </div>
        <div className="card !p-4 border-l-4 border-l-yellow-400">
          <p className="text-xs text-gray-500">Interesse</p>
          <p className="text-2xl font-bold text-yellow-600">{stats.interesse}</p>
        </div>
        <div className="card !p-4 border-l-4 border-l-green-400">
          <p className="text-xs text-gray-500">Afspraken</p>
          <p className="text-2xl font-bold text-green-600">{stats.afspraak}</p>
        </div>
        <div className="card !p-4 border-l-4 border-l-[#6B3FA0]">
          <p className="text-xs text-gray-500">Conversie %</p>
          <p className="text-2xl font-bold text-[#6B3FA0]">{stats.conversie}%</p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-gray-500 text-sm">{filtered.length} contacten</p>
        <Link href="/outreach/nieuw" className="btn-primary">+ Nieuw contact</Link>
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

      <div className="card !p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <input placeholder="🔍 Bedrijfsnaam..." value={search} onChange={e => setSearch(e.target.value)} className="input" />
          {isManager && (
            <select value={filterOutreacher} onChange={e => setFilterOutreacher(e.target.value)} className="input">
              <option value="">Alle outreachers</option>
              {outreachers.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          )}
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="input">
            <option value="">Alle statussen</option>
            {['benaderd','geen_reactie','interesse','afspraak_gemaakt','niet_geinteresseerd','callback'].map(s => (
              <option key={s} value={s}>{s.replace(/_/g,' ')}</option>
            ))}
          </select>
          <select value={filterMethode} onChange={e => setFilterMethode(e.target.value)} className="input">
            <option value="">Alle methodes</option>
            {['cold_call','cold_email','linkedin_outreach','whatsapp','direct_visit'].map(m => (
              <option key={m} value={m}>{m.replace(/_/g,' ')}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Mobile card view */}
      <div className="lg:hidden space-y-3">
        {filtered.map(item => (
          <div key={item.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex-1 min-w-0">
                <span className="font-semibold text-[#1B2A4A] text-sm leading-tight block truncate">
                  {item.bedrijfsnaam}
                </span>
                {item.omgezet_naar_lead && (
                  <span className="badge bg-green-100 text-green-700 text-xs mt-0.5">→ Lead</span>
                )}
                {item.contactpersoon && (
                  <p className="text-xs text-gray-400 mt-0.5 truncate">{item.contactpersoon}</p>
                )}
              </div>
              <OutreachStatusBadge status={item.status} />
            </div>
            <div className="flex flex-wrap gap-2 mb-3">
              {item.methode && (
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                  {item.methode.replace(/_/g, ' ')}
                </span>
              )}
              {item.product_interesse && (
                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                  {item.product_interesse.replace(/_/g, ' ')}
                </span>
              )}
              <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
                {item.pogingen} poging{item.pogingen !== 1 ? 'en' : ''}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-gray-400 mb-3">
              <span>{item.outreacher_naam}</span>
              {item.volgende_actie && (
                <span>Volgende: {format(new Date(item.volgende_actie), 'd MMM', { locale: nl })}</span>
              )}
            </div>
            <div className="flex gap-2 border-t border-gray-100 pt-3">
              {!item.omgezet_naar_lead && (
                <button
                  onClick={() => handleOmzettenNaarLead(item)}
                  className="flex-1 text-xs py-2 rounded-lg bg-green-50 text-green-700 font-medium"
                >
                  → Lead
                </button>
              )}
              {isManager && (
                <button
                  onClick={() => setDeleteTarget(item)}
                  className="px-4 text-xs py-2 rounded-lg bg-red-50 text-red-700 font-medium"
                >
                  ×
                </button>
              )}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-12 text-gray-400">Geen contacten gevonden</div>
        )}
      </div>

      {/* Desktop table view */}

      <div className="card !p-0 overflow-hidden hidden lg:block">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Bedrijf</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Outreacher</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Methode</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Product</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Status</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-700">Pogingen</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Laatste contact</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Volgende actie</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Acties</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item, i) => (
                <tr key={item.id} className={`border-b border-gray-100 hover:bg-gray-50 ${i % 2 === 1 ? 'bg-gray-50/50' : ''}`}>
                  <td className="px-4 py-3">
                    <div>
                      <span className="font-medium text-[#1B2A4A]">{item.bedrijfsnaam}</span>
                      {item.omgezet_naar_lead && <span className="ml-2 badge bg-green-100 text-green-700">→ Lead</span>}
                      {item.contactpersoon && <p className="text-xs text-gray-400">{item.contactpersoon}</p>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{item.outreacher_naam}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{item.methode?.replace(/_/g,' ')}</td>
                  <td className="px-4 py-3">
                    {item.product_interesse ? (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                        {item.product_interesse.replace(/_/g,' ')}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3"><OutreachStatusBadge status={item.status} /></td>
                  <td className="px-4 py-3 text-center font-semibold text-gray-700">{item.pogingen}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {item.laatste_contact ? format(new Date(item.laatste_contact), 'd MMM', { locale: nl }) : '-'}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {item.volgende_actie ? format(new Date(item.volgende_actie), 'd MMM', { locale: nl }) : '-'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {!item.omgezet_naar_lead && (
                        <button onClick={() => handleOmzettenNaarLead(item)} className="text-xs px-2 py-1 rounded bg-green-50 text-green-700 hover:bg-green-100">→ Lead</button>
                      )}
                      {isManager && (
                        <button onClick={() => setDeleteTarget(item)} className="text-xs px-2 py-1 rounded bg-red-50 text-red-700 hover:bg-red-100">×</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={9} className="px-4 py-12 text-center text-gray-400">Geen contacten gevonden</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
        title="Contact verwijderen"
        message={`Weet je zeker dat je "${deleteTarget?.bedrijfsnaam}" wilt verwijderen?`}
      />
    </div>
  )
}
