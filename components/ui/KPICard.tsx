interface KPICardProps {
  title: string
  value: string | number
  icon: string
  color: 'navy' | 'purple' | 'green' | 'orange' | 'red'
  subtitle?: string
}

const borderColors = {
  navy: 'border-l-[#1B2A4A]',
  purple: 'border-l-[#6B3FA0]',
  green: 'border-l-[#1A7A3A]',
  orange: 'border-l-[#E67E22]',
  red: 'border-l-[#CC0000]',
}

const textColors = {
  navy: 'text-[#1B2A4A]',
  purple: 'text-[#6B3FA0]',
  green: 'text-[#1A7A3A]',
  orange: 'text-[#E67E22]',
  red: 'text-[#CC0000]',
}

export default function KPICard({ title, value, icon, color, subtitle }: KPICardProps) {
  return (
    <div className={`kpi-card border-l-4 ${borderColors[color]}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 font-medium">{title}</p>
          <p className={`text-2xl font-bold mt-1 ${textColors[color]}`}>{value}</p>
          {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
        </div>
        <span className="text-2xl">{icon}</span>
      </div>
    </div>
  )
}
