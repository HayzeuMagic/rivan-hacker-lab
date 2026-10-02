'use client'

import { FormEvent, useState } from 'react'
import { BackButton } from '@/components/ui/back-button'

type Result = Record<string, unknown>

export default function HrTargetPage() {
  const [login, setLogin] = useState({ email: '', password: '' })
  const [id, setId] = useState('1001')
  const [result, setResult] = useState<Result>({})

  const call = async (path: string, options?: RequestInit) => {
    const response = await fetch(`/api/hr/${path}`, options)
    setResult({ status: response.status, ...(await response.json()) })
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    await call('api/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(login),
    })
  }

  const inputCls =
    'block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition-colors placeholder:text-slate-400 hover:border-slate-400 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20'

  return (
    <main className="min-h-screen bg-slate-100 text-slate-800">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-teal-700 font-mono text-sm font-bold text-white">
              NL
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-teal-700">Northstar Logistics</p>
              <h1 className="text-lg font-semibold text-slate-900">Employee HR Portal</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden font-mono text-xs text-slate-400 sm:inline">hr.internal.lab</span>
            <BackButton fallbackHref="/challenges/idor-broken-access-control" label="Back" className="!text-slate-600 hover:!bg-slate-200" />
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-5xl gap-6 px-6 py-10 lg:grid-cols-[1fr_360px]">
        <section className="space-y-6">
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold tracking-tight text-slate-900">Employee directory</h2>
            <p className="mt-1.5 text-sm text-slate-500">Access your profile and support employee operations.</p>
            <form
              className="mt-5 flex gap-2"
              onSubmit={(event) => {
                event.preventDefault()
                void call(`api/employees?id=${id}`)
              }}
            >
              <div className="min-w-0 flex-1">
                <label htmlFor="employee-id" className="sr-only">
                  Employee ID
                </label>
                <input
                  id="employee-id"
                  className={`${inputCls} font-mono`}
                  value={id}
                  onChange={(event) => setId(event.target.value)}
                  placeholder="Employee ID"
                />
              </div>
              <button
                type="submit"
                className="inline-flex h-10 items-center justify-center rounded-md bg-teal-700 px-4 text-sm font-medium text-white shadow-sm transition-colors hover:bg-teal-800 focus:outline-none focus:ring-2 focus:ring-teal-600/30"
              >
                View profile
              </button>
            </form>
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

        <aside className="h-fit rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">Employee sign-in</h2>
          <p className="mt-1 text-sm text-slate-500">Use your Northstar account credentials.</p>
          <form className="mt-5 space-y-4" onSubmit={submit}>
            <div>
              <label htmlFor="hr-email" className="mb-1.5 block text-[13px] font-medium text-slate-700">
                Email
              </label>
              <input
                id="hr-email"
                type="email"
                autoComplete="username"
                className={inputCls}
                placeholder="you@northstar.internal"
                value={login.email}
                onChange={(event) => setLogin({ ...login, email: event.target.value })}
              />
            </div>
            <div>
              <label htmlFor="hr-password" className="mb-1.5 block text-[13px] font-medium text-slate-700">
                Password
              </label>
              <input
                id="hr-password"
                type="password"
                autoComplete="current-password"
                className={inputCls}
                placeholder="••••••••"
                value={login.password}
                onChange={(event) => setLogin({ ...login, password: event.target.value })}
              />
            </div>
            <button
              type="submit"
              className="inline-flex h-10 w-full items-center justify-center rounded-md bg-slate-900 px-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
            >
              Sign in
            </button>
          </form>
        </aside>
      </div>
    </main>
  )
}
