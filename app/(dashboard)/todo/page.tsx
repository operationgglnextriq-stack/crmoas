'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import Modal from '@/components/ui/Modal'

type Prioriteit = 'laag' | 'normaal' | 'hoog' | 'urgent'
type TodoStatus = 'open' | 'bezig' | 'gedaan'

interface Todo {
  id: string
  created_at: string
  titel: string
  omschrijving: string | null
  prioriteit: Prioriteit
  status: TodoStatus
  toegewezen_aan: string | null
  aangemaakt_door: string
  deadline: string | null
  afdeling: string | null
}

const TOEGESTANE_ROLLEN = ['founder', 'sales_manager', 'web_developer', 'head_of_tech']

const prioriteitBadge: Record<Prioriteit, string> = {
  laag: 'bg-gray-100 text-gray-600',
  normaal: 'bg-blue-100 text-blue-700',
  hoog: 'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700',
}

const statusBadge: Record<TodoStatus, string> = {
  open: 'bg-slate-100 text-slate-600',
  bezig: 'bg-yellow-100 text-yellow-700',
  gedaan: 'bg-green-100 text-green-700',
}

const volgendeStatus: Record<TodoStatus, TodoStatus> = {
  open: 'bezig',
  bezig: 'gedaan',
  gedaan: 'open',
}

const leegForm = {
  titel: '',
  omschrijving: '',
  prioriteit: 'normaal' as Prioriteit,
  toegewezen_aan: '',
  deadline: '',
  afdeling: '',
}

