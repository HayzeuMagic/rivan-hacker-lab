import { createInitialCredentialVaultState } from '@/simulator/challenges/credential-vault'
import { createTerminalLine, evaluateObjectives } from '@/simulator/core/objectives'
import type { CommandResult, SimHost, SimulatorState } from '@/types/simulator'

export const challengeCatalog = [
  {
    id: 'idor-broken-access-control',
    title: 'Broken Access Control / IDOR',
    difficulty: 'Medium',
    tags: ['HTTP', 'Authorization', 'IDOR'],
    status: 'Available',
    target: 'hr.internal.lab',
    service: 'Employee HR Portal',
  },
  {
    id: 'authentication-session-security',
    title: 'Authentication & Session Security',
    difficulty: 'Medium',
    tags: ['HTTP', 'Sessions', 'Recovery'],
    status: 'Available',
    target: 'portal.internal.lab',
    service: 'Operations Portal',
  },
  {
    id: 'ssrf-internal-service-discovery',
    title: 'SSRF & Internal Service Discovery',
    difficulty: 'Medium - Hard',
    tags: ['HTTP', 'SSRF', 'Network Discovery'],
    status: 'Available',
    target: 'scanner.internal.lab',
    service: 'URL Inspection Service',
  },
]

export function resetChallengeState(): SimulatorState {
  return createInitialCredentialVaultState()
}

export function getChallengeHostById(state: SimulatorState, hostId: string): SimHost | undefined {
  return state.hosts.find((host) => host.id === hostId)
}

export function getChallengeStateSnapshot(): SimulatorState {
  return resetChallengeState()
}

export function getTerminalPrompt(state: SimulatorState): string {
  const user = state.session.currentUser
  const privilegeMarker = state.session.privilegeLevel === 'administrator' ? '#' : '$'
  const windowsPath = state.session.currentPath
  const path = windowsPath === 'C:\\Users\\analyst'
    ? '~'
    : windowsPath.replace(/^C:\\Users\\analyst/, '/home/analyst').replace(/\\/g, '/')

  return `${user}@WS-07:${path}${privilegeMarker}`
}

