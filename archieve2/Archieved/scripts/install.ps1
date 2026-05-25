param(
    [Parameter(Position = 0)]
    [string]$TargetDir,

    [switch]$Yes,

    [string]$ArchiveUrl,

    [string]$Ai,

    [switch]$AiSkills
)

$ErrorActionPreference = "Stop"

$script:DownloadDir = $null
$script:ResolvedCodexHome = $null
$script:ResolvedCodexSkillsDir = $null
$script:ResolvedCodexPromptsDir = $null
$script:ResolvedCodexCommandsDir = $null
$script:InstalledCodexPrompts = @()
$script:InstalledCodexCommands = @()
$script:RemovedLegacyCodexSkills = @()
$script:RemovedLegacyCodexPrompts = @()
$script:RemovedLegacyCodexCommands = @()
$script:DetectedCodexHome = $env:CODEX_HOME
$script:ResolvedClaudeCommandsDir = $null
$script:InstalledCommands = @()

function Cleanup {
    if ($script:DownloadDir -and (Test-Path $script:DownloadDir)) {
        Remove-Item -Recurse -Force $script:DownloadDir
    }
}

function Show-Usage {
    @"
Usage:
  powershell -ExecutionPolicy Bypass -File .\scripts\install.ps1 [target_dir]
  powershell -ExecutionPolicy Bypass -File .\scripts\install.ps1 -Yes [target_dir]
  powershell -ExecutionPolicy Bypass -File .\scripts\install.ps1 -ArchiveUrl <zip-url> [target_dir]
  powershell -ExecutionPolicy Bypass -File .\scripts\install.ps1 -Ai codex [target_dir]
  powershell -ExecutionPolicy Bypass -File .\scripts\install.ps1 -Ai claude [target_dir]

Behavior:
  - If target_dir is omitted, install into the current directory.
  - Prompts for confirmation before writing files unless -Yes is used.
  - Windows local mode copies assets from the current repository.
  - iwr|iex mode requires -ArchiveUrl or SP_INSTALL_ARCHIVE_URL.
  - Remote mode can also use SP_INSTALL_TARGET_DIR and SP_INSTALL_AUTO_YES.
  - -Ai codex installs pre-rendered Codex Desktop /prompts:sp.* prompts and a compatibility commands mirror.
  - -Ai claude installs /sp.* slash commands into .claude/commands in the target project.
  - -AiSkills is deprecated, ignored, and kept only as a compatibility no-op for Codex mode.
"@
}

function Get-ExistingCount {
    param(
        [string]$TargetAbs
    )

    $managed = @(
        "docs",
        "layer-1-business-clarification",
        "layer-2-delivery",
        ".specify/memory",
        "specs",
        ".sp/install-manifest.json",
        "docs/sp-overview.zh-CN.md",
        "docs/sp-overview-details.zh-CN.md",
        "docs/sp-overview.en.md",
        "docs/sp-overview-details.en.md"
    )

    $count = 0
    foreach ($rel in $managed) {
        if (Test-Path (Join-Path $TargetAbs $rel)) {
            $count++
        }
    }
    return $count
}

function Copy-Tree {
    param(
        [string]$Source,
        [string]$Destination
    )

    New-Item -ItemType Directory -Force -Path $Destination | Out-Null
    Copy-Item -Path (Join-Path $Source "*") -Destination $Destination -Recurse -Force
}

function Get-LegacyCodexSkillSlugs {
    @(
        "sp-constitution",
        "sp-specify",
        "sp-clarify",
        "sp-flow",
        "sp-ui",
        "sp-gate",
        "sp-bundle",
        "sp-plan",
        "sp-tasks",
        "sp-analyze"
    )
}

function Get-SpCommandFiles {
    @(
        "sp.constitution.md",
        "sp.specify.md",
        "sp.clarify.md",
        "sp.flow.md",
        "sp.ui.md",
        "sp.gate.md",
        "sp.bundle.md",
        "sp.plan.md",
        "sp.tasks.md",
        "sp.analyze.md"
    )
}

function Get-LegacyCodexCommandFiles {
    @(
        "speckit.constitution.md",
        "speckit.specify.md",
        "speckit.clarify.md",
        "speckit.checklist.md",
        "speckit.plan.md",
        "speckit.tasks.md",
        "speckit.analyze.md",
        "speckit.implement.md",
        "speckit.taskstoissues.md"
    )
}

