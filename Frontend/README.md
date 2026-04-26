# Agenrix Frontend: Unified Agent Registry

A premium, high-performance React dashboard for the Agenrix Agent Tracker system. This frontend provides a streamlined interface for monitoring repository-based AI agents, auditing behavior, and managing the global registry.

## ✨ Design System & Aesthetics
The application features a modern, high-contrast design system optimized for professional auditing workflows.

*   **Color Palette:**
    *   **Action Yellow (`#FFC700`):** Primary branding and action color.
    *   **Deep Charcoal (`#121212`):** Primary background and text color for light mode.
    *   **Pure White (`#FFFFFF`):** Primary text and background surface color.
    *   **Muted Grey (`#888888`):** Secondary elements and borders.
*   **Theming:**
    *   **Light Mode:** A "Shades of White" professional aesthetic using `#FAFAFA` and `#FFFFFF` surfaces.
    *   **Dark Mode:** A sleek "Deep Charcoal" interface using `#121212` and `#181818` card surfaces.
    *   **Persistent Navbar:** The top navigation remains pinned to a dark branding color (`#454545` or `black`) across both modes for consistent identity.

---

## 🚀 Key Features

### 1. Unified Registry Dashboard
A consolidated view replacing the old split-tab interface. It allows simultaneous exploration of:
*   **Registry Identity (SQL):** Repository links, owners, and classifications.
*   **Audit Intelligence (NoSQL):** Agent signals, AI reasoning, and framework detection.

### 2. Action-Oriented Interface
*   **Advanced Search:** Simultaneous filtering across metadata and deep audit logs.
*   **Export:** One-click CSV export of the current registry state.
*   **Dynamic Columns:** Customizable visibility to focus on specific data layers.

---

## 🛠 Tech Stack
*   **Core:** React 19 + Vite
*   **Styling:** Tailwind CSS 4.0
*   **Icons:** Lucide React
*   **Data Handling:** Axios (Async Interceptors), PapaParse (CSV)
*   **Feedback:** Sonner + React Hot Toast

---

## 📁 Project Structure
```text
Frontend/
├── public/              # Official branding & SVG assets
├── src/
│   ├── api/
│   │   └── axiosInstance.js    # Pre-configured HTTP client
│   ├── components/
│   │   ├── Layout.jsx          # Main application wrapper
│   │   └── Navbar.jsx          # Top-fixed branding & theme toggle
│   ├── context/
│   │   └── ThemeContext.jsx    # Light/Dark mode state management
│   ├── pages/
│   │   └── Registry.jsx        # Consolidated Dashboard (Primary View)
│   ├── index.css               # Global Design System (CSS Variables)
│   └── App.jsx                 # Routing and Layout orchestration
```

---

## ⚙️ Development Setup

### Requirements
- **Node.js 16.x or higher** — required for running npm packages and development server
- **npm 8.x or higher** — for package management
- **Backend API** running on `http://localhost:8000` (or configured in `.env`)

1.  **Install Dependencies:**
    ```bash
    npm install
    ```

2.  **Environment Variables:**
    Create a `.env` file in the root:
    ```env
    VITE_API_BASE_URL=http://localhost:8000
    ```

3.  **Run Development Server:**
    ```bash
    npm run dev
    ```

4.  **Production Build:**
    ```bash
    npm run build
    ```

---

## 📡 API Integration Examples

### Fetching Registry Data
```javascript
import api from "./api/axiosInstance";

const response = await api.get("/repo_scans");
const data = response.data;
```

### Bulk Ingestion
```javascript
const payload = {
    repo: { ...repoData },
    agent: { ...agentData }
};
await api.post("/repo_scans", payload);
```

---

## 🔍 Accessibility & Compliance
*   **High Contrast:** All primary action buttons (Action Yellow) utilize black text for maximum readability.
*   **Semantic HTML:** Optimized for screen readers and keyboard navigation.
*   **Responsive Layout:** Fully fluid grid system that adapts to professional monitor setups.
