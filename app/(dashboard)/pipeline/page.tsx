'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'
import { apiFetch } from '@/lib/apiFetch'
import { Deal, DealStatus, TeamMember } from '@/types'
import Modal from '@/components/ui/Modal'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent,
  PointerSensor, useSensor, useSensors, useDroppable,
} from '@dnd-kit/core'
import { useDraggable } from '@dnd-kit/core'
import { differenceInDays } from 'date-fns'

const STAGES: { key: DealStatus; label: string; color: string; bg: string }[] = [
  { key: 'call', label: '📞 Call ingepland', color: 'border-blue-400', bg: 'bg-blue-50' },
  { key: 'offerte', label: '📄 Offerte', color: 'border-purple-400', bg: 'bg-purple-50' },
  { key: 'onderhand', label: '🤝 Onderhandeling', color: 'border-yellow-400', bg: 'bg-yellow-50' },
  { key: 'gesloten', label: '✅ Gesloten', color: 'border-green-400', bg: 'bg-green-50' },
  { key: 'betaald', label: '💰 Betaald', color: 'border-green-600', bg: 'bg-green-100' },
  { key: 'levering', label: '🔄 Levering', color: 'border-orange-400', bg: 'bg-orange-50' },
  { key: 'opgeleverd', label: '🏁 Opgeleverd', color: 'border-teal-400', bg: 'bg-teal-50' },
  { key: 'verloren', label: '❌ Verloren', color: 'border-red-400', bg: 'bg-red-50' },
]

const PRODUCT_LABELS: Record<string, string> = {
  website_std: 'Website Standaard', website_maat: 'Website Maatwerk',
  hosting: 'Hosting', ai_scan_pro: 'AI Scan Pro', ai_scan_dig: 'AI Scan Digitaal',
  ai_agency: 'AI Agency', ink: 'INK', comm_klant: 'Commissie Klant', comm_extern: 'Commissie Extern',
}

