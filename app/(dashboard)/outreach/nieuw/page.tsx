'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/context/AuthContext'
import { apiFetch } from '@/lib/apiFetch'

export default function NieuwOutreachPage() {
  const { teamMember } = useAuth()
  const router = useRouter()
  const supabase = createClient()
  const [saving, setSaving] = useState(false)
  const [duplicaatData, setDuplicaatData] = useState<{ bron: string; ingevoerd_door: string; datum: string } | null>(null)
  const [duplicaatAkkoord, setDuplicaatAkkoord] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  const [form, setForm] = useState({
    bedrijfsnaam: '', website: '', contactpersoon: '', telefoonnummer: '',
    emailadres: '', sector: '', outreacher_naam: '',
    methode: '', status: 'benaderd', pijnpunt: '', volgende_actie: '', notities: '',
  })

  useEffect(() => {
    if (teamMember) setForm(f => ({ ...f, outreacher_naam: teamMember.naam }))
  }, [teamMember])

  const checkDuplicate = async (naam: string) => {
    if (naam.length < 2) { setDuplicaatData(null); return }
    const res = await apiFetch(`/api/check-duplicate?naam=${encodeURIComponent(naam)}`)
    if (res.ok) {
      const data = await res.json()
      if (data.duplicaat) {
        setDuplicaatData({ bron: data.bron, ingevoerd_door: data.ingevoerd_door, datum: data.datum })
      } else {
        setDuplicaatData(null)
      }
    }
  }

  const handleBedrijfsnaamChange = (value: string) => {
    setForm(f => ({ ...f, bedrijfsnaam: value }))
    setDuplicaatAkkoord(false)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => checkDuplicate(value), 500)
  }

  const set = (key: string, value: string) => setForm(f => ({ ...f, [key]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (duplicaatData && !duplicaatAkkoord) return
    setSaving(true)
    const { error } = await supabase.from('outreach_leads').insert({
      ...form,
      methode: form.methode || null,
      sector: form.sector || null,
      volgende_actie: form.volgende_actie || null,
      pogingen: 1,
    })
    if (error) { alert('Ошибка: ' + error.message); setSaving(false); return }
    router.push('/outreach')
  }

  return (
    <div className="max-w-2xl">
      <form onSubmit={handleSubmit} className="card space-y-4">
        <h2 className="text-lg font-semibold text-[#1B2A4A]">Новый контакт аутрич</h2>
        {duplicaatData && (
          <div className="p-4 bg-orange-50 border border-orange-300 rounded-lg space-y-3">
            <div className="flex items-start gap-2">
              <span className="text-orange-600 text-lg leading-none mt-0.5">⚠️</span>
              <div className="flex-1">
                <p className="font-semibold text-orange-800">Обнаружен возможный дубликат</p>
                <ul className="text-sm text-orange-700 mt-1 space-y-0.5">
                  <li>• Компания: <strong>{form.bedrijfsnaam}</strong></li>
                  <li>• Источник: <strong>{duplicaatData.bron === 'leads' ? 'Лиды (Продажи)' : 'Аутрич'}</strong></li>
                  <li>• Добавлено: <strong>{duplicaatData.ingevoerd_door}</strong></li>
                  <li>• Дата: <strong>{new Date(duplicaatData.datum).toLocaleDateString('nl-NL')}</strong></li>
                </ul>
                <p className="text-sm font-medium text-orange-800 mt-2">Вы уверены, что хотите сохранить это?</p>
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={duplicaatAkkoord} onChange={e => setDuplicaatAkkoord(e.target.checked)} className="accent-orange-600" />
              <span className="text-sm text-orange-800 font-medium">Да, я знаю, что это дубликат</span>
            </label>
          </div>
        )}
        <div>
          <label className="label">Название компании *</label>
          <input className="input" value={form.bedrijfsnaam} onChange={e => handleBedrijfsnaamChange(e.target.value)} required />
        </div>
        <div>
          <label className="label">Website</label>
          <input className="input" value={form.website} onChange={e => set('website', e.target.value)} placeholder="https://" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Контактное лицо *</label>
            <input className="input" value={form.contactpersoon} onChange={e => set('contactpersoon', e.target.value)} required />
          </div>
          <div>
            <label className="label">Телефон</label>
            <input className="input" value={form.telefoonnummer} onChange={e => set('telefoonnummer', e.target.value)} />
          </div>
        </div>
        <div>
          <label className="label">Эл. почта</label>
          <input type="email" className="input" value={form.emailadres} onChange={e => set('emailadres', e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Сектор</label>
            <select className="input" value={form.sector} onChange={e => set('sector', e.target.value)}>
              <option value="">Выбрать...</option>
              {['ecommerce','horeca','zakelijk','zorg','bouw','retail','tech','schoonmaak','finance','overig'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Имя аутричера *</label>
            <input className="input" value={form.outreacher_naam} onChange={e => set('outreacher_naam', e.target.value)} required />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Метод</label>
            <select className="input" value={form.methode} onChange={e => set('methode', e.target.value)}>
              <option value="">Выбрать...</option>
              {['cold_call','cold_email','linkedin_outreach','whatsapp','direct_visit'].map(m => <option key={m} value={m}>{m.replace(/_/g,' ')}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Статус *</label>
            <select className="input" value={form.status} onChange={e => set('status', e.target.value)}>
              {['benaderd','geen_reactie','interesse','afspraak_gemaakt','niet_geinteresseerd','callback'].map(s => <option key={s} value={s}>{s.replace(/_/g,' ')}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="label">Болевая точка</label>
          <textarea className="input h-20 resize-none" value={form.pijnpunt} onChange={e => set('pijnpunt', e.target.value)} />
        </div>
        <div>
          <label className="label">Дата следующего действия</label>
          <input type="datetime-local" className="input" value={form.volgende_actie} onChange={e => set('volgende_actie', e.target.value)} />
        </div>
        <div>
          <label className="label">Заметки</label>
          <textarea className="input h-20 resize-none" value={form.notities} onChange={e => set('notities', e.target.value)} />
        </div>
        <div className="flex gap-3 pt-4 border-t">
          <button type="button" onClick={() => router.push('/outreach')} className="btn-secondary">← Отмена</button>
          <button type="submit" disabled={saving || (!!duplicaatData && !duplicaatAkkoord)} className="btn-primary disabled:opacity-50">
            {saving ? 'Сохранение...' : '✓ Сохранить контакт'}
          </button>
        </div>
      </form>
    </div>
  )
}
