import type { SimHost, SimulatorState } from '@/types/simulator'
import { createTerminalLine } from '@/simulator/core/objectives'

const simulatedHash = 'SIM-NLTM-7F4A9C2D1E8B6A03'

function file(
  path: string,
  name: string,
  content: string,
  permissions: string[],
  owner: string,
  hidden = false,
) {
  return { path, name, content, permissions, owner, hidden }
}

export function createCredentialVaultHosts(): SimHost[] {
  const workstationFiles: SimHost['files'] = {
    'C:\\Users\\analyst\\desktop-notes.txt': file(
      'C:\\Users\\analyst\\desktop-notes.txt',
      'desktop-notes.txt',
      'Shift note: BackupSync is healthy. Its service configuration and cache live under ProgramData\\svc_backup.',
      ['analyst'],
      'analyst',
    ),
    'C:\\ProgramData\\svc_backup\\service.conf': file(
      'C:\\ProgramData\\svc_backup\\service.conf',
      'service.conf',
      'service=BackupSync\naccount=svc_backup\ncache=C:\\ProgramData\\svc_backup\\auth.cache\nschedule=02:00 UTC',
      ['analyst', 'svc_backup'],
      'svc_backup',
    ),
    'C:\\ProgramData\\svc_backup\\auth.cache': file(
      'C:\\ProgramData\\svc_backup\\auth.cache',
      'auth.cache',
      `SIMULATED CREDENTIAL ARTIFACT\nAccount: svc_backup\nType: NTLM Hash\nValue: ${simulatedHash}\nSource: auth.cache\nStatus: Recovered`,
      ['analyst', 'svc_backup'],
      'svc_backup',
    ),
    'C:\\ProgramData\\svc_backup\\service.key': file(
      'C:\\ProgramData\\svc_backup\\service.key',
      'service.key',
      'SIMULATED KEY MATERIAL\nThis file is intentionally inaccessible to the low-privilege session.',
      ['svc_backup', 'administrator'],
      'svc_backup',
    ),
    'C:\\ProgramData\\logs\\backup-sync.log': file(
      'C:\\ProgramData\\logs\\backup-sync.log',
      'backup-sync.log',
      'BackupSync started as svc_backup. Authentication cache refreshed. Target: \\\\10.10.20.20\\finance.',
      ['analyst', 'svc_backup'],
      'svc_backup',
    ),
    'C:\\Windows\\System32\\config\\SAM': file(
      'C:\\Windows\\System32\\config\\SAM',
      'SAM',
      'SIMULATED OS SECURITY DATABASE\nAccess is denied in this training environment.',
      ['administrator'],
      'administrator',
    ),
  }

  const serverFiles: SimHost['files'] = {
    '\\\\10.10.20.20\\finance': file('\\\\10.10.20.20\\finance', 'finance', 'Restricted share: quarterly forecast drafts.', ['svc_backup', 'administrator'], 'administrator'),
    '\\\\10.10.20.20\\hr': file('\\\\10.10.20.20\\hr', 'hr', 'Restricted share: training records.', ['svc_backup', 'administrator'], 'administrator'),
    '\\\\10.10.20.20\\admin': file('\\\\10.10.20.20\\admin', 'admin', 'Restricted share: administrative exports.', ['administrator'], 'administrator'),
    '\\\\10.10.20.20\\mission\\flag.txt': file('\\\\10.10.20.20\\mission\\flag.txt', 'flag.txt', 'FLAG{SECURITY_PLUS_CREDENTIAL_VAULT}', ['svc_backup', 'administrator'], 'administrator'),
  }

  return [
    {
      id: 'ws-07',
      hostname: 'WS-07',
      ip: '10.10.10.25',
      os: 'Windows 11 Enterprise (simulated)',
      users: ['analyst', 'svc_backup', 'administrator'],
      files: workstationFiles,
      processes: [
        { pid: 684, name: 'BackupSync.exe', user: 'svc_backup', commandLine: 'C:\\ProgramData\\svc_backup\\BackupSync.exe --config C:\\ProgramData\\svc_backup\\service.conf' },
        { pid: 1024, name: 'explorer.exe', user: 'analyst', commandLine: 'C:\\Windows\\explorer.exe' },
        { pid: 412, name: 'OneDrive.exe', user: 'analyst', commandLine: 'C:\\Program Files\\OneDrive\\OneDrive.exe' },
      ],
      services: [
        { name: 'BackupSync', displayName: 'BackupSync Service', account: 'svc_backup', status: 'Running', configPath: 'C:\\ProgramData\\svc_backup\\service.conf' },
        { name: 'WinRM', displayName: 'Windows Remote Management', account: 'NETWORK SERVICE', status: 'Stopped', configPath: 'C:\\Windows\\System32\\winrm.cmd' },
      ],
      scheduledTasks: [
        { name: 'NightlyBackup', account: 'svc_backup', schedule: 'Daily 02:00', action: 'C:\\ProgramData\\svc_backup\\BackupSync.exe' },
      ],
      networkConnections: [
        { localAddress: '10.10.10.25', remoteAddress: '10.10.20.20', port: 445, state: 'SYN_SENT', description: 'SMB connection to File Server (low-privilege session)' },
        { localAddress: '10.10.10.25', remoteAddress: '10.10.10.1', port: 53, state: 'ESTABLISHED', description: 'DNS resolver' },
      ],
      securityControls: [
        { name: 'Windows Defender', status: 'Active', detail: 'Simulated endpoint control' },
        { name: 'Network segmentation', status: 'Enforced', detail: 'WS-07 can reach only approved internal services' },
      ],
    },
    {
      id: 'file-server',
      hostname: 'File Server',
      ip: '10.10.20.20',
      os: 'Windows Server 2022 (simulated)',
      users: ['svc_backup', 'administrator'],
      files: serverFiles,
      processes: [],
      services: [
        { name: 'LanmanServer', displayName: 'Server SMB Service', account: 'SYSTEM', status: 'Running', configPath: 'C:\\Windows\\System32\\svchost.exe' },
      ],
      scheduledTasks: [],
      networkConnections: [],
      securityControls: [
        { name: 'SMB share ACLs', status: 'Enforced', detail: 'FILESERVER_ADMIN required for restricted shares' },
      ],
    },
  ]
}

