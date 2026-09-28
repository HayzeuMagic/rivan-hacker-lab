import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const hostToTargetPath: Record<string, string> = {
  'hr.internal.lab': '/targets/hr',
  'portal.internal.lab': '/targets/portal',
  'scanner.internal.lab': '/targets/scanner',
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const host = request.headers.get('host')?.split(':')[0]?.toLowerCase() ?? ''

  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/challenges') ||
    pathname.startsWith('/targets') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  const targetPath = hostToTargetPath[host]
  if (!targetPath) return NextResponse.next()

  const rewriteUrl = request.nextUrl.clone()
  rewriteUrl.pathname = targetPath
  return NextResponse.rewrite(rewriteUrl)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
