/**
 * Servidor del frontend (un solo proceso Node en el puerto 3000):
 *
 *   /api/auth/*  → Better Auth: login, registro, sesión, Google y el JWT que usa FastAPI
 *   todo lo demás → la app de React (src/main.tsx)
 *                   · desarrollo (pnpm dev):  Vite, con recarga al guardar
 *                   · producción (pnpm start): los archivos ya compilados de dist/
 *
 * Vite solo sirve archivos y no puede correr Better Auth, por eso existe este servidor.
 */
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./auth";

const PORT = Number(process.env.PORT ?? 3000);
const HOST = process.env.HOST ?? "0.0.0.0";
const isProduction = process.argv.includes("--prod");
const root = path.resolve(__dirname, "..");
const dist = path.join(root, "dist");

type Handler = (req: IncomingMessage, res: ServerResponse) => void;

const authHandler = toNodeHandler(auth);

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
};

/** Producción: sirve dist/; cualquier ruta que no sea un archivo devuelve index.html (React Router decide). */
async function serveBuiltApp(req: IncomingMessage, res: ServerResponse) {
  const urlPath = decodeURIComponent((req.url ?? "/").split("?")[0]);
  const file = path.normalize(path.join(dist, urlPath));
  // Nunca salir de dist/
  const insideDist = file.startsWith(dist + path.sep);
  const isFile = insideDist && (await stat(file).then((s) => s.isFile(), () => false));
  const target = isFile ? file : path.join(dist, "index.html");

  res.setHeader("Content-Type", MIME[path.extname(target)] ?? "application/octet-stream");
  // Los archivos de /assets llevan un hash en el nombre: se pueden guardar para siempre
  res.setHeader(
    "Cache-Control",
    urlPath.startsWith("/assets/") ? "public, max-age=31536000, immutable" : "no-cache",
  );
  res.end(await readFile(target));
}

async function main() {
  const server = createServer();
  let appHandler: Handler;

  if (isProduction) {
    appHandler = (req, res) => {
      serveBuiltApp(req, res).catch(() => {
        res.statusCode = 500;
        res.end("Error interno");
      });
    };
  } else {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      root,
      appType: "spa",
      server: { middlewareMode: true, hmr: { server } },
    });
    appHandler = (req, res) => vite.middlewares(req, res);
  }

  server.on("request", (req, res) => {
    if (req.url?.startsWith("/api/auth")) {
      void authHandler(req, res);
      return;
    }
    appHandler(req, res);
  });

  server.listen(PORT, HOST, () => {
    console.log(
      `Súmate ${isProduction ? "(producción)" : "(desarrollo)"} en http://localhost:${PORT}`,
    );
  });
}

void main();