export function createInitialCredentialVaultState(): SimulatorState {
  const hosts = createCredentialVaultHosts()
  return {
    challengeId: 'credential-vault',
    users: [
      { id: 'analyst', username: 'analyst', role: 'employee', privileges: ['WORKSTATION_USER'] },
      { id: 'svc_backup', username: 'svc_backup', role: 'service account', privileges: ['FILESERVER_ADMIN'] },
      { id: 'administrator', username: 'administrator', role: 'local administrator', privileges: ['LOCAL_ADMIN'] },
    ],
    credentials: [
      {
        id: 'svc-backup-hash',
        username: 'svc_backup',
        type: 'hash',
        value: simulatedHash,
        source: 'C:\\ProgramData\\svc_backup\\auth.cache',
        compromised: false,
      },
    ],
    hosts,
    session: {
      currentUser: 'analyst',
      currentHostId: 'ws-07',
      currentPath: 'C:\\Users\\analyst',
      privilegeLevel: 'low',
      authenticationMethod: 'none',
      connectedHostIds: [],
    },
    enumeration: {
      whoami: false,
      hostname: false,
      directoryListing: false,
      users: false,
      services: false,
      processes: false,
      network: false,
    },
    attackState: {
      workstationEnumerated: false,
      credentialArtifactFound: false,
      credentialAnalyzed: false,
      privilegedAccountIdentified: false,
      credentialAccountIdentified: false,
      privilegedAuthenticationObtained: false,
      restrictedServerAccessed: false,
      flagRetrieved: false,
    },
    objectives: [],
    terminalHistory: [
      createTerminalLine('Rivan Cybersecurity Institute // simulated environment', 'system'),
      createTerminalLine('You are connected to WS-07 as analyst. All activity is simulated in the browser.', 'system'),
      createTerminalLine('Type help to see the available commands.', 'system'),
    ],
    discoveredPaths: ['C:\\Users\\analyst'],
    knownAccounts: ['analyst'],
    hintsUsed: 0,
    flagRetrieved: false,
  }
}
