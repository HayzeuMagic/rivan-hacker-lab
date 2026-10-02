import { err, kaliPrompt, ok, out, sys, type LabLine, type TerminalMachine, type TerminalState } from '@/lib/lab/terminal'

const FLAG = 'RIVAN{smb_guest_share_loot}'
const TARGET = '10.20.50.20'
const CRED_USER = 'bsmith'
const CRED_PASS = 'BSM-2024-Backup!'

interface SmbProgress {
  scanned: boolean
  shares: boolean
  guest: boolean
  creds: boolean
  restricted: boolean
  flag: boolean
}

interface SmbState extends TerminalState {
  context: 'kali' | 'smb'
  share: string | null
  progress: SmbProgress
}

const shareFiles: Record<string, Record<string, string>> = {
  PUBLIC: {
    'readme.txt': 'Field shares are migrating to the new DFS namespace. Backups is kept online for the IT archive job.\n— filesrv admin',
  },
  Backups: {
    'it-ops-notes.txt': 'Archive job runs nightly from FILESRV.\nIf the Dept-IT share denies access, use the service operator account documented by B. Smith.',
    'svc-accounts.txt': `FILESRV service account handover\n--------------------------------\naccount : ${CRED_USER}\npassword: ${CRED_PASS}\nscope   : Dept-IT share (read/write)\nrotate  : pending — do not distribute`,
  },
  'Dept-IT': {
    'asset-register.csv': 'asset,owner,serial\nFILESRV,IT,SN-88412\nWS-FIN-03,Finance,SN-90210',
    'flag.txt': FLAG,
  },
}

function nmapOutput(): LabLine[] {
  return [
    out('Starting Nmap 7.94SVN ( https://nmap.org )'),
    out(`Nmap scan report for FILESRV.internal.lab (${TARGET})`),
    out('Host is up (0.0024s latency).'),
    out('Not shown: 995 filtered tcp ports (no-response)'),
    out('PORT     STATE SERVICE      VERSION'),
    out('135/tcp  open  msrpc        Microsoft Windows RPC'),
    out('139/tcp  open  netbios-ssn  Microsoft Windows netbios-ssn'),
    out('445/tcp  open  microsoft-ds Microsoft Windows Server 2022 microsoft-ds'),
    out('3389/tcp open  ms-wbt-server Microsoft Terminal Services'),
    out('Service Info: OS: Windows Server 2022; CPE: cpe:/o:microsoft:windows_server_2022'),
    out(''),
    out('Nmap done: 1 IP address (1 host up) scanned in 14.52 seconds'),
  ]
}

function shareListing(): LabLine[] {
  return [
    out(''),
    out('\tSharename       Type      Comment'),
    out('\t---------       ----      -------'),
    out('\tADMIN$          Disk      Remote Admin'),
    out('\tBackups         Disk      IT archive job share'),
    out('\tC$              Disk      Default share'),
    out('\tDept-IT         Disk      Department IT restricted'),
    out('\tIPC$            IPC       Remote IPC'),
    out('\tprint$          Disk      Printer Drivers'),
    out('\tPUBLIC          Disk      General field documents'),
    out(''),
  ]
}

