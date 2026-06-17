# 🐙 Octopus

A touch-first, mobile-friendly editor for software architecture — think the
Portal 2 level editor, but the pieces are services, databases, queues and
caches. Drag or tap components onto a canvas, wire them together, and arrange
them to understand or sketch a system.

Every component is drawn as an **isometric image generated procedurally** from
its kind and name, so each one is visually distinct and stable across reloads.
Microservices can optionally use **AI-generated art** based on their name and
description when an image backend is configured (see below); otherwise they fall
back to the procedural image.

## Quick start

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # unit tests (model, store, procedural render)
npm run build    # static production build in dist/
```

## Using it

- **Add a component** — tap a palette entry (drops it on the canvas) or drag it
  onto the canvas on desktop.
- **Connect** — on desktop, drag from a node's bottom handle to another node's
  top handle. On touch, tap **Connect** in the toolbar, then tap the source
  component and the target component.
- **Edit** — tap a component or connection to edit its name, description, or
  connection type in the inspector.
- **Move / zoom** — drag to reposition, scroll or pinch to zoom, drag empty
  space to box-select.
- **Save / share** — your work autosaves to the browser (localStorage). Use
  **Export** / **Import** to move a design between devices as a `.octopus.json`
  file.

## Architecture

The domain model (`src/model/types.ts`) is independent of the rendering library.
`src/model/mapping.ts` converts between an `ArchDocument` and React Flow's
node/edge shapes, so persistence, import/export, and the future "import an
existing system" feature all produce the same `ArchDocument` that the canvas
renders.

```
src/
  model/      types, component palette, React Flow mapping
  render/     procedural isometric art (seed → SVG)
    ai/       optional AI image client + IndexedDB cache
  store/      Zustand store + localStorage persistence
  components/ Canvas, Palette, Toolbar, Inspector, custom node
api/          optional serverless AI proxy
```

- **Procedural art** (`src/render/`): a seeded PRNG (`seed.ts`) drives isometric
  SVG primitives (`isometric.ts`) composed per component kind
  (`proceduralArt.ts`). No image dependencies; deterministic and offline.

## Optional: AI-generated microservice art

The app is a static site and works entirely on procedural art. To enable AI art:

1. Deploy `api/generate-image.ts` as a serverless function and wire in your
   chosen text-to-image provider (the API key stays server-side).
2. Set `VITE_AI_IMAGE_URL` (see `.env.example`) to its URL.

Generated images are cached in IndexedDB by content hash, so they load instantly
on subsequent visits and work offline.

## Stack

Vite · React · TypeScript · React Flow (`@xyflow/react`) · Zustand · Tailwind CSS.
