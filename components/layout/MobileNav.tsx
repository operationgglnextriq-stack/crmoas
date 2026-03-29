'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { Rol } from '@/types'

interface NavItem {
  href: string
  icon: string
  label: string
  roles: Rol[]
}

const navItems: NavItem[] = [
  { href: '/dashboard', icon: '🏠', label: 'Dashboard', roles: ['founder', 'sales_manager', 'setter', 'outreacher', 'closer', 'creator', 'ambassadeur', 'web_developer', 'head_of_tech', 'ai_engineer'] },
  { href: '/leads', icon: '👥', label: 'Leads', roles: ['founder', 'sales_manager', 'setter'] },
  { href: '/outreach', icon: '📞', label: 'Outreach', roles: ['founder', 'sales_manager', 'outreacher'] },
  { href: '/pipeline', icon: '💼', label: 'Pipeline', roles: ['founder', 'sales_manager', 'closer', 'setter', 'creator', 'ambassadeur', 'web_developer', 'head_of_tech', 'ai_engineer'] },
  { href: '/deals', icon: '📁', label: 'Deals', roles: ['founder', 'sales_manager', 'closer', 'web_developer', 'head_of_tech'] },
  { href: '/dagrapporten', icon: '📋', label: 'Rapporten', roles: ['founder', 'sales_manager', 'setter', 'outreacher', 'closer'] },
  { href: '/marktdata', icon: '📊', label: 'Marktdata', roles: ['founder', 'sales_manager', 'setter', 'outreacher'] },
  { href: '/leaderboard', icon: '🏆', label: 'Leaderboard', roles: ['founder', 'sales_manager'] },
  { href: '/commissies', icon: '💰', label: 'Commissies', roles: ['founder', 'sales_manager'] },
  { href: '/team', icon: '⚙️', label: 'Team', roles: ['founder', 'sales_manager'] },
  { href: '/todo', icon: '✅', label: 'Todo', roles: ['founder', 'sales_manager', 'web_developer', 'head_of_tech'] },
]

const BOTTOM_PRIORITY = ['/dashboard', '/leads', '/outreach', '/pipeline', '/deals', '/dagrapporten']

const rolLabels: Record<Rol, string> = {
  founder: 'Founder',
  sales_manager: 'Team Manager',
  setter: 'Appointment Setter',
  outreacher: 'Cold Outreacher',
  closer: 'Closer',
  creator: 'Creator',
  ambassadeur: 'Ambassadeur',
  web_developer: 'Web Developer',
  head_of_tech: 'Head of Tech',
  ai_engineer: 'AI Engineer',
}

export default function MobileNav() {
  const pathname = usePathname()
  const router = useRouter()
  const { teamMember, signOut } = useAuth()
  const [meerOpen, setMeerOpen] = useState(false)

  const userRol = teamMember?.rol as Rol | undefined
  const filteredNav = navItems.filter(item => userRol ? item.roles.includes(userRol) : false)

  // Pick up to 4 primary items based on priority order
  const primaryItems = BOTTOM_PRIORITY
    .map(href => filteredNav.find(item => item.href === href))
    .filter(Boolean)
    .slice(0, 4) as NavItem[]

  const meerItems = filteredNav.filter(item => !primaryItems.find(p => p.href === item.href))

  const handleSignOut = async () => {
    setMeerOpen(false)
    await signOut()
    router.push('/login')
  }

  return (
    <>
      {/* Bottom navigation bar — only mobile */}
      <nav className="fixed bottom-0 left-0 right-0 h-16 bg-[#1B2A4A] flex items-stretch z-50 md:hidden border-t border-white/10 safe-area-pb">
        {primaryItems.map(item => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors ${
                isActive ? 'text-white' : 'text-white/55'
              }`}
            >
              {isActive && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-[#6B3FA0] rounded-b" />
              )}
              <span className="text-xl leading-none">{item.icon}</span>
              <span className="text-[10px] font-medium leading-tight">{item.label}</span>
            </Link>
          )
        })}

        {/* Meer button */}
        <button
          onClick={() => setMeerOpen(true)}
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors ${
            meerOpen ? 'text-white' : 'text-white/55'
          }`}
        >
          <span className="text-xl leading-none">☰</span>
          <span className="text-[10px] font-medium">Meer</span>
        </button>
      </nav>

      {/* Backdrop */}
      {meerOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={() => setMeerOpen(false)}
        />
      )}

      {/* Slide-up sheet */}
      <div
        className={`fixed left-0 right-0 bottom-16 bg-white rounded-t-2xl z-50 md:hidden shadow-2xl transition-transform duration-300 ${
          meerOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        <div className="px-4 pb-6">
          {/* User info */}
          {teamMember && (
            <div className="flex items-center gap-3 py-3 mb-3 border-b border-gray-100">
              <div className="w-10 h-10 rounded-full bg-[#6B3FA0] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                {teamMember.naam.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-[#1B2A4A] text-sm">{teamMember.naam}</p>
                <span className="text-xs bg-[#6B3FA0] text-white px-2 py-0.5 rounded-full">
                  {rolLabels[teamMember.rol as Rol]}
                </span>
              </div>
            </div>
          )}

          {/* Extra nav items */}
          {meerItems.length > 0 && (
            <div className="grid grid-cols-3 gap-2 mb-4">
              {meerItems.map(item => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMeerOpen(false)}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl transition-colors ${
                      isActive
                        ? 'bg-[#6B3FA0]/10 text-[#6B3FA0]'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <span className="text-2xl leading-none">{item.icon}</span>
                    <span className="text-xs font-medium text-center leading-tight">{item.label}</span>
                  </Link>
                )
              })}
            </div>
          )}

          {/* Logout */}
          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 py-3 text-red-600 border border-red-200 rounded-xl hover:bg-red-50 transition-colors text-sm font-medium"
          >
            <span>🚪</span> Uitloggen
          </button>
        </div>
      </div>
    </>
  )
}
