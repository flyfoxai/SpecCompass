#!/usr/bin/env pwsh
# Common PowerShell functions analogous to common.sh

# Find repository root by searching upward for .specify directory
# This is the primary marker for spec-kit projects
function Find-SpecifyRoot {
    param([string]$StartDir = (Get-Location).Path)

    # Normalize to absolute path to prevent issues with relative paths
    # Use -LiteralPath to handle paths with wildcard characters ([, ], *, ?)
    $resolved = Resolve-Path -LiteralPath $StartDir -ErrorAction SilentlyContinue
    $current = if ($resolved) { $resolved.Path } else { $null }
    if (-not $current) { return $null }

    while ($true) {
        if (Test-Path -LiteralPath (Join-Path $current ".specify") -PathType Container) {
            return $current
        }
        $parent = Split-Path $current -Parent
        if ([string]::IsNullOrEmpty($parent) -or $parent -eq $current) {
            return $null
        }
        $current = $parent
    }
}

# Get repository root, prioritizing .specify directory over git
# This prevents using a parent git repo when spec-kit is initialized in a subdirectory
function Get-RepoRoot {
    # First, look for .specify directory (spec-kit's own marker)
    $specifyRoot = Find-SpecifyRoot
    if ($specifyRoot) {
        return $specifyRoot
    }

    # Fallback to git if no .specify found
    try {
        $result = git rev-parse --show-toplevel 2>$null
        if ($LASTEXITCODE -eq 0) {
            return $result
        }
    } catch {
        # Git command failed
    }

    # Final fallback to script location for non-git repos
    # Use -LiteralPath to handle paths with wildcard characters
    return (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "../../..")).Path
}

function Get-CurrentBranch {
    # First check if SPECIFY_FEATURE environment variable is set
    if ($env:SPECIFY_FEATURE) {
        return $env:SPECIFY_FEATURE
    }

    # Then check git if available at the spec-kit root (not parent)
    $repoRoot = Get-RepoRoot
    if (Test-HasGit) {
        try {
            $result = git -C $repoRoot rev-parse --abbrev-ref HEAD 2>$null
            if ($LASTEXITCODE -eq 0) {
                return $result
            }
        } catch {
            # Git command failed
        }
    }

    # For non-git repos, try to find the latest feature directory
    $specsDir = Join-Path $repoRoot "specs"
    
    if (Test-Path $specsDir) {
        $latestFeature = ""
        $highest = 0
        $latestTimestamp = ""

        Get-ChildItem -Path $specsDir -Directory | ForEach-Object {
            if ($_.Name -match '^(\d{8}-\d{6})-') {
                # Timestamp-based branch: compare lexicographically
                $ts = $matches[1]
                if ($ts -gt $latestTimestamp) {
                    $latestTimestamp = $ts
                    $latestFeature = $_.Name
                }
            } elseif ($_.Name -match '^(\d{3,})-') {
                $num = [long]$matches[1]
                if ($num -gt $highest) {
                    $highest = $num
                    # Only update if no timestamp branch found yet
                    if (-not $latestTimestamp) {
                        $latestFeature = $_.Name
                    }
                }
            }
        }

        if ($latestFeature) {
            return $latestFeature
        }
    }
    
    # Final fallback
    return "main"
}

# Check if we have git available at the spec-kit root level
# Returns true only if git is installed and the repo root is inside a git work tree
# Handles both regular repos (.git directory) and worktrees/submodules (.git file)
function Test-HasGit {
    # First check if git command is available (before calling Get-RepoRoot which may use git)
    if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
        return $false
    }
    $repoRoot = Get-RepoRoot
    # Check if .git exists (directory or file for worktrees/submodules)
    # Use -LiteralPath to handle paths with wildcard characters
    if (-not (Test-Path -LiteralPath (Join-Path $repoRoot ".git"))) {
        return $false
    }
    # Verify it's actually a valid git work tree
    try {
        $null = git -C $repoRoot rev-parse --is-inside-work-tree 2>$null
        return ($LASTEXITCODE -eq 0)
    } catch {
        return $false
    }
}

