'use client'
export const dynamic = "force-dynamic";

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/context/AuthContext'
import { apiFetch } from '@/lib/apiFetch'
import { TeamMember } from '@/types'

export default function NieuweLeadPage() {
  const { teamMember } = useAuth()
  const router = useRouter()
  const supabase = createClient()
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [duplicaatData, setDuplicaatData] = useState<{ bron: string; ingevoerd_door: string; datum: string } | null>(null)
  const [duplicaatAkkoord, setDuplicaatAkkoord] = useState(false)
  const [closers, setClosers] = useState<TeamMember[]>([])
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  const [form, setForm] = useState({
    bedrijfsnaam: '', website: '', contactpersoon: '', telefoonnummer: '',
    emailadres: '', sector: '', kanaal: '', setter_naam: '',
    ambassadeur: '', creator: '', bant_budget: '', bant_autoriteit: '',
    bant_need: '', bant_timing: '', pijnpunt: '', kwalificatiestatus: 'followup_1',
    product_interesse: '', closer_naam: '', datum_call: '', notities: '',
  })

  useEffect(() => {
    supabase.from('team_members').select('*').eq('rol', 'closer').eq('actief', true)
      .then(({ data }) => setClosers(data ?? []))
  }, [])

  useEffect(() => {
    if (teamMember) setForm(f => ({ ...f, setter_naam: teamMember.naam }))
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

  const handleSubmit = async () => {
    if (duplicaatData && !duplicaatAkkoord) return
    setSaving(true)
    const { error } = await supabase.from('leads').insert({
      ...form,
      bant_budget: form.bant_budget || null,
      bant_autoriteit: form.bant_autoriteit || null,
      bant_timing: form.bant_timing || null,
      sector: form.sector || null,
      kanaal: form.kanaal || null,
      product_interesse: form.product_interesse || null,
      closer_naam: form.closer_naam || null,
      datum_call: form.datum_call || null,
      is_duplicaat: !!duplicaatData,
      duplicaat_van: duplicaatData ? `${duplicaatData.bron} (door ${duplicaatData.ingevoerd_door})` : null,
      afdeling: 'sales',
    })
    if (error) { alert('Fout: ' + error.message); setSaving(false); return }
    router.push('/leads')
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress */}
      <div className="flex items-center gap-2 mb-6">
        {[1, 2, 3].map(s => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${step === s ? 'bg-[#6B3FA0] text-white' : step > s ? 'bg-[#1A7A3A] text-white' : 'bg-gray-200 text-gray-500'}`}>
              {step > s ? '✓' : s}
            </div>
            {s < 3 && <div className={`h-0.5 w-12 ${step > s ? 'bg-[#1A7A3A]' : 'bg-gray-200'}`} />}
          </div>
        ))}
        <span className="ml-3 text-sm text-gray-500">
          {step === 1 ? 'Bedrijfsinfo' : step === 2 ? 'BANT Kwalificatie' : 'Product & Notities'}
        </span>
      </div>

      <div className="card space-y-4">
        {step === 1 && (
          <>
            <h2 className="text-lg font-semibold text-[#1B2A4A]">Stap 1 — Bedrijfsinfo</h2>
            <div>
              <label className="label">Lead type *</label>
              <div className="flex gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="leadtype" value="warm"
                    checked={form.kanaal !== "outbound" && form.kanaal !== "biolink"}
                    onChange={() => setForm(f => ({...f, kwalificatiestatus: "warm"}))}
                    className="accent-[#6B3FA0]"
                  />
                  <span className="text-sm font-medium">Warm lead</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="leadtype" value="koud"
                    checked={form.kanaal === "outbound"}
                    onChange={() => setForm(f => ({...f, kanaal: "outbound", kwalificatiestatus: "followup_1"}))}
                    className="accent-[#6B3FA0]"
                  />
                  <span className="text-sm font-medium">Koud lead (cold call/outreach)</span>
                </label>
              </div>
            </div>
            {duplicaatData && (
              <div className="p-4 bg-orange-50 border border-orange-300 rounded-lg space-y-3">
                <div className="flex items-start gap-2">
                  <span className="text-orange-600 text-lg leading-none mt-0.5">⚠️</span>
                  <div className="flex-1">
                    <p className="font-semibold text-orange-800">Mogelijk duplicaat gevonden</p>
                    <ul className="text-sm text-orange-700 mt-1 space-y-0.5">
                      <li>• Bedrijf: <strong>{form.bedrijfsnaam}</strong></li>
                      <li>• Bron: <strong>{duplicaatData.bron === 'leads' ? 'Leads (Sales)' : 'Outreach'}</strong></li>
                      <li>• Ingevoerd door: <strong>{duplicaatData.ingevoerd_door}</strong></li>
                      <li>• Datum: <strong>{new Date(duplicaatData.datum).toLocaleDateString('nl-NL')}</strong></li>
                    </ul>
                    <p className="text-sm font-medium text-orange-800 mt-2">Weet je zeker dat je dit wilt opslaan?</p>
                  </div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={duplicaatAkkoord} onChange={e => setDuplicaatAkkoord(e.target.checked)} className="accent-orange-600" />
                  <span className="text-sm text-orange-800 font-medium">Ja, ik weet dat dit een duplicaat is</span>
                </label>
              </div>
            )}
            <div>
              <label className="label">Bedrijfsnaam *</label>
              <input className="input" value={form.bedrijfsnaam} onChange={e => handleBedrijfsnaamChange(e.target.value)} required />
            </div>
            <div>
              <label className="label">Website</label>
              <input className="input" value={form.website} onChange={e => set('website', e.target.value)} placeholder="https://" />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
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
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
              <div>
                <label className="label">Sector</label>
                <select className="input" value={form.sector} onChange={e => set('sector', e.target.value)}>
                  <option value="">Selecteer...</option>
                  {['ecommerce','horeca','zakelijk','zorg','bouw','retail','tech','schoonmaak','finance','overig'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Kanaal</label>
                <select className="input" value={form.kanaal} onChange={e => set('kanaal', e.target.value)}>
                  <option value="">Selecteer...</option>
                  {['instagram_dm','tiktok','linkedin','biolink','outbound','referral','checkout','whatsapp','web_form'].map(k => <option key={k} value={k}>{k.replace(/_/g,' ')}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
              <div>
                <label className="label">Setter naam *</label>
                <input className="input" value={form.setter_naam} onChange={e => set('setter_naam', e.target.value)} />
              </div>
              <div>
                <label className="label">Ambassadeur</label>
                <input className="input" value={form.ambassadeur} onChange={e => set('ambassadeur', e.target.value)} />
              </div>
            </div>
            <div>
              <label className="label">Creator</label>
              <input className="input" value={form.creator} onChange={e => set('creator', e.target.value)} />
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h2 className="text-lg font-semibold text-[#1B2A4A]">Stap 2 — BANT Kwalificatie</h2>
            <div>
              <label className="label">Budget</label>
              <div className="flex gap-3 flex-wrap">
                {[['ja','Ja ✅'],['onduidelijk','Onduidelijk 🤷'],['nee','Nee ❌']].map(([v,l]) => (
                  <label key={v} className={`cursor-pointer px-3 py-2 rounded-lg border transition-colors ${form.bant_budget === v ? 'border-[#6B3FA0] bg-purple-50' : 'border-gray-200'}`}>
                    <input type="radio" name="budget" value={v} checked={form.bant_budget === v} onChange={() => set('bant_budget', v)} className="hidden" />
                    <span className="text-sm">{l}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="label">Autoriteit</label>
              <div className="flex gap-3 flex-wrap">
                {[['beslisser','Beslisser 👑'],['indirect','Indirecte lijn 🔗'],['geen','Geen 👤']].map(([v,l]) => (
                  <label key={v} className={`cursor-pointer px-3 py-2 rounded-lg border transition-colors ${form.bant_autoriteit === v ? 'border-[#6B3FA0] bg-purple-50' : 'border-gray-200'}`}>
                    <input type="radio" name="autoriteit" value={v} checked={form.bant_autoriteit === v} onChange={() => set('bant_autoriteit', v)} className="hidden" />
                    <span className="text-sm">{l}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="label">Behoefte (Need) *</label>
              <textarea className="input h-20 resize-none" value={form.bant_need} onChange={e => set('bant_need', e.target.value)} placeholder="Omschrijf de behoefte..." />
            </div>
            <div>
              <label className="label">Timing</label>
              <div className="flex gap-3 flex-wrap">
                {[['1maand','< 1 mnd ⚡'],['3maanden','< 3 mnd ✅'],['6maanden','3-6 mnd 📅'],['geen','Geen ❓']].map(([v,l]) => (
                  <label key={v} className={`cursor-pointer px-3 py-2 rounded-lg border transition-colors ${form.bant_timing === v ? 'border-[#6B3FA0] bg-purple-50' : 'border-gray-200'}`}>
                    <input type="radio" name="timing" value={v} checked={form.bant_timing === v} onChange={() => set('bant_timing', v)} className="hidden" />
                    <span className="text-sm">{l}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="label">Pijnpunt (Marktdata) * <span className="text-xs text-gray-400 font-normal">— altijd invullen</span></label>
              <textarea className="input h-20 resize-none" value={form.pijnpunt} onChange={e => set('pijnpunt', e.target.value)} placeholder="Welk probleem ervaart dit bedrijf?" required />
            </div>
            <div>
              <label className="label">Kwalificatiestatus</label>
              <select className="input" value={form.kwalificatiestatus} onChange={e => set('kwalificatiestatus', e.target.value)}>
                {['benaderd','warm','benaderd','followup_1','followup_2','followup_3','geboekt','niet','afwijzing'].map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
              </select>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <h2 className="text-lg font-semibold text-[#1B2A4A]">Stap 3 — Product & Notities</h2>
            <div>
              <label className="label">Product interesse</label>
              <select className="input" value={form.product_interesse} onChange={e => set('product_interesse', e.target.value)}>
                <option value="">Selecteer...</option>
                {['website','ai_scan','ai_agency','ink','community','onbekend'].map(p => <option key={p} value={p}>{p.replace(/_/g,' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Closer toewijzen</label>
              <select className="input" value={form.closer_naam} onChange={e => set('closer_naam', e.target.value)}>
                <option value="">Geen closer</option>
                {closers.map(c => <option key={c.id} value={c.naam}>{c.naam}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Datum call</label>
              <input type="datetime-local" className="input" value={form.datum_call} onChange={e => set('datum_call', e.target.value)} />
            </div>
            <div>
              <label className="label">Notities</label>
              <textarea className="input h-28 resize-none" value={form.notities} onChange={e => set('notities', e.target.value)} />
            </div>
          </>
        )}

        <div className="flex justify-between pt-4 border-t">
          <button type="button" onClick={() => setStep(s => s - 1)} disabled={step === 1} className="btn-secondary disabled:opacity-30">
            ← Vorige
          </button>
          {step < 3 ? (
            <button type="button" onClick={() => {
              if (step === 1 && !form.bedrijfsnaam) return alert('Vul bedrijfsnaam in')
              if (step === 1 && !form.contactpersoon) return alert('Vul contactpersoon in')
              setStep(s => s + 1)
            }} className="btn-primary">Volgende →</button>
          ) : (
            <button type="button" onClick={handleSubmit} disabled={saving || (!!duplicaatData && !duplicaatAkkoord)} className="btn-primary disabled:opacity-50">
              {saving ? 'Opslaan...' : '✓ Lead opslaan'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
