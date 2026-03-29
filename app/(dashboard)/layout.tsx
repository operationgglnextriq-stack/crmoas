'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import Topbar from '@/components/layout/Topbar'
import MobileNav from '@/components/layout/MobileNav'
import { useAuth } from '@/context/AuthContext'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)
  const [hasBanner, setHasBanner] = useState(false)
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  // Fallback: als loading na 8 seconden nog actief is, forceer doorgaan
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!user) router.push('/login')
    }, 8000)
    return () => clearTimeout(timer)
  }, [user, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#6B3FA0] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">NEXTRIQ laden...</p>
        </div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      <Topbar sidebarCollapsed={collapsed} onBannerChange={setHasBanner} />
      <MobileNav />
      <main
        className={`transition-all duration-300 pb-20 md:pb-0 min-h-screen ${
          collapsed ? 'md:ml-16' : 'md:ml-60'
        } ${hasBanner ? 'pt-20 md:pt-24' : 'pt-12 md:pt-16'}`}
      >
        <div className="p-4 md:p-6">
          {children}
        </div>
      </main>
    </div>
  )
}
