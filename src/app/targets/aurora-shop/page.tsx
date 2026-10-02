'use client'

import { FormEvent, useEffect, useState } from 'react'
import { BackButton } from '@/components/ui/back-button'

type Result = Record<string, unknown>

const categories = ['packs', 'tents', 'apparel', 'navigation']

const inputCls =
  'block w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 shadow-sm transition-colors placeholder:text-stone-400 hover:border-stone-400 focus:border-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-600/20'

export default function AuroraShopTargetPage() {
  const [result, setResult] = useState<Result>({})
  const [category, setCategory] = useState('packs')
  const [search, setSearch] = useState('')
  const [login, setLogin] = useState({ username: '', password: '' })
  const [user, setUser] = useState<{ username: string; role: string } | null>(null)

  const call = async (path: string, options?: RequestInit) => {
    const response = await fetch(`/api/aurora/${path}`, options)
    setResult({ status: response.status, ...(await response.json()) })
  }

  const refreshSession = async () => {
    const response = await fetch('/api/aurora/api/session', { cache: 'no-store' })
    const body = (await response.json()) as { user?: { username: string; role: string } | null }
    setUser(body.user ?? null)
  }

  useEffect(() => {
    void refreshSession()
  }, [])

  const browseCategory = (event: FormEvent) => {
    event.preventDefault()
    void call(`api/products?category=${encodeURIComponent(category)}`)
  }

  const runSearch = (event: FormEvent) => {
    event.preventDefault()
    void call(`api/search?q=${encodeURIComponent(search)}`)
  }

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
    <main className="min-h-screen bg-stone-100 text-stone-800">
      <span dangerouslySetInnerHTML={{ __html: '<!-- GT-1188: legacy secrets table still referenced by the catalog module. Remove before Q3. -->' }} />
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-amber-700 font-mono text-sm font-bold text-white">
              AO
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-amber-700">Aurora Outfitters</p>
              <h1 className="text-lg font-semibold text-stone-900">GearTrack Staff Catalog</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden font-mono text-xs text-stone-400 sm:inline">shop.aurora.internal.lab</span>
            <BackButton fallbackHref="/challenges/sql-injection" label="Back" className="!text-stone-600 hover:!bg-stone-200" />
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-5xl gap-6 px-6 py-10 lg:grid-cols-[1fr_360px]">
        <section className="space-y-6">
          <div className="rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold tracking-tight text-stone-900">Product catalog</h2>
            <p className="mt-1.5 text-sm text-stone-500">Browse inventory by category, or search the catalog by product name.</p>

            <form className="mt-5 flex gap-2" onSubmit={browseCategory}>
              <div className="min-w-0 flex-1">
                <label htmlFor="category" className="sr-only">
                  Category
                </label>
                <input
                  id="category"
                  className={`${inputCls} font-mono`}
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  list="geartrack-categories"
                />
                <datalist id="geartrack-categories">
                  {categories.map((item) => (
                    <option key={item} value={item} />
                  ))}
                </datalist>
              </div>
              <button
                type="submit"
                className="inline-flex h-10 items-center justify-center rounded-md bg-amber-700 px-4 text-sm font-medium text-white shadow-sm transition-colors hover:bg-amber-800 focus:outline-none focus:ring-2 focus:ring-amber-600/30"
              >
                Browse
              </button>
            </form>

            <form className="mt-3 flex gap-2" onSubmit={runSearch}>
              <div className="min-w-0 flex-1">
                <label htmlFor="search" className="sr-only">
                  Search
                </label>
                <input
                  id="search"
                  className={`${inputCls} font-mono`}
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search products…"
                />
              </div>
              <button
                type="submit"
                className="inline-flex h-10 items-center justify-center rounded-md border border-amber-700 bg-white px-4 text-sm font-medium text-amber-800 shadow-sm transition-colors hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-amber-600/30"
              >
                Search
              </button>
            </form>
          </div>

          <div className="overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm">
            <div className="border-b border-stone-200 bg-stone-50 px-4 py-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">Response</p>
            </div>
            <pre className="min-h-48 whitespace-pre-wrap break-words bg-stone-950 p-5 font-mono text-xs leading-5 text-emerald-300">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        </section>

        <aside className="space-y-6">
          <div className="rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
            <h2 className="text-base font-semibold text-stone-900">Staff sign in</h2>
            <p className="mt-1 text-sm text-stone-500">Restricted to GearTrack staff accounts.</p>
            {user ? (
              <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                <p className="font-semibold">Signed in as {user.username}</p>
                <p className="text-xs uppercase tracking-wide">Role: {user.role}</p>
                {user.role === 'administrator' && (
                  <button
                    className="mt-3 inline-flex h-9 w-full items-center justify-center rounded-md border border-emerald-700 bg-white px-3 text-xs font-bold text-emerald-800 transition-colors hover:bg-emerald-50"
                    onClick={() => void call('api/admin/users')}
                  >
                    Open staff account directory
                  </button>
                )}
              </div>
            ) : (
              <form className="mt-4 grid gap-4" onSubmit={submitLogin}>
                <div>
                  <label htmlFor="aurora-username" className="mb-1.5 block text-[13px] font-medium text-stone-700">
                    Username
                  </label>
                  <input
                    id="aurora-username"
                    autoComplete="username"
                    className={inputCls}
                    placeholder="Username"
                    value={login.username}
                    onChange={(event) => setLogin({ ...login, username: event.target.value })}
                  />
                </div>
                <div>
                  <label htmlFor="aurora-password" className="mb-1.5 block text-[13px] font-medium text-stone-700">
                    Password
                  </label>
                  <input
                    id="aurora-password"
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
                  className="inline-flex h-10 items-center justify-center rounded-md bg-amber-700 px-4 text-sm font-medium text-white shadow-sm transition-colors hover:bg-amber-800 focus:outline-none focus:ring-2 focus:ring-amber-600/30"
                >
                  Sign in
                </button>
              </form>
            )}
          </div>
          <div className="rounded-lg border border-stone-200 bg-white p-6 text-sm text-stone-500 shadow-sm">
            <p className="font-semibold text-stone-700">Catalog module</p>
            <p className="mt-1">geartrack build 4.1.2</p>
            <p className="mt-2 leading-6">
              Requests are executed against the MySQL backend exactly as submitted. Report anomalies to the platform team.
            </p>
          </div>
        </aside>
      </div>
    </main>
  )
}
