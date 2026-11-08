import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Menu } from 'lucide-react'
import BrandMark from './BrandMark'
import Sidebar from './Sidebar'

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
          <Outlet />
        </main>
      </div>
    </div>
  )
}
