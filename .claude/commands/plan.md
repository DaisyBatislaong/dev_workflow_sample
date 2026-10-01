---
description: Scope and plan a Hermes change via hermes-ba and save it as a DRAFT plan
---

Plan this change, do not implement it: **$ARGUMENTS**

**First, run `hermes-branch`** — handed the goal verbatim, with no plan path, so it takes its goal-derived-slug path. Nothing is edited on `master` through the file tools: `scripts/deny-master-edit.sh` is a `PreToolUse` hook that refuses every `Edit`/`Write` while HEAD is on `master`, so the BA cannot save its plan until HEAD has moved. If the branch cut is blocked (dirty tree, name collision, HEAD on an unrelated feature branch), **stop and surface it** — do not dispatch the BA anyway, and do not resolve a dirty tree yourself by stashing or discarding.

Then dispatch the `hermes-ba` subagent with that request. Hand it the request verbatim — do not pre-solve the problem or narrow the scope for it.

Require of the BA:

1. It writes the plan to `shared/plans/<slug>.md` using **the slug `hermes-branch` just reported**, verbatim — the BA does not choose its own. Branch and plan share one identity, and the branch already exists, so the plan name follows it rather than the other way round. If a plan with that slug already exists, it reads it first and overwrites with the revision rather than inventing a new slug.
2. **Line 2 of the file is exactly `Status: DRAFT`.** The BA never writes any other status — only `hermes-lead-dev` promotes `DRAFT` → `APPROVED`.
3. The plan body uses the BA's standard sections: Scope (which of backend/frontend/testing/QA), Goal, Files & anchors touched (grouped by surface, every reference as `path:LINE`), Steps (numbered, each with a target and a one-line verification), Risks / known-bug watch including two-layer parity status, and Open questions only if genuinely blocking. It also starts the plan's `## Team Thread` with its own entry.
4. It writes **only** that plan file — never `frontend/`, `backend/`, `index.html`, or anything else.

When the BA returns:

- State the branch you are on and the saved plan path, and confirm the two slugs match.
- Summarise the Scope, Goal, and blast radius in a few lines.
- Surface any Open questions the BA raised.

Then **stop**. Do not dispatch `hermes-lead-dev` or any implementer from this command. The plan is `DRAFT`; tell the user that `/ship <slug>` is what runs the Lead Dev review/dispatch and the QA gate next — or that `/build "<goal>"` runs the whole team (BA → Lead Dev → implementers → QA) in one automated pass with a live progress view in `/workflows`.
