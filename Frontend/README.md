# Agenrix Frontend

React + Vite frontend application for the Agenrix Agent Tracker system. Provides a user interface for managing agents, tracking activities, and exploring agent data.

## Requirements

- **Node.js 16.x or higher** — required for running npm packages and development server
- **npm 8.x or higher** — for package management
- **Backend API** running on `http://localhost:8000` (or configured in `.env`)

## Setup

### 1. Install Dependencies

Install all required packages using npm:

```bash
npm install
```

### 2. Environment Variables

Create a `.env` file in the project root. The frontend uses these variables to connect to the backend API:

| Variable            | Purpose                                        | Example                 |
| ------------------- | ---------------------------------------------- | ----------------------- |
| `VITE_API_BASE_URL` | Base URL for backend API calls (used by axios) | `http://localhost:8000` |

**Sample `.env` file:**

```env
VITE_API_BASE_URL=http://localhost:8000
```

**Note:** Environment variables must be prefixed with `VITE_` to be accessible in the browser (Vite requirement).

### 3. Run Development Server

Start the development server with hot module replacement (HMR):

```bash
npm run dev
```

The application will be available at `http://localhost:5173` by default.

### 4. Build for Production

Create an optimized production build:

```bash
npm run build
```

Output files will be in the `dist/` directory.

### 5. Preview Production Build

Preview the production build locally:

```bash
npm run preview
```

## Packages Overview

### Core Dependencies

| Package              | Version | Purpose                                                         |
| -------------------- | ------- | --------------------------------------------------------------- |
| **react**            | ^19.2.5 | React library for building UI components                        |
| **react-dom**        | ^19.2.5 | React DOM rendering engine                                      |
| **react-router-dom** | ^7.14.1 | Client-side routing for multi-page navigation                   |
| **axios**            | ^1.15.1 | HTTP client for making API requests to the backend (CORS-aware) |
| **react-hook-form**  | ^7.73.1 | Form state management and validation                            |
| **react-hot-toast**  | ^2.6.0  | Toast notifications for user feedback                           |
| **sonner**           | ^2.0.7  | Modern toast notification library (alternative UI)              |
| **lucide-react**     | ^1.8.0  | Icon library with React components                              |
| **clsx**             | ^2.1.1  | Utility for constructing className strings conditionally        |
| **tailwind-merge**   | ^3.5.0  | Merge Tailwind CSS classes without conflicts                    |

### Dev Dependencies

| Package                         | Version  | Purpose                                                     |
| ------------------------------- | -------- | ----------------------------------------------------------- |
| **vite**                        | ^8.0.9   | Build tool and development server (fast ES modules bundler) |
| **tailwindcss**                 | ^4.2.4   | Utility-first CSS framework for styling                     |
| **@tailwindcss/vite**           | ^4.2.4   | Tailwind CSS Vite plugin                                    |
| **autoprefixer**                | ^10.5.0  | PostCSS plugin for vendor prefixes                          |
| **postcss**                     | ^8.5.10  | CSS transformer pipeline                                    |
| **eslint**                      | ^9.39.4  | Code quality and linting tool                               |
| **@vitejs/plugin-react**        | ^6.0.1   | Vite plugin for React JSX transformation (uses Oxc)         |
| **eslint-plugin-react-hooks**   | ^7.1.1   | ESLint rules for React hooks                                |
| **eslint-plugin-react-refresh** | ^0.5.2   | ESLint rules for React fast refresh                         |
| **@eslint/js**                  | ^9.39.4  | ESLint recommended configuration                            |
| **globals**                     | ^17.5.0  | Global variables definitions for ESLint                     |
| **@types/react**                | ^19.2.14 | TypeScript type definitions for React                       |
| **@types/react-dom**            | ^19.2.3  | TypeScript type definitions for React DOM                   |

## Key Features

- **Data Explorer**: Advanced search interface capable of filtering complex, unified agent telemetry across time, file names, classification, and confidentiality with dynamic column selection.
- **Axios Integration**: Pre-configured HTTP client for backend communication. Global errors gracefully intercepted without interrupting search filtering logic.
- **Form Management**: React Hook Form for efficient form state and validation
- **Routing**: React Router for seamless multi-page navigation
- **Notifications**: Toast notifications with react-hot-toast and sonner
- **Styling**: Tailwind CSS for rapid UI development with utility classes
- **Icons**: Lucide React for consistent icon set
- **Code Quality**: ESLint configuration with React and React Hooks rules
- **Hot Module Replacement (HMR)**: Instant updates during development via Vite

