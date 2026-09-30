# Nightcord installer for Windows.
# Injects Nightcord into Discord (Stable, PTB, Canary) or removes it.
#
#   NightcordInstaller.bat                      -> menu
#   NightcordInstaller.ps1 -Action install      -> download the latest build from GitHub and install
#   NightcordInstaller.ps1 -Action install -DistPath C:\path\to\dist   -> install a local build (used by `pnpm inject`)
#   NightcordInstaller.ps1 -Action uninstall    -> restore the original Discord

param(
    [ValidateSet("menu", "install", "uninstall")]
    [string]$Action = "menu",
    [string]$DistPath,
    [switch]$Yes
)

$ErrorActionPreference = "Stop"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$Repo = "1223321313333/Nightcord"
# "stable" follows "devbuild" (every commit) a day later, see .github/workflows/promote.yml
$ReleaseTag = "stable"
$ReleaseUrl = "https://github.com/$Repo/releases/download/$ReleaseTag"
$AsarName = "desktop.asar"
$DataDir = Join-Path $env:APPDATA "Nightcord"
$Flavours = @(
    @{ Name = "Discord"; Dir = "Discord"; Exe = "Discord.exe" },
    @{ Name = "Discord PTB"; Dir = "DiscordPTB"; Exe = "DiscordPTB.exe" },
    @{ Name = "Discord Canary"; Dir = "DiscordCanary"; Exe = "DiscordCanary.exe" }
)

function Write-Step($text) { Write-Host "  > $text" -ForegroundColor Cyan }
function Write-Ok($text) { Write-Host "  + $text" -ForegroundColor Green }
function Write-Warn2($text) { Write-Host "  ! $text" -ForegroundColor Yellow }

function Get-Installs {
    foreach ($f in $Flavours) {
        $root = Join-Path $env:LOCALAPPDATA $f.Dir
        if (-not (Test-Path $root)) { continue }
        # The newest app-x.y.z folder is the one Discord runs
        $app = Get-ChildItem $root -Directory -Filter "app-*" |
            Sort-Object { [version]($_.Name.Substring(4)) } -Descending |
            Select-Object -First 1
        if (-not $app) { continue }
        $resources = Join-Path $app.FullName "resources"
        if (-not (Test-Path $resources)) { continue }
        [pscustomobject]@{
            Name      = $f.Name
            Root      = $root
            Exe       = $f.Exe
            Resources = $resources
            Patched   = Test-Path (Join-Path $resources "_app.asar")
        }
    }
}

# A tiny asar archive with index.js (loads Nightcord) and package.json
function New-LoaderAsar([string]$Path, [string]$PatcherPath) {
    $utf8 = New-Object System.Text.UTF8Encoding($false)
    $js = 'require("' + ($PatcherPath -replace '\\', '\\') + '")'
    $pkg = '{"name":"discord","main":"index.js"}'
    $jsBytes = $utf8.GetBytes($js)
    $pkgBytes = $utf8.GetBytes($pkg)

    $json = '{"files":{"index.js":{"size":' + $jsBytes.Length + ',"offset":"0"},"package.json":{"size":' + $pkgBytes.Length + ',"offset":"' + $jsBytes.Length + '"}}}'
    $jsonBytes = $utf8.GetBytes($json)
    $pad = (4 - ($jsonBytes.Length % 4)) % 4
    $payload = 4 + $jsonBytes.Length + $pad

    $ms = New-Object IO.MemoryStream
    $w = New-Object IO.BinaryWriter($ms)
    $w.Write([uint32]4)
    $w.Write([uint32]($payload + 4))
    $w.Write([uint32]$payload)
    $w.Write([uint32]$jsonBytes.Length)
    $w.Write($jsonBytes)
    $w.Write((New-Object byte[] $pad))
    $w.Write($jsBytes)
    $w.Write($pkgBytes)
    $w.Flush()
    [IO.File]::WriteAllBytes($Path, $ms.ToArray())
}

function Stop-Discord($installs) {
    $running = $installs | Where-Object { Get-Process -Name ($_.Exe -replace '\.exe$', '') -ErrorAction SilentlyContinue }
    if (-not $running) { return @() }

    $names = ($running | ForEach-Object Name) -join ", "
    if (-not $Yes) {
        $answer = Read-Host "  Нужно закрыть $names. Закрыть сейчас? (Y/N)"
        if ($answer -notmatch '^[YyДд]') { throw "Установка отменена: Discord должен быть закрыт." }
    }
    foreach ($i in $running) {
        Write-Step "Закрываю $($i.Name)"
        Get-Process -Name ($i.Exe -replace '\.exe$', '') -ErrorAction SilentlyContinue | Stop-Process -Force
    }
    Start-Sleep -Seconds 2
    return $running
}

function Start-Discord($installs) {
    foreach ($i in $installs) {
        $update = Join-Path $i.Root "Update.exe"
        if (Test-Path $update) { Start-Process $update -ArgumentList "--processStart", $i.Exe }
    }
}

