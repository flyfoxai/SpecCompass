#!/usr/bin/env pwsh
<#!
.SYNOPSIS
Update agent context files with information from plan.md (PowerShell version)

.DESCRIPTION
Mirrors the behavior of scripts/bash/update-agent-context.sh:
 1. Environment Validation
 2. Plan Data Extraction
 3. Agent File Management (create from template or update existing)
 4. Content Generation (technology stack, recent changes, timestamp)
 5. Multi-Agent Support (claude, gemini, copilot, cursor-agent, qwen, opencode, codex, windsurf, junie, kilocode, auggie, roo, codebuddy, amp, shai, tabnine, kiro-cli, agy, bob, vibe, qodercli, kimi, trae, pi, iflow, forge, generic)

.PARAMETER AgentType
Optional agent key to update a single agent. If omitted, updates all existing agent files (creating a default Claude file if none exist).

.EXAMPLE
./update-agent-context.ps1 -AgentType claude

.EXAMPLE
./update-agent-context.ps1   # Updates all existing agent files

.NOTES
Relies on common helper functions in common.ps1
#>
param(
    [Parameter(Position=0)]
    [ValidateSet('claude','gemini','copilot','cursor-agent','qwen','opencode','codex','windsurf','junie','kilocode','auggie','roo','codebuddy','amp','shai','tabnine','kiro-cli','agy','bob','vibe','qodercli','kimi','trae','pi','iflow','forge','generic')]
    [string]$AgentType
)

$ErrorActionPreference = 'Stop'

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
. (Join-Path $ScriptDir 'common.ps1')

$envData = Get-FeaturePathsEnv
$REPO_ROOT = $envData.REPO_ROOT
$CURRENT_BRANCH = $envData.CURRENT_BRANCH
$HAS_GIT = $envData.HAS_GIT
$IMPL_PLAN = $envData.IMPL_PLAN
$NEW_PLAN = $IMPL_PLAN

$CLAUDE_FILE = Join-Path $REPO_ROOT 'CLAUDE.md'
$GEMINI_FILE = Join-Path $REPO_ROOT 'GEMINI.md'
$COPILOT_FILE = Join-Path $REPO_ROOT '.github/copilot-instructions.md'
$CURSOR_FILE = Join-Path $REPO_ROOT '.cursor/rules/specify-rules.mdc'
$QWEN_FILE = Join-Path $REPO_ROOT 'QWEN.md'
$AGENTS_FILE = Join-Path $REPO_ROOT 'AGENTS.md'
$WINDSURF_FILE = Join-Path $REPO_ROOT '.windsurf/rules/specify-rules.md'
$JUNIE_FILE = Join-Path $REPO_ROOT '.junie/AGENTS.md'
$KILOCODE_FILE = Join-Path $REPO_ROOT '.kilocode/rules/specify-rules.md'
$AUGGIE_FILE = Join-Path $REPO_ROOT '.augment/rules/specify-rules.md'
$ROO_FILE = Join-Path $REPO_ROOT '.roo/rules/specify-rules.md'
$CODEBUDDY_FILE = Join-Path $REPO_ROOT 'CODEBUDDY.md'
$QODER_FILE = Join-Path $REPO_ROOT 'QODER.md'
$AMP_FILE = Join-Path $REPO_ROOT 'AGENTS.md'
$SHAI_FILE = Join-Path $REPO_ROOT 'SHAI.md'
$TABNINE_FILE = Join-Path $REPO_ROOT 'TABNINE.md'
$KIRO_FILE = Join-Path $REPO_ROOT 'AGENTS.md'
$AGY_FILE = Join-Path $REPO_ROOT '.agent/rules/specify-rules.md'
$BOB_FILE = Join-Path $REPO_ROOT 'AGENTS.md'
$VIBE_FILE = Join-Path $REPO_ROOT '.vibe/agents/specify-agents.md'
$KIMI_FILE = Join-Path $REPO_ROOT 'KIMI.md'
$TRAE_FILE = Join-Path $REPO_ROOT '.trae/rules/project_rules.md'
$IFLOW_FILE = Join-Path $REPO_ROOT 'IFLOW.md'
$FORGE_FILE = Join-Path $REPO_ROOT 'AGENTS.md'

