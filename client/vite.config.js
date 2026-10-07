import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The API is called directly (VITE_API_BASE_URL), so the backend must allow
// this origin: set FRONTEND_URL=http://localhost:5173 in the backend .env.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
  },
  preview: {
    port: 5173,
    strictPort: true,
  },
});
