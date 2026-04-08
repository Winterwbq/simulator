# TypeScript Inbox Simulator

This folder contains a TypeScript rewrite of the original `app.py` + `story.json` simulator.

The drafted-reply grader now runs fully locally through `llama.cpp` and `llama-server`. No external API key is required.

## Structure

- `src/data/story.ts` - typed scenario data converted from `story.json`
- `src/lib/types.ts` - shared TypeScript interfaces and state types
- `src/lib/storyValidation.ts` - story validation logic ported from Python
- `src/lib/simulation.ts` - simulation engine, trust math, endings, filters, export helpers
- `src/components/` - inbox, email view, trust dashboard, and analysis UI
- `src/App.tsx` - top-level application flow
- `server/index.ts` - local grading API that talks to the local `llama-server`
- `scripts/dev-llama.ts` - bootstraps `llama.cpp`, downloads the Qwen GGUF model, builds `llama-server`, and starts it
- `models/` - local GGUF model storage

## Run

```bash
cd simulator
npm install
npm run dev
```

Create a local `.env` first if you want to override the default ports or model path:

```bash
cp .env.example .env
```

Frontend grading mode can also be configured in `.env`:

```bash
VITE_BASE_PATH=/simulator/
VITE_DEFAULT_GRADING_MODE=predefined
VITE_ALLOW_AI_MODE=false
```

Recommended values:

- default / static-safe setup: `VITE_DEFAULT_GRADING_MODE=predefined` and `VITE_ALLOW_AI_MODE=false`
- local machine with llama server: `VITE_DEFAULT_GRADING_MODE=ai` and `VITE_ALLOW_AI_MODE=true`
- GitHub Pages/static deploy: `VITE_DEFAULT_GRADING_MODE=predefined` and `VITE_ALLOW_AI_MODE=false`
- for project pages, set `VITE_BASE_PATH` to your repo path (for this repo: `/simulator/`)

`npm run dev` and `npm start` now depend on `VITE_ALLOW_AI_MODE`:

- when `VITE_ALLOW_AI_MODE=false`: start only the Vite frontend (no local grading API and no `llama-server`)
- when `VITE_ALLOW_AI_MODE=true`: bootstrap `llama.cpp`, ensure/download the local model as needed, build `llama-server`, then start `llama-server`, the local grading API, and the Vite frontend together

On the first run, the model download is large and the local server build can take a while.

## Notes

- The local inference path uses the documented Apple Silicon `Metal` backend from `llama.cpp`, which is the supported local acceleration path in this setup.
- The default local grading model is `Qwen3.5-4B-Q4_0.gguf`.
- The local grader now returns stakeholder trust deltas directly for `regulator`, `investor`, `community`, `engineering`, and `media`.
- Trust changes from evaluated replies are quantized to fixed 5-point steps: `-10`, `-5`, `0`, `+5`, or `+10`.
- In `AI` mode, both preset replies and drafted replies use the local grading path.
- In `Predefined` mode, preset replies use authored local scores and authored explanations, and drafted replies are hidden.

## Verify

```bash
npx tsc -b
```
