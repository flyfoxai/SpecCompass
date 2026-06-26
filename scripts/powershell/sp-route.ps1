#!/usr/bin/env pwsh

# Deterministic Spec Kit route discovery.
# Reads explicit project/feature state and returns the next safe /sp.* command.

[CmdletBinding()]
param(
    [switch]$Json,
    [switch]$Help
)

$ErrorActionPreference = 'Stop'

if ($Help) {
    Write-Output @"
Usage: sp-route.ps1 [OPTIONS]

OPTIONS:
  -Json       Output route payload as JSON
  -Help, -h   Show this help message
"@
    exit 0
}

. "$PSScriptRoot/common.ps1"

$repoRoot = Get-RepoRoot

function New-Artifacts {
    param(
        [bool]$Prd = $false,
        [bool]$Spec = $false,
        [bool]$Flows = $false,
        [bool]$Ui = $false,
        [bool]$Bundle = $false,
        [bool]$Plan = $false,
        [bool]$Tasks = $false,
        [bool]$Analysis = $false,
        [bool]$Gate = $false,
        [bool]$OpenItems = $false
    )
    [ordered]@{
        prd       = $Prd
        spec      = $Spec
        flows     = $Flows
        ui        = $Ui
        bundle    = $Bundle
        plan      = $Plan
        tasks     = $Tasks
        analysis  = $Analysis
        gate      = $Gate
        openItems = $OpenItems
    }
}

function Emit-Route {
    param(
        [Parameter(Mandatory = $true)][string]$Status,
        [Parameter(Mandatory = $true)][string]$Next,
        [Parameter(Mandatory = $true)][string]$Reason,
        [string]$ActiveFeature = "",
        [string]$FeatureDir = "",
        [hashtable]$Artifacts = (New-Artifacts),
        [string[]]$Missing = @(),
        [string[]]$Blockers = @(),
        [string]$Confidence = "high",
        [bool]$ContinueAllowed = $true,
        [string]$BlockerType = "NONE",
        [string]$BlockerRoute = $Next,
        [bool]$LoopDetected = $false,
        [string]$LoopSignature = "",
        [string]$LoopRoute = $Next
    )

    $payload = [ordered]@{
        schema          = "speckit.route.v1"
        status          = $Status
        next            = $Next
        reason          = $Reason
        activeFeature   = $ActiveFeature
        featureDir      = $FeatureDir
        artifacts       = $Artifacts
        missing         = @($Missing)
        blockers        = @($Blockers)
        confidence      = $Confidence
        autoExecute     = $false
        continueAllowed = $ContinueAllowed
        blockerType     = $BlockerType
        blockerRoute    = $BlockerRoute
        loopDetected    = $LoopDetected
        loopSignature   = $LoopSignature
        loopRoute       = $LoopRoute
    }

    if ($Json) {
        $payload | ConvertTo-Json -Compress -Depth 6
    } else {
        Write-Output "Status: $Status"
        Write-Output "Next: $Next"
        Write-Output "Reason: $Reason"
    }
}

function Resolve-ExplicitFeatureDir {
    if ($env:SPECIFY_FEATURE_DIRECTORY) {
        $featureDir = $env:SPECIFY_FEATURE_DIRECTORY
        if (-not [System.IO.Path]::IsPathRooted($featureDir)) {
            $featureDir = Join-Path $repoRoot $featureDir
        }
        return $featureDir
    }

    $featureJson = Join-Path $repoRoot '.specify/feature.json'
    if (-not (Test-Path -LiteralPath $featureJson -PathType Leaf)) {
        return $null
    }

    try {
        $featureConfig = Get-Content -LiteralPath $featureJson -Raw | ConvertFrom-Json
    } catch {
        return $null
    }

    if (-not $featureConfig.feature_directory) {
        return $null
    }

    $dir = [string]$featureConfig.feature_directory
    if (-not [System.IO.Path]::IsPathRooted($dir)) {
        $dir = Join-Path $repoRoot $dir
    }
    return $dir
}

function Test-DirHasFiles {
    param([string]$Path)
    return ((Test-Path -LiteralPath $Path -PathType Container) -and
        [bool](Get-ChildItem -LiteralPath $Path -File -ErrorAction SilentlyContinue | Select-Object -First 1))
}

function Test-SeedMarker {
    param([string]$Path)
    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) { return $false }
    return [bool](Select-String -LiteralPath $Path -Pattern 'SP_STAGE_SEED:' -Quiet)
}

