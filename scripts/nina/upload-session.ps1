<#
  ScopeBnB - end-of-night uploader for N.I.N.A. (Windows PowerShell 5.1+)

  Runs on the imaging PC when a sequence finishes. It:
    1. Finds the N.I.N.A. .log of the session that actually captured lights
       (the newest .log that contains "Saved image to ...\LIGHT\...", NOT just
       the newest file - N.I.N.A. left idle writes a newer, empty log).
    2. Finds the PHD2 GuideLog whose guiding window overlaps that session
       (NOT just the newest - PHD2 left open can span several nights).
    3. POSTs both logs to the ScopeBnB ingest endpoint. The server parses them,
       picks the sharpest sub of the night (lowest HFR) and returns its absolute
       path (from the log) plus a signed upload URL.
    4. Reads that exact light FITS off disk and PUTs it to the signed URL.
    5. Calls /image to auto-stretch it into the report's preview.

  No plugin required. One report per night. Config (endpoint + secret) lives in
  config.json next to this script; CLI params override it.

  INSTALL: see README.md. Invoke via a N.I.N.A. end-of-sequence trigger:
    powershell.exe -ExecutionPolicy Bypass -File "C:\ScopeBnB\upload-session.ps1"
#>

param(
  [string]$Endpoint,
  [string]$Secret,
  [string]$LogsDir   = (Join-Path $env:LOCALAPPDATA "NINA\Logs"),
  [string]$Phd2Dir   = (Join-Path $env:USERPROFILE "Documents\PHD2"),
  [int]   $LookbackHours = 30
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# --- config.json (endpoint/secret) with CLI override ---------------------------
$cfgPath = Join-Path $ScriptDir "config.json"
if (Test-Path $cfgPath) {
  $cfg = Get-Content $cfgPath -Raw | ConvertFrom-Json
  if (-not $Endpoint -and $cfg.endpoint) { $Endpoint = $cfg.endpoint }
  if (-not $Secret   -and $cfg.secret)   { $Secret   = $cfg.secret }
}
if (-not $Endpoint) { throw "No endpoint (set it in config.json or -Endpoint)" }
if (-not $Secret)   { throw "No secret (set it in config.json or -Secret)" }

# --- logging to a rolling file next to the script ------------------------------
$logDir = Join-Path $ScriptDir "logs"
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$logFile = Join-Path $logDir ("upload-{0}.log" -f (Get-Date -Format "yyyyMMdd"))
function Log($m) {
  $line = "[{0}] {1}" -f (Get-Date -Format "HH:mm:ss"), $m
  Write-Host $line; Add-Content -Path $logFile -Value $line
}

# Read a possibly-open file with shared access (N.I.N.A./PHD2 keep them open).
function Read-Shared([string]$path) {
  try {
    $fs = [System.IO.File]::Open($path, "Open", "Read", "ReadWrite")
    $sr = New-Object System.IO.StreamReader($fs)
    $txt = $sr.ReadToEnd(); $sr.Close(); $fs.Close(); return $txt
  } catch {
    $tmp = Join-Path $env:TEMP ("scopebnb-" + [System.IO.Path]::GetFileName($path))
    Copy-Item $path $tmp -Force
    return [System.IO.File]::ReadAllText($tmp)
  }
}

try {
  [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

  # 1) Newest N.I.N.A. .log that actually SAVED lights this run --------------------
  $saveRe = 'Saved image to .*[\\/]LIGHT[\\/].*\.fits'
  $cutoff = (Get-Date).AddHours(-$LookbackHours)
  $logs = Get-ChildItem -Path $LogsDir -Filter *.log -ErrorAction SilentlyContinue |
    Where-Object { $_.LastWriteTime -gt $cutoff } | Sort-Object LastWriteTime -Descending
  $ninaLog = $null; $ninaText = $null
  foreach ($f in $logs) {
    $t = Read-Shared $f.FullName
    if ($t -match $saveRe) { $ninaLog = $f; $ninaText = $t; break }
  }
  if (-not $ninaLog) { throw "No N.I.N.A. log with LIGHT saves in the last $LookbackHours h under $LogsDir" }
  Log "N.I.N.A. log: $($ninaLog.Name)"

  # Session window = first/last LIGHT-save line timestamp (local time in the log).
  $stamps = @([regex]::Matches($ninaText, '(?m)^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})[^\r\n]*Saved image to .*[\\/]LIGHT[\\/]') |
    ForEach-Object { [datetime]::Parse($_.Groups[1].Value) })
  if ($stamps.Count -eq 0) { throw "Could not read LIGHT timestamps from the log" }
  $sorted = $stamps | Sort-Object
  $sessStart = $sorted[0]; $sessEnd = $sorted[-1]
  Log ("Session window: {0:HH:mm} -> {1:HH:mm} ({2} lights)" -f $sessStart, $sessEnd, $stamps.Count)

  # 2) PHD2 GuideLog whose guiding overlaps the session window --------------------
  $phd2Text = ""
  $winA = $sessStart.AddHours(-3); $winB = $sessEnd.AddHours(1)
  $phd2Files = Get-ChildItem -Path $Phd2Dir -Filter "PHD2_GuideLog_*.txt" -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending
  foreach ($p in $phd2Files) {
    $pt = Read-Shared $p.FullName
    $begins = @([regex]::Matches($pt, 'Guiding Begins at (\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})') |
      ForEach-Object { [datetime]::Parse($_.Groups[1].Value) })
    if ($begins | Where-Object { $_ -ge $winA -and $_ -le $winB }) {
      $phd2Text = $pt; Log "PHD2 guide log: $($p.Name)"; break
    }
  }
  if (-not $phd2Text) { Log "No PHD2 GuideLog overlaps the session; report will omit guiding." }

  # 3) POST the logs. Server derives the date, parses, narrates, and returns the
  #    best light's path + a signed upload URL. ----------------------------------
  $payload = @{ secret = $Secret; ninaLog = $ninaText; phd2Log = $phd2Text } | ConvertTo-Json -Compress -Depth 3
  Log ("Uploading logs ({0:N0} KB) to {1} ..." -f ($payload.Length / 1KB), $Endpoint)
  $resp = Invoke-RestMethod -Uri $Endpoint -Method Post -ContentType "application/json; charset=utf-8" -Body $payload -TimeoutSec 120
  Log ("Report {0} ({1}, {2} frames){3}" -f $resp.id, $resp.target, $resp.frames, $(if ($resp.narrated) { ", narrated" } else { "" }))
  Log ("Report URL: {0}{1}" -f ($Endpoint -replace "/api/sessions/ingest$", ""), $resp.url)

  # 4-5) Upload the server-chosen best light for the preview image ---------------
  if ($resp.uploadUrl -and $resp.lightPath) {
    if (Test-Path -LiteralPath $resp.lightPath) {
      $mb = (Get-Item -LiteralPath $resp.lightPath).Length / 1MB
      Log ("Best light (server pick): {0} ({1:N0} MB)" -f (Split-Path $resp.lightPath -Leaf), $mb)
      Invoke-RestMethod -Uri $resp.uploadUrl -Method Put -InFile $resp.lightPath `
        -ContentType "application/octet-stream" -TimeoutSec 600 | Out-Null
      $fin = @{ secret = $Secret; id = $resp.id } | ConvertTo-Json -Compress
      $img = Invoke-RestMethod -Uri ($Endpoint + "/image") -Method Post `
        -ContentType "application/json; charset=utf-8" -Body $fin -TimeoutSec 180
      Log ("Preview image ready: {0}" -f $img.src)
    } else {
      Log "Server light path not found on disk: $($resp.lightPath) (keeping field preview)."
    }
  } else {
    Log "No light path returned; keeping field preview."
  }
  Log "Done."
}
catch {
  Log "UPLOAD FAILED: $($_.Exception.Message)"
  exit 1
}
