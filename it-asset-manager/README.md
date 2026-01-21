# IT Asset Manager

A comprehensive IT Asset Management system built with FastAPI, PostgreSQL, and React. Features AI-powered assistance, intelligent data import, and complete audit logging.

## Quick Start

```bash
git clone <repository-url>
cd it-asset-manager
./scripts/start.sh
```

That's it! Access the application at **http://localhost:8000** after setup completes.

## Default Credentials

| User  | Email              | Password   |
|-------|-------------------|------------|
| Admin | admin@example.com | admin123   |

**Important**: Change the admin password after first login!

## Documentation

Full documentation is available in-app. After logging in, click the **Docs** button in the sidebar to access:

- Getting Started guide
- Dashboard customization
- Asset management
- Custom fields & metadata import
- AI Assistant usage
- Role-based permissions
- And more...

## AI Features (Optional)

For AI-powered features, set your API key:

```bash
AI_API_KEY=sk-your-key ./scripts/start.sh
```

| Variable | Description |
|----------|-------------|
| `AI_PROVIDER` | `openai` or `google` |
| `AI_API_KEY` | Your API key |

## Development

```bash
# Local development (without Docker)
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

## License

MIT