function enum4linuxOutput(): LabLine[] {
  return [
    out('Starting enum4linux v0.9.1 ( http://labs.portcullis.co.uk/application/enum4linux/ )'),
    out(` =========================== |    Target Information    | ===========================`),
    out(`Target ........... ${TARGET}`),
    out(''),
    out(' =================================== |    Users    | ==================================='),
    out(''),
    out('index: 0x1 RID: 0x1f4 acb: 0x00000010 Account: Administrator\tName: (null)\tDesc: Built-in administrator'),
    out('index: 0x2 RID: 0x1f5 acb: 0x00000214 Account: Guest\tName: (null)\tDesc: Built-in guest account'),
    out('index: 0x3 RID: 0x1f6 acb: 0x00000010 Account: krbtgt\tName: (null)\tDesc: Key Distribution Center'),
    out('index: 0x4 RID: 0x451 acb: 0x00000010 Account: bsmith\tName: Ben Smith\tDesc: IT operations'),
    out(''),
    out(' ================================== |    Share Enumeration    | =================================='),
    ...shareListing(),
    out('[+] Attempting to map shares on ' + TARGET),
    out(`//${TARGET}/Backups\tMapping: OK Listing: OK`),
    out(`//${TARGET}/PUBLIC\tMapping: OK Listing: OK`),
    out(`//${TARGET}/Dept-IT\tMapping: DENIED Listing: N/A`),
    out(''),
    out('enum4linux complete on ' + TARGET),
  ]
}

function openShare(state: SmbState, share: string, auth: 'guest' | 'user', user?: string, pass?: string): LabLine[] {
  const segments = share.replace(/^\/+/, '').split('/')
  // Accept both //HOST/Share UNC paths and bare share names.
  const name = segments.length > 1 ? segments[1] : segments[0]
  if (!(name in shareFiles)) {
    return [err(`tree connect failed: NT_STATUS_BAD_NETWORK_NAME`)]
  }
  if (name === 'Dept-IT') {
    if (auth !== 'user') return [err('tree connect failed: NT_STATUS_ACCESS_DENIED')]
    if (user !== CRED_USER || pass !== CRED_PASS) return [err('session setup failed: NT_STATUS_LOGON_FAILURE')]
    state.progress.restricted = true
  } else {
    state.progress.guest = true
  }
  state.context = 'smb'
  state.share = name
  return [sys(`Connected to \\\\${TARGET}\\${name}${auth === 'user' ? ` as ${user}` : ' (guest)'} — type ls, get <file>, exit`)]
}

function handleSmbCommand(state: SmbState, input: string): LabLine[] {
  const tokens = input.trim().split(/\s+/).filter(Boolean)
  const cmd = tokens[0]?.toLowerCase() ?? ''
  const files = state.share ? shareFiles[state.share] : {}

  switch (cmd) {
    case 'ls':
    case 'dir': {
      const names = Object.keys(files)
      return names.length
        ? names.map((name) => out(`  ${name.padEnd(28)} A    ${files[name].length}  Tue Oct  1 09:14:22 2026`))
        : [out('  .                                   D        0  Tue Oct  1 09:14:22 2026')]
    }
    case 'get':
    case 'type':
    case 'cat': {
      const name = tokens[1] ?? ''
      const content = files[name]
      if (!content) return [err(`NT_STATUS_OBJECT_NAME_NOT_FOUND opening remote file \\${name}`)]
      if (cmd === 'get') {
        const lines = [out(`getting file \\${name} of size ${content.length} as ${name} (${(content.length / 96.4).toFixed(1)} KiloBytes/sec)`)]
        lines.push(sys(`— file content —\n${content}`))
        if (name === 'svc-accounts.txt') state.progress.creds = true
        if (state.share === 'Dept-IT' && name === 'flag.txt') state.progress.flag = true
        return lines
      }
      if (name === 'svc-accounts.txt') state.progress.creds = true
      if (state.share === 'Dept-IT' && name === 'flag.txt') {
        state.progress.flag = true
        return [ok(content)]
      }
      return [out(content)]
    }
    case 'exit':
    case 'quit':
      state.context = 'kali'
      state.share = null
      return [sys('SMB session closed.')]
    default:
      return [err(`smb: ${cmd}: command not supported — use ls, get <file>, exit`)]
  }
}

