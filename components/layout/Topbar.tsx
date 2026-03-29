'use client'

import { usePathname } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { Rol } from '@/types'

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/leads': 'Leads',
  '/leads/nieuw': 'Nieuwe Lead',
  '/outreach': 'Outreach',
  '/outreach/nieuw': 'Nieuw Contact',
  '/pipeline': 'Pipeline',
  '/deals': 'Deals Overzicht',
  '/team': 'Team Beheer',
  '/commissies': 'Commissies',
  '/marktdata': 'Marktdata',
  '/dagrapporten': 'Dagrapporten',
  '/leaderboard': 'Leaderboard',
  '/todo': 'Todo List',
}

const rolLabels: Record<Rol, string> = {
  founder: 'Founder',
  sales_manager: 'Manager',
  setter: 'Setter',
  outreacher: 'Outreacher',
  closer: 'Closer',
  creator: 'Creator',
  ambassadeur: 'Ambassadeur',
  web_developer: 'Web Dev',
  head_of_tech: 'Head of Tech',
  ai_engineer: 'AI Engineer',
}

export default function Topbar({ sidebarCollapsed }: { sidebarCollapsed: boolean }) {
  const pathname = usePathname()
  const { teamMember } = useAuth()
  const title = pageTitles[pathname] ?? 'NEXTRIQ CRM'

  return (
    <header
      className={`fixed top-0 right-0 left-0 h-12 md:h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 md:px-6 z-40 transition-all duration-300 ${
        sidebarCollapsed ? 'md:left-16' : 'md:left-60'
      }`}
    >
      <h1 className="text-base md:text-lg font-semibold text-[#1B2A4A]">{title}</h1>

      {/* User info — only on mobile (sidebar is hidden) */}
      {teamMember && (
        <div className="flex items-center gap-2 md:hidden">
          <div className="text-right">
            <p className="text-xs font-semibold text-[#1B2A4A] leading-tight">{teamMember.naam.split(' ')[0]}</p>
            <p className="text-[10px] text-gray-500 leading-tight">{rolLabels[teamMember.rol as Rol]}</p>
          </div>
          <div className="w-8 h-8 rounded-full bg-[#6B3FA0] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {teamMember.naam.charAt(0).toUpperCase()}
          </div>
        </div>
      )}
    </header>
  )
}
