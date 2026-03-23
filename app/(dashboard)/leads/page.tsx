'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/context/AuthContext'
import { Lead } from '@/types'
import { BANTBadge, KwalificatieBadge } from '@/components/ui/Badge'
import { calcBANT } from '@/types'
import { ConfirmModal } from '@/components/ui/Modal'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import Link from 'next/link'
import { format } from 'date-fns'
import { nl } from 'date-fns/locale'

export default function LeadsPage() {
  const { teamMember } = useAuth()
  const supabase = createClient()
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterSetter, setFilterSetter] = useState('')
  const [filterKanaal, setFilterKanaal] = useState('')
  const [filterSector, setFilterSector] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [showDuplicaten, setShowDuplicaten] = useState(false)
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

  useEffect(() => { if (teamMember) fetchLeads() }, [teamMember, fetchLeads])

  const filtered = leads.filter(l => {
    if (search && !l.bedrijfsnaam.toLowerCase().includes(search.toLowerCase())) return false
    if (filterSetter && l.setter_naam !== filterSetter) return false
    if (filterKanaal && l.kanaal !== filterKanaal) return false
    if (filterSector && l.sector !== filterSector) return false
    if (filterStatus && l.kwalificatiestatus !== filterStatus) return false
    if (showDuplicaten && !l.is_duplicaat) return false
    return true
  })

  const handleDelete = async (lead: Lead) => {
    await fetch('/api/crud', { method: 'DELETE', headers: {'Content-Type':'application/json'}, body: JSON.stringify({table:'leads', id: lead.id}) })
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
        <Link href="/leads/nieuw" className="btn-primary">+ Nieuwe lead</Link>
      </div>
      <div className="card !p-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <input placeholder="🔍 Bedrijfsnaam..." value={search} onChange={e => setSearch(e.target.value)} className="input" />
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
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={showDuplicaten} onChange={e => setShowDuplicaten(e.target.checked)} className="rounded" />
            Alleen duplicaten
          </label>
        </div>
      </div>
      <div className="card !p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Bedrijf</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Setter</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Kanaal</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Sector</th>
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
                <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-400">Geen leads gevonden</td></tr>
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
    </div>
  )
}
