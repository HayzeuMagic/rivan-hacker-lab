import { NextResponse } from 'next/server'

const sessionSecurityFlag = 'CYBERLAB{session_security_failure}'
const accounts = new Map([
  ['analyst@northstar.internal', { password: 'northstar-analyst', role: 'employee', employeeNumber: '1001' }],
  ['operations-admin@northstar.internal', { password: 'northstar-operations', role: 'admin', employeeNumber: '2048' }],
])
const sessions = new Map<string, { email: string; role: string; submitted: boolean }>()
const resetRequests = new Map<string, { token: string; used: boolean }>()

type PortalContext = { params: Promise<{ path: string[] }> }

function getSession(request: Request) {
  const cookie = request.headers.get('cookie')?.match(/portal_session=([^;]+)/)?.[1]
  return cookie ? { cookie, session: sessions.get(cookie) } : { cookie: undefined, session: undefined }
}

function json(body: unknown, init: ResponseInit = {}, cookie?: string) {
  const result = NextResponse.json(body, init)
  if (cookie) result.cookies.set('portal_session', cookie, { httpOnly: true, sameSite: 'lax', secure: false, path: '/' })
  return result
}

export async function GET(request: Request, context: PortalContext) {
  const { path = [] } = await context.params
  const endpoint = `/${path.join('/')}`
  const { session } = getSession(request)

  if (endpoint === '/api/progress') {
    return json({
      authenticated: Boolean(session),
      recovery: resetRequests.has('operations-admin@northstar.internal'),
      admin: session?.role === 'admin',
      submitted: Boolean(session?.submitted),
    })
  }
  if (endpoint === '/api/admin') {
    if (!session) return json({ error: 'authentication required' }, { status: 401 })
    if (session.role !== 'admin') return json({ error: 'insufficient privileges' }, { status: 403 })
    return json({ title: 'Operations control room', message: 'Privileged logistics controls are available.', flag: sessionSecurityFlag })
  }
  if (endpoint === '/api/account') {
    if (!session) return json({ error: 'authentication required' }, { status: 401 })
    return json({ email: session.email, role: session.role })
  }
  return json({ error: 'not found' }, { status: 404 })
}

export async function POST(request: Request, context: PortalContext) {
  const { path = [] } = await context.params
  const endpoint = `/${path.join('/')}`
  const body = await request.json().catch(() => ({})) as Record<string, string | boolean>
  const { cookie, session } = getSession(request)

  if (endpoint === '/reset') {
    if (cookie) sessions.delete(cookie)
    resetRequests.clear()
    accounts.get('analyst@northstar.internal')!.password = 'northstar-analyst'
    accounts.get('operations-admin@northstar.internal')!.password = 'northstar-operations'
    const result = json({ reset: true })
    result.cookies.set('portal_session', '', { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 0 })
    return result
  }
  if (endpoint === '/api/auth/login') {
    const email = String(body.email ?? '')
    const account = accounts.get(email)
    if (!account || account.password !== body.password) return json({ error: 'Invalid email or password' }, { status: 401 })
    const id = crypto.randomUUID()
    sessions.set(id, { email, role: account.role, submitted: false })
    return json({ authenticated: true }, {}, id)
  }
  if (endpoint === '/api/auth/recovery') {
    const email = String(body.email ?? '')
    const account = accounts.get(email)
    if (account) resetRequests.set(email, { token: `northstar-${account.employeeNumber}`, used: false })
    return json({ accepted: true })
  }
  if (endpoint === '/api/auth/reset') {
    const email = String(body.email ?? '')
    const requestState = resetRequests.get(email)
    const account = accounts.get(email)
    if (!account || !requestState || requestState.used || requestState.token !== body.token) return json({ error: 'Invalid or expired reset request' }, { status: 400 })
    account.password = String(body.newPassword ?? '')
    requestState.used = true
    for (const [id, active] of sessions) if (active.email === email) sessions.delete(id)
    return json({ passwordChanged: true })
  }
  if (endpoint === '/api/auth/logout') {
    if (cookie) sessions.delete(cookie)
    return json({ loggedOut: true })
  }
  if (endpoint === '/submit') {
    if (session?.role !== 'admin') return json({ accepted: false, error: 'Administrator session required.' }, { status: 403 })
    const accepted = body.flag === sessionSecurityFlag
    if (accepted) {
      session.submitted = true
    }
    return json({ accepted })
  }
  return json({ error: 'not found' }, { status: 404 })
}
