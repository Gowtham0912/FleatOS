# Fleet Tracking Backend — Quick Start

## Folder Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py            # FastAPI app factory + lifespan
│   ├── config.py          # Settings (reads .env)
│   ├── database.py        # Async SQLAlchemy engine + session
│   ├── models.py          # ORM models: Vehicle, Location
│   ├── schemas.py         # Pydantic v2 DTOs
│   ├── services.py        # Business logic layer
│   ├── websocket_manager.py  # WS connection pool + broadcast
│   └── routes/
│       ├── __init__.py
│       ├── location.py    # POST /location
│       ├── vehicles.py    # GET /vehicles, GET /vehicles/{id}
│       └── websocket.py   # WS /ws
├── alembic/
│   ├── env.py
│   └── versions/          # Migration files go here
├── alembic.ini
├── requirements.txt
└── .env.example
```

## Setup

### 1. Create a virtual environment

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate
# macOS / Linux
source venv/bin/activate
```

### 2. Install dependencies

```bash
pip install -r requirements.txt
```

### 3. Create the `.env` file

```bash
copy .env.example .env   # Windows
cp .env.example .env     # macOS/Linux
```

Edit `.env` to point to your PostgreSQL instance.

### 4. Run the server

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/location` | Receive GPS ping from mobile |
| `GET` | `/vehicles` | List all tracked vehicles |
| `GET` | `/vehicles/{id}` | Vehicle + latest location |
| `GET` | `/vehicles/{id}/history` | Last 100 pings |
| `WS` | `/ws` | Live updates for dashboard |
| `GET` | `/health` | Health check |

## Interactive Docs

Once running, visit:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc
