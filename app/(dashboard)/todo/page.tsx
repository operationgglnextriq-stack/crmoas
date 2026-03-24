'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'

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

const prioriteitKleur: Record<Prioriteit, string> = {
  laag: 'bg-gray-500/20 text-gray-300 border border-gray-500/30',
  normaal: 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
  hoog: 'bg-orange-500/20 text-orange-300 border border-orange-500/30',
  urgent: 'bg-red-500/20 text-red-300 border border-red-500/30',
}

const statusKleur: Record<TodoStatus, string> = {
  open: 'bg-slate-500/20 text-slate-300 border border-slate-500/30',
  bezig: 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30',
  gedaan: 'bg-green-500/20 text-green-300 border border-green-500/30',
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

  useEffect(() => {
    if (!loading && teamMember) {
      if (!TOEGESTANE_ROLLEN.includes(teamMember.rol)) {
        router.push('/dashboard')
      }
    }
  }, [loading, teamMember, router])

  useEffect(() => {
    fetchTodos()
  }, [])

  async function fetchTodos() {
    setLoadingTodos(true)
    const res = await fetch('/api/todos')
    if (res.ok) {
      const data = await res.json()
      setTodos(data)
    }
    setLoadingTodos(false)
  }

  async function handleStatusChange(todo: Todo) {
    const nieuweStatus = volgendeStatus[todo.status]
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

  if (loading || !teamMember) return null

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">📋 Todo List</h1>
          <p className="text-white/50 text-sm mt-1">{todos.length} taken totaal</p>
        </div>
        <button
          onClick={() => { setShowModal(true); setError('') }}
          className="bg-[#6B3FA0] hover:bg-[#7d4fba] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          + Nieuwe taak
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="flex gap-1 bg-white/5 rounded-lg p-1">
          {(['alle', 'open', 'bezig', 'gedaan'] as const).map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors capitalize ${
                filterStatus === s ? 'bg-[#6B3FA0] text-white' : 'text-white/60 hover:text-white'
              }`}
            >
              {s === 'alle' ? 'Alle statussen' : s}
            </button>
          ))}
        </div>
        <div className="flex gap-1 bg-white/5 rounded-lg p-1">
          {(['alle', 'laag', 'normaal', 'hoog', 'urgent'] as const).map(p => (
            <button
              key={p}
              onClick={() => setFilterPrioriteit(p)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors capitalize ${
                filterPrioriteit === p ? 'bg-[#6B3FA0] text-white' : 'text-white/60 hover:text-white'
              }`}
            >
              {p === 'alle' ? 'Alle prioriteiten' : p}
            </button>
          ))}
        </div>
      </div>

      {/* Todo grid */}
      {loadingTodos ? (
        <div className="text-white/50 text-center py-12">Laden...</div>
      ) : gefilterd.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">✅</p>
          <p className="text-white/50">Geen taken gevonden</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {gefilterd.map(todo => (
            <div
              key={todo.id}
              className={`bg-white/5 border rounded-xl p-4 flex flex-col gap-3 transition-all hover:bg-white/8 ${
                todo.status === 'gedaan' ? 'border-green-500/20 opacity-75' : 'border-white/10'
              }`}
            >
              {/* Badges */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${prioriteitKleur[todo.prioriteit]}`}>
                  {todo.prioriteit}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${statusKleur[todo.status]}`}>
                  {todo.status}
                </span>
                {todo.afdeling && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    {todo.afdeling}
                  </span>
                )}
              </div>

              {/* Titel */}
              <div>
                <h3 className={`font-semibold text-white text-sm leading-snug ${todo.status === 'gedaan' ? 'line-through opacity-60' : ''}`}>
                  {todo.titel}
                </h3>
                {todo.omschrijving && (
                  <p className="text-white/50 text-xs mt-1 leading-relaxed">{todo.omschrijving}</p>
                )}
              </div>

              {/* Meta */}
              <div className="text-xs text-white/40 space-y-1 mt-auto">
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
              <div className="flex gap-2 pt-2 border-t border-white/10">
                <button
                  onClick={() => handleStatusChange(todo)}
                  className="flex-1 text-xs py-1.5 rounded-lg bg-[#6B3FA0]/30 hover:bg-[#6B3FA0]/60 text-purple-300 font-medium transition-colors"
                >
                  {todo.status === 'open' ? '▶ Start' : todo.status === 'bezig' ? '✓ Afronden' : '↩ Heropenen'}
                </button>
                <button
                  onClick={() => handleDelete(todo.id)}
                  className="text-xs py-1.5 px-3 rounded-lg bg-red-500/10 hover:bg-red-500/30 text-red-400 transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#1B2A4A] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <h2 className="text-lg font-bold text-white">Nieuwe taak aanmaken</h2>
              <button onClick={() => setShowModal(false)} className="text-white/40 hover:text-white transition-colors text-xl leading-none">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-3 py-2">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs text-white/60 mb-1.5 font-medium">Titel *</label>
                <input
                  type="text"
                  value={form.titel}
                  onChange={e => setForm(f => ({ ...f, titel: e.target.value }))}
                  placeholder="Wat moet er gedaan worden?"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder-white/30 focus:outline-none focus:border-[#6B3FA0]"
                />
              </div>

              <div>
                <label className="block text-xs text-white/60 mb-1.5 font-medium">Omschrijving</label>
                <textarea
                  value={form.omschrijving}
                  onChange={e => setForm(f => ({ ...f, omschrijving: e.target.value }))}
                  placeholder="Extra details..."
                  rows={3}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder-white/30 focus:outline-none focus:border-[#6B3FA0] resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-white/60 mb-1.5 font-medium">Prioriteit</label>
                  <select
                    value={form.prioriteit}
                    onChange={e => setForm(f => ({ ...f, prioriteit: e.target.value as Prioriteit }))}
                    className="w-full bg-[#1B2A4A] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#6B3FA0]"
                  >
                    <option value="laag">Laag</option>
                    <option value="normaal">Normaal</option>
                    <option value="hoog">Hoog</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-white/60 mb-1.5 font-medium">Deadline</label>
                  <input
                    type="date"
                    value={form.deadline}
                    onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))}
                    className="w-full bg-[#1B2A4A] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#6B3FA0]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-white/60 mb-1.5 font-medium">Toegewezen aan</label>
                  <input
                    type="text"
                    value={form.toegewezen_aan}
                    onChange={e => setForm(f => ({ ...f, toegewezen_aan: e.target.value }))}
                    placeholder="Naam teamlid"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder-white/30 focus:outline-none focus:border-[#6B3FA0]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-white/60 mb-1.5 font-medium">Afdeling</label>
                  <input
                    type="text"
                    value={form.afdeling}
                    onChange={e => setForm(f => ({ ...f, afdeling: e.target.value }))}
                    placeholder="bijv. tech, sales"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder-white/30 focus:outline-none focus:border-[#6B3FA0]"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 rounded-lg border border-white/10 text-white/60 hover:text-white hover:border-white/20 text-sm transition-colors"
                >
                  Annuleren
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-lg bg-[#6B3FA0] hover:bg-[#7d4fba] text-white text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {saving ? 'Opslaan...' : 'Taak aanmaken'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
