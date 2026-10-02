import { NextResponse } from 'next/server'

export interface CookieSession<T> {
  cookie: string
  state: T
}

/** Cookie-keyed per-student lab state, consistent with the existing challenge APIs. */
export function getCookieSession<T>(
  request: Request,
  cookieName: string,
  store: Map<string, T>,
  create: () => T,
): CookieSession<T> {
  const match = request.headers.get('cookie')?.match(new RegExp(`${cookieName}=([^;]+)`))
  const cookie = match?.[1] ?? crypto.randomUUID()
  let state = store.get(cookie)
  if (!state) {
    state = create()
    store.set(cookie, state)
  }
  return { cookie, state }
}

export function labJson(body: unknown, init: ResponseInit = {}, cookie?: string, cookieName?: string) {
  const result = NextResponse.json(body, init)
  if (cookie && cookieName) {
    result.cookies.set(cookieName, cookie, { httpOnly: true, sameSite: 'lax', path: '/' })
  }
  return result
}

export function clearLabCookie(cookieName: string) {
  const result = NextResponse.json({ reset: true })
  result.cookies.set(cookieName, '', { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 0 })
  return result
}

export type LabContext = { params: Promise<{ path: string[] }> }

export async function labEndpoint(context: LabContext): Promise<string> {
  const { path = [] } = await context.params
  return `/${path.join('/')}`
}
