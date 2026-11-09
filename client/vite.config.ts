import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  // Las variables NEXT_PUBLIC_* se conservan para no cambiar el .env ni el docker-compose
  envPrefix: ["VITE_", "NEXT_PUBLIC_"],
});
