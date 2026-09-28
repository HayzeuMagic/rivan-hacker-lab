'use client'

import { FormEvent, useState } from 'react'

export default function HrTargetPage() {
	const [login, setLogin] = useState({ email: '', password: '' })
	const [id, setId] = useState('1001')
	const [result, setResult] = useState<Record<string, unknown>>({})

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

	return (
		<main className="min-h-screen bg-[#f4f6f5] text-slate-800">
			<header className="border-b border-slate-200 bg-white px-6 py-5">
				<div className="mx-auto flex max-w-5xl items-center justify-between">
					<div>
						<p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-700">Rivan Cybersecurity Institute</p>
						<h1 className="mt-1 text-xl font-semibold">Employee HR Portal</h1>
					</div>
					<span className="font-mono text-xs text-slate-500">hr.internal.lab</span>
				</div>
			</header>

			<div className="mx-auto grid max-w-5xl gap-6 px-6 py-10 lg:grid-cols-[1fr_340px]">
				<section className="space-y-6">
					<div className="rounded-lg border border-slate-200 bg-white p-6">
						<h2 className="text-2xl font-semibold">Employee directory</h2>
						<p className="mt-2 text-sm text-slate-500">Access your profile and support employee operations.</p>
						<form
							className="mt-5 flex gap-2"
							onSubmit={(event) => {
								event.preventDefault()
								void call(`api/employees?id=${id}`)
							}}
						>
							<label className="sr-only" htmlFor="employee-id">Employee ID</label>
							<input
								id="employee-id"
								className="lab-input-light lab-selection min-w-0 flex-1 font-mono"
								value={id}
								onChange={(event) => setId(event.target.value)}
								aria-label="Employee ID"
							/>
							<button className="rounded-md bg-teal-700 px-4 py-2 text-sm text-white hover:bg-teal-600">View profile</button>
						</form>
					</div>

					<pre className="min-h-48 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-slate-950 p-5 font-mono text-xs text-emerald-300">{JSON.stringify(result, null, 2)}</pre>
				</section>

				<aside className="rounded-lg border border-slate-200 bg-white p-6">
					<h2 className="font-semibold">Employee sign-in</h2>
					<form className="mt-4 space-y-3" onSubmit={submit}>
						<label className="block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500" htmlFor="hr-email">Email address</label>
						<input
							id="hr-email"
							className="lab-input-light"
							placeholder="analyst@rivan.internal"
							value={login.email}
							onChange={(event) => setLogin({ ...login, email: event.target.value })}
						/>
						<label className="block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500" htmlFor="hr-password">Password</label>
						<input
							id="hr-password"
							className="lab-input-light"
							placeholder="••••••••"
							type="password"
							value={login.password}
							onChange={(event) => setLogin({ ...login, password: event.target.value })}
						/>
						<button className="w-full rounded-md bg-slate-800 px-3 py-2 text-sm text-white hover:bg-slate-700">Sign in</button>
					</form>
				</aside>
			</div>
		</main>
	)
}
