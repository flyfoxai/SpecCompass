#!/usr/bin/env pwsh

# Consolidated prerequisite checking script (PowerShell)
#
# This script provides unified prerequisite checking for Spec-Driven Development workflow.
# It replaces the functionality previously spread across multiple scripts.
#
# Usage: ./check-prerequisites.ps1 [OPTIONS]
#
# OPTIONS:
#   -Json               Output in JSON format
#   -RequireFlow        Require flows/ to exist and contain at least one file
#   -RequireUi          Require ui/ to exist and contain at least one file
#   -RequireTasks       Require tasks.md to exist (for implementation phase)
#   -IncludeTasks       Include tasks.md in AVAILABLE_DOCS list
#   -PathsOnly          Only output path variables (no validation)
#   -Help, -h           Show help message

[CmdletBinding()]
param(
    [switch]$Json,
    [switch]$RequireSpec,
    [switch]$RequireFlow,
    [switch]$RequireUi,
    [switch]$RequireBundle,
    [switch]$RequirePlan,
    [switch]$RequireTasks,
    [switch]$IncludeTasks,
    [switch]$PathsOnly,
    [switch]$Help
)

$ErrorActionPreference = 'Stop'

# Show help if requested
if ($Help) {
    Write-Output @"
Usage: check-prerequisites.ps1 [OPTIONS]

Consolidated prerequisite checking for Spec-Driven Development workflow.

OPTIONS:
  -Json               Output in JSON format
  -RequireSpec        Require spec.md to exist
  -RequireFlow        Require flows/ to exist and contain at least one file
  -RequireUi          Require ui/ to exist and contain at least one file
  -RequireBundle      Require bundle.md to exist
  -RequirePlan        Require plan.md to exist
  -RequireTasks       Require tasks.md to exist (for implementation phase)
  -IncludeTasks       Include tasks.md in AVAILABLE_DOCS list
  -PathsOnly          Only output path variables (no prerequisite validation)
  -Help, -h           Show this help message

EXAMPLES:
  # Check clarify/bundle/ui/gate prerequisites (spec.md required)
  .\check-prerequisites.ps1 -Json -RequireSpec

  # Check planning prerequisites (bundle.md required)
  .\check-prerequisites.ps1 -Json -RequireBundle

  # Check UI prerequisites (spec.md and flows/ required)
  .\check-prerequisites.ps1 -Json -RequireSpec -RequireFlow

  # Check tasks prerequisites (plan.md required)
  .\check-prerequisites.ps1 -Json -RequirePlan

  # Check analysis prerequisites (full upstream document chain required)
  .\check-prerequisites.ps1 -Json -RequireSpec -RequireFlow -RequireUi -RequireBundle -RequirePlan -RequireTasks -IncludeTasks

  # Get feature paths only (no validation)
  .\check-prerequisites.ps1 -PathsOnly

"@
    exit 0
}

# Source common functions
. "$PSScriptRoot/common.ps1"

# Get feature paths and validate branch
$paths = Get-FeaturePathsEnv

if (-not (Test-FeatureBranch -Branch $paths.CURRENT_BRANCH -HasGit:$paths.HAS_GIT)) { 
    exit 1 
}

# If paths-only mode, output paths and exit (support combined -Json -PathsOnly)
if ($PathsOnly) {
    if ($Json) {
        [PSCustomObject]@{
            REPO_ROOT    = $paths.REPO_ROOT
            BRANCH       = $paths.CURRENT_BRANCH
            FEATURE_DIR  = $paths.FEATURE_DIR
            FEATURE_SPEC = $paths.FEATURE_SPEC
            IMPL_PLAN    = $paths.IMPL_PLAN
            TASKS        = $paths.TASKS
        } | ConvertTo-Json -Compress
    } else {
        Write-Output "REPO_ROOT: $($paths.REPO_ROOT)"
        Write-Output "BRANCH: $($paths.CURRENT_BRANCH)"
        Write-Output "FEATURE_DIR: $($paths.FEATURE_DIR)"
        Write-Output "FEATURE_SPEC: $($paths.FEATURE_SPEC)"
        Write-Output "IMPL_PLAN: $($paths.IMPL_PLAN)"
        Write-Output "TASKS: $($paths.TASKS)"
    }
    exit 0
}

# Validate required directories and files
if (-not (Test-Path $paths.FEATURE_DIR -PathType Container)) {
    if ($Json) {
        [PSCustomObject]@{
            REPO_ROOT        = $paths.REPO_ROOT
            BRANCH           = $paths.CURRENT_BRANCH
            FEATURE_DIR      = ""
            AVAILABLE_DOCS   = @()
            hasActiveFeature = $false
            activeFeature    = ""
            featureDir       = ""
            missing          = @("feature")
            nextStep         = "/sp.specify"
            reason           = "no-active-feature"
        } | ConvertTo-Json -Compress
    } else {
        Write-Output "No active feature found."
        Write-Output "Next step: /sp.specify"
    }
    exit 0
}

