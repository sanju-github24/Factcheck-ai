// In production (Vercel), set VITE_API_URL to your Render backend URL, e.g.
//   VITE_API_URL=https://factcheck-ai-backend.onrender.com
// In local dev, leave it unset — Vite's dev proxy (see vite.config.js) forwards
// "/api" to http://localhost:8000 for you.
const RAW_BASE = import.meta.env.VITE_API_URL || "";

// Strip any trailing slash so "BASE + /api/..." never double-slashes.
export const API_BASE = RAW_BASE.replace(/\/+$/, "");
