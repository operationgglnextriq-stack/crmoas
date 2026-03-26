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

const prioriteitLabels: Record<Prioriteit, string> = {
  laag: 'Низкий',
  normaal: 'Обычный',
  hoog: 'Высокий',
  urgent: 'Срочный',
}

const statusLabels: Record<TodoStatus, string> = {
  open: 'Открытая',
  bezig: 'В работе',
  gedaan: 'Выполнено',
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
  const [viewTodo, setViewTodo] = useState<Todo | null>(null)
  const [editTodo, setEditTodo] = useState<Todo | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editForm, setEditForm] = useState<Partial<Todo>>({})
  const [editSaving, setEditSaving] = useState(false)
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
    if (!confirm('Вы уверены, что хотите удалить эту задачу?')) return
    const res = await fetch('/api/todos', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    if (res.ok) {
      setTodos(prev => prev.filter(t => t.id !== id))
    }
  }

  function openEdit(todo: Todo) {
    setEditTodo(todo)
    setEditForm({
      titel: todo.titel,
      omschrijving: todo.omschrijving ?? '',
      prioriteit: todo.prioriteit,
      toegewezen_aan: todo.toegewezen_aan ?? '',
      deadline: todo.deadline ?? '',
      afdeling: todo.afdeling ?? '',
    })
    setShowEditModal(true)
  }

  async function handleEditSave() {
    if (!editTodo) return
    setEditSaving(true)
    const res = await fetch('/api/todos', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: editTodo.id,
        data: {
          titel: editForm.titel,
          omschrijving: editForm.omschrijving || null,
          prioriteit: editForm.prioriteit,
          toegewezen_aan: editForm.toegewezen_aan || null,
          deadline: editForm.deadline || null,
          afdeling: editForm.afdeling || null,
        }
      }),
    })
    if (res.ok) {
      const updated = await res.json()
      setTodos(prev => prev.map(t => t.id === editTodo.id ? updated : t))
      setShowEditModal(false)
      setEditTodo(null)
    }
    setEditSaving(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.titel.trim()) { setError('Заголовок обязателен'); return }
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
      setError(d.error ?? 'Неизвестная ошибка')
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

  const statusFilterLabels: Record<TodoStatus | 'alle', string> = {
    alle: 'Все',
    open: 'Открытые',
    bezig: 'В работе',
    gedaan: 'Выполнено',
  }

  if (loading || !teamMember) return <LoadingSpinner />

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-lg font-bold text-[#1B2A4A]">📋 Список задач</h2>
        <button onClick={() => { setShowModal(true); setError('') }} className="btn-primary">
          + Новая задача
        </button>
      </div>

      {/* Statistieken */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card text-center border-l-4 border-slate-400">
          <p className="text-2xl font-bold text-slate-700">{aantalOpen}</p>
          <p className="text-sm text-gray-500 mt-1">Открытые задачи</p>
        </div>
        <div className="card text-center border-l-4 border-yellow-400">
          <p className="text-2xl font-bold text-yellow-600">{aantalBezig}</p>
          <p className="text-sm text-gray-500 mt-1">В работе</p>
        </div>
        <div className="card text-center border-l-4 border-green-400">
          <p className="text-2xl font-bold text-green-600">{aantalGedaan}</p>
          <p className="text-sm text-gray-500 mt-1">Выполнено</p>
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
              className="px-3 py-1.5 rounded-md text-xs font-medium transition-colors capitalize"
              style={filterStatus === s ? { backgroundColor: '#6B3FA0', color: 'white' } : { color: '#4B5563' }}
            >
              {statusFilterLabels[s]}
            </button>
          ))}
        </div>
        {/* Prioriteit dropdown */}
        <select
          value={filterPrioriteit}
          onChange={e => setFilterPrioriteit(e.target.value as Prioriteit | 'alle')}
          className="input text-sm py-1.5 w-auto"
        >
          <option value="alle">Все приоритеты</option>
          <option value="laag">Низкий</option>
          <option value="normaal">Обычный</option>
          <option value="hoog">Высокий</option>
          <option value="urgent">Срочный</option>
        </select>
      </div>

      {/* Todo kaarten */}
      {loadingTodos ? (
        <LoadingSpinner />
      ) : gefilterd.length === 0 ? (
        <div className="card text-center py-16">
          <div className="w-16 h-16 bg-purple-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">📋</span>
          </div>
          <p className="text-lg font-bold text-[#1B2A4A] mb-1">Задачи не найдены</p>
          <p className="text-sm text-gray-400 mb-6">Создайте первую задачу для команды управления</p>
          <button onClick={() => { setShowModal(true); setError("") }} className="btn-primary">
            + Создать новую задачу
          </button>
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
                <span className={`badge ${prioriteitBadge[todo.prioriteit]}`}>
                  {prioriteitLabels[todo.prioriteit]}
                </span>
                <span className={`badge ${statusBadge[todo.status]}`}>
                  {statusLabels[todo.status]}
                </span>
                {todo.afdeling && (
                  <span className="badge bg-purple-100 text-purple-700">{todo.afdeling}</span>
                )}
              </div>

              {/* Titel + omschrijving */}
              <div className="cursor-pointer" onClick={() => setViewTodo(todo)}>
                <h3 className={`font-bold text-[#1B2A4A] text-sm leading-snug hover:text-[#6B3FA0] transition-colors ${todo.status === 'gedaan' ? 'line-through text-gray-400' : ''}`}>
                  {todo.titel}
                </h3>
                {todo.omschrijving && (
                  <p className="text-gray-500 text-xs mt-1 leading-relaxed line-clamp-2">{todo.omschrijving}</p>
                )}
                {!todo.omschrijving && (
                  <p className="text-gray-300 text-xs mt-1 italic">Нажмите для открытия...</p>
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
                    <span>{new Date(todo.deadline).toLocaleDateString('ru-RU')}</span>
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
                    ▶ Начать
                  </button>
                )}
                {todo.status === 'bezig' && (
                  <button
                    onClick={() => handleStatusChange(todo, 'gedaan')}
                    className="flex-1 text-xs py-1.5 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 font-medium transition-colors"
                  >
                    ✅ Завершить
                  </button>
                )}
                {todo.status === 'gedaan' && (
                  <button
                    onClick={() => handleStatusChange(todo, 'open')}
                    className="flex-1 text-xs py-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 font-medium transition-colors"
                  >
                    ↩ Переоткрыть
                  </button>
                )}
                <button
                  onClick={() => openEdit(todo)}
                  className="text-xs py-1.5 px-3 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                >
                  ✏️
                </button>
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
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Создать новую задачу">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <div>
            <label className="label">Заголовок *</label>
            <input
              type="text"
              className="input"
              value={form.titel}
              onChange={e => setForm(f => ({ ...f, titel: e.target.value }))}
              placeholder="Что нужно сделать?"
            />
          </div>

          <div>
            <label className="label">Описание</label>
            <textarea
              className="input"
              rows={3}
              value={form.omschrijving}
              onChange={e => setForm(f => ({ ...f, omschrijving: e.target.value }))}
              placeholder="Дополнительные детали..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Приоритет</label>
              <select
                className="input"
                value={form.prioriteit}
                onChange={e => setForm(f => ({ ...f, prioriteit: e.target.value as Prioriteit }))}
              >
                <option value="laag">Низкий</option>
                <option value="normaal">Обычный</option>
                <option value="hoog">Высокий</option>
                <option value="urgent">Срочный</option>
              </select>
            </div>
            <div>
              <label className="label">Дедлайн</label>
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
              <label className="label">Назначено</label>
              <input
                type="text"
                className="input"
                value={form.toegewezen_aan}
                onChange={e => setForm(f => ({ ...f, toegewezen_aan: e.target.value }))}
                placeholder="Имя участника"
              />
            </div>
            <div>
              <label className="label">Отдел</label>
              <input
                type="text"
                className="input"
                value={form.afdeling}
                onChange={e => setForm(f => ({ ...f, afdeling: e.target.value }))}
                placeholder="напр. tech, sales"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2 border-t">
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">
              Отмена
            </button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 disabled:opacity-50">
              {saving ? 'Сохранение...' : 'Создать задачу'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Detail view Modal */}
      {viewTodo && (
        <Modal open={!!viewTodo} onClose={() => setViewTodo(null)} title="📋 Детали задачи">
          <div className="space-y-4">
            {/* Status + Prioriteit badges */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`badge ${
                viewTodo.prioriteit === 'urgent' ? 'bg-red-100 text-red-700' :
                viewTodo.prioriteit === 'hoog' ? 'bg-orange-100 text-orange-700' :
                viewTodo.prioriteit === 'normaal' ? 'bg-blue-100 text-blue-700' :
                'bg-gray-100 text-gray-600'
              }`}>{prioriteitLabels[viewTodo.prioriteit]}</span>
              <span className={`badge ${
                viewTodo.status === 'gedaan' ? 'bg-green-100 text-green-700' :
                viewTodo.status === 'bezig' ? 'bg-yellow-100 text-yellow-700' :
                'bg-slate-100 text-slate-600'
              }`}>{statusLabels[viewTodo.status]}</span>
              {viewTodo.afdeling && <span className="badge bg-purple-100 text-purple-700">{viewTodo.afdeling}</span>}
            </div>

            {/* Titel */}
            <div>
              <p className="text-xs text-gray-400 uppercase font-semibold mb-1">Задача</p>
              <p className={`font-bold text-[#1B2A4A] text-lg ${viewTodo.status === 'gedaan' ? 'line-through text-gray-400' : ''}`}>
                {viewTodo.titel}
              </p>
            </div>

            {/* Omschrijving / Notities */}
            {viewTodo.omschrijving ? (
              <div>
                <p className="text-xs text-gray-400 uppercase font-semibold mb-1">Описание / Заметки</p>
                <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {viewTodo.omschrijving}
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-400 italic">
                Описание не добавлено
              </div>
            )}

            {/* Meta info */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              {viewTodo.toegewezen_aan && (
                <div>
                  <p className="text-xs text-gray-400 uppercase font-semibold mb-0.5">Назначено</p>
                  <p className="font-medium text-[#1B2A4A]">👤 {viewTodo.toegewezen_aan}</p>
                </div>
              )}
              {viewTodo.deadline && (
                <div>
                  <p className="text-xs text-gray-400 uppercase font-semibold mb-0.5">Дедлайн</p>
                  <p className="font-medium text-[#1B2A4A]">📅 {new Date(viewTodo.deadline).toLocaleDateString('ru-RU')}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-gray-400 uppercase font-semibold mb-0.5">Создано</p>
                <p className="font-medium text-gray-600">✍️ {viewTodo.aangemaakt_door}</p>
              </div>
            </div>

            {/* Acties */}
            <div className="flex gap-2 pt-2 border-t">
              {viewTodo.status === 'open' && (
                <button onClick={() => { handleStatusChange(viewTodo, 'bezig'); setViewTodo({...viewTodo, status: 'bezig'}) }}
                  className="flex-1 text-sm py-2 rounded-lg bg-yellow-50 text-yellow-700 hover:bg-yellow-100 font-medium">
                  ▶ Начать
                </button>
              )}
              {viewTodo.status === 'bezig' && (
                <button onClick={() => { handleStatusChange(viewTodo, 'gedaan'); setViewTodo({...viewTodo, status: 'gedaan'}) }}
                  className="flex-1 text-sm py-2 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 font-medium">
                  ✅ Завершить
                </button>
              )}
              {viewTodo.status === 'gedaan' && (
                <button onClick={() => { handleStatusChange(viewTodo, 'open'); setViewTodo({...viewTodo, status: 'open'}) }}
                  className="flex-1 text-sm py-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 font-medium">
                  ↩ Переоткрыть
                </button>
              )}
              <button onClick={() => { setViewTodo(null); openEdit(viewTodo) }}
                className="text-sm py-2 px-4 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-medium">
                ✏️ Изменить
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Bewerk Modal */}
      <Modal open={showEditModal} onClose={() => setShowEditModal(false)} title="Изменить задачу">
        <div className="space-y-4">
          <div>
            <label className="label">Заголовок *</label>
            <input
              type="text"
              className="input"
              value={editForm.titel ?? ''}
              onChange={e => setEditForm(f => ({ ...f, titel: e.target.value }))}
            />
          </div>
          <div>
            <label className="label">Описание / Заметки</label>
            <textarea
              className="input"
              rows={4}
              value={editForm.omschrijving ?? ''}
              onChange={e => setEditForm(f => ({ ...f, omschrijving: e.target.value }))}
              placeholder="Добавьте заметки или детали..."
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Приоритет</label>
              <select
                className="input"
                value={editForm.prioriteit ?? 'normaal'}
                onChange={e => setEditForm(f => ({ ...f, prioriteit: e.target.value as Prioriteit }))}
              >
                <option value="laag">Низкий</option>
                <option value="normaal">Обычный</option>
                <option value="hoog">Высокий</option>
                <option value="urgent">Срочный</option>
              </select>
            </div>
            <div>
              <label className="label">Дедлайн</label>
              <input
                type="date"
                className="input"
                value={editForm.deadline ?? ''}
                onChange={e => setEditForm(f => ({ ...f, deadline: e.target.value }))}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Назначено</label>
              <input
                type="text"
                className="input"
                value={editForm.toegewezen_aan ?? ''}
                onChange={e => setEditForm(f => ({ ...f, toegewezen_aan: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">Отдел</label>
              <input
                type="text"
                className="input"
                value={editForm.afdeling ?? ''}
                onChange={e => setEditForm(f => ({ ...f, afdeling: e.target.value }))}
              />
            </div>
          </div>
          <div className="flex gap-3 pt-2 border-t">
            <button type="button" onClick={() => setShowEditModal(false)} className="btn-secondary flex-1">
              Отмена
            </button>
            <button onClick={handleEditSave} disabled={editSaving} className="btn-primary flex-1 disabled:opacity-50">
              {editSaving ? 'Сохранение...' : 'Сохранить изменения'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
