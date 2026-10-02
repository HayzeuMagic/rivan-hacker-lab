import { NextResponse } from 'next/server'

const flag = 'RIVAN{ssrf_internal_network}'

type Context = { params: Promise<{ path: string[] }> }

export async function GET(request: Request, context: Context) {
  const { path = [] } = await context.params
  if (request.headers.get('x-rivan-internal') !== 'scanner.internal.lab') return NextResponse.json({ error: 'not found' }, { status: 404 })
  const endpoint = `/${path.join('/')}`
  if (endpoint === '/api/status') return NextResponse.json({ service: 'internal-admin', status: 'operational', hostname: 'internal-admin.internal.lab' })
  if (endpoint === '/api/notes') return NextResponse.json({ notes: ['Maintenance window: Sunday 02:00 UTC', 'The restricted objective store is under /api/flag'] })
  if (endpoint === '/api/flag') return NextResponse.json({ flag })
  return NextResponse.json({ error: 'not found' }, { status: 404 })
}
