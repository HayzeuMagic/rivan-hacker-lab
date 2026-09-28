'use client'

import { useEffect, useState } from 'react'
import { ExternalLink, RotateCcw } from 'lucide-react'

const labels = [['authenticated', 'Authentication mechanism discovered'], ['recovery', 'Recovery behavior analyzed'], ['admin', 'Privileged authentication established'], ['submitted', 'Flag submitted']] as const
type Progress = { authenticated: boolean; recovery: boolean; admin: boolean; submitted: boolean }
const blank: Progress = { authenticated: false, recovery: false, admin: false, submitted: false }

export default function AuthenticationSessionSecurityPage() {
  const [progress, setProgress] = useState<Progress>(blank)
  const [flag, setFlag] = useState('')
  const [message, setMessage] = useState('Open the portal and inspect the login and recovery workflow.')
  const refresh = async () => {
    const response = await fetch('/api/portal/api/progress', { cache: 'no-store' })
    const state = await response.json() as { authenticated?: boolean; recovery?: boolean; admin?: boolean; submitted?: boolean }
    setProgress((current) => ({
      ...current,
      authenticated: Boolean(state.authenticated),
      recovery: Boolean(state.recovery),
      admin: Boolean(state.admin),
      submitted: Boolean(state.submitted),
    }))
  }
  useEffect(() => { void refresh(); const timer = window.setInterval(() => void refresh(), 1500); return () => window.clearInterval(timer) }, [])
  const reset = async () => { await fetch('/api/portal/reset', { method: 'POST' }); setProgress(blank); setMessage('Lab reset. Start a fresh authentication investigation.') }
  const submit = async (event: React.FormEvent) => { event.preventDefault(); const response = await fetch('/api/portal/submit', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ flag }) }); const result = await response.json() as { accepted?: boolean; error?: string }; setProgress((current) => ({ ...current, submitted: Boolean(result.accepted) })); setMessage(result.accepted ? 'Flag accepted. Challenge complete.' : result.error ?? 'Submission rejected.') }
  const complete = labels.filter(([id]) => progress[id]).length
  return <main className="min-h-screen bg-[#080b12] px-4 py-6 text-slate-100 sm:px-8 lg:px-12"><div className="mx-auto max-w-6xl"><header className="mb-7 flex flex-wrap items-start justify-between gap-4 border-b border-slate-800 pb-6"><div><p className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300">CYBERLAB / Northstar Logistics</p><h1 className="font-mono text-3xl font-bold text-white sm:text-5xl">Authentication &amp; Session Security</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">Investigate a realistic login and recovery workflow. The primary weakness is a predictable password-reset token.</p></div><button className="inline-flex items-center gap-2 border border-slate-700 px-3 py-2 text-sm text-slate-300" onClick={reset}><RotateCcw size={15} /> Reset lab</button></header><div className="grid gap-6 lg:grid-cols-[1fr_320px]"><section className="space-y-5"><div className="border border-slate-800 bg-[#0d121b] p-5"><div className="flex items-center justify-between gap-4"><div><p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Target</p><p className="mt-1 font-mono text-cyan-200">portal.internal.lab</p></div><button className="inline-flex items-center gap-2 bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950" onClick={() => window.open('/targets/portal', '_blank', 'noopener,noreferrer')}>Open target <ExternalLink size={15} /></button></div></div><div className="border border-slate-800 bg-[#0d121b] p-5"><p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Lab status</p><p className="mt-2 text-sm text-slate-300">{message}</p>{progress.admin && !progress.submitted && <form className="mt-4 flex gap-2" onSubmit={submit}><input className="min-w-0 flex-1 border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-xs text-emerald-200" aria-label="Flag" placeholder="CYBERLAB{...}" value={flag} onChange={(event) => setFlag(event.target.value)} /><button className="border border-cyan-300/50 px-3 py-2 text-xs font-bold text-cyan-200">Submit</button></form>}</div></section><aside className="border border-slate-800 bg-[#0d121b] p-5"><div className="mb-4 flex items-center justify-between"><h2 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-300">Evidence</h2><span className="font-mono text-sm text-cyan-300">{complete}/{labels.length}</span></div><ul className="space-y-4">{labels.map(([id, label]) => <li className="flex gap-3 text-sm" key={id}><span className={progress[id] ? 'text-emerald-300' : 'text-slate-600'}>{progress[id] ? '✓' : '○'}</span><span className={progress[id] ? 'text-slate-200' : 'text-slate-500'}>{label}</span></li>)}</ul></aside></div></div></main>
}