function Test-ReadyMarker {
    param([string]$Path, [string]$Marker)
    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) { return $false }
    return [bool](Select-String -LiteralPath $Path -Pattern "(^|\s)$([regex]::Escape($Marker))($|\s)" -Quiet)
}

function Test-AnalysisPassMarker {
    param([string]$Path)
    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) { return $false }
    return [bool](Select-String -LiteralPath $Path -Pattern '^\s*(Diagnostic\s+)?Verdict\s*:\s*PASS\s*$|^\s*SP_STATUS\s*:\s*PASS\s*$|^\s*PASS\s*$' -Quiet)
}

function Test-GatePassVerdict {
    param([string]$Path)
    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) { return $false }
    return [bool](Select-String -LiteralPath $Path -Pattern '^\s*Verdict\s*:\s*PASS\s*$' -Quiet)
}

function Test-OpenItemsHaveBlockers {
    param([string]$Path)
    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) { return $false }
    return [bool](Select-String -LiteralPath $Path -Pattern 'Status:\s*(BLOCKED|NEEDS_DECISION)|\b(Blocker|BLOCKED|NEEDS_DECISION)\b' -Quiet)
}

function Get-OpenItemsBlockerRoute {
    param([string]$Path)
    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) { return $null }
    $match = Select-String -LiteralPath $Path -Pattern '(^|[\s-])(Owner Route|Next Route|Blocker Route|Next /sp\.\* route):\s*(/sp\.[A-Za-z0-9._-]+)' -AllMatches | Select-Object -First 1
    if (-not $match) { return $null }
    return $match.Matches[0].Groups[3].Value
}

function Get-OpenItemsBlockerType {
    param([string]$Path)
    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) { return "UNKNOWN_BLOCKER" }

    if (Select-String -LiteralPath $Path -Pattern 'Blocker Type:\s*(HUMAN_DECISION|BUSINESS_DECISION|NEEDS_DECISION)|Status:\s*NEEDS_DECISION|\b(NEEDS_DECISION|risk acceptance|human choice|human decision|owner decision|manual decision)\b' -Quiet) {
        return "HUMAN_DECISION"
    }

    if (Select-String -LiteralPath $Path -Pattern 'Blocker Type:\s*(UPSTREAM_DOC_GAP|SOURCE_AUTHORITY_GAP|MISSING_ARTIFACT|WEAK_ARTIFACT)|Missing/Weak Artifact:|Owner Route:\s*/sp\.(prd|specify|flow|ui|bundle|plan|tasks)|Next Route:\s*/sp\.(prd|specify|flow|ui|bundle|plan|tasks)' -Quiet) {
        return "UPSTREAM_DOC_GAP"
    }

    return "UNKNOWN_BLOCKER"
}

function Get-RepeatedFallbackSignature {
    param([string]$Path)
    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) { return $null }

    $lines = Get-Content -LiteralPath $Path
    $sigIndex = -1
    $routeIndex = -1
    $counts = @{}

    foreach ($line in $lines) {
        if ($line -notmatch '^\s*\|') { continue }

        $cells = @($line -split '\|')
        for ($i = 0; $i -lt $cells.Count; $i++) {
            $cell = $cells[$i].Trim().ToLowerInvariant()
            if ($sigIndex -lt 0 -and ($cell -eq 'failure signature' -or $cell -eq 'blocker-signature')) {
                $sigIndex = $i
            }
            if ($routeIndex -lt 0 -and ($cell -eq 'next-route' -or $cell -eq 'next route')) {
                $routeIndex = $i
            }
        }

        if ($sigIndex -lt 0) { continue }
        if ($line -match '^\s*\|[\s\-:]+\|\s*$') { continue }

        if ($cells.Count -le $sigIndex) { continue }
        $signature = $cells[$sigIndex].Trim()
        if (-not $signature -or $signature -eq 'failure signature' -or $signature -eq 'blocker-signature') {
            continue
        }

        $route = ''
        if ($routeIndex -ge 0 -and $cells.Count -gt $routeIndex) {
            $route = $cells[$routeIndex].Trim()
        }

        $key = "$signature`t$route"
        if ($counts.ContainsKey($key)) {
            $counts[$key] += 1
        } else {
            $counts[$key] = 1
        }

        if ($counts[$key] -ge 2) {
            return [pscustomobject]@{
                signature = $signature
                route     = $route
            }
        }
    }

    return $null
}

