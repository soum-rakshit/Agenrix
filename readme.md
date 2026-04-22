# Agenrix - Agent Management & Audit System

**Agenrix** is a full-stack enterprise solution designed to manage, monitor, and audit autonomous agents. It provides a centralized dashboard to track agent identities, control their access rights, and log high-frequency activities for security compliance.

---

## 🚀 Core Functionalities

* **Agent Lifecycle Management:** Full CRUD operations to manage agent profiles, owners, and subscription statuses.
* **Granular Access Control:** Define authorized tools, APIs, and servers using a high-performance PostgreSQL `JSONB` system.
* **Bulk Operations:** Integrated CSV parser for batch creating and updating agent records.
-   **Security Auditing:** Automatic compliance engine that flags unencrypted or sensitive data sharing.
-   **Scalable Telemetry:** Utilizes the "Bucket Pattern" in MongoDB to handle API activity logs efficiently.

---

## 🏗️ Technical Architecture

This application uses a **Polyglot Persistence** strategy to optimize for both data integrity and write speed:

1.  **PostgreSQL (SQL):** Stores structured agent identity, metadata, and permissions.
2.  **MongoDB (NoSQL):** Stores high-velocity event streams and audit logs using time-series bucketing.

---

## 📂 Project Structure & Setup

The project is split into two independent modules. **Please refer to the individual README files within each folder for specific setup instructions.**

### 🛠️ [Backend Implementation](./Backend/README.md)
* **Framework:** FastAPI (Python 3.10+)
* **Database Drivers:** SQLAlchemy (Async) & Motor (MongoDB)
* **Key Features:** Async I/O, Pydantic validation, and CORS security.
* **Setup:** Requires Python virtual environment and a `.env` file.

### 💻 [Frontend Implementation](./Frontend/README.md)
* **Framework:** React + Vite
* **Styling:** Tailwind CSS
* **Key Features:** Axios interceptors for global error handling, CSV-to-JSON parsing, and interactive dashboard.
* **Setup:** Requires Node.js and `npm install`.

---

### 📝 Note
Ensure both your **PostgreSQL** and **MongoDB** instances are reachable before starting the backend. See the [Backend README](./Backend/README.md) for connection string formats.