function Test-FeatureBranch {
    param(
        [string]$Branch,
        [bool]$HasGit = $true
    )
    
    # For non-git repos, we can't enforce branch naming but still provide output
    if (-not $HasGit) {
        Write-Warning "[specify] Warning: Git repository not detected; skipped branch validation"
        return $true
    }
    
    # Accept sequential prefix (3+ digits) but exclude malformed timestamps
    # Malformed: 7-or-8 digit date + 6-digit time with no trailing slug (e.g. "2026031-143022" or "20260319-143022")
    $hasMalformedTimestamp = ($Branch -match '^[0-9]{7}-[0-9]{6}-') -or ($Branch -match '^(?:\d{7}|\d{8})-\d{6}$')
    $isSequential = ($Branch -match '^[0-9]{3,}-') -and (-not $hasMalformedTimestamp)
    if (-not $isSequential -and $Branch -notmatch '^\d{8}-\d{6}-') {
        Write-Output "ERROR: Not on a feature branch. Current branch: $Branch"
        Write-Output "Feature branches should be named like: 001-feature-name, 1234-feature-name, or 20260319-143022-feature-name"
        return $false
    }
    return $true
}

function Get-FeatureDir {
    param([string]$RepoRoot, [string]$Branch)
    Join-Path $RepoRoot "specs/$Branch"
}

function Find-FeatureDirByPrefix {
    param(
        [Parameter(Mandatory = $true)][string]$RepoRoot,
        [Parameter(Mandatory = $true)][string]$BranchName
    )

    $specsDir = Join-Path $RepoRoot 'specs'
    if ($BranchName -match '^(\d{8}-\d{6})-') {
        $prefix = $matches[1]
    } elseif ($BranchName -match '^(\d{3,})-') {
        $prefix = $matches[1]
    } else {
        return (Get-FeatureDir -RepoRoot $RepoRoot -Branch $BranchName)
    }

    if (-not (Test-Path -LiteralPath $specsDir -PathType Container)) {
        return (Join-Path $specsDir $BranchName)
    }

    $matches = Get-ChildItem -LiteralPath $specsDir -Directory -ErrorAction SilentlyContinue |
        Where-Object { $_.Name -like "$prefix-*" } |
        Sort-Object Name

    if ($matches.Count -eq 0) {
        return (Join-Path $specsDir $BranchName)
    }
    if ($matches.Count -eq 1) {
        return $matches[0].FullName
    }

    throw "Multiple spec directories found with prefix '$prefix': $($matches.Name -join ', ')"
}

function Get-FeaturePathsEnv {
    $repoRoot = Get-RepoRoot
    $currentBranch = Get-CurrentBranch
    $hasGit = Test-HasGit

    # Resolve feature directory.  Priority:
    #   1. SPECIFY_FEATURE_DIRECTORY env var (explicit override)
    #   2. .specify/feature.json "feature_directory" key (persisted by /speckit.specify)
    #   3. Branch-prefix-based lookup (legacy fallback)
    $featureJson = Join-Path $repoRoot '.specify/feature.json'
    if ($env:SPECIFY_FEATURE_DIRECTORY) {
        $featureDir = $env:SPECIFY_FEATURE_DIRECTORY
        # Normalize relative paths to absolute under repo root
        if (-not [System.IO.Path]::IsPathRooted($featureDir)) {
            $featureDir = Join-Path $repoRoot $featureDir
        }
    } elseif (Test-Path $featureJson) {
        try {
            $featureConfig = Get-Content $featureJson -Raw | ConvertFrom-Json
            if ($featureConfig.feature_directory) {
                $featureDir = $featureConfig.feature_directory
                # Normalize relative paths to absolute under repo root
                if (-not [System.IO.Path]::IsPathRooted($featureDir)) {
                    $featureDir = Join-Path $repoRoot $featureDir
                }
            } else {
                $featureDir = Find-FeatureDirByPrefix -RepoRoot $repoRoot -BranchName $currentBranch
            }
        } catch {
            $featureDir = Find-FeatureDirByPrefix -RepoRoot $repoRoot -BranchName $currentBranch
        }
    } else {
        $featureDir = Find-FeatureDirByPrefix -RepoRoot $repoRoot -BranchName $currentBranch
    }
    
    [PSCustomObject]@{
        REPO_ROOT     = $repoRoot
        CURRENT_BRANCH = $currentBranch
        HAS_GIT       = $hasGit
        FEATURE_DIR   = $featureDir
        FEATURE_SPEC  = Join-Path $featureDir 'spec.md'
        IMPL_PLAN     = Join-Path $featureDir 'plan.md'
        TASKS         = Join-Path $featureDir 'tasks.md'
        RESEARCH      = Join-Path $featureDir 'research.md'
        DATA_MODEL    = Join-Path $featureDir 'data-model.md'
        QUICKSTART    = Join-Path $featureDir 'quickstart.md'
        CONTRACTS_DIR = Join-Path $featureDir 'contracts'
    }
}

