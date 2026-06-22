---
name: huashu-design
description: Design UI specifications, frontend display pages, implementation surfaces, and SpecCompass confirmation surfaces with the Huashu visual system.
compatibility: Requires spec-kit project structure with .specify/ directory
metadata:
  author: github-spec-kit
  source: core_pack:skills/huashu-design/SKILL.md
---

# huashu-design

Use this skill when designing UI specifications, frontend display pages, later
frontend implementation work, UI confirmation pages, `ui-review.html`, project
UI previews, module page previews, and any SpecCompass surface that users
inspect visually before authorization.

Apply a restrained, work-focused UI style:

- Use Tiffany Blue `#0ABAB5` as the primary project color.
- Keep confirmation pages consistent with the unified SpecCompass template.
- Put feedback and approval controls in the narrow right confirmation rail.
- Make screens scannable, labeled, and traceable for human review.
- Prefer clear information hierarchy over decorative layouts.

For `/sp.ui`, treat this skill as the design authority for frontend display
pages and business UI previews. For later frontend development, translate the
confirmed design into theme tokens, CSS variables, component styles, layout
rules, and acceptance checks.

Use three scopes:

- `review-surface`: SpecCompass confirmation pages. Huashu is mandatory and the
  right confirmation rail, approve/defer/reject controls, authorization
  writeback, and SpecCompass labels belong here.
- `business-preview`: target product UI previews generated for human review.
  Huashu is the default design authority unless the PRD names a stronger
  product design system.
- `business-production`: target product frontend implementation. Huashu remains
  the baseline design and acceptance constraint, unless the PRD or confirmed
  product design system overrides it.

React + Vite, Storybook, JSON Forms, a project dev server, Vue, Svelte, or any
other frontend framework are rendering carriers; they do not replace this design
guidance. If a PRD-specified brand, design system, or framework conflicts with
Huashu in business production UI, follow the confirmed PRD authority and record
the deviation, reason, and affected scope.

Never copy review-surface controls into business UI unless the target product
explicitly requires that business feature. The right confirmation rail,
approve/defer/reject controls, authorization writeback UI, and SpecCompass
control-plane labels are for SpecCompass review surfaces only.