$TEMPLATE_FILE = Join-Path $REPO_ROOT '.specify/templates/agent-file-template.md'

$script:NEW_LANG = ''
$script:NEW_FRAMEWORK = ''
$script:NEW_DB = ''
$script:NEW_PROJECT_TYPE = ''

function Write-Info {
    param([Parameter(Mandatory=$true)][string]$Message)
    Write-Host "INFO: $Message"
}

function Write-Success {
    param([Parameter(Mandatory=$true)][string]$Message)
    Write-Host "$([char]0x2713) $Message"
}

function Write-WarningMsg {
    param([Parameter(Mandatory=$true)][string]$Message)
    Write-Warning $Message
}

function Write-Err {
    param([Parameter(Mandatory=$true)][string]$Message)
    Write-Host "ERROR: $Message" -ForegroundColor Red
}

function Validate-Environment {
    if (-not $CURRENT_BRANCH) {
        Write-Err 'Unable to determine current feature'
        if ($HAS_GIT) { Write-Info "Make sure you're on a feature branch" } else { Write-Info 'Set SPECIFY_FEATURE environment variable or create a feature first' }
        exit 1
    }
    if (-not (Test-Path $NEW_PLAN)) {
        Write-Err "No plan.md found at $NEW_PLAN"
        Write-Info 'Ensure you are working on a feature with a corresponding spec directory'
        if (-not $HAS_GIT) { Write-Info 'Use: $env:SPECIFY_FEATURE=your-feature-name or create a new feature first' }
        exit 1
    }
    if (-not (Test-Path $TEMPLATE_FILE)) {
        Write-Err "Template file not found at $TEMPLATE_FILE"
        Write-Info 'Run specify init to scaffold .specify/templates, or add agent-file-template.md there.'
        exit 1
    }
}

function Extract-PlanField {
    param(
        [Parameter(Mandatory=$true)][string]$FieldPattern,
        [Parameter(Mandatory=$true)][string]$PlanFile
    )
    if (-not (Test-Path $PlanFile)) { return '' }
    $regex = "^\*\*$([Regex]::Escape($FieldPattern))\*\*: (.+)$"
    Get-Content -LiteralPath $PlanFile -Encoding utf8 | ForEach-Object {
        if ($_ -match $regex) {
            $val = $Matches[1].Trim()
            if ($val -notin @('NEEDS CLARIFICATION', 'N/A')) { return $val }
        }
    } | Select-Object -First 1
}

function Parse-PlanData {
    param([Parameter(Mandatory=$true)][string]$PlanFile)
    if (-not (Test-Path $PlanFile)) { Write-Err "Plan file not found: $PlanFile"; return $false }
    Write-Info "Parsing plan data from $PlanFile"
    $script:NEW_LANG = Extract-PlanField -FieldPattern 'Language/Version' -PlanFile $PlanFile
    $script:NEW_FRAMEWORK = Extract-PlanField -FieldPattern 'Primary Dependencies' -PlanFile $PlanFile
    $script:NEW_DB = Extract-PlanField -FieldPattern 'Storage' -PlanFile $PlanFile
    $script:NEW_PROJECT_TYPE = Extract-PlanField -FieldPattern 'Project Type' -PlanFile $PlanFile

    if ($NEW_LANG) { Write-Info "Found language: $NEW_LANG" } else { Write-WarningMsg 'No language information found in plan' }
    if ($NEW_FRAMEWORK) { Write-Info "Found framework: $NEW_FRAMEWORK" }
    if ($NEW_DB -and $NEW_DB -ne 'N/A') { Write-Info "Found database: $NEW_DB" }
    if ($NEW_PROJECT_TYPE) { Write-Info "Found project type: $NEW_PROJECT_TYPE" }
    return $true
}