function Test-FileExists {
    param([string]$Path, [string]$Description)
    if (Test-Path -Path $Path -PathType Leaf) {
        Write-Output "  ✓ $Description"
        return $true
    } else {
        Write-Output "  ✗ $Description"
        return $false
    }
}

function Test-DirHasFiles {
    param([string]$Path, [string]$Description)
    if ((Test-Path -Path $Path -PathType Container) -and (Get-ChildItem -Path $Path -ErrorAction SilentlyContinue | Where-Object { -not $_.PSIsContainer } | Select-Object -First 1)) {
        Write-Output "  ✓ $Description"
        return $true
    } else {
        Write-Output "  ✗ $Description"
        return $false
    }
}

# Resolve a template name to a file path using the priority stack:
#   1. .specify/templates/overrides/
#   2. .specify/presets/<preset-id>/templates/ (sorted by priority from .registry)
#   3. .specify/extensions/<ext-id>/templates/
#   4. .specify/templates/ (core)
function Resolve-Template {
    param(
        [Parameter(Mandatory=$true)][string]$TemplateName,
        [Parameter(Mandatory=$true)][string]$RepoRoot
    )

    $base = Join-Path $RepoRoot '.specify/templates'

    # Priority 1: Project overrides
    $override = Join-Path $base "overrides/$TemplateName.md"
    if (Test-Path $override) { return $override }

    # Priority 2: Installed presets (sorted by priority from .registry)
    $presetsDir = Join-Path $RepoRoot '.specify/presets'
    if (Test-Path $presetsDir) {
        $registryFile = Join-Path $presetsDir '.registry'
        $sortedPresets = @()
        if (Test-Path $registryFile) {
            try {
                $registryData = Get-Content $registryFile -Raw | ConvertFrom-Json
                $presets = $registryData.presets
                if ($presets) {
                    $sortedPresets = $presets.PSObject.Properties |
                        Sort-Object { if ($null -ne $_.Value.priority) { $_.Value.priority } else { 10 } } |
                        ForEach-Object { $_.Name }
                }
            } catch {
                # Fallback: alphabetical directory order
                $sortedPresets = @()
            }
        }

        if ($sortedPresets.Count -gt 0) {
            foreach ($presetId in $sortedPresets) {
                $candidate = Join-Path $presetsDir "$presetId/templates/$TemplateName.md"
                if (Test-Path $candidate) { return $candidate }
            }
        } else {
            # Fallback: alphabetical directory order
            foreach ($preset in Get-ChildItem -Path $presetsDir -Directory -ErrorAction SilentlyContinue | Where-Object { $_.Name -notlike '.*' }) {
                $candidate = Join-Path $preset.FullName "templates/$TemplateName.md"
                if (Test-Path $candidate) { return $candidate }
            }
        }
    }

    # Priority 3: Extension-provided templates
    $extDir = Join-Path $RepoRoot '.specify/extensions'
    if (Test-Path $extDir) {
        foreach ($ext in Get-ChildItem -Path $extDir -Directory -ErrorAction SilentlyContinue | Where-Object { $_.Name -notlike '.*' } | Sort-Object Name) {
            $candidate = Join-Path $ext.FullName "templates/$TemplateName.md"
            if (Test-Path $candidate) { return $candidate }
        }
    }

    # Priority 4: Core templates
    $core = Join-Path $base "$TemplateName.md"
    if (Test-Path $core) { return $core }

    return $null
}

