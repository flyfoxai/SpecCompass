#!/usr/bin/env pwsh

# Lightweight SP memory consistency checker.
#
# This script intentionally performs only mechanical checks:
# - open blocker visibility
# - required open-items fields
# - open-items -> trace/source link presence
# - obvious @r0/@t0 status tag drift
#
# It does not perform semantic quality review. That remains the job of
# /sp.analyze and /sp.gate.

[CmdletBinding()]
param(
    [switch]$Json,
    [string]$FeatureDir = '',
    [switch]$FailOnError,
    [switch]$Help
)

$ErrorActionPreference = 'Stop'

if ($Help) {
    Write-Output @"
Usage: check-sp-memory.ps1 [OPTIONS]

Lightweight checks for SP feature memory link integrity.

OPTIONS:
  -Json                 Output JSON
  -FeatureDir <path>    Check a specific feature directory
  -FailOnError          Exit 1 when errors are found
  -Help                 Show this help message

EXAMPLES:
  ./check-sp-memory.ps1 -Json -FeatureDir specs/my-feature
  ./check-sp-memory.ps1 -Json -FailOnError
"@
    exit 0
}

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
if (-not $FeatureDir) {
    $common = Join-Path $scriptDir 'common.ps1'
    if (-not (Test-Path -LiteralPath $common -PathType Leaf)) {
        $repoRoot = $env:REPO_ROOT
        if (-not $repoRoot) {
            $searchRoot = $scriptDir
            $fsRoot = [System.IO.Path]::GetPathRoot($searchRoot)
            while ($searchRoot -and $searchRoot -ne $fsRoot) {
                if ((Test-Path -LiteralPath (Join-Path $searchRoot '.specify') -PathType Container) -or
                    (Test-Path -LiteralPath (Join-Path $searchRoot 'scripts') -PathType Container)) {
                    $repoRoot = $searchRoot
                    break
                }
                $searchRoot = Split-Path -Parent $searchRoot
            }
        }

        foreach ($candidate in @(
            $(if ($repoRoot) { Join-Path $repoRoot '.specify/scripts/powershell/common.ps1' }),
            $(if ($repoRoot) { Join-Path $repoRoot 'scripts/powershell/common.ps1' })
        )) {
            if ($candidate -and (Test-Path -LiteralPath $candidate -PathType Leaf)) {
                $common = $candidate
                break
            }
        }
    }

    if (-not (Test-Path -LiteralPath $common -PathType Leaf)) {
        [Console]::Error.WriteLine('ERROR: common.ps1 is required when -FeatureDir is not provided')
        exit 2
    }

    . $common
    $paths = Get-FeaturePathsEnv
    $FeatureDir = $paths.FEATURE_DIR
}

function Test-EmptyValue {
    param([AllowNull()][string]$Value)

    if ($null -eq $Value) { $Value = '' }
    $clean = ($Value -replace '`', '').Trim()
    return $clean -eq '' -or $clean -in @('-', 'n/a', 'na', 'none', 'tbd')
}

function Clean-Cell {
    param([AllowNull()][string]$Value)
    if ($null -eq $Value) { $Value = '' }
    $clean = ($Value -replace '`', '').Trim()
    $clean = [regex]::Replace($clean, '\[([^\[\]]+)\]\([^)]+\)', '$1')
    return $clean.Trim()
}

function Test-MarkdownTableSeparator {
    param([AllowNull()][string]$Line)

    if ($null -eq $Line) { $Line = '' }
    $clean = ($Line -replace '\|', '' -replace ':', '' -replace '-', '' -replace '\s', '')
    return $clean -eq ''
}

function Get-CellOrEmpty {
    param(
        [object[]]$Cells,
        [int]$Index
    )

    if ($Index -lt $Cells.Count -and $null -ne $Cells[$Index]) {
        return $Cells[$Index]
    }
    return ''
}

