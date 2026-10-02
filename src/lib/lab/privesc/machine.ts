import { err, ok, out, sys, userPrompt, rootPrompt, type LabLine, type TerminalMachine, type TerminalState } from '@/lib/lab/terminal'

const FLAG = 'RIVAN{privesc_sudo_tar_root}'
const HOST = 'web-srv01'

interface FsEntry {
  type: 'f' | 'd'
  owner: string
  group: string
  perms: string
  suid?: boolean
  content?: string
}

const baseFs: Record<string, FsEntry> = {
  '/': { type: 'd', owner: 'root', group: 'root', perms: 'rwxr-xr-x' },
  '/home': { type: 'd', owner: 'root', group: 'root', perms: 'rwxr-xr-x' },
  '/tmp': { type: 'd', owner: 'root', group: 'root', perms: 'rwxrwxrwx' },
  '/root': { type: 'd', owner: 'root', group: 'root', perms: 'rwx------' },
  '/root/flag.txt': { type: 'f', owner: 'root', group: 'root', perms: 'rw-------', content: FLAG },
  '/etc': { type: 'd', owner: 'root', group: 'root', perms: 'rwxr-xr-x' },
  '/etc/passwd': {
    type: 'f', owner: 'root', group: 'root', perms: 'rw-r--r--',
    content: 'root:x:0:0:root:/root:/bin/bash\ndaemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin\nwww-data:x:33:33:www-data:/var/www:/usr/sbin/nologin\ndeploy:x:1001:1001:Deploy User:/home/deploy:/bin/bash',
  },
  '/etc/shadow': { type: 'f', owner: 'root', group: 'shadow', perms: 'rw-r-----', content: 'root:*:19500:0:99999:7:::' },
  '/etc/crontab': {
    type: 'f', owner: 'root', group: 'root', perms: 'rw-r--r--',
    content: '# /etc/crontab: system-wide crontab\nSHELL=/bin/sh\nPATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin\n\n# m h dom mon dow user  command\n*/2 * * * * root    /usr/bin/logrotate -f /etc/logrotate.conf\n*   * * * * root    /opt/scripts/nightly-backup.sh',
  },
  '/var': { type: 'd', owner: 'root', group: 'root', perms: 'rwxr-xr-x' },
  '/var/www': { type: 'd', owner: 'www-data', group: 'www-data', perms: 'rwxr-xr-x' },
  '/var/www/html': { type: 'd', owner: 'www-data', group: 'www-data', perms: 'rwxr-xr-x' },
  '/var/www/html/index.php': { type: 'f', owner: 'www-data', group: 'www-data', perms: 'rw-r--r--', content: '<?php // Aurora status page — lab host\n?><h1>web-srv01 status: OK</h1>' },
  '/opt': { type: 'd', owner: 'root', group: 'root', perms: 'rwxr-xr-x' },
  '/opt/scripts': { type: 'd', owner: 'root', group: 'root', perms: 'rwxr-xr-x' },
  '/opt/scripts/nightly-backup.sh': {
    type: 'f', owner: 'root', group: 'root', perms: 'rw-rw-rw-',
    content: '#!/bin/bash\n# Nightly backup of /var/www — runs as root via cron\ntar -czf /var/backups/www-$(date +%F).tgz /var/www',
  },
  '/var/backups': { type: 'd', owner: 'root', group: 'root', perms: 'rwxr-xr-x' },
  '/usr/bin/tar': { type: 'f', owner: 'root', group: 'root', perms: 'rwxr-xr-x' },
  '/usr/bin/find': { type: 'f', owner: 'root', group: 'root', perms: 'rwsr-xr-x', suid: true },
}

const suidBinaries = ['/usr/bin/passwd', '/usr/bin/su', '/usr/bin/sudo', '/usr/bin/mount', '/usr/lib/openssh/ssh-keysign']

interface PrivescProgress {
  enumerated: boolean
  sudoEnum: boolean
  suidFound: boolean
  cronFound: boolean
  escalated: boolean
  flag: boolean
}

interface PrivescState extends TerminalState {
  cwd: string
  user: 'www-data' | 'root'
  fs: Record<string, FsEntry>
  cronModified: boolean
  cronFired: boolean
  bashSuid: boolean
  progress: PrivescProgress
}

