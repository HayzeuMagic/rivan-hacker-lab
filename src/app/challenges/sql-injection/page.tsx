'use client'

import { useEffect, useState } from 'react'
import { ExternalLink } from 'lucide-react'
import { LabShell } from '@/components/lab/lab-shell'
import { KaliTerminal } from '@/components/terminal/kali-terminal'

const objectives = [
  { id: 'discovered', label: 'Discover the catalog search and staff sign-in interfaces' },
  { id: 'confirmed', label: 'Confirm a parameter is injectable' },
  { id: 'schema', label: 'Map the backend database schema' },
  { id: 'bypassed', label: 'Bypass the staff sign-in with SQL injection' },
  { id: 'extracted', label: 'Extract the restricted vault record' },
  { id: 'submitted', label: 'Submit the recovered flag' },
]

const hints = [
  {
    title: 'Reconnaissance',
    body: 'Every input that reaches the catalog module is interesting. Try the category browser and the search box, and check robots.txt for paths the developers did not intend to publish.',
  },
  {
    title: 'Confirm the injection',
    body: "Submit a single quote (') in the category parameter and read the database error. If the error message quotes your input back, the query is being built by string concatenation. Try ' OR '1'='1' --  to see every product.",
  },
  {
    title: 'Extraction',
    body: "The product query selects 5 columns. Probe with ' UNION SELECT 1,2,3,4,5 --  until the column count matches, then pull table names from information_schema.tables and dump the interesting table (id, item, value).",
  },
]

export default function SqlInjectionChallengePage() {
  const [progress, setProgress] = useState<Record<string, boolean>>({})
  const [message, setMessage] = useState('Open the GearTrack target and assess the catalog module like a real engagement.')

  const refresh = async () => {
    const response = await fetch('/api/aurora/api/progress', { cache: 'no-store' })
    setProgress(await response.json())
  }

  useEffect(() => {
    void refresh()
    const timer = window.setInterval(() => void refresh(), 2000)
    return () => window.clearInterval(timer)
  }, [])

  const reset = async () => {
    await fetch('/api/aurora/reset', { method: 'POST' })
    setProgress({})
    setMessage('Lab reset. Start a fresh assessment of the catalog module.')
  }

  const submitFlag = async (flag: string) => {
    const response = await fetch('/api/aurora/submit', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ flag }),
    })
    const result = (await response.json()) as { accepted?: boolean; error?: string }
    setMessage(result.accepted ? 'Flag accepted. Challenge complete.' : result.error ?? 'Submission rejected.')
    await refresh()
  }

  return (
    <LabShell
      number={4}
      title="SQL Injection"
      difficulty="Medium"
      organisation="Aurora Outfitters"
      brief="Aurora Outfitters runs GearTrack, an internal product catalog backed by a MySQL database. Management is concerned the catalog module was written without input validation. Assess the application, prove the injection, and recover the restricted vault record stored in the backend database."
      target="shop.aurora.internal.lab"
      targetDetail="HTTP service — GearTrack catalog (products, search, staff sign-in). No credentials are supplied for this engagement."
      objectives={objectives}
      progress={progress}
      hints={hints}
      message={message}
      completed={Boolean(progress.submitted)}
      onSubmitFlag={submitFlag}
      onReset={reset}
    >
      <div className="lab-surface p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="lab-kicker">Target web application</p>
            <p className="mt-1 font-mono text-sm text-cyan-300">http://shop.aurora.internal.lab</p>
          </div>
          <button
            className="btn-primary"
            onClick={() => window.open('/targets/aurora-shop', '_blank', 'noopener,noreferrer')}
          >
            Open target <ExternalLink size={15} />
          </button>
        </div>
        <p className="mt-4 text-xs leading-5 text-slate-500">
          The catalog is a live HTTP service. You can drive it from the browser, from the terminal below, or from real Kali
          tooling (curl, sqlmap) against this lab host.
        </p>
      </div>

      <div>
        <p className="lab-kicker mb-2">Kali terminal</p>
        <KaliTerminal endpoint="/api/aurora" title="Challenge 4 — SQL Injection" onProgress={setProgress} />
      </div>
    </LabShell>
  )
}
