'use client'

import { useEffect, useState } from 'react'
import { LabShell } from '@/components/lab/lab-shell'
import { KaliTerminal } from '@/components/terminal/kali-terminal'

const objectives = [
  { id: 'scanned', label: 'Scan the Windows target and identify SMB' },
  { id: 'shares', label: 'Enumerate the exposed SMB shares' },
  { id: 'guest', label: 'Access a guest-readable share' },
  { id: 'creds', label: 'Recover usable credentials from share data' },
  { id: 'restricted', label: 'Authenticate to the restricted Dept-IT share' },
  { id: 'flag', label: 'Retrieve flag.txt from the restricted share' },
  { id: 'submitted', label: 'Submit the recovered flag' },
]

const hints = [
  {
    title: 'Enumeration',
    body: 'nmap -sV 10.20.50.20 confirms Windows SMB. Then list shares anonymously: smbclient -L //10.20.50.20 -N — or run enum4linux -a for users and share permissions in one pass.',
  },
  {
    title: 'Share mining',
    body: 'Two shares allow guest access. Backups is the interesting one — read every file. IT handover documents frequently contain credentials that were never rotated.',
  },
  {
    title: 'Authenticated access',
    body: 'Use recovered credentials against the restricted share: smbclient //10.20.50.20/Dept-IT -U bsmith%<password>. Guest access to that share is correctly denied — the misconfiguration is the guest-readable Backups share.',
  },
]

export default function SmbWindowsAttackPage() {
  const [progress, setProgress] = useState<Record<string, boolean>>({})
  const [message, setMessage] = useState('Enumerate the Windows file server and mine its shares for a path into Dept-IT.')

  const refresh = async () => {
    const response = await fetch('/api/smb/api/progress', { cache: 'no-store' })
    setProgress(await response.json())
  }

  useEffect(() => {
    void refresh()
    const timer = window.setInterval(() => void refresh(), 2000)
    return () => window.clearInterval(timer)
  }, [])

  const reset = async () => {
    await fetch('/api/smb/reset', { method: 'POST' })
    setProgress({})
    setMessage('Lab reset. Shares restored to their initial exposure.')
  }

  const submitFlag = async (flag: string) => {
    const response = await fetch('/api/smb/submit', {
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
      number={7}
      title="SMB / Windows Network Attack"
      difficulty="Medium - Hard"
      organisation="Kestrel Freight Group"
      brief="Kestrel Freight Group exposes a Windows Server 2022 file server (FILESRV) to the lab segment. It was configured to tolerate guest access during a share migration that never finished. Enumerate the server, mine the exposed shares, and use what you find to reach the restricted Dept-IT share."
      target="10.20.50.20 — FILESRV.internal.lab"
      targetDetail="Authorized scope: this single Windows host. SMB, RDP and RPC are exposed; SMB is the attack surface."
      objectives={objectives}
      progress={progress}
      hints={hints}
      message={message}
      completed={Boolean(progress.submitted)}
      onSubmitFlag={submitFlag}
      onReset={reset}
    >
      <div className="lab-surface p-5">
        <p className="lab-kicker">Environment</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <div className="rounded-md border border-border bg-background/60 p-3">
            <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Attacker</p>
            <p className="mt-1 font-mono text-xs text-emerald-300">kali (lab terminal)</p>
          </div>
          <div className="rounded-md border border-border bg-background/60 p-3">
            <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Target</p>
            <p className="mt-1 font-mono text-xs text-cyan-300">10.20.50.20</p>
          </div>
          <div className="rounded-md border border-border bg-background/60 p-3">
            <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Platform</p>
            <p className="mt-1 font-mono text-xs text-slate-300">Windows Server 2022</p>
          </div>
        </div>
        <p className="mt-4 text-xs leading-5 text-slate-500">
          Realistic Kali tooling applies: nmap, smbclient, enum4linux, NetExec. No credentials are supplied at the start of
          the engagement.
        </p>
      </div>

      <div>
        <p className="lab-kicker mb-2">Kali terminal</p>
        <KaliTerminal endpoint="/api/smb" title="Challenge 7 — SMB / Windows Network Attack" onProgress={setProgress} />
      </div>
    </LabShell>
  )
}