function normalizePath(cwd: string, input: string): string {
  const raw = input.startsWith('/') ? input : `${cwd === '/' ? '' : cwd}/${input}`
  const parts: string[] = []
  for (const part of raw.split('/')) {
    if (!part || part === '.') continue
    if (part === '..') parts.pop()
    else parts.push(part)
  }
  return `/${parts.join('/')}`
}

function listDir(state: PrivescState, path: string, long: boolean): LabLine[] {
  const prefix = path === '/' ? '/' : `${path}/`
  const entries = Object.entries(state.fs).filter(([p]) => {
    if (p === path) return false
    if (!p.startsWith(prefix)) return false
    return !p.slice(prefix.length).includes('/')
  })
  if (!entries.length) return [out('total 0')]
  if (!long) return [out(entries.map(([p]) => p.slice(prefix.length)).join('  '))]
  return [
    out(`total ${entries.length}`),
    ...entries.map(([p, e]) => out(`${e.type === 'd' ? 'd' : '-'}${e.perms} 1 ${e.owner} ${e.group} ${String(e.content?.length ?? 4096).padStart(5)} Oct  1 02:00 ${p.slice(prefix.length)}`)),
  ]
}

function canRead(state: PrivescState, path: string): boolean {
  if (state.user === 'root') return true
  const entry = state.fs[path]
  if (!entry) return false
  if (path === '/root' || path.startsWith('/root/')) return false
  if (path === '/etc/shadow') return false
  return true
}

function canWrite(state: PrivescState, path: string): boolean {
  if (state.user === 'root') return true
  const entry = state.fs[path]
  if (!entry) return false
  if (entry.owner === 'www-data') return entry.perms[1] === 'w'
  return entry.perms[7] === 'w'
}

/** Simulates the every-minute root cron job after the student acts. */
function fireCronIfModified(state: PrivescState): LabLine[] {
  if (!state.cronModified || state.cronFired) return []
  state.cronFired = true
  const script = state.fs['/opt/scripts/nightly-backup.sh']?.content ?? ''
  const lines: LabLine[] = [sys('[cron] root executed /opt/scripts/nightly-backup.sh')]
  if (/cp\s+\/root\/flag\.txt\s+\/tmp\//.test(script)) {
    state.fs['/tmp/flag.txt'] = { type: 'f', owner: 'root', group: 'root', perms: 'rwxrwxrwx', content: FLAG }
    lines.push(sys('[cron] nightly-backup.sh: copied /root/flag.txt into /tmp as root'))
  }
  if (/chmod\s+u\+s\s+\/bin\/bash/.test(script)) {
    state.bashSuid = true
    lines.push(sys('[cron] nightly-backup.sh: set the SUID bit on /bin/bash'))
  }
  if (!state.fs['/tmp/flag.txt'] && !state.bashSuid) {
    lines.push(sys('[cron] backup completed — but your appended lines did not request anything useful. Try copying the flag or setting a SUID shell.'))
  }
  return lines
}

function elevate(state: PrivescState, via: string): LabLine[] {
  state.user = 'root'
  state.progress.escalated = true
  return [sys(`Privilege escalation successful via ${via} — uid=0(root)`) ]
}

