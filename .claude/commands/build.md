---
description: Run the full Hermes agent team on a goal — a feature branch is cut, BA scopes and drafts, Lead Dev reviews/approves/dispatches, Backend/Frontend implement, QA gates — one shot, live progress in /workflows
---

Run the `agents-team` workflow for this goal: **$ARGUMENTS**

Call `Workflow({name: 'agents-team', args: {goal: "$ARGUMENTS"}})`.

This is the automated form of `/plan` + Lead Dev review + dispatch + `/ship`'s gate step, all in one run:

1. `hermes-branch` cuts the working branch — `<type>/<slug>` off `origin/master`, e.g. `feat/payroll-kb-injection`, with the slug derived from the goal. This runs **first, before anything is written**: `scripts/deny-master-edit.sh` refuses every `Edit`/`Write` while HEAD is on `master`, so not even the plan can be saved through those tools until HEAD moves (shell writes are not intercepted — see `CLAUDE.md` Automation), and the implementers' worktrees fork from wherever HEAD is. If it's blocked (dirty tree, name collision, HEAD on an unrelated feature branch), the run stops here rather than building on the wrong base.
2. `hermes-ba` scopes the goal and writes a DRAFT plan to `shared/plans/<slug>.md`, using step 1's slug verbatim so branch and plan stay one-to-one.
3. `hermes-lead-dev` reviews it, loops with `hermes-ba` for up to 2 rounds if it needs changes, then — autonomously, this is the one lifecycle step that doesn't wait for you — flips the plan to `APPROVED` and decides which implementers run.
4. Whichever of `hermes-backend`/`hermes-frontend` the plan needs run, in the order Lead Dev set (backend before frontend on any cross-stack change — that ordering is fixed, not Lead Dev's to change).
5. `hermes-qa` gates the result and reports PASS/FAIL.

Watch it run live in `/workflows` — one box per agent, updating as each finishes.

**This never merges or commits.** It stops after the QA verdict and reports the plan path, exactly like `/ship` does today — merging still needs your explicit instruction after you've reviewed the diff.

If Lead Dev and BA can't converge on the plan after 2 review rounds, the workflow stops early and surfaces the disagreement instead of looping — treat that as a request for your input, not a failure to fix yourself.

For manual step-by-step control instead of the full pipeline, use `/plan` and `/ship` directly.
