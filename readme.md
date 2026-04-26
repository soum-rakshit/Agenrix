# Agenrix: Unified Agent Registry & Audit System

**Agenrix** is a premium full-stack enterprise solution designed to manage, monitor, and audit autonomous agents across repositories. It provides a centralized **Unified Registry** to track agent identities, control access rights, and log high-frequency telemetry for security compliance.

---

## 🚀 Core Functionalities

*   **Unified Registry Dashboard:** A consolidated interface for exploring repository metadata (SQL) and deep audit intelligence (NoSQL) simultaneously.
*   **Split-Write Intelligence:** Automated workflow that synchronizes structural identity in PostgreSQL and high-volume audit logs in MongoDB.
*   **Auto-Registration Engine:** Automatically registers and upserts agent profiles into the registry during repository scans if agentic behavior is detected.
*   **Bulk CSV Operations:** Integrated PapaParse engine for high-speed client-side ingestion of telemetry and agent metadata.
*   **Advanced Fuzzy Search:** Simultaneous parallel queries via ILIKE (SQL) and $regex (NoSQL) joined by unique repository identifiers.

---

## 🏗️ Technical Architecture

Agenrix employs a **Split-Write Strategy** to balance relational integrity with big-data scalability:

1.  **Registry Layer (PostgreSQL):** Stores "Structural Identity"—metadata about repositories and agents that requires strict schema enforcement.
2.  **Audit Layer (MongoDB):** Stores "High-Volume Telemetry"—AI reasoning signals, framework detection, and event streams using the **Bucket Pattern**.

---

## 📂 Project Structure

The project is split into two specialized modules. Refer to the individual README files for detailed setup and API documentation.

### 🛠️ [Backend Implementation](./Backend/README.md)
*   **Tech Stack:** FastAPI (Async), SQLAlchemy (AsyncPG), MongoDB (Motor).
*   **Key Logic:** Auto-Registration upserts, dual-database joins, and Pydantic validation.
*   **Setup:** Requires Python 3.10+, virtual environment, and `.env` configuration.

### 💻 [Frontend Implementation](./Frontend/README.md)
*   **Tech Stack:** React 19, Vite, Tailwind CSS 4.0.
*   **Aesthetics:** High-contrast "Deep Charcoal" and "Action Yellow" design system with "Shades of White" professional light mode.
*   **Key Features:** Top-fixed persistent branding, dynamic registry table, and client-side CSV parsing.
*   **Setup:** Requires Node.js 16+, `npm install`, and `.env` configuration.

---

## 📝 Note
Ensure both your **PostgreSQL** and **MongoDB** instances are reachable and authorized before starting the backend service. See the [Backend README](./Backend/README.md) for precise connection string requirements and IP allowlisting tips.