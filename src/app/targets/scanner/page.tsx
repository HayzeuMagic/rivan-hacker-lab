'use client'

import { FormEvent, useState } from 'react'
import { ResultPanel, TargetCard, TargetHeader, lightInput, lightPrimaryBtn } from '@/components/target/target-primitives'

type Result = { [key: string]: unknown }

export default function ScannerTargetPage() {
  const [url, setUrl] = useState('http://scanner.internal.lab/health')
  const [result, setResult] = useState<Result>({})

  const scan = async (event: FormEvent) => {
    event.preventDefault()
    const response = await fetch('/api/scanner/api/scan', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ url }),
    })
    setResult({ status: response.status, ...(await response.json()) })
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-800">
      <TargetHeader
        organisation="Northstar Logistics"
        title="URL Inspection Service"
        host="scanner.internal.lab"
        initials="NL"
        backHref="/challenges/ssrf-internal-service-discovery"
      />

      <div className="mx-auto max-w-5xl px-6 py-10">
        <TargetCard className="max-w-2xl">
          <p className="text-sm font-medium text-teal-700">External monitoring</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">Inspect a service URL.</h2>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            The inspection worker retrieves the requested address and returns a diagnostic summary for the operations team.
          </p>
          <form className="mt-7 space-y-3" onSubmit={scan}>
            <label className="mb-1.5 block text-[13px] font-medium text-slate-700" htmlFor="url">
              Service URL
            </label>
            <div className="flex gap-2">
              <input
                id="url"
                className={`${lightInput} min-w-0 flex-1 font-mono`}
                value={url}
                onChange={(event) => setUrl(event.target.value)}
              />
              <button type="submit" className={lightPrimaryBtn}>
                Scan URL
              </button>
            </div>
          </form>
          <div className="mt-7">
            <ResultPanel result={result} />
          </div>
        </TargetCard>
      </div>
    </main>
  )
}
