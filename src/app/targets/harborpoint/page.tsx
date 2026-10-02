'use client'

import { FormEvent, useEffect, useState } from 'react'
import { BackButton } from '@/components/ui/back-button'

type Result = Record<string, unknown>

const inputCls =
  'block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition-colors placeholder:text-slate-400 hover:border-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-600/20'

export default function HarborpointTargetPage() {
  const [result, setResult] = useState<Result>({})
  const [login, setLogin] = useState({ username: '', password: '' })
  const [user, setUser] = useState<string | null>(null)

  const call = async (path: string, options?: RequestInit) => {
    const response = await fetch(`/api/harborpoint/${path}`, options)
    setResult({ status: response.status, ...(await response.json()) })
  }

  const refreshSession = async () => {
    const response = await fetch('/api/harborpoint/api/session', { cache: 'no-store' })
    const body = (await response.json()) as { user?: string | null }
    setUser(body.user ?? null)
  }

  useEffect(() => {
    void refreshSession()
  }, [])

  const submitLogin = async (event: FormEvent) => {
    event.preventDefault()
    await call('api/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(login),
    })
    await refreshSession()
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-800">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-indigo-700 font-mono text-sm font-bold text-white">
              HP
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-indigo-700">HarborPoint Financial</p>
              <h1 className="text-lg font-semibold text-slate-900">Secure Sign-On</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden font-mono text-xs text-slate-400 sm:inline">auth.harborpoint.internal.lab</span>
            <BackButton fallbackHref="/challenges/credential-attacks" label="Back" className="!text-slate-600 hover:!bg-slate-200" />
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-5xl gap-6 px-6 py-10 lg:grid-cols-[1fr_360px]">
        <section className="space-y-6">
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold tracking-tight text-slate-900">Sign in to HarborPoint</h2>
            <p className="mt-1.5 text-sm text-slate-500">One account for claims, escrow and internal operations.</p>
            {user ? (
              <div className="mt-5 rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                <p className="font-semibold">Signed in as {user}</p>
                <button
                  className="mt-3 inline-flex h-9 items-center justify-center rounded-md border border-emerald-700 bg-white px-3 text-xs font-bold text-emerald-800 transition-colors hover:bg-emerald-50"
                  onClick={() => void call('api/secure-vault')}
                >
                  Open claims escrow vault
                </button>
              </div>
            ) : (
              <form className="mt-5 grid max-w-sm gap-4" onSubmit={submitLogin}>
                <div>
                  <label htmlFor="hp-username" className="mb-1.5 block text-[13px] font-medium text-slate-700">
                    Username
                  </label>
                  <input
                    id="hp-username"
                    autoComplete="username"
                    className={inputCls}
                    placeholder="Username"
                    value={login.username}
                    onChange={(event) => setLogin({ ...login, username: event.target.value })}
                  />
                </div>
                <div>
                  <label htmlFor="hp-password" className="mb-1.5 block text-[13px] font-medium text-slate-700">
                    Password
                  </label>
                  <input
                    id="hp-password"
                    type="password"
                    autoComplete="current-password"
                    className={inputCls}
                    placeholder="••••••••"
                    value={login.password}
                    onChange={(event) => setLogin({ ...login, password: event.target.value })}
                  />
                </div>
                <div>
                  <button
                    type="submit"
                    className="inline-flex h-10 items-center justify-center rounded-md bg-indigo-700 px-5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-800 focus:outline-none focus:ring-2 focus:ring-indigo-600/30"
                  >
                    Sign in
                  </button>
                </div>
              </form>
            )}
          </div>

          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 bg-slate-50 px-4 py-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Response</p>
            </div>
            <pre className="min-h-48 whitespace-pre-wrap break-words bg-slate-950 p-5 font-mono text-xs leading-5 text-emerald-300">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        </section>

        <aside className="space-y-6">
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">Staff directory</h2>
            <p className="mt-1 text-sm text-slate-500">Public contact listing for HarborPoint departments.</p>
            <button
              className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-md border border-indigo-700 bg-white px-3 text-sm font-medium text-indigo-800 shadow-sm transition-colors hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-600/30"
              onClick={() => void call('api/directory')}
            >
              View directory
            </button>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
            <p className="font-semibold text-slate-700">Security notice</p>
            <p className="mt-1 leading-6">
              This gateway applies progressive rate limiting. Repeated failures are logged and reviewed.
            </p>
          </div>
        </aside>
      </div>
    </main>
  )
}
