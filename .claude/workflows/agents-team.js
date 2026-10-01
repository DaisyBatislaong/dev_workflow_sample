export const meta = {
  name: 'agents-team',
  description: 'Hermes BA -> Lead Dev review loop -> Backend/Frontend dispatch -> QA gate',
  whenToUse: 'Run for a Hermes goal you want the whole team to carry end-to-end: BA scopes and drafts a plan, Lead Dev reviews/approves/dispatches it, the named implementers build it, QA gates the result. Stops before any merge — that still needs your explicit instruction.',
  phases: [
    { title: 'Branch', detail: 'cut <type>/<slug> off origin/master first - the deny-master-edit hook refuses every Edit/Write until HEAD moves' },
    { title: 'BA', detail: 'scope the goal (backend/frontend/testing/QA), draft the plan on that branch' },
    { title: 'Lead Dev Review', detail: 'review/revise loop (capped at 2 rounds), then approve + dispatch' },
    { title: 'Dispatch', detail: 'run the named implementers in Lead Dev\'s order' },
    { title: 'QA Gate', detail: 'gate the diff against the plan' },
  ],
}

// `args` sometimes arrives as a JSON-encoded string rather than a parsed object
// depending on how the caller passed it - normalize defensively so `goal` is
// never silently undefined (observed: a raw goal produced a BA plan scoped
// against literally the string "undefined").
const _args = (typeof args === 'string') ? JSON.parse(args) : (args || {})

const PLAN_SCHEMA = {
  type: 'object',
  properties: {
    planPath: { type: 'string', description: 'The shared/plans/<slug>.md path just written' },
  },
  required: ['planPath'],
}

const REVIEW_SCHEMA = {
  type: 'object',
  properties: {
    decision: { type: 'string', enum: ['approve', 'revise'] },
    notes: { type: 'string', description: 'Why you approved, or exactly what BA must change' },
    dispatch: {
      type: 'array',
      items: { type: 'string', enum: ['hermes-backend', 'hermes-frontend'] },
      description: 'Implementers to run, in order. Empty if this plan needs no implementer. Only meaningful when decision=approve.',
    },
  },
  required: ['decision', 'notes', 'dispatch'],
}

const BRANCH_SCHEMA = {
  type: 'object',
  properties: {
    created: { type: 'boolean', description: 'true if HEAD is now on the feature branch (created or reused)' },
    branch: { type: 'string', description: 'The branch name, or the name that would have been created if blocked' },
    slug: { type: 'string', description: 'The slug half of the branch name, with no <type>/ prefix - the BA must name its plan file with exactly this' },
    notes: { type: 'string', description: 'Type chosen and why, base commit, and any blocker' },
  },
  required: ['created', 'branch', 'slug', 'notes'],
}

const QA_SCHEMA = {
  type: 'object',
  properties: {
    verdict: { type: 'string', enum: ['PASS', 'FAIL'] },
    report: { type: 'string' },
  },
  required: ['verdict', 'report'],
}

if (!_args.goal) {
  return { status: 'error', message: 'No goal was provided (args.goal is empty/undefined) - not dispatching BA against a blank goal.' }
}

// Runs before anything is written through Edit/Write, the plan included. Two reasons: the
// deny-master-edit PreToolUse hook refuses every Edit/Write while HEAD is on
// master, and settings.json's baseRef "head" means an implementer's worktree
// forks from whatever branch HEAD is on. The branch is therefore cut from the
// goal rather than from a plan slug, and the BA is held to that same slug so
// branch and plan keep their one-to-one identity.
phase('Branch')
const branch = await agent(
  `New Hermes goal: ${_args.goal}\n\nNo plan exists yet - you run first, before the BA. Derive the slug from this goal per your "No plan file?" path, cut the branch, and report the slug you chose separately from the full branch name.`,
  { agentType: 'hermes-branch', schema: BRANCH_SCHEMA, phase: 'Branch', label: 'cut branch' }
)
if (!branch.created) {
  log(`Branch cut blocked: ${branch.notes}`)
  return {
    status: 'blocked',
    branch: branch.branch,
    note: `Stopped before the BA ran - the branch could not be cut, and the deny-master-edit hook refuses every Edit/Write while HEAD is on master (not even the plan). ${branch.notes}`,
  }
}
log(`On branch ${branch.branch}`)

phase('BA')
log(`BA scoping the goal and drafting a plan for: ${_args.goal}`)
const draft = await agent(
  `New Hermes goal: ${_args.goal}\n\nScope this goal (which of backend/frontend/testing/QA it actually needs) and write a DRAFT plan per your instructions. The working branch is already cut as ${branch.branch}, so write the plan to shared/plans/${branch.slug}.md - use that slug verbatim, do not choose your own. Return the plan path.`,
  { agentType: 'hermes-ba', schema: PLAN_SCHEMA, phase: 'BA', label: 'BA draft' }
)
let planPath = draft.planPath
log(`Plan drafted: ${planPath}`)

phase('Lead Dev Review')
let approved = false
let dispatchList = []
for (let round = 1; round <= 2; round++) {
  const review = await agent(
    `Review the plan at ${planPath}. This is review round ${round} of at most 2. If it's sound, approve it and set "dispatch" to the exact ordered list of implementers this plan needs (empty array if none). If not, set decision to "revise" and put the specific, actionable gap in "notes".`,
    { agentType: 'hermes-lead-dev', schema: REVIEW_SCHEMA, phase: 'Lead Dev Review', label: `Lead Dev review round ${round}` }
  )
  log(`Lead Dev round ${round}: ${review.decision}`)
  if (review.decision === 'approve') {
    approved = true
    dispatchList = review.dispatch || []
    break
  }
  if (round === 2) {
    // Cap hit without approval - stop and surface to the user rather than looping forever.
    return {
      status: 'escalated',
      planPath,
      message: `Lead Dev and BA could not converge after 2 review rounds. Last feedback: ${review.notes}`,
    }
  }
  const revision = await agent(
    `Revise the plan at ${planPath} per Lead Dev's feedback, then append your revision entry to its Team Thread: ${review.notes}`,
    { agentType: 'hermes-ba', schema: PLAN_SCHEMA, phase: 'Lead Dev Review', label: `BA revision round ${round}` }
  )
  planPath = revision.planPath
}

phase('Dispatch')
if (dispatchList.length === 0) {
  log('Lead Dev dispatched no implementers for this plan (docs/scope-only change).')
} else {
  for (const name of dispatchList) {
    log(`Dispatching ${name}...`)
    await agent(
      `Implement the plan at ${planPath}. Follow your standard working method end to end, including verification, then report.`,
      { agentType: name, phase: 'Dispatch', label: name }
    )
  }
}

phase('QA Gate')
log('Running the QA gate...')
const qa = await agent(
  `Gate the plan at ${planPath} against whatever diff the dispatch phase produced. Follow your two-track checklist and append your verdict to the plan's Team Thread.`,
  { agentType: 'hermes-qa', schema: QA_SCHEMA, phase: 'QA Gate', label: 'QA gate' }
)

return {
  status: 'gated',
  planPath,
  branch: branch.branch,
  dispatched: dispatchList,
  qaVerdict: qa.verdict,
  qaReport: qa.report,
  note: 'This never merges or commits - that still needs your explicit instruction, same as /ship today.',
}
