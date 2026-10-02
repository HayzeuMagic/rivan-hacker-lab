'use client'

import { useEffect, useState } from 'react'
import { LabShell } from '@/components/lab/lab-shell'
import { KaliTerminal } from '@/components/terminal/kali-terminal'

const objectives = [
  { id: 'foothold', label: 'Establish the foothold on the DMZ host' },
  { id: 'enumerated', label: 'Enumerate the internal network from the foothold' },
  { id: 'creds', label: 'Recover credentials for the internal host' },
  { id: 'discovered', label: 'Confirm the internal target is reachable from the foothold' },
  { id: 'pivoted', label: 'Pivot into the internal host' },
  { id: 'flag', label: 'Retrieve the final flag' },
  { id: 'submitted', label: 'Submit the recovered flag' },
]

const hints = [
  {
    title: 'Foothold',
    body: 'Use the supplied foothold credentials: ssh webapp@10.20.10.15. Everything beyond the DMZ is unreachable from the Kali segment — confirm that yourself.',
  },
  {
    title: 'Internal discovery',
    body: 'On the DMZ host, check ip route, ip neigh and the files the webapp user left behind (home directory, bash history). A second NIC reveals the internal segment 172.16.30.0/24.',
  },
  {
    title: 'Pivot',
    body: 'From the foothold, ssh jdoe@172.16.30.40 works directly. From Kali you can ProxyJump: ssh -J webapp@10.20.10.15 jdoe@172.16.30.40 — or forward a port with ssh -L and connect through localhost.',
  },
]

export default function LateralMovementPage() {
  const [progress, setProgress] = useState<Record<string, boolean>>({})
  const [message, setMessage] = useState('Establish the foothold, enumerate the internal network, and pivot to the final objective.')

  const refresh = async () => {
    const response = await fetch('/api/pivot/api/progress', { cache: 'no-store' })
    setProgress(await response.json())
  }

  useEffect(() => {
    void refresh()
    const timer = window.setInterval(() => void refresh(), 2000)
    return () => window.clearInterval(timer)
  }, [])

  const reset = async () => {
    await fetch('/api/pivot/reset', { method: 'POST' })
    setProgress({})
    setMessage('Lab reset. Foothold and internal hosts restored.')
  }

  const submitFlag = async (flag: string) => {
    const response = await fetch('/api/pivot/submit', {
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
      number={9}
      title="Lateral Movement"
      difficulty="Hard"
      organisation="Kestrel Freight Group"
      brief="The red team compromised a storefront web server in the Kestrel Freight DMZ during an earlier phase. The final objective lives on an internal finance host that is not routable from the attacker network. Use the DMZ foothold to enumerate the internal segment, recover internal credentials, and pivot to the objective host."
      target="172.16.30.40 — fin-db01.internal.lab (internal segment)"
      targetDetail="Foothold: webapp / W3b-App!2024 on 10.20.10.15 (dmz-web01). Internal objective: 172.16.30.40."
      objectives={objectives}
      progress={progress}
      hints={hints}
      message={message}
      completed={Boolean(progress.submitted)}
      onSubmitFlag={submitFlag}
      onReset={reset}
    >
      <div className="lab-surface p-5">
        <p className="lab-kicker">Attack chain</p>
        <div className="mt-3 flex flex-wrap items-center gap-2 font-mono text-xs">
          <span className="rounded border border-emerald-400/40 bg-emerald-400/10 px-2.5 py-1.5 text-emerald-200">Kali</span>
          <span className="text-slate-600">→</span>
          <span className="rounded border border-cyan-400/40 bg-cyan-400/10 px-2.5 py-1.5 text-cyan-200">dmz-web01 · 10.20.10.15</span>
          <span className="text-slate-600">→</span>
          <span className="rounded border border-amber-400/40 bg-amber-400/10 px-2.5 py-1.5 text-amber-200">fin-db01 · 172.16.30.40</span>
        </div>
        <p className="mt-4 text-xs leading-5 text-slate-500">
          Initial Access → Foothold → Internal Discovery → Lateral Movement → Objective. The internal host rejects direct
          connections from the Kali segment by design.
        </p>
      </div>

      <div>
        <p className="lab-kicker mb-2">Kali terminal</p>
        <KaliTerminal endpoint="/api/pivot" title="Challenge 9 — Lateral Movement" onProgress={setProgress} />
      </div>
    </LabShell>
  )
}
