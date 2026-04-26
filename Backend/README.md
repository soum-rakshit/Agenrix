# Agenrix Backend: Dual-Database Agent Registry & Audit System

## Overview
Agenrix Backend is a high-performance, asynchronous audit and management system designed to track AI agents across repositories. It employs a **Split-Write Strategy** to balance relational integrity with the scalability required for high-volume telemetry.

## 🏗 Architecture
The system utilizes a dual-database approach to optimize for different data access patterns:

*   **Relational Layer (PostgreSQL):** Stores "Structural Identity"—metadata about repositories and agents that requires strict schema enforcement and relational consistency.
*   **Audit Layer (MongoDB):** Stores "High-Volume Telemetry"—nested signals, AI reasoning logs, and frequent agent activity events using a schema-less approach to handle evolving audit data.

> [!IMPORTANT]
> **Split-Write Logic:** Every ingestion request (`/repo_scans`) potentially triggers writes to both databases. Structural metadata is committed to PostgreSQL, while detailed audit logs are pushed to MongoDB.

## 🛠 Tech Stack
*   **Framework:** FastAPI (Asynchronous)
*   **Relational ORM:** SQLAlchemy (AsyncPG driver)
*   **Document Store:** MongoDB (Motor driver)
*   **Validation:** Pydantic v2
*   **Environment:** Python 3.10+

---

## 🚦 API Reference

### Registry Operations (PostgreSQL Identity Layer)

#### `GET /agents`
Fetches a filtered list of agents.
*   **Status Codes:** `200 OK`, `500 Internal Server Error`
*   **Fuzzy Search:** Queries `agent_name`, `agent_id`, and `owner` using SQL `ILIKE`.

#### `POST /add_agent`
Manually registers a new agent.
*   **Status Codes:** `201 Created`, `400 Bad Request` (Duplicate ID)

#### `PATCH /update_agent/{agent_id}`
Updates existing agent configuration or access rights.
*   **Status Codes:** `200 OK`, `404 Not Found`

### Audit & Scan Operations (Unified Ingestion)

#### `POST /repo_scans`
The primary ingestion endpoint for repository analysis.

> [!NOTE]
> **Auto-Registration Logic:** If the analysis classifies a repository as an `AGENT` or `POSSIBLE_AGENT`, the system automatically performs an upsert in the PostgreSQL `agents` table using the provided metadata.

*   **Status Codes:** `200 OK`, `400 Bad Request`
*   **Payload Example:**
```json
{
    "repo": {
        "repo_id": "auto-agent-4041",
        "repo_name": "langchain-crawler-bot",
        "repo_link": "https://github.com/example/langchain-crawler-bot",
        "classification": "AGENT",
        "confidence": "high",
        "agent_signals": [
            "Langchain agent loop detected",
            "OpenAI tool calling implementation"
        ],
        "evidence_files": [
            "src/agent/executor.ts"
        ],
        "frameworks_detected": [
            "LangChain"
        ],
        "reasoning": "The codebase contains a primary execution loop that autonomously calls the OpenAI API."
    },
    "agent": {
        "agent_id": "researcher-01",
        "agent_name": "DeepSearch AI",
        "agent_description": "Autonomous agent for deep web research.",
        "owner": "soum-rakshit",
        "authorized_by": "Worker-Scan",
        "subscription_plan": "Free",
        "access_rights": {
            "read": true,
            "write": false,
            "delete": false
        },
        "integration_details": {
            "tools": ["google_search", "web_scraper"]
        }
    }
}
```

#### `GET /repo_scans`
Retrieves detailed audit records joined with their registry identity.

---

## 🔍 Advanced Fuzzy Search
The system provides a single-window search experience by executing parallel queries:
1.  **SQL Query:** Executes `ILIKE` matches on registry tables.
2.  **NoSQL Query:** Executes `$regex` matches on MongoDB reasoning and signal fields.
3.  **Result Join:** The results are merged in-memory, keyed by `repo_id`, to provide a unified response.

---

## 📊 Database Schema Mapping

### SQL Registry (PostgreSQL)
| Table | Columns |
| :--- | :--- |
| **repos** | `id`, `repo_id`, `repo_name`, `repo_link`, `classification`, `confidence` |
| **agents** | `id`, `agent_id`, `agent_name`, `description`, `owner`, `access_rights` (JSONB), `integration_details` (JSONB) |

### NoSQL Audit (MongoDB)
*   **Repo Audit Data:** `signals[]`, `evidence_files[]`, `frameworks_detected[]`, `reasoning`.
*   **Agent Activity:** `session_id`, `action`, `duration_min`, `events[]`, `recipients[]`, `shared_data[]`.

---

## ⚙️ Usage & Constraints
*   **Mandatory Fields:** `repo_id` and `repo_link` are required for all scan ingestions.
*   **Optional Metadata:** `agent_id` is only mandatory if agent-specific metadata is being provided for auto-registration.
*   **Environment Variables:**
    ```env
    PORT=8000
    POSTGRES_URI=postgresql+asyncpg://user:pass@localhost:5432/agenrix
    MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/agentdb
    ```

## 🚀 Running the Server
```bash
python main.py
```
*   **Docs:** `http://localhost:8000/docs` (Swagger UI)