$featureDir = Resolve-ExplicitFeatureDir
if (-not $featureDir) {
    $specsDir = Join-Path $repoRoot 'specs'
    $candidates = @()
    if (Test-Path -LiteralPath $specsDir -PathType Container) {
        $candidates = @(Get-ChildItem -LiteralPath $specsDir -Directory -ErrorAction SilentlyContinue | Sort-Object FullName)
    }

    if ($candidates.Count -gt 1) {
        Emit-Route -Status "NEEDS_DECISION" -Next "/sp.clarify" -Reason "multiple-feature-candidates" -Artifacts (New-Artifacts) -Blockers ($candidates | ForEach-Object { $_.FullName }) -Confidence "low" -ContinueAllowed:$false -BlockerType "HUMAN_DECISION" -BlockerRoute "/sp.clarify"
        exit 0
    }
    if ($candidates.Count -eq 1) {
        $featureDir = $candidates[0].FullName
    } else {
        Emit-Route -Status "NEEDS_PRD" -Next "/sp.prd" -Reason "no-active-feature" -Artifacts (New-Artifacts) -Missing @("feature")
        exit 0
    }
}

if (-not (Test-Path -LiteralPath $featureDir -PathType Container)) {
    Emit-Route -Status "NEEDS_PRD" -Next "/sp.prd" -Reason "feature-directory-missing" -FeatureDir $featureDir -Artifacts (New-Artifacts) -Missing @("feature")
    exit 0
}

$activeFeature = Split-Path -Leaf $featureDir
$prd = Join-Path $featureDir 'prd.md'
$spec = Join-Path $featureDir 'spec.md'
$flows = Join-Path $featureDir 'flows'
$ui = Join-Path $featureDir 'ui'
$bundle = Join-Path $featureDir 'bundle.md'
$plan = Join-Path $featureDir 'plan.md'
$tasks = Join-Path $featureDir 'tasks.md'
$analysis = Join-Path $featureDir 'analysis.md'
$gate = Join-Path $featureDir 'gate.md'
$openItems = Join-Path $featureDir 'memory/open-items.md'

$artifacts = New-Artifacts `
    -Prd (Test-Path -LiteralPath $prd -PathType Leaf) `
    -Spec (Test-Path -LiteralPath $spec -PathType Leaf) `
    -Flows (Test-DirHasFiles $flows) `
    -Ui (Test-DirHasFiles $ui) `
    -Bundle (Test-Path -LiteralPath $bundle -PathType Leaf) `
    -Plan (Test-Path -LiteralPath $plan -PathType Leaf) `
    -Tasks (Test-Path -LiteralPath $tasks -PathType Leaf) `
    -Analysis (Test-Path -LiteralPath $analysis -PathType Leaf) `
    -Gate (Test-Path -LiteralPath $gate -PathType Leaf) `
    -OpenItems (Test-Path -LiteralPath $openItems -PathType Leaf)

if (-not $artifacts.prd -or (Test-SeedMarker $prd)) {
    Emit-Route -Status "NEEDS_PRD" -Next "/sp.prd" -Reason "missing-prd" -ActiveFeature $activeFeature -FeatureDir $featureDir -Artifacts $artifacts -Missing @("prd.md")
    exit 0
}

if ($artifacts.spec -and (Test-SeedMarker $spec)) {
    Emit-Route -Status "NEEDS_SPECIFY" -Next "/sp.specify" -Reason "seed-spec" -ActiveFeature $activeFeature -FeatureDir $featureDir -Artifacts $artifacts -Blockers @("spec.md")
    exit 0
}

if (-not $artifacts.spec) {
    Emit-Route -Status "NEEDS_SPECIFY" -Next "/sp.specify" -Reason "missing-spec" -ActiveFeature $activeFeature -FeatureDir $featureDir -Artifacts $artifacts -Missing @("spec.md")
    exit 0
}

if (-not $artifacts.flows -or (Test-SeedMarker (Join-Path $flows 'index.md'))) {
    Emit-Route -Status "NEEDS_FLOW" -Next "/sp.flow" -Reason "missing-flows" -ActiveFeature $activeFeature -FeatureDir $featureDir -Artifacts $artifacts -Missing @("flows/")
    exit 0
}

if (-not $artifacts.ui -or (Test-SeedMarker (Join-Path $ui 'index.md'))) {
    Emit-Route -Status "NEEDS_UI" -Next "/sp.ui" -Reason "missing-ui" -ActiveFeature $activeFeature -FeatureDir $featureDir -Artifacts $artifacts -Missing @("ui/")
    exit 0
}

if (-not $artifacts.bundle -or (Test-SeedMarker $bundle)) {
    Emit-Route -Status "NEEDS_BUNDLE" -Next "/sp.bundle" -Reason "missing-bundle" -ActiveFeature $activeFeature -FeatureDir $featureDir -Artifacts $artifacts -Missing @("bundle.md")
    exit 0
}

