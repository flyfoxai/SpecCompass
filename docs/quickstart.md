# Quick Start Guide

This guide will help you get started with Spec-Driven Development using Spec Kit.

> [!NOTE]
> All automation scripts now provide both Bash (`.sh`) and PowerShell (`.ps1`) variants. The `specify` CLI auto-selects based on OS unless you pass `--script sh|ps`.

## The SpecCompass Process

> [!TIP]
> **Context Awareness**: Spec Kit commands automatically detect the active feature based on your current Git branch (e.g., `001-feature-name`). To switch between different specifications, simply switch Git branches.

### Resume an Existing Project

When you reopen an initialized project or return to an agent thread, start with
`/sp.route`. It emits `speckit.route.v1` JSON and recommends the next `/sp.*`
command without executing it.

Use `/sp.route y` only when you want the agent to continue directly after the
route check. The command template may dispatch the recommended command only
when `continueAllowed` is true. `REPEATED_FALLBACK`, `fallback-log.md` loop
evidence, human decisions, and unknown blockers stop automatic continuation and
route to `/sp.clarify` or the named owner decision path.

### Run a Lite Validation Round

After `/sp.prd` has produced the PRD and confirmed Outline, use `/sp.lite` when
you want the smallest runnable prototype for business validation instead of the
entire full-cycle scope at once. The command presents 2-3 directions and waits
for human selection; you may choose, modify, combine, or replace them.

```markdown
/sp.lite init
```

Run `/sp.lite next` again after validation to add another cumulative feature or
start an independent branch. Every round is checked against the global roadmap,
prior rounds, shared contracts, write scopes, and historical regressions. A
conflict, duplicate scope, stale dependency, or regression stops automatic
progress and routes to the owning SP command. Blocker repair is human-invoked,
limited to the named evidence and write set, and must return to `/sp.lite sync`
before normal work can resume. A successful Lite round proves only its business
hypothesis; the confirmed Outline remains the project completion boundary.

The bundled `speckit-lite` workflow re-enters the same coordinator. It does not
hard-code the downstream command order. Start a new workflow run for each Lite
selection or continuation:

```bash
specify workflow run speckit-lite -i integration=codex -i spec="Validate the smallest useful photo-album flow"
specify workflow run speckit-lite -i integration=codex -i spec="Add the next selected capability" -i feature="001-photo-album"
```

### Step 1: Install Specify

**In your terminal**, run the `specify` CLI command to initialize your project:

```bash
# Create a new project directory
uvx --from git+https://github.com/flyfoxai/SpecCompass.git specify init <PROJECT_NAME>

# OR initialize in the current directory
uvx --from git+https://github.com/flyfoxai/SpecCompass.git specify init .
```

Pick script type explicitly (optional):

```bash
uvx --from git+https://github.com/flyfoxai/SpecCompass.git specify init <PROJECT_NAME> --script ps  # Force PowerShell
uvx --from git+https://github.com/flyfoxai/SpecCompass.git specify init <PROJECT_NAME> --script sh  # Force POSIX shell
```

### Step 2: Define Your Constitution

**In your AI Agent's chat interface**, use the SP command for your host to establish the core rules and principles for your project. Slash-command hosts use `/sp.constitution`; Codex uses the `sp-constitution` skill by typing `$`, running `/skills` and selecting it, or making a matching natural-language request. You should provide your project's specific principles as arguments.

```markdown
/sp.constitution This project follows a "Library-First" approach. All features must be implemented as standalone libraries first. We use TDD strictly. We prefer functional programming patterns.
```

For Codex, use the matching skill form:

```markdown
$sp-constitution This project follows a "Library-First" approach. All features must be implemented as standalone libraries first. We use TDD strictly. We prefer functional programming patterns.
```

### Step 3: Capture PRD Intake

**In the chat**, use `/sp.prd` on slash-command hosts, or `$sp-prd` / `/skills` / a matching natural-language request in Codex, to capture the upstream product intent. Focus on the strategic goal, users, scope, source tags, and enough outline readiness for the next step. The PRD stage owns the lightweight `spec-outline.md`; do not run a separate required `sp.outline` step.

```markdown
/sp.prd Build an application that can help me organize my photos in separate photo albums. Albums are grouped by date and can be re-organized by dragging and dropping on the main page. Albums are never in other nested albums. Within each album, photos are previewed in a tile-like interface.
```

### Step 4: Stabilize the Spec

After PRD and outline readiness are available, use `/sp.specify` on slash-command hosts, or `$sp-specify` / `/skills` / a matching natural-language request in Codex. `/sp.specify` consumes `prd.md` and `spec-outline.md`; it should not restart from the original raw request.

```markdown
/sp.specify Use the current PRD and spec-outline readiness to create the stable feature specification.
```

### Step 5: Refine the Spec

**In the chat**, use `/sp.clarify` on slash-command hosts, or `$sp-clarify` / `/skills` / a matching natural-language request in Codex, to identify and resolve ambiguities in your specification. You can provide specific focus areas as arguments.

```bash
/sp.clarify Focus on security and performance requirements.
```

### Step 6: Design Business Flow and UI

Use `/sp.flow` to model the target business process, then `/sp.ui` to model the target product screens from that business flow. These commands should not draw the SP workflow itself.

```markdown
/sp.flow
/sp.ui
```

Review the generated flow and UI artifacts before moving on.

