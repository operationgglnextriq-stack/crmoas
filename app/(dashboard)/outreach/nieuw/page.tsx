'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/context/AuthContext'

export default function NieuwOutreachPage() {
  const { teamMember } = useAuth()
  const router = useRouter()
  const supabase = createClient()
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    bedrijfsnaam: '', website: '', contactpersoon: '', telefoonnummer: '',
    emailadres: '', sector: '', outreacher_naam: '',
    methode: '', status: 'benaderd', pijnpunt: '', volgende_actie: '', notities: '',
  })

  useEffect(() => {
    if (teamMember) setForm(f => ({ ...f, outreacher_naam: teamMember.naam }))
  }, [teamMember])

  const set = (key: string, value: string) => setForm(f => ({ ...f, [key]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const { error } = await supabase.from('outreach_leads').insert({
      ...form,
      methode: form.methode || null,
      sector: form.sector || null,
      volgende_actie: form.volgende_actie || null,
      pogingen: 1,
    })
    if (error) { alert('Fout: ' + error.message); setSaving(false); return }
    router.push('/outreach')
  }

  return (
    <div className="max-w-2xl">
      <form onSubmit={handleSubmit} className="card space-y-4">
        <h2 className="text-lg font-semibold text-[#1B2A4A]">Nieuw outreach contact</h2>
        <div>
          <label className="label">Bedrijfsnaam *</label>
          <input className="input" value={form.bedrijfsnaam} onChange={e => set('bedrijfsnaam', e.target.value)} required />
        </div>
        <div>
          <label className="label">Website</label>
          <input className="input" value={form.website} onChange={e => set('website', e.target.value)} placeholder="https://" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Contactpersoon *</label>
            <input className="input" value={form.contactpersoon} onChange={e => set('contactpersoon', e.target.value)} required />
          </div>
          <div>
            <label className="label">Telefoonnummer</label>
            <input className="input" value={form.telefoonnummer} onChange={e => set('telefoonnummer', e.target.value)} />
          </div>
        </div>
        <div>
          <label className="label">E-mailadres</label>
          <input type="email" className="input" value={form.emailadres} onChange={e => set('emailadres', e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Sector</label>
            <select className="input" value={form.sector} onChange={e => set('sector', e.target.value)}>
              <option value="">Selecteer...</option>
              {['ecommerce','horeca','zakelijk','zorg','bouw','retail','tech','schoonmaak','finance','overig'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Outreacher naam *</label>
            <input className="input" value={form.outreacher_naam} onChange={e => set('outreacher_naam', e.target.value)} required />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Methode</label>
            <select className="input" value={form.methode} onChange={e => set('methode', e.target.value)}>
              <option value="">Selecteer...</option>
              {['cold_call','cold_email','linkedin_outreach','whatsapp','direct_visit'].map(m => <option key={m} value={m}>{m.replace(/_/g,' ')}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Status *</label>
            <select className="input" value={form.status} onChange={e => set('status', e.target.value)}>
              {['benaderd','geen_reactie','interesse','afspraak_gemaakt','niet_geinteresseerd','callback'].map(s => <option key={s} value={s}>{s.replace(/_/g,' ')}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="label">Pijnpunt</label>
          <textarea className="input h-20 resize-none" value={form.pijnpunt} onChange={e => set('pijnpunt', e.target.value)} />
        </div>
        <div>
          <label className="label">Volgende actie datum</label>
          <input type="datetime-local" className="input" value={form.volgende_actie} onChange={e => set('volgende_actie', e.target.value)} />
        </div>
        <div>
          <label className="label">Notities</label>
          <textarea className="input h-20 resize-none" value={form.notities} onChange={e => set('notities', e.target.value)} />
        </div>
        <div className="flex gap-3 pt-4 border-t">
          <button type="button" onClick={() => router.push('/outreach')} className="btn-secondary">← Annuleren</button>
          <button type="submit" disabled={saving} className="btn-primary disabled:opacity-50">
            {saving ? 'Opslaan...' : '✓ Contact opslaan'}
          </button>
        </div>
      </form>
    </div>
  )
}
