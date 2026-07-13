# SP Review Localhost Launcher Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Distribute a self-contained localhost review launcher, reject unsupported renderer transports, and expose view/module/requirement recommendation-save scopes.

**Architecture:** A Node.js standard-library server resolves the generated project root from its own installed path, serves repository files only on `127.0.0.1`, and emits a ready URL only after renderer and review-data HTTP checks return 200. The fixed renderer independently enforces the same transport contract and reuses its existing recommendation completion state machine for three scope selectors. Command templates, the review-data skill, and methodology docs point agents to the launcher as the only interactive entry.

**Tech Stack:** Node.js ESM standard library, browser JavaScript/HTML/CSS, Python pytest contract and subprocess tests, Playwright browser verification.

## Global Constraints

- The launcher is installed at `.specify/review/scripts/serve-review.mjs` and has no package dependencies.
- Bind only `127.0.0.1`; default port is `0`; do not accept an origin or bind host from input or environment.
- Emit `SPECCOMPASS_REVIEW_URL=` only after both the renderer and selected review-data URL return HTTP 200.
- The renderer accepts only `http:` with hostname exactly `127.0.0.1`; `file:`, `localhost`, `::1`, and other hosts remain blocked.
- Recommendation completion writes only `MISSING` decision nodes with a valid `recommended_option`; it never overwrites drafts or saved choices.
- The three scope labels are exactly `当前视图按推荐保存`, `当前模块按推荐保存`, and `当前需求按推荐保存`.
- Keep the implementation generic; do not embed any project-specific module, flow, screen, or review-data content.
- Preserve unrelated untracked user files under `.planning/`, `docs/examples/review/`, and `output/`.

---

### Task 1: Localhost Launcher

**Files:**
- Create: `tests/test_review_launcher.py`
- Create: `templates/project/.specify/review/scripts/serve-review.mjs`

**Interfaces:**
- Consumes: generated project layout containing `.specify/review/renderer/speccompass-review-renderer.html` and `specs/<feature>/{flows,ui}/review/*-review-data.json`.
- Produces: `node .specify/review/scripts/serve-review.mjs (--flow|--ui) <feature> [--port <0-65535>]` and a single `SPECCOMPASS_REVIEW_URL=http://127.0.0.1:<port>/...` readiness line.

- [ ] **Step 1: Write failing CLI validation tests**

Add parameterized subprocess tests for missing review type, both review types, invalid feature IDs, invalid ports, and missing renderer/data. Assert non-zero exit and absence of `SPECCOMPASS_REVIEW_URL=`.

```python
@pytest.mark.parametrize("args", [[], ["--flow", "a", "--ui", "a"], ["--flow", "../a"], ["--port", "nope", "--flow", "a"]])
def test_launcher_rejects_invalid_arguments(review_project, args):
    result = subprocess.run(["node", str(review_project.launcher), *args], text=True, capture_output=True)
    assert result.returncode != 0
    assert "SPECCOMPASS_REVIEW_URL=" not in result.stdout
```

- [ ] **Step 2: Run the validation tests and verify RED**

Run: `uv run pytest tests/test_review_launcher.py -q`

Expected: FAIL because `serve-review.mjs` is absent.

- [ ] **Step 3: Add argument parsing and project-root discovery**

Implement strict mutually exclusive `--flow`/`--ui`, optional decimal port validation, feature validation with `/^[A-Za-z0-9][A-Za-z0-9._-]*$/` plus `..` rejection, and project root resolution by walking three parents from the launcher's directory.

```javascript
const launcherPath = await realpath(fileURLToPath(import.meta.url));
const projectRoot = resolve(dirname(launcherPath), "../../..");
const featurePattern = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
```

- [ ] **Step 4: Write failing HTTP behavior tests**

Start the process with `--port 0`, parse the ready line, and exercise renderer/data/assets, `HEAD`, invalid Host, `POST`, traversal attempts, symlink escape, and `SIGTERM`. Assert MIME, `no-store`, `nosniff`, no body for HEAD, port release, and no readiness line before both resources exist.

```python
ready = read_ready_url(process)
response = request_url(ready)
assert response.status == 200
assert response.headers["Cache-Control"] == "no-store"
assert response.headers["X-Content-Type-Options"] == "nosniff"
```

- [ ] **Step 5: Run HTTP tests and verify RED**