if (-not $artifacts.plan -or (Test-SeedMarker $plan)) {
    Emit-Route -Status "NEEDS_PLAN" -Next "/sp.plan" -Reason "missing-plan" -ActiveFeature $activeFeature -FeatureDir $featureDir -Artifacts $artifacts -Missing @("plan.md")
    exit 0
}

if (-not $artifacts.tasks -or (Test-SeedMarker $tasks)) {
    Emit-Route -Status "NEEDS_TASKS" -Next "/sp.tasks" -Reason "missing-tasks" -ActiveFeature $activeFeature -FeatureDir $featureDir -Artifacts $artifacts -Missing @("tasks.md")
    exit 0
}

$fallbackLoop = Get-RepeatedFallbackSignature -Path (Join-Path $featureDir 'memory/fallback-log.md')
if ($fallbackLoop) {
    $loopRoute = $fallbackLoop.route
    if (-not $loopRoute) {
        $loopRoute = "/sp.clarify"
    }
    Emit-Route -Status "BLOCKED" -Next "/sp.clarify" -Reason "fallback-loop-detected" -ActiveFeature $activeFeature -FeatureDir $featureDir -Artifacts $artifacts -Blockers @("memory/fallback-log.md") -ContinueAllowed:$false -BlockerType "REPEATED_FALLBACK" -BlockerRoute "/sp.clarify" -LoopDetected:$true -LoopSignature $fallbackLoop.signature -LoopRoute $loopRoute
    exit 0
}

if (Test-OpenItemsHaveBlockers $openItems) {
    $blockerType = Get-OpenItemsBlockerType $openItems
    $blockerRoute = "/sp.clarify"
    $continueAllowed = $false

    if ($blockerType -eq "UPSTREAM_DOC_GAP") {
        $extractedRoute = Get-OpenItemsBlockerRoute $openItems
        if ($extractedRoute) {
            $blockerRoute = $extractedRoute
        } else {
            $blockerType = "UNKNOWN_BLOCKER"
        }
    }

    if ($blockerType -eq "UPSTREAM_DOC_GAP" -and $blockerRoute -ne "/sp.clarify") {
        $continueAllowed = $true
    }

    Emit-Route -Status "BLOCKED" -Next $blockerRoute -Reason "open-items-blocked" -ActiveFeature $activeFeature -FeatureDir $featureDir -Artifacts $artifacts -Blockers @("memory/open-items.md") -ContinueAllowed:$continueAllowed -BlockerType $blockerType -BlockerRoute $blockerRoute
    exit 0
}

if (-not (Test-ReadyMarker $plan "READY_FOR_TASKS")) {
    Emit-Route -Status "NEEDS_PLAN" -Next "/sp.plan" -Reason "plan-readiness-missing" -ActiveFeature $activeFeature -FeatureDir $featureDir -Artifacts $artifacts -Blockers @("plan.md") -Confidence "medium"
    exit 0
}

if (-not $artifacts.analysis -or (Test-SeedMarker $analysis)) {
    Emit-Route -Status "NEEDS_ANALYZE" -Next "/sp.analyze" -Reason "missing-analysis" -ActiveFeature $activeFeature -FeatureDir $featureDir -Artifacts $artifacts -Missing @("analysis.md")
    exit 0
}

if (-not (Test-AnalysisPassMarker $analysis)) {
    Emit-Route -Status "NEEDS_ANALYZE" -Next "/sp.analyze" -Reason "analysis-not-pass" -ActiveFeature $activeFeature -FeatureDir $featureDir -Artifacts $artifacts -Blockers @("analysis.md")
    exit 0
}

if (-not $artifacts.gate -or (Test-SeedMarker $gate)) {
    Emit-Route -Status "NEEDS_GATE" -Next "/sp.gate" -Reason "missing-gate" -ActiveFeature $activeFeature -FeatureDir $featureDir -Artifacts $artifacts -Missing @("gate.md")
    exit 0
}

if (-not (Test-GatePassVerdict $gate)) {
    Emit-Route -Status "NEEDS_GATE" -Next "/sp.gate" -Reason "gate-not-pass" -ActiveFeature $activeFeature -FeatureDir $featureDir -Artifacts $artifacts -Blockers @("gate.md")
    exit 0
}

Emit-Route -Status "READY_FOR_IMPLEMENT" -Next "/sp.implement" -Reason "gate-authorized-implement" -ActiveFeature $activeFeature -FeatureDir $featureDir -Artifacts $artifacts
