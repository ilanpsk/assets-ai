# IT Asset Manager — Backend

FastAPI + PostgreSQL backend for the IT Asset Manager.

> 📖 See the [root README](../README.md) for full project documentation.

## Quick Start

```bash
./scripts/start.sh
```

Or with Docker:

```bash
docker-compose up
```

API available at **http://localhost:8000**.

## Local Development

```bash
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

## Database

```bash
# Apply migrations
alembic upgrade head

# Create new migration
alembic revision --autogenerate -m "description"

# Rollback
alembic downgrade -1
```

## Environment

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET_KEY` | JWT signing key |
| `AI_PROVIDER` | `openai` or `google` |
| `AI_API_KEY` | Your AI API key |

## Structure

```
app/
├── main.py       # FastAPI app entry
├── api/routers/  # REST endpoints
├── models/       # SQLAlchemy models
├── schemas/      # Pydantic schemas
├── services/     # Business logic
└── ai/           # AI tools and prompts
```

## API Docs

- Swagger: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Tests

```bash
pytest
```
