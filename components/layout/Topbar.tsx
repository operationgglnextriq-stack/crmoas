'use client'

import { usePathname } from 'next/navigation'

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/leads': 'Leads',
  '/leads/nieuw': 'Nieuwe Lead',
  '/outreach': 'Outreach',
  '/outreach/nieuw': 'Nieuw Contact',
  '/pipeline': 'Pipeline',
  '/team': 'Team Beheer',
  '/commissies': 'Commissies',
  '/marktdata': 'Marktdata',
  '/dagrapporten': 'Dagrapporten',
  '/leaderboard': 'Leaderboard',
}

export default function Topbar({ sidebarCollapsed }: { sidebarCollapsed: boolean }) {
  const pathname = usePathname()
  const title = pageTitles[pathname] ?? 'NEXTRIQ CRM'

  return (
    <header
      className={`fixed top-0 right-0 h-16 bg-white border-b border-gray-200 flex items-center px-6 z-40 transition-all duration-300 ${
        sidebarCollapsed ? 'left-16' : 'left-60'
      }`}
    >
      <h1 className="text-lg font-semibold text-[#1B2A4A]">{title}</h1>
    </header>
  )
}
