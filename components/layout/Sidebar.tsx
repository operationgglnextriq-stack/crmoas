'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { Rol } from '@/types'

interface NavItem {
  href: string
  icon: string
  label: string
  roles: Rol[]
}

const navItems: NavItem[] = [
  { href: '/dashboard', icon: '🏠', label: 'Дашборд', roles: ['founder', 'sales_manager', 'setter', 'outreacher', 'closer', 'creator', 'ambassadeur', 'web_developer', 'head_of_tech', 'ai_engineer', 'super_admin'] },
  { href: '/leads', icon: '👥', label: 'Лиды', roles: ['founder', 'sales_manager', 'setter', 'super_admin'] },
  { href: '/outreach', icon: '📞', label: 'Аутрич', roles: ['founder', 'sales_manager', 'outreacher', 'super_admin'] },
  { href: '/pipeline', icon: '💼', label: 'Пайплайн', roles: ['founder', 'sales_manager', 'closer', 'setter', 'creator', 'ambassadeur', 'web_developer', 'head_of_tech', 'ai_engineer', 'super_admin'] },
  { href: '/deals', icon: '📁', label: 'Сделки', roles: ['founder', 'sales_manager', 'closer', 'web_developer', 'head_of_tech', 'super_admin'] },
  { href: '/marktdata', icon: '📊', label: 'Данные рынка', roles: ['founder', 'sales_manager', 'setter', 'outreacher', 'super_admin'] },
  { href: '/dagrapporten', icon: '📋', label: 'Дневные отчёты', roles: ['founder', 'sales_manager', 'setter', 'outreacher', 'closer', 'super_admin'] },
  { href: '/leaderboard', icon: '🏆', label: 'Лидерборд', roles: ['founder', 'sales_manager', 'super_admin'] },
  { href: '/commissies', icon: '💰', label: 'Комиссии', roles: ['founder', 'sales_manager', 'super_admin'] },
  { href: '/team', icon: '⚙️', label: 'Управление командой', roles: ['founder', 'sales_manager', 'super_admin'] },
  { href: '/todo', icon: '📋', label: 'Список задач', roles: ['founder', 'sales_manager', 'web_developer', 'head_of_tech', 'super_admin'] },
]

const rolLabels: Record<Rol, string> = {
  founder: 'Franchise Owner',
  sales_manager: 'Team Manager',
  setter: 'Appointment Setter',
  outreacher: 'Cold Outreacher',
  closer: 'Closer',
  creator: 'Creator',
  ambassadeur: 'Амбассадор',
  web_developer: 'Web Developer',
  head_of_tech: 'Head of Tech',
  ai_engineer: 'AI Engineer',
  super_admin: 'Super Admin',
}

export default function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const pathname = usePathname()
  const router = useRouter()
  const { teamMember, signOut } = useAuth()

  const userRol = teamMember?.rol as Rol | undefined

  const filteredNav = navItems.filter(item =>
    userRol ? item.roles.includes(userRol) : false
  )

  const handleSignOut = async () => {
    await signOut()
    router.push('/login')
  }

  return (
    <aside
      className={`fixed top-0 left-0 h-full bg-[#1B2A4A] text-white flex flex-col z-50 transition-all duration-300 ${
        collapsed ? 'w-16' : 'w-60'
      }`}
    >
      {/* Logo */}
      <div className="flex items-center justify-between px-4 py-5 border-b border-white/10">
        {!collapsed && (
          <span className="text-xl font-bold tracking-wide text-white">
            NEXTRIQ
          </span>
        )}
        <button
          onClick={onToggle}
          className="text-white/70 hover:text-white transition-colors ml-auto"
        >
          {collapsed ? '→' : '←'}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto">
        {filteredNav.map(item => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                isActive
                  ? 'bg-[#6B3FA0] text-white'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              }`}
              title={collapsed ? item.label : undefined}
            >
              <span className="text-lg flex-shrink-0">{item.icon}</span>
              {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* User info */}
      <div className="border-t border-white/10 p-4">
        {!collapsed && teamMember && (
          <div className="mb-3">
            <p className="text-sm font-semibold text-white truncate">{teamMember.naam}</p>
            <span className="inline-block mt-1 text-xs bg-[#6B3FA0] text-white px-2 py-0.5 rounded-full">
              {rolLabels[teamMember.rol as Rol]}
            </span>
          </div>
        )}
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 text-white/60 hover:text-white transition-colors text-sm w-full"
          title={collapsed ? 'Выйти' : undefined}
        >
          <span>🚪</span>
          {!collapsed && <span>Выйти</span>}
        </button>
      </div>
    </aside>
  )
}