function Test-SkipOpenItemsRow {
    param([object[]]$Cells)

    $nonEmpty = 0
    $lowerCells = @()
    foreach ($cell in $Cells) {
        $clean = Clean-Cell $cell
        $lower = $clean.ToLowerInvariant()
        $lowerCells += $lower
        if (-not (Test-EmptyValue $clean)) {
            $nonEmpty += 1
        }
    }

    if ($nonEmpty -eq 0) { return $true }

    $first = if ($lowerCells.Count -gt 0) { $lowerCells[0] } else { '' }
    $second = if ($lowerCells.Count -gt 1) { $lowerCells[1] } else { '' }
    if ($first -in @('item id', 'id', 'open item', 'open id') -and (-not $second -or $second -eq 'type')) {
        return $true
    }

    $joined = '|' + ($lowerCells -join '|')
    if ($joined.Contains('|type') -and $joined.Contains('|status') -and ($joined.Contains('|item id') -or $joined.Contains('|id') -or $joined.Contains('|open item'))) {
        return $true
    }

    return $false
}

function New-Finding {
    param(
        [Parameter(Mandatory = $true)][string]$Severity,
        [Parameter(Mandatory = $true)][string]$Code,
        [Parameter(Mandatory = $true)][string]$Message,
        [string]$File = '',
        [string]$NextStep = ''
    )

    [PSCustomObject]@{
        severity = $Severity
        code     = $Code
        message  = $Message
        file     = $File
        nextStep = $NextStep
    }
}

if (-not $FeatureDir -or -not (Test-Path -LiteralPath $FeatureDir -PathType Container)) {
    $payload = [PSCustomObject]@{
        status       = 'WARN'
        featureDir   = $FeatureDir
        errorCount   = 0
        warningCount = 1
        findings     = @(
            New-Finding -Severity 'WARN' -Code 'NO_ACTIVE_FEATURE' -Message 'No active feature directory was found. Run /sp.specify first.' -NextStep '/sp.specify'
        )
    }

    if ($Json) {
        $payload | ConvertTo-Json -Compress -Depth 5
    } else {
        Write-Output 'WARN NO_ACTIVE_FEATURE: No active feature directory was found. Next step: /sp.specify'
    }
    exit 0
}

