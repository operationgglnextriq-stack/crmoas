'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/context/AuthContext'
import { OutreachLead } from '@/types'
import { OutreachStatusBadge } from '@/components/ui/Badge'
import { ConfirmModal } from '@/components/ui/Modal'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import Link from 'next/link'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'

export default function OutreachPage() {
  const { teamMember } = useAuth()
  const supabase = createClient()
  const [items, setItems] = useState<OutreachLead[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterOutreacher, setFilterOutreacher] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterMethode, setFilterMethode] = useState('')
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
    return true
  })

  const handleDelete = async (item: OutreachLead) => {
    const { error } = await supabase.from('outreach_leads').delete().eq('id', item.id)
    if (error) {
      alert('Ошибка удаления: ' + error.message)
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
    }).select().single()
    if (!error && lead) {
      await supabase.from('outreach_leads').update({ omgezet_naar_lead: true, lead_id: lead.id }).eq('id', item.id)
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, omgezet_naar_lead: true, lead_id: lead.id } : i))
      alert(`${item.bedrijfsnaam} конвертировано в лид!`)
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
          <p className="text-xs text-gray-500">Связались</p>
          <p className="text-2xl font-bold text-blue-600">{stats.benaderd}</p>
        </div>
        <div className="card !p-4 border-l-4 border-l-yellow-400">
          <p className="text-xs text-gray-500">Интерес</p>
          <p className="text-2xl font-bold text-yellow-600">{stats.interesse}</p>
        </div>
        <div className="card !p-4 border-l-4 border-l-green-400">
          <p className="text-xs text-gray-500">Встречи</p>
          <p className="text-2xl font-bold text-green-600">{stats.afspraak}</p>
        </div>
        <div className="card !p-4 border-l-4 border-l-[#6B3FA0]">
          <p className="text-xs text-gray-500">Конверсия %</p>
          <p className="text-2xl font-bold text-[#6B3FA0]">{stats.conversie}%</p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-gray-500 text-sm">{filtered.length} контактов</p>
        <Link href="/outreach/nieuw" className="btn-primary">+ Новый контакт</Link>
      </div>

      <div className="card !p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <input placeholder="🔍 Название компании..." value={search} onChange={e => setSearch(e.target.value)} className="input" />
          {isManager && (
            <select value={filterOutreacher} onChange={e => setFilterOutreacher(e.target.value)} className="input">
              <option value="">Все аутричеры</option>
              {outreachers.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          )}
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="input">
            <option value="">Все статусы</option>
            {['benaderd','geen_reactie','interesse','afspraak_gemaakt','niet_geinteresseerd','callback'].map(s => (
              <option key={s} value={s}>{s.replace(/_/g,' ')}</option>
            ))}
          </select>
          <select value={filterMethode} onChange={e => setFilterMethode(e.target.value)} className="input">
            <option value="">Все методы</option>
            {['cold_call','cold_email','linkedin_outreach','whatsapp','direct_visit'].map(m => (
              <option key={m} value={m}>{m.replace(/_/g,' ')}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="card !p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Компания</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Аутричер</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Метод</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Статус</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-700">Попытки</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Последний контакт</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Следующее действие</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Действия</th>
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
                  <td className="px-4 py-3"><OutreachStatusBadge status={item.status} /></td>
                  <td className="px-4 py-3 text-center font-semibold text-gray-700">{item.pogingen}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {item.laatste_contact ? format(new Date(item.laatste_contact), 'd MMM', { locale: ru }) : '-'}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {item.volgende_actie ? format(new Date(item.volgende_actie), 'd MMM', { locale: ru }) : '-'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {!item.omgezet_naar_lead && (
                        <button onClick={() => handleOmzettenNaarLead(item)} className="text-xs px-2 py-1 rounded bg-green-50 text-green-700 hover:bg-green-100">→ Лид</button>
                      )}
                      {isManager && (
                        <button onClick={() => setDeleteTarget(item)} className="text-xs px-2 py-1 rounded bg-red-50 text-red-700 hover:bg-red-100">×</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-400">Контакты не найдены</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
        title="Удалить контакт"
        message={`Вы уверены, что хотите удалить "${deleteTarget?.bedrijfsnaam}"?`}
      />
    </div>
  )
}
