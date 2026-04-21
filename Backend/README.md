# Agenrix - Agent Tracker

FastAPI backend for managing agents with PostgreSQL (async SQLAlchemy) and MongoDB support.

## Requirements

- **Python 3.10 or higher** — required for async patterns and modern type-hinting used in this project.
- A reachable **PostgreSQL** instance (cloud or local).
- A reachable **MongoDB** (Motor/PyMongo) instance (cloud or local).

## Setup

### 0. Prerequisites

Before starting, ensure you have a .env file with the following:

- **PostgreSQL** instance running 
- **MongoDB** instance running
- Valid connection credentials for both databases and port

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

| Variable       | Purpose                                                                                                                                                         | Example                                                 |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| `PORT`         | Port number on which the FastAPI server will run.                                                                                                               | `8000`                                                  |
| `POSTGRES_URI` | Async SQLAlchemy connection string for PostgreSQL. You must use the `postgresql+asyncpg://` prefix for async compatibility. | `postgresql+asyncpg://user:pass@localhost:5432/agenrix` |
| `MONGODB_URI`  | MongoDB connection string (Atlas or self-hosted).                                                                 | `mongodb+srv://user:pass@cluster.mongodb.net/agentdb`   |

**Sample `.env` file:**

```env
PORT=8000
POSTGRES_URI=postgresql+asyncpg://myuser:mypassword@localhost:5432/agentrix_db
MONGODB_URI=mongodb+srv://myuser:mypassword@cluster.mongodb.net/agentrix_db?retryWrites=true&w=majority
```

**PostgreSQL access (cloud providers)**  
If you use a hosted database such as **Supabase** or **Neon**, connections are often blocked until your client IP is allowed. Add your machine’s public IP (or your deployment region’s egress IPs) to the provider’s **IP allowlist / network restrictions** so the API can open a pool to the database.

**MongoDB connectivity**  
Ensure `MONGODB_URI` is valid and network access matches your Atlas or server firewall rules to successfully connect to the MongoDB instance.

**Port conflicts**  
Ensure the PORT specified in `.env` is not already in use on your system. If it is, modify the PORT value in `.env` and restart the server.

### 4. Run the API

From the project root, activate the virtual environment and start the server:

```bash
python main.py
```

The server will:

- Initialize PostgreSQL tables automatically on startup
- Verify MongoDB connectivity on startup
- Start on `http://127.0.0.1:{PORT}` as specified in your `.env` file
- Automatically redirect to Swagger UI at `http://127.0.0.1:{PORT}/docs`

**Example output:**

```
Initializing PostgreSQL tables...
✅ PostgreSQL tables synchronized.
✅ Successfully connected to MongoDB Atlas (Async)
INFO:     Uvicorn running on http://127.0.0.1:{PORT} (Press CTRL+C to quit)
```