function Resolve-SourceRoot {
    param(
        [string]$ArchiveUrlValue
    )

    $localRoot = $null
    if ($PSScriptRoot) {
        $candidate = Resolve-Path (Join-Path $PSScriptRoot "..") -ErrorAction SilentlyContinue
        if ($candidate) {
            $localRoot = $candidate.Path
        }
    }

    if (
        $localRoot -and
        (Test-Path (Join-Path $localRoot "docs")) -and
        (Test-Path (Join-Path $localRoot "installer-assets"))
    ) {
        return @{
            Root = $localRoot
            Mode = "local"
        }
    }

    if (-not $ArchiveUrlValue) {
        throw "No local source found and no archive URL was provided. Use -ArchiveUrl when running through iwr|iex."
    }

    $script:DownloadDir = Join-Path ([System.IO.Path]::GetTempPath()) ("sp-install-" + [System.Guid]::NewGuid().ToString("N"))
    New-Item -ItemType Directory -Force -Path $script:DownloadDir | Out-Null

    $archivePath = Join-Path $script:DownloadDir "sp-install.zip"
    Invoke-WebRequest -UseBasicParsing -Uri $ArchiveUrlValue -OutFile $archivePath

    $extractPath = Join-Path $script:DownloadDir "extract"
    Expand-Archive -Path $archivePath -DestinationPath $extractPath -Force

    if ((Test-Path (Join-Path $extractPath "docs")) -and (Test-Path (Join-Path $extractPath "installer-assets"))) {
        return @{
            Root = $extractPath
            Mode = "archive"
        }
    }

    $match = Get-ChildItem -Path $extractPath -Directory -Recurse |
        Where-Object {
            (Test-Path (Join-Path $_.FullName "docs")) -and
            (Test-Path (Join-Path $_.FullName "installer-assets"))
        } |
        Select-Object -First 1

    if (-not $match) {
        throw "Downloaded archive does not contain the expected sp asset layout."
    }

    return @{
        Root = $match.FullName
        Mode = "archive"
    }
}

function Resolve-CodexPaths {
    if ($script:DetectedCodexHome) {
        $script:ResolvedCodexHome = $script:DetectedCodexHome
    }
    else {
        $userProfile = [Environment]::GetFolderPath("UserProfile")
        if (-not $userProfile) {
            throw "Codex prompt installation failed: unable to resolve USERPROFILE for default .codex fallback."
        }
        $script:ResolvedCodexHome = Join-Path $userProfile ".codex"
    }

    $script:ResolvedCodexSkillsDir = Join-Path $script:ResolvedCodexHome "skills"
    $script:ResolvedCodexPromptsDir = Join-Path $script:ResolvedCodexHome "prompts"
    $script:ResolvedCodexCommandsDir = Join-Path $script:ResolvedCodexHome "commands"
    if (-not $script:ResolvedCodexHome) {
        throw "Codex prompt installation failed: resolved Codex home directory missing or empty."
    }
}

function Remove-LegacyCodexSkills {
    $script:RemovedLegacyCodexSkills = @()

    if (-not $script:ResolvedCodexSkillsDir) {
        return
    }

    if (-not (Test-Path $script:ResolvedCodexSkillsDir)) {
        return
    }

    foreach ($slug in Get-LegacyCodexSkillSlugs) {
        $legacySkillDir = Join-Path $script:ResolvedCodexSkillsDir $slug
        if (Test-Path $legacySkillDir) {
            Remove-Item -Recurse -Force $legacySkillDir
            if (Test-Path $legacySkillDir) {
                throw "Codex prompt installation failed: unable to remove legacy skill $slug from $script:ResolvedCodexSkillsDir"
            }
            $script:RemovedLegacyCodexSkills += $slug
        }
    }
}

