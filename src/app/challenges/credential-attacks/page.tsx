'use client'

import { useEffect, useState } from 'react'
import { ExternalLink } from 'lucide-react'
import { LabShell } from '@/components/lab/lab-shell'
import { KaliTerminal } from '@/components/terminal/kali-terminal'

const objectives = [
  { id: 'enumerated', label: 'Enumerate the exposed staff directory' },
  { id: 'identified', label: 'Identify a valid target account' },
  { id: 'attacked', label: 'Execute the controlled password attack' },
  { id: 'authenticated', label: 'Authenticate with the recovered credentials' },
  { id: 'retrieved', label: 'Access the protected claims vault' },
  { id: 'submitted', label: 'Submit the recovered flag' },
]

const hints = [
  {
    title: 'Enumeration',
    body: 'The sign-on service exposes a public staff directory. Usernames follow the directory naming convention — first initial plus last name.',
  },
  {
    title: 'Password attack',
    body: 'Use the lab wordlist hosted on the target (lab-wordlist.txt). hydra -l mrivera -P lab-wordlist.txt auth.harborpoint.internal.lab http-post-form "..." — and watch for HTTP 429: the gateway rate-limits fast attacks, so space attempts with -W 2.',
  },
  {
    title: 'Post-authentication',
    body: 'Recovering the password is not the objective. Sign in with the valid credentials and open the claims escrow vault — the flag lives behind an authenticated session.',
  },
]

export default function CredentialAttacksChallengePage() {
  const [progress, setProgress] = useState<Record<string, boolean>>({})
  const [message, setMessage] = useState('Enumerate the sign-on service, then run the controlled password attack with the lab wordlist.')

  const refresh = async () => {
    const response = await fetch('/api/harborpoint/api/progress', { cache: 'no-store' })
    setProgress(await response.json())
  }

  useEffect(() => {
    void refresh()
    const timer = window.setInterval(() => void refresh(), 2000)
    return () => window.clearInterval(timer)
  }, [])

  const reset = async () => {
    await fetch('/api/harborpoint/reset', { method: 'POST' })
    setProgress({})
    setMessage('Lab reset. Start a fresh credential attack investigation.')
  }

  const submitFlag = async (flag: string) => {
    const response = await fetch('/api/harborpoint/submit', {
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
      number={5}
      title="Credential Attacks"
      difficulty="Medium"
      organisation="HarborPoint Financial"
      brief="HarborPoint Financial exposed its single sign-on gateway to the lab network. Intelligence suggests at least one employee is using a weak, season-based password. Enumerate the service, identify a valid account, run a controlled password attack with the supplied lab wordlist, and use the recovered credentials to reach the claims escrow vault."
      target="auth.harborpoint.internal.lab"
      targetDetail="HTTPS sign-on gateway with progressive rate limiting. Lab wordlist: /api/harborpoint/lab-wordlist.txt"
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
            <p className="lab-kicker">Target authentication service</p>
            <p className="mt-1 font-mono text-sm text-cyan-300">https://auth.harborpoint.internal.lab</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              className="btn-secondary"
              href="/api/harborpoint/lab-wordlist.txt"
              target="_blank"
              rel="noreferrer"
            >
              lab-wordlist.txt
            </a>
            <button
              className="btn-primary"
              onClick={() => window.open('/targets/harborpoint', '_blank', 'noopener,noreferrer')}
            >
              Open target <ExternalLink size={15} />
            </button>
          </div>
        </div>
        <p className="mt-4 text-xs leading-5 text-slate-500">
          Attack only the lab wordlist and the lab target. The gateway throttles rapid attempts (HTTP 429) — real password
          attacks must respect defensive controls.
        </p>
      </div>

      <div>
        <p className="lab-kicker mb-2">Kali terminal</p>
        <KaliTerminal endpoint="/api/harborpoint" title="Challenge 5 — Credential Attacks" onProgress={setProgress} />
      </div>
    </LabShell>
  )
}
