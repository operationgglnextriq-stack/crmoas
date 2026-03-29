'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect } from 'react'
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
  { href: '/vandaag', icon: '📅', label: 'Vandaag', roles: ['founder', 'sales_manager', 'setter', 'outreacher', 'closer', 'creator', 'ambassadeur', 'web_developer', 'head_of_tech', 'ai_engineer'] },
  { href: '/leads', icon: '👥', label: 'Leads', roles: ['founder', 'sales_manager', 'setter'] },
  { href: '/outreach', icon: '📞', label: 'Outreach', roles: ['founder', 'sales_manager', 'outreacher'] },
  { href: '/pipeline', icon: '💼', label: 'Pipeline', roles: ['founder', 'sales_manager', 'closer', 'setter', 'creator', 'ambassadeur', 'web_developer', 'head_of_tech', 'ai_engineer'] },
  { href: '/deals', icon: '📁', label: 'Deals', roles: ['founder', 'sales_manager', 'closer', 'web_developer', 'head_of_tech'] },
  { href: '/marktdata', icon: '📊', label: 'Marktdata', roles: ['founder', 'sales_manager', 'setter', 'outreacher'] },
  { href: '/dagrapporten', icon: '📋', label: 'Dagrapporten', roles: ['founder', 'sales_manager', 'setter', 'outreacher', 'closer'] },
  { href: '/leaderboard', icon: '🏆', label: 'Leaderboard', roles: ['founder', 'sales_manager'] },
  { href: '/commissies', icon: '💰', label: 'Commissies', roles: ['founder', 'sales_manager'] },
  { href: '/team', icon: '⚙️', label: 'Team beheer', roles: ['founder', 'sales_manager'] },
  { href: '/todo', icon: '✅', label: 'Todo List', roles: ['founder', 'sales_manager', 'web_developer', 'head_of_tech'] },
]

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

interface MobileNavProps {
  open: boolean
  onClose: () => void
}

export default function MobileNav({ open, onClose }: MobileNavProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { teamMember, signOut } = useAuth()

  const userRol = teamMember?.rol as Rol | undefined
  const filteredNav = navItems.filter(item => userRol ? item.roles.includes(userRol) : false)

  // Close drawer on route change
  useEffect(() => {
    onClose()
  }, [pathname]) // eslint-disable-line react-hooks/exhaustive-deps

  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  const handleSignOut = async () => {
    onClose()
    await signOut()
    router.push('/login')
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 z-[60] lg:hidden transition-opacity duration-300 ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Slide-in drawer from right */}
      <div
        className={`fixed top-0 right-0 h-full w-72 max-w-[85vw] bg-[#1B2A4A] z-[70] lg:hidden flex flex-col shadow-2xl transition-transform duration-300 ease-in-out ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <span className="text-xl font-bold text-white tracking-wide">NEXTRIQ</span>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            aria-label="Menu sluiten"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="2" y1="2" x2="16" y2="16" />
              <line x1="16" y1="2" x2="2" y2="16" />
            </svg>
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex-1 overflow-y-auto py-3">
          {filteredNav.map(item => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-5 py-3.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-[#6B3FA0] text-white'
                    : 'text-white/75 hover:bg-white/10 hover:text-white'
                }`}
              >
                {isActive && (
                  <span className="absolute left-0 w-1 h-8 bg-[#9B6FD0] rounded-r" />
                )}
                <span className="text-lg leading-none flex-shrink-0">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* User info + logout */}
        <div className="border-t border-white/10 p-4 space-y-3">
          {teamMember && (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#6B3FA0] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                {teamMember.naam.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white truncate">{teamMember.naam}</p>
                <span className="inline-block text-xs bg-white/15 text-white/90 px-2 py-0.5 rounded-full mt-0.5">
                  {rolLabels[teamMember.rol as Rol]}
                </span>
              </div>
            </div>
          )}
          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 py-2.5 text-sm text-white/70 hover:text-white border border-white/20 hover:border-white/40 rounded-xl transition-colors"
          >
            <span>🚪</span>
            <span>Uitloggen</span>
          </button>
        </div>
      </div>
    </>
  )
}