function Format-TechnologyStack {
    param(
        [string]$Lang,
        [string]$Framework
    )
    $parts = @()
    if ($Lang -and $Lang -ne 'NEEDS CLARIFICATION') { $parts += $Lang }
    if ($Framework -and $Framework -notin @('NEEDS CLARIFICATION', 'N/A')) { $parts += $Framework }
    if (-not $parts) { return '' }
    return ($parts -join ' + ')
}

function Get-ProjectStructure {
    param([string]$ProjectType)
    if ($ProjectType -match 'web') { return "backend/`nfrontend/`ntests/" }
    return "src/`ntests/"
}

function Get-CommandsForLanguage {
    param([string]$Lang)
    switch -Regex ($Lang) {
        'Python' { return "cd src; pytest; ruff check ." }
        'Rust' { return "cargo test; cargo clippy" }
        'JavaScript|TypeScript' { return "npm test; npm run lint" }
        default { return "# Add commands for $Lang" }
    }
}

function Get-LanguageConventions {
    param([string]$Lang)
    if ($Lang) { return "${Lang}: Follow standard conventions" }
    return 'General: Follow standard conventions'
}

function New-AgentFile {
    param(
        [Parameter(Mandatory=$true)][string]$TargetFile,
        [Parameter(Mandatory=$true)][string]$ProjectName,
        [Parameter(Mandatory=$true)][datetime]$Date
    )
    if (-not (Test-Path $TEMPLATE_FILE)) { Write-Err "Template not found at $TEMPLATE_FILE"; return $false }
    $temp = New-TemporaryFile
    Copy-Item -LiteralPath $TEMPLATE_FILE -Destination $temp -Force

    $projectStructure = Get-ProjectStructure -ProjectType $NEW_PROJECT_TYPE
    $commands = Get-CommandsForLanguage -Lang $NEW_LANG
    $languageConventions = Get-LanguageConventions -Lang $NEW_LANG

    $escaped_lang = $NEW_LANG
    $escaped_framework = $NEW_FRAMEWORK
    $escaped_branch = $CURRENT_BRANCH

    $content = Get-Content -LiteralPath $temp -Raw -Encoding utf8
    $content = $content -replace '\[PROJECT NAME\]', $ProjectName
    $content = $content -replace '\[DATE\]', $Date.ToString('yyyy-MM-dd')

    $techStackForTemplate = ""
    if ($escaped_lang -and $escaped_framework) {
        $techStackForTemplate = "- $escaped_lang + $escaped_framework ($escaped_branch)"
    } elseif ($escaped_lang) {
        $techStackForTemplate = "- $escaped_lang ($escaped_branch)"
    } elseif ($escaped_framework) {
        $techStackForTemplate = "- $escaped_framework ($escaped_branch)"
    }

    $content = $content -replace '\[EXTRACTED FROM ALL PLAN.MD FILES\]', $techStackForTemplate
    $escapedStructure = [Regex]::Escape($projectStructure)
    $content = $content -replace '\[ACTUAL STRUCTURE FROM PLANS\]', $escapedStructure
    $content = $content -replace '\[ONLY COMMANDS FOR ACTIVE TECHNOLOGIES\]', $commands
    $content = $content -replace '\[LANGUAGE-SPECIFIC, ONLY FOR LANGUAGES IN USE\]', $languageConventions

    $recentChangesForTemplate = ""
    if ($escaped_lang -and $escaped_framework) {
        $recentChangesForTemplate = "- ${escaped_branch}: Added ${escaped_lang} + ${escaped_framework}"
    } elseif ($escaped_lang) {
        $recentChangesForTemplate = "- ${escaped_branch}: Added ${escaped_lang}"
    } elseif ($escaped_framework) {
        $recentChangesForTemplate = "- ${escaped_branch}: Added ${escaped_framework}"
    }

    $content = $content -replace '\[LAST 3 FEATURES AND WHAT THEY ADDED\]', $recentChangesForTemplate
    $content = $content -replace '\\n', [Environment]::NewLine

    if ($TargetFile -match '\.mdc$') {
        $frontmatter = @('---', 'description: Project Development Guidelines', 'globs: ["**/*"]', 'alwaysApply: true', '---', '') -join [Environment]::NewLine
        $content = $frontmatter + $content
    }

    $parent = Split-Path -Parent $TargetFile
    if (-not (Test-Path $parent)) { New-Item -ItemType Directory -Path $parent | Out-Null }
    Set-Content -LiteralPath $TargetFile -Value $content -NoNewline -Encoding utf8
    Remove-Item $temp -Force
    return $true
}