Then visit: [http://127.0.0.1:{PORT}/docs](http://127.0.0.1:{PORT}/docs)  
OpenAPI JSON: [http://127.0.0.1:{PORT}/openapi.json](http://127.0.0.1:{PORT}/openapi.json)

---

## API routes

### Agent Management

| Method   | Path                       | Description                                                                                                                  |
| -------- | -------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `GET`    | `/`                        | Auto-redirect to `/docs`, Swagger UI.                                 |
| `POST`   | `/add_agent`               | Creates a new agent in PostgreSQL. Body: `AgentCreate` JSON. Returns `400` if `agent_id` already exists.                     |
| `GET`    | `/agents`                  | Lists agents with optional filters and pagination. Response model: list of `AgentCreate`.                                    |
| `PATCH`  | `/update_agent/{agent_id}` | Updates an existing agent. Body: JSON with fields to update. Returns `404` if agent not found, `409` on constraint conflict. |
| `DELETE` | `/delete_agent/{agent_id}` | Deletes an agent permanently. Returns `404` if agent not found.                                                              |

### Activity & Audit Logging

| Method | Path                             | Description                                                                                                                       |
| ------ | -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `POST` | `/add_agent_activity`            | Log high-frequency internal agent actions using the Bucket Pattern. Stores activity in MongoDB. Returns `404` if agent not found. |
| `POST` | `/add_external_comm`             | Log sensitive data sharing and external communications with automatic compliance tracking. Returns compliance check status.       |
| `GET`  | `/get_agent_activity/{agent_id}` | Retrieve all activity logs and external communications for an agent. Returns activities and communications summaries.             |

---

## Architecture Overview

### Dual Database Strategy

This API uses a **hybrid storage approach**:

- **PostgreSQL (SQL):** Stores agent identity, metadata, subscription plans, and access rights. Optimized for structured queries and relational integrity.
- **MongoDB (NoSQL):** Stores high-frequency activity logs, communication audits, and event streams using the Bucket Pattern for scalability.

### Agent Identity and Metadata with PostgreSQL

Agent identity, configuration, and access rights are stored in a relational PostgreSQL database to ensure data integrity and structured querying. The agent model includes a flexible JSONB column for granular access rights:

```json
{
    "agent_id": "AGT-1000",
    "agent_name": "Security Bot 1",
    "agent_source": "Internal",
    "owner": "Team Alpha",
    "status": "Active",
    "access_rights": {
        "tools": ["nmap", "wireshark"],
        "files": ["/etc/passwd"],
        "data_nodes": ["DB-Main"],
        "apis": ["AuthService"],
        "servers": ["srv-01"]
    }
}
```

This model ensures strict uniqueness on `agent_id` while providing flexibility for dynamic access right definitions.

### Activity Logging with Bucket Pattern

Activity logs are stored in hourly buckets in MongoDB. This implements the Bucket Pattern for handling high-velocity (100k+ API calls) activity logs efficiently:

```json
{
    "agent_id": "agent_001",
    "hour": "2026-04-21T14:00:00Z",
    "events": [
        {
            "session_id": "sess_123",
            "used_by": "user_name",
            "action": "data_access",
            "duration_min": 5,
            "files_altered": ["file1.txt", "file2.csv"]
        }
    ]
}
```

This pattern prevents individual document growth and enables efficient range queries by time period.

### External Communication Audit

All sensitive data sharing through the API is logged with compliance tracking:

- Captures recipient email, shared data classification, and encryption status
- Automatic compliance flag calculation based on data sensitivity
- Enables audit trails for regulatory compliance (SOC2, GDPR, etc.)

```json
{
    "agent_id": "agent_001",
    "recipient": "analyst@company.com",
    "timestamp": "2026-04-21T14:30:00Z",
    "compliance_flag": true,
    "data_shared": [
        {
            "item": "sales_report",
            "classification": "internal",
            "is_confidential": false,
            "location_path": "/reports/sales",
            "encryption_status": "None"
        }
    ]
}
```

---

## GET /agents — List Agents

Fetches a list of agents based on optional query parameters.

**Query Parameters:**
- `agent_id`, `agent_name`, `agent_source`, `owner`, `authorized_by`, `subscription_plan`, `status`
- `contributor` (JSON list item check)
- `tool`, `file`, `data_node`, `api`, `server` (Access rights nested JSON check)
- `limit` (default `100`, max `500`), `offset` (default `0`)

**Response codes:**

- `200` — Success. Returns list of agents.
- `500` — Internal server error.

**Example Request:**

```bash
curl -X GET "http://127.0.0.1:8000/agents?status=Active&limit=10"
```

**Example Response:**

```json
[
  {
    "agent_id": "AGT-1000",
    "agent_name": "Security Bot 1",
    "agent_source": "Internal",
    "owner": "Team Alpha",
    "status": "Active",
    "access_rights": {
        "tools": ["nmap"]
    }
  }
]
```

---

## POST /add_agent_activity — Log Agent Activity

Records high-frequency internal agent actions using MongoDB's Bucket Pattern for efficient storage and retrieval.

**Request Body:**

```json
{
    "agent_id": "agent_001",
    "event": {
        "session_id": "sess_123",
        "used_by": "operator_name",
        "action": "data_access",
        "duration_min": 5,
        "files_altered": ["file1.txt", "file2.csv"]
    }
}
```

**Response codes:**

- `200` — Success. Activity logged in hourly bucket.
- `404` — Agent not found in PostgreSQL.
- `500` — Internal server error.

**Example:**

```bash
curl -X POST http://127.0.0.1:8000/add_agent_activity \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "agent_001",
    "event": {
      "session_id": "sess_123",
      "used_by": "john_doe",
      "action": "file_access",
      "duration_min": 10,
      "files_altered": ["report.pdf"]
    }
  }'
```

---

## POST /add_external_comm — Log External Communication

Logs sensitive data sharing events with automatic compliance flag calculation. Used for audit trails and regulatory compliance.

**Request Body:**

```json
{
    "agent_id": "agent_001",
    "recipient": "recipient@example.com",
    "data_shared": [
        {
            "item": "customer_database",
            "classification": "confidential",
            "is_confidential": true,
            "location_path": "/data/customers",
            "encryption_status": "AES-256"
        }
    ]
}
```

**Response codes:**

- `200` — Success. Communication logged with compliance check complete.
- `404` — Agent not found.
- `500` — Internal server error.

**Example:**

```bash
curl -X POST http://127.0.0.1:8000/add_external_comm \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "agent_001",
    "recipient": "analyst@company.com",
    "data_shared": [
      {
        "item": "sales_report",
        "classification": "internal",
        "is_confidential": false,
        "location_path": "/reports/sales",
        "encryption_status": "None"
      }
    ]
  }'
```

---

## GET /get_agent_activity/{agent_id} — Retrieve Agent Activity & Communications

Fetches all activity logs and external communications for a specific agent across all time periods.

**Path Parameters:**

- `agent_id` (string, required) — The unique identifier of the agent

**Response:**

```json
{
  "agent_id": "agent_001",
  "total_activities": 1,
  "total_external_comms": 1,
  "data": {
    "activity_logs": [
      {
        "agent_id": "agent_001",
        "hour": "2026-04-21T14:00:00Z",
        "events": [
          {
            "session_id": "sess_123",
            "used_by": "operator_name",
            "action": "data_access",
            "duration_min": 5,
            "files_altered": ["file1.txt"]
          }
        ]
      }
    ],
    "external_communications": [
      {
        "agent_id": "agent_001",
        "recipient": "recipient@example.com",
        "data_shared": [
          {
            "item": "sales_report",
            "classification": "internal",
            "is_confidential": false,
            "location_path": "/reports/sales",
            "encryption_status": "None"
          }
        ],
        "timestamp": "2026-04-21T14:30:00Z"
      }
    ]
  }
}
```

**Response codes:**

- `200` — Success. Returns all activities and communications for the agent.
- `404` — No activity found or agent not found.
- `500` — Internal server error.

**Example:**

```bash
curl -X GET http://127.0.0.1:8000/get_agent_activity/agent_001
```

---

## PATCH /update_agent/{agent_id} — Update an Agent

Updates an existing agent with new values. Supports partial updates (only provide fields you want to change).

**Path Parameters:**

- `agent_id` (string, required) — The unique identifier of the agent to update

**Request Body:**
Fields `agent_id` and `agent_name` are protected and will be ignored if provided.

```json
{
  "subscription_plan": "enterprise",
  "status": "active",
  "access_rights": {
    "tools": ["nmap", "new_tool"]
  }
}
```

**Supported update scenarios:**

- Shallow updates: `{"owner": "new_owner", "subscription_plan": "premium"}`
- Deep merge for nested JSON: `{"access_rights": {"tools": ["tool1", "tool2"]}}` — merges with existing `access_rights`
- Timestamps are automatically updated with `last_updated` ISO timestamp

**Response codes:**

- `200` — Success. Returns updated agent object.
- `404` — Agent not found.
- `409` — Conflict: update violates unique constraints (e.g., duplicate `agent_id` from another agent).
- `500` — Internal server error.

**Example:**

```bash
curl -X PATCH http://127.0.0.1:8000/update_agent/agent_001 \
  -H "Content-Type: application/json" \
  -d '{"subscription_plan": "enterprise", "status": "active"}'
```

---

## DELETE /delete_agent/{agent_id} — Delete an Agent

Permanently deletes an agent from the database.

**Path Parameters:**

- `agent_id` (string, required) — The unique identifier of the agent to delete

**Response codes:**

- `200` — Success. Agent deleted.
- `404` — Agent not found.
- `500` — Internal server error.

**Example:**

```bash
curl -X DELETE http://127.0.0.1:8000/delete_agent/agent_001
```

---

## Project layout (high level)

```text
Backend/
├── config/
│   ├── db_nosql.py    # MongoDB Motor client initialization
│   ├── db_sql.py      # SQLAlchemy engine and AsyncSessionLocal
│   └── settings.py    # Pydantic/OS Environment management
├── models/
│   ├── agent_model_sql.py # PostgreSQL Table (JSONB columns)
│   └── nosql_models.py    # MongoDB logic (Bucket Pattern)
├── schema/
│   └── schemas.py         # Pydantic validation models
└── main.py                # API Routes & Lifespan management
```
