// Central API helper — all fetch calls go through this.
//
// In production (Vercel), VITE_API_URL points to the Render backend:
//   VITE_API_URL=https://tradeledger-server.onrender.com
//
// In development, VITE_API_URL is empty (or unset), so fetch() uses
// relative paths that the Vite dev proxy forwards to localhost:3001.

const API_URL = import.meta.env.VITE_API_URL || "";

export default function api(path, options) {
  return fetch(`${API_URL}${path}`, options);
}
