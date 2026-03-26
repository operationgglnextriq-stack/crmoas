'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { apiFetch } from '@/lib/apiFetch'
import { Dagrapport, TeamMember } from '@/types'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import Modal, { ConfirmModal } from '@/components/ui/Modal'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'

export default function DagraportenPage() {
  const { teamMember } = useAuth()
  const [rapporten, setRapporten] = useState<Dagrapport[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Dagrapport | null>(null)
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)
  const [form, setForm] = useState({
    naam: '', afdeling: '', rapport_datum: format(new Date(), 'yyyy-MM-dd'),
    leads_benaderd: 0, cold_calls: 0, calls_geboekt: 0, deals_bijgedragen: 0,
    actieve_gesprekken: 0, volle_ups: 0,
    pijnpunten: '', blokkades: '', op_tijd: true,
  })

  const isManager = teamMember?.rol === 'founder' || teamMember?.rol === 'sales_manager'
  const [filterDatum, setFilterDatum] = useState('')
  const [leden, setLeden] = useState<TeamMember[]>([])

  const fetchData = async () => {
    const ledenRes = await apiFetch('/api/crud?table=team_members')
    const ledenData = await ledenRes.json()
    setLeden(Array.isArray(ledenData) ? ledenData.filter((l: TeamMember) => l.actief && ['setter','closer','outreacher'].includes(l.rol)) : [])

    const res = await apiFetch('/api/crud?table=dagrapporten')
    const data = await res.json()
    setRapporten(Array.isArray(data) ? data.sort((a: Dagrapport, b: Dagrapport) =>
      new Date(b.rapport_datum).getTime() - new Date(a.rapport_datum).getTime()
    ) : [])
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  const openNieuw = () => {
    setForm({
      naam: teamMember?.naam ?? '',
      afdeling: teamMember?.afdeling ?? '',
      rapport_datum: format(new Date(), 'yyyy-MM-dd'),
      leads_benaderd: 0, cold_calls: 0, calls_geboekt: 0, deals_bijgedragen: 0,
      actieve_gesprekken: 0, volle_ups: 0,
      pijnpunten: '', blokkades: '', op_tijd: true,
    })
    setShowModal(true)
  }

  const handleSave = async () => {
    setSaving(true)
    await apiFetch('/api/crud', {
      method: 'POST',
      body: JSON.stringify({ table: 'dagrapporten', data: form })
    })
    setSaving(false)
    setShowModal(false)
    fetchData()
  }

  const handleDelete = async (id: string) => {
    const res = await apiFetch('/api/crud', {
      method: 'DELETE',
      body: JSON.stringify({ table: 'dagrapporten', id })
    })
    const data = await res.json()
    if (!res.ok) {
      alert('Ошибка удаления: ' + (data.error || 'onbekende fout'))
      return
    }
    setDeleteTarget(null)
    fetchData()
  }

  const copyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/dagrapporten`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) return <LoadingSpinner />

  const vandaag = format(new Date(), 'yyyy-MM-dd')
  const vandaagRapporten = rapporten.filter(r => r.rapport_datum === vandaag)
  const totaalLeads = vandaagRapporten.reduce((s, r) => s + (r.leads_benaderd ?? 0), 0)
  const totaalCalls = vandaagRapporten.reduce((s, r) => s + (r.calls_geboekt ?? 0), 0)
  const totaalFollowups = vandaagRapporten.reduce((s, r) => s + (r.volle_ups ?? 0), 0)
  const zichtbaar = isManager
    ? rapporten.filter(r => !filterDatum || r.rapport_datum === filterDatum)
    : rapporten.filter(r => r.naam === teamMember?.naam)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-lg font-bold text-[#1B2A4A]">Дневные отчёты</h2>
        <div className="flex gap-2">
          <button onClick={copyLink} className="text-sm px-3 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200">
            {copied ? '✅ Скопировано!' : '🔗 Копировать ссылку'}
          </button>
        {isManager && (
          <input type="date" className="input !w-auto text-sm" value={filterDatum} onChange={e => setFilterDatum(e.target.value)} />
        )}
          <button onClick={openNieuw} className="btn-primary">+ Подать отчёт</button>
        </div>
      </div>

      <div className="card !p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Дата</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Имя</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-700">Лиды</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-700">Звонки</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-700">Записано</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-700">Акт. разговоры</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-700">Фоллоу-апы</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Вовремя</th>
                {isManager && <th className="px-4 py-3"></th>}
              </tr>
            </thead>
            <tbody>
              {zichtbaar.map((r, i) => (
                <tr key={r.id} className={`border-b border-gray-100 hover:bg-gray-50 ${i % 2 === 1 ? 'bg-gray-50/50' : ''}`}>
                  <td className="px-4 py-3 text-gray-600">{format(new Date(r.rapport_datum), 'd MMM yyyy', { locale: ru })}</td>
                  <td className="px-4 py-3 font-medium text-[#1B2A4A]">{r.naam}</td>
                  <td className="px-4 py-3 text-right">{r.leads_benaderd}</td>
                  <td className="px-4 py-3 text-right">{r.cold_calls}</td>
                  <td className="px-4 py-3 text-right text-[#1A7A3A] font-medium">{r.calls_geboekt}</td>
                  <td className="px-4 py-3 text-right font-medium text-blue-600">{r.actieve_gesprekken ?? 0}</td>
                  <td className="px-4 py-3 text-right font-medium text-purple-600">{r.volle_ups ?? 0}</td>
                  <td className="px-4 py-3">
                    {r.op_tijd ? <span className="badge bg-green-100 text-green-700">✓ Да</span> : <span className="badge bg-red-100 text-red-700">✗ Нет</span>}
                  </td>
                  {isManager && (
                    <td className="px-4 py-3">
                      <button onClick={() => setDeleteTarget(r)} className="text-xs px-2 py-1 bg-red-50 text-red-700 rounded hover:bg-red-100">Удалить</button>
                    </td>
                  )}
                </tr>
              ))}
              {zichtbaar.length === 0 && (
                <tr><td colSpan={9} className="px-4 py-12 text-center text-gray-400">Ещё нет отчётов</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Подать дневной отчёт">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Имя *</label>
              <input className="input" value={form.naam} onChange={e => setForm(f => ({...f, naam: e.target.value}))} /></div>
            <div><label className="label">Дата</label>
              <input type="date" className="input" value={form.rapport_datum} onChange={e => setForm(f => ({...f, rapport_datum: e.target.value}))} /></div>
            <div><label className="label">Отдел</label>
              <select className="input" value={form.afdeling} onChange={e => setForm(f => ({...f, afdeling: e.target.value}))}>
                {['sales','outreach','content','management','tech'].map(a => <option key={a} value={a}>{a}</option>)}
              </select></div>
            <div><label className="label">Вовремя?</label>
              <select className="input" value={form.op_tijd ? 'ja' : 'nee'} onChange={e => setForm(f => ({...f, op_tijd: e.target.value === 'ja'}))}>
                <option value="ja">Да</option><option value="nee">Нет</option>
              </select></div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div><label className="label">Лидов охвачено</label>
              <input type="number" min="0" className="input" value={form.leads_benaderd} onChange={e => setForm(f => ({...f, leads_benaderd: Number(e.target.value)}))} /></div>
            <div><label className="label">Холодные звонки</label>
              <input type="number" min="0" className="input" value={form.cold_calls} onChange={e => setForm(f => ({...f, cold_calls: Number(e.target.value)}))} /></div>
            <div><label className="label">Звонков записано</label>
              <input type="number" min="0" className="input" value={form.calls_geboekt} onChange={e => setForm(f => ({...f, calls_geboekt: Number(e.target.value)}))} /></div>
            <div><label className="label">Сделок добавлено</label>
              <input type="number" min="0" className="input" value={form.deals_bijgedragen} onChange={e => setForm(f => ({...f, deals_bijgedragen: Number(e.target.value)}))} /></div>
            <div><label className="label">🗣️ Активные разговоры</label>
              <input type="number" min="0" className="input" value={form.actieve_gesprekken} onChange={e => setForm(f => ({...f, actieve_gesprekken: Number(e.target.value)}))} /></div>
            <div><label className="label">🔄 Фоллоу-апы</label>
              <input type="number" min="0" className="input" value={form.volle_ups} onChange={e => setForm(f => ({...f, volle_ups: Number(e.target.value)}))} /></div>
          </div>

          <div><label className="label">Болевые точки</label>
            <textarea className="input" rows={2} value={form.pijnpunten} onChange={e => setForm(f => ({...f, pijnpunten: e.target.value}))} /></div>
          <div><label className="label">Блокеры</label>
            <textarea className="input" rows={2} value={form.blokkades} onChange={e => setForm(f => ({...f, blokkades: e.target.value}))} /></div>

          <div className="flex gap-3 justify-end pt-2 border-t">
            <button onClick={() => setShowModal(false)} className="btn-secondary">Отмена</button>
            <button onClick={handleSave} disabled={saving || !form.naam} className="btn-primary disabled:opacity-50">
              {saving ? 'Сохранение...' : 'Подать'}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        open={!!deleteTarget} onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && handleDelete(deleteTarget.id)}
        title="Удалить отчёт"
        message={`Удалить отчёт ${deleteTarget?.naam}?`}
        confirmLabel="Удалить" danger
      />
    </div>
  )
}
