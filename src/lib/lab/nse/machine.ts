import { err, kaliPrompt, ok, out, rootPrompt, sys, type LabLine, type TerminalMachine, type TerminalState } from '@/lib/lab/terminal'

const FLAG = 'RIVAN{vsftpd_backdoor_6200}'
const TARGET = '10.20.30.10'

interface NseProgress {
  scanned: boolean
  identified: boolean
  triggered: boolean
  shell: boolean
  flag: boolean
}

interface NseState extends TerminalState {
  context: 'kali' | 'ftp' | 'shell'
  ftpStage: 'user' | 'pass'
  ftpUser: string
  backdoorOpen: boolean
  progress: NseProgress
}

function nmapBasic(): LabLine[] {
  return [
    out('Starting Nmap 7.94SVN ( https://nmap.org )'),
    out(`Nmap scan report for ats-srv01.internal.lab (${TARGET})`),
    out('Host is up (0.0018s latency).'),
    out('Not shown: 997 closed tcp ports (reset)'),
    out('PORT   STATE SERVICE'),
    out('21/tcp open  ftp'),
    out('22/tcp open  ssh'),
    out('80/tcp open  http'),
    out(''),
    out('Nmap done: 1 IP address (1 host up) scanned in 2.84 seconds'),
  ]
}

function nmapVersions(includeBackdoor: boolean): LabLine[] {
  const lines = [
    out('Starting Nmap 7.94SVN ( https://nmap.org )'),
    out(`Nmap scan report for ats-srv01.internal.lab (${TARGET})`),
    out('Host is up (0.0018s latency).'),
    out('Not shown: 996 closed tcp ports (reset)'),
    out('PORT     STATE SERVICE VERSION'),
    out('21/tcp   open  ftp     vsftpd 2.3.4'),
    out('22/tcp   open  ssh     OpenSSH 7.4 (protocol 2.0)'),
    out('80/tcp   open  http    Apache httpd 2.4.41 ((Ubuntu))'),
  ]
  if (includeBackdoor) lines.push(out('6200/tcp open  shell   backdoor shell (root)'))
  lines.push(out('|_http-title: ATS Field Server — default page'))
  lines.push(out(''))
  lines.push(out('Service detection performed. Nmap done: 1 IP address (1 host up) scanned in 11.37 seconds'))
  return lines
}

function handleNmap(state: NseState, tokens: string[]): LabLine[] {
  const target = tokens.find((token, index) => index > 0 && !token.startsWith('-') && tokens[index - 1] !== '-p')
  if (target && target !== TARGET && !target.includes('ats-srv01')) {
    return [err(`Failed to resolve "${target}" — only ${TARGET} is in lab scope.`)]
  }
  state.progress.scanned = true
  const flags = tokens.filter((token) => token.startsWith('-')).join(' ')
  const wantsAllPorts = /-p-|-p\s*6200|-p\s*1-/.test(tokens.join(' '))
  if (/-sV/.test(flags) || /-sC/.test(flags) || /-A\b/.test(flags)) {
    state.progress.identified = true
    return nmapVersions(state.backdoorOpen && wantsAllPorts)
  }
  if (wantsAllPorts && state.backdoorOpen) {
    return [...nmapBasic().slice(0, 4), out('PORT     STATE SERVICE'), out('21/tcp   open  ftp'), out('22/tcp   open  ssh'), out('80/tcp   open  http'), out('6200/tcp open  shell'), out(''), out('Nmap done: 1 IP address (1 host up) scanned in 4.12 seconds')]
  }
  return nmapBasic()
}

function handleFtpInput(state: NseState, input: string): LabLine[] {
  const value = input.trim()
  if (state.ftpStage === 'user') {
    state.ftpUser = value
    if (value.includes(':)')) {
      state.ftpStage = 'pass'
      return [out('331 Please specify the password.')]
    }
    state.ftpStage = 'pass'
    return [out('331 Please specify the password.')]
  }

  // password stage
  if (state.ftpUser.includes(':)')) {
    state.backdoorOpen = true
    state.progress.triggered = true
    state.progress.identified = true
    state.context = 'kali'
    return [
      out('...'),
      err('The FTP session stopped responding.'),
      sys('^C — session aborted. A vsftpd 2.3.4 smiley-face username triggers a backdoor listener on port 6200.'),
      sys(`Verify with: nmap -p 6200 ${TARGET} — then connect with: nc ${TARGET} 6200`),
    ]
  }
  state.ftpStage = 'user'
  return [out('530 Login incorrect.'), out('ftp: Login failed')]
}

