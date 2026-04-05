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

`npm run dev` and `npm start` both:

- ensure `llama.cpp` is available under `simulator/llama.cpp`
- ensure a local Python venv exists for `cmake` if your machine does not already have `cmake`
- download the default Qwen GGUF model into `simulator/models/`
- build `llama-server`
- start `llama-server`, the local grading API, and the Vite frontend together

On the first run, the model download is large and the local server build can take a while.

## Notes

- The local inference path uses the documented Apple Silicon `Metal` backend from `llama.cpp`, which is the supported local acceleration path in this setup.
- The default local grading model is `Qwen3.5-4B-Q4_0.gguf`.
- The local grader now returns stakeholder trust deltas directly for `regulator`, `investor`, `community`, `engineering`, and `media`.
- Trust changes from evaluated replies are quantized to fixed 5-point steps: `-10`, `-5`, `0`, `+5`, or `+10`.
- Both preset replies and drafted replies use the same local grading path.

## Verify

```bash
npx tsc -b
```
