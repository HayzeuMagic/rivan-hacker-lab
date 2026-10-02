'use client'

import { useEffect, useState } from 'react'
import { LabShell } from '@/components/lab/lab-shell'
import { KaliTerminal } from '@/components/terminal/kali-terminal'

const objectives = [
  { id: 'enumerated', label: 'Enumerate the compromised host (user, OS, filesystem)' },
  { id: 'sudoEnum', label: 'Review sudo permissions' },
  { id: 'suidFound', label: 'Locate SUID binaries' },
  { id: 'cronFound', label: 'Review scheduled root jobs' },
  { id: 'escalated', label: 'Escalate to root' },
  { id: 'flag', label: 'Read /root/flag.txt' },
  { id: 'submitted', label: 'Submit the recovered flag' },
]

const hints = [
  {
    title: 'Enumeration',
    body: 'Establish context first: whoami, id, uname -a. Then enumerate the three classic escalation surfaces: sudo -l, find / -perm -4000 2>/dev/null, and cat /etc/crontab. A linpeas-style summary is also available in the lab terminal.',
  },
  {
    title: 'Identify the path',
    body: 'All three surfaces are misconfigured: sudo allows tar as root (GTFOBins checkpoint-action), find is SUID, and a root cron job runs a world-writable script every minute. Any one of them is a valid path.',
  },
  {
    title: 'Exploitation',
    body: 'sudo tar -cf /dev/null /dev/null --checkpoint=1 --checkpoint-action=exec=/bin/sh — or find . -exec /bin/sh -p \\; — or append "cp /root/flag.txt /tmp/flag.txt" to the cron script and wait for the next run.',
  },
]

export default function LinuxPrivilegeEscalationPage() {
  const [progress, setProgress] = useState<Record<string, boolean>>({})
  const [message, setMessage] = useState('You have a low-privileged shell. Enumerate methodically, escalate, and read the protected flag.')

  const refresh = async () => {
    const response = await fetch('/api/privesc/api/progress', { cache: 'no-store' })
    setProgress(await response.json())
  }

  useEffect(() => {
    void refresh()
    const timer = window.setInterval(() => void refresh(), 2000)
    return () => window.clearInterval(timer)
  }, [])

  const reset = async () => {
    await fetch('/api/privesc/reset', { method: 'POST' })
    setProgress({})
    setMessage('Lab reset. Host restored to the initial low-privileged foothold.')
  }

  const submitFlag = async (flag: string) => {
    const response = await fetch('/api/privesc/submit', {
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
      number={8}
      title="Linux Privilege Escalation"
      difficulty="Hard"
      organisation="Aurora Outfitters"
      brief="A web vulnerability gave the red team a low-privileged shell as www-data on web-srv01, an Aurora Outfitters application server. The objective is the flag in the root directory. Enumerate the host, identify the misconfiguration, and escalate privileges using a practical, discoverable path."
      target="10.20.40.10 — web-srv01.internal.lab"
      targetDetail="Initial foothold: shell as www-data. Objective: read /root/flag.txt."
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
            <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Access</p>
            <p className="mt-1 font-mono text-xs text-emerald-300">shell: www-data</p>
          </div>
          <div className="rounded-md border border-border bg-background/60 p-3">
            <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Host</p>
            <p className="mt-1 font-mono text-xs text-cyan-300">web-srv01 (10.20.40.10)</p>
          </div>
          <div className="rounded-md border border-border bg-background/60 p-3">
            <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Objective</p>
            <p className="mt-1 font-mono text-xs text-slate-300">/root/flag.txt</p>
          </div>
        </div>
        <p className="mt-4 text-xs leading-5 text-slate-500">
          Methodology over exploits: check sudo rights, SUID binaries, cron jobs, and file permissions before reaching for
          kernel exploits.
        </p>
      </div>

      <div>
        <p className="lab-kicker mb-2">Compromised host shell</p>
        <KaliTerminal endpoint="/api/privesc" title="Challenge 8 — Linux Privilege Escalation" onProgress={setProgress} />
      </div>
    </LabShell>
  )
}
