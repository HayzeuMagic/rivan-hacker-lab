import { err, kaliPrompt, ok, out, sys, userPrompt, type LabLine, type TerminalMachine, type TerminalState } from '@/lib/lab/terminal'

const FLAG = 'RIVAN{lateral_movement_pivot}'
const DMZ_HOST = 'dmz-web01'
const DMZ_IP = '10.20.10.15'
const INTERNAL_HOST = 'fin-db01'
const INTERNAL_IP = '172.16.30.40'
const FOOTHOLD_USER = 'webapp'
const FOOTHOLD_PASS = 'W3b-App!2024'
const INTERNAL_USER = 'jdoe'
const INTERNAL_PASS = 'Jd0e-W1nt3r!'

interface PivotProgress {
  foothold: boolean
  enumerated: boolean
  creds: boolean
  discovered: boolean
  pivoted: boolean
  flag: boolean
}

interface PendingSsh {
  user: string
  target: 'dmz' | 'internal'
  viaForward: boolean
}

interface PivotState extends TerminalState {
  context: 'kali' | 'dmz' | 'internal'
  cwd: string
  pendingSsh: PendingSsh | null
  forwarded: boolean
  progress: PivotProgress
}

const dmzFiles: Record<string, string> = {
  '/var/www/html/config.php': `<?php\n// dmz-web01 storefront configuration\ndefine('DB_HOST', '10.20.10.15');\ndefine('DB_USER', 'storefront');\ndefine('DB_PASS', 'St0r3fr0nt!Prod');\ndefine('DB_NAME', 'storefront_prod');\n?>`,
  '/home/webapp/notes.txt': `Onboarding notes (draft)\n- jdoe from finance IT needs temporary access to fin-db01 (172.16.30.40).\n- Set his password to ${INTERNAL_PASS} until onboarding completes. Remind him to change it.\n- fin-db01 is only reachable from this host's internal NIC.`,
  '/home/webapp/.bash_history': `cd /var/www/html\nsudo systemctl reload nginx\nping 172.16.30.40\nssh ${INTERNAL_USER}@${INTERNAL_IP}\nexit`,
}

function sshPasswordPrompt(state: PivotState, pending: PendingSsh): LabLine[] {
  state.pendingSsh = pending
  return [out(`${pending.user}@${pending.target === 'dmz' ? DMZ_IP : pending.viaForward ? 'localhost' : INTERNAL_IP}'s password: `)]
}

function completeSsh(state: PivotState, password: string): LabLine[] {
  const pending = state.pendingSsh
  state.pendingSsh = null
  if (!pending) return [err('No authentication in progress.')]

  if (pending.target === 'dmz') {
    if (pending.user !== FOOTHOLD_USER) return [err('Permission denied, please try again.')]
    if (password !== FOOTHOLD_PASS) return [err('Permission denied, please try again.')]
    state.context = 'dmz'
    state.cwd = '/home/webapp'
    state.progress.foothold = true
    if (pending.viaForward) state.forwarded = true
    return [
      sys(`Welcome to ${DMZ_HOST} (Ubuntu 22.04 LTS) — DMZ segment`),
      out(`Last login: Tue Oct  1 08:41:22 2026 from 10.20.10.1`),
    ]
  }

  // internal target
  if (pending.user !== INTERNAL_USER) return [err('Permission denied, please try again.')]
  if (password !== INTERNAL_PASS) return [err('Permission denied, please try again.')]
  state.context = 'internal'
  state.cwd = '/home/jdoe'
  state.progress.pivoted = true
  return [
    sys(`Welcome to ${INTERNAL_HOST} (Ubuntu 22.04 LTS) — internal finance segment`),
    out(`Last login: Tue Oct  1 09:02:11 2026 from ${DMZ_IP}`),
  ]
}

