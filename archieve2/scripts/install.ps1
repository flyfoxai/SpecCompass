param(
    [Parameter(Position = 0)]
    [string]$TargetDir = $env:SP_INSTALL_TARGET_DIR,

    [switch]$Yes,

    [string]$ArchiveUrl = $env:SP_INSTALL_ARCHIVE_URL,

    [string]$Ai = $env:SP_INSTALL_AI,

    [string]$Script = $env:SP_INSTALL_SCRIPT_TYPE,

    [switch]$AiSkills,

    [switch]$IgnoreAgentTools,

    [switch]$NoGit,

    [string]$Preset = $env:SP_INSTALL_PRESET,

    [string]$BranchNumbering = $env:SP_INSTALL_BRANCH_NUMBERING,

    [string]$Integration = $env:SP_INSTALL_INTEGRATION,

    [string]$IntegrationOptions = $env:SP_INSTALL_INTEGRATION_OPTIONS,

    [string]$AiCommandsDir = $env:SP_INSTALL_AI_COMMANDS_DIR,

    [switch]$Help
)

$ErrorActionPreference = "Stop"
$script:DownloadDir = $null
$script:PyCacheDir = $null

function Cleanup {
    if ($script:DownloadDir -and (Test-Path $script:DownloadDir)) {
        Remove-Item -Recurse -Force $script:DownloadDir
    }
    if ($script:PyCacheDir -and (Test-Path $script:PyCacheDir)) {
        Remove-Item -Recurse -Force $script:PyCacheDir
    }
}

function Show-Usage {
@"
Usage:
  powershell -ExecutionPolicy Bypass -File .\scripts\install.ps1 [target_dir]
  powershell -ExecutionPolicy Bypass -File .\scripts\install.ps1 -Yes [target_dir]
  powershell -ExecutionPolicy Bypass -File .\scripts\install.ps1 -Ai codex [target_dir]
  powershell -ExecutionPolicy Bypass -File .\scripts\install.ps1 -Ai claude [target_dir]
  powershell -ExecutionPolicy Bypass -File .\scripts\install.ps1 -ArchiveUrl <zip-or-tar-url> [target_dir]

Behavior:
  - This wrapper now delegates to the upstream-style local CLI: `specify init`.
  - If target_dir is omitted, initialization runs in the current directory (`specify init --here`).
  - `-Yes` maps to `specify init --force`.
  - `-ArchiveUrl` is only used when the local repository source tree is unavailable.
  - Legacy global Codex prompt mirroring is no longer the primary install path.
  - Active integration output is project-local and handled by `src/specify_cli`.
"@
}

function Resolve-SourceRoot {
    $localRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
    if ((Test-Path (Join-Path $localRoot "pyproject.toml")) -and (Test-Path (Join-Path $localRoot "src/specify_cli"))) {
        return $localRoot.Path
    }

    if (-not $ArchiveUrl) {
        throw "Unable to resolve local source root and no -ArchiveUrl was provided."
    }

    $script:DownloadDir = Join-Path ([System.IO.Path]::GetTempPath()) ("sp-install-" + [System.Guid]::NewGuid().ToString("N"))
    New-Item -ItemType Directory -Force -Path $script:DownloadDir | Out-Null

    $archivePath = Join-Path $script:DownloadDir "sp-install-download"
    Invoke-WebRequest -UseBasicParsing -Uri $ArchiveUrl -OutFile $archivePath

    $extractPath = Join-Path $script:DownloadDir "extract"
    New-Item -ItemType Directory -Force -Path $extractPath | Out-Null

    if ($ArchiveUrl -match '\.zip($|\?)') {
        Expand-Archive -Path $archivePath -DestinationPath $extractPath -Force
    }
    else {
        tar -xf $archivePath -C $extractPath
    }

    if ((Test-Path (Join-Path $extractPath "pyproject.toml")) -and (Test-Path (Join-Path $extractPath "src/specify_cli"))) {
        return $extractPath
    }

    $candidate = Get-ChildItem -Path $extractPath -Directory | Where-Object {
        (Test-Path (Join-Path $_.FullName "pyproject.toml")) -and
        (Test-Path (Join-Path $_.FullName "src/specify_cli"))
    } | Select-Object -First 1

    if (-not $candidate) {
        throw "Downloaded archive does not contain a runnable specify-cli source tree."
    }

    return $candidate.FullName
}

function Invoke-Specify {
    param(
        [string]$SourceRoot,
        [string[]]$Arguments
    )

    $script:PyCacheDir = Join-Path ([System.IO.Path]::GetTempPath()) ("specify-pyc-" + [System.Guid]::NewGuid().ToString("N"))
    New-Item -ItemType Directory -Force -Path $script:PyCacheDir | Out-Null

    if (Get-Command uv -ErrorAction SilentlyContinue) {
        & uv run --project $SourceRoot specify @Arguments
        return
    }

    $env:PYTHONPATH = (Join-Path $SourceRoot "src")
    $env:PYTHONPYCACHEPREFIX = $script:PyCacheDir

    if (Get-Command py -ErrorAction SilentlyContinue) {
        & py -3 -m specify_cli @Arguments
        return
    }

    if (Get-Command python -ErrorAction SilentlyContinue) {
        & python -m specify_cli @Arguments
        return
    }

    throw "uv, py -3, or python is required to run specify init."
}

try {
    if ($Help) {
        Show-Usage
        exit 0
    }

    $sourceRoot = Resolve-SourceRoot

    $invokeArgs = @("init")
    if ($Ai) { $invokeArgs += @("--ai", $Ai) }
    if ($Script) { $invokeArgs += @("--script", $Script) }
    if ($AiSkills) { $invokeArgs += "--ai-skills" }
    if ($IgnoreAgentTools) { $invokeArgs += "--ignore-agent-tools" }
    if ($NoGit) { $invokeArgs += "--no-git" }
    if ($Preset) { $invokeArgs += @("--preset", $Preset) }
    if ($BranchNumbering) { $invokeArgs += @("--branch-numbering", $BranchNumbering) }
    if ($Integration) { $invokeArgs += @("--integration", $Integration) }
    if ($IntegrationOptions) { $invokeArgs += @("--integration-options", $IntegrationOptions) }
    if ($AiCommandsDir) { $invokeArgs += @("--ai-commands-dir", $AiCommandsDir) }
    if ($Yes -or $env:SP_INSTALL_AUTO_YES -in @("1", "true", "TRUE", "yes", "YES")) { $invokeArgs += "--force" }

    if ([string]::IsNullOrWhiteSpace($TargetDir) -or $TargetDir -eq ".") {
        $invokeArgs += "--here"
    }
    else {
        $invokeArgs += $TargetDir
    }

    Invoke-Specify -SourceRoot $sourceRoot -Arguments $invokeArgs
}
finally {
    Cleanup
}
