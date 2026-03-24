'use client'

import { useEffect, useState } from 'react'
import { Lead, KwalificatieStatus, Sector, Kanaal, ProductInteresse, BantBudget, BantAutoriteit, BantTiming } from '@/types'
import { BANTBadge, KwalificatieBadge } from '@/components/ui/Badge'
import { calcBANT } from '@/types'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import Modal, { ConfirmModal } from '@/components/ui/Modal'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { nl } from 'date-fns/locale'

export default function LeadDetailPage({ params }: { params: { id: string } }) {
  const [lead, setLead] = useState<Lead | null>(null)
  const [loading, setLoading] = useState(true)
  const [showEdit, setShowEdit] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<Partial<Lead>>({})
  const router = useRouter()

  const fetchLead = async () => {
    const res = await fetch(`/api/crud?table=leads&id=${params.id}`)
    const data = await res.json()
    setLead(data)
    setForm(data)
    setLoading(false)
  }

  useEffect(() => { fetchLead() }, [params.id])

  const handleSave = async () => {
    setSaving(true)
    await fetch('/api/crud', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ table: 'leads', id: params.id, data: form })
    })
    setSaving(false)
    setShowEdit(false)
    fetchLead()
  }

  const handleDelete = async () => {
    const res = await fetch('/api/crud', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ table: 'leads', id: params.id })
    })
    const data = await res.json()
    if (!res.ok) {
      alert('Verwijderen mislukt: ' + (data.error || 'onbekende fout'))
      return
    }
    router.push('/leads')
  }

  if (loading) return <LoadingSpinner />
  if (!lead) return <div className="card text-center text-gray-400 py-12">Lead niet gevonden</div>

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-4 flex-wrap">
        <Link href="/leads" className="text-sm text-gray-500 hover:text-[#1B2A4A]">← Terug</Link>
        <h2 className="text-xl font-bold text-[#1B2A4A]">{lead.bedrijfsnaam}</h2>
        <BANTBadge score={calcBANT(lead)} />
        <KwalificatieBadge status={lead.kwalificatiestatus} />
        {lead.is_duplicaat && <span className="badge bg-orange-100 text-orange-800">⚠️ Duplicaat</span>}
        <div className="ml-auto flex gap-2">
          <button onClick={() => setShowEdit(true)} className="btn-primary text-sm">✏️ Bewerken</button>
          <button onClick={() => setShowDelete(true)} className="text-sm px-3 py-2 rounded-lg bg-red-50 text-red-700 hover:bg-red-100">🗑️ Verwijderen</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card space-y-3">
          <h3 className="font-semibold text-gray-700 border-b pb-2">Bedrijfsinfo</h3>
          <Row label="Website" value={lead.website} />
          <Row label="Contactpersoon" value={lead.contactpersoon} />
          <Row label="Telefoon" value={lead.telefoonnummer} />
          <Row label="E-mail" value={lead.emailadres} />
          <Row label="Sector" value={lead.sector} />
          <Row label="Kanaal" value={lead.kanaal?.replace(/_/g, ' ')} />
          <Row label="Setter" value={lead.setter_naam} />
          <Row label="Datum" value={format(new Date(lead.created_at), 'd MMMM yyyy', { locale: nl })} />
        </div>
        <div className="card space-y-3">
          <h3 className="font-semibold text-gray-700 border-b pb-2">BANT Kwalificatie</h3>
          <Row label="Budget" value={lead.bant_budget} />
          <Row label="Autoriteit" value={lead.bant_autoriteit} />
          <Row label="Behoefte" value={lead.bant_need} />
          <Row label="Timing" value={lead.bant_timing} />
          <Row label="Pijnpunt" value={lead.pijnpunt} />
        </div>
        <div className="card space-y-3">
          <h3 className="font-semibold text-gray-700 border-b pb-2">Product & Sales</h3>
          <Row label="Product interesse" value={lead.product_interesse?.replace(/_/g, ' ')} />
          <Row label="Closer" value={lead.closer_naam} />
          <Row label="Datum call" value={lead.datum_call ? format(new Date(lead.datum_call), 'd MMM yyyy HH:mm', { locale: nl }) : '-'} />
          <Row label="Ambassadeur" value={lead.ambassadeur} />
          <Row label="Creator" value={lead.creator} />
        </div>
        {lead.notities && (
          <div className="card">
            <h3 className="font-semibold text-gray-700 border-b pb-2 mb-3">Notities</h3>
            <p className="text-sm text-gray-600 whitespace-pre-wrap">{lead.notities}</p>
          </div>
        )}
      </div>

      {/* Bewerk modal */}
      <Modal open={showEdit} onClose={() => setShowEdit(false)} title="Lead bewerken" size="lg">
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Bedrijfsnaam *</label>
              <input className="input" value={form.bedrijfsnaam ?? ''} onChange={e => setForm(f => ({ ...f, bedrijfsnaam: e.target.value }))} /></div>
            <div><label className="label">Website</label>
              <input className="input" value={form.website ?? ''} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} /></div>
            <div><label className="label">Contactpersoon</label>
              <input className="input" value={form.contactpersoon ?? ''} onChange={e => setForm(f => ({ ...f, contactpersoon: e.target.value }))} /></div>
            <div><label className="label">Telefoon</label>
              <input className="input" value={form.telefoonnummer ?? ''} onChange={e => setForm(f => ({ ...f, telefoonnummer: e.target.value }))} /></div>
            <div><label className="label">E-mail</label>
              <input className="input" value={form.emailadres ?? ''} onChange={e => setForm(f => ({ ...f, emailadres: e.target.value }))} /></div>
            <div><label className="label">Sector</label>
              <select className="input" value={form.sector ?? ''} onChange={e => setForm(f => ({ ...f, sector: e.target.value as Sector }))}>
                <option value="">-</option>
                {['ecommerce','horeca','zakelijk','zorg','bouw','retail','tech','schoonmaak','finance','overig'].map(s => <option key={s} value={s}>{s}</option>)}
              </select></div>
            <div><label className="label">Kanaal</label>
              <select className="input" value={form.kanaal ?? ''} onChange={e => setForm(f => ({ ...f, kanaal: e.target.value as Kanaal }))}>
                <option value="">-</option>
                {['instagram_dm','tiktok','linkedin','biolink','outbound','referral','checkout','whatsapp','web_form'].map(k => <option key={k} value={k}>{k.replace(/_/g,' ')}</option>)}
              </select></div>
            <div><label className="label">Kwalificatiestatus</label>
              <select className="input" value={form.kwalificatiestatus ?? ''} onChange={e => setForm(f => ({ ...f, kwalificatiestatus: e.target.value as KwalificatieStatus }))}>
                {['warm','followup_1','followup_2','followup_3','geboekt','niet','afwijzing'].map(s => <option key={s} value={s}>{s}</option>)}
              </select></div>
          </div>
          <div className="border-t pt-4">
            <p className="text-xs font-semibold text-gray-500 uppercase mb-3">BANT</p>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="label">Budget</label>
                <select className="input" value={form.bant_budget ?? ''} onChange={e => setForm(f => ({ ...f, bant_budget: e.target.value as BantBudget }))}>
                  <option value="">-</option>
                  {['ja','onduidelijk','nee'].map(v => <option key={v} value={v}>{v}</option>)}
                </select></div>
              <div><label className="label">Autoriteit</label>
                <select className="input" value={form.bant_autoriteit ?? ''} onChange={e => setForm(f => ({ ...f, bant_autoriteit: e.target.value as BantAutoriteit }))}>
                  <option value="">-</option>
                  {['beslisser','indirect','geen'].map(v => <option key={v} value={v}>{v}</option>)}
                </select></div>
              <div><label className="label">Timing</label>
                <select className="input" value={form.bant_timing ?? ''} onChange={e => setForm(f => ({ ...f, bant_timing: e.target.value as BantTiming }))}>
                  <option value="">-</option>
                  {['1maand','3maanden','6maanden','geen'].map(v => <option key={v} value={v}>{v}</option>)}
                </select></div>
              <div><label className="label">Product interesse</label>
                <select className="input" value={form.product_interesse ?? ''} onChange={e => setForm(f => ({ ...f, product_interesse: e.target.value as ProductInteresse }))}>
                  <option value="">-</option>
                  {['website','ai_scan','ai_agency','ink','community','onbekend'].map(v => <option key={v} value={v}>{v.replace(/_/g,' ')}</option>)}
                </select></div>
            </div>
            <div className="mt-3"><label className="label">Pijnpunt</label>
              <input className="input" value={form.pijnpunt ?? ''} onChange={e => setForm(f => ({ ...f, pijnpunt: e.target.value }))} /></div>
            <div className="mt-3"><label className="label">Behoefte (BANT N)</label>
              <input className="input" value={form.bant_need ?? ''} onChange={e => setForm(f => ({ ...f, bant_need: e.target.value }))} /></div>
          </div>
          <div className="border-t pt-4">
            <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Sales</p>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="label">Closer</label>
                <input className="input" value={form.closer_naam ?? ''} onChange={e => setForm(f => ({ ...f, closer_naam: e.target.value }))} /></div>
              <div><label className="label">Datum call</label>
                <input type="datetime-local" className="input" value={form.datum_call ? form.datum_call.slice(0,16) : ''} onChange={e => setForm(f => ({ ...f, datum_call: e.target.value }))} /></div>
            </div>
          </div>
          <div><label className="label">Notities</label>
            <textarea className="input" rows={3} value={form.notities ?? ''} onChange={e => setForm(f => ({ ...f, notities: e.target.value }))} /></div>
          <div className="flex gap-3 justify-end pt-2 border-t">
            <button onClick={() => setShowEdit(false)} className="btn-secondary">Annuleren</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary disabled:opacity-50">
              {saving ? 'Opslaan...' : 'Wijzigingen opslaan'}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        open={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={handleDelete}
        title="Lead verwijderen"
        message={`Weet je zeker dat je "${lead.bedrijfsnaam}" permanent wilt verwijderen?`}
        confirmLabel="Verwijderen"
        danger
      />
    </div>
  )
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex justify-between text-sm gap-3">
      <span className="text-gray-500 flex-shrink-0">{label}</span>
      <span className="font-medium text-gray-800 text-right">{value || '-'}</span>
    </div>
  )
}
