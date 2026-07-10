# Review Recommendation Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the fixed SP review renderer check all unresolved selections before confirmation-package download and provide all-review plus current-view recommendation completion controls without overwriting human choices.

**Architecture:** Add shared state helpers that summarize and fill only `MISSING` decision nodes with a valid `recommended_option`. Reuse those helpers from both bulk-action buttons and from the download gate so all scopes apply the same preservation rules. Keep this entirely in the reusable renderer/template contract; do not add project-specific modules, nodes, or review data.

**Tech Stack:** Browser JavaScript, static HTML/CSS, Python pytest contract tests, Node.js VM checks, Playwright browser verification.

## Global Constraints

- Change only the reusable SP mechanism, fixed renderer, renderer documentation, examples, and mechanism tests.
- Do not edit or add project-specific flow/UI review data.
- Bulk actions may write only nodes whose state is `MISSING` and that have a valid `recommended_option`.
- Never overwrite `DRAFT`, `SAVED_RECOMMENDED`, or `SAVED_SUBMITTED`.
- Download must stop when unresolved decision nodes without valid recommendations remain.
- Storage failure must roll back recommendation completion and must not claim success.
- Existing draft warning and second-click download behavior must remain intact.
- Preserve the existing `huashu-design` renderer styling and compact right-rail layout.

---

### Task 1: Lock the mechanism contract with failing tests

**Files:**
- Modify: `tests/test_sp_methodology_templates.py`

**Interfaces:**
- Consumes: `_review_renderer_bundle()`, fixed renderer HTML, renderer README.
- Produces: assertions for `bulk-all-recommended`, current-view copy, shared recommendation helpers, whole-review download prompt, and unresolved-without-recommendation blocking.

- [x] **Step 1: Add failing renderer contract assertions**

Extend `test_review_data_template_assets_exist_and_describe_reusable_renderer_contract()` and `test_review_renderer_downloads_split_confirmation_packages()` to require:

```python
assert 'id="bulk-all-recommended"' in renderer
assert "全部选择推荐" in renderer
assert "当前视图剩余项选推荐" in renderer
assert "summarizeRecommendationCompletion" in renderer
assert "applyRecommendedToMissing" in renderer
assert "allNodes().map" in renderer
assert "剩余未选项" in renderer
assert "缺少推荐选项" in renderer
assert "不会覆盖已有选择或草稿" in renderer
```

Require the renderer README to state that whole-review and current-view actions only fill `MISSING` nodes and that download is blocked if unresolved nodes without recommendations remain.

- [x] **Step 2: Run the focused test and verify RED**

Run:

```bash
uv run pytest tests/test_sp_methodology_templates.py::test_review_data_template_assets_exist_and_describe_reusable_renderer_contract tests/test_sp_methodology_templates.py::test_review_renderer_downloads_split_confirmation_packages -q
```

Expected: FAIL because the new all-review button, shared helpers, and download copy do not exist.

### Task 2: Implement shared recommendation completion and download gating

**Files:**
- Modify: `templates/project/.specify/review/renderer/scripts/state-store.js`
- Modify: `templates/project/.specify/review/renderer/scripts/data-loader.js`
- Modify: `templates/project/.specify/review/renderer/scripts/review-rail.js`

**Interfaces:**
- Consumes: `requiresNodeDecision(node)`, `nodeState(node.id)`, `markSummaryDirty()`, `saveState()`, `allNodes()`, `visibleNodes()`.
- Produces: `summarizeRecommendationCompletion(nodes)` returning counts and eligible nodes; `applyRecommendedToMissing(nodes)` returning save/skip counts; handlers for all-review and current-view scopes; download preflight that may fill all eligible missing nodes and blocks unfillable missing nodes.

- [x] **Step 1: Add shared state helpers**

In `state-store.js`, normalize entries from `allNodes()` or direct node arrays and implement:

