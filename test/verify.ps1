## ChemLabX TASK-003 verification driver
## Runs Chrome headless against http://127.0.0.1:8765 to verify A-I.
param(
    [string]$Chrome = 'C:\Program Files\Google\Chrome\Application\chrome.exe',
    [int]$Port = 8765,
    [string]$WorkDir = 'C:\Users\LENOVO\AppData\Local\Temp\opencode\chemlabx-verify'
)

$ErrorActionPreference = 'Stop'
$serverScript = Join-Path $PSScriptRoot 'server.ps1'
$root = Split-Path -Parent $PSScriptRoot

if (-not (Test-Path -LiteralPath $Chrome)) { throw "Chrome not found at $Chrome" }
New-Item -ItemType Directory -Force -Path $WorkDir | Out-Null

$onlineProfile = Join-Path $WorkDir 'profile-online'
$offlineProfile = Join-Path $WorkDir 'profile-offline'

## Fresh online profile each run (avoids stale SW cache from a prior run serving
## an outdated harness.html/page during the "fresh" online phase).
if (Test-Path -LiteralPath $onlineProfile -PathType Container) { Remove-Item -LiteralPath $onlineProfile -Recurse -Force }

function Start-Server {
    $job = Start-Job -ArgumentList $Port, $root, $serverScript -ScriptBlock {
        param($p, $r, $s)
        & $s -Port $p -Root $r
    }
    $deadline = (Get-Date).AddSeconds(20)
    $ok = $false
    while ((Get-Date) -lt $deadline) {
        Start-Sleep -Milliseconds 300
        try {
            $resp = Invoke-WebRequest -Uri "http://127.0.0.1:$Port/index.html" -UseBasicParsing -TimeoutSec 3
            if ($resp.StatusCode -eq 200) { $ok = $true; break }
        } catch { }
    }
    if (-not $ok) {
        Stop-Job $job -ErrorAction SilentlyContinue
        Receive-Job $job -ErrorAction SilentlyContinue | Out-String | Write-Host
        Remove-Job $job -ErrorAction SilentlyContinue
        throw 'HTTP server failed to start'
    }
    return $job
}

function Invoke-ChromeDump {
    param([string]$Url, [string]$Profile, [string]$OutFile, [string]$ErrFile)
    $argsLine = '--headless=new --disable-gpu --no-first-run --disable-extensions ' +
        "--user-data-dir=`"$Profile`" --virtual-time-budget=60000 --dump-dom --enable-logging=stderr `"$Url`""
    $pinfo = New-Object System.Diagnostics.ProcessStartInfo
    $pinfo.FileName = $Chrome
    $pinfo.Arguments = $argsLine
    $pinfo.UseShellExecute = $false
    $pinfo.RedirectStandardOutput = $true
    $pinfo.RedirectStandardError = $true
    $proc = [System.Diagnostics.Process]::Start($pinfo)
    $stdout = $proc.StandardOutput.ReadToEnd()
    $stderr = $proc.StandardError.ReadToEnd()
    $proc.WaitForExit(120000)
    Set-Content -LiteralPath $OutFile -Value $stdout -Encoding UTF8
    Set-Content -LiteralPath $ErrFile -Value $stderr -Encoding UTF8
    return $proc.ExitCode
}

function Test-ResultLine {
    param([string]$DumpPath, [string]$Label)
    $html = Get-Content -LiteralPath $DumpPath -Raw
    $m = [regex]::Match($html, 'SUMMARY:</b> (\d+) PASS / (\d+) FAIL')
    $pass = 0; $fail = 0
    if ($m.Success) { $pass = [int]$m.Groups[1].Value; $fail = [int]$m.Groups[2].Value }
    $doneFlag = $html -match 'HARNESS_DONE'
    Write-Host "[$Label] PASS=$pass FAIL=$fail completed=$doneFlag"
    if ($fail -gt 0) {
        [regex]::Matches($html, '<div class="test fail">.*?(?=</div>\s*<div class="test|\s*<div id="summary")') | ForEach-Object {
            $clean = ($_.Value -replace '<[^>]*>', ' ' -replace '\s+', ' ')
            Write-Host "  FAIL: $clean"
        }
    }
}

$serverJob = Start-Server

## ---------- ONLINE PHASE (fresh profile A) ----------
$pages = @('index.html','login.html','register.html','dashboard.html','lab.html','experiments.html','lessons.html','quiz.html','profile.html','admin.html')

Write-Host ''
Write-Host '=== ONLINE: harness (fresh profile) ==='
Invoke-ChromeDump -Url "http://127.0.0.1:$Port/test/harness.html" -Profile $onlineProfile -OutFile (Join-Path $WorkDir 'harness_online.html') -ErrFile (Join-Path $WorkDir 'harness_online.err')
Test-ResultLine -DumpPath (Join-Path $WorkDir 'harness_online.html') -Label 'harness online'
$err = Get-Content -LiteralPath (Join-Path $WorkDir 'harness_online.err') -Raw
if ($err -match 'Uncaught|SyntaxError|ReferenceError|TypeError|is not defined|Failed to load resource') {
    Write-Host "  [harness online runtime errors found]"
    [regex]::Matches($err, '.{0,80}(Uncaught|SyntaxError|ReferenceError|TypeError|is not defined|Failed to load resource).{0,120}') | ForEach-Object { Write-Host "   $($_.Value)" }
} else {
    Write-Host '  [harness online: no runtime errors in stderr]'
}

