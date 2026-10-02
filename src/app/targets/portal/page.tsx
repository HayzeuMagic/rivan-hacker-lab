'use client'

import { FormEvent, useState } from 'react'
import { ResultPanel, TargetCard, TargetHeader, lightDarkBtn, lightGhostBtn, lightInput, lightPrimaryBtn } from '@/components/target/target-primitives'

type Result = { [key: string]: unknown }
async function call(path: string, options?: RequestInit): Promise<Result> {
  const response = await fetch(`/api/portal/${path}`, options)
  return { status: response.status, ...(await response.json()) }
}

export default function PortalTargetPage() {
  const [result, setResult] = useState<Result>({})
  const [login, setLogin] = useState({ email: '', password: '' })
  const [recoveryEmail, setRecoveryEmail] = useState('')
  const [reset, setReset] = useState({ email: '', token: '', newPassword: '' })

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setResult(await call('api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(login) }))
  }
  const recover = async (event: FormEvent) => {
    event.preventDefault()
    setResult(await call('api/auth/recovery', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: recoveryEmail }) }))
  }
  const resetPassword = async (event: FormEvent) => {
    event.preventDefault()
    setResult(await call('api/auth/reset', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(reset) }))
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-800">
      <TargetHeader
        organisation="Northstar Logistics"
        title="Internal Operations Portal"
        host="portal.internal.lab"
        initials="NL"
        backHref="/challenges/authentication-session-security"
      />

      <div className="mx-auto grid max-w-5xl gap-6 px-6 py-10 lg:grid-cols-[1fr_360px]">
        <section className="space-y-6">
          <TargetCard>
            <p className="text-sm font-medium text-teal-700">Operations workspace</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">Keep the network moving.</h2>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              Review logistics status, account settings, and internal operations controls.
            </p>
          </TargetCard>

          <TargetCard>
            <h2 className="text-base font-semibold text-slate-900">Password recovery</h2>
            <p className="mt-1 text-sm text-slate-500">Request a recovery link for your Northstar account.</p>
            <form className="mt-4 flex gap-2" onSubmit={recover}>
              <div className="min-w-0 flex-1">
                <label htmlFor="recovery-email" className="sr-only">
                  Email address
                </label>
                <input
                  id="recovery-email"
                  type="email"
                  className={lightInput}
                  placeholder="Email address"
                  value={recoveryEmail}
                  onChange={(event) => setRecoveryEmail(event.target.value)}
                />
              </div>
              <button type="submit" className={lightPrimaryBtn}>
                Request
              </button>
            </form>
          </TargetCard>

          <TargetCard>
            <h2 className="text-base font-semibold text-slate-900">Reset password</h2>
            <form className="mt-4 grid gap-3" onSubmit={resetPassword}>
              <input
                type="email"
                aria-label="Email address"
                className={lightInput}
                placeholder="Email address"
                value={reset.email}
                onChange={(event) => setReset({ ...reset, email: event.target.value })}
              />
              <input
                aria-label="Recovery token"
                className={`${lightInput} font-mono`}
                placeholder="Recovery token"
                value={reset.token}
                onChange={(event) => setReset({ ...reset, token: event.target.value })}
              />
              <input
                type="password"
                aria-label="New password"
                className={lightInput}
                placeholder="New password"
                value={reset.newPassword}
                onChange={(event) => setReset({ ...reset, newPassword: event.target.value })}
              />
              <div>
                <button type="submit" className={lightGhostBtn}>
                  Set new password
                </button>
              </div>
            </form>
          </TargetCard>
        </section>

        <aside className="h-fit space-y-6">
          <TargetCard>
            <h2 className="text-base font-semibold text-slate-900">Portal sign-in</h2>
            <form className="mt-5 space-y-4" onSubmit={submit}>
              <div>
                <label htmlFor="portal-email" className="mb-1.5 block text-[13px] font-medium text-slate-700">
                  Email address
                </label>
                <input
                  id="portal-email"
                  type="email"
                  autoComplete="username"
                  className={lightInput}
                  placeholder="you@northstar.internal"
                  value={login.email}
                  onChange={(event) => setLogin({ ...login, email: event.target.value })}
                />
              </div>
              <div>
                <label htmlFor="portal-password" className="mb-1.5 block text-[13px] font-medium text-slate-700">
                  Password
                </label>
                <input
                  id="portal-password"
                  type="password"
                  autoComplete="current-password"
                  className={lightInput}
                  placeholder="••••••••"
                  value={login.password}
                  onChange={(event) => setLogin({ ...login, password: event.target.value })}
                />
              </div>
              <button type="submit" className={`${lightDarkBtn} w-full`}>
                Sign in
              </button>
            </form>
            <button
              className={`${lightGhostBtn} mt-3 w-full`}
              onClick={async () => setResult(await call('api/admin'))}
            >
              Open operations control room
            </button>
          </TargetCard>
          <ResultPanel result={result} minHeight="min-h-40" />
        </aside>
      </div>
    </main>
  )
}
