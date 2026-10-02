'use client'

import { useEffect, useState } from 'react'
import { WebChallengeShell } from '@/components/lab/web-challenge-shell'

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

  const submitFlag = async (flag: string) => {
    const response = await fetch('/api/hr/submit', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ flag }),
    })
    const result = (await response.json()) as { accepted?: boolean; error?: string }
    if (result.accepted) setProgress((current) => ({ ...current, submitted: true }))
    setMessage(result.accepted ? 'Flag accepted. Challenge complete.' : result.error ?? 'Submission rejected.')
  }

  return (
    <WebChallengeShell
      number={1}
      organisation="Northstar Logistics"
      title="Broken Access Control / IDOR"
      brief="Investigate an employee portal and determine whether restricted data is protected by server-side object authorization."
      targetHost="hr.internal.lab"
      targetPath="/targets/hr"
      scopeNote="All requests stay within the Rivan Hacker Lab employee portal boundary. Inspect real API requests and test whether changing an employee object identifier changes the server response."
      objectives={objectives}
      progress={progress}
      message={message}
      flagVisible={progress.briefing}
      completed={progress.submitted}
      onSubmitFlag={submitFlag}
      onReset={reset}
    />
  )
}