function handleKali(state: PivotState, tokens: string[], raw: string): LabLine[] {
  const cmd = tokens[0]?.toLowerCase() ?? ''
  switch (cmd) {
    case 'help':
      return [
        out('Lab commands: help, clear, exit'),
        out(`ssh ${FOOTHOLD_USER}@${DMZ_IP}                              foothold host (credentials in the brief)`),
        out(`nmap -sV ${DMZ_IP}                             fingerprint the DMZ host`),
        out(`ssh -J ${FOOTHOLD_USER}@${DMZ_IP} jdoe@${INTERNAL_IP}   ProxyJump through the foothold`),
        out(`ssh -L 2222:${INTERNAL_IP}:22 ${FOOTHOLD_USER}@${DMZ_IP}  local port forward, then ssh -p 2222 jdoe@localhost`),
      ]
    case 'clear':
      state.history = []
      return []
    case 'exit':
      return [sys('Engagement terminal closed. Lab state persists until reset.')]
    case 'nmap': {
      const target = tokens.find((token, index) => index > 0 && !token.startsWith('-'))
      if (target === INTERNAL_IP || target === INTERNAL_HOST) {
        return [err(`Note: Host seems down. If it is really up, but blocking our ping probes, try -Pn`), sys('The internal segment is not routable from Kali. Pivot through the foothold.')]
      }
      if (target === DMZ_IP || target === DMZ_HOST) {
        return [
          out('Starting Nmap 7.94SVN ( https://nmap.org )'),
          out(`Nmap scan report for ${DMZ_HOST}.internal.lab (${DMZ_IP})`),
          out('Host is up (0.0019s latency).'),
          out('PORT   STATE SERVICE VERSION'),
          out('22/tcp open  ssh     OpenSSH 8.9p1 Ubuntu 3ubuntu0.6'),
          out('80/tcp open  http    nginx 1.18.0 (Ubuntu)'),
          out(''),
          out('Nmap done: 1 IP address (1 host up) scanned in 8.14 seconds'),
        ]
      }
      return [err('Only the authorized lab targets are in scope.')]
    }
    case 'ping': {
      const target = tokens[1] ?? ''
      if (target === INTERNAL_IP) return [err(`From ${DMZ_IP}: Destination Host Unreachable (no route from the Kali segment)`)]
      if (target === DMZ_IP) return [out(`64 bytes from ${DMZ_IP}: icmp_seq=1 ttl=64 time=1.2 ms`)]
      return [err(`ping: ${target}: Name or service not known`)]
    }
    case 'ssh': {
      const joinTarget = tokens.find((token) => token.includes('@') && !token.startsWith('-'))
      const proxyJump = /-J\b/.test(raw)
      const localForward = /-L\s*\d+:/.test(raw)
      const portFlagIndex = tokens.indexOf('-p')
      const forwardPort = portFlagIndex !== -1 ? Number(tokens[portFlagIndex + 1]) : null

      if (proxyJump) {
        const final = tokens.filter((token) => token.includes('@')).pop() ?? ''
        const [user, host] = final.split('@')
        if (host === INTERNAL_IP || host === INTERNAL_HOST) {
          if (!state.progress.foothold) {
            return [err(`ssh: Could not establish ProxyJump connection — authenticate to the foothold (${DMZ_IP}) at least once first.`)]
          }
          return sshPasswordPrompt(state, { user, target: 'internal', viaForward: true })
        }
      }

      if (localForward) {
        if (!raw.includes(`${FOOTHOLD_USER}@${DMZ_IP}`)) return [err('ssh: -L forwards in this lab must terminate on the foothold host.')]
        return sshPasswordPrompt(state, { user: FOOTHOLD_USER, target: 'dmz', viaForward: true })
      }

      if (forwardPort === 2222 && joinTarget && (joinTarget.endsWith('@localhost') || joinTarget.endsWith('@127.0.0.1'))) {
        if (!state.forwarded) return [err('ssh: connect to host localhost port 2222: Connection refused')]
        const [user] = joinTarget.split('@')
        return sshPasswordPrompt(state, { user, target: 'internal', viaForward: true })
      }

      if (!joinTarget) return [err('usage: ssh user@host')]
      const [user, host] = joinTarget.split('@')
      if (host === DMZ_IP || host === DMZ_HOST) return sshPasswordPrompt(state, { user, target: 'dmz', viaForward: false })
      if (host === INTERNAL_IP || host === INTERNAL_HOST) {
        return [err(`ssh: connect to host ${INTERNAL_IP} port 22: Connection timed out`), sys('No route to the internal segment from Kali. Use the DMZ foothold as a pivot.')]
      }
      return [err(`ssh: Could not resolve hostname ${host}: Name or service not known`)]
    }
    default:
      return [err(`bash: ${cmd}: command not found — type help for lab commands`)]
  }
}

