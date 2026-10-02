# Rivan Hacker Lab - end-to-end smoke test for all 9 challenges.
# Requires the app to be running on http://localhost:3000 (npm start or npm run dev).
$base = 'http://localhost:3000'
$flags = [ordered]@{
  hr = 'RIVAN{idor_broken_access_control}'
  portal = 'RIVAN{session_security_failure}'
  scanner = 'RIVAN{ssrf_internal_network}'
  aurora = 'RIVAN{sqli_union_extraction}'
  harborpoint = 'RIVAN{credential_attack_hydra}'
  nse = 'RIVAN{vsftpd_backdoor_6200}'
  smb = 'RIVAN{smb_guest_share_loot}'
  privesc = 'RIVAN{privesc_sudo_tar_root}'
  pivot = 'RIVAN{lateral_movement_pivot}'
}
$failed = 0
foreach ($ns in $flags.Keys) {
  try {
    $null = Invoke-RestMethod -Uri "$base/api/$ns/reset" -Method Post
    $null = Invoke-RestMethod -Uri "$base/api/$ns/api/progress" -Method Get
    $body = @{ flag = $flags[$ns] } | ConvertTo-Json
    $submit = Invoke-RestMethod -Uri "$base/api/$ns/submit" -Method Post -ContentType 'application/json' -Body $body
    if ($submit.accepted) {
      "{0,-12} PASS (flag accepted)" -f $ns
    } else {
      $failed++
      "{0,-12} FAIL (submit rejected: {1})" -f $ns, $submit.error
    }
  } catch {
    $failed++
    "{0,-12} FAIL ({1})" -f $ns, $_.Exception.Message
  }
}

# Behavior spot-checks
# 1. SQL injection boolean bypass returns all 8 products
try {
  $rows = Invoke-RestMethod -Uri "$base/api/aurora/api/products?category='%20OR%20'1'='1'%20--%20" -Method Get
  $count = @($rows.products).Count
  if ($count -ge 8) { "sqli-bypass  PASS ($count products returned)" } else { $failed++; "sqli-bypass  FAIL ($count products)" }
} catch { $failed++; "sqli-bypass  FAIL ($($_.Exception.Message))" }

# 2. SSRF reaches the internal flag store through the scanner
try {
  $scan = Invoke-RestMethod -Uri "$base/api/scanner/api/scan" -Method Post -ContentType 'application/json' -Body '{"url":"http://internal-admin.internal.lab/api/flag"}'
  $raw = $scan | ConvertTo-Json -Depth 6
  if ($raw -match 'ssrf_internal_network') { "ssrf-fetch   PASS (internal flag retrieved)" } else { $failed++; "ssrf-fetch   FAIL ($raw)" }
} catch { $failed++; "ssrf-fetch   FAIL ($($_.Exception.Message))" }

# 3. NSE terminal fingerprints vsftpd
try {
  $term = Invoke-RestMethod -Uri "$base/api/nse/terminal" -Method Post -ContentType 'application/json' -Body '{"command":"nmap -sC -sV 10.20.30.10"}'
  $raw = $term | ConvertTo-Json -Depth 6
  if ($raw -match 'vsftpd 2\.3\.4') { "nse-nmap     PASS (vsftpd 2.3.4 fingerprinted)" } else { $failed++; "nse-nmap     FAIL ($raw)" }
} catch { $failed++; "nse-nmap     FAIL ($($_.Exception.Message))" }

# 4. HR IDOR: login then cross-access employee 1002
try {
  $session = $null
  $login = Invoke-RestMethod -Uri "$base/api/hr/api/login" -Method Post -ContentType 'application/json' -Body '{"email":"analyst@northstar.internal","password":"northstar-analyst"}' -SessionVariable session
  $record = Invoke-RestMethod -Uri "$base/api/hr/api/employees/1002" -Method Get -WebSession $session
  $raw = $record | ConvertTo-Json -Depth 6
  if ($raw -match '1002') { "hr-idor      PASS (employee 1002 returned to analyst session)" } else { $failed++; "hr-idor      FAIL ($raw)" }
} catch { $failed++; "hr-idor      FAIL ($($_.Exception.Message))" }

# 5. Pivot terminal: foothold SSH requires the password flow
try {
  $term = Invoke-RestMethod -Uri "$base/api/pivot/terminal" -Method Post -ContentType 'application/json' -Body '{"command":"ssh webapp@10.20.10.15"}'
  $raw = $term | ConvertTo-Json -Depth 6
  if ($raw -match 'password|Password') { "pivot-ssh    PASS (password prompt issued)" } else { $failed++; "pivot-ssh    FAIL ($raw)" }
} catch { $failed++; "pivot-ssh    FAIL ($($_.Exception.Message))" }

# 6. SMB terminal: guest share listing
try {
  $term = Invoke-RestMethod -Uri "$base/api/smb/terminal" -Method Post -ContentType 'application/json' -Body '{"command":"smbclient -L //10.20.50.20 -N"}'
  $raw = $term | ConvertTo-Json -Depth 6
  if ($raw -match 'Backups') { "smb-shares   PASS (Backups share listed)" } else { $failed++; "smb-shares   FAIL ($raw)" }
} catch { $failed++; "smb-shares   FAIL ($($_.Exception.Message))" }

# 7. Privesc terminal: sudo -l shows tar
try {
  $term = Invoke-RestMethod -Uri "$base/api/privesc/terminal" -Method Post -ContentType 'application/json' -Body '{"command":"sudo -l"}'
  $raw = $term | ConvertTo-Json -Depth 6
  if ($raw -match 'tar') { "privesc-sudo PASS (sudo tar permitted)" } else { $failed++; "privesc-sudo FAIL ($raw)" }
} catch { $failed++; "privesc-sudo FAIL ($($_.Exception.Message))" }

# 8. Harborpoint: staff directory enumeration
try {
  $dir = Invoke-RestMethod -Uri "$base/api/harborpoint/api/directory" -Method Get
  $raw = $dir | ConvertTo-Json -Depth 6
  if ($raw -match 'mrivera') { "hp-directory PASS (mrivera enumerated)" } else { $failed++; "hp-directory FAIL ($raw)" }
} catch { $failed++; "hp-directory FAIL ($($_.Exception.Message))" }

# 9. Portal: recovery request accepted generically
try {
  $rec = Invoke-RestMethod -Uri "$base/api/portal/api/auth/recovery" -Method Post -ContentType 'application/json' -Body '{"email":"operations-admin@northstar.internal"}'
  $raw = $rec | ConvertTo-Json -Depth 6
  "portal-rec   INFO ($raw)"
} catch { "portal-rec   INFO ($($_.Exception.Message))" }

""
if ($failed -eq 0) { "ALL SMOKE TESTS PASSED" } else { "$failed TEST(S) FAILED"; exit 1 }
