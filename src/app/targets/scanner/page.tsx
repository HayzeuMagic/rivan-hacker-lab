'use client'

import { FormEvent, useState } from 'react'

type Result = { [key: string]: unknown }

export default function ScannerTargetPage() {
  const [url, setUrl] = useState('http://internal-admin.internal.lab/api/status')
  const [flag, setFlag] = useState('')
  const [result, setResult] = useState<Result>({})
  const [message, setMessage] = useState('Enter a URL and scan from the authorized inspection boundary.')

  const scan = async (event: FormEvent) => {
    event.preventDefault()
    const response = await fetch('/api/scanner/api/scan', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ url }),
    })
    const payload = await response.json()
    setResult({ status: response.status, ...payload })
    setMessage(response.ok ? 'Scan completed successfully.' : 'Scan returned an error response. Review status and payload.')
  }

  const submitFlag = async (event: FormEvent) => {
    event.preventDefault()
    const response = await fetch('/api/scanner/submit', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ flag }),
    })
    const payload = await response.json()
    setResult({ status: response.status, ...payload })
    setMessage(payload.accepted ? 'Flag accepted. Challenge complete.' : payload.error ?? 'Flag submission failed.')
  }

  return <main className="min-h-screen bg-[#eef3f2] text-slate-800"><header className="border-b border-slate-200 bg-white px-6 py-5"><div className="mx-auto flex max-w-5xl items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-700">Rivan Cybersecurity Institute</p><h1 className="mt-1 text-xl font-semibold">URL Inspection Service</h1></div><span className="font-mono text-xs text-slate-500">scanner.internal.lab</span></div></header><div className="mx-auto grid max-w-5xl gap-6 px-6 py-10 lg:grid-cols-[1.25fr_1fr]"><section className="space-y-6"><div className="rounded-lg border border-slate-200 bg-white p-7"><p className="text-sm text-teal-700">External monitoring</p><h2 className="mt-2 text-3xl font-semibold tracking-tight">Inspect a service URL.</h2><p className="mt-3 text-sm leading-6 text-slate-500">The inspection worker retrieves the requested address and returns a diagnostic summary for the operations team.</p><form className="mt-7 space-y-3" onSubmit={scan}><label className="block text-xs font-bold uppercase tracking-[0.16em] text-slate-500" htmlFor="url">Service URL</label><div className="flex flex-col gap-2 sm:flex-row"><input id="url" className="lab-input-light lab-selection min-w-0 flex-1 font-mono" value={url} onChange={(event) => setUrl(event.target.value)} /><button className="rounded-md bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-600">Scan URL</button></div></form><p className="mt-4 text-sm text-slate-600">{message}</p></div><div className="rounded-lg border border-slate-200 bg-slate-950 p-5"><p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Scan result</p><pre className="mt-3 min-h-40 overflow-auto whitespace-pre-wrap break-words font-mono text-xs text-emerald-300">{JSON.stringify(result, null, 2)}</pre></div></section><aside className="space-y-6"><div className="rounded-lg border border-slate-200 bg-white p-6"><h2 className="text-sm font-bold uppercase tracking-[0.16em] text-slate-600">Flag submission</h2><p className="mt-2 text-sm text-slate-500">Submit the challenge flag after retrieving it through the URL inspection workflow.</p><form className="mt-4 space-y-3" onSubmit={submitFlag}><label className="block text-xs font-bold uppercase tracking-[0.16em] text-slate-500" htmlFor="scanner-flag">Flag</label><input id="scanner-flag" className="lab-input-light lab-selection font-mono" placeholder="CYBERLAB{...}" value={flag} onChange={(event) => setFlag(event.target.value)} /><button className="w-full rounded-md bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700">Submit Flag</button></form></div><div className="rounded-lg border border-slate-200 bg-white p-6"><h2 className="text-sm font-bold uppercase tracking-[0.16em] text-slate-600">Usage reminder</h2><ul className="mt-3 list-disc space-y-1 pl-4 text-sm text-slate-600"><li>The <strong>Service URL</strong> field is for URLs only.</li><li>The <strong>Flag</strong> field is for <code>CYBERLAB{'{...}'}</code> values only.</li><li>Review HTTP status and response JSON in the result panel.</li></ul></div></aside></div></main>
}
