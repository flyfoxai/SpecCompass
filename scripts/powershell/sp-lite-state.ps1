#!/usr/bin/env pwsh

[CmdletBinding()]
param([switch]$Json, [switch]$Signature, [switch]$Help)

$ErrorActionPreference = 'Stop'
if ($Help) {
    Write-Output 'Usage: sp-lite-state.ps1 [-Json | -Signature]'
    exit 0
}

. "$PSScriptRoot/common.ps1"
$repoRoot = Get-RepoRoot
$script:computedInputSignature = ''
$script:recordedInputSignature = ''

function Convert-Refs([string]$Value) {
    if ([string]::IsNullOrWhiteSpace($Value) -or $Value -cin @('None', 'none', '[]')) { return @() }
    return @($Value -split ',' | ForEach-Object { $_.Trim() } | Where-Object { $_ })
}

function Emit-LiteRoute {
    param(
        [string]$Status, [string]$Next, [string]$Reason,
        [string]$ActiveFeature = '', [string]$FeatureDir = '',
        [string]$ActiveRound = 'None', [string]$ActiveRoundState = 'NOT_STARTED',
        [string]$GlobalControl = 'CLEAR', [bool]$ContinueAllowed = $false,
        [bool]$RequiresHuman = $false, [string]$BlockerType = 'NONE',
        [string]$BlockerRoute = '/sp.lite', [string]$ReuseRefs = 'None',
        [string]$ConflictRefs = 'None', [string]$StaleRefs = 'None',
        [string]$RegressionFailures = 'None'
    )
    $payload = [ordered]@{
        schema = 'speckit.lite.route.v1'
        status = $Status
        next = $Next
        reason = $Reason
        activeFeature = $ActiveFeature
        featureDir = $FeatureDir
        activeRound = $ActiveRound
        activeRoundState = $ActiveRoundState
        globalControl = $GlobalControl
        globalInputSignature = $script:recordedInputSignature
        currentInputSignature = $script:computedInputSignature
        continueAllowed = $ContinueAllowed
        requiresHuman = $RequiresHuman
        blockerType = $BlockerType
        blockerRoute = $BlockerRoute
        reuseRefs = @(Convert-Refs $ReuseRefs)
        conflictRefs = @(Convert-Refs $ConflictRefs)
        staleRefs = @(Convert-Refs $StaleRefs)
        regressionFailures = @(Convert-Refs $RegressionFailures)
    }
    if ($Json) { $payload | ConvertTo-Json -Compress -Depth 4 }
    else { Write-Output "Status: $Status`nNext: $Next`nReason: $Reason" }
}

function Test-SignatureExcluded([string]$Relative, [string]$LiteRelative) {
    if ($LiteRelative -and $Relative -ceq $LiteRelative) { return $true }
    return $Relative -cmatch '^(\.git|\.venv|node_modules|dist|build|output|\.pytest_cache|\.mypy_cache|\.ruff_cache)/' -or
        $Relative -cmatch '(^|/)__pycache__/' -or
        $Relative -cmatch '^\.specify/workflows/runs/'
}

