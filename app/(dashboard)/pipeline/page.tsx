'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/context/AuthContext'
import { Deal, DealStatus } from '@/types'
// import { DealStatusBadge } from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
} from '@dnd-kit/core'
import { useDraggable } from '@dnd-kit/core'
import { differenceInDays } from 'date-fns'
// import { nl } from 'date-fns/locale'

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

const PRODUCT_COLORS: Record<string, string> = {
  website_std: 'bg-blue-100 text-blue-800',
  website_maat: 'bg-indigo-100 text-indigo-800',
  hosting: 'bg-gray-100 text-gray-700',
  ai_scan_pro: 'bg-purple-100 text-purple-800',
  ai_scan_dig: 'bg-violet-100 text-violet-800',
  ai_agency: 'bg-pink-100 text-pink-800',
  ink: 'bg-yellow-100 text-yellow-800',
  comm_klant: 'bg-green-100 text-green-800',
  comm_extern: 'bg-teal-100 text-teal-800',
}

function DealCard({ deal, onClick }: { deal: Deal; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: deal.id })
  const days = differenceInDays(new Date(), new Date(deal.created_at))

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    zIndex: 1000,
    opacity: isDragging ? 0.5 : 1,
  } : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="font-semibold text-[#1B2A4A] text-sm leading-tight">{deal.bedrijfsnaam}</p>
        <button
          onPointerDown={e => e.stopPropagation()}
          onClick={e => { e.stopPropagation(); onClick() }}
          className="text-gray-400 hover:text-gray-600 text-xs flex-shrink-0"
        >
          ⓘ
        </button>
      </div>
      {deal.product && (
        <span className={`badge text-xs mt-1 ${PRODUCT_COLORS[deal.product] ?? 'bg-gray-100 text-gray-700'}`}>
          {deal.product.replace(/_/g, ' ')}
        </span>
      )}
      {deal.deal_waarde && (
        <p className="text-sm font-bold text-[#1A7A3A] mt-2">
          €{deal.deal_waarde.toLocaleString('nl-NL')}
        </p>
      )}
      <div className="flex items-center justify-between mt-2">
        <div className="text-xs text-gray-500 space-y-0.5">
          {deal.closer_naam && <p>👤 {deal.closer_naam}</p>}
          {deal.setter_naam && <p>📞 {deal.setter_naam}</p>}
        </div>
        <span className={`text-xs px-1.5 py-0.5 rounded ${days > 14 ? 'bg-red-100 text-red-700' : days > 7 ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'}`}>
          {days}d
        </span>
      </div>
    </div>
  )
}

function KanbanColumn({
  stage,
  deals,
  onCardClick,
}: {
  stage: typeof STAGES[0]
  deals: Deal[]
  onCardClick: (deal: Deal) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.key })
  const total = deals.reduce((s, d) => s + (d.deal_waarde ?? 0), 0)

  return (
    <div className="flex-shrink-0 w-64">
      <div className={`rounded-xl border-t-4 ${stage.color} bg-gray-50 flex flex-col h-full`}>
        <div className="p-3 border-b border-gray-200">
          <p className="font-semibold text-sm text-gray-800">{stage.label}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="badge bg-gray-200 text-gray-700">{deals.length}</span>
            {total > 0 && (
              <span className="text-xs text-gray-500">€{total.toLocaleString('nl-NL')}</span>
            )}
          </div>
        </div>
        <div
          ref={setNodeRef}
          className={`flex-1 p-2 space-y-2 min-h-32 transition-colors rounded-b-xl ${isOver ? 'bg-blue-50' : ''}`}
        >
          {deals.map(deal => (
            <DealCard key={deal.id} deal={deal} onClick={() => onCardClick(deal)} />
          ))}
        </div>
      </div>
    </div>
  )
}