# The SHA-256 desktop.asar must have: GitHub's digest for the release file, or desktop.asar.sha256 published next to it
function Get-ExpectedSha256 {
    try {
        $release = Invoke-RestMethod -UseBasicParsing -Headers @{ "User-Agent" = "NightcordInstaller" } `
            -Uri "https://api.github.com/repos/$Repo/releases/tags/$ReleaseTag"
        $asset = $release.assets | Where-Object name -eq $AsarName | Select-Object -First 1
        if ($asset.digest -match '^sha256:([a-fA-F0-9]{64})$') { return $Matches[1].ToLowerInvariant() }
    } catch {
        # The GitHub API allows 60 requests per hour per IP; fall back to the checksum file
    }
    $text = (Invoke-WebRequest -UseBasicParsing -Uri "$ReleaseUrl/$AsarName.sha256").Content
    if ($text -is [byte[]]) { $text = [Text.Encoding]::ASCII.GetString($text) }
    if ($text -match '\b([a-fA-F0-9]{64})\b') { return $Matches[1].ToLowerInvariant() }
    throw "Не удалось получить контрольную сумму сборки, установка отменена."
}

# Returns the path Discord should require: a local patcher.js, or the downloaded desktop.asar
function Get-Build {
    if ($DistPath) {
        $dist = (Resolve-Path $DistPath).Path
        foreach ($candidate in @((Join-Path $dist "desktop\patcher.js"), (Join-Path $dist "patcher.js"))) {
            if (Test-Path $candidate) {
                Write-Ok "Использую локальную сборку: $candidate"
                return $candidate
            }
        }
        throw "В $dist нет сборки Nightcord. Сначала соберите проект: pnpm build"
    }

    New-Item -ItemType Directory -Force $DataDir | Out-Null
    $target = Join-Path $DataDir $AsarName
    $expected = Get-ExpectedSha256
    Write-Step "Скачиваю свежую сборку Nightcord с GitHub ($Repo), это около 17 МБ"
    $oldProgress = $ProgressPreference
    $ProgressPreference = "SilentlyContinue" # the progress bar makes Invoke-WebRequest many times slower
    try {
        Invoke-WebRequest -UseBasicParsing -Uri "$ReleaseUrl/$AsarName" -OutFile "$target.download"
    } finally {
        $ProgressPreference = $oldProgress
    }

    $actual = (Get-FileHash -Algorithm SHA256 "$target.download").Hash.ToLowerInvariant()
    if ($actual -ne $expected) {
        Remove-Item -Force "$target.download"
        throw "Скачанная сборка повреждена или подменена (SHA-256 не совпадает). Ничего не установлено, попробуйте ещё раз."
    }
    Write-Ok "SHA-256 совпадает"
    Move-Item -Force "$target.download" $target
    Write-Ok "Сборка сохранена: $target"
    return $target
}

function Install-Nightcord {
    $installs = @(Get-Installs)
    if (-not $installs) { throw "Discord не найден. Установите Discord с discord.com и запустите установщик снова." }

    $patcher = Get-Build
    $stopped = Stop-Discord $installs

    foreach ($i in $installs) {
        $asar = Join-Path $i.Resources "app.asar"
        $backup = Join-Path $i.Resources "_app.asar"
        if (-not $i.Patched) {
            # First install: keep Discord's original app.asar as _app.asar
            Move-Item $asar $backup
        }
        New-LoaderAsar $asar $patcher
        Write-Ok "Nightcord установлен в $($i.Name)"
    }

    if ($stopped) { Start-Discord $stopped }
    Write-Host ""
    Write-Ok "Готово! Откройте Discord: в настройках появится раздел Nightcord."
}

function Uninstall-Nightcord {
    $installs = @(Get-Installs | Where-Object Patched)
    if (-not $installs) { Write-Warn2 "Nightcord не установлен ни в один Discord."; return }

    $stopped = Stop-Discord $installs
    foreach ($i in $installs) {
        $asar = Join-Path $i.Resources "app.asar"
        $backup = Join-Path $i.Resources "_app.asar"
        if (Test-Path $asar) { Remove-Item $asar -Force }
        Move-Item $backup $asar
        Write-Ok "Nightcord удалён из $($i.Name)"
    }
    if ($stopped) { Start-Discord $stopped }
    Write-Host ""
    Write-Ok "Discord восстановлен. Ваши настройки Nightcord остались в $env:APPDATA\Nightcord."
}

function Show-Menu {
    Write-Host ""
    Write-Host "  ===  Nightcord Installer  ===" -ForegroundColor Magenta
    Write-Host ""
    $installs = @(Get-Installs)
    if ($installs) {
        foreach ($i in $installs) {
            $state = if ($i.Patched) { "мод установлен" } else { "чистый" }
            Write-Host "  $($i.Name): $state"
        }
    } else {
        Write-Warn2 "Discord не найден."
    }
    Write-Host ""
    Write-Host "  1. Установить / обновить Nightcord"
    Write-Host "  2. Удалить Nightcord"
    Write-Host "  0. Выход"
    Write-Host ""
    switch (Read-Host "  Выберите") {
        "1" { Install-Nightcord }
        "2" { Uninstall-Nightcord }
        default { return }
    }
}

try {
    switch ($Action) {
        "install" { Install-Nightcord }
        "uninstall" { Uninstall-Nightcord }
        default { Show-Menu }
    }
} catch {
    Write-Host ""
    Write-Host "  Ошибка: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

if ($Action -eq "menu") {
    Write-Host ""
    Read-Host "  Нажмите Enter, чтобы закрыть"
}
