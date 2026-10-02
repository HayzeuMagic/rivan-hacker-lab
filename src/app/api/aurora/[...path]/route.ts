import {
  buildCategoryQuery,
  buildLoginQuery,
  buildSearchQuery,
  runQuery,
  sqliFlag,
  usersTableDump,
} from '@/lib/lab/sqli/db'
import { clearLabCookie, getCookieSession, labEndpoint, labJson, type LabContext } from '@/lib/lab/http'
import { err, kaliPrompt, ok, out, sys, type LabLine } from '@/lib/lab/terminal'

interface AuroraProgress {
  discovered: boolean
  confirmed: boolean
  schema: boolean
  bypassed: boolean
  extracted: boolean
}

interface AuroraState {
  history: LabLine[]
  submitted: boolean
  sessionUser: { username: string; role: string } | null
  progress: AuroraProgress
}

const COOKIE = 'aurora_session'
const sessions = new Map<string, AuroraState>()

function createState(): AuroraState {
  return {
    history: [
      sys('Rivan Hacker Lab // Challenge 4 — SQL Injection'),
      sys('Target: shop.aurora.internal.lab (GearTrack catalog)'),
      sys("Type 'help' for lab commands, or use the web target / your own Kali tooling."),
    ],
    submitted: false,
    sessionUser: null,
    progress: { discovered: false, confirmed: false, schema: false, bypassed: false, extracted: false },
  }
}

function getSession(request: Request) {
  return getCookieSession(request, COOKIE, sessions, createState)
}

/* ------------------------------- SQL handlers ------------------------------ */

function rowsToObjects(columns: string[], rows: (string | number)[][]) {
  return rows.map((row) => Object.fromEntries(columns.map((column, index) => [column, row[index]])))
}

