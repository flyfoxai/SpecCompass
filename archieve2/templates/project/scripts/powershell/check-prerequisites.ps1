param(
    [switch]$Json,
    [switch]$PathsOnly,
    [switch]$RequireSpec,
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

if ($activeFeature) {
    $featureDir = Join-Path "specs" $activeFeature
    $specPath = Join-Path $featureDir "spec.md"
    $bundlePath = Join-Path $featureDir "bundle.md"
    $planPath = Join-Path $featureDir "plan.md"
    $tasksPath = Join-Path $featureDir "tasks.md"
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

if ($RequireSpec) {
    Add-Missing -Label "spec" -PathValue $specPath
}

if ($RequireBundle) {
    Add-Missing -Label "bundle" -PathValue $bundlePath
}

if ($RequirePlan) {
    Add-Missing -Label "plan" -PathValue $planPath
}

if ($RequireTasks) {
    Add-Missing -Label "tasks" -PathValue $tasksPath
}

if ($Json) {
    [ordered]@{
        projectRoot = $projectRoot
        activeFeature = if ($activeFeature) { $activeFeature } else { "" }
        featureDir = $featureDir
        projectIndexPath = $projectIndexPath
        activeContextPath = $activeContextPath
        specPath = $specPath
        bundlePath = $bundlePath
        planPath = $planPath
        tasksPath = if ($IncludeTasks) { $tasksPath } else { "" }
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
    if ($IncludeTasks) {
        Write-Output "TASKS_PATH=$tasksPath"
    }
}
else {
    Write-Output "Project root: $projectRoot"
    Write-Output "Active feature: $(if ($activeFeature) { $activeFeature } else { '<unresolved>' })"
    if ($featureDir) {
        Write-Output "Feature directory: $featureDir"
    }
}

if ($missing.Count -gt 0) {
    throw "Missing required stage outputs: $($missing -join ',')"
}