$openItems = Join-Path $FeatureDir 'memory/open-items.md'
$traceIndex = Join-Path $FeatureDir 'memory/trace-index.md'
$featureRoot = (Get-Item -LiteralPath $FeatureDir).FullName.TrimEnd([char[]]@('\', '/'))
$traceText = ''
if (Test-Path -LiteralPath $traceIndex -PathType Leaf) {
    $traceText = Get-Content -LiteralPath $traceIndex -Raw
}

$findings = New-Object System.Collections.Generic.List[object]
$openRiskOrBlockerCount = 0
$openQuestionTodoRiskCount = 0

function Add-Finding {
    param(
        [Parameter(Mandatory = $true)][string]$Severity,
        [Parameter(Mandatory = $true)][string]$Code,
        [Parameter(Mandatory = $true)][string]$Message,
        [string]$File = '',
        [string]$NextStep = ''
    )

    $script:findings.Add((New-Finding -Severity $Severity -Code $Code -Message $Message -File $File -NextStep $NextStep))
}

function Invoke-OpenItemCheck {
    param(
        [string]$ItemId,
        [string]$ItemType,
        [string]$Severity,
        [string]$Anchor,
        [string]$Owner,
        [string]$Description,
        [string]$ImpactArea,
        [string]$AffectedDocs,
        [string]$Rollback,
        [string]$CloseCondition,
        [string]$LastRefresh,
        [string]$Status
    )

    $itemId = Clean-Cell $ItemId
    if (-not $itemId) { return }

    $itemType = Clean-Cell $ItemType
    $severity = Clean-Cell $Severity
    $anchor = Clean-Cell $Anchor
    $owner = Clean-Cell $Owner
    $description = Clean-Cell $Description
    $impactArea = Clean-Cell $ImpactArea
    $affectedDocs = Clean-Cell $AffectedDocs
    $rollback = Clean-Cell $Rollback
    $closeCondition = Clean-Cell $CloseCondition
    $lastRefresh = Clean-Cell $LastRefresh
    $status = Clean-Cell $Status

    $typeLower = $itemType.ToLowerInvariant()
    $severityLower = $severity.ToLowerInvariant()
    $statusLower = $status.ToLowerInvariant()
    $isHeavy = $typeLower -in @('risk', 'blocker') -or $severityLower -eq 'high'

    if ($statusLower.Contains('open')) {
        if ($typeLower -in @('risk', 'blocker')) {
            $script:openRiskOrBlockerCount += 1
        }
        if ($typeLower -in @('question', 'todo', 'risk')) {
            $script:openQuestionTodoRiskCount += 1
        }
    }

    $requiredFields = @{
        'Type' = $itemType
        'Status' = $status
    }
    foreach ($entry in $requiredFields.GetEnumerator()) {
        if (Test-EmptyValue $entry.Value) {
            Add-Finding -Severity 'ERROR' -Code 'OPEN_ITEM_REQUIRED_FIELD_MISSING' -Message "$itemId is missing required field: $($entry.Key)." -File $openItems -NextStep '/sp.analyze'
        }
    }

    $recommendedFields = @{
        'Severity' = $severity
        'Description' = $description
    }
    foreach ($entry in $recommendedFields.GetEnumerator()) {
        if (Test-EmptyValue $entry.Value) {
            Add-Finding -Severity 'WARN' -Code 'OPEN_ITEM_RECOMMENDED_FIELD_MISSING' -Message "$itemId is missing recommended field: $($entry.Key)." -File $openItems -NextStep '/sp.analyze'
        }
    }

    if ($isHeavy) {
        $heavyFields = @{
            'Close Condition' = $closeCondition
            'Last Refresh' = $lastRefresh
        }
        foreach ($entry in $heavyFields.GetEnumerator()) {
            if (Test-EmptyValue $entry.Value) {
                Add-Finding -Severity 'ERROR' -Code 'OPEN_ITEM_REQUIRED_FIELD_MISSING' -Message "$itemId is missing required field for high-impact items: $($entry.Key)." -File $openItems -NextStep '/sp.analyze'
            }
        }
    }

    if ($typeLower -eq 'blocker' -and $statusLower.Contains('open')) {
        Add-Finding -Severity 'ERROR' -Code 'OPEN_BLOCKER' -Message "$itemId is an open blocker; PASS is not safe until it is closed or routed upward." -File $openItems -NextStep '/sp.gate'
    }

    if ($isHeavy -and $statusLower.Contains('open')) {
        $riskFields = @{
            'Owner' = $owner
            'Impact Area' = $impactArea
            'Suggested Rollback' = $rollback
            'Close Condition' = $closeCondition
        }
        foreach ($entry in $riskFields.GetEnumerator()) {
            if (Test-EmptyValue $entry.Value) {
                Add-Finding -Severity 'ERROR' -Code 'OPEN_RISK_REQUIRED_FIELD_MISSING' -Message "$itemId is an open high-impact item missing conditional-pass field: $($entry.Key)." -File $openItems -NextStep '/sp.gate'
            }
        }
    }

    if (-not (Test-OpenItemLink -Anchor $anchor -AffectedDocs $affectedDocs)) {
        if ($isHeavy) {
            Add-Finding -Severity 'ERROR' -Code 'OPEN_ITEM_TRACE_LINK_MISSING' -Message "$itemId cannot be linked through Anchor or Affected Docs to memory/trace-index.md." -File $openItems -NextStep '/sp.analyze'
        } else {
            Add-Finding -Severity 'WARN' -Code 'OPEN_ITEM_TRACE_LINK_MISSING' -Message "$itemId has no trace/source link. This is allowed for lightweight Question/Todo items, but should be linked if it affects scope, acceptance, release, rollback, or implementation confidence." -File $openItems -NextStep '/sp.analyze'
        }
    }
}

function Invoke-OpenItemBlockFlush {
    if (-not $script:blockItemId) { return }

    Invoke-OpenItemCheck `
        -ItemId $script:blockItemId `
        -ItemType $script:blockType `
        -Severity $script:blockSeverity `
        -Anchor $script:blockAnchor `
        -Owner $script:blockOwner `
        -Description $script:blockDescription `
        -ImpactArea $script:blockImpactArea `
        -AffectedDocs $script:blockAffectedDocs `
        -Rollback $script:blockRollback `
        -CloseCondition $script:blockCloseCondition `
        -LastRefresh $script:blockLastRefresh `
        -Status $script:blockStatus

    $script:blockItemId = ''
    $script:blockType = ''
    $script:blockSeverity = ''
    $script:blockAnchor = ''
    $script:blockOwner = ''
    $script:blockDescription = ''
    $script:blockImpactArea = ''
    $script:blockAffectedDocs = ''
    $script:blockRollback = ''
    $script:blockCloseCondition = ''
    $script:blockLastRefresh = ''
    $script:blockStatus = ''
}

function Test-OpenItemLink {
    param(
        [string]$Anchor,
        [string]$AffectedDocs
    )

    if (-not $script:traceText) { return $false }

    if (-not (Test-EmptyValue $Anchor) -and $script:traceText.Contains($Anchor)) {
        return $true
    }

    foreach ($doc in ($AffectedDocs -split ',')) {
        $cleanDoc = Clean-Cell $doc
        if (-not (Test-EmptyValue $cleanDoc) -and $script:traceText.Contains($cleanDoc)) {
            return $true
        }
    }

    return $false
}

if (-not (Test-Path -LiteralPath $openItems -PathType Leaf)) {
    Add-Finding -Severity 'WARN' -Code 'OPEN_ITEMS_MISSING' -Message 'memory/open-items.md is missing; risk and blocker details cannot be checked.' -File $openItems -NextStep '/sp.analyze'
} else {
    $script:blockItemId = ''
    $script:blockType = ''
    $script:blockAnchor = ''
    $script:blockOwner = ''
    $script:blockImpactArea = ''
    $script:blockAffectedDocs = ''
    $script:blockRollback = ''
    $script:blockCloseCondition = ''
    $script:blockLastRefresh = ''
    $script:blockStatus = ''

    foreach ($line in Get-Content -LiteralPath $openItems) {
        if ($line.StartsWith('### ')) {
            Invoke-OpenItemBlockFlush
            $script:blockItemId = Clean-Cell $line.Substring(4)
            continue
        }

        if ($script:blockItemId -and $line.StartsWith('- ') -and $line.Contains(':')) {
            $field = $line.Substring(2)
            $idx = $field.IndexOf(':')
            $fieldName = (Clean-Cell $field.Substring(0, $idx)).ToLowerInvariant()
            $fieldValue = Clean-Cell $field.Substring($idx + 1)
            switch ($fieldName) {
                'type' { $script:blockType = $fieldValue }
                'severity' { $script:blockSeverity = $fieldValue }
                'anchor' { $script:blockAnchor = $fieldValue }
                'owner' { $script:blockOwner = $fieldValue }
                'description' { $script:blockDescription = $fieldValue }
                'impact area' { $script:blockImpactArea = $fieldValue }
                'affected docs' { $script:blockAffectedDocs = $fieldValue }
                'suggested rollback' { $script:blockRollback = $fieldValue }
                'close condition' { $script:blockCloseCondition = $fieldValue }
                'last refresh' { $script:blockLastRefresh = $fieldValue }
                'status' { $script:blockStatus = $fieldValue }
            }
            continue
        }

        if (-not $line.StartsWith('|')) { continue }
        if (Test-MarkdownTableSeparator $line) { continue }

        $row = $line.Trim([char[]]@('|'))
        $cols = $row -split '\|'
        if (Test-SkipOpenItemsRow -Cells $cols) { continue }

        Invoke-OpenItemCheck `
            -ItemId (Get-CellOrEmpty -Cells $cols -Index 0) `
            -ItemType (Get-CellOrEmpty -Cells $cols -Index 1) `
            -Severity (Get-CellOrEmpty -Cells $cols -Index 2) `
            -Anchor (Get-CellOrEmpty -Cells $cols -Index 5) `
            -Owner (Get-CellOrEmpty -Cells $cols -Index 7) `
            -Description (Get-CellOrEmpty -Cells $cols -Index 8) `
            -ImpactArea (Get-CellOrEmpty -Cells $cols -Index 9) `
            -AffectedDocs (Get-CellOrEmpty -Cells $cols -Index 10) `
            -Rollback (Get-CellOrEmpty -Cells $cols -Index 11) `
            -CloseCondition (Get-CellOrEmpty -Cells $cols -Index 12) `
            -LastRefresh (Get-CellOrEmpty -Cells $cols -Index 13) `
            -Status (Get-CellOrEmpty -Cells $cols -Index 14)
    }
    Invoke-OpenItemBlockFlush
}

$script:candidateR0 = 0
$script:candidateT0 = 0
$memoryExcludes = @(
    'memory/open-items.md',
    'memory/index.md',
    'memory/trace-index.md',
    'memory/stable-context.md'
)

Get-ChildItem -LiteralPath $FeatureDir -Recurse -File -Filter '*.md' -ErrorAction SilentlyContinue | ForEach-Object {
    $filePath = (Get-Item -LiteralPath $_.FullName).FullName
    $relative = $filePath
    if ($relative.StartsWith($featureRoot)) {
        $relative = $relative.Substring($featureRoot.Length)
    }
    $relative = $relative.TrimStart([char[]]@('\', '/')) -replace '\\', '/'
    $relativeLower = $relative.ToLowerInvariant().TrimStart([char[]]@('.', '/'))
    if ($memoryExcludes -contains $relative -or $relative.StartsWith('memory/worksets/')) {
        return
    }
    if ($memoryExcludes -contains $relativeLower -or $relativeLower.StartsWith('memory/worksets/')) {
        return
    }

    foreach ($lineText in Get-Content -LiteralPath $_.FullName) {
        if ($lineText -notmatch '@r0|@t0') { continue }
        $lineLower = $lineText.ToLowerInvariant()
        if ($lineLower -match 'non-trivial|inline tag|status tag|for example|such as|example|when |if |should|must|means|use short|create a|do not|only when') {
            continue
        }
        if ($lineText.Contains('@r0')) { $script:candidateR0 += 1 }
        if ($lineText.Contains('@t0')) { $script:candidateT0 += 1 }
    }
}

if ($script:candidateR0 -gt 0 -and $openRiskOrBlockerCount -eq 0) {
    Add-Finding -Severity 'ERROR' -Code 'R0_WITHOUT_OPEN_RISK' -Message 'Found candidate @r0 status tags but no open Risk or Blocker row in memory/open-items.md.' -File $FeatureDir -NextStep '/sp.analyze'
}

if ($script:candidateT0 -gt 0 -and $openQuestionTodoRiskCount -eq 0) {
    Add-Finding -Severity 'WARN' -Code 'T0_WITHOUT_OPEN_ITEM' -Message 'Found candidate @t0 status tags but no open Question, Todo, or Risk row in memory/open-items.md. Confirm whether the gap is trivial.' -File $FeatureDir -NextStep '/sp.analyze'
}

$findingItems = @($findings.ToArray())
$errorCount = @($findingItems | Where-Object { $_.severity -eq 'ERROR' }).Count
$warningCount = @($findingItems | Where-Object { $_.severity -ne 'ERROR' }).Count
$status = if ($errorCount -gt 0) { 'FAIL' } elseif ($warningCount -gt 0) { 'WARN' } else { 'PASS' }

if ($Json) {
    [PSCustomObject]@{
        status       = $status
        featureDir   = $FeatureDir
        errorCount   = $errorCount
        warningCount = $warningCount
        findings     = $findingItems
    } | ConvertTo-Json -Compress -Depth 5
} else {
    Write-Output "SP memory check: $status ($errorCount errors, $warningCount warnings)"
    foreach ($finding in $findingItems) {
        $line = "$($finding.severity) $($finding.code): $($finding.message)"
        if ($finding.file) { $line += " [$($finding.file)]" }
        if ($finding.nextStep) { $line += " Next: $($finding.nextStep)" }
        Write-Output $line
    }
}

if ($FailOnError -and $errorCount -gt 0) {
    exit 1
}

exit 0
