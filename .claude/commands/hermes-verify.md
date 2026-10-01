---
description: Run the three executable Hermes gates (tsc, lint, backend import check) and report the results verbatim
---

Run the three executable gates from CLAUDE.md's Run & Verify section, in order, and report each result verbatim — pass or fail, with the failing output when there is one. Do not fix anything from this command.

```bash
cd frontend && npx tsc --noEmit
cd frontend && npm run lint
cd backend && ./.venv/bin/python -c "from app.main import app; print(len(app.routes))"
```

Notes:
- Windows checkouts use `backend/.venv/Scripts/python.exe` instead.
- **Run the backend import check from the tree's own `backend/` directory** — the venv's editable install points at the main tree, so running it from anywhere else validates `main` and reports a false PASS. In a worktree, that means the worktree's `backend/`.
- If `frontend/node_modules` or `backend/.venv` is missing (fresh worktree), say so and point at `scripts/seed-worktree.sh` instead of failing cryptically.
- These are the same checks `scripts/verify-triple.sh` runs automatically as a Stop hook when `frontend/src` or `backend/app` changed; this command is the on-demand form.

Finish with one line: `VERIFY: 3/3 PASS` or `VERIFY: FAIL — <which gate(s)>`.