function handleShellCommand(state: NseState, input: string): LabLine[] {
  const cmd = input.trim().split(/\s+/)
  const verb = cmd[0]?.toLowerCase() ?? ''

  switch (verb) {
    case 'whoami':
      return [out('root')]
    case 'id':
      return [out('uid=0(root) gid=0(root) groups=0(root)')]
    case 'hostname':
      return [out('ats-srv01')]
    case 'pwd':
      return [out('/')]
    case 'ls': {
      const path = cmd[1] ?? '/'
      if (path === '/root') return [out('flag.txt  notes.txt')]
      return [out('bin  etc  home  opt  root  srv  usr  var')]
    }
    case 'cat': {
      const target = cmd[1] ?? ''
      if (target === '/root/flag.txt' || target === 'root/flag.txt') {
        state.progress.flag = true
        return [ok(FLAG)]
      }
      if (target === '/root/notes.txt') {
        return [out('Field deployment note: vsftpd 2.3.4 was installed from an unverified mirror. Replace with the signed package before this host leaves the lab.')]
      }
      if (target === '') return [err('cat: missing operand')]
      return [err(`cat: ${target}: No such file or directory`)]
    }
    case 'uname':
      return [out('Linux ats-srv01 5.15.0-91-generic #101-Ubuntu SMP x86_64 GNU/Linux')]
    case 'exit':
    case 'quit':
      state.context = 'kali'
      return [sys('Backdoor shell closed.')]
    default:
      return [err(`sh: ${verb}: command not found`)]
  }
}

function handleKaliCommand(state: NseState, input: string): LabLine[] {
  const tokens = input.trim().split(/\s+/).filter(Boolean)
  const cmd = tokens[0]?.toLowerCase() ?? ''

  switch (cmd) {
    case 'help':
      return [
        out('Lab commands: help, clear, exit'),
        out(`nmap -sC -sV ${TARGET}        fingerprint services on the target`),
        out(`ftp ${TARGET}                  connect to the FTP service`),
        out(`nc ${TARGET} <port>            raw TCP connection (netcat)`),
        out(`curl http://${TARGET}/         request the HTTP service`),
        out(`ssh <user>@${TARGET}           try the SSH service`),
      ]
    case 'clear':
      state.history = []
      return []
    case 'exit':
      return [sys('Leave the engagement by closing the terminal tab. Target remains online.')]
    case 'nmap':
      return handleNmap(state, tokens)
    case 'ftp': {
      const host = tokens[1]
      if (host !== TARGET && !host?.includes('ats-srv01')) return [err('ftp: connect: Connection timed out')]
      state.context = 'ftp'
      state.ftpStage = 'user'
      return [out(`Connected to ${TARGET}.`), out('220 (vsftpd 2.3.4)'), sys('ftp: Name')]
    }
    case 'nc':
    case 'netcat':
    case 'ncat': {
      const host = tokens[1]
      const port = Number(tokens[2])
      if ((host === TARGET || host?.includes('ats-srv01')) && port === 6200) {
        if (!state.backdoorOpen) return [err(`nc: connect to ${TARGET} port 6200 (tcp) failed: Connection refused`)]
        state.context = 'shell'
        state.progress.shell = true
        return [sys('(no banner — raw shell opened by the backdoor)')]
      }
      return [err(`nc: connect to ${host ?? '?'} port ${tokens[2] ?? '?'} (tcp) failed: Connection refused`)]
    }
    case 'ssh':
      return [err(`ssh: connect to host ${TARGET} port 22: Permission denied (publickey,password).`)]
    case 'curl':
      return [
        out('<html><head><title>ATS Field Server</title></head>'),
        out('<body><h1>Apache2 Ubuntu Default Page</h1><p>ats-srv01 field deployment. FTP mirror service for archive bundles.</p></body></html>'),
      ]
    case 'ping':
      return [out(`64 bytes from ${TARGET}: icmp_seq=1 ttl=63 time=1.8 ms`)]
    default:
      return [err(`bash: ${cmd}: command not found — type help for lab commands`)]
  }
}

export const nseMachine: TerminalMachine<NseState> = {
  flag: FLAG,
  cookieName: 'nse_session',
  submitGateError: 'Read /root/flag.txt from the compromised server before submitting.',

  createState(): NseState {
    return {
      history: [
        sys('Rivan Hacker Lab // Challenge 6 — Network Service Exploitation'),
        sys(`Target: ${TARGET} (ats-srv01.internal.lab) — authorized scope: this host only`),
        sys('Start with reconnaissance. Type help for the available tooling.'),
      ],
      submitted: false,
      context: 'kali',
      ftpStage: 'user',
      ftpUser: '',
      backdoorOpen: false,
      progress: { scanned: false, identified: false, triggered: false, shell: false, flag: false },
    }
  },

  prompt(state: NseState): string {
    if (state.context === 'ftp') return 'ftp>'
    if (state.context === 'shell') return rootPrompt('ats-srv01', '/')
    return kaliPrompt()
  },

  handle(state: NseState, input: string) {
    if (!input.trim()) return
    if (state.context === 'shell') {
      state.history.push(...handleShellCommand(state, input))
      return
    }
    if (state.context === 'ftp') {
      const value = input.trim().toLowerCase()
      if (value === 'quit' || value === 'bye' || value === 'exit') {
        state.context = 'kali'
        state.history.push(out('221 Goodbye.'))
        return
      }
      state.history.push(...handleFtpInput(state, input))
      return
    }
    state.history.push(...handleKaliCommand(state, input))
  },

  progress(state: NseState): Record<string, boolean> {
    return { ...state.progress }
  },

  canSubmit(state: NseState): boolean {
    return state.progress.flag
  },
}