```javascript
function recommendationNode(entry) {
  return entry?.node || entry;
}

function summarizeRecommendationCompletion(entries) {
  const summary = {
    unfinished: 0,
    canSaveRecommended: 0,
    drafts: 0,
    saved: 0,
    missingRecommendation: 0,
    eligible: []
  };
  for (const entry of entries || []) {
    const node = recommendationNode(entry);
    if (!node || !requiresNodeDecision(node)) continue;
    const current = nodeState(node.id);
    if (current.status === "DRAFT") {
      summary.drafts += 1;
    } else if (isResolved(node)) {
      summary.saved += 1;
    } else {
      summary.unfinished += 1;
      if (node.recommended_option) {
        summary.canSaveRecommended += 1;
        summary.eligible.push(node);
      } else {
        summary.missingRecommendation += 1;
      }
    }
  }
  return summary;
}

function applyRecommendedToMissing(entries) {
  const summary = summarizeRecommendationCompletion(entries);
  for (const node of summary.eligible) {
    state[node.id] = { status: "SAVED_RECOMMENDED", option: node.recommended_option };
  }
  if (summary.eligible.length) markSummaryDirty();
  return { ...summary, savedRecommended: summary.eligible.length };
}
```

- [x] **Step 2: Replace the current-view implementation and add all-review handler**

In `data-loader.js`, add `runRecommendationCompletion(entries, scopeLabel)` to show the count prompt, preserve existing states, save once, reset export warnings, and render. Wire:

```javascript
$("bulk-all-recommended").addEventListener("click", () => {
  runRecommendationCompletion(allNodes().map(({ node }) => node), "所有模块和流程");
});

$("bulk-recommended").addEventListener("click", () => {
  runRecommendationCompletion(visibleNodes(), selectedNodeId ? "当前节点" : "当前流程或界面");
});
```

- [x] **Step 3: Gate package download on all missing decisions**

At the start of `downloadConfirmationPackage()`, summarize `allNodes()`. If missing items exist, ask whether to fill all eligible items and continue. Cancel returns without mutation or download. Confirm applies recommendations and persists state. If `missingRecommendation > 0` remains, set an error status and return before package generation. Then continue through the existing draft warning behavior.

- [x] **Step 4: Run focused tests and verify GREEN**

Run the Task 1 focused pytest command.

Expected: PASS.

### Task 3: Expose controls, document the contract, and verify the browser flow

**Files:**
- Modify: `templates/project/.specify/review/renderer/speccompass-review-renderer.html`
- Modify: `docs/examples/review/flow-preview.html`
- Modify: `docs/examples/review/ui-preview.html`
- Modify: `templates/project/.specify/review/renderer/README.md`
- Modify: `tests/test_sp_methodology_templates.py`

**Interfaces:**
- Consumes: `bulk-all-recommended` and `bulk-recommended` handlers from Task 2.
- Produces: reusable mechanism UI and documented behavior for generated SP projects.

- [x] **Step 1: Add both controls to fixed and example HTML**

Use the same order in every renderer entry point:

```html
<button id="bulk-all-recommended">全部选择推荐</button>
<button id="bulk-recommended">当前视图剩余项选推荐</button>
```

Keep `显示全部确认点` and `重置可见项` unchanged. Do not edit review-data fixtures.

- [x] **Step 2: Document scope and download behavior**

Update the renderer README interaction contract to state:

- whole-review means all modules and all flow/UI items in the loaded review data;
- current-view means selected node when focused, otherwise the current flow/UI item;
- both actions fill only `MISSING` nodes with recommendations;
- download prompts once for all missing decisions, fills eligible nodes only after confirmation, and blocks if any missing node lacks a recommendation;
- drafts and saved human decisions are never overwritten.

- [x] **Step 3: Run mechanism tests**

Run:

```bash
uv run pytest tests/test_sp_methodology_templates.py -q
```

Expected: all tests pass.

- [x] **Step 4: Run broader release-policy regression tests**

Run:

```bash
uv run pytest tests/test_release_policy.py tests/test_cli_version.py -q
```

Expected: all tests pass.

- [x] **Step 5: Verify browser behavior**

Serve the repository root locally and use Playwright against `docs/examples/review/flow-preview.html`. Clear local storage, load the flow example, click download, and verify the confirmation prompt appears before a download. Cancel and verify no download. Click `全部选择推荐`, confirm, and verify cross-module pending counts update. Confirm that current-view completion affects only the selected scope and that no controls overlap at desktop and mobile widths.

- [x] **Step 6: Review and commit**

Run:

```bash
git diff --check
git status --short
```

Review only mechanism files, tests, docs, and the plan. Do not stage `docs/examples/review/*-clarify-experiment.*` or `output/`. Commit after the mandatory code review passes.
