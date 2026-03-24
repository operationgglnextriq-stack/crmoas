'use client'

import { useEffect, useState } from 'react'
import { apiFetch } from '@/lib/apiFetch'
import { Lead, Deal, KwalificatieStatus, Sector, Kanaal, ProductInteresse, BantBudget, BantAutoriteit, BantTiming } from '@/types'
import { BANTBadge, KwalificatieBadge } from '@/components/ui/Badge'
import { calcBANT } from '@/types'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import Modal, { ConfirmModal } from '@/components/ui/Modal'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
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
  const { teamMember } = useAuth()
  const [doorSturing, setDoorSturing] = useState(false)
  const [doorSturenSuccess, setDoorSturenSuccess] = useState(false)
  const [deals, setDeals] = useState<Deal[]>([])
  const [showDealModal, setShowDealModal] = useState(false)
  const [dealForm, setDealForm] = useState<Partial<Deal>>({ deal_status: 'call', betaling_ontvangen: false, commissie_betaald: false, recurring: false })
  const [dealSaving, setDealSaving] = useState(false)

  const canDoorSturen = teamMember && !['outreacher', 'ambassadeur', 'creator'].includes(teamMember.rol)

  const PRODUCT_LABELS: Record<string, string> = {
    website_std: 'Website Standaard', website_maat: 'Website Maatwerk', hosting: 'Hosting',
    ai_scan_pro: 'AI Scan Pro', ai_scan_dig: 'AI Scan Digitaal', ai_agency: 'AI Agency',
    ink: 'INK', comm_klant: 'Commissie Klant', comm_extern: 'Commissie Extern',
  }

  const STATUS_LABELS: Record<string, string> = {
    call: 'Call', offerte: 'Offerte', onderhand: 'Onderhandeling',
    gesloten: 'Gesloten', betaald: 'Betaald', levering: 'Levering',
    opgeleverd: 'Opgeleverd', verloren: 'Verloren',
  }

  const STATUS_COLORS: Record<string, string> = {
    call: 'bg-blue-100 text-blue-700', offerte: 'bg-yellow-100 text-yellow-700',
    onderhand: 'bg-orange-100 text-orange-700', gesloten: 'bg-green-100 text-green-700',
    betaald: 'bg-emerald-100 text-emerald-700', levering: 'bg-purple-100 text-purple-700',
    opgeleverd: 'bg-gray-100 text-gray-700', verloren: 'bg-red-100 text-red-700',
  }

  const handleDealSave = async () => {
    if (!lead) return
    setDealSaving(true)
    await apiFetch('/api/crud', {
      method: 'POST',
      body: JSON.stringify({
        table: 'deals',
        data: {
          ...dealForm,
          bedrijfsnaam: lead.bedrijfsnaam,
          lead_id: lead.id,
          setter_naam: dealForm.setter_naam || teamMember?.naam,
          betaling_ontvangen: dealForm.betaling_ontvangen ?? false,
          commissie_betaald: false,
          recurring: dealForm.recurring ?? false,
        }
      })
    })
    setDealSaving(false)
    setShowDealModal(false)
    setDealForm({ deal_status: 'call', betaling_ontvangen: false, commissie_betaald: false, recurring: false })
    fetchLead()
  }

  const handleDoorSturen = async () => {
    if (!lead || !teamMember) return
    setDoorSturing(true)
    const res = await apiFetch('/api/crud', {
      method: 'POST',
      body: JSON.stringify({
        table: 'deals',
        data: {
          bedrijfsnaam: lead.bedrijfsnaam,
          lead_id: lead.id,
          deal_status: 'call',
          setter_naam: teamMember.naam,
          closer_naam: lead.closer_naam ?? null,
          betaling_ontvangen: false,
          commissie_betaald: false,
          recurring: false,
        }
      })
    })
    setDoorSturing(false)
    if (res.ok) {
      setDoorSturenSuccess(true)
      setTimeout(() => setDoorSturenSuccess(false), 3000)
    } else {
      alert('Mislukt — deal kon niet aangemaakt worden')
    }
  }

  const fetchLead = async () => {
    const [leadRes, dealsRes] = await Promise.all([
      apiFetch(`/api/crud?table=leads&id=${params.id}`),
      apiFetch(`/api/crud?table=deals`),
    ])
    const data = await leadRes.json()
    const allDeals = await dealsRes.json()
    setLead(data)
    setForm(data)
    if (Array.isArray(allDeals)) {
      setDeals(allDeals.filter((d: Deal) => d.lead_id === params.id))
    }
    setLoading(false)
  }

  useEffect(() => { fetchLead() }, [params.id])

  const handleSave = async () => {
    setSaving(true)
    await apiFetch('/api/crud', {
      method: 'PATCH',
      body: JSON.stringify({ table: 'leads', id: params.id, data: form })
    })
    setSaving(false)
    setShowEdit(false)
    fetchLead()
  }

  const handleDelete = async () => {
    const res = await apiFetch('/api/crud', {
      method: 'DELETE',
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
          {canDoorSturen && (
            <button
              onClick={handleDoorSturen}
              disabled={doorSturing}
              className="text-sm px-3 py-2 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 disabled:opacity-50"
            >
              {doorSturing ? 'Bezig...' : '📤 Naar pipeline'}
            </button>
          )}
          {doorSturenSuccess && (
            <span className="text-sm text-green-600 font-medium">✅ Deal aangemaakt!</span>
          )}
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

      {/* Deals / Producten sectie */}
      <div className="card space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-[#1B2A4A]">💼 Deals & Producten</h3>
          {canDoorSturen && (
            <button
              onClick={() => setShowDealModal(true)}
              className="text-sm px-3 py-2 rounded-lg bg-[#1B2A4A] text-white hover:bg-[#253a68]"
            >
              + Product toevoegen
            </button>
          )}
        </div>
        {deals.length === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center">Nog geen deals gekoppeld aan deze lead</p>
        ) : (
          <div className="space-y-2">
            {deals.map(deal => (
              <div key={deal.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 bg-gray-50">
                <div className="flex items-center gap-3">
                  <span className={`badge ${STATUS_COLORS[deal.deal_status] ?? 'bg-gray-100 text-gray-700'}`}>
                    {STATUS_LABELS[deal.deal_status] ?? deal.deal_status}
                  </span>
                  <span className="text-sm font-medium text-[#1B2A4A]">
                    {PRODUCT_LABELS[deal.product ?? ''] ?? deal.product ?? 'Onbekend product'}
                  </span>
                  {deal.deal_waarde && (
                    <span className="text-sm text-gray-500">€{deal.deal_waarde.toLocaleString('nl-NL')}</span>
                  )}
                  {deal.recurring && (
                    <span className="badge bg-purple-100 text-purple-700">🔄 Recurring</span>
                  )}
                </div>
                <div className="text-xs text-gray-400">
                  {deal.closer_naam && <span>Closer: {deal.closer_naam}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

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


      {/* Deal aanmaak modal */}
      <Modal open={showDealModal} onClose={() => setShowDealModal(false)} title="Product toevoegen">
        <div className="space-y-4">
          <div>
            <label className="label">Product</label>
            <select className="input" value={dealForm.product ?? ''} onChange={e => setDealForm(f => ({...f, product: e.target.value as Deal['product']}))}>
              <option value="">- kies product -</option>
              <option value="website_std">Website Standaard</option>
              <option value="website_maat">Website Maatwerk</option>
              <option value="hosting">Hosting</option>
              <option value="ai_scan_pro">AI Scan Pro</option>
              <option value="ai_scan_dig">AI Scan Digitaal</option>
              <option value="ai_agency">AI Agency</option>
              <option value="ink">INK</option>
              <option value="comm_klant">Commissie Klant</option>
              <option value="comm_extern">Commissie Extern</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Deal waarde (€)</label>
              <input type="number" className="input" value={dealForm.deal_waarde ?? ''} onChange={e => setDealForm(f => ({...f, deal_waarde: Number(e.target.value)}))} />
            </div>
            <div>
              <label className="label">Status</label>
              <select className="input" value={dealForm.deal_status ?? 'call'} onChange={e => setDealForm(f => ({...f, deal_status: e.target.value as Deal['deal_status']}))}>
                <option value="call">Call</option>
                <option value="offerte">Offerte</option>
                <option value="onderhand">Onderhandeling</option>
                <option value="gesloten">Gesloten</option>
                <option value="betaald">Betaald</option>
                <option value="levering">Levering</option>
                <option value="opgeleverd">Opgeleverd</option>
                <option value="verloren">Verloren</option>
              </select>
            </div>
          </div>
          <div>
            <label className="label">Closer</label>
            <input className="input" placeholder="Naam closer" value={dealForm.closer_naam ?? ''} onChange={e => setDealForm(f => ({...f, closer_naam: e.target.value || null}))} />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="recurring-deal" checked={dealForm.recurring ?? false} onChange={e => setDealForm(f => ({...f, recurring: e.target.checked}))} className="w-4 h-4 accent-[#6B3FA0]" />
            <label htmlFor="recurring-deal" className="text-sm text-gray-700">Recurring deal (maandelijks terugkerend)</label>
          </div>
          {dealForm.recurring && (
            <div>
              <label className="label">Maandbedrag (€)</label>
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              <input type="number" className="input" placeholder="bijv. 50" value={(dealForm as any).recurring_maand_bedrag ?? ''} onChange={e => setDealForm(f => ({...f, recurring_maand_bedrag: Number(e.target.value) || null}))} />
            </div>
          )}
          <div className="flex gap-3 pt-2 border-t">
            <button onClick={() => setShowDealModal(false)} className="btn-secondary flex-1">Annuleren</button>
            <button onClick={handleDealSave} disabled={dealSaving} className="btn-primary flex-1 disabled:opacity-50">
              {dealSaving ? 'Opslaan...' : 'Deal aanmaken'}
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