function Resolve-TemplateTreeRoot {
    param(
        [Parameter(Mandatory = $true)][string]$TreeName,
        [Parameter(Mandatory = $true)][string]$RepoRoot
    )

    $base = Join-Path $RepoRoot '.specify/templates'

    $override = Join-Path $base "overrides/$TreeName"
    if (Test-Path -LiteralPath $override -PathType Container) { return $override }

    $presetsDir = Join-Path $RepoRoot '.specify/presets'
    if (Test-Path -LiteralPath $presetsDir) {
        $registryFile = Join-Path $presetsDir '.registry'
        $sortedPresets = @()
        if (Test-Path -LiteralPath $registryFile) {
            try {
                $registryData = Get-Content -LiteralPath $registryFile -Raw | ConvertFrom-Json
                $presets = $registryData.presets
                if ($presets) {
                    $sortedPresets = $presets.PSObject.Properties |
                        Sort-Object { if ($null -ne $_.Value.priority) { $_.Value.priority } else { 10 } } |
                        ForEach-Object { $_.Name }
                }
            } catch {
                $sortedPresets = @()
            }
        }

        if ($sortedPresets.Count -gt 0) {
            foreach ($presetId in $sortedPresets) {
                $candidate = Join-Path $presetsDir "$presetId/templates/$TreeName"
                if (Test-Path -LiteralPath $candidate -PathType Container) { return $candidate }
            }
        } else {
            foreach ($preset in Get-ChildItem -Path $presetsDir -Directory -ErrorAction SilentlyContinue | Where-Object { $_.Name -notlike '.*' }) {
                $candidate = Join-Path $preset.FullName "templates/$TreeName"
                if (Test-Path -LiteralPath $candidate -PathType Container) { return $candidate }
            }
        }
    }

    $extDir = Join-Path $RepoRoot '.specify/extensions'
    if (Test-Path -LiteralPath $extDir) {
        foreach ($ext in Get-ChildItem -Path $extDir -Directory -ErrorAction SilentlyContinue | Where-Object { $_.Name -notlike '.*' } | Sort-Object Name) {
            $candidate = Join-Path $ext.FullName "templates/$TreeName"
            if (Test-Path -LiteralPath $candidate -PathType Container) { return $candidate }
        }
    }

    $core = Join-Path $base $TreeName
    if (Test-Path -LiteralPath $core -PathType Container) { return $core }

    return $null
}

function Get-FeatureSlugFromBranch {
    param([Parameter(Mandatory = $true)][string]$BranchName)

    $slug = Split-Path $BranchName -Leaf
    $slug = $slug -replace '^[0-9]{8}-[0-9]{6}-', ''
    $slug = $slug -replace '^[0-9]{3,}-', ''
    if ([string]::IsNullOrWhiteSpace($slug)) {
        $slug = Split-Path $BranchName -Leaf
    }
    return $slug
}

function Get-FeatureTitleFromBranch {
    param([Parameter(Mandatory = $true)][string]$BranchName)

    $slug = Get-FeatureSlugFromBranch -BranchName $BranchName
    $words = $slug -split '-' | Where-Object { $_ }
    return (($words | ForEach-Object {
        if ($_.Length -gt 1) {
            $_.Substring(0, 1).ToUpper() + $_.Substring(1)
        } else {
            $_.ToUpper()
        }
    }) -join ' ')
}

function Write-FeatureContext {
    param(
        [Parameter(Mandatory = $true)][string]$RepoRoot,
        [Parameter(Mandatory = $true)][string]$FeatureDir
    )

    $relative = [System.IO.Path]::GetRelativePath($RepoRoot, $FeatureDir) -replace '\\', '/'
    $featureJson = Join-Path $RepoRoot '.specify/feature.json'
    New-Item -ItemType Directory -Path (Split-Path $featureJson -Parent) -Force | Out-Null
    $payload = @{ feature_directory = $relative } | ConvertTo-Json
    Set-Content -LiteralPath $featureJson -Value ($payload + [Environment]::NewLine) -Encoding utf8
}

function Normalize-FeatureDescription {
    param(
        [string]$Description,
        [Parameter(Mandatory = $true)][string]$BranchName
    )

    $normalized = (($Description ?? '') -replace '\s+', ' ').Trim()
    if ([string]::IsNullOrWhiteSpace($normalized)) {
        $normalized = Get-FeatureTitleFromBranch -BranchName $BranchName
    }
    return $normalized
}

