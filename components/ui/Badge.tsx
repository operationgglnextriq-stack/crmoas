import { KwalificatieStatus, BANTScore, OutreachStatus, DealStatus } from '@/types'

interface BadgeProps {
  children: React.ReactNode
  color?: 'navy' | 'purple' | 'green' | 'orange' | 'red' | 'gray' | 'blue' | 'yellow'
}

export function Badge({ children, color = 'gray' }: BadgeProps) {
  const colors = {
    navy: 'bg-blue-100 text-blue-900',
    purple: 'bg-purple-100 text-purple-800',
    green: 'bg-green-100 text-green-800',
    orange: 'bg-orange-100 text-orange-800',
    red: 'bg-red-100 text-red-800',
    gray: 'bg-gray-100 text-gray-700',
    blue: 'bg-blue-100 text-blue-700',
    yellow: 'bg-yellow-100 text-yellow-800',
  }
  return (
    <span className={`badge ${colors[color]}`}>
      {children}
    </span>
  )
}

export function BANTBadge({ score }: { score: BANTScore }) {
  if (score === 'sterk') return <span className="badge bg-green-100 text-green-800">🟢 Сильный</span>
  if (score === 'matig') return <span className="badge bg-yellow-100 text-yellow-800">🟡 Средний</span>
  return <span className="badge bg-red-100 text-red-800">🔴 Слабый</span>
}

export function KwalificatieBadge({ status }: { status: KwalificatieStatus }) {
  const map: Record<KwalificatieStatus, { label: string; cls: string }> = {
    warm: { label: '🔥 Тёплый', cls: 'bg-orange-100 text-orange-800' },
    followup_1: { label: '📬 Фоллоу-ап 1', cls: 'bg-blue-100 text-blue-700' },
    followup_2: { label: '📬 Фоллоу-ап 2', cls: 'bg-blue-100 text-blue-700' },
    followup_3: { label: '📬 Фоллоу-ап 3', cls: 'bg-blue-100 text-blue-700' },
    geboekt: { label: '📅 Запланирован', cls: 'bg-green-100 text-green-800' },
    niet: { label: '❌ Нет', cls: 'bg-gray-100 text-gray-600' },
    afwijzing: { label: '🚫 Отказ', cls: 'bg-red-100 text-red-800' },
  }
  const { label, cls } = map[status]
  return <span className={`badge ${cls}`}>{label}</span>
}

export function OutreachStatusBadge({ status }: { status: OutreachStatus }) {
  const map: Record<OutreachStatus, { label: string; cls: string }> = {
    benaderd: { label: '🔵 Связались', cls: 'bg-blue-100 text-blue-700' },
    geen_reactie: { label: '⚫ Нет ответа', cls: 'bg-gray-100 text-gray-600' },
    interesse: { label: '🟡 Интерес', cls: 'bg-yellow-100 text-yellow-800' },
    afspraak_gemaakt: { label: '🟢 Встреча', cls: 'bg-green-100 text-green-800' },
    niet_geinteresseerd: { label: '🔴 Не интересует', cls: 'bg-red-100 text-red-800' },
    callback: { label: '🟠 Перезвонить', cls: 'bg-orange-100 text-orange-800' },
  }
  const { label, cls } = map[status]
  return <span className={`badge ${cls}`}>{label}</span>
}

export function DealStatusBadge({ status }: { status: DealStatus }) {
  const map: Record<DealStatus, { label: string; cls: string }> = {
    call: { label: '📞 Звонок', cls: 'bg-blue-100 text-blue-700' },
    offerte: { label: '📄 Предложение', cls: 'bg-purple-100 text-purple-700' },
    onderhand: { label: '🤝 Переговоры', cls: 'bg-yellow-100 text-yellow-800' },
    gesloten: { label: '✅ Закрыта', cls: 'bg-green-100 text-green-800' },
    betaald: { label: '💰 Оплачена', cls: 'bg-green-200 text-green-900' },
    levering: { label: '🔄 Доставка', cls: 'bg-orange-100 text-orange-800' },
    opgeleverd: { label: '🏁 Завершена', cls: 'bg-teal-100 text-teal-800' },
    verloren: { label: '❌ Потеряна', cls: 'bg-red-100 text-red-800' },
  }
  const { label, cls } = map[status]
  return <span className={`badge ${cls}`}>{label}</span>
}