function Install-ClaudeCommands {
    param(
        [string]$SourceRoot,
        [string]$TargetAbs
    )

    $commandsSourceRoot = Join-Path $SourceRoot "installer-assets/claude-commands"
    if (-not (Test-Path $commandsSourceRoot)) {
        throw "Claude command installation failed: missing installer-assets/claude-commands in source."
    }

    $script:ResolvedClaudeCommandsDir = Join-Path $TargetAbs ".claude/commands"

    try {
        New-Item -ItemType Directory -Force -Path $script:ResolvedClaudeCommandsDir | Out-Null
    }
    catch {
        throw "Claude command installation failed: unable to create $script:ResolvedClaudeCommandsDir"
    }

    $script:InstalledCommands = @()

    foreach ($filename in Get-SpCommandFiles) {
        $src = Join-Path $commandsSourceRoot $filename
        $dest = Join-Path $script:ResolvedClaudeCommandsDir $filename
        $commandName = [System.IO.Path]::GetFileNameWithoutExtension($filename)

        if (-not (Test-Path $src)) {
            throw "Claude command installation failed: missing source command file for $commandName"
        }

        Copy-Item -Path $src -Destination $dest -Force

        if (-not (Test-Path $dest)) {
            throw "Claude command installation failed: failed to write $commandName into $script:ResolvedClaudeCommandsDir"
        }

        $script:InstalledCommands += $commandName
    }

    if ($script:InstalledCommands.Count -eq 0) {
        throw "Claude command installation failed: no /sp.* commands were written to $script:ResolvedClaudeCommandsDir"
    }
}

function Install-CodexCommands {
    param(
        [string]$SourceRoot
    )

    $commandsSourceRoot = Join-Path $SourceRoot "installer-assets/codex-prompts"
    if (-not (Test-Path $commandsSourceRoot)) {
        throw "Codex Desktop prompt installation failed: missing installer-assets/codex-prompts in source."
    }

    try {
        New-Item -ItemType Directory -Force -Path $script:ResolvedCodexPromptsDir | Out-Null
    }
    catch {
        throw "Codex Desktop prompt installation failed: resolved prompts directory missing or unwritable: $script:ResolvedCodexPromptsDir"
    }

    try {
        New-Item -ItemType Directory -Force -Path $script:ResolvedCodexCommandsDir | Out-Null
    }
    catch {
        throw "Codex Desktop prompt installation failed: compatibility commands directory missing or unwritable: $script:ResolvedCodexCommandsDir"
    }

    $script:InstalledCodexPrompts = @()
    $script:InstalledCodexCommands = @()
    $script:RemovedLegacyCodexSkills = @()
    $script:RemovedLegacyCodexPrompts = @()
    $script:RemovedLegacyCodexCommands = @()

    Remove-LegacyCodexSkills

    foreach ($filename in Get-LegacyCodexCommandFiles) {
        $legacyPromptPath = Join-Path $script:ResolvedCodexPromptsDir $filename
        if (Test-Path $legacyPromptPath) {
            Remove-Item -Force $legacyPromptPath
            if (Test-Path $legacyPromptPath) {
                throw "Codex Desktop prompt installation failed: unable to remove legacy command $filename from $script:ResolvedCodexPromptsDir"
            }
            $script:RemovedLegacyCodexPrompts += [System.IO.Path]::GetFileNameWithoutExtension($filename)
        }

        $legacyPath = Join-Path $script:ResolvedCodexCommandsDir $filename
        if (Test-Path $legacyPath) {
            Remove-Item -Force $legacyPath
            if (Test-Path $legacyPath) {
                throw "Codex Desktop prompt installation failed: unable to remove legacy command $filename from $script:ResolvedCodexCommandsDir"
            }
            $script:RemovedLegacyCodexCommands += [System.IO.Path]::GetFileNameWithoutExtension($filename)
        }
    }

    foreach ($filename in Get-SpCommandFiles) {
        $src = Join-Path $commandsSourceRoot $filename
        $promptDest = Join-Path $script:ResolvedCodexPromptsDir $filename
        $commandDest = Join-Path $script:ResolvedCodexCommandsDir $filename
        $commandName = [System.IO.Path]::GetFileNameWithoutExtension($filename)

        if (-not (Test-Path $src)) {
            throw "Codex Desktop prompt installation failed: missing source command file for $commandName"
        }

        Copy-Item -Path $src -Destination $promptDest -Force

        if (-not (Test-Path $promptDest)) {
            throw "Codex Desktop prompt installation failed: failed to write $commandName into $script:ResolvedCodexPromptsDir"
        }

        Copy-Item -Path $src -Destination $commandDest -Force

        if (-not (Test-Path $commandDest)) {
            throw "Codex Desktop prompt installation failed: failed to mirror $commandName into $script:ResolvedCodexCommandsDir"
        }

        $script:InstalledCodexPrompts += $commandName
        $script:InstalledCodexCommands += $commandName
    }

    if ($script:InstalledCodexPrompts.Count -eq 0) {
        throw "Codex Desktop prompt installation failed: no /prompts:sp.* commands were written to $script:ResolvedCodexPromptsDir"
    }

    if ($script:InstalledCodexCommands.Count -eq 0) {
        throw "Codex Desktop prompt installation failed: no mirrored /prompts:sp.* commands were written to $script:ResolvedCodexCommandsDir"
    }
}