function Update-ExistingAgentFile {
    param(
        [Parameter(Mandatory=$true)][string]$TargetFile,
        [Parameter(Mandatory=$true)][datetime]$Date
    )
    $content = Get-Content -LiteralPath $TargetFile -Raw -Encoding utf8
    $techStack = Format-TechnologyStack -Lang $NEW_LANG -Framework $NEW_FRAMEWORK
    if (-not $techStack) { $techStack = 'Unspecified stack' }
    $recentChanges = "- $CURRENT_BRANCH updated on $($Date.ToString('yyyy-MM-dd'))"

    if ($content -match '## Tech Stack') {
        $content = [Regex]::Replace(
            $content,
            '(?ms)(## Tech Stack\s*\n)(.*?)(\n## |\Z)',
            "`$1- $techStack`n`n## "
        )
    }
    if ($content -match '## Recent Changes') {
        $content = [Regex]::Replace(
            $content,
            '(?ms)(## Recent Changes\s*\n)(.*?)(\n## |\Z)',
            "`$1$recentChanges`n`n## "
        )
    }

    Set-Content -LiteralPath $TargetFile -Value $content -NoNewline -Encoding utf8
    return $true
}

function Get-AgentTargets {
    $targets = @{
        'claude' = $CLAUDE_FILE
        'gemini' = $GEMINI_FILE
        'copilot' = $COPILOT_FILE
        'cursor-agent' = $CURSOR_FILE
        'qwen' = $QWEN_FILE
        'opencode' = $AGENTS_FILE
        'codex' = $AGENTS_FILE
        'windsurf' = $WINDSURF_FILE
        'junie' = $JUNIE_FILE
        'kilocode' = $KILOCODE_FILE
        'auggie' = $AUGGIE_FILE
        'roo' = $ROO_FILE
        'codebuddy' = $CODEBUDDY_FILE
        'amp' = $AMP_FILE
        'shai' = $SHAI_FILE
        'tabnine' = $TABNINE_FILE
        'kiro-cli' = $KIRO_FILE
        'agy' = $AGY_FILE
        'bob' = $BOB_FILE
        'vibe' = $VIBE_FILE
        'qodercli' = $QODER_FILE
        'kimi' = $KIMI_FILE
        'trae' = $TRAE_FILE
        'pi' = $AGENTS_FILE
        'iflow' = $IFLOW_FILE
        'forge' = $FORGE_FILE
        'generic' = $AGENTS_FILE
    }

    if ($AgentType) {
        return @{$AgentType = $targets[$AgentType]}
    }

    $existing = @{}
    foreach ($entry in $targets.GetEnumerator()) {
        if (Test-Path $entry.Value) {
            $existing[$entry.Key] = $entry.Value
        }
    }
    if ($existing.Count -eq 0) {
        $existing['claude'] = $CLAUDE_FILE
    }
    return $existing
}

Validate-Environment
if (-not (Parse-PlanData -PlanFile $NEW_PLAN)) { exit 1 }

$projectName = Split-Path $REPO_ROOT -Leaf
$now = Get-Date
$targets = Get-AgentTargets

foreach ($entry in $targets.GetEnumerator()) {
    $agent = $entry.Key
    $targetFile = $entry.Value

    if (Test-Path $targetFile) {
        if (Update-ExistingAgentFile -TargetFile $targetFile -Date $now) {
            Write-Success "Updated $agent context: $targetFile"
        }
        continue
    }

    if (New-AgentFile -TargetFile $targetFile -ProjectName $projectName -Date $now) {
        Write-Success "Created $agent context: $targetFile"
    }
}
