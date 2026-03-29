'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { Rol } from '@/types'

const navItems = [
  { href: '/dashboard',    icon: '🏠', label: 'Дашборд',           roles: ['founder','sales_manager','setter','outreacher','closer','creator','ambassadeur','web_developer','head_of_tech','ai_engineer','super_admin'] },
  { href: '/leads',        icon: '👥', label: 'Лиды',              roles: ['founder','sales_manager','setter','super_admin'] },
  { href: '/outreach',     icon: '📞', label: 'Аутрич',            roles: ['founder','sales_manager','outreacher','super_admin'] },
  { href: '/pipeline',     icon: '💼', label: 'Пайплайн',          roles: ['founder','sales_manager','closer','setter','creator','ambassadeur','web_developer','head_of_tech','ai_engineer','super_admin'] },
  { href: '/deals',        icon: '📁', label: 'Сделки',            roles: ['founder','sales_manager','closer','web_developer','head_of_tech','super_admin'] },
  { href: '/dagrapporten', icon: '📋', label: 'Дневные отчёты',    roles: ['founder','sales_manager','setter','outreacher','closer','super_admin'] },
  { href: '/marktdata',    icon: '📊', label: 'Данные рынка',      roles: ['founder','sales_manager','setter','outreacher','super_admin'] },
  { href: '/leaderboard',  icon: '🏆', label: 'Лидерборд',         roles: ['founder','sales_manager','super_admin'] },
  { href: '/commissies',   icon: '💰', label: 'Комиссии',          roles: ['founder','sales_manager','super_admin'] },
  { href: '/team',         icon: '⚙️', label: 'Управление командой', roles: ['founder','sales_manager','super_admin'] },
  { href: '/todo',         icon: '✅', label: 'Список задач',      roles: ['founder','sales_manager','web_developer','head_of_tech','super_admin'] },
]

const rolLabels: Record<Rol, string> = {
  founder: 'Franchise Owner', sales_manager: 'Manager', setter: 'Setter',
  outreacher: 'Outreacher', closer: 'Closer', creator: 'Creator',
  ambassadeur: 'Амбассадор', web_developer: 'Web Dev',
  head_of_tech: 'Head of Tech', ai_engineer: 'AI Engineer',
  super_admin: 'Super Admin',
}

export default function MobileNav() {
  const pathname = usePathname()
  const router = useRouter()
  const { teamMember, signOut } = useAuth()
  const [open, setOpen] = useState(false)

  const userRol = teamMember?.rol as Rol | undefined
  const filtered = navItems.filter(item => userRol ? item.roles.includes(userRol) : false)

  const handleSignOut = async () => {
    setOpen(false)
    await signOut()
    router.push('/login')
  }

  const currentPage = filtered.find(i => pathname === i.href || pathname.startsWith(i.href + '/'))

  return (
    <>
      {/* Top header bar — mobile only */}
      <div className="fixed top-0 left-0 right-0 h-14 bg-[#1B2A4A] flex items-center justify-between px-4 z-50 md:hidden">
        <span className="text-white font-bold text-base tracking-wide">
          {currentPage ? `${currentPage.icon} ${currentPage.label}` : 'NEXTRIQ CRM'}
        </span>
        <button
          onClick={() => setOpen(true)}
          className="text-white p-2 rounded-lg bg-white/10 active:bg-white/20"
          aria-label="Открыть меню"
        >
          <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-[60] md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Slide-in menu from right */}
      <div
        className={`fixed top-0 right-0 h-full w-72 bg-[#1B2A4A] z-[70] md:hidden flex flex-col shadow-2xl transition-transform duration-300 ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <span className="text-white font-bold text-lg tracking-wide">NEXTRIQ</span>
          <button
            onClick={() => setOpen(false)}
            className="text-white/70 hover:text-white p-1"
          >
            <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto py-3">
          {filtered.map(item => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-5 py-3.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-[#6B3FA0] text-white'
                    : 'text-white/70 active:bg-white/10'
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* User + logout */}
        <div className="border-t border-white/10 p-5">
          {teamMember && (
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-full bg-[#6B3FA0] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                {teamMember.naam.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{teamMember.naam}</p>
                <p className="text-xs text-white/50">{rolLabels[teamMember.rol as Rol]}</p>
              </div>
            </div>
          )}
          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-red-400 border border-red-400/30 rounded-lg active:bg-red-400/10"
          >
            🚪 Выйти
          </button>
        </div>
      </div>
    </>
  )
}