function Render-FeatureTemplate {
    param(
        [Parameter(Mandatory = $true)][string]$SourcePath,
        [Parameter(Mandatory = $true)][string]$BranchName,
        [Parameter(Mandatory = $true)][string]$FeatureDir,
        [string]$FeatureDescription = ''
    )

    $repoRoot = Get-RepoRoot
    $featureSlug = Get-FeatureSlugFromBranch -BranchName $BranchName
    $featureTitle = Get-FeatureTitleFromBranch -BranchName $BranchName
    $featureDate = Get-Date -Format 'yyyy-MM-dd'
    $featurePath = [System.IO.Path]::GetRelativePath($repoRoot, $FeatureDir) -replace '\\', '/'
    $featureDescription = Normalize-FeatureDescription -Description $FeatureDescription -BranchName $BranchName

    $content = Get-Content -LiteralPath $SourcePath -Raw
    $content = $content.Replace('__FEATURE_BRANCH__', $BranchName)
    $content = $content.Replace('__FEATURE_SLUG__', $featureSlug)
    $content = $content.Replace('__FEATURE_TITLE__', $featureTitle)
    $content = $content.Replace('__FEATURE_DATE__', $featureDate)
    $content = $content.Replace('__FEATURE_PATH__', $featurePath)
    $content = $content.Replace('__FEATURE_DESCRIPTION__', $featureDescription)
    return $content
}

function Copy-InstantiatedTemplateFile {
    param(
        [Parameter(Mandatory = $true)][string]$SourcePath,
        [Parameter(Mandatory = $true)][string]$DestinationPath,
        [Parameter(Mandatory = $true)][string]$BranchName,
        [Parameter(Mandatory = $true)][string]$FeatureDir,
        [string]$FeatureDescription = ''
    )

    if (-not (Test-Path -LiteralPath $SourcePath -PathType Leaf)) { return }

    New-Item -ItemType Directory -Path (Split-Path $DestinationPath -Parent) -Force | Out-Null
    $content = Render-FeatureTemplate -SourcePath $SourcePath -BranchName $BranchName -FeatureDir $FeatureDir -FeatureDescription $FeatureDescription
    Set-Content -LiteralPath $DestinationPath -Value $content -Encoding utf8
}

function Copy-InstantiatedTemplateTree {
    param(
        [Parameter(Mandatory = $true)][string]$TemplateRoot,
        [Parameter(Mandatory = $true)][string]$TargetRoot,
        [Parameter(Mandatory = $true)][string]$BranchName,
        [string]$FeatureDescription = ''
    )

    if (-not (Test-Path -LiteralPath $TemplateRoot -PathType Container)) { return }

    Get-ChildItem -LiteralPath $TemplateRoot -Recurse -File | ForEach-Object {
        $relative = [System.IO.Path]::GetRelativePath($TemplateRoot, $_.FullName)
        $destination = Join-Path $TargetRoot $relative
        if (Test-Path -LiteralPath $destination) { return }

        Copy-InstantiatedTemplateFile -SourcePath $_.FullName -DestinationPath $destination -BranchName $BranchName -FeatureDir $TargetRoot -FeatureDescription $FeatureDescription
    }
}

function Resolve-ActiveFeatureName {
    param(
        [Parameter(Mandatory = $true)][string]$RepoRoot,
        [string]$ExplicitFeatureDir = ''
    )

    if ($ExplicitFeatureDir -and (Test-Path -LiteralPath $ExplicitFeatureDir -PathType Container)) {
        return (Split-Path $ExplicitFeatureDir -Leaf)
    }

    $featureJson = Join-Path $RepoRoot '.specify/feature.json'
    if (Test-Path -LiteralPath $featureJson -PathType Leaf) {
        try {
            $featureConfig = Get-Content -LiteralPath $featureJson -Raw | ConvertFrom-Json
            if ($featureConfig.feature_directory) {
                return (Split-Path $featureConfig.feature_directory -Leaf)
            }
        } catch {
        }
    }

    $specsDir = Join-Path $RepoRoot 'specs'
    if (Test-Path -LiteralPath $specsDir -PathType Container) {
        $matches = Get-ChildItem -LiteralPath $specsDir -Directory -ErrorAction SilentlyContinue | Sort-Object Name
        if ($matches.Count -eq 1) {
            return $matches[0].Name
        }
    }

    return ''
}

