$ErrorActionPreference = 'Stop'
Set-Location (Split-Path -Parent $PSScriptRoot)

function Refresh-Path {
  $machine = [Environment]::GetEnvironmentVariable('Path', 'Machine')
  $user = [Environment]::GetEnvironmentVariable('Path', 'User')
  $env:Path = "$machine;$user;$env:Path"
}

function Test-Node {
  $command = Get-Command node -ErrorAction SilentlyContinue
  if (-not $command -or -not (Get-Command npm.cmd -ErrorAction SilentlyContinue)) { return $false }
  $version = (& node -p 'Number(process.versions.node.split(".")[0])' 2>$null)
  return [int]$version -ge 24
}

if (-not (Test-Node)) {
  if (-not (Get-Command winget -ErrorAction SilentlyContinue)) { throw '缺少 Windows 包管理器 WinGet；请先从 Microsoft Store 安装 App Installer，再运行此脚本。' }
  Write-Host '正在安装 Node.js LTS；系统可能要求管理员确认。'
  winget install --id OpenJS.NodeJS.LTS --exact --source winget --accept-source-agreements --accept-package-agreements
  if ($LASTEXITCODE -ne 0) { throw 'Node.js 安装失败，请查看上方安装器输出。' }
  Refresh-Path
  if (Test-Path "$env:ProgramFiles\nodejs\node.exe") { $env:Path = "$env:ProgramFiles\nodejs;$env:Path" }
  if (-not (Test-Node)) { throw 'Node.js 已安装但当前终端仍找不到；请重新打开终端运行此脚本。' }
}

& npm.cmd run setup
if ($LASTEXITCODE -ne 0) { throw '工作台安装未完成，请查看上方错误。' }
& npm.cmd start
