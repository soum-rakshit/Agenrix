# Agent Management System API

FastAPI backend for managing agents with PostgreSQL (async SQLAlchemy) and optional MongoDB support.

## Requirements

- **Python 3.10 or higher** — required for async patterns and modern type-hinting used in this project.
- A reachable **PostgreSQL** instance (cloud or local).
- Optional: **MongoDB** (Motor/PyMongo) for NoSQL features when that layer is enabled.

## Setup

### 1. Create and activate a virtual environment

```bash
python -m venv .venv
```

- **Windows (PowerShell):** `.venv\Scripts\Activate.ps1`
- **Windows (cmd):** `.venv\Scripts\activate.bat`
- **Git Bash / Linux / macOS:** `source .venv/Scripts/activate` or `source .venv/bin/activate`

### 2. Install dependencies

```bash
pip install -r requirements.txt
```

### 3. Environment variables

Create a `.env` file in the project root (same directory as `main.py`). The app loads variables via `python-dotenv` in `config/settings.py`.

| Variable | Purpose |
|----------|---------|
| `POSTGRES_URI` | Async SQLAlchemy connection string for PostgreSQL. For async SQLAlchemy with `asyncpg`, use a URI like `postgresql+asyncpg://USER:PASSWORD@HOST:PORT/DATABASE`. |
| `MONGODB_URI` | MongoDB connection string (Atlas or self-hosted). In code this is read into the `MONGO_URI` setting attribute. |

**PostgreSQL access (cloud providers)**  
If you use a hosted database such as **Supabase** or **Neon**, connections are often blocked until your client IP is allowed. Add your machine’s public IP (or your deployment region’s egress IPs) to the provider’s **IP allowlist / network restrictions** so the API can open a pool to the database.

**MongoDB**  
When Mongo routes or startup checks are enabled, ensure `MONGODB_URI` is valid and network access matches your Atlas or server firewall rules.

### 4. Run the API

From the project root, with the virtual environment activated:

```bash
uvicorn main:app --reload
```

Interactive docs: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)  
OpenAPI JSON: [http://127.0.0.1:8000/openapi.json](http://127.0.0.1:8000/openapi.json)

---

## API routes

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | Health-style message confirming the API is live. |
| `POST` | `/add_agent` | Creates a new agent in PostgreSQL. Body: `AgentCreate` JSON. Returns `400` if `agent_id` already exists. |
| `GET` | `/agents` | Lists agents with optional filters and pagination. Response model: list of `AgentCreate`. |

### `GET /agents` — query parameters

Optional filters (combine as needed):

- **Identity / metadata:** `agent_id`, `agent_name`, `agent_source`, `owner`, `authorized_by`, `subscription_plan`, `status`
- **Contributors (JSON list):** `contributor`
- **Access rights (nested JSON):** `tool`, `file`, `data_node`, `api`, `server`
- **Pagination:** `limit` (default `100`, max `500`), `offset` (default `0`)

---

## Project layout (high level)

- `main.py` — FastAPI app and routes
- `config/` — settings and database helpers (`settings.py`, `db_sql.py`, `db_nosql.py`)
- `models/` — SQLAlchemy and domain models
- `schema/` — Pydantic schemas
