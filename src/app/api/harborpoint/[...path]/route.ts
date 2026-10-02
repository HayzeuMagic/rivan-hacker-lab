import { clearLabCookie, getCookieSession, labEndpoint, labJson, type LabContext } from '@/lib/lab/http'
import { err, kaliPrompt, ok, out, sys, type LabLine } from '@/lib/lab/terminal'

const credentialFlag = 'RIVAN{credential_attack_hydra}'

const COOKIE = 'harborpoint_session'

const accounts: Record<string, { password: string; displayName: string }> = {
  mrivera: { password: 'Summer2024!', displayName: 'M. Rivera — Claims Analyst' },
  helpdesk: { password: 'Hd$k-9vX2!qL7#zR4', displayName: 'S. Okafor — Help Desk' },
  admin: { password: 'Hp-Adm1n!8wQ5#eT2', displayName: 'J. Whitfield — IT Administrator' },
}

const labWordlist = [
  'password',
  '123456',
  'letmein',
  'welcome1',
  'Password1',
  'qwerty123',
  'harbor',
  'harborpoint',
  'marina2024',
  'Spring2023!',
  'Summer2023!',
  'Fall2023!',
  'Winter2023!',
  'Spring2024!',
  'Summer2024!',
  'Fall2024!',
  'Winter2024!',
  'Harbor2024!',
  'harbor2024',
  'Welcome2024!',
  'Password2024!',
  'ChangeMe!',
  'Hp@2024',
  'Harbor2025!',
]

interface HarborpointProgress {
  enumerated: boolean
  identified: boolean
  attacked: boolean
  authenticated: boolean
  retrieved: boolean
}

interface HarborpointState {
  history: LabLine[]
  submitted: boolean
  sessionUser: string | null
  attemptLog: number[]
  progress: HarborpointProgress
}

const sessions = new Map<string, HarborpointState>()

function createState(): HarborpointState {
  return {
    history: [
      sys('Rivan Hacker Lab // Challenge 5 — Credential Attacks'),
      sys('Target: auth.harborpoint.internal.lab (HarborPoint Secure Sign-On)'),
      sys("Type 'help' for lab commands, or drive the service from the web target / real Kali tooling."),
    ],
    submitted: false,
    sessionUser: null,
    attemptLog: [],
    progress: { enumerated: false, identified: false, attacked: false, authenticated: false, retrieved: false },
  }
}

function getSession(request: Request) {
  return getCookieSession(request, COOKIE, sessions, createState)
}

/* ------------------------------- auth service ------------------------------ */

const RATE_WINDOW_MS = 20_000
const RATE_MAX_ATTEMPTS = 6

type LoginOutcome =
  | { status: 200; body: { authenticated: true; user: string } }
  | { status: 401; body: { error: string } }
  | { status: 429; body: { error: string } }

