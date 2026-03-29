'use client'
export const dynamic = "force-dynamic";

import { useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { apiFetch } from '@/lib/apiFetch'
import { TeamMember, Rol, Afdeling } from '@/types'
import Modal from '@/components/ui/Modal'
import { ConfirmModal } from '@/components/ui/Modal'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

const ROL_LABELS: Record<Rol, string> = {
  founder: 'Founder', sales_manager: 'Team Manager', setter: 'Appointment Setter',
  outreacher: 'Cold Outreacher', closer: 'Closer', creator: 'Creator', ambassadeur: 'Ambassadeur',
  web_developer: 'Web Developer', head_of_tech: 'Head of Tech', ai_engineer: 'AI Engineer',
}
const ROL_COLORS: Record<Rol, string> = {
  founder: 'bg-purple-100 text-purple-800', sales_manager: 'bg-blue-100 text-blue-800',
  setter: 'bg-green-100 text-green-800', outreacher: 'bg-orange-100 text-orange-800',
  closer: 'bg-red-100 text-red-800', creator: 'bg-pink-100 text-pink-800',
  ambassadeur: 'bg-teal-100 text-teal-800', web_developer: 'bg-indigo-100 text-indigo-800',
  head_of_tech: 'bg-cyan-100 text-cyan-800', ai_engineer: 'bg-emerald-100 text-emerald-800',
}

interface AuthUser { id: string; email: string }

export default function TeamPage() {
  const { teamMember } = useAuth()
  const [leden, setLeden] = useState<TeamMember[]>([])
  const [authUsers, setAuthUsers] = useState<AuthUser[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'sales' | 'outreach' | 'tech'>('sales')
  const [showModal, setShowModal] = useState(false)
  const [editTarget, setEditTarget] = useState<TeamMember | null>(null)
  const [deactiveerTarget, setDeactiveerTarget] = useState<TeamMember | null>(null)
  const [verwijderTarget, setVerwijderTarget] = useState<TeamMember | null>(null)
  const [resetTarget, setResetTarget] = useState<TeamMember | null>(null)
  const [nieuwWachtwoord, setNieuwWachtwoord] = useState('')
  const [resetSaving, setResetSaving] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteForm, setInviteForm] = useState({ naam: '', email: '', rol: 'setter' as Rol, afdeling: 'sales' as Afdeling, commissie_pct: '', discord_naam: '' })
  const [inviteSaving, setInviteSaving] = useState(false)
  const [inviteMsg, setInviteMsg] = useState('')
  const [resetMsg, setResetMsg] = useState('')
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    naam: '', email: '', wachtwoord: '', rol: 'setter' as Rol,
    afdeling: 'sales' as Afdeling, commissie_pct: '', discord_naam: '',
  })

  const isManager = teamMember?.rol === 'founder' || teamMember?.rol === 'sales_manager'

  const fetchData = async () => {
    const [ledenRes, usersRes] = await Promise.all([
      apiFetch('/api/crud?table=team_members'),
      apiFetch('/api/team/auth-users'),
    ])
    const ledenData = await ledenRes.json()
    const usersData = usersRes.ok ? await usersRes.json() : []
    setLeden(Array.isArray(ledenData) ? ledenData.sort((a: TeamMember, b: TeamMember) => a.naam.localeCompare(b.naam)) : [])
    setAuthUsers(Array.isArray(usersData) ? usersData : [])
    setLoading(false)
  }

  useEffect(() => { if (isManager) fetchData(); else setLoading(false) }, [isManager])

  const salesTeam = leden.filter(l => ['setter','closer','creator','ambassadeur','sales_manager','founder'].includes(l.rol))
  const outreachTeam = leden.filter(l => l.rol === 'outreacher')
  const techTeam = leden.filter(l => ['web_developer','head_of_tech','ai_engineer'].includes(l.rol))
  const displayTeam = tab === 'sales' ? salesTeam : tab === 'outreach' ? outreachTeam : techTeam

  const openNieuw = () => {
    setEditTarget(null)
    setForm({ naam: '', email: '', wachtwoord: '', rol: 'setter', afdeling: 'sales', commissie_pct: '', discord_naam: '' })
    setShowModal(true)
  }

  const openEdit = (lid: TeamMember) => {
    setEditTarget(lid)
    setForm({ naam: lid.naam, email: lid.email, wachtwoord: '', rol: lid.rol as Rol,
      afdeling: lid.afdeling as Afdeling ?? 'sales', commissie_pct: String(lid.commissie_pct ?? ''), discord_naam: lid.discord_naam ?? '' })
    setShowModal(true)
  }

  const handleSave = async () => {
    setSaving(true)
    if (editTarget) {
      await apiFetch('/api/crud', {
        method: 'PATCH',
        body: JSON.stringify({ table: 'team_members', id: editTarget.id, data: {
          naam: form.naam, rol: form.rol, afdeling: form.afdeling,
          commissie_pct: Number(form.commissie_pct) || 0, discord_naam: form.discord_naam || null,
        }})
      })
      // Als commissie_pct gewijzigd is, herbereken alle deals van dit lid
      const oudeCommissie = editTarget?.commissie_pct
      const nieuweCommissie = Number(form.commissie_pct) || 0
      if (oudeCommissie !== nieuweCommissie) {
        const dealsRes = await apiFetch('/api/crud?table=deals')
        if (dealsRes.ok) {
          const allDeals = await dealsRes.json()
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const lidDeals = allDeals.filter((d: any) =>
            d.setter_naam === editTarget.naam ||
            d.closer_naam === editTarget.naam ||
            d.creator_naam === editTarget.naam
          )
          for (const deal of lidDeals) {
            const waarde = deal.deal_waarde ?? 0
            const pct = nieuweCommissie / 100
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const updateData: any = {}
            if (deal.setter_naam === editTarget.naam) updateData.commissie_setter = Math.round(waarde * pct)
            if (deal.closer_naam === editTarget.naam) updateData.commissie_closer = Math.round(waarde * pct)
            if (deal.creator_naam === editTarget.naam) updateData.commissie_creator = Math.round(waarde * pct)
            if (Object.keys(updateData).length > 0) {
              await apiFetch('/api/crud', {
                method: 'PATCH',
                body: JSON.stringify({ table: 'deals', id: deal.id, data: updateData })
              })
            }
          }
        }
      }
    } else {
      const res = await apiFetch('/api/team/create', {
        method: 'POST',
        body: JSON.stringify({
          email: form.email, password: form.wachtwoord, naam: form.naam,
          rol: form.rol, afdeling: form.afdeling,
          commissie_pct: Number(form.commissie_pct) || 0,
          discord_naam: form.discord_naam || null,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        alert('Fout: ' + (err.error ?? 'Onbekende fout'))
        setSaving(false)
        return
      }
    }
    setSaving(false)
    setShowModal(false)
    fetchData()
  }

  const handleDeactiveer = async (lid: TeamMember) => {
    await apiFetch('/api/crud', {
      method: 'PATCH',
      body: JSON.stringify({ table: 'team_members', id: lid.id, data: { actief: !lid.actief } })
    })
    fetchData()
  }
  const handleVerwijder = async (lid: TeamMember) => {
    const res = await apiFetch('/api/crud', {
      method: 'DELETE',
      body: JSON.stringify({ table: 'team_members', id: lid.id })
    })
    if (!res.ok) {
      alert('Verwijderen mislukt')
      return
    }
    setVerwijderTarget(null)
    fetchData()
  }



  const handleResetWachtwoord = async () => {
    if (!resetTarget || !nieuwWachtwoord) return
    setResetSaving(true)
    setResetMsg('')
    // Zoek auth user ID
    const authUser = authUsers.find(u => u.email === resetTarget.email)
    if (!authUser) {
      setResetMsg('❌ Auth gebruiker niet gevonden voor dit emailadres')
      setResetSaving(false)
      return
    }
    const res = await apiFetch('/api/team/reset-password', {
      method: 'POST',
      body: JSON.stringify({ userId: authUser.id, newPassword: nieuwWachtwoord })
    })
    const data = await res.json()
    setResetSaving(false)
    if (res.ok) {
      setResetMsg('✅ Wachtwoord succesvol gewijzigd')
      setTimeout(() => { setResetTarget(null); setNieuwWachtwoord(''); setResetMsg('') }, 1500)
    } else {
      setResetMsg('❌ ' + (data.error ?? 'Onbekende fout'))
    }
  }

  const handleInvite = async () => {
    setInviteSaving(true)
    setInviteMsg('')
    const res = await apiFetch('/api/team/invite', {
      method: 'POST',
      body: JSON.stringify({ ...inviteForm, commissie_pct: Number(inviteForm.commissie_pct) || 0 })
    })
    const data = await res.json()
    setInviteSaving(false)
    if (res.ok) {
      setInviteMsg('✅ Uitnodigingsmail verstuurd naar ' + inviteForm.email)
      setTimeout(() => { setShowInviteModal(false); setInviteMsg(''); fetchData() }, 2000)
    } else {
      setInviteMsg('❌ ' + (data.error ?? 'Fout bij versturen'))
    }
  }

  if (!isManager) return <div className="card text-center py-12 text-gray-400">Geen toegang tot teambeheer.</div>
  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-6">
      <div className="flex gap-4 border-b border-gray-200">
        {(['sales', 'outreach', 'tech'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${tab === t ? 'border-[#6B3FA0] text-[#6B3FA0]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t === 'sales' ? '💼 Sales Team' : t === 'outreach' ? '📞 Outreach Team' : '💻 Tech Team'}
          </button>
        ))}
        <div className="ml-auto pb-2">
          <div className="flex gap-2">
            <button onClick={() => { setInviteForm({ naam: '', email: '', rol: 'setter', afdeling: 'sales', commissie_pct: '', discord_naam: '' }); setInviteMsg(''); setShowInviteModal(true) }} className="btn-secondary">📧 Uitnodiging sturen</button>
            <button onClick={openNieuw} className="btn-primary">+ Teamlid toevoegen</button>
          </div>
        </div>
      </div>

      <div className="card !p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Naam</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Rol</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">E-mail</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Discord</th>
                {isManager && <th className="text-right px-4 py-3 font-semibold text-gray-700">Commissie %</th>}
                <th className="text-right px-4 py-3 font-semibold text-gray-700">Omzet</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Status</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Acties</th>
              </tr>
            </thead>
            <tbody>
              {displayTeam.map((lid, i) => (
                <tr key={lid.id} className={`border-b border-gray-100 hover:bg-gray-50 ${i % 2 === 1 ? 'bg-gray-50/50' : ''} ${!lid.actief ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3 font-medium text-[#1B2A4A]">{lid.naam}</td>
                  <td className="px-4 py-3"><span className={`badge ${ROL_COLORS[lid.rol as Rol]}`}>{ROL_LABELS[lid.rol as Rol]}</span></td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{lid.email}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{lid.discord_naam ?? '-'}</td>
                  {isManager && <td className="px-4 py-3 text-right font-medium">{lid.commissie_pct}%</td>}
                  <td className="px-4 py-3 text-right text-[#1A7A3A] font-semibold">€{(lid.totale_omzet ?? 0).toLocaleString('nl-NL')}</td>
                  <td className="px-4 py-3">
                    {lid.actief ? <span className="badge bg-green-100 text-green-700">✓ Actief</span> : <span className="badge bg-gray-100 text-gray-500">Inactief</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 flex-wrap">
                      <button onClick={() => openEdit(lid)} className="text-xs px-2 py-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100">Bewerk</button>
                      <button onClick={() => { setResetTarget(lid); setNieuwWachtwoord(''); setResetMsg('') }} className="text-xs px-2 py-1 rounded bg-purple-50 text-purple-700 hover:bg-purple-100">🔑 Wachtwoord</button>
                      <button onClick={() => setVerwijderTarget(lid)}
                        className="text-xs px-2 py-1 bg-red-50 text-red-700 rounded hover:bg-red-100">
                        🗑️ Verwijder
                      </button>
                      <button onClick={() => setDeactiveerTarget(lid)}
                        className={`text-xs px-2 py-1 rounded ${lid.actief ? 'bg-orange-50 text-orange-700 hover:bg-orange-100' : 'bg-green-50 text-green-700 hover:bg-green-100'}`}>
                        {lid.actief ? 'Deactiveer' : 'Activeer'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {displayTeam.length === 0 && <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-400">Geen teamleden gevonden</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editTarget ? 'Teamlid bewerken' : 'Teamlid toevoegen'} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Naam *</label>
              <input className="input" value={form.naam} onChange={e => setForm(f => ({...f, naam: e.target.value}))} /></div>
            <div><label className="label">E-mailadres *</label>
              <input type="email" className="input" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} disabled={!!editTarget} /></div>
          </div>
          {!editTarget && (
            <div><label className="label">Wachtwoord *</label>
              <input type="password" className="input" value={form.wachtwoord} onChange={e => setForm(f => ({...f, wachtwoord: e.target.value}))} /></div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Rol</label>
              <select className="input" value={form.rol} onChange={e => setForm(f => ({...f, rol: e.target.value as Rol}))}>
                {Object.entries(ROL_LABELS).map(([v,l]) => <option key={v} value={v}>{l}</option>)}
              </select></div>
            <div><label className="label">Afdeling</label>
              <select className="input" value={form.afdeling} onChange={e => setForm(f => ({...f, afdeling: e.target.value as Afdeling}))}>
                {['sales','outreach','content','management','tech'].map(a => <option key={a} value={a}>{a}</option>)}
              </select></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {isManager && (
              <div><label className="label">Commissie %</label>
                <input type="number" min="0" max="100" step="0.5" className="input" value={form.commissie_pct} onChange={e => setForm(f => ({...f, commissie_pct: e.target.value}))} /></div>
            )}
            <div><label className="label">Discord naam</label>
              <input className="input" value={form.discord_naam} onChange={e => setForm(f => ({...f, discord_naam: e.target.value}))} /></div>
          </div>
          <div className="flex gap-3 justify-end pt-2 border-t">
            <button onClick={() => setShowModal(false)} className="btn-secondary">Annuleren</button>
            <button onClick={handleSave} disabled={saving || !form.naam || (!editTarget && (!form.email || !form.wachtwoord))} className="btn-primary disabled:opacity-50">
              {saving ? 'Opslaan...' : editTarget ? 'Wijzigingen opslaan' : 'Teamlid aanmaken'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Wachtwoord reset modal */}
      <Modal open={!!resetTarget} onClose={() => setResetTarget(null)} title={`Wachtwoord wijzigen — ${resetTarget?.naam}`}>
        <div className="space-y-4">
          <p className="text-sm text-gray-500">Stel een nieuw wachtwoord in voor <strong>{resetTarget?.email}</strong></p>
          <div>
            <label className="label">Nieuw wachtwoord (min. 6 tekens)</label>
            <input type="password" className="input" value={nieuwWachtwoord}
              onChange={e => setNieuwWachtwoord(e.target.value)} placeholder="••••••••" />
          </div>
          {resetMsg && <p className="text-sm font-medium">{resetMsg}</p>}
          <div className="flex gap-3 justify-end pt-2 border-t">
            <button onClick={() => setResetTarget(null)} className="btn-secondary">Annuleren</button>
            <button onClick={handleResetWachtwoord} disabled={resetSaving || nieuwWachtwoord.length < 6} className="btn-primary disabled:opacity-50">
              {resetSaving ? 'Bezig...' : 'Wachtwoord instellen'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={showInviteModal} onClose={() => setShowInviteModal(false)} title="Uitnodiging versturen" size="lg">
      <div className="space-y-4">
        <p className="text-sm text-gray-500">De ontvanger krijgt een e-mail met een link om een wachtwoord in te stellen en in te loggen.</p>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="label">Naam *</label><input className="input" value={inviteForm.naam} onChange={e => setInviteForm(f => ({...f, naam: e.target.value}))} /></div>
          <div><label className="label">E-mailadres *</label><input type="email" className="input" value={inviteForm.email} onChange={e => setInviteForm(f => ({...f, email: e.target.value}))} /></div>
          <div><label className="label">Rol</label><select className="input" value={inviteForm.rol} onChange={e => setInviteForm(f => ({...f, rol: e.target.value as Rol}))}>{Object.entries(ROL_LABELS).map(([v,l]) => <option key={v} value={v}>{l}</option>)}</select></div>
          <div><label className="label">Afdeling</label><select className="input" value={inviteForm.afdeling} onChange={e => setInviteForm(f => ({...f, afdeling: e.target.value as Afdeling}))}>{['sales','outreach','content','management','tech'].map(a => <option key={a} value={a}>{a}</option>)}</select></div>
          {isManager && <div><label className="label">Commissie %</label><input type="number" min="0" max="100" className="input" value={inviteForm.commissie_pct} onChange={e => setInviteForm(f => ({...f, commissie_pct: e.target.value}))} /></div>}
          <div><label className="label">Discord naam</label><input className="input" value={inviteForm.discord_naam} onChange={e => setInviteForm(f => ({...f, discord_naam: e.target.value}))} /></div>
        </div>
        {inviteMsg && <p className="text-sm font-medium">{inviteMsg}</p>}
        <div className="flex gap-3 justify-end pt-2 border-t">
          <button onClick={() => setShowInviteModal(false)} className="btn-secondary">Annuleren</button>
          <button onClick={handleInvite} disabled={inviteSaving || !inviteForm.naam || !inviteForm.email} className="btn-primary disabled:opacity-50">{inviteSaving ? 'Versturen...' : '📧 Uitnodiging versturen'}</button>
        </div>
      </div>
    </Modal>

      <ConfirmModal
        open={!!deactiveerTarget}
        onClose={() => setDeactiveerTarget(null)}
        onConfirm={() => deactiveerTarget && handleDeactiveer(deactiveerTarget)}
        title={deactiveerTarget?.actief ? 'Teamlid deactiveren' : 'Teamlid activeren'}
        message={`Weet je zeker dat je ${deactiveerTarget?.naam} wilt ${deactiveerTarget?.actief ? 'deactiveren' : 'activeren'}?`}
        confirmLabel={deactiveerTarget?.actief ? 'Deactiveren' : 'Activeren'}
      />
      <ConfirmModal
        open={!!verwijderTarget}
        onClose={() => setVerwijderTarget(null)}
        onConfirm={() => verwijderTarget && handleVerwijder(verwijderTarget)}
        title="Teamlid verwijderen"
        message={`Weet je zeker dat je ${verwijderTarget?.naam} permanent wilt verwijderen? Dit kan niet ongedaan gemaakt worden.`}
        confirmLabel="Permanent verwijderen"
        danger
      />
    </div>
  )
}