export default function PipelinePage() {
  const { teamMember } = useAuth()
  const [deals, setDeals] = useState<Deal[]>([])
  const [leden, setLeden] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [activeDeal, setActiveDeal] = useState<Deal | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editDeal, setEditDeal] = useState<Deal | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<Partial<Deal>>({})

  const isManager = teamMember?.rol === 'founder' || teamMember?.rol === 'sales_manager'
  const isCloser = teamMember?.rol === 'closer'
  const naam = teamMember?.naam ?? ''

  const canEdit = (deal: Deal) => {
    if (isManager) return true
    if (isCloser && deal.closer_naam === naam) return true
    return false
  }

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  const fetchDeals = useCallback(async () => {
    const [dealsRes, ledenRes] = await Promise.all([
      apiFetch('/api/crud?table=deals'),
      apiFetch('/api/crud?table=team_members'),
    ])
    const dealsData = await dealsRes.json()
    const ledenData = await ledenRes.json()
    setDeals(Array.isArray(dealsData) ? dealsData.sort((a: Deal, b: Deal) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) : [])
    setLeden(Array.isArray(ledenData) ? ledenData.filter((l: TeamMember) => l.actief) : [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchDeals() }, [fetchDeals])

  const handleDragStart = (event: DragStartEvent) => {
    const deal = deals.find(d => d.id === event.active.id)
    if (deal && !canEdit(deal)) return
    setActiveDeal(deal ?? null)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveDeal(null)
    if (!over || active.id === over.id) return
    const newStatus = over.id as DealStatus
    const deal = deals.find(d => d.id === active.id)
    if (!deal || deal.deal_status === newStatus || !canEdit(deal)) return

    setDeals(prev => prev.map(d => d.id === active.id ? { ...d, deal_status: newStatus } : d))
    await apiFetch('/api/crud', {
      method: 'PATCH',
      body: JSON.stringify({ table: 'deals', id: active.id, data: { deal_status: newStatus } })
    })
  }

  const openNew = () => {
    setEditDeal(null)
    setForm({ deal_status: 'call', betaling_ontvangen: false, commissie_betaald: false, setter_naam: naam })
    setShowModal(true)
  }

  const openEdit = (deal: Deal) => {
    if (!canEdit(deal)) return
    setEditDeal(deal)
    setForm(deal)
    setShowModal(true)
  }

  const handleSave = async () => {
    setSaving(true)

    // Bereken commissies — gebruik lokale variabelen, NIET form direct muteren
    const setter = leden.find(l => l.naam === form.setter_naam)
    const closer = leden.find(l => l.naam === form.closer_naam)
    const creator = leden.find(l => l.naam === form.creator_naam)
    const ambassadeur = leden.find(l => l.naam === (form as any).ambassadeur_naam)
    const salesManager = leden.find(l => l.rol === "sales_manager" && l.actief)
    const waarde = form.deal_waarde ?? 0

    const dataToSave = {
      ...form,
      commissie_setter: setter ? Math.round(waarde * (setter.commissie_pct / 100)) : (form.commissie_setter ?? 0),
      commissie_closer: closer ? Math.round(waarde * (closer.commissie_pct / 100)) : (form.commissie_closer ?? 0),
      commissie_creator: creator ? Math.round(waarde * (creator.commissie_pct / 100)) : (form.commissie_creator ?? 0),
      commissie_ambassadeur: ambassadeur ? Math.round(waarde * (ambassadeur.commissie_pct / 100)) : ((form as any).commissie_ambassadeur ?? 0),
      commissie_manager: salesManager ? Math.round(waarde * 0.05) : 0,
      commissie_web_developer: 0,
    }

    if (editDeal) {
      const res = await apiFetch("/api/crud", {
        method: "PATCH",
        body: JSON.stringify({ table: "deals", id: editDeal.id, data: dataToSave })
      })
      if (!res.ok) {
        const err = await res.json()
        alert("Opslaan mislukt: " + (err.error || "onbekende fout"))
      }
    } else {
      const res = await apiFetch("/api/crud", {
        method: "POST",
        body: JSON.stringify({ table: "deals", data: dataToSave })
      })
      if (!res.ok) {
        const err = await res.json()
        alert("Aanmaken mislukt: " + (err.error || "onbekende fout"))
      }
    }
    setSaving(false)
    setShowModal(false)
    fetchDeals()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Deal verwijderen?')) return
    setDeals(prev => prev.filter(d => d.id !== id))
    const res = await apiFetch('/api/crud', {
      method: 'DELETE',
      body: JSON.stringify({ table: 'deals', id })
    })
    if (!res.ok) {
      const data = await res.json()
      fetchDeals()
      alert('Verwijderen mislukt: ' + (data.error || 'onbekende fout'))
    }
  }

  if (loading) return <LoadingSpinner />

  const totalPipeline = deals.filter(d => !['verloren','opgeleverd'].includes(d.deal_status))
    .reduce((s, d) => s + (d.deal_waarde ?? 0), 0)

  const closers = leden.filter(l => ['closer','sales_manager','founder'].includes(l.rol))
  const setters = leden.filter(l => ['setter','sales_manager','founder'].includes(l.rol))
  const creators = leden.filter(l => l.rol === 'creator')
  const ambassadeurs = leden.filter(l => l.rol === 'ambassadeur')
  const salesManagerComm = Math.round((form.deal_waarde ?? 0) * 0.05)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-[#1B2A4A]">Sales Pipeline</h2>
          <p className="text-sm text-gray-500">Pipeline waarde: <span className="font-semibold text-[#6B3FA0]">€{totalPipeline.toLocaleString('nl-NL')}</span></p>
        </div>
        {(isManager || isCloser) && <button onClick={openNew} className="btn-primary">+ Nieuwe deal</button>}
      </div>

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex gap-3 overflow-x-auto pb-4">
          {STAGES.map(stage => (
            <DroppableColumn key={stage.key} stage={stage}
              deals={deals.filter(d => d.deal_status === stage.key)}
              onEdit={openEdit} onDelete={handleDelete}
              canEditDeal={canEdit} isManager={isManager} />
          ))}
        </div>
        <DragOverlay>
          {activeDeal && <DealCard deal={activeDeal} onEdit={() => {}} onDelete={() => {}} isDragging canEdit={false} isManager={false} />}
        </DragOverlay>
      </DndContext>

      {/* Deal modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editDeal ? 'Deal bewerken' : 'Nieuwe deal'} size="lg">
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Bedrijfsnaam *</label>
              <input className="input" value={form.bedrijfsnaam ?? ''} onChange={e => setForm(f => ({...f, bedrijfsnaam: e.target.value}))} /></div>
            <div><label className="label">Product</label>
              <select className="input" value={form.product ?? ''} onChange={e => setForm(f => ({...f, product: e.target.value as Deal['product']}))}>
                <option value="">-</option>
                {Object.entries(PRODUCT_LABELS).map(([v,l]) => <option key={v} value={v}>{l}</option>)}
              </select></div>
            <div><label className="label">Deal waarde (€)</label>
              <input type="number" className="input" value={form.deal_waarde ?? ''} onChange={e => setForm(f => ({...f, deal_waarde: Number(e.target.value)}))} /></div>
            <div><label className="label">Status</label>
              <select className="input" value={form.deal_status ?? 'call'} onChange={e => setForm(f => ({...f, deal_status: e.target.value as DealStatus}))}>
                {STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select></div>
            <div><label className="label">Closer</label>
              <select className="input" value={form.closer_naam ?? ''} onChange={e => setForm(f => ({...f, closer_naam: e.target.value || null}))}>
                <option value="">- geen -</option>
                {closers.map(l => <option key={l.id} value={l.naam}>{l.naam}</option>)}
              </select></div>
            <div><label className="label">Setter</label>
              <select className="input" value={form.setter_naam ?? ''} onChange={e => setForm(f => ({...f, setter_naam: e.target.value || null}))}>
                <option value="">- geen -</option>
                {setters.map(l => <option key={l.id} value={l.naam}>{l.naam}</option>)}
              </select></div>
            <div><label className="label">Creator</label>
              <select className="input" value={form.creator_naam ?? ''} onChange={e => setForm(f => ({...f, creator_naam: e.target.value || null}))}>
                <option value="">- geen -</option>
                {creators.map(l => <option key={l.id} value={l.naam}>{l.naam}</option>)}
              </select></div>
            <div><label className="label">Ambassadeur</label>
              <select className="input" value={form.ambassadeur_naam ?? ''} onChange={e => setForm(f => ({...f, ambassadeur_naam: e.target.value || null}))}>
                <option value="">- geen -</option>
                {ambassadeurs.map(l => <option key={l.id} value={l.naam}>{l.naam}</option>)}
              </select></div>
            <div><label className="label">Commissie closer (€)</label>
              <input type="number" className="input" value={form.commissie_closer ?? ''} onChange={e => setForm(f => ({...f, commissie_closer: Number(e.target.value)}))} /></div>
            <div><label className="label">Commissie setter (€)</label>
              <input type="number" className="input" value={form.commissie_setter ?? ''} onChange={e => setForm(f => ({...f, commissie_setter: Number(e.target.value)}))} /></div>
            {form.creator_naam && (
              <div><label className="label">Commissie creator (€)</label>
                <input type="number" className="input" value={form.commissie_creator ?? ''} onChange={e => setForm(f => ({...f, commissie_creator: Number(e.target.value)}))} /></div>
            )}
            {form.ambassadeur_naam && (
              <div><label className="label">Commissie ambassadeur (€)</label>
                <input type="number" className="input" value={form.commissie_ambassadeur ?? ''} onChange={e => setForm(f => ({...f, commissie_ambassadeur: Number(e.target.value)}))} /></div>
            )}
            <div className="col-span-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-sm text-gray-600">Sales manager commissie: <span className="font-semibold text-[#6B3FA0]">€{salesManagerComm.toLocaleString('nl-NL')}</span> <span className="text-gray-400">(5% — automatisch)</span></p>
            </div>
          </div>
          {isManager && (
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.betaling_ontvangen ?? false} onChange={e => setForm(f => ({...f, betaling_ontvangen: e.target.checked}))} />
                Betaling ontvangen
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.commissie_betaald ?? false} onChange={e => setForm(f => ({...f, commissie_betaald: e.target.checked}))} />
                Commissie uitbetaald
              </label>
            </div>
          )}
          <div><label className="label">Notities</label>
            <textarea className="input" rows={2} value={form.notities ?? ''} onChange={e => setForm(f => ({...f, notities: e.target.value}))} /></div>
          <div className="flex gap-3 justify-end pt-2 border-t">
            <button onClick={() => setShowModal(false)} className="btn-secondary">Annuleren</button>
            <button onClick={handleSave} disabled={saving || !form.bedrijfsnaam} className="btn-primary disabled:opacity-50">
              {saving ? 'Opslaan...' : editDeal ? 'Opslaan' : 'Deal aanmaken'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function DroppableColumn({ stage, deals, onEdit, onDelete, canEditDeal, isManager }: {
  stage: typeof STAGES[0]; deals: Deal[]; onEdit: (d: Deal) => void; onDelete: (id: string) => void
  canEditDeal: (d: Deal) => boolean; isManager: boolean
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.key })
  const total = deals.reduce((s, d) => s + (d.deal_waarde ?? 0), 0)
  return (
    <div ref={setNodeRef} className={`flex-shrink-0 w-64 rounded-xl border-2 ${stage.color} ${stage.bg} transition-all ${isOver ? 'ring-2 ring-offset-1 ring-[#6B3FA0]' : ''}`}>
      <div className="p-3 border-b border-black/10">
        <p className="font-semibold text-sm text-gray-700">{stage.label}</p>
        <p className="text-xs text-gray-500">{deals.length} deals · €{total.toLocaleString('nl-NL')}</p>
      </div>
      <div className="p-2 space-y-2 min-h-[200px]">
        {deals.map(deal => (
          <DealCard key={deal.id} deal={deal} onEdit={onEdit} onDelete={onDelete}
            canEdit={canEditDeal(deal)} isManager={isManager} />
        ))}
      </div>
    </div>
  )
}

function DealCard({ deal, onEdit, onDelete, isDragging, canEdit, isManager }: {
  deal: Deal; onEdit: (d: Deal) => void; onDelete: (id: string) => void
  isDragging?: boolean; canEdit: boolean; isManager: boolean
}) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: deal.id, disabled: !canEdit })
  const days = differenceInDays(new Date(), new Date(deal.created_at))

  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined

  return (
    <div ref={setNodeRef} style={style} {...(canEdit ? listeners : {})} {...(canEdit ? attributes : {})}
      className={`bg-white rounded-lg p-3 shadow-sm border border-gray-200 ${canEdit ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'} select-none ${isDragging ? 'opacity-50' : ''} ${days > 14 ? 'border-l-4 border-l-orange-400' : ''}`}>
      <p className="font-semibold text-sm text-[#1B2A4A] truncate">{deal.bedrijfsnaam}</p>
      {deal.deal_waarde && <p className="text-sm font-bold text-[#1A7A3A]">€{deal.deal_waarde.toLocaleString('nl-NL')}</p>}
      {deal.closer_naam && <p className="text-xs text-gray-500 mt-1">👤 {deal.closer_naam}</p>}
      {deal.setter_naam && <p className="text-xs text-gray-400">🎯 {deal.setter_naam}</p>}
      <p className="text-xs text-gray-400">{days}d geleden</p>
      {canEdit && (
        <div className="flex gap-1 mt-2" onPointerDown={e => e.stopPropagation()}>
          <button onClick={() => onEdit(deal)} className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded hover:bg-blue-100">Bewerk</button>
          {isManager && <button onClick={() => onDelete(deal.id)} className="text-xs px-2 py-1 bg-red-50 text-red-700 rounded hover:bg-red-100">Verwijder</button>}
        </div>
      )}
    </div>
  )
}