function tryLogin(state: HarborpointState, username: string, password: string, now = Date.now()): LoginOutcome {
  state.attemptLog = state.attemptLog.filter((timestamp) => now - timestamp < RATE_WINDOW_MS)
  if (state.attemptLog.length >= RATE_MAX_ATTEMPTS) {
    return { status: 429, body: { error: 'rate limited — too many authentication attempts; slow down' } }
  }
  state.attemptLog.push(now)

  const account = accounts[username]
  if (!account) return { status: 401, body: { error: 'unknown account' } }

  state.progress.identified = true
  if (account.password !== password) {
    return { status: 401, body: { error: 'invalid credentials' } }
  }
  state.sessionUser = username
  state.progress.authenticated = true
  return { status: 200, body: { authenticated: true, user: username } }
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

function resolveApiPath(rawUrl: string): { path: string } | null {
  try {
    return { path: new URL(rawUrl).pathname }
  } catch {
    return rawUrl.startsWith('/') ? { path: rawUrl.split('?')[0] } : null
  }
}

function handleCurl(state: HarborpointState, tokens: string[]): LabLine[] {
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
  if (!resolved) return [err(`curl: (6) Could not resolve host: ${url}`)]

  if (resolved.path === '/api/directory' && method === 'GET') {
    state.progress.enumerated = true
    return [out('HTTP/1.1 200'), out(JSON.stringify(directoryBody(), null, 2))]
  }
  if (resolved.path === '/lab-wordlist.txt' && method === 'GET') {
    return [out('HTTP/1.1 200'), out(labWordlist.join('\n'))]
  }
  if (resolved.path === '/api/login' && method === 'POST') {
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
    const outcome = tryLogin(state, username, password)
    if (outcome.status === 401 && username in accounts) state.progress.attacked = true
    return [out(`HTTP/1.1 ${outcome.status}`), out(JSON.stringify(outcome.body, null, 2))]
  }
  if (resolved.path === '/api/secure-vault' && method === 'GET') {
    if (!state.sessionUser) return [out('HTTP/1.1 401'), out(JSON.stringify({ error: 'authentication required' }, null, 2))]
    state.progress.retrieved = true
    return [out('HTTP/1.1 200'), out(JSON.stringify(vaultBody(), null, 2))]
  }
  return [out('HTTP/1.1 404'), out(JSON.stringify({ error: 'not found' }, null, 2))]
}

function handleNmap(tokens: string[]): LabLine[] {
  const target = tokens.find((token, index) => index > 0 && !token.startsWith('-') && tokens[index - 1] !== '-p')
  if (!target || (!target.includes('harborpoint') && target !== '10.20.60.10')) {
    return [err('Failed to resolve or reach the requested host. Only the authorized lab target is in scope.')]
  }
  return [
    out('Starting Nmap 7.94SVN ( https://nmap.org )'),
    out('Nmap scan report for auth.harborpoint.internal.lab (10.20.60.10)'),
    out('Host is up (0.0021s latency).'),
    out('PORT    STATE SERVICE  VERSION'),
    out('443/tcp open  ssl/http HarborPoint Secure Sign-On (SSO gateway)'),
    out(''),
    out('Service detection performed. Nmap done: 1 IP address (1 host up) scanned in 6.42 seconds'),
  ]
}

function handleHydra(state: HarborpointState, tokens: string[]): LabLine[] {
  const lines: LabLine[] = []
  let username = ''
  let wordlist = ''
  let wait = 0
  let host = ''
  let module = ''
  for (let i = 1; i < tokens.length; i += 1) {
    const token = tokens[i]
    if (token === '-l') username = tokens[++i] ?? ''
    else if (token === '-P') wordlist = tokens[++i] ?? ''
    else if (token === '-W' || token === '-w') wait = Number(tokens[++i] ?? 0)
    else if (token === '-t' || token === '-f' || token === '-s' || token === '-V') {
      if (token === '-t' || token === '-s') i += 1
    } else if (!token.startsWith('-') && !host) host = token
    else if (!token.startsWith('-') && !module) module = token
  }

  if (!host.includes('harborpoint') && host !== '10.20.60.10') {
    return [err('[ERROR] target is outside the authorized lab scope')]
  }
  if (!module) return [err('[ERROR] no service module specified (e.g. http-post-form)')]
  if (!username) return [err('[ERROR] supply a single login with -l for this lab')]
  if (!wordlist) return [err('[ERROR] supply a password wordlist with -P')]
  if (!wordlist.split('/').pop()?.endsWith('lab-wordlist.txt')) {
    return [err(`[ERROR] cannot open wordlist file: ${wordlist}`)]
  }

  lines.push(out('Hydra v9.5 (c) 2023 by van Hauser/THC & David Maciejak - Please do not use in military or secret service organizations, or for illegal purposes (this is non-binding, these *** ignore laws and ethics anyway).'))
  lines.push(out(''))
  lines.push(out(`[DATA] max ${labWordlist.length} tasks per 1 server, overall ${labWordlist.length} tasks, ${labWordlist.length} login tries (l:1/p:${labWordlist.length}), ~1 try per task`))
  lines.push(out('[DATA] attacking http-post-form://auth.harborpoint.internal.lab:443/api/harborpoint/api/login'))

  state.progress.attacked = true
  if (username in accounts) state.progress.identified = true

  const account = accounts[username]
  const spaced = wait >= 2
  let cracked: string | null = null
  let attempts = 0
  for (const candidate of labWordlist) {
    attempts += 1
    if (!spaced && attempts > RATE_MAX_ATTEMPTS) {
      lines.push(err(`[ERROR] target answered with HTTP 429 (rate limited) after ${RATE_MAX_ATTEMPTS} rapid attempts`))
      lines.push(sys('Hydra aborted. The SSO gateway throttles fast attacks — re-run with -W 2 to space attempts, exactly like real rate-limit evasion.'))
      return lines
    }
    lines.push(out(`[ATTEMPT] target auth.harborpoint.internal.lab - login "${username}" - pass "${candidate}" - ${attempts} of ${labWordlist.length}`))
    if (account && candidate === account.password) {
      cracked = candidate
      break
    }
  }

  if (cracked) {
    lines.push(ok(`[443][http-post-form] host: auth.harborpoint.internal.lab   login: ${username}   password: ${cracked}`))
    lines.push(ok(`1 of 1 target successfully completed, 1 valid password found`))
    lines.push(sys('Valid credentials recovered. Use them against the sign-on service (web target or curl) to reach the protected vault.'))
  } else {
    lines.push(out(`0 valid passwords found for login "${username}". Verify the account name before attacking.`))
  }
  return lines
}

function handleTerminalCommand(state: HarborpointState, command: string) {
  const tokens = tokenize(command)
  const cmd = (tokens[0] ?? '').toLowerCase()

  if (cmd === 'help') {
    state.history.push(out('Lab commands: help, clear, exit, nmap, curl, hydra'))
    state.history.push(out('nmap -sV auth.harborpoint.internal.lab'))
    state.history.push(out('curl -s "http://auth.harborpoint.internal.lab/api/directory"'))
    state.history.push(out('curl -s -X POST "http://auth.harborpoint.internal.lab/api/login" -d "username=<user>&password=<pass>"'))
    state.history.push(out('hydra -l <user> -P lab-wordlist.txt [-W 2] auth.harborpoint.internal.lab http-post-form "/api/login:username=^USER^&password=^PASS^:invalid credentials"'))
    return
  }
  if (cmd === 'clear') {
    state.history = []
    return
  }
  if (cmd === 'exit') {
    state.history.push(sys('Session closed. The sign-on service remains available.'))
    return
  }
  if (cmd === 'nmap') {
    state.history.push(...handleNmap(tokens))
    return
  }
  if (cmd === 'curl') {
    state.history.push(...handleCurl(state, tokens))
    return
  }
  if (cmd === 'hydra') {
    state.history.push(...handleHydra(state, tokens))
    return
  }
  state.history.push(err(`bash: ${cmd}: command not found — this lab terminal supports nmap, curl, hydra, help, clear, exit`))
}

function directoryBody() {
  return {
    staff: [
      { name: 'M. Rivera', role: 'Claims Analyst', email: 'mrivera@harborpoint.internal.lab' },
      { name: 'S. Okafor', role: 'Help Desk', email: 'helpdesk@harborpoint.internal.lab' },
      { name: 'J. Whitfield', role: 'IT Administrator', email: 'admin@harborpoint.internal.lab' },
      { name: 'K. Duarte', role: 'Facilities', email: 'kduarte@harborpoint.internal.lab' },
    ],
    note: 'Account usernames follow the directory naming convention.',
  }
}

function vaultBody() {
  return {
    vault: 'HarborPoint claims escrow — restricted',
    flag: credentialFlag,
  }
}

/* --------------------------------- routes ---------------------------------- */

export async function GET(request: Request, context: LabContext) {
  const endpoint = await labEndpoint(context)
  const { cookie, state } = getSession(request)

  if (endpoint === '/api/progress') return labJson({ ...state.progress, submitted: state.submitted }, {}, cookie, COOKIE)
  if (endpoint === '/terminal') return labJson({ lines: state.history, prompt: kaliPrompt() }, {}, cookie, COOKIE)
  if (endpoint === '/api/session') return labJson({ user: state.sessionUser }, {}, cookie, COOKIE)
  if (endpoint === '/api/directory') {
    state.progress.enumerated = true
    return labJson(directoryBody(), {}, cookie, COOKIE)
  }
  if (endpoint === '/lab-wordlist.txt') {
    const body = new Response(`${labWordlist.join('\n')}\n`, { headers: { 'content-type': 'text/plain' } })
    body.headers.set('set-cookie', `${COOKIE}=${cookie}; Path=/; HttpOnly; SameSite=Lax`)
    return body
  }
  if (endpoint === '/api/secure-vault') {
    if (!state.sessionUser) return labJson({ error: 'authentication required' }, { status: 401 }, cookie, COOKIE)
    state.progress.retrieved = true
    return labJson(vaultBody(), {}, cookie, COOKIE)
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
    const before = state.progress.authenticated
    const outcome = tryLogin(state, username, password)
    if (!before && username in accounts && outcome.status === 401) {
      const failures = state.attemptLog.length
      if (failures >= 3) state.progress.attacked = true
    }
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
    if (!state.progress.retrieved) {
      return labJson({ accepted: false, error: 'Access the protected vault before submitting.' }, { status: 403 }, cookie, COOKIE)
    }
    const accepted = body.flag?.trim() === credentialFlag
    if (accepted) state.submitted = true
    return labJson({ accepted, ...(accepted ? {} : { error: 'Flag rejected.' }) }, {}, cookie, COOKIE)
  }

  return labJson({ error: 'not found' }, { status: 404 }, cookie, COOKIE)
}
