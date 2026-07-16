#!/usr/bin/env pwsh

# Lightweight SP memory consistency checker.
#
# This script intentionally performs only mechanical checks:
# - open blocker visibility
# - required open-items fields
# - close evidence for closed high-impact open-items
# - open-items -> trace/source link presence
# - flow/ui subject confusion by obvious SP control-plane terms
# - trace Expand Docs file liveness
# - repeated spec-outline blocker signature without new route/evidence
# - PRD outline confirmation readiness and legacy compatibility
# - high-risk READY_FOR_SPECIFY outline missing owner review as WARN
# - minimum Evidence Signature shape and unbacked human-confirmation markers
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

function Test-HighImpactSignal {
    param([AllowNull()][string]$Value)

    if ($null -eq $Value) { $Value = '' }
    $lower = $Value.ToLowerInvariant()
    return (
        $lower -match '(^|[^A-Za-z0-9_])(scope|acceptance|release|rollback|security|compliance|privacy|permission|auth|authentication|authorization|audit|data|migration|irreversible|tenant|rbac|payment|billing|production|prod)([^A-Za-z0-9_]|$)' -or
        $lower -match 'real[\s_-]*(money|data)' -or
        $lower -match 'implementation[\s_-]*confidence' -or
        $lower -match 'human[\s_-]*(decision|approval|acceptance)' -or
        $lower -match 'owner[\s_-]*(decision|approval)' -or
        $lower -match 'risk[\s_-]*acceptance'
    )
}

function Test-NewEvidenceSignal {
    param([AllowNull()][string]$Value)

    if ($null -eq $Value) { $Value = '' }
    $lower = $Value.ToLowerInvariant()
    if (
        $lower -match '(not|without|missing|unresolved|still)[\s_-]+.*(user|owner)[\s_-]*(confirmed|confirmation|approved|accepted|selected|decided|decision)' -or
        $lower -match '(no|not|without|missing|unresolved|still)[\s_-]+.*(source[\s_-]*(recovered|restored|attached|linked)|evidence[\s_-]*(added|recorded|linked)|decision[\s_-]*(recorded|accepted|approved)|decision[\s_-]*package[\s_-]*(written|recorded)|open[\s_-]*items?[\s_-]*(updated|closed|written|recorded)|memory[\s_-]*(updated|written|recorded)|split[\s_-]*(confirmed|completed|created|approved)|verification[\s_-]*(passed|evidence|recorded)|test[\s_-]*(passed|evidence))' -or
        $lower -match '(source|evidence|decision|decision[\s_-]*package|open[\s_-]*items?|memory|split|verification|test)[\s_-]+(missing|absent|unresolved|not[\s_-]*found)'
    ) {
        return $false
    }
    if ($lower -match 'user[\s_-]*(confirmed|confirmation|approved|accepted|selected|decided)|owner[\s_-]*(confirmed|approved|accepted|selected|decided|decision)|source[\s_-]*(recovered|restored|attached|linked)|recovered[\s_-]*source|explicit[\s_-]*rebase|rebase[\s_-]*(approved|decision|accepted)|split[\s_-]*(confirmed|completed|created|approved)|feature[\s_-]*split[\s_-]*(confirmed|completed|created|approved)|risk[\s_-]*(accepted|approved|decision)|compliance[\s_-]*(approved|decision)|verification[\s_-]*(passed|evidence|recorded)|test[\s_-]*(passed|evidence)|evidence[\s_-]*(added|recorded|linked)|decision[\s_-]*(recorded|accepted|approved)|decision[\s_-]*package[\s_-]*(written|recorded|linked)|open[\s_-]*items?[\s_-]*(updated|closed|written|recorded)|memory[\s_-]*(updated|written|recorded)|writeback[\s_-]*(completed|recorded|done)|written[\s_-]*(to|back[\s_-]*to)[\s_-]*(memory|open[\s_-]*items?)') {
        return $true
    }
    return $false
}

function Test-OwnerReviewOutlineSignal {
    param([AllowNull()][string]$Value)

    if ($null -eq $Value) { $Value = '' }
    $lower = $Value.ToLowerInvariant()
    return (
        $lower -match 'source[\s_-]*rebase' -or
        $lower -match 'rebase[\s_-]*(decision|approved|accepted|required)' -or
        $lower -match '(governance|constitution[\s_-]*candidate|0[\s_-]*to[\s_-]*1|zero[\s_-]*to[\s_-]*one|new[\s_-]*product)' -or
        $lower -match 'real[\s_-]*(money|data)' -or
        $lower -match '(^|[^A-Za-z0-9_])(compliance|privacy|security|audit|tenant|rbac|payment|billing|irreversible)([^A-Za-z0-9_]|$)' -or
        $lower -match 'risk[\s_-]*(acceptance|decision|approved|accepted)' -or
        $lower -match 'scope[\s_-]*(split|conflict)' -or
        $lower -match 'split[\s_-]*(feature|required|decision|approved|accepted)'
    )
}

function Clean-Cell {
    param([AllowNull()][string]$Value)
    if ($null -eq $Value) { $Value = '' }
    $clean = ($Value -replace '`', '').Trim()
    $clean = [regex]::Replace($clean, '\[([^\[\]]+)\]\([^)]+\)', '$1')
    $clean = [regex]::Replace($clean, '(^|\s)\*\*([^*]+)\*\*', '$1$2')
    $clean = [regex]::Replace($clean, '(^|\s)__([^_]+)__', '$1$2')
    $clean = [regex]::Replace($clean, '(^|\s)\*([^*]+)\*', '$1$2')
    $clean = [regex]::Replace($clean, '(^|\s)_([^_]+)_', '$1$2')
    return $clean.Trim()
}

function Test-MarkdownTableSeparator {
    param([AllowNull()][string]$Line)

    if ($null -eq $Line) { $Line = '' }
    $clean = ($Line -replace '\|', '' -replace ':', '' -replace '-', '' -replace '\s', '')
    return $clean -eq ''
}

function Normalize-DocPath {
    param([AllowNull()][string]$Value)

    if ($null -eq $Value) { $Value = '' }
    $clean = ($Value -replace '`', '').Trim()
    $match = [regex]::Match($clean, '\[[^\[\]]+\]\(([^)]+)\)')
    if ($match.Success) {
        $clean = $match.Groups[1].Value
    }
    $hashIndex = $clean.IndexOf('#')
    if ($hashIndex -ge 0) {
        $clean = $clean.Substring(0, $hashIndex)
    }
    $clean = $clean.Trim()
    if ($clean.StartsWith('./')) {
        $clean = $clean.Substring(2)
    }
    return $clean
}

function Test-LocalDocReference {
    param([AllowNull()][string]$Value)

    $docPath = Normalize-DocPath $Value
    if (-not $docPath) { return $false }
    $lower = $docPath.ToLowerInvariant()
    if ($lower -in @('-', 'n/a', 'na', 'none', 'tbd')) { return $false }
    if ($lower.StartsWith('http://') -or $lower.StartsWith('https://') -or $lower.StartsWith('mailto:') -or $lower.StartsWith('#')) {
        return $false
    }
    if ($docPath.Contains('*') -or $docPath.Contains('|') -or $docPath.StartsWith('<')) {
        return $false
    }
    return $docPath.Contains('/') -or $docPath -match '\.(md|mmd|json|yaml|yml|toml|txt|ts|tsx|js|jsx|py|go|rs|sh|ps1|sql|svg)$'
}

