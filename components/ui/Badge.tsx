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
  if (score === 'sterk') return <span className="badge bg-green-100 text-green-800">🟢 Sterk</span>
  if (score === 'matig') return <span className="badge bg-yellow-100 text-yellow-800">🟡 Matig</span>
  return <span className="badge bg-red-100 text-red-800">🔴 Zwak</span>
}

export function KwalificatieBadge({ status }: { status: KwalificatieStatus }) {
  const map: Record<KwalificatieStatus, { label: string; cls: string }> = {
    warm: { label: '🔥 Warm', cls: 'bg-orange-100 text-orange-800' },
    followup_1: { label: '📬 Follow-up 1', cls: 'bg-blue-100 text-blue-700' },
    followup_2: { label: '📬 Follow-up 2', cls: 'bg-blue-100 text-blue-700' },
    followup_3: { label: '📬 Follow-up 3', cls: 'bg-blue-100 text-blue-700' },
    geboekt: { label: '📅 Geboekt', cls: 'bg-green-100 text-green-800' },
    niet: { label: '❌ Niet', cls: 'bg-gray-100 text-gray-600' },
    afwijzing: { label: '🚫 Afwijzing', cls: 'bg-red-100 text-red-800' },
  }
  const { label, cls } = map[status]
  return <span className={`badge ${cls}`}>{label}</span>
}

export function OutreachStatusBadge({ status }: { status: OutreachStatus }) {
  const map: Record<OutreachStatus, { label: string; cls: string }> = {
    benaderd: { label: '🔵 Benaderd', cls: 'bg-blue-100 text-blue-700' },
    geen_reactie: { label: '⚫ Geen reactie', cls: 'bg-gray-100 text-gray-600' },
    interesse: { label: '🟡 Interesse', cls: 'bg-yellow-100 text-yellow-800' },
    afspraak_gemaakt: { label: '🟢 Afspraak', cls: 'bg-green-100 text-green-800' },
    niet_geinteresseerd: { label: '🔴 Niet geïnt.', cls: 'bg-red-100 text-red-800' },
    callback: { label: '🟠 Callback', cls: 'bg-orange-100 text-orange-800' },
  }
  const { label, cls } = map[status]
  return <span className={`badge ${cls}`}>{label}</span>
}

export function DealStatusBadge({ status }: { status: DealStatus }) {
  const map: Record<DealStatus, { label: string; cls: string }> = {
    call: { label: '📞 Call', cls: 'bg-blue-100 text-blue-700' },
    offerte: { label: '📄 Offerte', cls: 'bg-purple-100 text-purple-700' },
    onderhand: { label: '🤝 Onderhandeling', cls: 'bg-yellow-100 text-yellow-800' },
    gesloten: { label: '✅ Gesloten', cls: 'bg-green-100 text-green-800' },
    betaald: { label: '💰 Betaald', cls: 'bg-green-200 text-green-900' },
    levering: { label: '🔄 Levering', cls: 'bg-orange-100 text-orange-800' },
    opgeleverd: { label: '🏁 Opgeleverd', cls: 'bg-teal-100 text-teal-800' },
    verloren: { label: '❌ Verloren', cls: 'bg-red-100 text-red-800' },
  }
  const { label, cls } = map[status]
  return <span className={`badge ${cls}`}>{label}</span>
}
