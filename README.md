# CaloRAI – Nutrition Tracking App

Full-stack Next.js app for tracking meals and nutrition goals with food analysis via GROQ API.

## Quick Start

```bash
npm install
npm run dev
```

Dev server runs on **http://localhost:3000**

### Windows Setup (Important)
If you have multiple Node versions (Cursor's + system), always use system Node:

```powershell
$env:Path="C:\Program Files\nodejs;" + $env:Path
npm run dev
```

## Project Structure

- **`app/`** – Next.js App Router (UI & API)
  - `page.tsx` – Home page
  - `layout.tsx` – Root layout
  - `api/` – Route handlers
- **`pages/api/analyze-food.js`** – Legacy Pages Router API (food analysis with GROQ)
- **`components/`** – React components
- **`lib/`** – Utilities & database helpers
- **`db.sqlite`** – SQLite database (gitignored)

## API Endpoints

### Analyze Food
```
POST /api/analyze-food
Body: { description: "string" }
Response: { name, calories, macros, ... }
```
Uses GROQ API (requires `GROQ_API_KEY` in `.env.local`)

### Meals
```
GET /api/meals              – List all meals
POST /api/meals             – Create meal
DELETE /api/meals/[id]      – Delete meal
```

### Goals
```
GET /api/goals              – Fetch goals
POST /api/goals             – Set goals
```

## Environment Variables

Create `.env.local` (never commit):
```
GROQ_API_KEY=gsk_...
```

The API also supports `NEXT_PUBLIC_GROQ_API_KEY` for client-side use, but server-only is preferred.

## Key Dependencies

- **Next.js 15** – App Router
- **better-sqlite3** – SQLite DB
- **Tailwind CSS** – Styling
- **TypeScript** – Type safety

## Troubleshooting

### better-sqlite3 ABI Breaks
If you see native module errors after switching Node versions:
1. Stop dev server
2. Kill any lingering Node processes
3. Reinstall better-sqlite3:
   ```bash
   npm install --force better-sqlite3
   ```

### Camera Not Working
Always test camera on **http://localhost:3000** (secure context required). File:// won't work.

## Build & Deploy

```bash
npm run build   # Create production build
npm run start   # Run production server
```
