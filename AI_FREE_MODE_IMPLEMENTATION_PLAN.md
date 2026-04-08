# AI-Free Mode Implementation Plan

## Goal

Add a global switch that lets the simulator run in one of two grading modes:

- **Predefined**
  Preset replies only. Scores and explanations come from local authored logic. No AI server is required.
- **AI**
  Current local workflow. Preset replies and drafted replies are graded by the local llama-based pipeline with live explanations.

## Desired Behavior

### Predefined mode

- AI grader is not called
- draft-reply composer is hidden
- preset replies still work
- each processed email still shows:
  - per-email score deltas
  - per-email explanations
- scores come from local predefined scenario data
- suitable for free static deployment, including GitHub Pages

### AI mode

- preserve the current local behavior
- preset replies are graded by the local API
- drafted replies stay available
- LLM-generated per-stakeholder explanations stay available
- health polling and local server requirements remain active only in this mode

## Architecture

### Global grading mode

- Add a `GradingMode` type with:
  - `predefined`
  - `ai`
- Persist the selected mode in browser storage so it feels global to the app
- Switching mode should reset the current run so a single playthrough never mixes scoring systems

### Predefined scoring path

- Use scenario-authored choice effects as the score source for preset replies
- Convert choice effects into the same `DraftGradeResult` shape already used by the AI pipeline:
  - `trust_deltas`
  - `trust_explanations`
- Generate deterministic local explanations so the UI still works without the LLM

### AI scoring path

- Keep the existing API and local llama workflow unchanged
- Only run health polling and draft-reply features when AI mode is enabled

## UI Changes

### Global switcher

- Add a compact top-level grading-mode switch
- Recommended labels:
  - `Predefined`
  - `AI`
- If AI is unavailable in a static deployment, keep the app in predefined mode by default and optionally disable the AI choice

### Thread UI

- In predefined mode:
  - hide the `Draft your own reply` section
  - show only preset reply actions
- In AI mode:
  - preserve the current thread UI unchanged

## Environment Controls

Use Vite env variables:

- `VITE_DEFAULT_GRADING_MODE=predefined|ai`
- `VITE_ALLOW_AI_MODE=true|false`

Recommended defaults:

- local machine: `ai`, `true`
- GitHub Pages/static deploy: `predefined`, `false`

## Implementation Steps

1. Add the grading-mode type and storage key
2. Add predefined scoring helpers that return a `DraftGradeResult`
3. Branch the preset-reply path between predefined local scoring and AI scoring
4. Hide drafted replies when the app is in predefined mode
5. Add the global switcher UI
6. Disable health polling when predefined mode is active
7. Verify that static deployment works without the API server

## Important Constraint

Changing grading mode should reset the current run. This avoids confusing users with mixed predefined and AI-scored replies inside the same simulation log.
