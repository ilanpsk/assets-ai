# IT Asset Manager

A full-stack IT Asset Management system with AI-powered assistance, intelligent data import, and complete audit logging.

![Tech Stack](https://img.shields.io/badge/FastAPI-009688?style=flat&logo=fastapi&logoColor=white)
![Tech Stack](https://img.shields.io/badge/React-61DAFB?style=flat&logo=react&logoColor=black)
![Tech Stack](https://img.shields.io/badge/PostgreSQL-336791?style=flat&logo=postgresql&logoColor=white)
![Tech Stack](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)

## Features

- **Asset Management** — Track hardware, software, and IT resources with full lifecycle management
- **Custom Fields** — Extend assets with dynamic metadata fields per asset type
- **Smart Import** — AI-assisted CSV/Excel import with automatic column mapping
- **AI Assistant** — Natural language queries and intelligent suggestions
- **Role-Based Access** — Granular permissions with department/location scoping
- **Audit Logging** — Complete history of all changes and actions
- **Request System** — Asset request workflow with approval process
- **Reports & Analytics** — Built-in reporting with customizable dashboards
- **Integrations** — Connect to external systems (MCP servers, etc.)

## Screenshots

### Dashboard
Real-time overview with asset stats, distribution charts, health status, and live activity feed.

![Dashboard](docs/screenshots/dashboard.png)

### Asset Inventory
Browse all assets with filters by type, status, and set. Bulk actions and quick search.

![Assets](docs/screenshots/assets.png)

### Asset Details
Complete asset view with financials, lifecycle info, custom attributes, and full audit history.

![Asset Details](docs/screenshots/asset-details.png)

### Reports & Audit Logs
System-wide activity monitoring with action distribution and filterable audit logs.

![Reports](docs/screenshots/reports.png)

### Budget Analytics
Spending analysis by category, top vendors, and monthly trends.

![Budget](docs/screenshots/budget.png)

### AI Assistant
Nexus AI — Natural language queries for asset lookups, imports, and analytics.

![AI Chat](docs/screenshots/ai-chat.png)

## Architecture

```
assets-ai/
├── scripts/           # Project-level scripts
│   ├── start.sh       # Start backend (Docker)
│   ├── dev.sh         # Start full stack (backend + frontend)
│   └── stop.sh        # Stop all services
│
├── frontend/          # React + TypeScript + Vite + Tailwind CSS
│   └── src/
│       ├── pages/     # Route pages
│       ├── components/# UI components
│       ├── api/       # API client functions
│       └── stores/    # Zustand state stores
│
└── it-asset-manager/  # FastAPI + SQLAlchemy + PostgreSQL
    └── app/
        ├── api/       # REST API routers
        ├── ai/        # AI tools and prompts
        ├── models/    # SQLAlchemy models
        ├── schemas/   # Pydantic schemas
        └── services/  # Business logic
```

## Quick Start

### Full Stack (Recommended)

```bash
./scripts/dev.sh
```

This starts both backend (Docker) and frontend dev server. Access:
- **Frontend**: http://localhost:5173
- **API**: http://localhost:8000

### Backend Only

```bash
./scripts/start.sh
```

Starts the backend with PostgreSQL via Docker.

### Stop Services

```bash
./scripts/stop.sh
```

### Manual Development Setup

```bash
# Terminal 1: Backend
cd it-asset-manager
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Terminal 2: Frontend
cd frontend
npm install
npm run dev
```

## Default Credentials

| Role  | Email               | Password   |
|-------|---------------------|------------|
| Admin | admin@example.com   | admin123   |

> ⚠️ **Change the admin password after first login!**

## Environment Variables

### Backend (`it-asset-manager/`)

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgresql://...` | PostgreSQL connection string |
| `SECRET_KEY` | (generated) | JWT signing key |
| `AI_PROVIDER` | `openai` | AI provider: `openai` or `google` |
| `AI_API_KEY` | — | Your AI API key |

### Frontend (`frontend/`)

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | `http://localhost:8000` | Backend API URL |

## API Documentation

Once the backend is running, access:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## Tech Stack

### Backend
- **FastAPI** — Modern async Python web framework
- **SQLAlchemy** — ORM with async support
- **PostgreSQL** — Primary database
- **Alembic** — Database migrations
- **Pydantic** — Data validation and serialization

### Frontend
- **React 18** — UI library
- **TypeScript** — Type-safe JavaScript
- **Vite** — Build tool and dev server
- **Tailwind CSS** — Utility-first CSS
- **shadcn/ui** — Component library
- **Zustand** — State management
- **React Router** — Client-side routing

### AI Features
- **OpenAI / Google AI** — LLM providers
- **Tool-based architecture** — Structured AI capabilities

## Project Structure

### Key Backend Files

| Path | Purpose |
|------|---------|
| `app/main.py` | FastAPI application entry |
| `app/api/routers/` | API endpoint handlers |
| `app/models/` | Database models |
| `app/services/` | Business logic layer |
| `app/ai/tools/` | AI assistant capabilities |
| `alembic/versions/` | Database migrations |

### Key Frontend Files

| Path | Purpose |
|------|---------|
| `src/App.tsx` | App root with routing |
| `src/pages/` | Page components |
| `src/components/` | Reusable UI components |
| `src/api/` | Backend API client |
| `src/stores/` | Global state (auth, theme) |

## Database Migrations

```bash
cd it-asset-manager

# Create a new migration
alembic revision --autogenerate -m "description"

# Apply migrations
alembic upgrade head

# Rollback one migration
alembic downgrade -1
```

## Running Tests

```bash
cd it-asset-manager
pytest
```

## Production Build

### Frontend

```bash
cd frontend
npm run build
# Output in dist/
```

### Backend with Docker

```bash
cd it-asset-manager
docker-compose up --build
```

## In-App Documentation

After logging in, click the **Docs** button in the sidebar for:

- Getting started guide
- Dashboard customization
- Asset management workflows
- Custom fields & metadata import
- AI assistant usage
- Role-based permissions configuration

## License

MIT