function Get-FeatureStageLabel {
    param([Parameter(Mandatory = $true)][string]$FeatureDir)

    if (Test-Path -LiteralPath (Join-Path $FeatureDir 'tasks.md') -PathType Leaf) { return 'tasks prepared' }
    if (Test-Path -LiteralPath (Join-Path $FeatureDir 'plan.md') -PathType Leaf) { return 'planning ready' }
    if (Test-Path -LiteralPath (Join-Path $FeatureDir 'bundle.md') -PathType Leaf) { return 'bundle ready' }
    if (Test-Path -LiteralPath (Join-Path $FeatureDir 'gate.md') -PathType Leaf) { return 'gate documented' }
    if (Test-Path -LiteralPath (Join-Path $FeatureDir 'clarifications.md') -PathType Leaf) { return 'clarified' }
    if (Test-Path -LiteralPath (Join-Path $FeatureDir 'spec.md') -PathType Leaf) { return 'specified' }
    return 'scaffolded'
}

function Get-FeatureStatusVerdict {
    param(
        [Parameter(Mandatory = $true)][string]$FilePath,
        [Parameter(Mandatory = $true)][string]$DefaultValue
    )

    if (-not (Test-Path -LiteralPath $FilePath -PathType Leaf)) { return $DefaultValue }

    $content = Get-Content -LiteralPath $FilePath -Raw
    $verdictLine = ($content -split "`r?`n" | Where-Object { $_ -match 'Current Verdict:' } | Select-Object -First 1)
    if ($verdictLine) {
        $match = [regex]::Match($verdictLine, '^[\s-]*Current Verdict:\s*`?([^`]+)`?\s*$')
        if ($match.Success) {
            return $match.Groups[1].Value
        }
    }

    if ($content -match '\bFAIL\b') { return 'FAIL' }
    if ($content -match '\bPASS\b') { return 'PASS' }
    return 'recorded'
}

function Get-FeaturePrimaryWorkset {
    param([Parameter(Mandatory = $true)][string]$FeatureDir)

    $worksetsDir = Join-Path $FeatureDir 'memory/worksets'
    if (-not (Test-Path -LiteralPath $worksetsDir -PathType Container)) { return 'not selected' }

    $first = Get-ChildItem -LiteralPath $worksetsDir -File -Filter 'ws-*.md' -ErrorAction SilentlyContinue |
        Sort-Object Name |
        Select-Object -First 1
    if ($first) {
        return [System.IO.Path]::GetFileNameWithoutExtension($first.Name)
    }

    return 'not selected'
}

