---
description: Check two-layer API parity — every backend route has its typed api.ts wrapper, model IDs stay pinned, KB Drive IDs agree
---

Run the two-layer parity check the orchestrator owns (CLAUDE.md, Critical Development Rule 7). Report present/missing per layer — do not fix anything.

1. **Enumerate backend routes.** Grep `backend/app/routers/*.py` for route decorators (`@router.post(`, `@router.get(`) and list every path (e.g. `/api/chat`, `/api/ird/complete`, `/api/sessions/list`).
2. **Enumerate frontend wrappers.** Read `frontend/src/lib/api.ts` and list every endpoint path its typed wrappers call.
3. **Diff the two lists both ways.** A route with no wrapper, or a wrapper calling a path no router serves, is a parity gap. Print a table: `path | routers/*.py | api.ts | verdict`.
4. **Model IDs still pinned.** Confirm `backend/app/config.py` still pins both models (`MODEL_HAIKU` = the Haiku ID, `MODEL_SONNET` = the Sonnet ID — find them by name; line numbers drift, so this file quotes none) and that no other file hardcodes a model ID that bypasses them.
5. **KB Drive IDs.** Confirm the four knowledge-base Drive file IDs live only in `config.py` (`DOLE_REFERENCE_DOC_ID` and its three siblings) and match CLAUDE.md's Reference Documents table if that table was touched in the diff.

Finish with one line: `PARITY: OK` or `PARITY: N gap(s)` followed by the gaps as `path — which layer is missing`. Never edit a file from this command; hand gaps to the implementer that owns the missing layer (`hermes-backend` for routers, `hermes-frontend` for `api.ts`).
