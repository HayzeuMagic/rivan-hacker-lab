import test from 'node:test'
import assert from 'node:assert/strict'

import { challengeCatalog } from '../../src/simulator/core/engine'
import { GET as hrGet, POST as hrPost } from '../../src/app/api/hr/[...path]/route'
import { GET as portalGet, POST as portalPost } from '../../src/app/api/portal/[...path]/route'
import { GET as scannerGet, POST as scannerPost } from '../../src/app/api/scanner/[...path]/route'
import { GET as internalAdminGet } from '../../src/app/api/internal-admin/[...path]/route'

type CookieJar = Record<string, string>

function parseSetCookie(response: Response): string[] {
  const raw = response.headers.get('set-cookie')
  if (!raw) return []
  return raw.split(/,(?=\s*[^;]+=[^;]+)/)
}

function updateJarFromResponse(response: Response, jar: CookieJar) {
  for (const cookie of parseSetCookie(response)) {
    const [pair] = cookie.split(';')
    const [name, value = ''] = pair.split('=')
    if (!name) continue
    if (!value) {
      delete jar[name.trim()]
      continue
    }
    jar[name.trim()] = value.trim()
  }
}

function cookieHeader(jar: CookieJar): string | undefined {
  const entries = Object.entries(jar)
  if (entries.length === 0) return undefined
  return entries.map(([k, v]) => `${k}=${v}`).join('; ')
}