$explicitRequirement = $RequireSpec -or $RequireFlow -or $RequireUi -or $RequireBundle -or $RequirePlan -or $RequireTasks
if (-not $explicitRequirement) {
    $RequirePlan = $true
}

if ($RequireSpec -and -not (Test-Path $paths.FEATURE_SPEC -PathType Leaf)) {
    Write-Output "ERROR: spec.md not found in $($paths.FEATURE_DIR)"
    Write-Output "Run /sp.specify first to create the feature specification."
    exit 1
}

$flowDir = Join-Path $paths.FEATURE_DIR 'flows'
if ($RequireFlow -and (-not (Test-Path $flowDir -PathType Container) -or -not (Get-ChildItem -Path $flowDir -File -ErrorAction SilentlyContinue | Select-Object -First 1))) {
    Write-Output "ERROR: flows/ not found or empty in $($paths.FEATURE_DIR)"
    Write-Output "Run /sp.flow first to create the business flow documents."
    exit 1
}

$uiDir = Join-Path $paths.FEATURE_DIR 'ui'
if ($RequireUi -and (-not (Test-Path $uiDir -PathType Container) -or -not (Get-ChildItem -Path $uiDir -File -ErrorAction SilentlyContinue | Select-Object -First 1))) {
    Write-Output "ERROR: ui/ not found or empty in $($paths.FEATURE_DIR)"
    Write-Output "Run /sp.ui first to create the UI interaction documents."
    exit 1
}

if ($RequireBundle -and -not (Test-Path (Join-Path $paths.FEATURE_DIR 'bundle.md') -PathType Leaf)) {
    Write-Output "ERROR: bundle.md not found in $($paths.FEATURE_DIR)"
    Write-Output "Run /sp.bundle first to create the delivery bundle."
    exit 1
}

if ($RequirePlan -and -not (Test-Path $paths.IMPL_PLAN -PathType Leaf)) {
    Write-Output "ERROR: plan.md not found in $($paths.FEATURE_DIR)"
    Write-Output "Run /sp.plan first to create the implementation plan."
    exit 1
}

# Check for tasks.md if required
if ($RequireTasks -and -not (Test-Path $paths.TASKS -PathType Leaf)) {
    Write-Output "ERROR: tasks.md not found in $($paths.FEATURE_DIR)"
    Write-Output "Run /sp.tasks first to create the task list."
    exit 1
}

# Build list of available documents
$docs = @()

# Always check these optional docs
if (Test-Path $paths.RESEARCH) { $docs += 'research.md' }
if (Test-Path $paths.DATA_MODEL) { $docs += 'data-model.md' }

# Check contracts directory (only if it exists and has files)
if ((Test-Path $paths.CONTRACTS_DIR) -and (Get-ChildItem -Path $paths.CONTRACTS_DIR -ErrorAction SilentlyContinue | Select-Object -First 1)) { 
    $docs += 'contracts/' 
}

if ((Test-Path $flowDir) -and (Get-ChildItem -Path $flowDir -File -ErrorAction SilentlyContinue | Select-Object -First 1)) {
    $docs += 'flows/'
}

if ((Test-Path $uiDir) -and (Get-ChildItem -Path $uiDir -File -ErrorAction SilentlyContinue | Select-Object -First 1)) {
    $docs += 'ui/'
}

if (Test-Path $paths.QUICKSTART) { $docs += 'quickstart.md' }

# Include tasks.md if requested and it exists
if ($IncludeTasks -and (Test-Path $paths.TASKS)) { 
    $docs += 'tasks.md' 
}

# Output results
if ($Json) {
    # JSON output
    [PSCustomObject]@{ 
        FEATURE_DIR = $paths.FEATURE_DIR
        AVAILABLE_DOCS = $docs
        hasActiveFeature = $true
        activeFeature = Split-Path -Leaf $paths.FEATURE_DIR
        featureDir = $paths.FEATURE_DIR
        missing = @()
    } | ConvertTo-Json -Compress
} else {
    # Text output
    Write-Output "FEATURE_DIR:$($paths.FEATURE_DIR)"
    Write-Output "AVAILABLE_DOCS:"
    
    # Show status of each potential document
    Test-FileExists -Path $paths.RESEARCH -Description 'research.md'
    Test-FileExists -Path $paths.DATA_MODEL -Description 'data-model.md'
    Test-DirHasFiles -Path $paths.CONTRACTS_DIR -Description 'contracts/'
    Test-DirHasFiles -Path $flowDir -Description 'flows/'
    Test-DirHasFiles -Path $uiDir -Description 'ui/'
    Test-FileExists -Path $paths.QUICKSTART -Description 'quickstart.md'
    
    if ($IncludeTasks) {
        Test-FileExists -Path $paths.TASKS -Description 'tasks.md'
    }
}
