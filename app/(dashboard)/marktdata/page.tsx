'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { apiFetch } from '@/lib/apiFetch'
import { Marktdata } from '@/types'
import Modal, { ConfirmModal } from '@/components/ui/Modal'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { format } from 'date-fns'
import { nl } from 'date-fns/locale'

export default function MarktdataPage() {
  const { teamMember } = useAuth()
  const [items, setItems] = useState<Marktdata[]>([])
  const [loading, setLoading] = useState(true)
  const [filterAfdeling, setFilterAfdeling] = useState('')
  const [filterCategorie, setFilterCategorie] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editTarget, setEditTarget] = useState<Marktdata | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Marktdata | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    pijnpunt: '', bedrijf: '', sector: '', software_probleem: '',
    categorie: '', product_kans: false, frequentie: 1,
  })

  const isManager = teamMember?.rol === 'founder' || teamMember?.rol === 'sales_manager'

  const fetchData = async () => {
    const res = await apiFetch('/api/crud?table=marktdata')
    const data = await res.json()
    setItems(Array.isArray(data) ? data.sort((a: Marktdata, b: Marktdata) => b.frequentie - a.frequentie) : [])
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  const filtered = items.filter(i => {
    if (filterAfdeling && i.afdeling !== filterAfdeling) return false
    if (filterCategorie && i.categorie !== filterCategorie) return false
    return true
  })

  const pijnMap: Record<string, number> = {}
  filtered.forEach(i => { if (i.pijnpunt) pijnMap[i.pijnpunt] = (pijnMap[i.pijnpunt] ?? 0) + i.frequentie })
  const chartData = Object.entries(pijnMap).sort((a, b) => b[1] - a[1]).slice(0, 10)
    .map(([pijnpunt, count]) => ({ pijnpunt: pijnpunt.length > 30 ? pijnpunt.slice(0, 30) + '…' : pijnpunt, count }))

  const openNieuw = () => {
    setEditTarget(null)
    setForm({ pijnpunt: '', bedrijf: '', sector: '', software_probleem: '', categorie: '', product_kans: false, frequentie: 1 })
    setShowModal(true)
  }

  const openEdit = (item: Marktdata) => {
    setEditTarget(item)
    setForm({
      pijnpunt: item.pijnpunt, bedrijf: item.bedrijf ?? '', sector: item.sector ?? '',
      software_probleem: item.software_probleem ?? '', categorie: item.categorie ?? '',
      product_kans: item.product_kans, frequentie: item.frequentie,
    })
    setShowModal(true)
  }

  const handleSave = async () => {
    setSaving(true)
    if (editTarget) {
      await apiFetch('/api/crud', {
        method: 'PATCH',
        body: JSON.stringify({ table: 'marktdata', id: editTarget.id, data: form })
      })
    } else {
      await apiFetch('/api/crud', {
        method: 'POST',
        body: JSON.stringify({ table: 'marktdata', data: {
          ...form,
          ingediend_door: teamMember?.naam ?? '',
          afdeling: teamMember?.afdeling ?? null,
          doorgegeven: false,
        }})
      })
    }
    setSaving(false)
    setShowModal(false)
    fetchData()
  }

  const handleDelete = async (id: string) => {
    await apiFetch('/api/crud', {
      method: 'DELETE',
      body: JSON.stringify({ table: 'marktdata', id })
    })
    setDeleteTarget(null)
    fetchData()
  }

  const categorieën = Array.from(new Set(items.map(i => i.categorie).filter(Boolean)))

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <div className="card !p-4 border-l-4 border-l-[#6B3FA0]">
          <p className="text-xs text-gray-500">Totaal ingediend</p>
          <p className="text-2xl font-bold text-[#6B3FA0]">{items.length}</p>
        </div>
        <div className="card !p-4 border-l-4 border-l-[#E67E22]">
          <p className="text-xs text-gray-500">Productkansen 🚀</p>
          <p className="text-2xl font-bold text-[#E67E22]">{items.filter(i => i.product_kans).length}</p>
        </div>
        <div className="card !p-4 border-l-4 border-l-[#1A7A3A]">
          <p className="text-xs text-gray-500">Unieke pijnpunten</p>
          <p className="text-2xl font-bold text-[#1A7A3A]">{Object.keys(pijnMap).length}</p>
        </div>
      </div>

      {chartData.length > 0 && (
        <div className="card">
          <h3 className="font-semibold text-[#1B2A4A] mb-4">Top pijnpunten (frequentie)</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="pijnpunt" tick={{ fontSize: 11 }} width={180} />
              <Tooltip />
              <Bar dataKey="count" fill="#6B3FA0" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <select value={filterAfdeling} onChange={e => setFilterAfdeling(e.target.value)} className="input !w-40">
          <option value="">Alle afdelingen</option>
          {['sales','outreach','content','management','tech'].map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <select value={filterCategorie} onChange={e => setFilterCategorie(e.target.value)} className="input !w-44">
          <option value="">Alle categorieën</option>
          {categorieën.map(c => <option key={c!} value={c!}>{c}</option>)}
        </select>
        <div className="ml-auto">
          <button onClick={openNieuw} className="btn-primary">+ Pijnpunt toevoegen</button>
        </div>
      </div>

      <div className="card !p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Pijnpunt</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Ingediend door</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Bedrijf</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Sector</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-700">Freq.</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Kans</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Datum</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Acties</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item, i) => (
                <tr key={item.id} className={`border-b border-gray-100 hover:bg-gray-50 ${i % 2 === 1 ? 'bg-gray-50/50' : ''}`}>
                  <td className="px-4 py-3 max-w-xs">
                    <p className="text-gray-800 font-medium">{item.pijnpunt}</p>
                    {item.software_probleem && <p className="text-xs text-gray-400 mt-0.5">{item.software_probleem}</p>}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{item.ingediend_door}</td>
                  <td className="px-4 py-3 text-gray-500">{item.bedrijf ?? '-'}</td>
                  <td className="px-4 py-3 text-gray-500">{item.sector ?? '-'}</td>
                  <td className="px-4 py-3 text-right font-semibold">{item.frequentie}</td>
                  <td className="px-4 py-3">{item.product_kans && <span className="badge bg-orange-100 text-orange-800">🚀 Kans</span>}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{format(new Date(item.created_at), 'd MMM', { locale: nl })}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(item)} className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded hover:bg-blue-100">Bewerk</button>
                      {isManager && (
                        <button onClick={() => setDeleteTarget(item)} className="text-xs px-2 py-1 bg-red-50 text-red-700 rounded hover:bg-red-100">Verwijder</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-400">Geen marktdata gevonden</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editTarget ? 'Pijnpunt bewerken' : 'Pijnpunt toevoegen'}>
        <div className="space-y-4">
          <div>
            <label className="label">Pijnpunt *</label>
            <textarea className="input h-20 resize-none" value={form.pijnpunt} onChange={e => setForm(f => ({...f, pijnpunt: e.target.value}))} placeholder="Welk probleem ervaart het bedrijf?" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Bedrijf</label>
              <input className="input" value={form.bedrijf} onChange={e => setForm(f => ({...f, bedrijf: e.target.value}))} /></div>
            <div><label className="label">Sector</label>
              <input className="input" value={form.sector} onChange={e => setForm(f => ({...f, sector: e.target.value}))} /></div>
            <div><label className="label">Software probleem</label>
              <input className="input" value={form.software_probleem} onChange={e => setForm(f => ({...f, software_probleem: e.target.value}))} /></div>
            <div><label className="label">Categorie</label>
              <input className="input" value={form.categorie} onChange={e => setForm(f => ({...f, categorie: e.target.value}))} placeholder="bv. automatisering, website..." /></div>
            <div><label className="label">Frequentie</label>
              <input type="number" min="1" className="input" value={form.frequentie} onChange={e => setForm(f => ({...f, frequentie: Number(e.target.value)}))} /></div>
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={form.product_kans} onChange={e => setForm(f => ({...f, product_kans: e.target.checked}))} className="w-4 h-4 rounded" />
            <span className="text-sm font-medium">🚀 Dit is een productkans</span>
          </label>
          <div className="flex gap-3 justify-end pt-2 border-t">
            <button onClick={() => setShowModal(false)} className="btn-secondary">Annuleren</button>
            <button onClick={handleSave} disabled={!form.pijnpunt || saving} className="btn-primary disabled:opacity-50">
              {saving ? 'Opslaan...' : editTarget ? 'Wijzigingen opslaan' : 'Opslaan'}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && handleDelete(deleteTarget.id)}
        title="Pijnpunt verwijderen"
        message={`"${deleteTarget?.pijnpunt}" verwijderen?`}
        confirmLabel="Verwijderen"
        danger
      />
    </div>
  )
}
