# IT Asset Manager — Frontend

React + TypeScript + Vite frontend for the IT Asset Manager.

## Quick Start

```bash
npm install
npm run dev
```

Open **http://localhost:5173** — the dev server proxies API requests to `localhost:8000`.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server with HMR |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |

## Stack

- **React 18** + **TypeScript**
- **Vite** — Build tool
- **Tailwind CSS** — Styling
- **shadcn/ui** — Component library
- **Zustand** — State management
- **React Router** — Routing

## Structure

```
src/
├── pages/        # Route page components
├── components/   # Reusable UI components
│   ├── ui/       # shadcn/ui primitives
│   ├── Layout/   # App shell, sidebar, header
│   ├── Admin/    # Admin panel components
│   ├── Assets/   # Asset-related components
│   └── ...
├── api/          # Backend API client functions
├── stores/       # Zustand state (auth, theme, sidebar)
└── lib/          # Utilities (axios instance, helpers)
```

## Environment

Create `.env.local` for local overrides:

```env
VITE_API_URL=http://localhost:8000
```

## Adding Components

Using shadcn/ui CLI:

```bash
npx shadcn@latest add button
npx shadcn@latest add dialog
```

See full project documentation in the [root README](../README.md).