function Resolve-FeatureDocPath {
    param([AllowNull()][string]$Value)

    $docPath = Normalize-DocPath $Value
    if ([System.IO.Path]::IsPathRooted($docPath)) {
        return $docPath
    }
    return Join-Path $FeatureDir $docPath
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

function New-HeaderIndexMap {
    param([object[]]$Headers)

    $map = @{}
    for ($i = 0; $i -lt $Headers.Count; $i++) {
        $header = (Clean-Cell (Get-CellOrEmpty -Cells $Headers -Index $i)).ToLowerInvariant()
        if ($header -and -not $map.ContainsKey($header)) {
            $map[$header] = $i
        }
    }
    return $map
}

function Get-OpenItemCell {
    param(
        [object[]]$Cells,
        [string]$HeaderLine,
        [hashtable]$HeaderMap = @{},
        [int]$FallbackIndex,
        [string[]]$Aliases
    )

    $index = $null
    if ($HeaderMap -and $HeaderMap.Count -gt 0) {
        foreach ($alias in $Aliases) {
            $key = $alias.ToLowerInvariant()
            if ($HeaderMap.ContainsKey($key)) {
                $index = $HeaderMap[$key]
                break
            }
        }
    } elseif ($HeaderLine) {
        $headerRow = $HeaderLine.Trim([char[]]@('|'))
        $headers = $headerRow -split '\|'
        for ($i = 0; $i -lt $headers.Count; $i++) {
            $header = (Clean-Cell (Get-CellOrEmpty -Cells $headers -Index $i)).ToLowerInvariant()
            foreach ($alias in $Aliases) {
                if ($header -eq $alias.ToLowerInvariant()) {
                    $index = $i
                    break
                }
            }
            if ($null -ne $index) { break }
        }
    }

    if ($null -eq $index) {
        $index = $FallbackIndex
    }
    return Get-CellOrEmpty -Cells $Cells -Index $index
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

    if (Test-OpenItemsHeaderColumns -Cells $Cells) {
        return $true
    }

    return $false
}

function Test-OpenItemsHeaderColumns {
    param([object[]]$Cells)

    $hasId = $false
    $hasType = $false
    $hasStatus = $false
    foreach ($cell in $Cells) {
        $lower = (Clean-Cell $cell).ToLowerInvariant()
        switch ($lower) {
            { $_ -in @('item id', 'id', 'open item', 'open id') } { $hasId = $true; break }
            { $_ -in @('type', 'item type') } { $hasType = $true; break }
            'status' { $hasStatus = $true; break }
        }
    }

    return ($hasId -and $hasType -and $hasStatus)
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
        needsHumanReview = $false
        findings     = @(
            New-Finding -Severity 'WARN' -Code 'NO_ACTIVE_FEATURE' -Message 'No active feature directory was found. Run /sp.prd first.' -NextStep '/sp.prd'
        )
    }

    if ($Json) {
        $payload | ConvertTo-Json -Compress -Depth 5
    } else {
        Write-Output 'WARN NO_ACTIVE_FEATURE: No active feature directory was found. Next step: /sp.prd'
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
        [string]$Status,
        [string]$CloseEvidence,
        [string]$Tags
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
    $closeEvidence = Clean-Cell $CloseEvidence
    $tags = Clean-Cell $Tags

    $typeLower = $itemType.ToLowerInvariant()
    $severityLower = $severity.ToLowerInvariant()
    $statusLower = $status.ToLowerInvariant()
    $isHeavy = $typeLower -in @('risk', 'blocker') -or $severityLower -eq 'high'
    if (Test-HighImpactSignal "$impactArea $description $tags $affectedDocs $rollback $closeCondition") {
        $isHeavy = $true
    }

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

    if ($isHeavy -and (
        $statusLower.Contains('closed') -or
        $statusLower.Contains('resolved') -or
        $statusLower.Contains('verified') -or
        $statusLower.Contains('accepted') -or
        $statusLower.Contains('deferred') -or
        $statusLower.Contains('done') -or
        $statusLower.Contains('downgraded') -or
        $statusLower.Contains('invalid')
    ) -and (Test-EmptyValue $closeEvidence)) {
        Add-Finding -Severity 'ERROR' -Code 'OPEN_ITEM_CLOSE_EVIDENCE_MISSING' -Message "$itemId is a closed/resolved high-impact item without Close Evidence. No Self-Pass: closure needs current verification, traceable source change, rollback/degrade evidence, or explicit human acceptance." -File $openItems -NextStep '/sp.analyze'
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
        -Status $script:blockStatus `
        -CloseEvidence $script:blockCloseEvidence `
        -Tags $script:blockTags

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
    $script:blockCloseEvidence = ''
    $script:blockLastRefresh = ''
    $script:blockStatus = ''
    $script:blockTags = ''
}

function Test-TraceToken {
    param([AllowNull()][string]$Token)

    if (-not $script:traceText) { return $false }
    if ($null -eq $Token) { return $false }
    if (-not ($Token -match '^[A-Z][A-Z0-9_-]*-[0-9]+$' -or $Token -match '^[A-Z]+[0-9]+(\.[A-Z]+[0-9]+)+$')) {
        return $false
    }
    $escaped = [regex]::Escape($Token)
    return [regex]::IsMatch($script:traceText, "(^|[^A-Za-z0-9_.-])$escaped([^A-Za-z0-9_.-]|$)")
}

function Test-OpenItemLink {
    param(
        [string]$Anchor,
        [string]$AffectedDocs
    )

    if (-not $script:traceText) { return $false }

    if (-not (Test-EmptyValue $Anchor) -and (Test-TraceToken $Anchor)) {
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

function Invoke-TraceExpandDocsLivenessCheck {
    if (-not (Test-Path -LiteralPath $traceIndex -PathType Leaf)) { return }

    $expandDocsIndex = $null
    foreach ($line in Get-Content -LiteralPath $traceIndex) {
        if (-not $line.StartsWith('|')) { continue }
        if (Test-MarkdownTableSeparator $line) { continue }

        $row = $line.Trim([char[]]@('|'))
        $cols = $row -split '\|'
        $first = (Clean-Cell (Get-CellOrEmpty -Cells $cols -Index 0)).ToLowerInvariant()
        if ($first -in @('trace id', 'id')) {
            $expandDocsIndex = $null
            for ($i = 0; $i -lt $cols.Count; $i++) {
                $header = (Clean-Cell (Get-CellOrEmpty -Cells $cols -Index $i)).ToLowerInvariant()
                if ($header -in @('expand docs', 'expand doc', 'expand documents')) {
                    $expandDocsIndex = $i
                    break
                }
            }
            if ($null -eq $expandDocsIndex) {
                if ($cols.Count -gt 2) {
                    $expandDocsIndex = 2
                } else {
                    Add-Finding -Severity 'ERROR' -Code 'TRACE_EXPAND_DOC_COLUMN_MISSING' -Message 'trace-index.md table is missing an Expand Docs column.' -File $traceIndex -NextStep '/sp.analyze'
                }
            }
            continue
        }
        if ($first.StartsWith('example') -or $first.StartsWith('sample')) {
            continue
        }

        if ($null -eq $expandDocsIndex) {
            if ($cols.Count -gt 2) {
                $expandDocsIndex = 2
            } else {
                continue
            }
        }

        $expandDocs = Get-CellOrEmpty -Cells $cols -Index $expandDocsIndex
        if (-not $expandDocs) { continue }

        foreach ($doc in ($expandDocs -split ',')) {
            $docPath = Normalize-DocPath $doc
            if (Test-EmptyValue $docPath) { continue }
            if (-not (Test-LocalDocReference $docPath)) { continue }
            $resolved = Resolve-FeatureDocPath $docPath
            if (-not (Test-Path -LiteralPath $resolved)) {
                Add-Finding -Severity 'ERROR' -Code 'TRACE_EXPAND_DOC_MISSING' -Message "trace-index.md references missing Expand Docs file: $docPath." -File $traceIndex -NextStep '/sp.analyze'
            }
        }
    }
}

function Invoke-SubjectConfusionArtifactCheck {
    param(
        [Parameter(Mandatory = $true)][string]$RelativeRoot,
        [Parameter(Mandatory = $true)][string]$NextStep
    )

    $scanDir = Join-Path $FeatureDir $RelativeRoot
    if (-not (Test-Path -LiteralPath $scanDir -PathType Container)) { return }

    $pattern = '(/sp\.|(^|[^A-Za-z0-9_-])sp\.[A-Za-z0-9_-]+|memory/index\.md|trace-index\.md|open-items\.md|SUBJECT_CONFUSION)'
    $specText = ''
    $specPath = Join-Path $FeatureDir 'spec.md'
    if (Test-Path -LiteralPath $specPath -PathType Leaf) {
        $specText = Get-Content -LiteralPath $specPath -Raw
    }
    $allowsControlPlaneTerms = $false
    if ($specText.ToLowerInvariant() -match '(product[\s_-]*(domain|type)|target[\s_-]*(product|domain)|business[\s_-]*domain).*(sp|speccompass|spec[\s_-]*kit|ai[\s_-]*agent|developer[\s_-]*tool|cli|workflow[\s_-]*tool|specification[\s_-]*tool|process[\s_-]*tool)') {
        $allowsControlPlaneTerms = $true
    }
    Get-ChildItem -LiteralPath $scanDir -Recurse -File -Include '*.md', '*.mmd', '*.json', '*.yaml', '*.yml' -ErrorAction SilentlyContinue | ForEach-Object {
        $content = Get-Content -LiteralPath $_.FullName -Raw
        $scanContent = [regex]::Replace($content, 'https?://\S+', '')
        if ($scanContent -match $pattern) {
            if ($allowsControlPlaneTerms -and $scanContent.ToLowerInvariant() -match 'source[\s_-]*(anchor|business|spec|requirement)|business[\s_-]*(domain|anchor)|product[\s_-]*(domain|anchor)|trace[\s_-]*id|coordinate|role|user|acceptance') {
                return
            }
            Add-Finding -Severity 'ERROR' -Code 'SUBJECT_CONFUSION_CONTROL_PLANE_TERM' -Message "Found likely SP control-plane term in $RelativeRoot artifact. Flow/UI outputs must model the target business system, not SP execution mechanics." -File $_.FullName -NextStep $NextStep
        }
    }
}

function Get-OutlineField {
    param(
        [Parameter(Mandatory = $true)][string]$Line,
        [Parameter(Mandatory = $true)][string]$Field,
        [string]$HeaderLine = ''
    )

    $value = ''
    $normalizedLine = Clean-Cell $Line
    if ($Line.StartsWith('|')) {
        $row = $Line.Trim([char[]]@('|'))
        $cols = $row -split '\|'
        $index = $null
        if ($HeaderLine) {
            $headerRow = $HeaderLine.Trim([char[]]@('|'))
            $headers = $headerRow -split '\|'
            for ($i = 0; $i -lt $headers.Count; $i++) {
                $headerClean = (Clean-Cell (Get-CellOrEmpty -Cells $headers -Index $i)).ToLowerInvariant()
                if ($headerClean -eq $Field) {
                    $index = $i
                    break
                }
            }
        }
        if ($null -eq $index) {
            switch ($Field) {
                'status' { $index = 1 }
                'blocker-signature' { $index = 2 }
                'next-route' { $index = 3 }
                'evidence-summary' { $index = 4 }
            }
        }
        $value = Get-CellOrEmpty -Cells $cols -Index $index
    } else {
        $match = [regex]::Match($normalizedLine, "(^|[\s;,-])$([regex]::Escape($Field))\s*[:=]\s*([^;|,]+)")
        if ($match.Success) {
            $value = $match.Groups[2].Value
        }
    }

    return Clean-Cell $value
}

function Test-OutlineTableRowHasHeader {
    param(
        [Parameter(Mandatory = $true)][string]$Line,
        [Parameter(Mandatory = $true)][string]$ExpectedHeader
    )

    if (-not $Line.StartsWith('|')) { return $false }
    $row = $Line.Trim([char[]]@('|'))
    $cells = $row -split '\|'
    foreach ($cell in $cells) {
        $clean = (Clean-Cell $cell).ToLowerInvariant()
        if ($clean -eq $ExpectedHeader.ToLowerInvariant()) {
            return $true
        }
    }
    return $false
}

function Submit-OutlineStatusHistoryEntry {
    param(
        [Parameter(Mandatory = $true)][string]$Outline,
        [AllowNull()][string]$Status,
        [AllowNull()][string]$Signature,
        [AllowNull()][string]$NextRoute,
        [AllowNull()][string]$EvidenceSummary
    )

    $Status = Clean-Cell $Status
    $Signature = Clean-Cell $Signature
    $NextRoute = Clean-Cell $NextRoute
    $EvidenceSummary = Clean-Cell $EvidenceSummary

    $statusLower = $Status.ToLowerInvariant()
    if (-not $statusLower) { return }
    if ($statusLower -eq 'status' -or $statusLower -eq 'ready_for_specify') {
        $script:outlinePreviousKey = ''
        return
    }
    if ((Test-EmptyValue $Signature) -or $Signature.ToLowerInvariant() -eq 'blocker-signature') {
        return
    }

    $key = "$Status|$Signature|$NextRoute"
    $hasNewEvidence = Test-NewEvidenceSignal $EvidenceSummary
    if ($key -eq $script:outlinePreviousKey -and -not $hasNewEvidence -and -not $script:outlinePreviousHadNewEvidence) {
        Add-Finding -Severity 'ERROR' -Code 'OUTLINE_REPEATED_BLOCKER_SIGNATURE' -Message "spec-outline.md repeats the same status, blocker-signature, and next-route without visible new evidence: $Signature. Write the decision package back to memory/open-items.md or the existing blocker record, then route to /sp.clarify, source recovery, owner decision, or feature split." -File $Outline -NextStep '/sp.clarify'
        $script:outlineRepeatedFound = $true
        return
    }

    $script:outlinePreviousKey = $key
    $script:outlinePreviousHadNewEvidence = $hasNewEvidence
}

function Invoke-OutlineRepeatedBlockerSignatureCheck {
    $outline = Join-Path $FeatureDir 'spec-outline.md'
    if (-not (Test-Path -LiteralPath $outline -PathType Leaf)) { return }

    $inStatusHistory = $false
    $headerLine = ''
    $script:outlinePreviousKey = ''
    $script:outlinePreviousHadNewEvidence = $false
    $script:outlineRepeatedFound = $false
    $inListEntry = $false
    $listStatus = ''
    $listSignature = ''
    $listNextRoute = ''
    $listEvidenceSummary = ''
    foreach ($line in Get-Content -LiteralPath $outline) {
        if ($line -match '^\s{0,3}#{1,6}\s+') {
            if ($inListEntry) {
                Submit-OutlineStatusHistoryEntry -Outline $outline -Status $listStatus -Signature $listSignature -NextRoute $listNextRoute -EvidenceSummary $listEvidenceSummary
                if ($script:outlineRepeatedFound) { break }
                $inListEntry = $false
                $listStatus = ''
                $listSignature = ''
                $listNextRoute = ''
                $listEvidenceSummary = ''
            }
            if ($line.ToLowerInvariant().Contains('status history')) {
                $inStatusHistory = $true
                $headerLine = ''
                $script:outlinePreviousKey = ''
                $script:outlinePreviousHadNewEvidence = $false
            } elseif ($inStatusHistory) {
                break
            }
            continue
        }
        if (-not $inStatusHistory) { continue }
        if (Test-MarkdownTableSeparator $line) { continue }

        if ($line -match '^\s*[-*+]\s+') {
            if ($inListEntry) {
                Submit-OutlineStatusHistoryEntry -Outline $outline -Status $listStatus -Signature $listSignature -NextRoute $listNextRoute -EvidenceSummary $listEvidenceSummary
                if ($script:outlineRepeatedFound) { break }
            }
            $inListEntry = $true
            $listStatus = ''
            $listSignature = ''
            $listNextRoute = ''
            $listEvidenceSummary = ''
        }

        if ($inListEntry -and -not $line.StartsWith('|')) {
            $listValue = Get-OutlineField -Line $line -Field 'status'
            if ($listValue) { $listStatus = $listValue }
            $listValue = Get-OutlineField -Line $line -Field 'blocker-signature'
            if ($listValue) { $listSignature = $listValue }
            $listValue = Get-OutlineField -Line $line -Field 'next-route'
            if ($listValue) { $listNextRoute = $listValue }
            $listValue = Get-OutlineField -Line $line -Field 'evidence-summary'
            if ($listValue) { $listEvidenceSummary = $listValue }
            continue
        }

        if (-not ($line.Contains('blocker-signature') -or $line.StartsWith('|'))) { continue }

        if ($inListEntry) {
            Submit-OutlineStatusHistoryEntry -Outline $outline -Status $listStatus -Signature $listSignature -NextRoute $listNextRoute -EvidenceSummary $listEvidenceSummary
            if ($script:outlineRepeatedFound) { break }
            $inListEntry = $false
            $listStatus = ''
            $listSignature = ''
            $listNextRoute = ''
            $listEvidenceSummary = ''
        }

        if (Test-OutlineTableRowHasHeader -Line $line -ExpectedHeader 'blocker-signature') {
            $headerLine = $line
            continue
        }

        $status = Get-OutlineField -Line $line -Field 'status' -HeaderLine $headerLine
        $signature = Get-OutlineField -Line $line -Field 'blocker-signature' -HeaderLine $headerLine
        $nextRoute = Get-OutlineField -Line $line -Field 'next-route' -HeaderLine $headerLine
        $evidenceSummary = Get-OutlineField -Line $line -Field 'evidence-summary' -HeaderLine $headerLine

        Submit-OutlineStatusHistoryEntry -Outline $outline -Status $status -Signature $signature -NextRoute $nextRoute -EvidenceSummary $evidenceSummary
        if ($script:outlineRepeatedFound) { break }
    }

    if (-not $script:outlineRepeatedFound -and $inListEntry) {
        Submit-OutlineStatusHistoryEntry -Outline $outline -Status $listStatus -Signature $listSignature -NextRoute $listNextRoute -EvidenceSummary $listEvidenceSummary
    }
}

function Invoke-ReadyOutlineSourceSnapshotCheck {
    $outline = Join-Path $FeatureDir 'spec-outline.md'
    if (-not (Test-Path -LiteralPath $outline -PathType Leaf)) { return }

    if ($script:outlineDecisionCount -ne 1 -or $script:outlineCurrentStatus -ne 'READY_FOR_SPECIFY') { return }

    $outlineText = Get-Content -LiteralPath $outline -Raw
    $outlineLower = $outlineText.ToLowerInvariant()
    if (-not $outlineLower.Contains('based on') -or (
        -not $outlineLower.Contains('source snapshot') -and
        -not $outlineLower.Contains('source authority summary') -and
        -not $outlineLower.Contains('evidence signature')
    )) {
        Add-Finding -Severity 'WARN' -Code 'OUTLINE_SOURCE_SNAPSHOT_MISSING' -Message 'spec-outline.md is READY_FOR_SPECIFY but does not include the minimum source freshness fields. Add Based On plus Source Snapshot, Source Authority Summary, or Evidence Signature so /sp.specify can verify what evidence the outline was derived from.' -File $outline -NextStep '/sp.prd'
    }
}

function Invoke-OutlineOwnerReviewRequiredCheck {
    $outline = Join-Path $FeatureDir 'spec-outline.md'
    if (-not (Test-Path -LiteralPath $outline -PathType Leaf)) { return }

    if ($script:outlineDecisionCount -ne 1 -or $script:outlineCurrentStatus -ne 'READY_FOR_SPECIFY') { return }

    $outlineText = Get-Content -LiteralPath $outline -Raw
    if ([regex]::IsMatch($outlineText, '(?im)^\s{0,3}#{1,6}\s+([0-9]+[.)]\s+)?owner review required([\s:：-].*)?$')) { return }

    if (Test-OwnerReviewOutlineSignal $outlineText) {
        Add-Finding -Severity 'WARN' -Code 'OWNER_REVIEW_REQUIRED_MISSING' -Message 'spec-outline.md is READY_FOR_SPECIFY and contains high-risk or owner-decision signals, but no Owner Review Required block. This is a candidate warning; /sp.analyze or /sp.gate should decide whether owner confirmation is required before promotion.' -File $outline -NextStep '/sp.clarify'
    }
}

$script:outlineDecisionCount = 0
$script:outlineCurrentStatus = ''
$script:outlineConfirmationContract = $false
$script:outlineContractVersion = ''
$script:outlineReviewDataPath = ''
$script:outlineReviewDataId = ''
$script:outlineRecordedDigest = ''
$script:outlineAuthorityIds = ''
$script:outlineConfirmationPath = ''

function Initialize-OutlineCurrentState {
    $outline = Join-Path $FeatureDir 'spec-outline.md'
    $script:outlineDecisionCount = 0
    $script:outlineCurrentStatus = ''
    $script:outlineConfirmationContract = $false
    $script:outlineContractVersion = ''
    $script:outlineReviewDataPath = ''
    $script:outlineReviewDataId = ''
    $script:outlineRecordedDigest = ''
    $script:outlineAuthorityIds = ''
    $script:outlineConfirmationPath = ''
    if (-not (Test-Path -LiteralPath $outline -PathType Leaf)) { return }

    $inFence = $false
    $inDecision = $false
    $directFields = $false
    $decisionLevel = 0
    $capturedStatus = ''
    $inConfirmation = $false
    $confirmationLevel = 0

    foreach ($line in Get-Content -LiteralPath $outline) {
        if ($line -match '^\s{0,3}(```|~~~)') {
            $inFence = -not $inFence
            continue
        }
        if ($inFence) { continue }

        $heading = [regex]::Match($line, '^\s{0,3}(#{1,6})\s+(.+?)\s*#*\s*$')
        if ($heading.Success) {
            $level = $heading.Groups[1].Value.Length
            $title = $heading.Groups[2].Value.Trim()
            $title = [regex]::Replace($title, '^\d+[.)]\s+', '')
            if ($inConfirmation -and $level -le $confirmationLevel) {
                $inConfirmation = $false
            }
            if ($title -ieq 'Outline Decision') {
                $script:outlineDecisionCount++
                $inDecision = $true
                $directFields = $true
                $decisionLevel = $level
                continue
            }
            if ($title -ieq 'Outline Confirmation') {
                $script:outlineConfirmationContract = $true
                $inConfirmation = $true
                $confirmationLevel = $level
            }
            if ($inDecision) {
                if ($level -gt $decisionLevel) { $directFields = $false }
                else { $inDecision = $false }
            }
            continue
        }

        if ($inConfirmation) {
            $metadataMatch = [regex]::Match($line, '^\s*[-*+]\s+(.+?)\s*:\s*(.*?)\s*$')
            if ($metadataMatch.Success) {
                $metadataKey = ($metadataMatch.Groups[1].Value -replace '[*_]', '').Trim().ToLowerInvariant()
                $metadataKey = [regex]::Replace($metadataKey, '[ -]+', '_')
                $metadataValue = Clean-Cell $metadataMatch.Groups[2].Value
                switch ($metadataKey) {
                    'contract_version' { $script:outlineContractVersion = $metadataValue }
                    'review_data' { $script:outlineReviewDataPath = $metadataValue }
                    'review_data_id' { $script:outlineReviewDataId = $metadataValue }
                    'outline_digest' { $script:outlineRecordedDigest = $metadataValue }
                    'source_authority_ids' { $script:outlineAuthorityIds = $metadataValue }
                    'confirmation' { $script:outlineConfirmationPath = $metadataValue }
                }
            }
            continue
        }

        if (-not $inDecision -or -not $directFields) { continue }
        $statusMatch = [regex]::Match(
            $line,
            '^\s*[-*+]\s+(?:\*\*|__)?status(?:\*\*|__)?\s*:\s*(.+?)\s*$',
            [System.Text.RegularExpressions.RegexOptions]::IgnoreCase
        )
        if ($statusMatch.Success -and -not $capturedStatus) {
            $capturedStatus = ($statusMatch.Groups[1].Value -replace '[`*]', '').Trim('_').Trim().ToUpperInvariant()
        }
    }

    if ($script:outlineDecisionCount -eq 1) {
        $script:outlineCurrentStatus = $capturedStatus
    }
}

function Normalize-OutlineDigest {
    param([AllowNull()][string]$Value)
    $clean = Clean-Cell $Value
    $clean = [regex]::Replace($clean, '^sha256:', '', [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
    return $clean.ToLowerInvariant()
}

function Normalize-OutlineIdList {
    param([AllowNull()][string]$Value)
    if ($null -eq $Value) { $Value = '' }
    $clean = $Value.Trim()
    if ($clean.StartsWith('[')) { $clean = $clean.Substring(1) }
    if ($clean.EndsWith(']')) { $clean = $clean.Substring(0, $clean.Length - 1) }
    $items = @(
        $clean -split ',' |
            ForEach-Object { ($_ -replace '[`"]', '').Trim() } |
            Where-Object { $_ } |
            Sort-Object -Unique -CaseSensitive
    )
    return $items -join ','
}

function Get-OutlineConfirmationField {
    param(
        [string]$Path,
        [string]$Key
    )
    $lines = @(Get-Content -LiteralPath $Path)
    if ($lines.Count -eq 0 -or $lines[0].TrimEnd([char[]]@("`r")) -ne '---') { return '' }
    for ($index = 1; $index -lt $lines.Count; $index++) {
        $line = $lines[$index]
        if ($line.TrimEnd([char[]]@("`r")) -eq '---') { break }
        $match = [regex]::Match($line, '^\s*([^:]+)\s*:\s*(.*?)\s*$')
        if ($match.Success -and $match.Groups[1].Value.Trim() -ieq $Key) {
            return $match.Groups[2].Value.Trim()
        }
    }
    return ''
}

function Get-OutlineDigestHelperPath {
    $repoRoot = [System.IO.Path]::GetFullPath((Join-Path $FeatureDir '../..'))
    $candidates = @(
        (Join-Path $repoRoot '.specify/review/scripts/outline-digest.mjs'),
        ([System.IO.Path]::GetFullPath((Join-Path $scriptDir '../../templates/project/.specify/review/scripts/outline-digest.mjs')))
    )
    foreach ($candidate in $candidates) {
        if (Test-Path -LiteralPath $candidate -PathType Leaf) { return $candidate }
    }
    return ''
}

function Get-ReviewDataIdHelperPath {
    $repoRoot = [System.IO.Path]::GetFullPath((Join-Path $FeatureDir '../..'))
    $candidates = @(
        (Join-Path $repoRoot '.specify/review/scripts/review-data-id.mjs'),
        ([System.IO.Path]::GetFullPath((Join-Path $scriptDir '../../templates/project/.specify/review/scripts/review-data-id.mjs')))
    )
    foreach ($candidate in $candidates) {
        if (Test-Path -LiteralPath $candidate -PathType Leaf) { return $candidate }
    }
    return ''
}

function Invoke-ReadyOutlineConfirmationCheck {
    if ($script:outlineCurrentStatus -ne 'READY_FOR_SPECIFY') { return }

    $outline = Join-Path $FeatureDir 'spec-outline.md'
    $featureName = Split-Path -Leaf ($FeatureDir.TrimEnd([char[]]@('/', '\')))
    $expectedReviewPath = "specs/$featureName/prd/review/outline-review-data.json"
    $expectedConfirmationPath = "specs/$featureName/prd/review/outline-confirmation.md"
    $reviewFile = Join-Path $FeatureDir 'prd/review/outline-review-data.json'
    $confirmationFile = Join-Path $FeatureDir 'prd/review/outline-confirmation.md'

    if (
        $script:outlineContractVersion -ne '1' -or
        $script:outlineReviewDataPath -ne $expectedReviewPath -or
        $script:outlineConfirmationPath -ne $expectedConfirmationPath -or
        -not $script:outlineReviewDataId -or
        -not $script:outlineRecordedDigest -or
        -not $script:outlineAuthorityIds -or
        -not (Test-Path -LiteralPath $reviewFile -PathType Leaf) -or
        -not (Test-Path -LiteralPath $confirmationFile -PathType Leaf)
    ) {
        Add-Finding -Severity 'ERROR' -Code 'OUTLINE_CONFIRMATION_MISSING' -Message 'READY_FOR_SPECIFY under the new contract requires complete Outline Confirmation metadata, outline review data, and a git-trackable outline-confirmation.md written from the verified package.' -File $outline -NextStep '/sp.prd'
        return
    }

    try {
        $reviewData = Get-Content -LiteralPath $reviewFile -Raw | ConvertFrom-Json -ErrorAction Stop
    } catch {
        Add-Finding -Severity 'ERROR' -Code 'OUTLINE_CONFIRMATION_MISSING' -Message 'outline-review-data.json is missing or invalid JSON, so its authorization identity cannot be verified.' -File $reviewFile -NextStep '/sp.prd'
        return
    }

    if ($reviewData.artifact_path -ne $expectedReviewPath -or $reviewData.outline_source_path -ne "specs/$featureName/spec-outline.md") {
        Add-Finding -Severity 'ERROR' -Code 'OUTLINE_CONFIRMATION_IDENTITY_MISMATCH' -Message "The review-data artifact identity does not point to this feature's current outline contract." -File $reviewFile -NextStep '/sp.prd'
        return
    }

    $confirmationDocumentType = (Clean-Cell (Get-OutlineConfirmationField -Path $confirmationFile -Key 'document_type')).ToLowerInvariant()
    $confirmationReviewType = (Clean-Cell (Get-OutlineConfirmationField -Path $confirmationFile -Key 'review_type')).ToLowerInvariant()
    $confirmationSchemaVersion = Clean-Cell (Get-OutlineConfirmationField -Path $confirmationFile -Key 'schema_version')
    $confirmationReviewPath = Clean-Cell (Get-OutlineConfirmationField -Path $confirmationFile -Key 'review_data_artifact')
    $confirmationReviewId = Clean-Cell (Get-OutlineConfirmationField -Path $confirmationFile -Key 'review_data_id')
    $confirmationDigest = Get-OutlineConfirmationField -Path $confirmationFile -Key 'outline_digest'
    $confirmationAuthorities = Get-OutlineConfirmationField -Path $confirmationFile -Key 'source_authority_ids'
    $humanConfirmation = (Clean-Cell (Get-OutlineConfirmationField -Path $confirmationFile -Key 'human_confirmation')).ToLowerInvariant()
    $batchReviewStatus = (Clean-Cell (Get-OutlineConfirmationField -Path $confirmationFile -Key 'batch_review_status')).ToLowerInvariant()
    $needsDecision = Clean-Cell (Get-OutlineConfirmationField -Path $confirmationFile -Key 'needs_decision_items')
    $unresolved = Clean-Cell (Get-OutlineConfirmationField -Path $confirmationFile -Key 'unresolved_decision_items')
    $draftExcluded = Clean-Cell (Get-OutlineConfirmationField -Path $confirmationFile -Key 'draft_excluded_items')
    $revisionRequests = Clean-Cell (Get-OutlineConfirmationField -Path $confirmationFile -Key 'revision_requests')

    if (
        $confirmationDocumentType -ne 'sp_human_confirmation' -or
        $confirmationReviewType -ne 'outline' -or
        $confirmationSchemaVersion -ne '1' -or
        -not $confirmationReviewPath -or
        -not $confirmationReviewId -or
        -not $confirmationDigest -or
        -not $confirmationAuthorities -or
        -not $humanConfirmation -or
        -not $batchReviewStatus -or
        -not $needsDecision -or
        -not $unresolved -or
        -not $draftExcluded -or
        -not $revisionRequests
    ) {
        Add-Finding -Severity 'ERROR' -Code 'OUTLINE_CONFIRMATION_MISSING' -Message 'outline-confirmation.md must carry complete machine-readable authorization metadata in its opening YAML frontmatter.' -File $confirmationFile -NextStep '/sp.prd'
        return
    }

    $normalizedAuthorities = Normalize-OutlineIdList $script:outlineAuthorityIds
    $helper = Get-OutlineDigestHelperPath
    $node = Get-Command node -ErrorAction SilentlyContinue
    if (-not $helper -or -not $node) {
        Add-Finding -Severity 'ERROR' -Code 'OUTLINE_CONFIRMATION_STALE' -Message 'The canonical outline digest helper is unavailable, so freshness cannot be verified.' -File $outline -NextStep '/sp.prd'
        return
    }

    $authorityArgs = @()
    if ($normalizedAuthorities) { $authorityArgs = @($normalizedAuthorities -split ',') }
    $nodePath = [string]$node.Path
    if (-not $nodePath) { $nodePath = [string]$node.Source }
    $currentDigest = (& $nodePath $helper $outline @authorityArgs 2>$null | Out-String).Trim()
    if (
        $LASTEXITCODE -ne 0 -or
        -not $currentDigest -or
        (Normalize-OutlineDigest $script:outlineRecordedDigest) -ne (Normalize-OutlineDigest $currentDigest) -or
        (Normalize-OutlineDigest ([string]$reviewData.outline_digest)) -ne (Normalize-OutlineDigest $currentDigest) -or
        (Normalize-OutlineDigest $confirmationDigest) -ne (Normalize-OutlineDigest $currentDigest)
    ) {
        Add-Finding -Severity 'ERROR' -Code 'OUTLINE_CONFIRMATION_STALE' -Message 'The current outline digest does not match the Outline metadata, review data, and confirmation document. Regenerate the review and reconfirm in /sp.prd.' -File $outline -NextStep '/sp.prd'
        return
    }

    $reviewDataIdHelper = Get-ReviewDataIdHelperPath
    $currentReviewDataId = ''
    if ($reviewDataIdHelper) {
        $currentReviewDataId = (& $nodePath $reviewDataIdHelper $reviewFile 2>$null | Out-String).Trim()
        if ($LASTEXITCODE -ne 0) { $currentReviewDataId = '' }
    }
    if (
        -not $currentReviewDataId -or
        $script:outlineReviewDataId -ne $currentReviewDataId -or
        $confirmationReviewPath -ne $expectedReviewPath -or
        $confirmationReviewId -ne $currentReviewDataId
    ) {
        Add-Finding -Severity 'ERROR' -Code 'OUTLINE_CONFIRMATION_IDENTITY_MISMATCH' -Message 'outline-confirmation.md was produced for a different review-data identity.' -File $confirmationFile -NextStep '/sp.prd'
        return
    }

    $reviewAuthorities = @($reviewData.source_authority_ids) -join ','
    if (
        (Normalize-OutlineIdList $reviewAuthorities) -ne $normalizedAuthorities -or
        (Normalize-OutlineIdList $confirmationAuthorities) -ne $normalizedAuthorities
    ) {
        Add-Finding -Severity 'ERROR' -Code 'OUTLINE_CONFIRMATION_AUTHORITY_MISMATCH' -Message 'Source authority IDs differ between the current outline, review data, and confirmation document.' -File $confirmationFile -NextStep '/sp.prd'
        return
    }

    if (
        $humanConfirmation -ne 'confirmed' -or
        $batchReviewStatus -ne 'confirmed' -or
        $needsDecision -ne '[]' -or
        $unresolved -ne '[]' -or
        $draftExcluded -ne '[]' -or
        $revisionRequests -ne '[]'
    ) {
        Add-Finding -Severity 'ERROR' -Code 'OUTLINE_CONFIRMATION_UNRESOLVED' -Message 'Outline confirmation is not complete: confirmed status is required and needs-decision, unresolved, draft, and revision-request lists must all be empty before /sp.specify.' -File $confirmationFile -NextStep '/sp.prd'
    }
}

function Invoke-OutlineConfirmationGateCheck {
    $outline = Join-Path $FeatureDir 'spec-outline.md'
    if (-not (Test-Path -LiteralPath $outline -PathType Leaf)) { return }

    if ($script:outlineConfirmationContract) {
        if ($script:outlineDecisionCount -gt 1) {
            Add-Finding -Severity 'ERROR' -Code 'OUTLINE_DECISION_STATUS_AMBIGUOUS' -Message 'spec-outline.md contains multiple Outline Decision sections. Keep exactly one current decision before evaluating outline confirmation.' -File $outline -NextStep '/sp.prd'
            return
        }
        if ($script:outlineDecisionCount -eq 0 -or -not $script:outlineCurrentStatus) {
            Add-Finding -Severity 'ERROR' -Code 'OUTLINE_DECISION_STATUS_MISSING' -Message 'The new outline-confirmation contract requires one Outline Decision section with a direct Status field.' -File $outline -NextStep '/sp.prd'
            return
        }
        if ($script:outlineCurrentStatus -eq 'AWAITING_OUTLINE_CONFIRMATION') {
            Add-Finding -Severity 'ERROR' -Code 'OUTLINE_CONFIRMATION_PENDING' -Message 'The outline is semantically ready but still awaits verified graphical confirmation. Complete or consume the Outline confirmation package in /sp.prd before /sp.specify.' -File $outline -NextStep '/sp.prd'
            return
        }
        $validStatuses = @(
            'READY_FOR_SPECIFY', 'NEEDS_PRD', 'NEEDS_CLARIFY', 'NEEDS_SOURCE',
            'SPLIT_REQUIRED', 'NEEDS_DECISION', 'BLOCKED'
        )
        if ($script:outlineCurrentStatus -notin $validStatuses) {
            Add-Finding -Severity 'ERROR' -Code 'OUTLINE_DECISION_STATUS_INVALID' -Message "Outline Decision has an unsupported Status: $($script:outlineCurrentStatus)." -File $outline -NextStep '/sp.prd'
        }
        if ($script:outlineCurrentStatus -eq 'READY_FOR_SPECIFY') {
            Invoke-ReadyOutlineConfirmationCheck
        }
        return
    }

    if ($script:outlineDecisionCount -eq 1 -and $script:outlineCurrentStatus -eq 'READY_FOR_SPECIFY') {
        Add-Finding -Severity 'WARN' -Code 'LEGACY_OUTLINE_CONFIRMATION_DEPRECATED' -Message 'This legacy READY_FOR_SPECIFY outline has no Outline Confirmation contract. It remains usable for one minor-release compatibility window; the next /sp.prd refresh must generate graphical review data and require fresh confirmation.' -File $outline -NextStep '/sp.prd'
    }
}

function Invoke-EvidenceSignatureBlockCheck {
    Get-ChildItem -LiteralPath $FeatureDir -Recurse -File -Filter '*.md' -ErrorAction SilentlyContinue | ForEach-Object {
        $file = $_.FullName
        $lines = @(Get-Content -LiteralPath $file)
        for ($i = 0; $i -lt $lines.Count; $i++) {
            if ($lines[$i] -notmatch '^\s*[>#*\- ]*(Evidence Signature|evidence_signature)\s*:?\s*$') {
                continue
            }

            $end = $i
            $inFence = $false
            while ($end + 1 -lt $lines.Count -and ($end - $i) -lt 49) {
                $next = $lines[$end + 1]
                if ($next -match '^\s{0,3}(```|~~~)') {
                    $inFence = -not $inFence
                    $end += 1
                    continue
                }
                if (-not $inFence -and $next -match '^\s{0,3}#{1,6}\s+') { break }
                $end += 1
            }
            $block = ($lines[$i..$end] -join "`n").ToLowerInvariant()
            if ($block -notmatch 'source|sources|source[\s_-]*docs|source[\s_-]*files') {
                Add-Finding -Severity 'WARN' -Code 'EVIDENCE_SIGNATURE_FIELD_MISSING' -Message 'Evidence Signature is missing source files/docs. Minimum fields: sources, anchors, open-items, visual review, checks.' -File $file -NextStep '/sp.analyze'
            }
            if ($block -notmatch 'anchor|anchors|key[\s_-]*anchors|coordinate|trace') {
                Add-Finding -Severity 'WARN' -Code 'EVIDENCE_SIGNATURE_FIELD_MISSING' -Message 'Evidence Signature is missing key anchors or trace coordinates.' -File $file -NextStep '/sp.analyze'
            }
            if ($block -notmatch 'open[\s_-]*items|open_items|blockers|risks') {
                Add-Finding -Severity 'WARN' -Code 'EVIDENCE_SIGNATURE_FIELD_MISSING' -Message 'Evidence Signature is missing open-items/blocker state.' -File $file -NextStep '/sp.analyze'
            }
            if ($block -notmatch 'visual[\s_-]*review|visual_review|human[\s_-]*review|review[\s_-]*status') {
                Add-Finding -Severity 'WARN' -Code 'EVIDENCE_SIGNATURE_FIELD_MISSING' -Message 'Evidence Signature is missing visual/human review status.' -File $file -NextStep '/sp.analyze'
            }
            if ($block -notmatch 'check|checks|validation|evidence[\s_-]*record|test|gate|analyze') {
                Add-Finding -Severity 'WARN' -Code 'EVIDENCE_SIGNATURE_FIELD_MISSING' -Message 'Evidence Signature is missing check or validation evidence.' -File $file -NextStep '/sp.analyze'
            }
        }
    }
}

function Invoke-UnbackedHumanConfirmationMarkerCheck {
    $pattern = '\[src:user-confirmed\]|user-confirmed|USER_CONFIRMED|VERIFIED_BY_HUMAN|VERIFIED-BY-HUMAN|confirmed_by_user'
    Get-ChildItem -LiteralPath $FeatureDir -Recurse -File -Filter '*.md' -ErrorAction SilentlyContinue | ForEach-Object {
        $file = $_.FullName
        $lines = @(Get-Content -LiteralPath $file)
        for ($i = 0; $i -lt $lines.Count; $i++) {
            if ($lines[$i] -notmatch $pattern) {
                continue
            }

            $start = [Math]::Max(0, $i - 6)
            $end = [Math]::Min($lines.Count - 1, $i + 6)
            $block = ($lines[$start..$end] -join "`n").ToLowerInvariant()
            if ($block -match 'decision[\s_-]*record|decision[\s_-]*id|clarification[\s_-]*id|confirmed[\s_-]*by|confirmed_by_decision|clarifications\.md|clarify-log|human_decision|human[\s_-]*decision|owner[\s_-]*decision|user[\s_-]*decision|decision[\s_-]*package') {
                continue
            }

            Add-Finding -Severity 'WARN' -Code 'HUMAN_CONFIRMATION_EVIDENCE_MISSING' -Message 'Human-confirmation marker is not backed by a nearby decision record in the local scan window. This is a candidate WARN because a valid decision record may live in clarifications.md, clarify-log.md, or another cross-file handoff.' -File $file -NextStep '/sp.clarify'
        }
    }
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
    $script:blockCloseEvidence = ''
    $script:blockLastRefresh = ''
    $script:blockStatus = ''
    $script:blockTags = ''
    $openItemsHeaderLine = ''
    $openItemsHeaderMap = @{}

    foreach ($line in Get-Content -LiteralPath $openItems) {
        if ($line.StartsWith('### ')) {
            Invoke-OpenItemBlockFlush
            $script:blockItemId = Clean-Cell $line.Substring(4)
            continue
        }

        if ($script:blockItemId -and $line -match '^\s*[-*+]\s+([^:]+):(.*)$') {
            $fieldName = (Clean-Cell $matches[1]).ToLowerInvariant()
            $fieldValue = Clean-Cell $matches[2]
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
                'close evidence' { $script:blockCloseEvidence = $fieldValue }
                'last refresh' { $script:blockLastRefresh = $fieldValue }
                'tags' { $script:blockTags = $fieldValue }
                'status' { $script:blockStatus = $fieldValue }
            }
            continue
        }

        if (-not $line.StartsWith('|')) { continue }
        if (Test-MarkdownTableSeparator $line) { continue }

        $row = $line.Trim([char[]]@('|'))
        $cols = $row -split '\|'
        if (Test-SkipOpenItemsRow -Cells $cols) {
            if (Test-OpenItemsHeaderColumns -Cells $cols) {
                $openItemsHeaderLine = $line
                $openItemsHeaderMap = New-HeaderIndexMap -Headers $cols
            }
            continue
        }

        Invoke-OpenItemCheck `
            -ItemId (Get-OpenItemCell -Cells $cols -HeaderLine $openItemsHeaderLine -HeaderMap $openItemsHeaderMap -FallbackIndex 0 -Aliases @('item id', 'id', 'open item', 'open id')) `
            -ItemType (Get-OpenItemCell -Cells $cols -HeaderLine $openItemsHeaderLine -HeaderMap $openItemsHeaderMap -FallbackIndex 1 -Aliases @('type', 'item type')) `
            -Severity (Get-OpenItemCell -Cells $cols -HeaderLine $openItemsHeaderLine -HeaderMap $openItemsHeaderMap -FallbackIndex 2 -Aliases @('severity')) `
            -Anchor (Get-OpenItemCell -Cells $cols -HeaderLine $openItemsHeaderLine -HeaderMap $openItemsHeaderMap -FallbackIndex 5 -Aliases @('anchor', 'trace anchor', 'source anchor')) `
            -Owner (Get-OpenItemCell -Cells $cols -HeaderLine $openItemsHeaderLine -HeaderMap $openItemsHeaderMap -FallbackIndex 7 -Aliases @('owner')) `
            -Description (Get-OpenItemCell -Cells $cols -HeaderLine $openItemsHeaderLine -HeaderMap $openItemsHeaderMap -FallbackIndex 8 -Aliases @('description', 'summary')) `
            -ImpactArea (Get-OpenItemCell -Cells $cols -HeaderLine $openItemsHeaderLine -HeaderMap $openItemsHeaderMap -FallbackIndex 9 -Aliases @('impact area', 'impact')) `
            -AffectedDocs (Get-OpenItemCell -Cells $cols -HeaderLine $openItemsHeaderLine -HeaderMap $openItemsHeaderMap -FallbackIndex 10 -Aliases @('affected docs', 'affected documents', 'docs')) `
            -Rollback (Get-OpenItemCell -Cells $cols -HeaderLine $openItemsHeaderLine -HeaderMap $openItemsHeaderMap -FallbackIndex 11 -Aliases @('suggested rollback', 'rollback')) `
            -CloseCondition (Get-OpenItemCell -Cells $cols -HeaderLine $openItemsHeaderLine -HeaderMap $openItemsHeaderMap -FallbackIndex 12 -Aliases @('close condition', 'closure condition')) `
            -LastRefresh (Get-OpenItemCell -Cells $cols -HeaderLine $openItemsHeaderLine -HeaderMap $openItemsHeaderMap -FallbackIndex 13 -Aliases @('last refresh', 'last refreshed', 'updated')) `
            -Status (Get-OpenItemCell -Cells $cols -HeaderLine $openItemsHeaderLine -HeaderMap $openItemsHeaderMap -FallbackIndex 14 -Aliases @('status')) `
            -CloseEvidence (Get-OpenItemCell -Cells $cols -HeaderLine $openItemsHeaderLine -HeaderMap $openItemsHeaderMap -FallbackIndex 15 -Aliases @('close evidence', 'closure evidence', 'evidence')) `
            -Tags (Get-OpenItemCell -Cells $cols -HeaderLine $openItemsHeaderLine -HeaderMap $openItemsHeaderMap -FallbackIndex 6 -Aliases @('tags', 'tag'))
    }
    Invoke-OpenItemBlockFlush
}

Invoke-TraceExpandDocsLivenessCheck
Invoke-SubjectConfusionArtifactCheck -RelativeRoot 'flows' -NextStep '/sp.flow'
Invoke-SubjectConfusionArtifactCheck -RelativeRoot 'ui' -NextStep '/sp.ui'
Invoke-OutlineRepeatedBlockerSignatureCheck
Initialize-OutlineCurrentState
Invoke-OutlineConfirmationGateCheck
Invoke-ReadyOutlineSourceSnapshotCheck
Invoke-OutlineOwnerReviewRequiredCheck
Invoke-EvidenceSignatureBlockCheck
Invoke-UnbackedHumanConfirmationMarkerCheck

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
$humanReviewCodes = @('OWNER_REVIEW_REQUIRED_MISSING', 'HUMAN_CONFIRMATION_EVIDENCE_MISSING')
$needsHumanReview = [bool]@($findingItems | Where-Object { $humanReviewCodes -contains $_.code }).Count

if ($Json) {
    [PSCustomObject]@{
        status       = $status
        featureDir   = $FeatureDir
        errorCount   = $errorCount
        warningCount = $warningCount
        needsHumanReview = $needsHumanReview
        findings     = $findingItems
    } | ConvertTo-Json -Compress -Depth 5
} else {
    Write-Output "SP memory check: $status ($errorCount errors, $warningCount warnings, needsHumanReview=$needsHumanReview)"
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
