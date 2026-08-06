import { Outlet } from 'react-router-dom'
import { TopNav } from './TopNav'

export function AppLayout() {
  return (
    <div className="relative flex min-h-dvh flex-col">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-[radial-gradient(ellipse_at_top,rgba(245,197,24,0.12),transparent_70%)]"
      />
      <TopNav />
      <main className="relative flex-1 overflow-y-auto px-4 py-4 pb-[calc(1.5rem+var(--safe-bottom))]">
        <Outlet />
      </main>
    </div>
  )
}
