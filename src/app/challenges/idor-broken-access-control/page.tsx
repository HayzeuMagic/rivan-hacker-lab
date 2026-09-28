'use client'

import { useEffect, useState } from 'react'
import { ExternalLink, Flag, RotateCcw, ShieldCheck } from 'lucide-react'

const objectives = [
  ['robots', 'Discover application guidance'],
  ['javascript', 'Enumerate client-side functionality'],
  ['idor', 'Demonstrate the authorization weakness'],
  ['briefing', 'Access the restricted briefing'],
  ['submitted', 'Submit the completion flag'],
] as const

type Progress = { robots: boolean; javascript: boolean; idor: boolean; briefing: boolean; submitted: boolean }
const blankProgress: Progress = { robots: false, javascript: false, idor: false, briefing: false, submitted: false }

async function loadProgress() {
  const response = await fetch('/api/hr/api/progress', { cache: 'no-store' })
  return response.json() as Promise<Omit<Progress, 'submitted'>>
}

export default function WebAuthBypassPage() {
  const [progress, setProgress] = useState<Progress>(blankProgress)
  const [flag, setFlag] = useState('')
  const [message, setMessage] = useState('Open the target and investigate the portal like an internal application.')

  const refresh = async () => {
    const next = await loadProgress()
    setProgress((current) => ({ ...current, ...next }))
  }

  useEffect(() => {
    void refresh()
    const timer = window.setInterval(() => void refresh(), 1500)
    return () => window.clearInterval(timer)
  }, [])

  const reset = async () => {
    await fetch('/api/hr/reset', { method: 'POST' })
    setProgress(blankProgress)
    setMessage('Session cleared. Start a fresh investigation.')
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    const response = await fetch('/api/hr/submit', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ flag }) })
    const result = await response.json() as { accepted?: boolean; error?: string }
    if (result.accepted) setProgress((current) => ({ ...current, submitted: true }))
    setMessage(result.accepted ? 'Flag accepted. Challenge complete.' : result.error ?? 'Submission rejected.')
  }

  const completed = objectives.filter(([id]) => progress[id]).length

  return (
    <main className="min-h-screen bg-[#080b12] px-4 py-6 text-slate-100 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-6xl">
        <header className="mb-7 flex flex-wrap items-start justify-between gap-4 border-b border-slate-800 pb-6"><div><p className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300">CYBERLAB / Rivan Cybersecurity Institute</p><h1 className="font-mono text-3xl font-bold text-white sm:text-5xl">Broken Access Control / IDOR</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">Investigate an employee portal and determine whether restricted data is protected by server-side object authorization.</p></div><button className="inline-flex items-center gap-2 border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:border-slate-500" onClick={reset}><RotateCcw size={15} /> Reset lab</button></header>
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <section className="space-y-5"><div className="border border-slate-800 bg-[#0d121b] p-5"><div className="flex items-center justify-between gap-4"><div><p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Target</p><p className="mt-1 font-mono text-cyan-200">hr.internal.lab</p></div><button className="inline-flex items-center gap-2 bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-200" onClick={() => window.open('/targets/hr', '_blank', 'noopener,noreferrer')}>Open target <ExternalLink size={15} /></button></div></div><div className="border border-slate-800 bg-[#0d121b] p-5"><div className="mb-3 flex items-center gap-2"><ShieldCheck size={17} className="text-cyan-300" /><h2 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-300">Authorized scope</h2></div><p className="text-sm leading-6 text-slate-400">All requests stay within the CYBERLAB employee portal boundary. Inspect real API requests and test whether changing an employee object identifier changes the server response.</p></div><div className="border border-slate-800 bg-[#0d121b] p-5"><p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Lab status</p><p className="mt-2 text-sm text-slate-300">{message}</p>{progress.briefing && !progress.submitted && <form className="mt-4 flex gap-2" onSubmit={submit}><label className="sr-only" htmlFor="idor-flag">Flag submission</label><input id="idor-flag" className="lab-input-dark lab-selection min-w-0 flex-1 font-mono text-xs" aria-label="Flag" placeholder="CYBERLAB{...}" value={flag} onChange={(event) => setFlag(event.target.value)} /><button className="border border-cyan-300/50 px-3 py-2 text-xs font-bold text-cyan-200 hover:bg-cyan-300/10">Submit</button></form>}{progress.submitted && <div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-emerald-300"><Flag size={16} /> Challenge complete</div>}</div></section>
          <aside className="border border-slate-800 bg-[#0d121b] p-5"><div className="mb-4 flex items-center justify-between"><h2 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-300">Evidence</h2><span className="font-mono text-sm text-cyan-300">{completed}/{objectives.length}</span></div><div className="mb-5 h-1 bg-slate-800"><div className="h-full bg-cyan-300 transition-all" style={{ width: `${(completed / objectives.length) * 100}%` }} /></div><ul className="space-y-4">{objectives.map(([id, label]) => <li className="flex items-start gap-3 text-sm" key={id}><span className={progress[id] ? 'text-emerald-300' : 'text-slate-600'}>{progress[id] ? '✓' : '○'}</span><span className={progress[id] ? 'text-slate-200' : 'text-slate-500'}>{label}</span></li>)}</ul></aside>
        </div>
      </div>
    </main>
  )
}