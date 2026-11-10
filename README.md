# Library3D

A walk-through 3D library for the web. Open the door, wander between shelves, and browse each shelf by **language → year → author** (or author → year). A floor-plan map and catalogue show where every shelf is, and signed-in users keep a **personal library**, a private study with their own bookcases.

- **API:** [Hono](https://hono.dev) on Node, SQLite (`node:sqlite`), JWT auth
- **Web:** React + [react-three-fiber](https://r3f.docs.pmnd.rs) (Three.js), Vite, zustand
- **Languages:** English, Arabic (right-to-left, shaped correctly) and Amharic (Ethiopic) in the 3D scene and the UI

## Quick start

Requires **Node 22.13+** (the API uses Node's built-in `node:sqlite`, so there are no native modules to compile).

```bash
npm install
npm run dev
```

Open <http://localhost:5173>. The API runs on `:8787` and Vite proxies `/api` to it. On first start an empty database is seeded with a demo catalogue (8 shelves, ~100 books).

| Command | What it does |
| --- | --- |
| `npm run dev` | API (watch mode) + Vite dev server |
| `npm run build` | Build the web app, then compile the server |
| `npm start` | Run the compiled server, which also serves the built web app |
| `npm run typecheck` | Typecheck both packages |
| `npm run seed -- --force` | Wipe the catalogue **and saved library items** and reseed |

Production: set `JWT_SECRET` (required when `NODE_ENV=production`), optionally `PORT`, `DATABASE_PATH` (default `server/data/library.db`) and `WEB_DIST`.

## How it is organised

```
server/src
  app.ts            Hono app: middleware, routes, error handling
  index.ts          Node entry: seeds if empty, serves web/dist, listens
  db.ts             SQLite schema
  queries.ts        Shared SQL fragments (language → year → author ordering)
  routes/           catalog.ts · auth.ts · library.ts
  seed-data.ts      The demo shelves and books (edit this)
web/src
  store.ts          App state and actions (zustand)
  scene/            3D: Bookcase, Door, PublicHall, PersonalRoom, CameraRig, Label3D
  ui/               Search, map + catalogue, shelf panel, book card, sign-in, list view
```

### How a shelf works

Each shelf is one bookcase. **Each language gets one tier (board)**, top to bottom in the order English, Arabic, Amharic, then any others. Within a tier, books stand in order of year then author; the panel's toggle switches that to author then year, and the spines re-order in 3D. Language, year and author are plain columns on `books`, so adding another way to group is a query, not a restructure.

### API

| Method & path | Notes |
| --- | --- |
| `GET /api/shelves`, `GET /api/shelves/:slug` | Shelf summaries; one shelf with its books in shelf order |
| `GET /api/books?q&shelf&language&author&year&sort&limit&offset` | Search and filter (`sort`: `year`, `author`, `title`) |
| `GET /api/books/:id`, `GET /api/facets?shelf=` | One book; available languages, years, authors |
| `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/me` | Username + password, scrypt-hashed, 30-day JWT |
| `GET /api/library` | Your saved books |
| `PUT /api/library/:bookId` | Save, or change `collection` / `notes` (max 6 collections per user) |
| `DELETE /api/library/:bookId` | Remove from your library |

### Personal library

Saving a book puts it in a collection (default `Saved`). The study shows one bookcase per collection, up to six, using the same tiers by language. Collections and notes are edited from the book card.

## Loading a real catalogue

The bundled books are **demo data**: titles are real where I was confident, but classical works have approximate years, and entries flagged `1` in `seed-data.ts` are placeholders (shown as "Sample record" in the UI). Replace them:

1. Edit `server/src/seed-data.ts` (shelves with their floor positions, and books as `[shelf, language, year, author, title]`).
2. Run `npm run seed -- --force`.

For a large catalogue, import from a source such as Open Library or Project Gutenberg into the `books` table instead of hand-editing.

## Scaling notes

- Shelf contents load lazily the first time the camera comes near a shelf.
- Spines on one case are a single instanced mesh. That is fine for hundreds of books per shelf; for thousands, page by language/year and only mount the visible tier.
- Titles on spines are drawn only on the open shelf.
- The list view is a complete fallback (keyboard, screen readers, low-power devices, no WebGL).

## Before going public

- Add rate limiting on `/api/auth/*`.
- Put the app behind HTTPS; the token is kept in `localStorage`.
- Decide how you will host book files. Metadata is stored here, and `read_url` is a link only; copyrighted works need licensing.
- `node:sqlite` is still marked experimental in Node 22, so expect a one-line warning at startup.

## Deploy (Render)

`render.yaml` is a Render Blueprint. On [render.com](https://render.com) choose **New → Blueprint**, pick this repository, and apply. Render builds with `npm ci --include=dev && npm run build`, starts with `npm start`, and generates `JWT_SECRET` for you. On the free plan the database lives on ephemeral disk and is reseeded on each deploy; see the comments in `render.yaml` to add a persistent disk.
