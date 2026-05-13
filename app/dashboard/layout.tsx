'use client'
import { useState } from 'react'
import { DashboardProvider, useDashboard } from '@/components/dashboard/DashboardContext'
import { ConversionsProvider } from '@/components/dashboard/ConversionsContext'
import { ToastProvider } from '@/components/Toast'
import { MobileMenuProvider } from '@/components/dashboard/MobileMenuContext'
import Sidebar from '@/components/dashboard/Sidebar'
import JobsToast from '@/components/dashboard/JobsToast'
import CommandPalette from '@/components/dashboard/CommandPalette'
import { GlobalSkeletonStyles } from '@/components/Skeleton'

function Shell({ children }: { children: React.ReactNode }) {
  const { profile, pagesUsed, pagesLimit, bonusPages, effectivePlan, isTeamMember, loading, refresh } = useDashboard()
  const [mobileOpen, setMobileOpen] = useState(false)

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 28, height: 28, border: '2px solid rgba(0,229,160,0.2)', borderTop: '2px solid var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    )
  }

  return (
    <ConversionsProvider onComplete={refresh}>
      <MobileMenuProvider value={{ open: mobileOpen, setOpen: setMobileOpen, toggle: () => setMobileOpen(o => !o) }}>
        <CommandPalette />
        <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex' }}>
          <div className={`bxl-sidebar-wrap ${mobileOpen ? 'open' : ''}`}>
            <Sidebar profile={profile} pagesUsed={pagesUsed} pagesLimit={pagesLimit} bonusPages={bonusPages} effectivePlan={effectivePlan} isTeamMember={isTeamMember} onClose={() => setMobileOpen(false)} />
          </div>
          {mobileOpen && <div onClick={() => setMobileOpen(false)} className="bxl-sidebar-backdrop" />}
          <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            {children}
          </main>
          <JobsToast />
        </div>
      </MobileMenuProvider>
      <style jsx global>{`
        @media (max-width: 900px) {
          .bxl-sidebar-wrap {
            position: fixed; top: 0; left: 0; height: 100vh; z-index: 100;
            transform: translateX(-100%); transition: transform 0.25s ease;
          }
          .bxl-sidebar-wrap.open { transform: translateX(0); }
          .bxl-sidebar-backdrop {
            position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 99;
            backdrop-filter: blur(2px);
          }
          .bxl-mobile-menu { display: flex !important; }
        }
      `}</style>
    </ConversionsProvider>
  )
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <GlobalSkeletonStyles />
      <DashboardProvider>
        <Shell>{children}</Shell>
      </DashboardProvider>
    </ToastProvider>
  )
}