function Sync-ProjectMemory {
    param(
        [Parameter(Mandatory = $true)][string]$RepoRoot,
        [string]$ExplicitFeatureDir = ''
    )

    $memoryDir = Join-Path $RepoRoot '.specify/memory'
    New-Item -ItemType Directory -Path $memoryDir -Force | Out-Null

    $projectName = Split-Path $RepoRoot -Leaf
    $refreshDate = Get-Date -Format 'yyyy-MM-dd'
    $activeFeature = Resolve-ActiveFeatureName -RepoRoot $RepoRoot -ExplicitFeatureDir $ExplicitFeatureDir
    $activeFeatureDir = ''
    if ($activeFeature) {
        $candidate = Join-Path $RepoRoot "specs/$activeFeature"
        if (Test-Path -LiteralPath $candidate -PathType Container) {
            $activeFeatureDir = $candidate
        } else {
            $activeFeature = ''
        }
    }

    $featureRows = @()
    $featureCount = 0
    $specsDir = Join-Path $RepoRoot 'specs'
    if (Test-Path -LiteralPath $specsDir -PathType Container) {
        foreach ($featureDir in (Get-ChildItem -LiteralPath $specsDir -Directory -ErrorAction SilentlyContinue | Sort-Object Name)) {
            $featureName = $featureDir.Name
            $stage = Get-FeatureStageLabel -FeatureDir $featureDir.FullName
            $gate = Get-FeatureStatusVerdict -FilePath (Join-Path $featureDir.FullName 'gate.md') -DefaultValue 'n/a'
            $analysis = Get-FeatureStatusVerdict -FilePath (Join-Path $featureDir.FullName 'analysis.md') -DefaultValue 'n/a'
            $workset = Get-FeaturePrimaryWorkset -FeatureDir $featureDir.FullName
            $entry = "specs/$featureName/memory/index.md"
            $featureRows += "| ``$featureName`` | n/a | $stage | $gate | $analysis | ``$entry`` | ``$workset`` |"
            $featureCount += 1
        }
    }
    if ($featureCount -eq 0) {
        $featureRows = @('| no feature yet | n/a | not started | n/a | n/a | create with `sp.specify` | n/a |')
    }

    if ($activeFeatureDir) {
        $activeWorkset = Get-FeaturePrimaryWorkset -FeatureDir $activeFeatureDir
        $activeStage = Get-FeatureStageLabel -FeatureDir $activeFeatureDir
        $latestGate = Get-FeatureStatusVerdict -FilePath (Join-Path $activeFeatureDir 'gate.md') -DefaultValue 'not available'
        $latestAnalysis = Get-FeatureStatusVerdict -FilePath (Join-Path $activeFeatureDir 'analysis.md') -DefaultValue 'not available'
    } else {
        $activeWorkset = 'not selected'
        $activeStage = 'document-stage framework bootstrapped'
        $latestGate = 'not available'
        $latestAnalysis = 'not available'
    }

    $activeFeatureLabel = if ($activeFeature) { "``$activeFeature``" } else { 'not selected' }

    $projectIndex = @"
# Project Memory Index

## Question Routing Matrix

| If The Question Is About... | Keywords | Recommended Feature | Read First | Next Hop |
| --- | --- | --- | --- | --- |
| project rules, phase boundaries, what is forbidden now | constitution, boundary, phase, scope, implement | project-level | ``constitution.md`` | update the project-level memory files |
| which feature to enter, what to read first, current smallest work area | active feature, read order, workset, smallest context | $(if ($activeFeature) { $activeFeature } else { 'select from feature-map' }) | ``active-context.md`` | enter the routed feature memory index |
| overall feature stage, gate verdict, readiness, workset count | stage, verdict, readiness, gate, analyze | feature-level | ``feature-map.md`` | inspect the matching feature row |
| shared object, business domain, cross-feature consistency | domain, object, shared rule, ownership | project-level | ``domain-map.md`` | register shared objects and domains |
| repeated high-risk topics, rollback entry, where drift may happen | hotspot, risk, rollback, drift | project-level | ``hotspots.md`` | refresh after the next analysis |

## Current Snapshot

| Key | Value |
| --- | --- |
| Project | ``$projectName`` |
| Stage | $activeStage |
| Active Feature | $activeFeatureLabel |
| Primary Workset | ``$activeWorkset`` |
| Latest Gate | $latestGate |
| Latest Analysis | $latestAnalysis |
| Refresh Date | ``$refreshDate`` |

## Current Minimum Read Set

| Order | File | Why It Is In The Minimum Set |
| --- | --- | --- |
| 1 | ``project-index.md`` | first-hop routing |
| 2 | ``constitution.md`` | confirms phase boundary and workflow rules |
| 3 | ``active-context.md`` | confirms the active feature and read set |
| 4 | ``feature-map.md`` | shows every known feature and stage |
| 5 | ``domain-map.md`` | shows shared objects and domains |

## Current Focus

| Topic | Recommended Entry | Why Now |
| --- | --- | --- |
| active feature routing | ``active-context.md`` | keeps the next read bounded |
| feature inventory and stage checks | ``feature-map.md`` | keeps stage and verdict drift visible |
| project boundary alignment | ``constitution.md`` | preserves workflow rules before deeper work |

## Latest Summary

- Project-level memory was refreshed from the current workspace state.
- Active feature: $activeFeatureLabel.
- Primary workset: ``$activeWorkset``.
- Feature count: ``$featureCount``.
"@
    Set-Content -LiteralPath (Join-Path $memoryDir 'project-index.md') -Value $projectIndex -Encoding utf8

    if ($activeFeatureDir) {
        $activeContext = @"
# Active Context

## Current Goal And Minimum Read Set

| Key | Value |
| --- | --- |
| Current Goal | keep ``$activeFeature`` aligned for the next ``sp.*`` step |
| Active Feature | ``$activeFeature`` |
| Primary Workset | ``$activeWorkset`` |
| Highest Risk | project-level routing drifting away from ``specs/$activeFeature/`` |
| No-Go Boundary | do not leave documentation work and do not skip the routed minimum set |
| Refresh Date | ``$refreshDate`` |
| Refresh Basis | ``.specify/feature.json``, ``feature-map.md``, workspace files |
| Source Of Truth | ``specs/$activeFeature/memory/index.md``, ``specs/$activeFeature/spec.md``, ``specs/$activeFeature/plan.md`` |
| Required Sync Files | ``project-index.md``, ``feature-map.md``, ``specs/$activeFeature/memory/index.md`` |
| Stale Trigger | active feature changes, workset changes, or stage files change |

## Minimum Read Set

| Order | File | Why It Is Required |
| --- | --- | --- |
| 1 | ``.specify/memory/project-index.md`` | confirms project-level route |
| 2 | ``.specify/memory/constitution.md`` | confirms workflow and phase boundary |
| 3 | ``.specify/memory/feature-map.md`` | confirms feature registration state |
| 4 | ``specs/$activeFeature/memory/index.md`` | enters the active feature routing layer |
| 5 | ``specs/$activeFeature/memory/worksets/$activeWorkset.md`` | narrows to the current bounded work area |

## Workset Routing

| If You Need To... | Choose | Why |
| --- | --- | --- |
| refresh feature-level routing | ``specs/$activeFeature/memory/index.md`` | it is the entry point for this feature |
| work inside the current bounded area | ``specs/$activeFeature/memory/worksets/$activeWorkset.md`` | it is the current smallest useful read set |
| verify stage readiness | ``specs/$activeFeature/plan.md`` | it reflects the current delivery stage |

## Current Highest-Risk Area

| Priority | Topic | Entry |
| --- | --- | --- |
| ``High`` | project-level routing falling behind feature-level reality | ``specs/$activeFeature/memory/index.md`` |
"@
    } else {
        $activeContext = @"
# Active Context

## Current Goal And Minimum Read Set

| Key | Value |
| --- | --- |
| Current Goal | choose the active feature before deeper document work |
| Active Feature | not selected |
| Primary Workset | not selected |
| Highest Risk | entering deep design with no routed feature |
| No-Go Boundary | do not enter implementation and do not invent an active feature |
| Refresh Date | ``$refreshDate`` |
| Refresh Basis | ``project-index.md``, ``feature-map.md``, workspace files |
| Source Of Truth | ``project-index.md``, ``feature-map.md`` |
| Required Sync Files | ``project-index.md``, ``feature-map.md`` |
| Stale Trigger | feature selection changes or the first feature is created |

## Minimum Read Set

| Order | File | Why It Is Required |
| --- | --- | --- |
| 1 | ``.specify/memory/project-index.md`` | confirms project-level route |
| 2 | ``.specify/memory/constitution.md`` | confirms workflow and phase boundary |
| 3 | ``.specify/memory/feature-map.md`` | confirms which feature can be entered |

## Selection Rule

- If exactly one feature exists, treat it as the default active candidate.
- If multiple features exist, resolve with branch, environment, explicit target, and stage evidence before deeper reads.
"@
    }
    Set-Content -LiteralPath (Join-Path $memoryDir 'active-context.md') -Value $activeContext -Encoding utf8

    $featureMapBody = @(
        '# Feature Map',
        '',
        '## Registered Features',
        '',
        '| Feature | Owner | Stage | Gate | Analysis | Memory Entry | Primary Workset |',
        '| --- | --- | --- | --- | --- | --- | --- |'
    ) + $featureRows + @(
        '',
        '## Selection Guidance',
        '',
        '- Prefer the active feature from `.specify/feature.json` when it still matches the workspace.',
        '- If routing conflicts with feature-level memory, prefer the freshest feature-level source and refresh project memory.',
        "- Refresh date: ``$refreshDate``."
    )
    Set-Content -LiteralPath (Join-Path $memoryDir 'feature-map.md') -Value ($featureMapBody -join [Environment]::NewLine) -Encoding utf8
}