async function callRoute(
  handler: (request: Request, context: { params: Promise<{ path: string[] }> }) => Promise<Response>,
  {
    path,
    method = 'GET',
    body,
    jar,
    url = 'http://localhost',
  }: {
    path: string[]
    method?: string
    body?: unknown
    jar?: CookieJar
    url?: string
  },
) {
  const headers: Record<string, string> = {}
  const cookie = jar ? cookieHeader(jar) : undefined
  if (cookie) headers.cookie = cookie
  if (body !== undefined) headers['content-type'] = 'application/json'

  const request = new Request(url, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  const context = { params: Promise.resolve({ path }) }
  const response = await handler(request, context)
  if (jar) updateJarFromResponse(response, jar)

  const json = await response.json().catch(() => ({}))
  return { status: response.status, json }
}

test('challenge catalog only exposes three deployed challenges', () => {
  assert.equal(challengeCatalog.length, 3)
  assert.deepEqual(
    challengeCatalog.map((c) => c.id),
    ['idor-broken-access-control', 'authentication-session-security', 'ssrf-internal-service-discovery'],
  )
})

test('challenge 1 API workflow, completion, reset', async () => {
  const jar: CookieJar = {}

  let res = await callRoute(hrPost, { path: ['reset'], method: 'POST', jar, url: 'http://localhost/api/hr/reset' })
  assert.equal(res.status, 200)

  res = await callRoute(hrGet, { path: ['api', 'employees'], jar, url: 'http://localhost/api/hr/api/employees?id=1001' })
  assert.equal(res.status, 401)

  res = await callRoute(hrPost, {
    path: ['api', 'login'],
    method: 'POST',
    jar,
    body: { email: 'analyst@northstar.internal', password: 'northstar-analyst' },
    url: 'http://localhost/api/hr/api/login',
  })
  assert.equal(res.status, 200)

  res = await callRoute(hrGet, { path: ['api', 'employees'], jar, url: 'http://localhost/api/hr/api/employees?id=1002' })
  assert.equal(res.status, 200)
  assert.equal((res.json as { id: string }).id, '1002')

  res = await callRoute(hrPost, {
    path: ['submit'],
    method: 'POST',
    jar,
    body: { flag: 'CYBERLAB{idor_broken_access_control}' },
    url: 'http://localhost/api/hr/submit',
  })
  assert.equal(res.status, 200)
  assert.equal((res.json as { accepted: boolean }).accepted, true)

  res = await callRoute(hrGet, { path: ['api', 'progress'], jar, url: 'http://localhost/api/hr/api/progress' })
  assert.equal((res.json as { submitted: boolean }).submitted, true)

  res = await callRoute(hrPost, { path: ['reset'], method: 'POST', jar, url: 'http://localhost/api/hr/reset' })
  assert.equal(res.status, 200)
})

test('challenge 2 API workflow with predictable recovery token and persisted submit state', async () => {
  const jar: CookieJar = {}

  let res = await callRoute(portalPost, { path: ['reset'], method: 'POST', jar, url: 'http://localhost/api/portal/reset' })
  assert.equal(res.status, 200)

  res = await callRoute(portalPost, {
    path: ['api', 'auth', 'recovery'],
    method: 'POST',
    jar,
    body: { email: 'operations-admin@northstar.internal' },
    url: 'http://localhost/api/portal/api/auth/recovery',
  })
  assert.equal(res.status, 200)

  res = await callRoute(portalPost, {
    path: ['api', 'auth', 'reset'],
    method: 'POST',
    jar,
    body: { email: 'operations-admin@northstar.internal', token: 'northstar-2048', newPassword: 'northstar-admin-lab' },
    url: 'http://localhost/api/portal/api/auth/reset',
  })
  assert.equal(res.status, 200)

  res = await callRoute(portalPost, {
    path: ['api', 'auth', 'login'],
    method: 'POST',
    jar,
    body: { email: 'operations-admin@northstar.internal', password: 'northstar-admin-lab' },
    url: 'http://localhost/api/portal/api/auth/login',
  })
  assert.equal(res.status, 200)

  res = await callRoute(portalGet, { path: ['api', 'admin'], jar, url: 'http://localhost/api/portal/api/admin' })
  assert.equal(res.status, 200)

  res = await callRoute(portalPost, {
    path: ['submit'],
    method: 'POST',
    jar,
    body: { flag: 'CYBERLAB{session_security_failure}' },
    url: 'http://localhost/api/portal/submit',
  })
  assert.equal((res.json as { accepted: boolean }).accepted, true)

  res = await callRoute(portalGet, { path: ['api', 'progress'], jar, url: 'http://localhost/api/portal/api/progress' })
  assert.equal((res.json as { submitted: boolean }).submitted, true)
})

test('challenge 3 API workflow, validation, internal discovery, completion', async () => {
  const jar: CookieJar = {}
  const originalFetch = globalThis.fetch

  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
    if (url.includes('/api/internal-admin/')) {
      const parsed = new URL(url)
      const path = parsed.pathname.replace('/api/internal-admin/', '').split('/').filter(Boolean)
      const request = new Request(parsed.toString(), {
        method: init?.method ?? 'GET',
        headers: init?.headers,
      })
      return internalAdminGet(request, { params: Promise.resolve({ path }) })
    }

    return originalFetch(input, init)
  }

  try {
    let res = await callRoute(scannerPost, { path: ['reset'], method: 'POST', jar, url: 'http://localhost/api/scanner/reset' })
    assert.equal(res.status, 200)

    res = await callRoute(scannerPost, {
      path: ['api', 'scan'],
      method: 'POST',
      jar,
      body: { url: 'not-a-url' },
      url: 'http://localhost/api/scanner/api/scan',
    })
    assert.equal(res.status, 400)

    res = await callRoute(scannerPost, {
      path: ['api', 'scan'],
      method: 'POST',
      jar,
      body: { url: 'http://internal-admin.internal.lab/api/flag' },
      url: 'http://localhost/api/scanner/api/scan',
    })
    assert.equal(res.status, 200)
    assert.equal((res.json as { response: { flag: string } }).response.flag, 'CYBERLAB{ssrf_internal_network}')

    res = await callRoute(scannerPost, {
      path: ['submit'],
      method: 'POST',
      jar,
      body: { flag: 'CYBERLAB{ssrf_internal_network}' },
      url: 'http://localhost/api/scanner/submit',
    })
    assert.equal((res.json as { accepted: boolean }).accepted, true)

    res = await callRoute(scannerGet, { path: ['api', 'progress'], jar, url: 'http://localhost/api/scanner/api/progress' })
    assert.equal((res.json as { submitted: boolean }).submitted, true)
  } finally {
    globalThis.fetch = originalFetch
  }
})
