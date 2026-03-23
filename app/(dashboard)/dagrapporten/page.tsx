'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/context/AuthContext'
import { Dagrapport, TeamMember } from '@/types'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { format } from 'date-fns'
import { nl } from 'date-fns/locale'

export default function DagraportenPage() {
  const { teamMember } = useAuth()
  const supabase = createClient()
  const [rapporten, setRapporten] = useState<Dagrapport[]>([])
  const [teamleden, setTeamleden] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [vandaagIngediend, setVandaagIngediend] = useState(false)
  const today = format(new Date(), 'yyyy-MM-dd')

  const isManager = teamMember?.rol === 'founder' || teamMember?.rol === 'sales_manager'

  const [form, setForm] = useState({
    leads_benaderd: '',
    cold_calls: '',
    calls_geboekt: '',
    deals_bijgedragen: '',
    pijnpunten: '',
    blokkades: '',
  })

  const fetchData = async () => {
    const [{ data: r }, { data: t }] = await Promise.all([
      isManager
        ? supabase.from('dagrapporten').select('*').order('created_at', { ascending: false }).limit(100)
        : supabase.from('dagrapporten').select('*').eq('naam', teamMember?.naam ?? '').order('created_at', { ascending: false }),
      supabase.from('team_members').select('*').eq('actief', true).neq('rol', 'founder').neq('rol', 'sales_manager'),
    ])
    setRapporten(r ?? [])
    setTeamleden(t ?? [])

    // Check vandaag ingediend
    const vandaag = (r ?? []).find(rp => rp.rapport_datum === today && rp.naam === teamMember?.naam)
    setVandaagIngediend(!!vandaag)
    setLoading(false)
  }

  useEffect(() => {
    if (teamMember) fetchData()
  }, [teamMember])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    await supabase.from('dagrapporten').insert({
      naam: teamMember?.naam ?? '',
      afdeling: teamMember?.afdeling ?? null,
      rapport_datum: today,
      leads_benaderd: Number(form.leads_benaderd) || 0,
      cold_calls: Number(form.cold_calls) || 0,
      calls_geboekt: Number(form.calls_geboekt) || 0,
      deals_bijgedragen: Number(form.deals_bijgedragen) || 0,
      pijnpunten: form.pijnpunten || null,
      blokkades: form.blokkades || null,
      op_tijd: true,
    })
    setVandaagIngediend(true)
    setSubmitting(false)
    fetchData()
  }

  // Team leden die vandaag NIET hebben ingediend (alleen voor manager)
  const vandaagIngedienden = rapporten.filter(r => r.rapport_datum === today).map(r => r.naam)
  const nietIngediend = teamleden.filter(t => !vandaagIngedienden.includes(t.naam))

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-6">
      {/* Status banner */}
      <div className={`p-4 rounded-xl border-l-4 flex items-center justify-between ${
        vandaagIngediend
          ? 'bg-green-50 border-green-500'
          : 'bg-red-50 border-red-500'
      }`}>
        <div>
          <p className="font-semibold text-sm">
            {vandaagIngediend
              ? '✅ Jouw dagrapport voor vandaag is ingediend!'
              : '⚠️ Je hebt vandaag nog geen dagrapport ingediend!'}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">{format(new Date(), 'EEEE d MMMM yyyy', { locale: nl })}</p>
        </div>
      </div>

      {/* Indienformulier (als nog niet ingediend) */}
      {!vandaagIngediend && (
        <form onSubmit={handleSubmit} className="card space-y-4">
          <h3 className="font-semibold text-[#1B2A4A]">Dagrapport indienen</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="label">Leads benaderd</label>
              <input type="number" min="0" className="input" value={form.leads_benaderd} onChange={e => setForm(f => ({ ...f, leads_benaderd: e.target.value }))} />
            </div>
            <div>
              <label className="label">Cold calls</label>
              <input type="number" min="0" className="input" value={form.cold_calls} onChange={e => setForm(f => ({ ...f, cold_calls: e.target.value }))} />
            </div>
            <div>
              <label className="label">Calls geboekt</label>
              <input type="number" min="0" className="input" value={form.calls_geboekt} onChange={e => setForm(f => ({ ...f, calls_geboekt: e.target.value }))} />
            </div>
            <div>
              <label className="label">Deals bijgedragen</label>
              <input type="number" min="0" className="input" value={form.deals_bijgedragen} onChange={e => setForm(f => ({ ...f, deals_bijgedragen: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="label">Pijnpunten (markt signalen)</label>
            <textarea className="input h-20 resize-none" value={form.pijnpunten} onChange={e => setForm(f => ({ ...f, pijnpunten: e.target.value }))} placeholder="Welke pijnpunten hoorde je vandaag?" />
          </div>
          <div>
            <label className="label">Blokkades</label>
            <textarea className="input h-16 resize-none" value={form.blokkades} onChange={e => setForm(f => ({ ...f, blokkades: e.target.value }))} placeholder="Wat houdt je tegen? Wat heb je nodig?" />
          </div>
          <button type="submit" disabled={submitting} className="btn-primary disabled:opacity-50">
            {submitting ? 'Indienen...' : '✓ Dagrapport indienen'}
          </button>
        </form>
      )}

      {/* Manager: wie heeft niet ingediend? */}
      {isManager && nietIngediend.length > 0 && (
        <div className="card border border-red-200 bg-red-50">
          <h3 className="font-semibold text-red-800 mb-3">⚠️ Nog niet ingediend vandaag</h3>
          <div className="flex flex-wrap gap-2">
            {nietIngediend.map(t => (
              <span key={t.id} className="badge bg-red-100 text-red-800">{t.naam}</span>
            ))}
          </div>
        </div>
      )}

      {/* Overzicht tabel */}
      {isManager && (
        <div className="card !p-0 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="font-semibold text-[#1B2A4A]">Alle dagrapporten</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Naam</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Afdeling</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Datum</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-700">Leads</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-700">Calls</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-700">Geboekt</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-700">Deals</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Op tijd</th>
                </tr>
              </thead>
              <tbody>
                {rapporten.map((r, i) => (
                  <tr key={r.id} className={`border-b border-gray-100 hover:bg-gray-50 ${i % 2 === 1 ? 'bg-gray-50/50' : ''}`}>
                    <td className="px-4 py-3 font-medium text-[#1B2A4A]">{r.naam}</td>
                    <td className="px-4 py-3 text-gray-500">{r.afdeling ?? '-'}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs">
                      {format(new Date(r.rapport_datum), 'd MMM yyyy', { locale: nl })}
                    </td>
                    <td className="px-4 py-3 text-right">{r.leads_benaderd}</td>
                    <td className="px-4 py-3 text-right">{r.cold_calls}</td>
                    <td className="px-4 py-3 text-right">{r.calls_geboekt}</td>
                    <td className="px-4 py-3 text-right">{r.deals_bijgedragen}</td>
                    <td className="px-4 py-3">
                      {r.op_tijd
                        ? <span className="badge bg-green-100 text-green-700">✓ Op tijd</span>
                        : <span className="badge bg-red-100 text-red-700">✗ Te laat</span>
                      }
                    </td>
                  </tr>
                ))}
                {rapporten.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-gray-400">Geen dagrapporten gevonden</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Eigen rapporten voor niet-managers */}
      {!isManager && rapporten.length > 0 && (
        <div className="card !p-0 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="font-semibold text-[#1B2A4A]">Mijn dagrapporten</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Datum</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-700">Leads</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-700">Calls</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-700">Geboekt</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-700">Deals</th>
                </tr>
              </thead>
              <tbody>
                {rapporten.map((r, i) => (
                  <tr key={r.id} className={`border-b border-gray-100 ${i % 2 === 1 ? 'bg-gray-50/50' : ''}`}>
                    <td className="px-4 py-3 text-gray-700">
                      {format(new Date(r.rapport_datum), 'EEEE d MMM', { locale: nl })}
                    </td>
                    <td className="px-4 py-3 text-right">{r.leads_benaderd}</td>
                    <td className="px-4 py-3 text-right">{r.cold_calls}</td>
                    <td className="px-4 py-3 text-right">{r.calls_geboekt}</td>
                    <td className="px-4 py-3 text-right">{r.deals_bijgedragen}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
