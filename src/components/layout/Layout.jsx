import { Suspense, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Menu } from 'lucide-react'
import BrandMark from './BrandMark'
import Sidebar from './Sidebar'

function CarregandoTela() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-4" aria-busy="true" aria-label="Carregando">
      <div className="h-24 rounded-3xl bg-slate-200/70 animate-pulse" />
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
        {[...Array(8)].map((_, i) => <div key={i} className="h-24 rounded-2xl bg-slate-200/50 animate-pulse" />)}
      </div>
    </div>
  )
}

export default function Layout() {
  const [open, setOpen] = useState(false)

  return (
    <div className="flex h-screen bg-paper overflow-hidden">
      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-0 z-40 bg-noite/50 lg:hidden" onClick={() => setOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-noite text-suave shadow-2xl
        transform transition-transform duration-200 ease-in-out
        lg:relative lg:translate-x-0 lg:shadow-none
        ${open ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <Sidebar onClose={() => setOpen(false)} />
      </aside>

      {/* Content */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Mobile top bar */}
        <header className="lg:hidden flex items-center gap-3 h-14 px-4 bg-noite text-white shrink-0">
          <button onClick={() => setOpen(true)} aria-label="Abrir menu" className="p-1.5 text-suave hover:text-white rounded-lg hover:bg-white/10">
            <Menu size={22} />
          </button>
          <BrandMark compact />
        </header>

        <main className="flex-1 overflow-y-auto">
          <Suspense fallback={<CarregandoTela />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  )
}