export function parseChallengeCommand(state: SimulatorState, command: string): CommandResult {
  const trimmed = command.trim()
  const next = structuredClone(state)
  const output: string[] = []
  const lines = [...next.terminalHistory]

  const addLine = (text: string, kind: 'input' | 'output' | 'error' | 'success' | 'system' = 'output') => {
    lines.push({ ...createTerminalLine(text, kind), ...(kind === 'input' ? { prompt: getTerminalPrompt(next) } : {}) })
  }

  if (!trimmed) {
    addLine('No command entered.', 'error')
    next.terminalHistory = lines
    return { state: next, output: 'No command entered.', kind: 'error' }
  }

  addLine(trimmed, 'input')

  const parts = trimmed.split(/\s+/)
  const [cmd, ...args] = parts

  switch (cmd.toLowerCase()) {
    case 'help':
      output.push(
        'Available commands: help, whoami, hostname, pwd, ls, cd, cat, ps, users, services, credentials, netstat, auth, access, flag, reset',
      )
      addLine(output.join('\n'), 'system')
      break

    case 'whoami':
      addLine(`Current user: ${next.session.currentUser}`, 'success')
      if (next.session.currentUser === 'analyst') {
        addLine('Privilege: low', 'output')
      }
      break

    case 'hostname':
      addLine(`Hostname: ${getChallengeHostById(next, next.session.currentHostId)?.hostname ?? 'WS-07'}`, 'success')
      next.enumeration.hostname = true
      break

    case 'pwd':
      addLine(`Current path: ${next.session.currentPath}`, 'success')
      break

    case 'ls':
      const host = getChallengeHostById(next, next.session.currentHostId)
      const entries = Object.keys(host?.files ?? {})
        .filter((path) => path.startsWith('C:\\') || path.startsWith('\\\\10.10.20.20\\'))
        .slice(0, 10)
      addLine(entries.length ? entries.join('\n') : 'No accessible files', 'output')
      next.enumeration.directoryListing = true
      next.attackState.workstationEnumerated = true
      break

    case 'cd': {
      const target = args.join(' ')
      if (!target) {
        addLine('Usage: cd <path>', 'error')
        break
      }
      next.session.currentPath = target
      addLine(`Changed directory to ${target}`, 'success')
      break
    }

    case 'cat': {
      const target = args.join(' ')
      if (!target) {
        addLine('Usage: cat <path>', 'error')
        break
      }
      const currentHost = getChallengeHostById(next, next.session.currentHostId)
      const matchingPath = Object.keys(currentHost?.files ?? {}).find((path) => path.toLowerCase() === target.toLowerCase())
      const requestedFile = matchingPath ? currentHost?.files[matchingPath] : undefined

      if (requestedFile && !requestedFile.permissions.includes(next.session.currentUser)) {
        addLine(`Access denied: ${target}`, 'error')
        break
      }

      if (requestedFile && !target.toLowerCase().includes('auth.cache') && !target.toLowerCase().includes('service.conf')) {
        addLine(requestedFile.content ?? 'File content unavailable', 'success')
        break
      }
      if (target.includes('auth.cache')) {
        const file = currentHost?.files['C:\\ProgramData\\svc_backup\\auth.cache']
        if (file) {
          addLine(file.content ?? 'File content unavailable', 'success')
          next.attackState.credentialArtifactFound = true
          next.attackState.credentialAccountIdentified = true
          next.knownAccounts.push('svc_backup')
          next.objectives = evaluateObjectives(next.enumeration, next.attackState, next.flagRetrieved)
        } else {
          addLine('Access denied: file not found in current scope', 'error')
        }
        break
      }
      if (target.includes('service.conf')) {
        const file = currentHost?.files['C:\\ProgramData\\svc_backup\\service.conf']
        if (file) {
          addLine(file.content ?? 'File content unavailable', 'success')
          next.attackState.privilegedAccountIdentified = true
          next.objectives = evaluateObjectives(next.enumeration, next.attackState, next.flagRetrieved)
        } else {
          addLine('Access denied: file not found in current scope', 'error')
        }
        break
      }
      addLine(`Unable to read ${target} in simulated environment.`, 'error')
      break
    }

    case 'ps':
      addLine('PID  USER  COMMAND', 'system')
      addLine('684  svc_backup  BackupSync.exe --config C:\ProgramData\svc_backup\service.conf', 'output')
      addLine('1024  analyst  explorer.exe', 'output')
      next.enumeration.processes = true
      next.attackState.workstationEnumerated = true
      break

    case 'users':
      addLine('analyst', 'output')
      addLine('svc_backup', 'output')
      addLine('administrator', 'output')
      next.enumeration.users = true
      next.attackState.workstationEnumerated = true
      break

    case 'services':
      addLine('SERVICE NAME   ACCOUNT', 'system')
      addLine('BackupSync     svc_backup', 'output')
      addLine('WinRM          NETWORK SERVICE', 'output')
      next.enumeration.services = true
      next.attackState.workstationEnumerated = true
      break

    case 'credentials':
      addLine('No local credential store is exposed. Investigate filesystem artifacts.', 'error')
      break

    case 'netstat':
      addLine('TCP  10.10.10.25:445  10.10.20.20:445  SYN_SENT  SMB connection to File Server', 'output')
      addLine('UDP  10.10.10.25:53   10.10.10.1:53  ESTABLISHED  DNS resolver', 'output')
      next.enumeration.network = true
      next.attackState.workstationEnumerated = true
      break

    case 'auth': {
      const mode = args[0]
      const value = args[1]
      if (mode === '--hash' && value === 'SIM-NLTM-7F4A9C2D1E8B6A03') {
        next.session.currentUser = 'svc_backup'
        next.session.privilegeLevel = 'administrator'
        next.session.authenticationMethod = 'hash'
        next.attackState.credentialAnalyzed = true
        next.attackState.privilegedAuthenticationObtained = true
        next.attackState.credentialAccountIdentified = true
        next.attackState.privilegedAccountIdentified = true
        next.objectives = evaluateObjectives(next.enumeration, next.attackState, next.flagRetrieved)
        addLine('Authentication method: NTLM hash accepted in simulated environment.', 'success')
        addLine('Current user: svc_backup', 'success')
        addLine('Privilege level: administrator', 'success')
      } else {
        addLine('Access denied: hash rejected. No real credential verification occurs in this challenge.', 'error')
      }
      break
    }

    case 'access': {
      const target = args[0] || '10.10.20.20'
      if (next.session.currentUser !== 'svc_backup' || next.session.privilegeLevel !== 'administrator') {
        addLine('Access denied. Required privilege: FILESERVER_ADMIN', 'error')
        break
      }
      next.session.connectedHostIds = ['file-server']
      next.attackState.restrictedServerAccessed = true
      next.objectives = evaluateObjectives(next.enumeration, next.attackState, next.flagRetrieved)
      addLine('Authentication successful. Access granted.', 'success')
      addLine('Enumerating 10.10.20.20 shares...', 'system')
      addLine('/finance/', 'output')
      addLine('/hr/', 'output')
      addLine('/admin/', 'output')
      addLine('/mission/', 'output')
      break
    }

    case 'flag': {
      const canUnlock = next.attackState.workstationEnumerated &&
        next.attackState.credentialArtifactFound &&
        next.attackState.credentialAnalyzed &&
        next.attackState.privilegedAccountIdentified &&
        next.attackState.privilegedAuthenticationObtained &&
        next.attackState.restrictedServerAccessed

      if (!canUnlock) {
        addLine('Flag is not yet available. Continue the simulated attack chain.', 'error')
        break
      }
      next.flagRetrieved = true
      next.attackState.flagRetrieved = true
      next.objectives = evaluateObjectives(next.enumeration, next.attackState, next.flagRetrieved)
      addLine('FLAG{SECURITY_PLUS_CREDENTIAL_VAULT}', 'success')
      break
    }

    case 'reset':
      return { state: resetChallengeState(), output: 'Lab reset to initial state.', kind: 'success' }

    default:
      addLine(`Unknown command: ${cmd}. Type help for a list of commands.`, 'error')
      break
  }

  next.terminalHistory = lines
  next.objectives = evaluateObjectives(next.enumeration, next.attackState, next.flagRetrieved)

  return {
    state: next,
    output: output.join('\n') || 'Command processed.',
    kind: output.length ? 'success' : 'output',
  }
}