try {
    if (-not $PSBoundParameters.ContainsKey("TargetDir") -or [string]::IsNullOrWhiteSpace($TargetDir)) {
        if ($env:SP_INSTALL_TARGET_DIR) {
            $TargetDir = $env:SP_INSTALL_TARGET_DIR
        }
        else {
            $TargetDir = "."
        }
    }

    if (-not $PSBoundParameters.ContainsKey("ArchiveUrl") -and $env:SP_INSTALL_ARCHIVE_URL) {
        $ArchiveUrl = $env:SP_INSTALL_ARCHIVE_URL
    }

    if (-not $PSBoundParameters.ContainsKey("Ai") -and $env:SP_INSTALL_AI) {
        $Ai = $env:SP_INSTALL_AI
    }

    $aiSkillsRequested = $AiSkills.IsPresent
    if ((-not $aiSkillsRequested) -and $env:SP_INSTALL_AI_SKILLS -match '^(?i:1|true|yes|y)$') {
        $aiSkillsRequested = $true
    }

    $installCodexPrompts = $false
    $installClaudeCommands = $false

    $autoYes = $Yes.IsPresent
    if ((-not $autoYes) -and $env:SP_INSTALL_AUTO_YES -match '^(?i:1|true|yes|y)$') {
        $autoYes = $true
    }

    if ($args -contains "--help" -or $args -contains "-h") {
        Show-Usage
        exit 0
    }

    if ($Ai -and $Ai -notin @("codex", "claude")) {
        throw "This installer currently supports only -Ai codex and -Ai claude."
    }

    if ($Ai -eq "codex") {
        $installCodexPrompts = $true
    }

    if ($Ai -eq "claude") {
        $installClaudeCommands = $true
    }

    if ($aiSkillsRequested -and $Ai -ne "codex") {
        throw "-AiSkills currently requires -Ai codex."
    }

    if ($aiSkillsRequested) {
        Write-Warning "-AiSkills is deprecated and ignored. Codex now installs /prompts:sp.* only."
    }

    $sourceInfo = Resolve-SourceRoot -ArchiveUrlValue $ArchiveUrl
    $sourceRoot = $sourceInfo.Root
    $sourceMode = $sourceInfo.Mode

    New-Item -ItemType Directory -Force -Path $TargetDir | Out-Null
    $targetAbs = (Resolve-Path $TargetDir).Path

    if ($installCodexPrompts) {
        Resolve-CodexPaths
    }

    if ($installClaudeCommands) {
        $script:ResolvedClaudeCommandsDir = Join-Path $targetAbs ".claude/commands"
    }

    $existingCount = Get-ExistingCount -TargetAbs $targetAbs

    if (-not $autoYes) {
        Write-Host ""
        Write-Host "sp installer is about to write the document-stage starter pack."
        Write-Host ""
        Write-Host "Target directory:"
        Write-Host "  $targetAbs"
        Write-Host ""
        Write-Host "This will install or refresh:"
        Write-Host "  - docs/sp-*.md and overview docs"
        Write-Host "  - layer-1-business-clarification/"
        Write-Host "  - layer-2-delivery/"
        Write-Host "  - .specify/memory/"
        Write-Host "  - specs/"
        Write-Host "  - .sp/install-manifest.json"
        if ($installCodexPrompts) {
            Write-Host "  - Codex Desktop prompts: $(((Get-SpCommandFiles) | ForEach-Object { [System.IO.Path]::GetFileNameWithoutExtension($_) }) -join ', ')"
            Write-Host ""
            Write-Host "Codex integration:"
            Write-Host "  detected CODEX_HOME: $(if ($script:DetectedCodexHome) { $script:DetectedCodexHome } else { '<empty>' })"
            Write-Host "  resolved Codex home: $script:ResolvedCodexHome"
            Write-Host "  legacy skills directory (cleanup only): $script:ResolvedCodexSkillsDir"
            Write-Host "  resolved prompts directory: $script:ResolvedCodexPromptsDir"
            Write-Host "  compatibility commands directory: $script:ResolvedCodexCommandsDir"
        }
        if ($installClaudeCommands) {
            Write-Host "  - Claude commands: $(((Get-SpCommandFiles) | ForEach-Object { [System.IO.Path]::GetFileNameWithoutExtension($_) }) -join ', ')"
            Write-Host ""
            Write-Host "Claude integration:"
            Write-Host "  target commands directory: $script:ResolvedClaudeCommandsDir"
        }
        Write-Host ""
        Write-Host "Managed paths that already exist:"
        Write-Host "  $existingCount"
        Write-Host ""
        Write-Host "Unrelated files will not be deleted."
        $answer = Read-Host "Continue? [y/N]"
        if ($answer -notin @("y", "Y", "yes", "YES")) {
            throw "Installation cancelled."
        }
    }

    Copy-Tree -Source (Join-Path $sourceRoot "docs") -Destination (Join-Path $targetAbs "docs")
    Copy-Tree -Source (Join-Path $sourceRoot "installer-assets/project/docs") -Destination (Join-Path $targetAbs "docs")
    Copy-Tree -Source (Join-Path $sourceRoot "layer-1-business-clarification") -Destination (Join-Path $targetAbs "layer-1-business-clarification")
    Copy-Tree -Source (Join-Path $sourceRoot "layer-2-delivery") -Destination (Join-Path $targetAbs "layer-2-delivery")
    Copy-Tree -Source (Join-Path $sourceRoot "installer-assets/project/.specify/memory") -Destination (Join-Path $targetAbs ".specify/memory")

    New-Item -ItemType Directory -Force -Path (Join-Path $targetAbs "specs") | Out-Null

    if ($installCodexPrompts) {
        Install-CodexCommands -SourceRoot $sourceRoot
    }

    if ($installClaudeCommands) {
        Install-ClaudeCommands -SourceRoot $sourceRoot -TargetAbs $targetAbs
    }

    $version = "unknown"
    $packageJson = Join-Path $sourceRoot "package.json"
    if (Test-Path $packageJson) {
        $packageRaw = Get-Content -Raw -Path $packageJson
        try {
            $package = $packageRaw | ConvertFrom-Json
            if ($package.version) {
                $version = [string]$package.version
            }
        }
        catch {
            $versionMatch = [regex]::Match($packageRaw, '"version"\s*:\s*"(?<version>[^"]+)"')
            if ($versionMatch.Success) {
                $version = $versionMatch.Groups["version"].Value
            }
        }
    }

    $manifestDir = Join-Path $targetAbs ".sp"
    New-Item -ItemType Directory -Force -Path $manifestDir | Out-Null

    $manifest = [ordered]@{
        name = "sp-document-workflow"
        version = $version
        installedAt = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
        sourceMode = $sourceMode
        targetDir = $targetAbs
    }

    if ($Ai) {
        $manifest["ai"] = $Ai
    }

    if ($installCodexPrompts) {
        $manifest["detectedCodexHome"] = if ($script:DetectedCodexHome) { $script:DetectedCodexHome } else { "" }
        $manifest["codexHome"] = $script:ResolvedCodexHome
        $manifest["codexPromptsDir"] = $script:ResolvedCodexPromptsDir
        $manifest["codexCommandsDir"] = $script:ResolvedCodexCommandsDir
        $manifest["installedCodexPrompts"] = $script:InstalledCodexPrompts
        $manifest["installedCodexCommands"] = $script:InstalledCodexCommands
        if ($script:RemovedLegacyCodexSkills.Count -gt 0) {
            $manifest["removedLegacyCodexSkills"] = $script:RemovedLegacyCodexSkills
        }
        if ($script:RemovedLegacyCodexPrompts.Count -gt 0) {
            $manifest["removedLegacyCodexPrompts"] = $script:RemovedLegacyCodexPrompts
        }
        if ($script:RemovedLegacyCodexCommands.Count -gt 0) {
            $manifest["removedLegacyCodexCommands"] = $script:RemovedLegacyCodexCommands
        }
    }

    if ($installClaudeCommands) {
        $manifest["claudeCommandsDir"] = $script:ResolvedClaudeCommandsDir
        $manifest["installedCommands"] = $script:InstalledCommands
    }

    $manifest | ConvertTo-Json -Depth 4 | Set-Content -Path (Join-Path $manifestDir "install-manifest.json") -Encoding utf8

    Write-Host "sp document-stage starter pack installed to:"
    Write-Host "  $targetAbs"

    if ($installCodexPrompts) {
        Write-Host ""
        Write-Host "Codex integration:"
        Write-Host "  detected CODEX_HOME: $(if ($script:DetectedCodexHome) { $script:DetectedCodexHome } else { '<empty>' })"
        Write-Host "  resolved Codex home: $script:ResolvedCodexHome"
        Write-Host "  legacy skills directory (cleanup only): $script:ResolvedCodexSkillsDir"
        Write-Host "  resolved prompts directory: $script:ResolvedCodexPromptsDir"
        Write-Host "  compatibility commands directory: $script:ResolvedCodexCommandsDir"
        Write-Host "  installed /prompts:sp.* prompts:"
        foreach ($command in $script:InstalledCodexPrompts) {
            Write-Host "    - /prompts:$command"
        }
        Write-Host "  mirrored /prompts:sp.* commands:"
        foreach ($command in $script:InstalledCodexCommands) {
            Write-Host "    - /prompts:$command"
        }
        if ($script:RemovedLegacyCodexSkills.Count -gt 0) {
            Write-Host "  removed legacy sp-* skills:"
            foreach ($skill in $script:RemovedLegacyCodexSkills) {
                Write-Host "    - $skill"
            }
        }
        if ($script:RemovedLegacyCodexPrompts.Count -gt 0) {
            Write-Host "  removed legacy /prompts:speckit.* prompts:"
            foreach ($command in $script:RemovedLegacyCodexPrompts) {
                Write-Host "    - /prompts:$command"
            }
        }
        if ($script:RemovedLegacyCodexCommands.Count -gt 0) {
            Write-Host "  removed legacy /prompts:speckit.* mirrored commands:"
            foreach ($command in $script:RemovedLegacyCodexCommands) {
                Write-Host "    - /prompts:$command"
            }
        }
        Write-Host ""
        Write-Host "Codex trigger examples:"
        Write-Host '  /prompts:sp.specify'
        Write-Host '  /prompts:sp.analyze'
        Write-Host "  reload the Codex workspace if the new prompts do not appear immediately"
    }
    elseif ($installClaudeCommands) {
        Write-Host ""
        Write-Host "Claude integration:"
        Write-Host "  target commands directory: $script:ResolvedClaudeCommandsDir"
        Write-Host "  installed /sp.* commands:"
        foreach ($command in $script:InstalledCommands) {
            Write-Host "    - /$command"
        }
        Write-Host ""
        Write-Host "Claude trigger examples:"
        Write-Host '  /sp.specify'
        Write-Host '  /sp.analyze'
        Write-Host "  reload the Claude workspace if the new commands do not appear immediately"
    }
    else {
        Write-Host ""
        Write-Host "No agent integration was installed."
        Write-Host "To install Codex prompts, rerun with:"
        Write-Host "  powershell -ExecutionPolicy Bypass -File .\scripts\install.ps1 -Ai codex $TargetDir"
        Write-Host "To install Claude slash commands, rerun with:"
        Write-Host "  powershell -ExecutionPolicy Bypass -File .\scripts\install.ps1 -Ai claude $TargetDir"
    }

    Write-Host ""
    Write-Host "Trigger conventions:"
    Write-Host '  - Codex Desktop prompts use /prompts:sp.*'
    Write-Host "  - slash-command agents use /sp.*"
    Write-Host ""
    Write-Host "Recommended next steps:"
    Write-Host "  1. Read docs/sp-overview.zh-CN.md or docs/sp-overview.en.md"
    Write-Host "  2. Review .specify/memory/constitution.md"
    if ($installCodexPrompts) {
        Write-Host '  3. Reload Codex, then start with /prompts:sp.specify'
    }
    elseif ($installClaudeCommands) {
        Write-Host '  3. Reload Claude, then start with /sp.specify'
    }
    else {
        Write-Host "  3. Install an agent integration, then start with /prompts:sp.specify or /sp.specify"
    }
}
finally {
    Cleanup
}
