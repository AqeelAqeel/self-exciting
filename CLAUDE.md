# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start development server (http://localhost:3000)
npm run build    # Production build
npm run lint     # ESLint
npm start        # Start production server
```

## Architecture

This is a **Self-Exciting Generative Loop** application—an AI-powered infinite canvas where users upload reference images and the system generates radial "directions" of evolving content. Built with Next.js 16 and React 19.

### Two Canvas Systems

1. **Infinite Canvas** (`src/components/canvas/`) - Traditional drag-and-drop card workspace using `react-zoom-pan-pinch`
2. **Star Canvas** (`src/components/star/`) - Radial generative UI where directions radiate from a seed node, each supporting up to 5 depth levels

### Core Loop

```
Reference Upload → Salience Extraction → Direction Planning → Generation → User Actions → Loop
```

1. User uploads 1-3 reference images
2. Gemini extracts salience profile (axes like `cinematic_scale`, `color_temperature`)
3. System proposes 5-6 directions (e.g., "Cinematic Escalation", "Organic Flow")
4. User clicks directions to generate images/videos along that vector
5. Actions (Push/Fork/Mutate/Pin/Prune) feed back into preference learning

### State Management

**Frontend (Zustand):**
- `src/store/canvas-store.ts` - Traditional canvas cards and personalization
- `src/store/salience-store.ts` - Session, directions, nodes, active selections, workspace (pinned nodes)

**Backend (Server singleton):**
- `src/lib/salience/store/session-store.ts` - In-memory session store with JSON file persistence to `data/sessions/`

### Key Types

- `Session` - Core session with mode, state, references, salience profile, directions
- `Direction` - A "ray" with label, intent, vector (push/pull axes), prompt skeleton, and nodes
- `GenerationNode` - Individual generation at a depth level with status, prompt, output URL
- `SalienceProfile` - Extracted axes, style tags, mood notes from references

All types defined in `src/types/salience.ts` (generative loop) and `src/types/index.ts` (canvas).

### Generation Pipeline

`src/lib/salience/pipeline.ts` orchestrates:
1. Prompt composition via LLM agents (`src/lib/salience/agents/`)
2. Constraint gating (validates prompt safety/quality)
3. Media generation (OpenAI gpt-image-1.5 or Sora video)
4. Progress streaming via SSE

### API Routes

| Route | Purpose |
|-------|---------|
| `/api/salience/session` | Create session |
| `/api/salience/session/[id]` | Get session |
| `/api/salience/session/[id]/references` | Upload reference URLs |
| `/api/salience/session/[id]/analyze` | Extract salience + plan directions |
| `/api/salience/session/[id]/generate` | Queue image/video generation |
| `/api/salience/session/[id]/stream` | SSE for real-time progress |
| `/api/ai` | Generic AI text completion |
| `/api/generate/image` | Direct image generation |
| `/api/upload` | File upload handler |

## Environment

Copy `.env.example` to `.env.local`:
- `ANTHROPIC_API_KEY` - Text generation (Claude)
- `OPENAI_API_KEY` - Image/video generation (gpt-image-1.5, Sora)
- `GEMINI_API_KEY` - Salience extraction and direction planning

## Path Alias

`@/*` maps to `./src/*`
