import { NextResponse } from 'next/server'

const sessions = new Map<string, { discovered: boolean; serverSide: boolean; internal: boolean; enumerated: boolean; retrieved: boolean; submitted: boolean }>()
type Context = { params: Promise<{ path: string[] }> }

function getSession(request: Request) {
  const cookie = request.headers.get('cookie')?.match(/scanner_session=([^;]+)/)?.[1] ?? crypto.randomUUID()
  const progress = sessions.get(cookie) ?? { discovered: false, serverSide: false, internal: false, enumerated: false, retrieved: false, submitted: false }
  sessions.set(cookie, progress)
  return { cookie, progress }
}

function json(body: unknown, init: ResponseInit = {}, cookie?: string) {
  const result = NextResponse.json(body, init)
  if (cookie) result.cookies.set('scanner_session', cookie, { httpOnly: true, sameSite: 'lax', path: '/' })
  return result
}

export async function GET(request: Request, context: Context) {
  const { path = [] } = await context.params
  const { cookie, progress } = getSession(request)
  if (`/${path.join('/')}` === '/api/progress') return json({ ...progress }, {}, cookie)
  return json({ error: 'not found' }, { status: 404 }, cookie)
}

export async function POST(request: Request, context: Context) {
  const { path = [] } = await context.params
  const endpoint = `/${path.join('/')}`
  const { cookie, progress } = getSession(request)
  if (endpoint === '/reset') {
    sessions.delete(cookie)
    const result = json({ reset: true })
    result.cookies.set('scanner_session', '', { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 0 })
    return result
  }
  if (endpoint === '/submit') {
    const body = await request.json().catch(() => ({})) as { flag?: string }
    if (!progress.retrieved) return json({ accepted: false, error: 'Retrieve the restricted response first.' }, { status: 403 }, cookie)
    progress.submitted = body.flag?.trim() === 'RIVAN{ssrf_internal_network}'
    return json({ accepted: progress.submitted, ...(progress.submitted ? {} : { error: 'Flag rejected.' }) }, {}, cookie)
  }
  if (endpoint !== '/api/scan') return json({ error: 'not found' }, { status: 404 }, cookie)
  const body = await request.json().catch(() => ({})) as { url?: string }
  if (!body.url) return json({ error: 'url is required' }, { status: 400 }, cookie)
  let target: URL
  try { target = new URL(body.url) } catch { return json({ error: 'invalid url' }, { status: 400 }, cookie) }
  progress.discovered = true
  progress.serverSide = true
  if (target.hostname !== 'internal-admin.internal.lab') return json({ error: 'destination is outside the inspection network' }, { status: 403 }, cookie)
  const localTarget = new URL(`/api/internal-admin${target.pathname}`, request.url)
  const internalResponse = await fetch(localTarget, { headers: { 'x-rivan-internal': 'scanner.internal.lab' }, cache: 'no-store' })
  const result = await internalResponse.json().catch(() => ({ error: 'upstream returned invalid JSON' }))
  progress.internal = true
  if (target.pathname === '/api/status' || target.pathname === '/api/notes') progress.enumerated = true
  if (target.pathname === '/api/flag' && internalResponse.ok) progress.retrieved = true
  return json({ fetchedUrl: body.url, upstreamStatus: internalResponse.status, response: result }, { status: internalResponse.status }, cookie)
}