export default function TodoPage() {
  const { teamMember, loading } = useAuth()
  const router = useRouter()
  const [todos, setTodos] = useState<Todo[]>([])
  const [loadingTodos, setLoadingTodos] = useState(true)
  const [filterStatus, setFilterStatus] = useState<TodoStatus | 'alle'>('alle')
  const [filterPrioriteit, setFilterPrioriteit] = useState<Prioriteit | 'alle'>('alle')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(leegForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const isManager = teamMember?.rol === 'founder' || teamMember?.rol === 'sales_manager'

  useEffect(() => {
    if (!loading && teamMember) {
      if (!TOEGESTANE_ROLLEN.includes(teamMember.rol)) {
        router.push('/dashboard')
      }
    }
  }, [loading, teamMember, router])

  useEffect(() => { fetchTodos() }, [])

  async function fetchTodos() {
    setLoadingTodos(true)
    const res = await fetch('/api/todos')
    if (res.ok) {
      const data = await res.json()
      setTodos(data)
    }
    setLoadingTodos(false)
  }

  async function handleStatusChange(todo: Todo, nieuweStatus: TodoStatus) {
    const res = await fetch('/api/todos', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: todo.id, data: { status: nieuweStatus } }),
    })
    if (res.ok) {
      setTodos(prev => prev.map(t => t.id === todo.id ? { ...t, status: nieuweStatus } : t))
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Weet je zeker dat je deze taak wilt verwijderen?')) return
    const res = await fetch('/api/todos', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    if (res.ok) {
      setTodos(prev => prev.filter(t => t.id !== id))
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.titel.trim()) { setError('Titel is verplicht'); return }
    if (!teamMember) return
    setSaving(true)
    setError('')
    const payload = {
      titel: form.titel.trim(),
      omschrijving: form.omschrijving.trim() || null,
      prioriteit: form.prioriteit,
      status: 'open' as TodoStatus,
      toegewezen_aan: form.toegewezen_aan.trim() || null,
      aangemaakt_door: teamMember.naam,
      deadline: form.deadline || null,
      afdeling: form.afdeling.trim() || null,
    }
    const res = await fetch('/api/todos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (res.ok) {
      const created = await res.json()
      setTodos(prev => [created, ...prev])
      setShowModal(false)
      setForm(leegForm)
    } else {
      const d = await res.json()
      setError(d.error ?? 'Onbekende fout')
    }
    setSaving(false)
  }

  const gefilterd = todos.filter(t => {
    if (filterStatus !== 'alle' && t.status !== filterStatus) return false
    if (filterPrioriteit !== 'alle' && t.prioriteit !== filterPrioriteit) return false
    return true
  })

  const aantalOpen = todos.filter(t => t.status === 'open').length
  const aantalBezig = todos.filter(t => t.status === 'bezig').length
  const aantalGedaan = todos.filter(t => t.status === 'gedaan').length

  if (loading || !teamMember) return <LoadingSpinner />

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-lg font-bold text-[#1B2A4A]">📋 Todo List</h2>
        <button onClick={() => { setShowModal(true); setError('') }} className="btn-primary">
          + Nieuwe taak
        </button>
      </div>

      {/* Statistieken */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card text-center">
          <p className="text-2xl font-bold text-slate-700">{aantalOpen}</p>
          <p className="text-sm text-gray-500 mt-1">Open taken</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold text-yellow-600">{aantalBezig}</p>
          <p className="text-sm text-gray-500 mt-1">Bezig</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold text-green-600">{aantalGedaan}</p>
          <p className="text-sm text-gray-500 mt-1">Gedaan</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        {/* Status filter */}
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {(['alle', 'open', 'bezig', 'gedaan'] as const).map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors capitalize ${
                filterStatus === s
                  ? 'bg-[#6B3FA0] text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              {s === 'alle' ? 'Alle' : s}
            </button>
          ))}
        </div>
        {/* Prioriteit dropdown */}
        <select
          value={filterPrioriteit}
          onChange={e => setFilterPrioriteit(e.target.value as Prioriteit | 'alle')}
          className="input text-sm py-1.5 w-auto"
        >
          <option value="alle">Alle prioriteiten</option>
          <option value="laag">Laag</option>
          <option value="normaal">Normaal</option>
          <option value="hoog">Hoog</option>
          <option value="urgent">Urgent</option>
        </select>
      </div>

      {/* Todo kaarten */}
      {loadingTodos ? (
        <LoadingSpinner />
      ) : gefilterd.length === 0 ? (
        <div className="card text-center py-12 text-gray-400">
          <p className="text-3xl mb-2">✅</p>
          <p>Geen taken gevonden</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {gefilterd.map(todo => (
            <div
              key={todo.id}
              className={`card flex flex-col gap-3 ${todo.status === 'gedaan' ? 'opacity-70' : ''}`}
            >
              {/* Badges */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`badge capitalize ${prioriteitBadge[todo.prioriteit]}`}>
                  {todo.prioriteit}
                </span>
                <span className={`badge capitalize ${statusBadge[todo.status]}`}>
                  {todo.status}
                </span>
                {todo.afdeling && (
                  <span className="badge bg-purple-100 text-purple-700">{todo.afdeling}</span>
                )}
              </div>

              {/* Titel + omschrijving */}
              <div>
                <h3 className={`font-bold text-[#1B2A4A] text-sm leading-snug ${todo.status === 'gedaan' ? 'line-through text-gray-400' : ''}`}>
                  {todo.titel}
                </h3>
                {todo.omschrijving && (
                  <p className="text-gray-500 text-xs mt-1 leading-relaxed">{todo.omschrijving}</p>
                )}
              </div>

              {/* Footer meta */}
              <div className="text-xs text-gray-400 space-y-1 mt-auto pt-2 border-t border-gray-100">
                {todo.toegewezen_aan && (
                  <div className="flex items-center gap-1.5">
                    <span>👤</span>
                    <span>{todo.toegewezen_aan}</span>
                  </div>
                )}
                {todo.deadline && (
                  <div className="flex items-center gap-1.5">
                    <span>📅</span>
                    <span>{new Date(todo.deadline).toLocaleDateString('nl-NL')}</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <span>✍️</span>
                  <span>{todo.aangemaakt_door}</span>
                </div>
              </div>

              {/* Acties */}
              <div className="flex gap-2">
                {todo.status === 'open' && (
                  <button
                    onClick={() => handleStatusChange(todo, 'bezig')}
                    className="flex-1 text-xs py-1.5 rounded-lg bg-yellow-50 text-yellow-700 hover:bg-yellow-100 font-medium transition-colors"
                  >
                    ▶ Start
                  </button>
                )}
                {todo.status === 'bezig' && (
                  <button
                    onClick={() => handleStatusChange(todo, 'gedaan')}
                    className="flex-1 text-xs py-1.5 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 font-medium transition-colors"
                  >
                    ✅ Afronden
                  </button>
                )}
                {todo.status === 'gedaan' && (
                  <button
                    onClick={() => handleStatusChange(todo, 'open')}
                    className="flex-1 text-xs py-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 font-medium transition-colors"
                  >
                    ↩ Heropenen
                  </button>
                )}
                {isManager && (
                  <button
                    onClick={() => handleDelete(todo.id)}
                    className="text-xs py-1.5 px-3 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 transition-colors"
                  >
                    🗑️
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Nieuwe taak aanmaken">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <div>
            <label className="label">Titel *</label>
            <input
              type="text"
              className="input"
              value={form.titel}
              onChange={e => setForm(f => ({ ...f, titel: e.target.value }))}
              placeholder="Wat moet er gedaan worden?"
            />
          </div>

          <div>
            <label className="label">Omschrijving</label>
            <textarea
              className="input"
              rows={3}
              value={form.omschrijving}
              onChange={e => setForm(f => ({ ...f, omschrijving: e.target.value }))}
              placeholder="Extra details..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Prioriteit</label>
              <select
                className="input"
                value={form.prioriteit}
                onChange={e => setForm(f => ({ ...f, prioriteit: e.target.value as Prioriteit }))}
              >
                <option value="laag">Laag</option>
                <option value="normaal">Normaal</option>
                <option value="hoog">Hoog</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div>
              <label className="label">Deadline</label>
              <input
                type="date"
                className="input"
                value={form.deadline}
                onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Toegewezen aan</label>
              <input
                type="text"
                className="input"
                value={form.toegewezen_aan}
                onChange={e => setForm(f => ({ ...f, toegewezen_aan: e.target.value }))}
                placeholder="Naam teamlid"
              />
            </div>
            <div>
              <label className="label">Afdeling</label>
              <input
                type="text"
                className="input"
                value={form.afdeling}
                onChange={e => setForm(f => ({ ...f, afdeling: e.target.value }))}
                placeholder="bijv. tech, sales"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2 border-t">
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">
              Annuleren
            </button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 disabled:opacity-50">
              {saving ? 'Opslaan...' : 'Taak aanmaken'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