## Project Structure

```
Frontend/
├── public/              # Static assets
├── src/
│   ├── api/
│   │   └── axiosInstance.js    # Configured Axios instance for API calls
│   ├── components/
│   │   ├── Layout.jsx
│   │   ├── Sidebar.jsx
│   │   └── ui/
│   │       └── TagInput.jsx
│   ├── context/
│   │   └── ThemeContext.jsx    # Theme management context
│   ├── pages/
│   │   ├── AddAgent.jsx
│   │   ├── DataExplorer.jsx
│   │   └── UpdateAgent.jsx
│   ├── lib/
│   │   └── utils.js            # Utility functions
│   ├── App.jsx                 # Main app component
│   ├── App.css
│   ├── main.jsx                # Entry point
│   └── index.css
├── .env                         # Environment variables (not committed)
├── .env.example                 # Template for .env (commit this)
├── .eslintrc.js                 # ESLint configuration
├── vite.config.js               # Vite configuration
├── tailwind.config.js           # Tailwind CSS configuration
├── postcss.config.js            # PostCSS configuration
└── package.json                 # Dependencies and scripts
```

## API Communication

### Axios Setup

Axios is configured in [src/api/axiosInstance.js](src/api/axiosInstance.js) and automatically:

- Sets the base URL from `VITE_API_BASE_URL` environment variable
- Handles CORS requests
- Includes default headers and interceptors
- Manages request/response transformations

**Usage Example:**

```javascript
import api from "./api/axiosInstance";

// GET request
const agents = await api.get("/agents");

// GET agent activity with telemetry filters
const activity = await api.get(`/get_agent_activity?agent_id=${agentId}&start_time=2026-04-21T00:00:00.000Z`);

// POST log unified agent work
const newLog = await api.post("/log_agent_work", logData);

// POST request
const newAgent = await api.post("/add_agent", agentData);

// PATCH request
const updated = await api.patch(`/update_agent/${agentId}`, updates);

// DELETE request
await api.delete(`/delete_agent/${agentId}`);
```

## CORS Configuration

Cross-Origin Resource Sharing (CORS) is configured on the **backend** (see Backend README). The frontend does not require explicit CORS configuration; axios handles cross-origin requests automatically when the backend permits them.

**Backend CORS Requirements:**

- Backend must allow requests from `http://localhost:5173` (development) or your deployed frontend URL
- Credentials may need to be included if authentication is required

## Scripts

| Script      | Command           | Description                       |
| ----------- | ----------------- | --------------------------------- |
| **dev**     | `npm run dev`     | Start development server with HMR |
| **build**   | `npm run build`   | Create optimized production build |
| **preview** | `npm run preview` | Preview production build locally  |
| **lint**    | `npm run lint`    | Run ESLint to check code quality  |

## Linting

Run ESLint to check code quality:

```bash
npm run lint
```

Configuration is in [eslint.config.js](eslint.config.js) with React and React Hooks rules enabled.

## Browser Compatibility

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Development Tips

- Use React Developer Tools browser extension for debugging
- Check browser console for API errors and network issues
- Use `VITE_API_BASE_URL` to switch between development and production backends
- HMR provides instant updates — no manual refresh needed during development

## Troubleshooting

### Port 5173 Already in Use

If port 5173 is already in use, Vite will automatically use the next available port. Check console output for the actual URL.

### CORS Errors

Ensure:

1. Backend is running on the correct address (check `VITE_API_BASE_URL`)
2. Backend CORS is configured to allow requests from your frontend URL
3. Network connectivity between frontend and backend

### API Requests Failing

1. Check that `.env` file exists and `VITE_API_BASE_URL` is set correctly
2. Verify backend is running at the configured URL
3. Check browser Network tab for request details
4. Review backend logs for error messages

## Additional Resources

- [React Documentation](https://react.dev)
- [Vite Documentation](https://vitejs.dev)
- [Tailwind CSS Documentation](https://tailwindcss.com)
- [React Router Documentation](https://reactrouter.com)
- [Axios Documentation](https://axios-http.com)
- [React Hook Form Documentation](https://react-hook-form.com)
