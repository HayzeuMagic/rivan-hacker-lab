'use client'

import { useEffect, useState } from 'react'
import { WebChallengeShell } from '@/components/lab/web-challenge-shell'

const objectives = [
  ['discovered', 'Discover URL-fetching feature'],
  ['serverSide', 'Identify server-side request behavior'],
  ['internal', 'Reach internal service'],
  ['enumerated', 'Enumerate internal service'],
  ['retrieved', 'Retrieve restricted information'],
  ['submitted', 'Submit flag'],
] as const

type Progress = Record<(typeof objectives)[number][0], boolean>
const blank: Progress = { discovered: false, serverSide: false, internal: false, enumerated: false, retrieved: false, submitted: false }

export default function SsrfChallengePage() {
  const [progress, setProgress] = useState<Progress>(blank)
  const [message, setMessage] = useState('Open the scanner and investigate how it retrieves URLs.')

  const refresh = async () => {
    const response = await fetch('/api/scanner/api/progress', { cache: 'no-store' })
    setProgress(await response.json())
  }

  useEffect(() => {
    void refresh()
    const timer = window.setInterval(() => void refresh(), 1500)
    return () => window.clearInterval(timer)
  }, [])

  const reset = async () => {
    await fetch('/api/scanner/reset', { method: 'POST' })
    setProgress(blank)
    setMessage('Lab reset. Start a fresh SSRF investigation.')
  }

  const submitFlag = async (flag: string) => {
    const response = await fetch('/api/scanner/submit', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ flag }),
    })
    const result = (await response.json()) as { accepted?: boolean; error?: string }
    setMessage(result.accepted ? 'Flag accepted. Challenge complete.' : result.error ?? 'Submission rejected.')
    await refresh()
  }

  return (
    <WebChallengeShell
      number={3}
      organisation="Northstar Logistics"
      title="SSRF & Internal Service Discovery"
      brief="Investigate a URL inspection service and determine whether its server-side request boundary exposes internal operations."
      targetHost="scanner.internal.lab"
      targetPath="/targets/scanner"
      scopeNote="The scanner is reachable from the attacker boundary. The internal operations console is not directly exposed and should only respond to a legitimate server-side request from the scanner."
      objectives={objectives}
      progress={progress}
      message={message}
      flagVisible={progress.retrieved}
      completed={progress.submitted}
      onSubmitFlag={submitFlag}
      onReset={reset}
    />
  )
}
