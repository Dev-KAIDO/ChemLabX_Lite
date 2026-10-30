param(
    [int]$Port = 8765,
    [string]$Root = (Split-Path -Parent $PSScriptRoot)
)

$ErrorActionPreference = 'Stop'

$mime = @{
    '.html' = 'text/html'
    '.js' = 'text/javascript'
    '.css' = 'text/css'
    '.json' = 'application/json'
    '.webmanifest' = 'application/manifest+json'
    '.png' = 'image/png'
    '.jpg' = 'image/jpeg'
    '.jpeg' = 'image/jpeg'
    '.svg' = 'image/svg+xml'
    '.gif' = 'image/gif'
    '.ico' = 'image/x-icon'
    '.txt' = 'text/plain'
    '.woff' = 'font/woff'
    '.woff2' = 'font/woff2'
    '.ttf' = 'font/ttf'
    '.mp4' = 'video/mp4'
    '.mp3' = 'audio/mpeg'
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://127.0.0.1:$Port/")
$listener.Start()
Write-Host "SERVER_READY serving $Root on http://127.0.0.1:$Port/"

try {
    while ($listener.IsListening) {
        $res = $null
        try {
            $ctx = $listener.GetContext()
            $req = $ctx.Request
            $res = $ctx.Response
            $path = $req.Url.AbsolutePath.TrimStart('/').Replace('/', [System.IO.Path]::DirectorySeparatorChar)
            if ([string]::IsNullOrEmpty($path)) { $path = 'index.html' }
            $full = Join-Path $Root $path
            if (Test-Path -LiteralPath $full -PathType Leaf) {
                $bytes = [System.IO.File]::ReadAllBytes($full)
                $ext = [System.IO.Path]::GetExtension($full).ToLower()
                if ($mime.ContainsKey($ext)) { $res.ContentType = $mime[$ext] } else { $res.ContentType = 'application/octet-stream' }
                $res.StatusCode = 200
                $res.OutputStream.Write($bytes, 0, $bytes.Length)
            } else {
                $res.StatusCode = 404
                $res.ContentType = 'text/plain'
                $body = [System.Text.Encoding]::UTF8.GetBytes('Not found: ' + $path)
                $res.OutputStream.Write($body, 0, $body.Length)
            }
            $res.Close()
        } catch {
            ## A client (Chrome) may abort a request while the SW precaches or
            ## when a tab closes. One aborted request must never kill the server.
            if ($res) { try { $res.Abort() } catch { } }
        }
    }
} finally {
    $listener.Stop()
    $listener.Close()
}