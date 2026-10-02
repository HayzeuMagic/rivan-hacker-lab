import { clearLabCookie, getCookieSession, labEndpoint, labJson, type LabContext } from '@/lib/lab/http'

export type LineKind = 'input' | 'output' | 'error' | 'success' | 'system'

export interface LabLine {
  kind: LineKind
  text: string
  prompt?: string
}

export function out(text: string): LabLine {
  return { kind: 'output', text }
}
export function err(text: string): LabLine {
  return { kind: 'error', text }
}
export function ok(text: string): LabLine {
  return { kind: 'success', text }
}
export function sys(text: string): LabLine {
  return { kind: 'system', text }
}

export function kaliPrompt(cwd = '~'): string {
  return `┌──(kali㉿kali)-[${cwd}]\n└─$`
}

export function userPrompt(user: string, host: string, cwd = '~'): string {
  return `${user}@${host}:${cwd}$`
}

export function rootPrompt(host: string, cwd = '~'): string {
  return `root@${host}:${cwd}#`
}

export interface TerminalState {
  history: LabLine[]
  submitted: boolean
}

/**
 * Contract implemented by every terminal-based lab machine.
 * All state transitions happen server-side inside `handle`.
 */
export interface TerminalMachine<T extends TerminalState> {
  flag: string
  cookieName: string
  createState(): T
  handle(state: T, input: string): void
  prompt(state: T): string
  progress(state: T): Record<string, boolean>
  /** Gate that must be satisfied before a flag submission is accepted. */
  canSubmit(state: T): boolean
  submitGateError: string
}

interface RouteHandlers {
  GET: (request: Request, context: LabContext) => Promise<Response>
  POST: (request: Request, context: LabContext) => Promise<Response>
}

/** Builds the standard lab route handlers: /api/progress, /terminal, /reset, /submit. */
export function createTerminalRoutes<T extends TerminalState>(machine: TerminalMachine<T>): RouteHandlers {
  const sessions = new Map<string, T>()

  const getSession = (request: Request) =>
    getCookieSession(request, machine.cookieName, sessions, () => machine.createState())

  function echo(state: T, command: string) {
    state.history.push({ kind: 'input', text: command, prompt: machine.prompt(state) })
  }

  return {
    async GET(request: Request, context: LabContext) {
      const endpoint = await labEndpoint(context)
      const { cookie, state } = getSession(request)
      if (endpoint === '/api/progress') {
        return labJson({ ...machine.progress(state), submitted: state.submitted }, {}, cookie, machine.cookieName)
      }
      if (endpoint === '/terminal') {
        return labJson({ lines: state.history, prompt: machine.prompt(state) }, {}, cookie, machine.cookieName)
      }
      return labJson({ error: 'not found' }, { status: 404 }, cookie, machine.cookieName)
    },

    async POST(request: Request, context: LabContext) {
      const endpoint = await labEndpoint(context)
      const { cookie, state } = getSession(request)

      if (endpoint === '/reset') {
        sessions.delete(cookie)
        return clearLabCookie(machine.cookieName)
      }

      if (endpoint === '/terminal') {
        const body = (await request.json().catch(() => ({}))) as { command?: string }
        const command = String(body.command ?? '')
        echo(state, command)
        machine.handle(state, command)
        return labJson({ lines: state.history, prompt: machine.prompt(state), progress: machine.progress(state) }, {}, cookie, machine.cookieName)
      }

      if (endpoint === '/submit') {
        const body = (await request.json().catch(() => ({}))) as { flag?: string }
        if (!machine.canSubmit(state)) {
          return labJson({ accepted: false, error: machine.submitGateError }, { status: 403 }, cookie, machine.cookieName)
        }
        const accepted = body.flag?.trim() === machine.flag
        if (accepted) state.submitted = true
        return labJson({ accepted, ...(accepted ? {} : { error: 'Flag rejected.' }) }, {}, cookie, machine.cookieName)
      }

      return labJson({ error: 'not found' }, { status: 404 }, cookie, machine.cookieName)
    },
  }
}
