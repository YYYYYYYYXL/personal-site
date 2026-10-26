param(
    [ValidateSet('dev', 'preview')]
    [string]$Mode = 'dev'
)

$ErrorActionPreference = 'Stop'
$localNode = Join-Path $PSScriptRoot '.tools\node.exe'
$runtime = if (Test-Path -LiteralPath $localNode) { $localNode } else { (Get-Command node -ErrorAction Stop).Source }
$astroCli = Join-Path $PSScriptRoot 'node_modules\astro\bin\astro.mjs'
if (-not (Test-Path -LiteralPath $astroCli)) { throw '请先在 v2 目录执行 npm ci 安装依赖。' }
Push-Location $PSScriptRoot
try {
    & $runtime $astroCli $Mode --host 127.0.0.1 --port 4321
    if ($LASTEXITCODE -ne 0) { throw "Astro 预览退出，代码：$LASTEXITCODE" }
} finally {
    Pop-Location
}
