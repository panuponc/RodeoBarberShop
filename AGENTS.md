# Project Collaboration Rules

## Scope And Milestones

- Read the current milestone plan in `docs/05_SPRINT_PLAN.md` and inspect the implementation before reporting progress or choosing the next task.
- Distinguish a project-wide question from a focused implementation request. Do not replace a broad progress report with only the most recently edited feature.
- Keep planned work visible even when it belongs to a later phase. In particular, completing the barber queue/service flow does not complete barber leave management.
- Separate implemented, verified, incomplete, and proposed work. Do not claim an entire milestone is complete when only one workflow is done.
- Do not turn conversational feature ideas into approved scope or the next milestone without agreement.
- Keep explanations concise and manageable. Suggest one next step with its reason instead of overwhelming the user with a large task list.

## Git Ownership

- The user is a Git beginner. Proactively explain branch decisions; do not expect the user to notice or request them.
- The user runs Git mutations themselves. Do not run add, commit, push, checkout/switch, branch creation, merge, rebase, reset, stash, clean, or branch deletion on their behalf.
- A request such as "handle Git before bed" means inspect read-only state and guide the user through commands, not execute mutations.
- Read-only Git inspection, such as status, branch, log, and diff, is allowed.
- Provide each executable command in its own code block so it can be copied independently. In particular, never combine push and status in one block.
- Stage only intended files. Exclude credentials, local development notes, generated output, and unrelated changes.

## Branch Lifecycle

- Before starting a new work item, check the current branch and worktree, identify the milestone and scope, and explain whether the current branch still fits.
- When scope changes substantially, proactively recommend a focused feature branch before implementation. Provide the commands for the user to run; do not silently continue accumulating unrelated work.
- Do not assume the default branch is `main`, that a push has merged anything, or that remote information is current. Verify what is available and disclose uncertainty.
- Before recommending a merge, inspect the diff and commits relative to the intended integration branch, check test results and unfinished work, and explain what will be included.
- A focused, coherent, tested increment can be merged before an entire milestone is complete, but explicitly track the remaining work. Do not merge solely because the user is ending a session.
- After the user completes a merge, verify state read-only and guide the next feature branch from the appropriate updated base.
- If multiple scopes have already accumulated in one branch, first review and explain the safest integration path. Do not rewrite history or discard work to make branch names look tidy.
- At each Git handoff, mention the current branch, what is being committed, and whether the proposed action is only a push or also an integration step.

## UI Work

- Use mobile-first layouts, then adapt for tablet and desktop.
- Preserve working queue scrolling, sticky time labels, payment behavior, and unrelated views when changing a specific UI area.
- Verify responsive transitions as well as fixed screen sizes. State clearly when checks use browser emulation rather than real mobile hardware.
- Follow the existing charcoal/gold design language and prioritize the barber's actual workflows over decorative dashboards or duplicate controls.
