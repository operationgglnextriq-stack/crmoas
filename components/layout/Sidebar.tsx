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
  { href: '/dashboard', icon: '🏠', label: 'Dashboard', roles: ['founder', 'sales_manager', 'setter', 'outreacher', 'closer', 'creator', 'ambassadeur'] },
  { href: '/leads', icon: '👥', label: 'Leads', roles: ['founder', 'sales_manager', 'setter'] },
  { href: '/outreach', icon: '📞', label: 'Outreach', roles: ['founder', 'sales_manager', 'outreacher'] },
  { href: '/pipeline', icon: '💼', label: 'Pipeline', roles: ['founder', 'sales_manager', 'closer'] },
  { href: '/marktdata', icon: '📊', label: 'Marktdata', roles: ['founder', 'sales_manager', 'setter', 'outreacher'] },
  { href: '/dagrapporten', icon: '📋', label: 'Dagrapporten', roles: ['founder', 'sales_manager', 'setter', 'outreacher', 'closer'] },
  { href: '/leaderboard', icon: '🏆', label: 'Leaderboard', roles: ['founder', 'sales_manager'] },
  { href: '/commissies', icon: '💰', label: 'Commissies', roles: ['founder', 'sales_manager'] },
  { href: '/team', icon: '⚙️', label: 'Team beheer', roles: ['founder', 'sales_manager'] },
]

const rolLabels: Record<Rol, string> = {
  founder: 'Founder',
  sales_manager: 'Sales Manager',
  setter: 'Appointment Setter',
  outreacher: 'Cold Outreacher',
  closer: 'Closer',
  creator: 'Creator',
  ambassadeur: 'Ambassadeur',
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
          title={collapsed ? 'Uitloggen' : undefined}
        >
          <span>🚪</span>
          {!collapsed && <span>Uitloggen</span>}
        </button>
      </div>
    </aside>
  )
}