## ---------- ONLINE: load every page (also installs + caches SW) ----------
$pageErrors = @()
foreach ($p in $pages) {
    $out = Join-Path $WorkDir "page_$($p -replace '\.html$','').html"
    $er = Join-Path $WorkDir "page_$($p -replace '\.html$','').err"
    [void](Invoke-ChromeDump -Url "http://127.0.0.1:$Port/$p" -Profile $onlineProfile -OutFile $out -ErrFile $er)
    $dom = Get-Content -LiteralPath $out -Raw
    $standardErr = Get-Content -LiteralPath $er -Raw
    $hasContent = $dom.Length -gt 300
    $jsErrors = $standardErr -match 'Uncaught|SyntaxError|ReferenceError|TypeError|is not defined'
    $legacy = $dom -match 'js/app\.js|js/data\.js|js/quiz\.js|css/style\.css'
    $status = "OK"
    if (-not $hasContent) { $status = 'EMPTY DOM' }
    if ($jsErrors) { $status = 'JS ERROR' }
    if ($legacy) { $status = 'LEGACY REF' }
    $pageErrors += [pscustomobject]@{ Page = $p; Status = $status }
    Write-Host "  [$p] -> $status (dom=$($dom.Length) bytes)"
}

## ---------- OFFLINE PHASE (same profile used above, server now KILLED) ----------
Stop-Job $serverJob -ErrorAction SilentlyContinue
Remove-Job $serverJob -ErrorAction SilentlyContinue
Start-Sleep -Seconds 1

Write-Host ''
Write-Host '=== OFFLINE COLD-START (server killed; same profile => SW cache) ==='
if (Test-Path -LiteralPath $offlineProfile -PathType Container) { Remove-Item -LiteralPath $offlineProfile -Recurse -Force }
Invoke-ChromeDump -Url "http://127.0.0.1:$Port/index.html" -Profile $offlineProfile -OutFile (Join-Path $WorkDir 'offline_index_1.html') -ErrFile (Join-Path $WorkDir 'offline_index_1.err')

## Run 1 (server ON) to install+cache, then kill, then Run 2 (same profile, server OFF).
$serverJob2 = Start-Server
Invoke-ChromeDump -Url "http://127.0.0.1:$Port/index.html" -Profile $offlineProfile -OutFile (Join-Path $WorkDir 'offline_index_run1.html') -ErrFile (Join-Path $WorkDir 'offline_index_run1.err')
Invoke-ChromeDump -Url "http://127.0.0.1:$Port/test/harness.html" -Profile $offlineProfile -OutFile (Join-Path $WorkDir 'offline_harness_run1.html') -ErrFile (Join-Path $WorkDir 'offline_harness_run1.err')
Test-ResultLine -DumpPath (Join-Path $WorkDir 'offline_harness_run1.html') -Label 'offline-profile harness preload (online)'
Write-Host '  [run1: index + harness loaded online; SW installing + caching]'
Stop-Job $serverJob2 -ErrorAction SilentlyContinue
Remove-Job $serverJob2 -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

Invoke-ChromeDump -Url "http://127.0.0.1:$Port/index.html" -Profile $offlineProfile -OutFile (Join-Path $WorkDir 'offline_index_run2.html') -ErrFile (Join-Path $WorkDir 'offline_index_run2.err')
$offlineDom = Get-Content -LiteralPath (Join-Path $WorkDir 'offline_index_run2.html') -Raw
if ($offlineDom -match 'hero-title|معمل كيمياء افتراضي') {
    Write-Host '  [run2 offline index: PASS — landing page served from SW cache]'
} else {
    Write-Host '  [run2 offline index: FAIL — page NOT served from cache]'
}

## Offline harness re-run on the (cached) profile-fresh path: restart-safe migration + idempotency.
Invoke-ChromeDump -Url "http://127.0.0.1:$Port/test/harness.html" -Profile $offlineProfile -OutFile (Join-Path $WorkDir 'harness_offline1.html') -ErrFile (Join-Path $WorkDir 'harness_offline1.err')
Test-ResultLine -DumpPath (Join-Path $WorkDir 'harness_offline1.html') -Label 'harness offline run1 (migration should run)'

Invoke-ChromeDump -Url "http://127.0.0.1:$Port/test/harness.html" -Profile $offlineProfile -OutFile (Join-Path $WorkDir 'harness_offline2.html') -ErrFile (Join-Path $WorkDir 'harness_offline2.err')
Test-ResultLine -DumpPath (Join-Path $WorkDir 'harness_offline2.html') -Label 'harness offline run2 (migration should REUSE)'

Write-Host ''
Write-Host '=== PAGE LOAD SUMMARY ==='
$pageErrors | Format-Table -AutoSize | Out-String | Write-Host
Write-Host '=== VERIFICATION COMPLETE ==='
Write-Host "Artifacts: $WorkDir"