'use client'

import { FormEvent, useState } from 'react'

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

  return <main className="min-h-screen bg-[#f3f5f4] text-slate-800"><header className="border-b border-slate-200 bg-white px-6 py-5"><div className="mx-auto flex max-w-5xl items-center justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-700">Rivan Cybersecurity Institute</p><h1 className="mt-1 text-xl font-semibold">Internal Operations Portal</h1></div><span className="text-xs text-slate-500">portal.internal.lab</span></div></header><div className="mx-auto grid max-w-5xl gap-6 px-6 py-8 lg:grid-cols-[1fr_340px]"><section className="space-y-6"><div className="rounded-lg border border-slate-200 bg-white p-6"><p className="text-sm text-teal-700">Operations workspace</p><h2 className="mt-2 text-3xl font-semibold tracking-tight">Practice secure access workflows.</h2><p className="mt-3 text-sm leading-6 text-slate-500">Review account status, recovery behavior, and privileged operations access controls.</p></div><div className="rounded-lg border border-slate-200 bg-white p-6"><h2 className="font-semibold">Password recovery</h2><p className="mt-1 text-sm text-slate-500">Request a recovery link for your Rivan account.</p><form className="mt-4 flex gap-2" onSubmit={recover}><label className="sr-only" htmlFor="portal-recovery-email">Recovery email</label><input id="portal-recovery-email" className="lab-input-light lab-selection min-w-0 flex-1" placeholder="operations-admin@rivan.internal" value={recoveryEmail} onChange={(event) => setRecoveryEmail(event.target.value)} /><button className="rounded-md bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-600">Request</button></form></div><div className="rounded-lg border border-slate-200 bg-white p-6"><h2 className="font-semibold">Reset password</h2><form className="mt-4 grid gap-2" onSubmit={resetPassword}><label className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500" htmlFor="portal-reset-email">Email address</label><input id="portal-reset-email" className="lab-input-light" placeholder="operations-admin@rivan.internal" value={reset.email} onChange={(event) => setReset({ ...reset, email: event.target.value })} /><label className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500" htmlFor="portal-reset-token">Recovery token</label><input id="portal-reset-token" className="lab-input-light lab-selection font-mono" placeholder="rivan-2048" value={reset.token} onChange={(event) => setReset({ ...reset, token: event.target.value })} /><label className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500" htmlFor="portal-reset-password">New password</label><input id="portal-reset-password" className="lab-input-light" placeholder="••••••••" type="password" value={reset.newPassword} onChange={(event) => setReset({ ...reset, newPassword: event.target.value })} /><button className="rounded-md border border-slate-300 px-3 py-2 text-sm hover:bg-slate-100">Set new password</button></form></div></section><aside className="rounded-lg border border-slate-200 bg-white p-6"><h2 className="font-semibold">Portal sign-in</h2><form className="mt-5 space-y-3" onSubmit={submit}><label className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500" htmlFor="portal-login-email">Email address</label><input id="portal-login-email" className="lab-input-light" placeholder="analyst@rivan.internal" value={login.email} onChange={(event) => setLogin({ ...login, email: event.target.value })} /><label className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500" htmlFor="portal-login-password">Password</label><input id="portal-login-password" className="lab-input-light" placeholder="••••••••" type="password" value={login.password} onChange={(event) => setLogin({ ...login, password: event.target.value })} /><button className="w-full rounded-md bg-slate-800 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700">Sign in</button></form><button className="mt-3 w-full rounded-md border border-slate-300 px-3 py-2 text-sm hover:bg-slate-100" onClick={async () => setResult(await call('api/admin'))}>Open operations control room</button><pre className="mt-6 max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-slate-950 p-4 font-mono text-xs text-emerald-300">{JSON.stringify(result, null, 2)}</pre></aside></div></main>
}