function handleCommand(state: PrivescState, input: string): LabLine[] {
  const lines: LabLine[] = []
  const raw = input.trim()

  // strip common stderr redirection and grep pipes for the supported commands
  const cleaned = raw.replace(/\s*2>\S+/g, '')
  const [head, ...pipeParts] = cleaned.split('|').map((part) => part.trim())
  const grepPattern = pipeParts.find((part) => part.startsWith('grep'))?.replace(/^grep\s+/, '').replace(/['"]/g, '')

  const tokens = head.split(/\s+/).filter(Boolean)
  const cmd = tokens[0]?.toLowerCase() ?? ''

  const run = (): LabLine[] => {
    switch (cmd) {
      case 'help':
        return [
          out('Lab commands: help, clear, exit'),
          out('whoami / id / uname -a / hostname'),
          out('ls -la <path>, cd <path>, cat <path>, pwd'),
          out('sudo -l                      list sudo permissions'),
          out('find / -perm -4000 2>/dev/null   locate SUID binaries'),
          out('cat /etc/crontab             review scheduled root jobs'),
          out('echo "<cmd>" >> /opt/scripts/nightly-backup.sh   modify a world-writable script'),
        ]
      case 'clear':
        state.history = []
        return []
      case 'exit':
        return [sys('Closing the low-privileged session. The host remains compromised for this lab run.')]
      case 'whoami':
        state.progress.enumerated = true
        return [out(state.user)]
      case 'id':
        state.progress.enumerated = true
        return [out(state.user === 'root' ? 'uid=0(root) gid=0(root) groups=0(root)' : 'uid=33(www-data) gid=33(www-data) groups=33(www-data)')]
      case 'hostname':
        return [out(HOST)]
      case 'uname':
        state.progress.enumerated = true
        return [out(`Linux ${HOST} 5.15.0-91-generic #101-Ubuntu SMP x86_64 GNU/Linux`)]
      case 'pwd':
        return [out(state.cwd)]
      case 'cd': {
        const target = normalizePath(state.cwd, tokens[1] ?? '/var/www')
        if (!state.fs[target] || state.fs[target].type !== 'd') return [err(`bash: cd: ${tokens[1]}: No such file or directory`)]
        if (!canRead(state, target)) return [err(`bash: cd: ${tokens[1]}: Permission denied`)]
        state.cwd = target
        return []
      }
      case 'ls': {
        const long = tokens.includes('-la') || tokens.includes('-l')
        const targetToken = tokens.find((token, index) => index > 0 && !token.startsWith('-'))
        const target = normalizePath(state.cwd, targetToken ?? state.cwd)
        if (!state.fs[target]) return [err(`ls: cannot access '${targetToken}': No such file or directory`)]
        if (!canRead(state, target)) return [err(`ls: cannot open directory '${targetToken}': Permission denied`)]
        return listDir(state, target, long)
      }
      case 'cat': {
        const target = normalizePath(state.cwd, tokens[1] ?? '')
        if (!tokens[1]) return [err('cat: missing operand')]
        const entry = state.fs[target]
        if (!entry || entry.type !== 'f') return [err(`cat: ${tokens[1]}: No such file or directory`)]
        if (!canRead(state, target)) return [err(`cat: ${tokens[1]}: Permission denied`)]
        if (target === '/etc/crontab') state.progress.cronFound = true
        if (target === '/etc/passwd') state.progress.enumerated = true
        if (target === '/root/flag.txt') {
          state.progress.flag = true
          return [ok(entry.content ?? '')]
        }
        return [out(entry.content ?? '')]
      }
      case 'crontab':
        if (tokens[1] === '-l') return [out(state.user === 'root' ? '* * * * * /opt/scripts/nightly-backup.sh' : `no crontab for ${state.user}`)]
        return [err('crontab: only -l is supported in this lab')]
      case 'sudo': {
        if (tokens[1] === '-l') {
          state.progress.sudoEnum = true
          return [
            out(`Matching Defaults entries for ${state.user} on ${HOST}:`),
            out('    env_reset, mail_badpass'),
            out(''),
            out(`User ${state.user} may run the following commands on ${HOST}:`),
            out('    (root) NOPASSWD: /usr/bin/tar'),
          ]
        }
        const sub = tokens.slice(1).join(' ')
        if (/^tar\b/.test(sub) && /--checkpoint-action=exec=(\/bin\/)?(ba)?sh/.test(sub)) {
          return elevate(state, 'sudo tar --checkpoint-action (GTFOBins)')
        }
        if (/^tar\b/.test(sub)) return [out('tar: Cowardly refusing to create an empty archive'), err('Try the classic GTFOBins checkpoint-action form.')]
        return [err(`Sorry, user www-data is not allowed to execute '${sub}' as root on ${HOST}.`)]
      }
      case 'find': {
        state.progress.enumerated = true
        const execIndex = tokens.indexOf('-exec')
        if (execIndex !== -1) {
          const execCmd = tokens.slice(execIndex + 1).join(' ')
          if (/\/(bin\/)?(ba)?sh\b/.test(execCmd)) {
            return elevate(state, 'SUID find -exec shell')
          }
          return [out('find: missing argument to `-exec`')]
        }
        if (/-perm\s+[-/]?4000|-perm\s+\/u=s/.test(head)) {
          state.progress.suidFound = true
          return [...suidBinaries.map(out), out('/usr/bin/find')]
        }
        const startToken = tokens[1] ?? '.'
        const start = normalizePath(state.cwd, startToken)
        return [out(start)]
      }
      case 'echo': {
        const match = raw.match(/^echo\s+([\s\S]+?)\s*(>>|>)\s*(\S+)$/)
        if (!match) return [out(tokens.slice(1).join(' '))]
        const text = match[1].replace(/^["']|["']$/g, '')
        const target = normalizePath(state.cwd, match[3])
        const entry = state.fs[target]
        if (!entry || entry.type !== 'f') return [err(`bash: ${match[3]}: No such file or directory`)]
        if (!canWrite(state, target)) return [err(`bash: ${match[3]}: Permission denied`)]
        entry.content = match[2] === '>>' ? `${entry.content ?? ''}\n${text}` : text
        if (target === '/opt/scripts/nightly-backup.sh') state.cronModified = true
        return []
      }
      case 'bash':
      case 'sh': {
        if (cmd === 'bash' && tokens.includes('-p') && state.bashSuid) {
          return elevate(state, 'SUID bash (bash -p)')
        }
        return [out(`${cmd}: a child shell opens with your current privileges (${state.user}).`)]
      }
      case 'linpeas':
      case './linpeas.sh':
      case './linpeas': {
        state.progress.enumerated = true
        state.progress.suidFound = true
        state.progress.sudoEnum = true
        state.progress.cronFound = true
        return [
          sys('==============================[ Interesting checks ]=============================='),
          ok('[+] sudo: www-data may run /usr/bin/tar as root (NOPASSWD) — check GTFOBins'),
          ok('[+] SUID: /usr/bin/find has the SUID bit set'),
          ok('[+] cron: root runs /opt/scripts/nightly-backup.sh every minute — file is world-writable (-rw-rw-rw-)'),
          out('[i] Any of these three paths yields root. Pick one and exploit it.'),
        ]
      }
      case 'chmod':
        if (state.user !== 'root') return [err(`chmod: changing permissions of '${tokens[2] ?? ''}': Operation not permitted`)]
        return []
      case 'su':
        return [err('su: Authentication failure')]
      default:
        return [err(`bash: ${cmd}: command not found`)]
    }
  }

  lines.push(...run())

  let filtered = lines
  if (grepPattern && cmd !== 'clear') {
    filtered = lines.filter((line) => line.text.toLowerCase().includes(grepPattern.toLowerCase()))
  }

  const cronLines = cmd === 'clear' ? [] : fireCronIfModified(state)
  return [...filtered, ...cronLines]
}

export const privescMachine: TerminalMachine<PrivescState> = {
  flag: FLAG,
  cookieName: 'privesc_session',
  submitGateError: 'Escalate to root and read /root/flag.txt before submitting.',

  createState(): PrivescState {
    return {
      history: [
        sys('Rivan Hacker Lab // Challenge 8 — Linux Privilege Escalation'),
        sys(`Foothold: low-privileged shell as www-data on ${HOST} (10.20.40.10)`),
        sys('Enumerate the host, find the privilege-escalation path, and read /root/flag.txt. Type help for tooling.'),
      ],
      submitted: false,
      cwd: '/var/www',
      user: 'www-data',
      fs: structuredClone(baseFs),
      cronModified: false,
      cronFired: false,
      bashSuid: false,
      progress: { enumerated: false, sudoEnum: false, suidFound: false, cronFound: false, escalated: false, flag: false },
    }
  },

  prompt(state: PrivescState): string {
    return state.user === 'root' ? rootPrompt(HOST, state.cwd) : userPrompt('www-data', HOST, state.cwd)
  },

  handle(state: PrivescState, input: string) {
    if (!input.trim()) return
    state.history.push(...handleCommand(state, input))
  },

  progress(state: PrivescState): Record<string, boolean> {
    return { ...state.progress }
  },

  canSubmit(state: PrivescState): boolean {
    return state.progress.flag
  },
}