Run: `uv run pytest tests/test_review_launcher.py -q`

Expected: FAIL on missing server behavior.

- [ ] **Step 6: Implement the constrained static server and self-check**

Use `node:http`, `node:fs/promises`, `node:path`, and `node:url`. Enforce exact Host, GET/HEAD only, decoded normalized path containment, existing-file realpath containment, no directories, explicit MIME types, headers, parallel 5-second self-checks, and idempotent signal/error shutdown.

```javascript
const server = createServer(handleRequest);
server.listen({ host: "127.0.0.1", port }, async () => {
  const actualPort = server.address().port;
  await Promise.all([checkUrl(rendererUrl), checkUrl(reviewDataUrl)]);
  console.log(`SPECCOMPASS_REVIEW_URL=${rendererUrl}`);
});
```

- [ ] **Step 7: Run launcher tests and verify GREEN**

Run: `uv run pytest tests/test_review_launcher.py -q`

Expected: all launcher tests pass and no child server remains running.

### Task 2: Renderer Transport Gate and Recommendation Scopes

**Files:**
- Modify: `tests/test_sp_methodology_templates.py`
- Modify: `templates/project/.specify/review/renderer/speccompass-review-renderer.html`
- Modify: `templates/project/.specify/review/renderer/scripts/state-store.js`
- Modify: `templates/project/.specify/review/renderer/scripts/data-loader.js`

**Interfaces:**
- Consumes: existing `visibleNodes()`, `allNodes()`, `runRecommendationCompletion(entries, scopeLabel)`, and renderer load controls.
- Produces: `currentModuleNodes(): node[]`, `isSupportedReviewTransport(): boolean`, and three independently bound scope buttons.

- [ ] **Step 1: Write failing static contract tests**

Assert exact labels and IDs for the view/module/requirement buttons, handler calls with `currentItemNodes()`, `currentModuleNodes()`, and `allNodes().map(({ node }) => node)`, plus strict `http:`/`127.0.0.1` transport checks and blocked-control behavior.

```python
for label in ("当前视图按推荐保存", "当前模块按推荐保存", "当前需求按推荐保存"):
    assert label in renderer
assert 'window.location.protocol === "http:"' in data_loader
assert 'window.location.hostname === "127.0.0.1"' in data_loader
```

- [ ] **Step 2: Run focused renderer tests and verify RED**

Run: `uv run pytest tests/test_sp_methodology_templates.py -k 'transport or recommendation_scope' -q`

Expected: FAIL because the module scope and hard transport gate do not exist.

- [ ] **Step 3: Implement `currentModuleNodes()` and scope handlers**

Flatten only the current module's current review-type item collection in data order. Bind the three buttons to the existing completion helper with labels `当前视图`, `当前模块`, and `当前需求`.

```javascript
function currentModuleNodes() {
  return (currentModule()?.[itemKey()] || []).flatMap((item) => item.nodes || []);
}
```

- [ ] **Step 4: Implement the renderer transport gate**

Before accepting inline data or starting any fetch, check exact protocol and hostname. On failure, disable `load-flow`, `load-ui`, `file-input`, `download-package`, and `copy-summary`, set a blocking status naming `.specify/review/scripts/serve-review.mjs`, and return without calling `acceptReviewData()`.

```javascript
function isSupportedReviewTransport() {
  return window.location.protocol === "http:" && window.location.hostname === "127.0.0.1";
}
```

- [ ] **Step 5: Run focused and full renderer tests and verify GREEN**

Run: `uv run pytest tests/test_sp_methodology_templates.py -q`

Expected: `115+` tests pass.

### Task 3: Agent and Documentation Contract

**Files:**
- Modify: `tests/test_sp_methodology_templates.py`
- Modify: `templates/commands/flow.md`
- Modify: `templates/commands/ui.md`
- Modify: `templates/skills/speccompass-review-data/SKILL.md`
- Modify: `templates/project/.specify/review/renderer/README.md`
- Modify: `docs/reference/sp-project-methodology.md`

**Interfaces:**
- Consumes: launcher CLI and readiness line from Task 1.
- Produces: synchronized instructions that require validation, launcher startup, HTTP 200 readiness, and prohibition of `file://` fallback.

- [ ] **Step 1: Write failing documentation contract tests**