export default function PipelinePage() {
  const { teamMember } = useAuth()
  const supabase = createClient()
  const [deals, setDeals] = useState<Deal[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null)
  const [activeDeal, setActiveDeal] = useState<Deal | null>(null)
  const [filterCloser, setFilterCloser] = useState('')
  const [filterProduct, setFilterProduct] = useState('')
  const [newDeal, setNewDeal] = useState({ bedrijfsnaam: '', product: '', deal_waarde: '', closer_naam: '', setter_naam: '' })
  const [showNewDeal, setShowNewDeal] = useState(false)

  const isManager = teamMember?.rol === 'founder' || teamMember?.rol === 'sales_manager'

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  const fetchDeals = useCallback(async () => {
    let query = supabase.from('deals').select('*').order('created_at', { ascending: false })
    if (!isManager && teamMember?.rol === 'closer') {
      query = query.eq('closer_naam', teamMember.naam)
    }
    const { data } = await query
    setDeals(data ?? [])
    setLoading(false)
  }, [teamMember, isManager])

  useEffect(() => {
    if (teamMember) fetchDeals()
  }, [teamMember, fetchDeals])

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDeal(deals.find(d => d.id === event.active.id) ?? null)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveDeal(null)
    if (!over) return
    const dealId = active.id as string
    const newStatus = over.id as DealStatus
    const deal = deals.find(d => d.id === dealId)
    if (!deal || deal.deal_status === newStatus) return
    setDeals(prev => prev.map(d => d.id === dealId ? { ...d, deal_status: newStatus } : d))
    await supabase.from('deals').update({ deal_status: newStatus }).eq('id', dealId)
  }

  const handleCreateDeal = async () => {
    const { error } = await supabase.from('deals').insert({
      bedrijfsnaam: newDeal.bedrijfsnaam,
      product: newDeal.product || null,
      deal_waarde: newDeal.deal_waarde ? Number(newDeal.deal_waarde) : null,
      closer_naam: newDeal.closer_naam || null,
      setter_naam: newDeal.setter_naam || null,
      deal_status: 'call',
    })
    if (!error) {
      setShowNewDeal(false)
      setNewDeal({ bedrijfsnaam: '', product: '', deal_waarde: '', closer_naam: '', setter_naam: '' })
      fetchDeals()
    }
  }

  const closers = Array.from(new Set(deals.map(d => d.closer_naam).filter(Boolean)))

  const filtered = deals.filter(d => {
    if (filterCloser && d.closer_naam !== filterCloser) return false
    if (filterProduct && d.product !== filterProduct) return false
    return true
  })

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-4">
      {/* Filters + actions */}
      <div className="flex flex-wrap items-center gap-3">
        <select value={filterCloser} onChange={e => setFilterCloser(e.target.value)} className="input !w-40">
          <option value="">Alle closers</option>
          {closers.map(c => <option key={c!} value={c!}>{c}</option>)}
        </select>
        <select value={filterProduct} onChange={e => setFilterProduct(e.target.value)} className="input !w-44">
          <option value="">Alle producten</option>
          {['website_std','website_maat','hosting','ai_scan_pro','ai_scan_dig','ai_agency','ink','comm_klant','comm_extern'].map(p => (
            <option key={p} value={p}>{p.replace(/_/g, ' ')}</option>
          ))}
        </select>
        <div className="ml-auto">
          <button onClick={() => setShowNewDeal(true)} className="btn-primary">+ Nieuwe deal</button>
        </div>
      </div>

      {/* Kanban */}
      <div className="overflow-x-auto pb-4 kanban-scroll">
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="flex gap-4" style={{ minWidth: 'max-content' }}>
            {STAGES.map(stage => (
              <KanbanColumn
                key={stage.key}
                stage={stage}
                deals={filtered.filter(d => d.deal_status === stage.key)}
                onCardClick={setSelectedDeal}
              />
            ))}
          </div>
          <DragOverlay>
            {activeDeal && (
              <div className="bg-white rounded-lg border-2 border-[#6B3FA0] p-3 shadow-xl w-64 opacity-90">
                <p className="font-semibold text-[#1B2A4A] text-sm">{activeDeal.bedrijfsnaam}</p>
                {activeDeal.deal_waarde && (
                  <p className="text-sm font-bold text-[#1A7A3A]">€{activeDeal.deal_waarde.toLocaleString('nl-NL')}</p>
                )}
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Deal detail modal */}
      <Modal open={!!selectedDeal} onClose={() => setSelectedDeal(null)} title={selectedDeal?.bedrijfsnaam ?? ''} size="lg">
        {selectedDeal && (
          <div className="grid grid-cols-2 gap-4 text-sm">
            <Row label="Product" value={selectedDeal.product?.replace(/_/g, ' ')} />
            <Row label="Waarde" value={selectedDeal.deal_waarde ? `€${selectedDeal.deal_waarde.toLocaleString('nl-NL')}` : '-'} />
            <Row label="Status" value={selectedDeal.deal_status} />
            <Row label="Closer" value={selectedDeal.closer_naam} />
            <Row label="Setter" value={selectedDeal.setter_naam} />
            <Row label="Kanaal" value={selectedDeal.kanaal} />
            <Row label="Betaling ontvangen" value={selectedDeal.betaling_ontvangen ? '✅ Ja' : '❌ Nee'} />
            <Row label="Commissie betaald" value={selectedDeal.commissie_betaald ? '✅ Ja' : '❌ Nee'} />
            {selectedDeal.notities && (
              <div className="col-span-2">
                <p className="text-gray-500 mb-1">Notities</p>
                <p className="text-gray-800 bg-gray-50 p-3 rounded-lg">{selectedDeal.notities}</p>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* New deal modal */}
      <Modal open={showNewDeal} onClose={() => setShowNewDeal(false)} title="Nieuwe deal aanmaken">
        <div className="space-y-4">
          <div>
            <label className="label">Bedrijfsnaam *</label>
            <input className="input" value={newDeal.bedrijfsnaam} onChange={e => setNewDeal(f => ({ ...f, bedrijfsnaam: e.target.value }))} />
          </div>
          <div>
            <label className="label">Product</label>
            <select className="input" value={newDeal.product} onChange={e => setNewDeal(f => ({ ...f, product: e.target.value }))}>
              <option value="">Selecteer...</option>
              {['website_std','website_maat','hosting','ai_scan_pro','ai_scan_dig','ai_agency','ink','comm_klant','comm_extern'].map(p => (
                <option key={p} value={p}>{p.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Deal waarde (€)</label>
            <input type="number" className="input" value={newDeal.deal_waarde} onChange={e => setNewDeal(f => ({ ...f, deal_waarde: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Closer</label>
              <input className="input" value={newDeal.closer_naam} onChange={e => setNewDeal(f => ({ ...f, closer_naam: e.target.value }))} />
            </div>
            <div>
              <label className="label">Setter</label>
              <input className="input" value={newDeal.setter_naam} onChange={e => setNewDeal(f => ({ ...f, setter_naam: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-3 pt-2 justify-end">
            <button onClick={() => setShowNewDeal(false)} className="btn-secondary">Annuleren</button>
            <button onClick={handleCreateDeal} disabled={!newDeal.bedrijfsnaam} className="btn-primary disabled:opacity-50">Deal aanmaken</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-gray-500 text-xs">{label}</p>
      <p className="font-medium text-gray-800">{value || '-'}</p>
    </div>
  )
}