function Get-FileSha256([string]$Path) {
    return (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash.ToLowerInvariant()
}

function Get-GitNullDelimitedPaths([string]$Root) {
    $startInfo = [Diagnostics.ProcessStartInfo]::new()
    $startInfo.FileName = 'git'
    $startInfo.ArgumentList.Add('-C')
    $startInfo.ArgumentList.Add($Root)
    $listFilesArguments = 'ls-files -co --exclude-standard -z'.Split(
        ' ', [StringSplitOptions]::RemoveEmptyEntries
    )
    foreach ($argument in $listFilesArguments) {
        $startInfo.ArgumentList.Add($argument)
    }
    $startInfo.UseShellExecute = $false
    $startInfo.RedirectStandardOutput = $true
    $startInfo.RedirectStandardError = $true

    $process = [Diagnostics.Process]::new()
    $process.StartInfo = $startInfo
    $null = $process.Start()
    $stream = [IO.MemoryStream]::new()
    try {
        $process.StandardOutput.BaseStream.CopyTo($stream)
        $stderr = $process.StandardError.ReadToEnd()
        $process.WaitForExit()
        if ($process.ExitCode -ne 0) {
            throw "git ls-files failed: $stderr"
        }
        $raw = [Text.UTF8Encoding]::new($false, $true).GetString($stream.ToArray())
        return @($raw.Split([char]0, [StringSplitOptions]::RemoveEmptyEntries))
    }
    finally {
        $stream.Dispose()
        $process.Dispose()
    }
}

function Get-InputSignature([string]$Root, [string]$Dir) {
    $rootFull = [IO.Path]::GetFullPath($Root).TrimEnd([IO.Path]::DirectorySeparatorChar, [IO.Path]::AltDirectorySeparatorChar)
    $dirFull = [IO.Path]::GetFullPath($Dir)
    $liteRelative = ''
    if ($dirFull.StartsWith("$rootFull$([IO.Path]::DirectorySeparatorChar)", [StringComparison]::Ordinal)) {
        $liteRelative = ([IO.Path]::GetRelativePath($rootFull, (Join-Path $dirFull 'lite.md'))) -replace '\\', '/'
    }

    $lines = [Collections.Generic.List[string]]::new()
    & git -C $rootFull rev-parse --is-inside-work-tree *> $null
    if ($LASTEXITCODE -eq 0) {
        $head = [string]((& git -C $rootFull rev-parse HEAD 2>$null | Select-Object -First 1))
        if (-not $head) { $head = 'NO_HEAD' }
        $lines.Add("HEAD`t$head")
        $relativePaths = @(Get-GitNullDelimitedPaths $rootFull)
        [Array]::Sort($relativePaths, [StringComparer]::Ordinal)
        foreach ($relative in $relativePaths) {
            $relative = $relative -replace '\\', '/'
            if (Test-SignatureExcluded $relative $liteRelative) { continue }
            $path = Join-Path $rootFull $relative
            if (Test-Path -LiteralPath $path -PathType Leaf) {
                $lines.Add("$relative`t$(Get-FileSha256 $path)")
            }
        }
    }
    else {
        $relativePaths = @(Get-ChildItem -LiteralPath $rootFull -File -Recurse -ErrorAction SilentlyContinue | ForEach-Object {
            ([IO.Path]::GetRelativePath($rootFull, $_.FullName)) -replace '\\', '/'
        })
        [Array]::Sort($relativePaths, [StringComparer]::Ordinal)
        foreach ($relative in $relativePaths) {
            if (Test-SignatureExcluded $relative $liteRelative) { continue }
            $lines.Add("$relative`t$(Get-FileSha256 (Join-Path $rootFull $relative))")
        }
    }

    $manifest = if ($lines.Count) { ($lines -join "`n") + "`n" } else { '' }
    $bytes = [Text.UTF8Encoding]::new($false).GetBytes($manifest)
    $sha = [Security.Cryptography.SHA256]::Create()
    try {
        return -join ($sha.ComputeHash($bytes) | ForEach-Object { $_.ToString('x2') })
    }
    finally { $sha.Dispose() }
}

function Resolve-FeatureDir {
    if ($env:SPECIFY_FEATURE_DIRECTORY) {
        $path = $env:SPECIFY_FEATURE_DIRECTORY
        if (-not [IO.Path]::IsPathRooted($path)) { $path = Join-Path $repoRoot $path }
        return $path
    }
    $featureJson = Join-Path $repoRoot '.specify/feature.json'
    if (Test-Path -LiteralPath $featureJson -PathType Leaf) {
        try { $path = [string]((Get-Content -LiteralPath $featureJson -Raw | ConvertFrom-Json).feature_directory) }
        catch { $path = '' }
        if ($path) {
            if (-not [IO.Path]::IsPathRooted($path)) { $path = Join-Path $repoRoot $path }
            return $path
        }
    }
    $candidates = @(Get-ChildItem -LiteralPath (Join-Path $repoRoot 'specs') -Directory -ErrorAction SilentlyContinue | Sort-Object FullName)
    if ($candidates.Count -eq 1) { return $candidates[0].FullName }
    return $null
}

function Get-Field([string]$Path, [string]$Label) {
    $prefix = "- ${Label}:"
    $line = Get-Content -LiteralPath $Path | Where-Object { $_.StartsWith($prefix) } | Select-Object -First 1
    if (-not $line) { return '' }
    return $line.Substring($prefix.Length).Trim()
}

function Test-ReadyFiles([string]$Dir, [string[]]$Names) {
    $paths = $Names | ForEach-Object { Join-Path $Dir $_ }
    foreach ($path in $paths) {
        if (-not (Test-Path -LiteralPath $path -PathType Leaf)) { return $false }
        if (Select-String -LiteralPath $path -Pattern 'SP_STAGE_SEED:' -Quiet) { return $false }
    }
    return $true
}

$featureDir = Resolve-FeatureDir
if (-not $featureDir -or -not (Test-Path -LiteralPath $featureDir -PathType Container)) {
    Emit-LiteRoute -Status NEEDS_FOUNDATION -Next /sp.prd -Reason no-active-feature -FeatureDir ([string]$featureDir) -GlobalControl STALE_EVIDENCE -RequiresHuman $true -BlockerType MISSING_FOUNDATION -BlockerRoute /sp.prd -StaleRefs feature
    exit 0
}
$activeFeature = Split-Path -Leaf $featureDir
$script:computedInputSignature = Get-InputSignature $repoRoot $featureDir
if ($Signature) {
    Write-Output $script:computedInputSignature
    exit 0
}

if (-not (Test-ReadyFiles $featureDir @('prd.md', 'spec-outline.md'))) {
    Emit-LiteRoute -Status NEEDS_FOUNDATION -Next /sp.prd -Reason foundation-incomplete -ActiveFeature $activeFeature -FeatureDir $featureDir -GlobalControl CLEAR -ContinueAllowed $true -BlockerType MISSING_FOUNDATION -BlockerRoute /sp.prd
    exit 0
}

if (-not (Test-ReadyFiles $featureDir @('spec.md'))) {
    Emit-LiteRoute -Status NEEDS_SPEC -Next /sp.specify -Reason spec-missing-or-seed -ActiveFeature $activeFeature -FeatureDir $featureDir -GlobalControl CLEAR -ContinueAllowed $true -BlockerType MISSING_SPEC -BlockerRoute /sp.specify
    exit 0
}

$liteFile = Join-Path $featureDir 'lite.md'
if (-not (Test-Path -LiteralPath $liteFile -PathType Leaf) -or (Select-String -LiteralPath $liteFile -Pattern 'SP_STAGE_SEED:\s*lite' -Quiet)) {
    Emit-LiteRoute -Status NEEDS_CANDIDATES -Next /sp.lite -Reason human-direction-selection-required -ActiveFeature $activeFeature -FeatureDir $featureDir -RequiresHuman $true -BlockerType HUMAN_SELECTION -BlockerRoute /sp.lite
    exit 0
}

$state = Get-Field $liteFile 'State'; if (-not $state) { $state = 'NEEDS_CANDIDATES' }
$activeRound = Get-Field $liteFile 'Active Round'; if (-not $activeRound) { $activeRound = 'None' }
$roundState = Get-Field $liteFile 'Active Round State'; if (-not $roundState) { $roundState = 'NOT_STARTED' }
$humanSelection = Get-Field $liteFile 'Human Direction Selection'
$globalStatus = Get-Field $liteFile 'Global Status'; if (-not $globalStatus) { $globalStatus = 'STALE_EVIDENCE' }
$globalInput = Get-Field $liteFile 'Global Input Signature'
$script:recordedInputSignature = $globalInput
$currentInput = $script:computedInputSignature
$reuseRefs = Get-Field $liteFile 'Reuse Refs'
$conflictRefs = Get-Field $liteFile 'Conflict Refs'
$staleRefs = Get-Field $liteFile 'Stale Refs'
$regressionFailures = Get-Field $liteFile 'Regression Failures'
$blockerRoute = Get-Field $liteFile 'Blocker Route'
$selectedCandidate = Get-Field $liteFile 'Selected Candidate'
$includedAnchors = Get-Field $liteFile 'Included Outline Anchors'
$allowedWriteSet = Get-Field $liteFile 'Allowed Write Set'
$completedStages = Get-Field $liteFile 'Completed Owner Stages'
$skippedStages = Get-Field $liteFile 'Skipped Owner Stages'
$stageEvidenceRefs = Get-Field $liteFile 'Stage Evidence Refs'
$stageSourceSignatures = Get-Field $liteFile 'Stage Source Signatures'
$stageSkipReasons = Get-Field $liteFile 'Stage Skip Reasons'
$stageSkipConfirmations = Get-Field $liteFile 'Stage Skip Confirmations'
$completionEvidence = Get-Field $liteFile 'Completion Evidence'
if ($blockerRoute -cnotmatch '^/sp\.[A-Za-z0-9._-]+$') { $blockerRoute = '/sp.lite' }

$common = @{
    Status = $state; ActiveFeature = $activeFeature; FeatureDir = $featureDir
    ActiveRound = $activeRound; ActiveRoundState = $roundState
    ReuseRefs = $reuseRefs; ConflictRefs = $conflictRefs; StaleRefs = $staleRefs
    RegressionFailures = $regressionFailures; RequiresHuman = $true
}

if ($globalInput -and $globalInput -cne 'None' -and $globalInput -cne $currentInput) {
    if (-not $staleRefs -or $staleRefs -ceq 'None') { $common.StaleRefs = 'global-input-signature' }
    Emit-LiteRoute @common -Next /sp.lite -Reason global-input-signature-changed -GlobalControl STALE_EVIDENCE -BlockerType STALE_EVIDENCE -BlockerRoute /sp.lite
    exit 0
}

function Test-Refs([string]$Value) {
    return (-not [string]::IsNullOrWhiteSpace($Value) -and $Value -cnotin @('None', 'none', '[]'))
}

function Test-CsvToken([string]$Value, [string]$Wanted) {
    return @(Convert-Refs $Value) -ccontains $Wanted
}

function Get-StageRef([string]$Stage, [string]$DefaultRef) {
    foreach ($entry in @(Convert-Refs $stageEvidenceRefs)) {
        if ($entry.StartsWith("$Stage=", [StringComparison]::Ordinal)) {
            return $entry.Substring($Stage.Length + 1)
        }
    }
    return $DefaultRef
}

function Get-StageSourceSignature([string]$Stage) {
    foreach ($entry in @(Convert-Refs $stageSourceSignatures)) {
        if ($entry.StartsWith("$Stage=", [StringComparison]::Ordinal)) {
            $value = $entry.Substring($Stage.Length + 1)
            if ($value -cmatch '^[0-9a-fA-F]{64}$') { return $value }
            return ''
        }
    }
    return ''
}

function Get-EvidenceField([string]$EvidenceFile, [string]$Label) {
    foreach ($line in [IO.File]::ReadLines($EvidenceFile)) {
        $normalized = $line.TrimStart()
        if ($normalized.StartsWith('-', [StringComparison]::Ordinal)) {
            $normalized = $normalized.Substring(1).TrimStart()
        }
        $prefix = "${Label}:"
        if ($normalized.StartsWith($prefix, [StringComparison]::Ordinal)) {
            return $normalized.Substring($prefix.Length).Trim()
        }
    }
    return ''
}

function Test-RoundStageEvidence([string]$Stage, [string]$EvidenceFile) {
    $expectedSignature = Get-StageSourceSignature $Stage
    if (-not $expectedSignature) { return $false }
    if ((Get-EvidenceField $EvidenceFile 'Lite Round') -cne $activeRound) { return $false }
    if ((Get-EvidenceField $EvidenceFile 'Lite Stage') -cne $Stage) { return $false }
    if ((Get-EvidenceField $EvidenceFile 'Source Signature') -cne $expectedSignature) { return $false }
    if ((Get-EvidenceField $EvidenceFile 'Included Outline Anchors') -cne $includedAnchors) { return $false }
    if ($Stage -cin @('FLOW', 'UI') -and (Get-EvidenceField $EvidenceFile 'Human Confirmation') -cne 'CONFIRMED') { return $false }
    if ($Stage -ceq 'PLAN' -and (Get-EvidenceField $EvidenceFile 'Human Approval') -cne 'CONFIRMED') { return $false }
    return $true
}

function Get-ProtectedStageBasename([string]$Stage) {
    switch -CaseSensitive ($Stage) {
        'BUSINESS_GATE' { return 'business-gate.md' }
        'PRE_IMPL_ANALYZE' { return 'pre-impl-analysis.md' }
        'PRE_IMPL_GATE' { return 'pre-impl-gate.md' }
        'FINAL_ANALYZE' { return 'final-analysis.md' }
        'FINAL_GATE' { return 'final-gate.md' }
        default { return '' }
    }
}

function Get-ProtectedStageGateMode([string]$Stage) {
    switch -CaseSensitive ($Stage) {
        'BUSINESS_GATE' { return 'Business' }
        'PRE_IMPL_GATE' { return 'Implementation Readiness' }
        'FINAL_GATE' { return 'Implementation Regression' }
        default { return '' }
    }
}

function Test-ProtectedStageEvidence([string]$Stage, [string]$Ref, [string]$EvidenceFile) {
    $basename = Get-ProtectedStageBasename $Stage
    if (-not $basename) { return $true }
    $expectedRef = "lite-evidence/$activeRound/$basename"
    if ($Ref -cne $expectedRef) { return $false }

    foreach ($other in @('BUSINESS_GATE', 'PRE_IMPL_ANALYZE', 'PRE_IMPL_GATE', 'FINAL_ANALYZE', 'FINAL_GATE')) {
        if ($other -ceq $Stage) { continue }
        $otherRef = Get-StageRef $other ''
        if ($otherRef -and $otherRef -ceq $Ref) { return $false }
    }

    if (-not (Test-RoundStageEvidence $Stage $EvidenceFile)) { return $false }

    $gateMode = Get-ProtectedStageGateMode $Stage
    if ($gateMode) {
        $modePattern = '^\s*(?:-\s*)?Gate Mode:\s*' + [regex]::Escape($gateMode) + '\s*$'
        if (-not (Select-String -LiteralPath $EvidenceFile -Pattern $modePattern -CaseSensitive -Quiet)) { return $false }
    }
    return $true
}

function Test-StageSkipReason([string]$Stage) {
    foreach ($entry in @($stageSkipReasons -split ';' | ForEach-Object { $_.Trim() })) {
        if ($entry -cmatch "^$([regex]::Escape($Stage))=.+") { return $true }
    }
    return $false
}

function Test-StageSkipConfirmation([string]$Stage) {
    foreach ($entry in @($stageSkipConfirmations -split ';' | ForEach-Object { $_.Trim() })) {
        if ($entry -ceq "$Stage=NOT_REQUIRED_CONFIRMED") { return $true }
    }
    return $false
}

function Test-StageEvidence([string]$Stage, [string]$DefaultRef, [string]$Marker) {
    if (Test-CsvToken $skippedStages $Stage) {
        return $Stage -cin @('FLOW', 'UI') -and
            (Test-StageSkipReason $Stage) -and
            (Test-StageSkipConfirmation $Stage)
    }
    if (-not (Test-CsvToken $completedStages $Stage)) { return $false }
    if ($Stage -ceq 'IMPLEMENT') {
        return [bool](Get-StageSourceSignature $Stage) -and (Test-Refs $completionEvidence)
    }
    $ref = Get-StageRef $Stage $DefaultRef
    if (-not $ref -or [IO.Path]::IsPathRooted($ref) -or $ref.Contains('..')) { return $false }
    $evidenceFile = Join-Path $featureDir $ref
    if (-not (Test-Path -LiteralPath $evidenceFile -PathType Leaf)) { return $false }
    if (Select-String -LiteralPath $evidenceFile -Pattern 'SP_STAGE_SEED:' -Quiet) { return $false }
    if (-not (Test-ProtectedStageEvidence $Stage $ref $evidenceFile)) { return $false }
    if (-not (Get-ProtectedStageBasename $Stage) -and $Stage -cne 'SPECIFY' -and
        -not (Test-RoundStageEvidence $Stage $evidenceFile)) { return $false }
    return -not $Marker -or [bool](Select-String -LiteralPath $evidenceFile -Pattern $Marker -Quiet)
}

function Test-PriorStageEvidence([string]$Requested) {
    $passVerdict = '^\s*(?:-\s*)?(?:Current\s+)?Verdict\s*:\s*`?PASS`?\s*$'
    if (-not (Test-StageEvidence SPECIFY 'spec.md' 'READY_FOR_FLOW')) { return $false }
    if ($Requested -ceq 'NEEDS_FLOW') { return $true }
    if (-not (Test-StageEvidence FLOW 'flows/index.md' 'READY_FOR_UI')) { return $false }
    if ($Requested -ceq 'NEEDS_UI') { return $true }
    if (-not (Test-StageEvidence UI 'ui/index.md' 'READY_FOR_PLAN')) { return $false }
    if ($Requested -ceq 'NEEDS_BUSINESS_GATE') { return $true }
    if (-not (Test-StageEvidence BUSINESS_GATE '' $passVerdict)) { return $false }
    if ($Requested -ceq 'NEEDS_BUNDLE') { return $true }
    if (-not (Test-StageEvidence BUNDLE 'bundle.md' '')) { return $false }
    if ($Requested -ceq 'NEEDS_PLAN') { return $true }
    if (-not (Test-StageEvidence PLAN 'plan.md' 'Implementation Readiness')) { return $false }
    if ($Requested -ceq 'NEEDS_TASKS') { return $true }
    if (-not (Test-StageEvidence TASKS 'tasks.md' 'Mode:\s*impl')) { return $false }
    if ($Requested -ceq 'NEEDS_PRE_IMPL_ANALYZE') { return $true }
    if (-not (Test-StageEvidence PRE_IMPL_ANALYZE '' $passVerdict)) { return $false }
    if ($Requested -ceq 'NEEDS_PRE_IMPL_GATE') { return $true }
    if (-not (Test-StageEvidence PRE_IMPL_GATE '' $passVerdict)) { return $false }
    if ($Requested -ceq 'NEEDS_IMPLEMENT') { return $true }
    if (-not (Test-StageEvidence IMPLEMENT '' '')) { return $false }
    if ($Requested -ceq 'NEEDS_FINAL_ANALYZE') { return $true }
    if (-not (Test-StageEvidence FINAL_ANALYZE '' $passVerdict)) { return $false }
    if ($Requested -ceq 'NEEDS_FINAL_GATE') { return $true }
    return Test-StageEvidence FINAL_GATE '' $passVerdict
}

if ($globalStatus -ceq 'STALE_EVIDENCE' -or (Test-Refs $staleRefs)) {
    Emit-LiteRoute @common -Next $blockerRoute -Reason global-evidence-stale -GlobalControl STALE_EVIDENCE -BlockerType STALE_EVIDENCE -BlockerRoute $blockerRoute
    exit 0
}
if ($globalStatus -ceq 'RECONCILE_REQUIRED' -or (Test-Refs $conflictRefs)) {
    Emit-LiteRoute @common -Next $blockerRoute -Reason global-reconciliation-required -GlobalControl RECONCILE_REQUIRED -BlockerType GLOBAL_CONFLICT -BlockerRoute $blockerRoute
    exit 0
}
if ($globalStatus -ceq 'REGRESSION_BLOCKED' -or (Test-Refs $regressionFailures)) {
    Emit-LiteRoute @common -Next $blockerRoute -Reason historical-regression-blocked -GlobalControl REGRESSION_BLOCKED -BlockerType HISTORY_REGRESSION -BlockerRoute $blockerRoute
    exit 0
}

switch -CaseSensitive ($globalStatus) {
    'REUSE_REQUIRED' { Emit-LiteRoute @common -Next /sp.lite -Reason duplicate-scope-requires-reuse -GlobalControl $globalStatus -BlockerType DUPLICATE_SCOPE -BlockerRoute /sp.lite; exit 0 }
    'CLEAR' { }
    default { Emit-LiteRoute @common -Next /sp.lite -Reason global-control-invalid -GlobalControl STALE_EVIDENCE -BlockerType STALE_EVIDENCE -BlockerRoute /sp.lite; exit 0 }
}

$lifecycleStates = @(
    'NEEDS_SPECIFY', 'NEEDS_FLOW', 'NEEDS_UI', 'NEEDS_BUSINESS_GATE', 'NEEDS_BUNDLE',
    'NEEDS_PLAN', 'NEEDS_TASKS', 'NEEDS_PRE_IMPL_ANALYZE', 'NEEDS_PRE_IMPL_GATE',
    'NEEDS_IMPLEMENT', 'NEEDS_FINAL_ANALYZE', 'NEEDS_FINAL_GATE',
    'READY_FOR_BUSINESS_VALIDATION'
)
if ($state -cin $lifecycleStates -and (
    $activeRound -cnotmatch '^LITE-R[0-9]{3,}$' -or
    $humanSelection -cne 'CONFIRMED' -or
    -not (Test-Refs $selectedCandidate) -or
    -not (Test-Refs $includedAnchors) -or
    -not (Test-Refs $allowedWriteSet)
)) {
    Emit-LiteRoute @common -Next /sp.lite -Reason active-round-authorization-incomplete -GlobalControl CLEAR -BlockerType INVALID_LITE_AUTHORIZATION -BlockerRoute /sp.lite
    exit 0
}
if ($state -cin $lifecycleStates -and $state -cne 'NEEDS_SPECIFY' -and -not (Test-PriorStageEvidence $state)) {
    Emit-LiteRoute @common -Next /sp.lite -Reason prior-owner-evidence-incomplete -GlobalControl CLEAR -BlockerType INVALID_STAGE_EVIDENCE -BlockerRoute /sp.lite
    exit 0
}

$next = '/sp.lite'; $continueAllowed = $true; $requiresHuman = $false; $blockerType = 'NONE'; $reason = 'lite-lifecycle-route'
switch -CaseSensitive ($state) {
    'NEEDS_SPECIFY' { $next = '/sp.specify' }
    'NEEDS_FLOW' { $next = '/sp.flow' }
    'NEEDS_UI' { $next = '/sp.ui' }
    'NEEDS_BUSINESS_GATE' { $next = '/sp.gate' }
    'NEEDS_BUNDLE' { $next = '/sp.bundle' }
    'NEEDS_PLAN' { $next = '/sp.plan' }
    'NEEDS_TASKS' { $next = '/sp.tasks' }
    'NEEDS_PRE_IMPL_ANALYZE' { $next = '/sp.analyze' }
    'NEEDS_PRE_IMPL_GATE' { $next = '/sp.gate' }
    'NEEDS_IMPLEMENT' { $next = '/sp.implement' }
    'NEEDS_FINAL_ANALYZE' { $next = '/sp.analyze' }
    'NEEDS_FINAL_GATE' { $next = '/sp.gate' }
    { $_ -cin @('READY_FOR_BUSINESS_VALIDATION', 'NEEDS_CANDIDATES', 'OUTLINE_COMPLETE_VIA_LITE') } {
        $continueAllowed = $false; $requiresHuman = $true; $blockerType = 'HUMAN_SELECTION'; $reason = 'human-lite-decision-required'
    }
    default { $continueAllowed = $false; $requiresHuman = $true; $blockerType = 'INVALID_LITE_STATE'; $reason = 'unknown-lite-state' }
}
Emit-LiteRoute -Status $state -Next $next -Reason $reason -ActiveFeature $activeFeature -FeatureDir $featureDir -ActiveRound $activeRound -ActiveRoundState $roundState -GlobalControl CLEAR -ContinueAllowed $continueAllowed -RequiresHuman $requiresHuman -BlockerType $blockerType -BlockerRoute $next -ReuseRefs $reuseRefs -ConflictRefs $conflictRefs -StaleRefs $staleRefs -RegressionFailures $regressionFailures