Require both launch commands, `SPECCOMPASS_REVIEW_URL=`, `127.0.0.1`, both HTTP 200 checks, no interactive `file://` fallback, `specify init --force` refresh guidance, and the three recommendation scopes in maintained docs.

```python
for content in (flow, ui, skill, renderer_readme, methodology):
    assert "serve-review.mjs" in content
    assert "SPECCOMPASS_REVIEW_URL=" in content
    assert "file://" in content and ("禁止" in content or "must not" in content)
```

- [ ] **Step 2: Run documentation tests and verify RED**

Run: `uv run pytest tests/test_sp_methodology_templates.py -k 'localhost_launcher or recommendation_scope_documentation' -q`

Expected: FAIL on missing launcher contract.

- [ ] **Step 3: Update command templates and review-data skill**

Add a mandatory close-out sequence: validate JSON, start the matching launcher in a long-running terminal, wait for the readiness line, and return only that exact URL. Explicitly forbid guessed ports, `file://`, relative file links, and finishing after failed self-checks.

- [ ] **Step 4: Update renderer README and methodology**

Document the launcher as fixed infrastructure, strict transport contract, refresh via `specify init --force`, download completion prompt, and exact view/module/requirement recommendation scopes. Remove wording that treats manual file loading under `file://` as a valid interactive fallback.

- [ ] **Step 5: Run documentation tests and verify GREEN**

Run: `uv run pytest tests/test_sp_methodology_templates.py -q`

Expected: all methodology tests pass.

### Task 4: Distribution and Browser Verification

**Files:**
- Modify: `tests/test_review_launcher.py`
- Test only: generated temporary project and fixed renderer assets.

**Interfaces:**
- Consumes: Specify CLI `init` and `init --force` project template distribution.
- Produces: evidence that generated projects contain and can run the launcher, and that the user workflow works in a real browser.

- [ ] **Step 1: Add and run distribution tests**

Initialize a temporary project, assert `.specify/review/scripts/serve-review.mjs` exists, replace it with stale content, run the repository's supported `--force` refresh path, and assert the canonical launcher is restored.

Run: `uv run pytest tests/test_review_launcher.py -k distribution -q`

Expected: PASS because the project template copier includes all files under `.specify/review/`.

- [ ] **Step 2: Run complete automated tests**

Run: `uv run pytest -q`

Expected: all tests pass with zero failures.

- [ ] **Step 3: Start a real launcher and verify with Playwright**

Create generic temporary flow review data under a temporary generated project, start the installed launcher, open its emitted URL, and verify the page is nonblank, the three scope buttons fit at desktop and mobile widths, the current-module action affects only the selected module, and download prompts before filling missing decisions.

- [ ] **Step 4: Verify unsupported transport behavior**

Open the renderer through `file://` and through a non-`127.0.0.1` hostname. Assert controls are disabled, the launcher instruction is visible, no review data is accepted, and no package can be downloaded.

### Task 5: Review, Commit, and Demonstration Server

**Files:**
- Review: all files changed against `9adc595`.

**Interfaces:**
- Consumes: verified implementation diff.
- Produces: independent Claude/Gemini review results, a commit, and a live `127.0.0.1` demonstration URL.

- [ ] **Step 1: Run fresh verification**

Run focused launcher tests, full pytest, `git diff --check`, and inspect `git status --short` to ensure unrelated user files are unmodified.

- [ ] **Step 2: Ask Claude and Gemini to review the implementation**

Use `/Users/hula/.npm-global/bin/claude` and `/Users/hula/.local/bin/gemini-ttk` with the repository diff plus design document. Require findings ordered by severity and explicit approval/block status; never include secrets.

- [ ] **Step 3: Fix blocking findings using TDD and reverify**

For each reproducible critical/high finding, add or tighten a failing test, implement the smallest correction, rerun focused and full tests, then rerun the affected reviewer.

- [ ] **Step 4: Commit the reviewed implementation**

Stage only the plan, launcher, renderer, tests, command/skill templates, and maintained docs. Commit with `feat: require localhost review launcher`.

- [ ] **Step 5: Start the live demonstration server**

Run the repository copy of `serve-review.mjs` against available generic/example review data or a generated temporary project, keep the process alive, and return the exact emitted `http://127.0.0.1:<port>/...` link to the user.