function handleDmz(state: PivotState, tokens: string[]): LabLine[] {
  const cmd = tokens[0]?.toLowerCase() ?? ''
  switch (cmd) {
    case 'clear':
      state.history = []
      return []
    case 'exit':
      state.context = 'kali'
      state.cwd = '~'
      return [sys(`Connection to ${DMZ_IP} closed.`)]
    case 'whoami':
      return [out(FOOTHOLD_USER)]
    case 'id':
      return [out('uid=1002(webapp) gid=1002(webapp) groups=1002(webapp),33(www-data)')]
    case 'hostname':
      return [out(DMZ_HOST)]
    case 'pwd':
      return [out(state.cwd)]
    case 'ls':
    case 'dir': {
      if (state.cwd === '/home/webapp') return [out('notes.txt')]
      if (state.cwd === '/var/www/html') return [out('config.php  index.html')]
      if (state.cwd === '/var/www') return [out('html')]
      return [out('home  var  etc  tmp  usr')]
    }
    case 'cd': {
      const target = tokens[1] ?? `/home/${FOOTHOLD_USER}`
      const normalized = target.startsWith('/') ? target : `${state.cwd}/${target}`
      const known = ['/', '/home', '/home/webapp', '/var', '/var/www', '/var/www/html', '/tmp', '/etc', '/usr']
      if (target === '~') {
        state.cwd = '/home/webapp'
        return []
      }
      if (known.includes(normalized)) {
        state.cwd = normalized
        return []
      }
      return [err(`bash: cd: ${target}: No such file or directory`)]
    }
    case 'cat': {
      const target = tokens[1] ?? ''
      const path = target.startsWith('/') ? target : `${state.cwd}/${target}`
      const resolved = path.replace(/\/\.\//g, '/').replace(`${FOOTHOLD_USER}/./`, `${FOOTHOLD_USER}/`)
      const homeAlias = target.replace(/^~\//, `/home/${FOOTHOLD_USER}/`)
      const content = dmzFiles[resolved] ?? dmzFiles[homeAlias] ?? dmzFiles[path]
      if (!content) return [err(`cat: ${target}: No such file or directory`)]
      if (resolved.includes('notes.txt') || homeAlias.includes('notes.txt')) state.progress.creds = true
      if (resolved.includes('.bash_history') || homeAlias.includes('.bash_history')) state.progress.discovered = true
      return [out(content)]
    }
    case 'ip': {
      const sub = tokens[1]
      if (sub === 'route') {
        state.progress.enumerated = true
        return [
          out('default via 10.20.10.1 dev eth0 proto static'),
          out('10.20.10.0/24 dev eth0 proto kernel scope link src 10.20.10.15'),
          out('172.16.30.0/24 dev eth1 proto kernel scope link src 172.16.30.15'),
        ]
      }
      if (sub === 'neigh' || sub === 'neighbor') {
        state.progress.enumerated = true
        return [out(`10.20.10.1 dev eth0 lladdr 02:42:0a:14:0a:01 REACHABLE`), out(`${INTERNAL_IP} dev eth1 lladdr 02:42:ac:10:1e:28 REACHABLE`)]
      }
      return [err('ip: supported subcommands: route, neigh')]
    }
    case 'arp':
      state.progress.enumerated = true
      return [out(`? (${INTERNAL_IP}) at 02:42:ac:10:1e:28 [ether] on eth1`)]
    case 'ifconfig':
    case 'ip a':
    case 'ip addr':
      state.progress.enumerated = true
      return [
        out('eth0: inet 10.20.10.15  brd 10.20.10.255  scope global eth0'),
        out('eth1: inet 172.16.30.15  brd 172.16.30.255  scope global eth1'),
      ]
    case 'ping': {
      const target = tokens[1] ?? ''
      if (target === INTERNAL_IP || target === INTERNAL_HOST) {
        state.progress.discovered = true
        return [out(`64 bytes from ${INTERNAL_IP}: icmp_seq=1 ttl=63 time=0.9 ms`), out(`64 bytes from ${INTERNAL_IP}: icmp_seq=2 ttl=63 time=0.7 ms`)]
      }
      return [err(`ping: ${target}: Name or service not known`)]
    }
    case 'nmap': {
      const target = tokens.find((token, index) => index > 0 && !token.startsWith('-'))
      if (target === INTERNAL_IP || target === INTERNAL_HOST) {
        state.progress.discovered = true
        return [
          out(`Nmap scan report for ${INTERNAL_HOST}.internal.lab (${INTERNAL_IP})`),
          out('Host is up (0.0011s latency).'),
          out('PORT     STATE SERVICE VERSION'),
          out('22/tcp   open  ssh     OpenSSH 8.9p1 Ubuntu 3ubuntu0.6'),
          out('443/tcp  open  https   nginx 1.18.0 (finance intranet)'),
          out(''),
          out(`Nmap done: 1 IP address (1 host up) scanned in 6.88 seconds`),
        ]
      }
      return [err('Only internal-segment targets reachable from this host are scannable.')]
    }
    case 'ssh': {
      const joinTarget = tokens.find((token) => token.includes('@'))
      if (!joinTarget) return [err('usage: ssh user@host')]
      const [user, host] = joinTarget.split('@')
      if (host === INTERNAL_IP || host === INTERNAL_HOST) {
        return sshPasswordPrompt(state, { user, target: 'internal', viaForward: false })
      }
      return [err(`ssh: connect to host ${host} port 22: Connection timed out`)]
    }
    default:
      return [err(`bash: ${cmd}: command not found`)]
  }
}

function handleInternal(state: PivotState, tokens: string[]): LabLine[] {
  const cmd = tokens[0]?.toLowerCase() ?? ''
  switch (cmd) {
    case 'clear':
      state.history = []
      return []
    case 'exit':
      state.context = 'dmz'
      state.cwd = '/home/webapp'
      return [sys(`Connection to ${INTERNAL_IP} closed.`)]
    case 'whoami':
      return [out(INTERNAL_USER)]
    case 'hostname':
      return [out(INTERNAL_HOST)]
    case 'pwd':
      return [out('/home/jdoe')]
    case 'ls':
      return [out('flag.txt  payroll-exports')]
    case 'cat': {
      const target = tokens[1] ?? ''
      if (target === 'flag.txt' || target === '/home/jdoe/flag.txt') {
        state.progress.flag = true
        return [ok(FLAG)]
      }
      return [err(`cat: ${target}: No such file or directory`)]
    }
    default:
      return [err(`bash: ${cmd}: command not found`)]
  }
}

export const pivotMachine: TerminalMachine<PivotState> = {
  flag: FLAG,
  cookieName: 'pivot_session',
  submitGateError: 'Reach the internal host and read its flag before submitting.',

  createState(): PivotState {
    return {
      history: [
        sys('Rivan Hacker Lab // Challenge 9 — Lateral Movement'),
        sys(`Foothold credentials from the prior engagement: ${FOOTHOLD_USER} / ${FOOTHOLD_PASS} on ${DMZ_IP}`),
        sys('Objective: reach the internal finance host. It is NOT routable from the Kali segment.'),
      ],
      submitted: false,
      context: 'kali',
      cwd: '~',
      pendingSsh: null,
      forwarded: false,
      progress: { foothold: false, enumerated: false, creds: false, discovered: false, pivoted: false, flag: false },
    }
  },

  prompt(state: PivotState): string {
    if (state.pendingSsh) return 'password:'
    if (state.context === 'dmz') return userPrompt(FOOTHOLD_USER, DMZ_HOST, state.cwd.replace('/home/webapp', '~'))
    if (state.context === 'internal') return userPrompt(INTERNAL_USER, INTERNAL_HOST, '~/')
    return kaliPrompt()
  },

  handle(state: PivotState, input: string) {
    if (!input.trim()) return
    if (state.pendingSsh) {
      state.history.push(...completeSsh(state, input.trim()))
      return
    }
    const tokens = input.trim().split(/\s+/).filter(Boolean)
    if (state.context === 'kali') state.history.push(...handleKali(state, tokens, input.trim()))
    else if (state.context === 'dmz') state.history.push(...handleDmz(state, tokens))
    else state.history.push(...handleInternal(state, tokens))
  },

  progress(state: PivotState): Record<string, boolean> {
    return { ...state.progress }
  },

  canSubmit(state: PivotState): boolean {
    return state.progress.flag
  },
}