function handleKaliCommand(state: SmbState, input: string): LabLine[] {
  const tokens = input.trim().split(/\s+/).filter(Boolean)
  const cmd = tokens[0]?.toLowerCase() ?? ''

  switch (cmd) {
    case 'help':
      return [
        out('Lab commands: help, clear, exit'),
        out(`nmap -sV ${TARGET}                         identify the Windows services`),
        out(`smbclient -L //${TARGET} -N                list shares anonymously`),
        out(`enum4linux -a ${TARGET}                    full Windows enumeration`),
        out(`smbclient //${TARGET}/Backups -N           open the archive share as guest`),
        out(`smbclient //${TARGET}/Dept-IT -U <user>%<pass>  open the restricted share`),
      ]
    case 'clear':
      state.history = []
      return []
    case 'exit':
      return [sys('Leave the engagement by closing the terminal tab. Target remains online.')]
    case 'nmap': {
      const host = tokens.find((token, index) => index > 0 && !token.startsWith('-'))
      if (host && host !== TARGET && !host.includes('filesrv')) return [err(`Failed to resolve "${host}" — only ${TARGET} is in lab scope.`)]
      state.progress.scanned = true
      return nmapOutput()
    }
    case 'enum4linux':
    case 'enum4linux-ng': {
      state.progress.shares = true
      return enum4linuxOutput()
    }
    case 'smbclient': {
      const listMode = tokens.includes('-L')
      const uIndex = tokens.findIndex((token) => token === '-U' || token.startsWith('-U'))
      const unc = tokens.find((token) => token.startsWith('//'))
      if (listMode) {
        state.progress.shares = true
        return shareListing()
      }
      if (!unc) return [err('Usage: smbclient //<host>/<share> [-N] [-U user%pass]')]
      // Support both detached (-U user%pass) and attached (-Uuser%pass) forms.
      const userToken = uIndex !== -1 ? (tokens[uIndex] === '-U' ? tokens[uIndex + 1] : tokens[uIndex].slice(2)) : undefined
      const [authUser, authPass] = userToken ? userToken.split('%') : []
      return openShare(state, unc.split('@').pop() ?? unc, userToken ? 'user' : 'guest', authUser, authPass)
    }
    case 'netexec':
    case 'nxc':
    case 'crackmapexec': {
      state.progress.shares = true
      return [
        out(`SMB         ${TARGET}       445    FILESRV          [*] Windows Server 2022 Build 20348 x64 (name:FILESRV) (domain:internal.lab)`),
        out(`SMB         ${TARGET}       445    FILESRV          [+] internal.lab\\guest: (Guest)`),
        out(`SMB         ${TARGET}       445    FILESRV          [*] Shares: ADMIN$, Backups (READ), C$, Dept-IT, IPC$, print$, PUBLIC (READ)`),
      ]
    }
    default:
      return [err(`bash: ${cmd}: command not found — type help for lab commands`)]
  }
}

export const smbMachine: TerminalMachine<SmbState> = {
  flag: FLAG,
  cookieName: 'smb_session',
  submitGateError: 'Retrieve flag.txt from the restricted Dept-IT share before submitting.',

  createState(): SmbState {
    return {
      history: [
        sys('Rivan Hacker Lab // Challenge 7 — SMB / Windows Network Attack'),
        sys(`Target: ${TARGET} (FILESRV.internal.lab) — authorized scope: this host only`),
        sys('Enumerate the Windows services and find what the shares expose. Type help for tooling.'),
      ],
      submitted: false,
      context: 'kali',
      share: null,
      progress: { scanned: false, shares: false, guest: false, creds: false, restricted: false, flag: false },
    }
  },

  prompt(state: SmbState): string {
    if (state.context === 'smb') return 'smb: \\>'
    return kaliPrompt()
  },

  handle(state: SmbState, input: string) {
    if (!input.trim()) return
    if (state.context === 'smb') {
      state.history.push(...handleSmbCommand(state, input))
      return
    }
    state.history.push(...handleKaliCommand(state, input))
  },

  progress(state: SmbState): Record<string, boolean> {
    return { ...state.progress }
  },

  canSubmit(state: SmbState): boolean {
    return state.progress.flag
  },
}
