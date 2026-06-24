import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// During `netlify dev` the functions are served on the same origin, so the
// front-end can just call /api/crude. For plain `vite dev` (no Netlify CLI)
// the crude function won't exist and the app gracefully falls back.
export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
});
