'use client'

import { useEffect, useState } from 'react'
import { ExternalLink, RotateCcw } from 'lucide-react'

const labels = [
  ['discovered', 'Discover URL-fetching feature'],
  ['serverSide', 'Identify server-side request behavior'],
  ['internal', 'Reach internal service'],
  ['enumerated', 'Enumerate internal service'],
  ['retrieved', 'Retrieve restricted information'],
  ['submitted', 'Submit flag'],
] as const

type Progress = Record<(typeof labels)[number][0], boolean>
const blank: Progress = { discovered: false, serverSide: false, internal: false, enumerated: false, retrieved: false, submitted: false }

export default function SsrfChallengePage() {
  const [progress, setProgress] = useState<Progress>(blank)
  const [message, setMessage] = useState('Open the scanner and investigate how it retrieves URLs.')
  const refresh = async () => { const response = await fetch('/api/scanner/api/progress', { cache: 'no-store' }); setProgress(await response.json()) }
  useEffect(() => { void refresh(); const timer = window.setInterval(() => void refresh(), 1500); return () => window.clearInterval(timer) }, [])
  const reset = async () => { await fetch('/api/scanner/reset', { method: 'POST' }); setProgress(blank); setMessage('Lab reset. Start a fresh SSRF investigation.') }
  const submit = async (event: React.FormEvent<HTMLFormElement>) => { event.preventDefault(); const input = event.currentTarget.elements.namedItem('flag') as HTMLInputElement; const response = await fetch('/api/scanner/submit', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ flag: input.value }) }); const result = await response.json() as { accepted?: boolean; error?: string }; setMessage(result.accepted ? 'Flag accepted. Challenge complete.' : result.error ?? 'Submission rejected.'); await refresh() }
  const count = labels.filter(([id]) => progress[id]).length
  return <main className="min-h-screen bg-[#080b12] px-4 py-6 text-slate-100 sm:px-8 lg:px-12"><div className="mx-auto max-w-6xl"><header className="mb-7 flex flex-wrap items-start justify-between gap-4 border-b border-slate-800 pb-6"><div><p className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300">CYBERLAB / Rivan Cybersecurity Institute</p><h1 className="font-mono text-3xl font-bold text-white sm:text-5xl">SSRF &amp; Internal Service Discovery</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">Investigate a URL inspection service and determine whether its server-side request boundary exposes internal operations.</p></div><button className="inline-flex items-center gap-2 border border-slate-700 px-3 py-2 text-sm text-slate-300" onClick={reset}><RotateCcw size={15} /> Reset lab</button></header><div className="grid gap-6 lg:grid-cols-[1fr_320px]"><section className="space-y-5"><div className="border border-slate-800 bg-[#0d121b] p-5"><div className="flex items-center justify-between"><div><p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Target</p><p className="mt-1 font-mono text-cyan-200">scanner.internal.lab</p></div><button className="inline-flex items-center gap-2 bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950" onClick={() => window.open('/targets/scanner', '_blank', 'noopener,noreferrer')}>Open target <ExternalLink size={15} /></button></div><p className="mt-8 text-sm leading-6 text-slate-400">The scanner is reachable from the attacker boundary. The internal operations console is not directly exposed and should only respond to a legitimate server-side request from the scanner.</p></div><div className="border border-slate-800 bg-[#0d121b] p-5"><p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Lab status</p><p className="mt-2 text-sm text-slate-300">{message}</p>{progress.retrieved && !progress.submitted && <form className="mt-4 flex gap-2" onSubmit={submit}><label className="sr-only" htmlFor="ssrf-flag">Flag submission</label><input id="ssrf-flag" name="flag" className="lab-input-dark lab-selection min-w-0 flex-1 font-mono text-xs" aria-label="Flag" placeholder="CYBERLAB{...}" /><button className="border border-cyan-300/50 px-3 py-2 text-xs font-bold text-cyan-200">Submit</button></form>}</div></section><aside className="border border-slate-800 bg-[#0d121b] p-5"><div className="mb-4 flex items-center justify-between"><h2 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-300">Evidence</h2><span className="font-mono text-sm text-cyan-300">{count}/{labels.length}</span></div><ul className="space-y-4">{labels.map(([id, label]) => <li className="flex gap-3 text-sm" key={id}><span className={progress[id] ? 'text-emerald-300' : 'text-slate-600'}>{progress[id] ? '✓' : '○'}</span><span className={progress[id] ? 'text-slate-200' : 'text-slate-500'}>{label}</span></li>)}</ul></aside></div></div></main>
}