function noteInjectionSignals(state: AuroraState, input: string, result: ReturnType<typeof runQuery>) {
  state.progress.discovered = true
  if (!result.ok) {
    if (input.includes("'")) state.progress.confirmed = true
    return
  }
  if (/'/.test(input) && /\bor\b/i.test(input) && result.rows.length >= 8) state.progress.confirmed = true
  if (/\bunion\b/i.test(input) && /information_schema|users|secrets/i.test(input)) state.progress.schema = true
  if (result.rows.some((row) => row.includes(sqliFlag))) {
    state.progress.extracted = true
    state.progress.confirmed = true
  }
}

function productsResponse(state: AuroraState, category: string) {
  const result = runQuery(buildCategoryQuery(category))
  noteInjectionSignals(state, category, result)
  if (!result.ok) return { status: 500, body: { error: result.error } }
  return { status: 200, body: { results: rowsToObjects(result.columns, result.rows) } }
}

function searchResponse(state: AuroraState, term: string) {
  const result = runQuery(buildSearchQuery(term))
  noteInjectionSignals(state, term, result)
  if (!result.ok) return { status: 500, body: { error: result.error } }
  return { status: 200, body: { results: rowsToObjects(result.columns, result.rows) } }
}

function loginResponse(state: AuroraState, username: string, password: string) {
  const result = runQuery(buildLoginQuery(username, password))
  state.progress.discovered = true
  if (!result.ok) {
    if (username.includes("'") || password.includes("'")) state.progress.confirmed = true
    return { status: 500, body: { error: result.error } }
  }
  if (result.rows.length === 0) return { status: 401, body: { error: 'Invalid username or password' } }
  const [id, user, role] = result.rows[0]
  state.sessionUser = { username: String(user), role: String(role) }
  state.progress.bypassed = true
  return { status: 200, body: { authenticated: true, user: { id, username: user, role } } }
}

/* ------------------------------ terminal tools ----------------------------- */

function tokenize(input: string): string[] {
  const tokens: string[] = []
  let current = ''
  let quote: '"' | "'" | null = null
  for (const ch of input) {
    if (quote) {
      if (ch === quote) quote = null
      else current += ch
    } else if (ch === '"' || ch === "'") quote = ch
    else if (/\s/.test(ch)) {
      if (current) {
        tokens.push(current)
        current = ''
      }
    } else current += ch
  }
  if (current) tokens.push(current)
  return tokens
}

function resolveApiPath(rawUrl: string): { path: string; search: URLSearchParams } | null {
  try {
    const url = new URL(rawUrl)
    return { path: url.pathname, search: url.searchParams }
  } catch {
    if (rawUrl.startsWith('/')) {
      const [path, query = ''] = rawUrl.split('?')
      return { path, search: new URLSearchParams(query) }
    }
    return null
  }
}

function handleCurl(state: AuroraState, tokens: string[]): LabLine[] {
  let method = 'GET'
  let data: string | null = null
  let url = ''
  for (let i = 1; i < tokens.length; i += 1) {
    const token = tokens[i]
    if (token === '-s' || token === '-i') continue
    if (token === '-X') {
      method = (tokens[++i] ?? 'GET').toUpperCase()
      continue
    }
    if (token === '-d' || token === '--data' || token === '--data-raw') {
      data = tokens[++i] ?? ''
      if (method === 'GET') method = 'POST'
      continue
    }
    if (token === '-H') {
      i += 1
      continue
    }
    if (!token.startsWith('-')) url = token
  }
  if (!url) return [err('curl: no URL specified')]

  const resolved = resolveApiPath(url)
  if (!resolved || !resolved.path.startsWith('/api')) {
    return [err(`curl: (6) Could not resolve host or unsupported path: ${url}`)]
  }

  let outcome: { status: number; body: unknown }
  if (resolved.path === '/api/products') outcome = productsResponse(state, resolved.search.get('category') ?? '')
  else if (resolved.path === '/api/search') outcome = searchResponse(state, resolved.search.get('q') ?? '')
  else if (resolved.path === '/api/login') {
    let username = ''
    let password = ''
    if (data?.trim().startsWith('{')) {
      try {
        const parsed = JSON.parse(data) as { username?: string; password?: string }
        username = String(parsed.username ?? '')
        password = String(parsed.password ?? '')
      } catch {
        return [err('curl: (3) malformed JSON body')]
      }
    } else if (data) {
      const params = new URLSearchParams(data)
      username = params.get('username') ?? ''
      password = params.get('password') ?? ''
    }
    outcome = loginResponse(state, username, password)
  } else {
    outcome = { status: 404, body: { error: 'not found' } }
  }

  return [out(`HTTP/1.1 ${outcome.status}`), out(JSON.stringify(outcome.body, null, 2))]
}

function sqlmapDumpTable(title: string, columns: string[], rows: (string | number)[][]): string {
  const widths = columns.map((column, i) => Math.max(column.length, ...rows.map((row) => String(row[i]).length)))
  const border = `+${widths.map((w) => '-'.repeat(w + 2)).join('+')}+`
  const formatRow = (cells: (string | number)[]) => `| ${cells.map((cell, i) => String(cell).padEnd(widths[i])).join(' | ')} |`
  return [title, border, formatRow(columns), border, ...rows.map(formatRow), border].join('\n')
}

function handleSqlmap(state: AuroraState, tokens: string[]): LabLine[] {
  const lines: LabLine[] = []
  const urlIndex = tokens.findIndex((token) => token === '-u' || token === '--url')
  const url = urlIndex === -1 ? '' : tokens[urlIndex + 1] ?? ''
  if (!url) return [err('sqlmap: error: missing a mandatory option (-u). Use -h for help')]

  const resolved = resolveApiPath(url.replace(/["']/g, ''))
  const parameter = resolved?.search.has('category') ? 'category' : resolved?.search.has('q') ? 'q' : null
  if (!resolved || !parameter) {
    return [err('[CRITICAL] no injectable GET parameter found in the provided URL (try the category or q parameter)')]
  }

  const wantsDbs = tokens.includes('--dbs')
  const wantsTables = tokens.includes('--tables')
  const wantsDump = tokens.includes('--dump')
  const tableIndex = tokens.findIndex((token) => token === '-T')
  const table = tableIndex === -1 ? '' : (tokens[tableIndex + 1] ?? '').toLowerCase()

  lines.push(out('        ___\n       __H__\n ___ ___[(]_____ ___ ___  {1.8.3#stable}\n|_ -| . ["]     | .\'| . |\n|___|_  [(]_|_|_|__,|  _|\n      |_|V...       |_|   https://sqlmap.org'))
  lines.push(sys('[*] starting sqlmap against shop.aurora.internal.lab'))
  lines.push(out('[10:14:22] [INFO] testing connection to the target URL'))
  lines.push(out('[10:14:23] [INFO] checking if the target is protected by some kind of WAF/IPS'))
  state.progress.discovered = true
  lines.push(out(`[10:14:25] [INFO] GET parameter '${parameter}' appears to be 'MySQL UNION query (NULL) - 1 to 10 columns' injectable`))
  lines.push(ok(`GET parameter '${parameter}' is vulnerable. Do you want to keep testing the others (if any)? [y/N] N (--batch)`))
  state.progress.confirmed = true

  if (!wantsDbs && !wantsTables && !wantsDump) {
    lines.push(out('[10:14:26] [INFO] use --dbs, --tables or --dump to enumerate the backend database'))
    return lines
  }

  state.progress.schema = true
  if (wantsDbs) {
    lines.push(out('available databases [2]:\n[*] aurora\n[*] information_schema'))
  }
  if (wantsTables) {
    lines.push(out('Database: aurora\n[3 tables]\n+----------+\n| products |\n| secrets  |\n| users    |\n+----------+'))
  }
  if (wantsDump) {
    if (table === 'users') {
      lines.push(out(sqlmapDumpTable('Database: aurora\nTable: users', ['id', 'username', 'password', 'role'], usersTableDump().map((u) => [u.id, u.username, u.password, u.role]))))
    } else if (table === 'products' || table === 'products ') {
      lines.push(out(sqlmapDumpTable('Database: aurora\nTable: products', ['id', 'name'], [[1, 'Summit 45L Pack'], [2, 'Ridgeline Daypack'], ['...', '...']])))
    } else {
      lines.push(out(sqlmapDumpTable('Database: aurora\nTable: secrets', ['id', 'item', 'value'], [[1, 'lab_flag', sqliFlag], [2, 'supplier_api_key', 'AKIA-AU-LAB-9F3D71C2E8B4']])))
      state.progress.extracted = true
    }
    lines.push(sys('[*] shutting down — results logged to the lab session'))
  }
  return lines
}

function handleTerminalCommand(state: AuroraState, command: string) {
  const tokens = tokenize(command)
  const cmd = (tokens[0] ?? '').toLowerCase()

  if (cmd === 'help') {
    state.history.push(out('Lab commands: help, clear, exit'))
    state.history.push(out('curl  -s "http://shop.aurora.internal.lab/api/products?category=packs"'))
    state.history.push(out('curl  -s -X POST "http://shop.aurora.internal.lab/api/login" -d \'{"username":"...","password":"..."}\''))
    state.history.push(out('sqlmap -u "http://shop.aurora.internal.lab/api/products?category=packs" --batch [--dbs|--tables|--dump [-T <table>]]'))
    return
  }
  if (cmd === 'clear') {
    state.history = []
    return
  }
  if (cmd === 'exit') {
    state.history.push(sys('Session closed. The web target remains available.'))
    return
  }
  if (cmd === 'curl') {
    state.history.push(...handleCurl(state, tokens))
    return
  }
  if (cmd === 'sqlmap') {
    state.history.push(...handleSqlmap(state, tokens))
    return
  }
  state.history.push(err(`bash: ${cmd}: command not found — this lab terminal supports curl, sqlmap, help, clear, exit`))
}

/* --------------------------------- routes ---------------------------------- */

export async function GET(request: Request, context: LabContext) {
  const endpoint = await labEndpoint(context)
  const { cookie, state } = getSession(request)

  if (endpoint === '/api/progress') return labJson({ ...state.progress, submitted: state.submitted }, {}, cookie, COOKIE)
  if (endpoint === '/terminal') return labJson({ lines: state.history, prompt: kaliPrompt() }, {}, cookie, COOKIE)
  if (endpoint === '/api/session') return labJson({ user: state.sessionUser }, {}, cookie, COOKIE)
  if (endpoint === '/robots.txt') {
    const body = new Response('User-agent: *\nDisallow: /staff\n# geartrack build 4.1.2 — legacy catalog module still references the secrets table\n', { headers: { 'content-type': 'text/plain' } })
    body.headers.set('set-cookie', `${COOKIE}=${cookie}; Path=/; HttpOnly; SameSite=Lax`)
    return body
  }
  if (endpoint === '/api/admin/users') {
    if (state.sessionUser?.role !== 'administrator') return labJson({ error: 'staff administrator role required' }, { status: 403 }, cookie, COOKIE)
    return labJson(
      { users: usersTableDump(), note: 'GT-1188: legacy launch data still lives in the secrets table — migrate before Q3.' },
      {},
      cookie,
      COOKIE,
    )
  }
  if (endpoint === '/api/products') {
    const category = new URL(request.url).searchParams.get('category') ?? ''
    const outcome = productsResponse(state, category)
    return labJson(outcome.body, { status: outcome.status }, cookie, COOKIE)
  }
  if (endpoint === '/api/search') {
    const term = new URL(request.url).searchParams.get('q') ?? ''
    const outcome = searchResponse(state, term)
    return labJson(outcome.body, { status: outcome.status }, cookie, COOKIE)
  }
  return labJson({ error: 'not found' }, { status: 404 }, cookie, COOKIE)
}

export async function POST(request: Request, context: LabContext) {
  const endpoint = await labEndpoint(context)
  const { cookie, state } = getSession(request)

  if (endpoint === '/reset') {
    sessions.delete(cookie)
    return clearLabCookie(COOKIE)
  }

  if (endpoint === '/api/login') {
    const contentType = request.headers.get('content-type') ?? ''
    let username = ''
    let password = ''
    if (contentType.includes('application/json')) {
      const body = (await request.json().catch(() => ({}))) as { username?: string; password?: string }
      username = String(body.username ?? '')
      password = String(body.password ?? '')
    } else {
      const params = new URLSearchParams(await request.text())
      username = params.get('username') ?? ''
      password = params.get('password') ?? ''
    }
    const outcome = loginResponse(state, username, password)
    return labJson(outcome.body, { status: outcome.status }, cookie, COOKIE)
  }

  if (endpoint === '/terminal') {
    const body = (await request.json().catch(() => ({}))) as { command?: string }
    const command = String(body.command ?? '').trim()
    state.history.push({ kind: 'input', text: command, prompt: kaliPrompt() })
    handleTerminalCommand(state, command)
    return labJson({ lines: state.history, prompt: kaliPrompt(), progress: { ...state.progress, submitted: state.submitted } }, {}, cookie, COOKIE)
  }

  if (endpoint === '/submit') {
    const body = (await request.json().catch(() => ({}))) as { flag?: string }
    if (!state.progress.extracted) {
      return labJson({ accepted: false, error: 'Extract the restricted vault record before submitting.' }, { status: 403 }, cookie, COOKIE)
    }
    const accepted = body.flag?.trim() === sqliFlag
    if (accepted) state.submitted = true
    return labJson({ accepted, ...(accepted ? {} : { error: 'Flag rejected.' }) }, {}, cookie, COOKIE)
  }

  return labJson({ error: 'not found' }, { status: 404 }, cookie, COOKIE)
}
