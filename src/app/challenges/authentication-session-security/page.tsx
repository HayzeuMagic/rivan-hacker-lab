'use client'

import { useEffect, useState } from 'react'
import { WebChallengeShell } from '@/components/lab/web-challenge-shell'

const objectives = [
  ['authenticated', 'Authentication mechanism discovered'],
  ['recovery', 'Recovery behavior analyzed'],
  ['admin', 'Privileged authentication established'],
  ['submitted', 'Flag submitted'],
] as const

type Progress = { authenticated: boolean; recovery: boolean; admin: boolean; submitted: boolean }
const blank: Progress = { authenticated: false, recovery: false, admin: false, submitted: false }

export default function AuthenticationSessionSecurityPage() {
  const [progress, setProgress] = useState<Progress>(blank)
  const [message, setMessage] = useState('Open the portal and inspect the login and recovery workflow.')

  const refresh = async () => {
    const response = await fetch('/api/portal/api/progress', { cache: 'no-store' })
    const state = (await response.json()) as { authenticated?: boolean; recovery?: boolean; admin?: boolean }
    setProgress((current) => ({
      ...current,
      authenticated: Boolean(state.authenticated),
      recovery: Boolean(state.recovery),
      admin: Boolean(state.admin),
    }))
  }

  useEffect(() => {
    void refresh()
    const timer = window.setInterval(() => void refresh(), 1500)
    return () => window.clearInterval(timer)
  }, [])

  const reset = async () => {
    await fetch('/api/portal/reset', { method: 'POST' })
    setProgress(blank)
    setMessage('Lab reset. Start a fresh authentication investigation.')
  }

  const submitFlag = async (flag: string) => {
    const response = await fetch('/api/portal/submit', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ flag }),
    })
    const result = (await response.json()) as { accepted?: boolean; error?: string }
    setProgress((current) => ({ ...current, submitted: Boolean(result.accepted) }))
    setMessage(result.accepted ? 'Flag accepted. Challenge complete.' : result.error ?? 'Submission rejected.')
  }

  return (
    <WebChallengeShell
      number={2}
      organisation="Northstar Logistics"
      title="Authentication & Session Security"
      brief="Investigate a realistic login and recovery workflow. The primary weakness is a predictable password-reset token."
      targetHost="portal.internal.lab"
      targetPath="/targets/portal"
      scopeNote="The portal is reachable from the attacker boundary. Analyze the recovery workflow and test whether its token generation is predictable."
      objectives={objectives}
      progress={progress}
      message={message}
      flagVisible={progress.admin}
      completed={progress.submitted}
      onSubmitFlag={submitFlag}
      onReset={reset}
    />
  )
}
