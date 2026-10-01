---
description: Run Lead Dev review/dispatch and the QA gate for a plan, then wait for an explicit merge instruction
---

Ship the work for plan slug: **$ARGUMENTS**

The plan is at `shared/plans/$ARGUMENTS.md` (if the argument already ends in `.md`, or is a full path, use it as given). Read it first — you need its `Status:` line, its Scope/Goal/Steps, and its `## Team Thread`.

**Refuse a `SUPERSEDED` or `REFERENCE` plan** — stop, say why, and don't proceed.

### Get on the branch before anything else

`scripts/deny-master-edit.sh` is a `PreToolUse` hook that refuses every `Edit`/`Write` while HEAD is on `master` — and Lead Dev's approval is itself an edit to the plan file. So the branch comes first, ahead of the review, not between the review and the implementers:

- `git rev-parse --abbrev-ref HEAD`. If you are already on `<type>/<slug>` for this plan (because `/plan` cut it), you're set — say so and carry on.
- Otherwise **run `hermes-branch`**, handed the plan path. It cuts `<type>/<slug>` off `origin/master` in the main tree.
- If it reports a blocker (dirty tree, name collision, HEAD on an unrelated feature branch), **stop and surface it**. Do not dispatch any agent anyway, and do not resolve a dirty tree yourself by stashing or discarding. If it reports the branch already existed and was reused, that's fine; carry on.

### If `Status: DRAFT`

Dispatch `hermes-lead-dev` with the plan path. It reviews and does one of two things:

- **Revises:** it hands specific feedback back to `hermes-ba` for a revision round. Loop this **at most twice**. If it's still not approved after 2 rounds, stop and surface the disagreement to the user instead of looping a third time — do not attempt to resolve it yourself.
- **Approves:** it flips the plan to `Status: APPROVED` itself and writes a `## Dispatch` section naming which of `hermes-backend`/`hermes-frontend` run, in what order. `hermes-branch` is **not** in that list any more — it already ran, ahead of the review. This promotion is Lead Dev's call, not yours or the user's — don't ask the user to bless it, just report that it happened.

### If `Status: APPROVED`

Skip straight to dispatch — Lead Dev already reviewed this plan. Read its `## Dispatch` section for the implementer list and order.

### Dispatch and gate (once the plan is `APPROVED`, either just now or already)

1. **Re-confirm HEAD is on the plan's branch** — `git rev-parse --abbrev-ref HEAD`. It should be, from the step above, but check rather than assume: `.claude/settings.json` sets `baseRef: "head"`, so an implementer's worktree forks from whatever branch HEAD is currently on, and a stray checkout between the review and the dispatch would land the work on `master`. If HEAD has moved, stop — don't dispatch and then discover it.
2. Run whichever of `hermes-backend`/`hermes-frontend` the `## Dispatch` section names, **in that order** — cross-stack changes always run backend before frontend, never concurrently.
3. Run **`hermes-qa`**, handed the plan path. It runs both its checklists (the former guardrails gate + the former leak scan) as one pass and reports PASS/FAIL with `path:LINE` evidence. A change that ships clean but does not match the plan is still a FAIL.
4. Report the verdict verbatim. If it FAILs, stop — hand the required fixes back to the implementer that owns the surface. Do not fix them yourself in this command.
5. If it passes, show the diff (`git diff origin/master...HEAD` for main-tree work, or the worktree's diff against `origin/master` for `hermes-backend`/`hermes-frontend` work, since both run with `isolation: worktree` — `origin/master` is the base `hermes-branch` cut from).
6. Confirm two-layer API parity yourself if any route was added or renamed — run `/hermes-parity`, or check `backend/app/routers/*.py` and `frontend/src/lib/api.ts` by hand.

**Then stop and wait.** Do not merge, commit, push, or remove a worktree. State plainly that the change is gated and ready, and that you are waiting for an explicit merge instruction.

Only after the user explicitly says to merge:

**The merge routes through the named branch — it does not go straight to `master`.** `hermes-branch` cut `<type>/<plan-slug>` as the integration target, but the implementers' work sits as *uncommitted changes* in a worktree on its own harness-named branch. Skipping the named branch makes the whole convention cosmetic, so:

1. **Commit the work in the worktree.** The implementers never commit (Rule 10), so there is nothing to merge until you do. One commit per implementer surface is fine; so is one combined commit. Use a conventional message matching the branch type (`feat: …` for a `feat/` branch).
2. **Merge the worktree branch into `<type>/<plan-slug>`.** This is the branch that carries the change's identity.
3. **Squash-merge `<type>/<plan-slug>` into `master`** — or push it and open the PR from it, if the user wants review. Name which of the two you did.
4. Flip line 2 of the plan file to `Status: DONE`.
5. Report the resulting commit **and** the branch it came from.
6. **Leave the worktree and its branch in place.** State that both still exist and name the worktree path, so the user can keep testing there.

If the user explicitly says to skip the named branch and squash the worktree straight into `master`, do that — but say plainly that `<type>/<plan-slug>` will then carry nothing.

**Worktree teardown is a separate, second instruction.** Never remove a worktree or delete its branch as part of merging — the user often exercises the worktree after the merge lands. Only when they explicitly ask to clean it up:

- If the worktree was seeded by `scripts/seed-worktree.sh`, remove the `frontend/node_modules` and `backend/.venv` links **first** — Windows junctions: `cmd //c rmdir "<abs-path>"`; macOS/Linux symlinks: `rm "<abs-path>"` (no `-r`). Either unlinks without touching the main tree's copy. Verify the main tree still has both before continuing.
- Note that a seeded worktree contains copied `.env.local` / `backend/.env` secrets, so an abandoned directory is a disk-hygiene problem, not just clutter.
- Then `git worktree remove` and `git worktree prune`. Deleting the **local** branch is fine once it exists on the remote.
- **Never delete the remote branch** — no `git push origin --delete`, and decline GitHub's post-merge "Delete branch". It is the durable record of the pre-squash history.
- If the branch was never pushed, its local copy is the only copy: say so and leave it in place rather than deleting it.

Never push unless the user explicitly says to. Never touch `master` unless the user names it.
