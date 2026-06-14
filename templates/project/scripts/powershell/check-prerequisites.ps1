<#
Usage: check-prerequisites.ps1 [-Json] [-PathsOnly] [-RequireSpec]
    [-RequireFlow] [-RequireUi] [-RequireBundle] [-RequirePlan]
    [-RequireTasks] [-IncludeTasks]
#>

param(
    [switch]$Json,
    [switch]$PathsOnly,
    [switch]$RequireSpec,
    [switch]$RequireFlow,
    [switch]$RequireUi,
    [switch]$RequireBundle,
    [switch]$RequirePlan,
    [switch]$RequireTasks,
    [switch]$IncludeTasks
)

$ErrorActionPreference = "Stop"

$projectRoot = (Get-Location).Path
$activeContextPath = ".specify/memory/active-context.md"
$projectIndexPath = ".specify/memory/project-index.md"

function Get-FeatureFromActiveContext {
    if (-not (Test-Path $activeContextPath)) {
        return $null
    }

    foreach ($line in Get-Content -Path $activeContextPath) {
        $match = [regex]::Match($line, 'specs/([^/]+)/')
        if ($match.Success) {
            return $match.Groups[1].Value
        }
    }

    return $null
}

function Get-SingleFeature {
    if (-not (Test-Path "specs")) {
        return $null
    }

    $matches = Get-ChildItem -Path "specs" -Directory -ErrorAction SilentlyContinue |
        Where-Object { Test-Path (Join-Path $_.FullName "memory/index.md") }

    if ($matches.Count -eq 1) {
        return $matches[0].Name
    }

    return $null
}

$activeFeature = Get-FeatureFromActiveContext
if (-not $activeFeature) {
    $activeFeature = Get-SingleFeature
}

$featureDir = ""
$specPath = ""
$bundlePath = ""
$planPath = ""
$tasksPath = ""
$flowDir = ""
$uiDir = ""

if ($activeFeature) {
    $featureDir = Join-Path "specs" $activeFeature
    $specPath = Join-Path $featureDir "spec.md"
    $bundlePath = Join-Path $featureDir "bundle.md"
    $planPath = Join-Path $featureDir "plan.md"
    $tasksPath = Join-Path $featureDir "tasks.md"
    $flowDir = Join-Path $featureDir "flows"
    $uiDir = Join-Path $featureDir "ui"

    if (-not (Test-Path $featureDir -PathType Container)) {
        $activeFeature = $null
        $featureDir = ""
        $specPath = ""
        $bundlePath = ""
        $planPath = ""
        $tasksPath = ""
        $flowDir = ""
        $uiDir = ""
    }
}

$missing = New-Object System.Collections.Generic.List[string]

function Add-Missing {
    param(
        [string]$Label,
        [string]$PathValue
    )

    if ([string]::IsNullOrWhiteSpace($PathValue) -or -not (Test-Path $PathValue)) {
        $missing.Add($Label)
    }
}

function Add-MissingDir {
    param(
        [string]$Label,
        [string]$PathValue
    )

    $hasFile = $false
    if (-not [string]::IsNullOrWhiteSpace($PathValue) -and (Test-Path $PathValue -PathType Container)) {
        $hasFile = [bool](Get-ChildItem -Path $PathValue -File -ErrorAction SilentlyContinue | Select-Object -First 1)
    }

    if (-not $hasFile) {
        $missing.Add($Label)
    }
}

if ($activeFeature -and $RequireSpec) {
    Add-Missing -Label "spec" -PathValue $specPath
}

if ($activeFeature -and $RequireFlow) {
    Add-MissingDir -Label "flow" -PathValue $flowDir
}

if ($activeFeature -and $RequireUi) {
    Add-MissingDir -Label "ui" -PathValue $uiDir
}

if ($activeFeature -and $RequireBundle) {
    Add-Missing -Label "bundle" -PathValue $bundlePath
}

if ($activeFeature -and $RequirePlan) {
    Add-Missing -Label "plan" -PathValue $planPath
}

if ($activeFeature -and $RequireTasks) {
    Add-Missing -Label "tasks" -PathValue $tasksPath
}

if ($Json) {
    [ordered]@{
        projectRoot = $projectRoot
        hasActiveFeature = [bool]$activeFeature
        activeFeature = if ($activeFeature) { $activeFeature } else { "" }
        featureDir = $featureDir
        projectIndexPath = $projectIndexPath
        activeContextPath = $activeContextPath
        specPath = $specPath
        bundlePath = $bundlePath
        planPath = $planPath
        flowDir = $flowDir
        uiDir = $uiDir
        tasksPath = if ($IncludeTasks) { $tasksPath } else { "" }
        nextStep = if ($activeFeature) { "" } else { "/sp.specify" }
        reason = if ($activeFeature) { "" } else { "no-active-feature" }
        missing = @($missing)
    } | ConvertTo-Json -Depth 3
}
elseif ($PathsOnly) {
    Write-Output "PROJECT_ROOT=$projectRoot"
    Write-Output "ACTIVE_FEATURE=$activeFeature"
    Write-Output "FEATURE_DIR=$featureDir"
    Write-Output "SPEC_PATH=$specPath"
    Write-Output "BUNDLE_PATH=$bundlePath"
    Write-Output "PLAN_PATH=$planPath"
    Write-Output "FLOW_DIR=$flowDir"
    Write-Output "UI_DIR=$uiDir"
    if ($IncludeTasks) {
        Write-Output "TASKS_PATH=$tasksPath"
    }
}
else {
    Write-Output "Project root: $projectRoot"
    Write-Output "Active feature: $(if ($activeFeature) { $activeFeature } else { '<unresolved>' })"
    if ($featureDir) {
        Write-Output "Feature directory: $featureDir"
    } else {
        Write-Output "Next step: /sp.specify"
    }
}

if ($missing.Count -gt 0) {
    if ($missing -contains "flow") {
        Write-Output "Run /sp.flow first to create the business flow documents in flows/."
    }
    if ($missing -contains "ui") {
        Write-Output "Run /sp.ui first to create the UI interaction documents in ui/."
    }
    throw "Missing required stage outputs: $($missing -join ',')"
}