### Step 7: Gate and Bundle the Business Documents

Use `/sp.gate` to check business-document readiness, then `/sp.bundle` to package the approved first-layer feature documents.

```markdown
/sp.gate
/sp.bundle
```

### Step 8: Create a Technical Implementation Plan

**In the chat**, use `/sp.plan` on slash-command hosts, or `$sp-plan` / `/skills` / a matching natural-language request in Codex, to provide your tech stack and architecture choices.

```markdown
/sp.plan The application uses Vite with minimal number of libraries. Use vanilla HTML, CSS, and JavaScript as much as possible. Images are not uploaded anywhere and metadata is stored in a local SQLite database.
```

### Step 9: Break Down and Implement

**In the chat**, use `/sp.tasks` on slash-command hosts, or `$sp-tasks` / `/skills` / a matching natural-language request in Codex, to create an actionable task list.

```markdown
/sp.tasks
```

Optionally, validate the plan with `/sp.analyze`, or `$sp-analyze` / `/skills` / a matching natural-language request in Codex:

```markdown
/sp.analyze
```

Then, use `/sp.implement`, or `$sp-implement` / `/skills` / a matching natural-language request in Codex, to execute the plan.

```markdown
/sp.implement
```

> [!TIP]
> **Phased Implementation**: For complex projects, implement in phases to avoid overwhelming the agent's context. Start with core functionality, validate it works, then add features incrementally.

## Detailed Example: Building Taskify

Here's a complete example of building a team productivity platform:

### Step 1: Define Constitution

Initialize the project's constitution to set ground rules:

```markdown
/sp.constitution Taskify is a "Security-First" application. All user inputs must be validated. We use a microservices architecture. Code must be fully documented.
```

### Step 2: Capture PRD with `/sp.prd`

```markdown
/sp.prd
Develop Taskify, a team productivity platform. It should allow users to create projects, add team members,
assign tasks, comment and move tasks between boards in Kanban style. In this initial phase for this feature,
let's call it "Create Taskify," let's have multiple users but the users will be declared ahead of time, predefined.
I want five users in two different categories, one product manager and four engineers. Let's create three
different sample projects. Let's have the standard Kanban columns for the status of each task, such as "To Do,"
"In Progress," "In Review," and "Done." There will be no login for this application as this is just the very
first testing thing to ensure that our basic features are set up.
```

### Step 3: Stabilize the Specification

Use `/sp.specify` only after the PRD stage has produced enough outline readiness:

```bash
/sp.specify Use the current Taskify PRD and spec-outline readiness to create the stable feature specification.
```

### Step 4: Refine the Specification

Use the `/sp.clarify` command to interactively resolve any ambiguities in your specification. You can also provide specific details you want to ensure are included.

```bash
/sp.clarify I want to clarify the task card details. For each task in the UI for a task card, you should be able to change the current status of the task between the different columns in the Kanban work board. You should be able to leave an unlimited number of comments for a particular card. You should be able to, from that task card, assign one of the valid users.
```

You can continue to refine the spec with more details using `/sp.clarify`:

```bash
/sp.clarify When you first launch Taskify, it's going to give you a list of the five users to pick from. There will be no password required. When you click on a user, you go into the main view, which displays the list of projects. When you click on a project, you open the Kanban board for that project. You're going to see the columns. You'll be able to drag and drop cards back and forth between different columns. You will see any cards that are assigned to you, the currently logged in user, in a different color from all the other ones, so you can quickly see yours. You can edit any comments that you make, but you can't edit comments that other people made. You can delete any comments that you made, but you can't delete comments anybody else made.
```

### Step 5: Design Business Flow and UI

Create the business process model first, then derive UI from that business flow:

```bash
/sp.flow
/sp.ui
```

Review the generated flow and UI diagrams or artifacts before continuing. If the diagrams show the SP command process instead of the Taskify business process, reject them and rerun the owner step.

### Step 6: Gate and Bundle Business Documents

```bash
/sp.gate
/sp.bundle
```

### Step 7: Generate Technical Plan with `/sp.plan`

Be specific about your tech stack and technical requirements:

```bash
/sp.plan We are going to generate this using .NET Aspire, using Postgres as the database. The frontend should use Blazor server with drag-and-drop task boards, real-time updates. There should be a REST API created with a projects API, tasks API, and a notifications API.
```

### Step 8: Define Tasks

Generate an actionable task list using the `/sp.tasks` command:

```bash
/sp.tasks
```

### Step 9: Validate and Implement

Have your AI agent audit the implementation plan using `/sp.analyze`:

```bash
/sp.analyze
```

Finally, implement the solution:

```bash
/sp.implement
```

> [!TIP]
> **Phased Implementation**: For large projects like Taskify, consider implementing in phases (e.g., Phase 1: Basic project/task structure, Phase 2: Kanban functionality, Phase 3: Comments and assignments). This prevents context saturation and allows for validation at each stage.

## Key Principles

- **Be explicit** about what you're building and why
- **Don't focus on tech stack** during specification phase
- **Iterate and refine** your specifications before implementation
- **Validate** the plan before coding begins
- **Let the AI agent handle** the implementation details

## Next Steps

- Read the local `spec-driven.md` for the baseline methodology
- Check out the local `templates/` directory for command and project templates
- Compare with [upstream Spec Kit](https://github.com/github/spec-kit) when you need to understand the original baseline
