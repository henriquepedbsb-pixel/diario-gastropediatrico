import { Stethoscope } from 'lucide-react'

export default function LoadingScreen() {
  return (
    <div className="fixed inset-0 bg-white flex flex-col items-center justify-center gap-4 z-50">
      <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center animate-pulse">
        <Stethoscope size={28} className="text-white" />
      </div>
      <div className="flex gap-1.5">
        {[0,1,2].map(i => (
          <div key={i} className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"
               style={{ animationDelay: `${i * 0.15}s` }} />
        ))}
      </div>
      <p className="text-sm text-slate-500 font-medium">Carregando…</p>
    </div>
  )
}
