import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Menu, Stethoscope } from 'lucide-react'
import Sidebar from './Sidebar'

export default function Layout() {
  const [open, setOpen] = useState(false)

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-0 z-40 bg-black/30 lg:hidden" onClick={() => setOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-60 bg-white border-r border-slate-200 shadow-lg
        transform transition-transform duration-200 ease-in-out
        lg:relative lg:translate-x-0 lg:shadow-none
        ${open ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <Sidebar onClose={() => setOpen(false)} />
      </aside>

      {/* Content */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Mobile top bar */}
        <header className="lg:hidden flex items-center gap-3 h-14 px-4 bg-white border-b border-slate-200 shrink-0">
          <button onClick={() => setOpen(true)} className="p-1.5 text-slate-500 hover:text-slate-700 rounded-lg hover:bg-slate-100">
            <Menu size={22} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-blue-600 rounded-md flex items-center justify-center">
              <Stethoscope size={15} className="text-white" />
            </div>
            <span className="font-semibold text-slate-800 text-sm">Gastropediatria</span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
