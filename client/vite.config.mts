import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import istanbul from "vite-plugin-istanbul";

// COBERTURA=1: instrumenta src/ para medir qué código ejecutan las E2E
// (ver src/cobertura.ts y el README). Sin la variable, la app no cambia.
const conCobertura = process.env.COBERTURA === "1";

export default defineConfig({
  plugins: [
    react(),
    ...(conCobertura
      ? [
          istanbul({
            include: "src/**/*",
            exclude: ["node_modules", "src/cobertura.ts"],
            extension: [".ts", ".tsx"],
            forceBuildInstrument: true,
          }),
        ]
      : []),
  ],
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname, "src") },
  },
  // src/cobertura.ts solo envía la cobertura cuando la app está instrumentada
  define: { "import.meta.env.VITE_COBERTURA": JSON.stringify(conCobertura ? "1" : "") },
  // Las variables NEXT_PUBLIC_* se conservan para no cambiar el .env ni el docker-compose
  envPrefix: ["VITE_", "NEXT_PUBLIC_"],
});
