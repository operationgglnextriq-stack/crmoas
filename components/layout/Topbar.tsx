'use client'

import { usePathname } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { Rol } from '@/types'
import { useEffect, useState } from 'react'
import { apiFetch } from '@/lib/apiFetch'
import Link from 'next/link'

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/vandaag': 'Vandaag te doen',
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

interface TopbarProps {
  sidebarCollapsed: boolean
  onBannerChange?: (hasBanner: boolean) => void
  onMobileMenuOpen?: () => void
}

export default function Topbar({ sidebarCollapsed, onBannerChange, onMobileMenuOpen }: TopbarProps) {
  const pathname = usePathname()
  const { teamMember } = useAuth()
  const title = pageTitles[pathname] ?? 'NEXTRIQ CRM'
  const [actiesVandaag, setActiesVandaag] = useState(0)

  const showBanner = actiesVandaag > 0 && pathname !== '/vandaag'

  useEffect(() => {
    onBannerChange?.(showBanner)
  }, [showBanner, onBannerChange])

  useEffect(() => {
    if (!teamMember) return
    if (pathname === '/vandaag') {
      setActiesVandaag(0)
      return
    }

    apiFetch('/api/lead-acties?vandaag=true')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setActiesVandaag(data.length)
        }
      })
      .catch(() => {})
  }, [teamMember, pathname])

  return (
    <header
      className={`fixed top-0 right-0 left-0 bg-white border-b border-gray-200 z-40 transition-all duration-300 ${
        sidebarCollapsed ? 'lg:left-16' : 'lg:left-60'
      }`}
    >
      {/* Actie notificatie banner */}
      {showBanner && (
        <Link
          href="/vandaag"
          className="flex items-center justify-center gap-2 px-4 py-1.5 bg-[#1B2A4A] text-white text-xs hover:bg-[#253a68] transition-colors"
        >
          <span>📋</span>
          <span className="font-medium">{actiesVandaag} {actiesVandaag === 1 ? 'actie' : 'acties'} voor vandaag →</span>
        </Link>
      )}

      <div className="h-12 lg:h-16 flex items-center justify-between px-4 lg:px-6">
        {/* Left: logo on mobile, page title everywhere */}
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold text-[#1B2A4A] lg:hidden">NEXTRIQ</span>
          <h1 className="text-sm lg:text-lg font-semibold text-[#1B2A4A] hidden lg:block">{title}</h1>
        </div>

        {/* Right: hamburger on mobile, user info on desktop */}
        <div className="flex items-center gap-2">
          {/* Desktop: user info */}
          {teamMember && (
            <div className="hidden lg:flex items-center gap-2">
              <div className="text-right">
                <p className="text-xs font-semibold text-[#1B2A4A] leading-tight">{teamMember.naam}</p>
                <p className="text-[10px] text-gray-500 leading-tight">{rolLabels[teamMember.rol as Rol]}</p>
              </div>
              <div className="w-8 h-8 rounded-full bg-[#6B3FA0] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                {teamMember.naam.charAt(0).toUpperCase()}
              </div>
            </div>
          )}

          {/* Mobile: hamburger button */}
          <button
            onClick={onMobileMenuOpen}
            className="lg:hidden flex items-center justify-center w-10 h-10 text-[#1B2A4A] hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Menu openen"
          >
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="3" y1="6" x2="19" y2="6" />
              <line x1="3" y1="11" x2="19" y2="11" />
              <line x1="3" y1="16" x2="19" y2="16" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  )
}
