import { betterAuth } from "better-auth";
import { jwt } from "better-auth/plugins";
import { Pool } from "pg";
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
} from "@/lib/email";

/**
 * Pool de conexión a PostgreSQL reutilizado por auth.
 */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL !== "false", // En local (docker) usa DATABASE_SSL=false
});

export const auth = betterAuth({
  plugins: [
    /**
     * JWT Plugin — emite JWT firmados con clave asimétrica (EdDSA/Ed25519)
     * para autenticar peticiones a backends externos (FastAPI, etc.).
     *
     * ── Verificación en el backend externo ───────────────────────────────────
     * El backend externo obtiene la clave pública desde el JWKS endpoint:
     *   GET /api/auth/jwks
     *
     * Usa el algoritmo EdDSA (Ed25519) por defecto — NO HS256.
     * FastAPI debe usar PyJWKClient apuntando a ese endpoint.
     *
     * ── Payload del JWT ──────────────────────────────────────────────────────
     * Definido por definePayload(). Contiene:
     *   - sub   → user.id  (seteado automáticamente por Better Auth)
     *   - email → user.email
     *   - name  → user.name
     *   - iat, exp
     *
     * ── Expiration ───────────────────────────────────────────────────────────
     * 15 minutos es el estándar profesional para JWTs de API.
     * La sesión de Better Auth (7 días) refresca el JWT silenciosamente.
     * Configurable con la variable de entorno JWT_EXPIRATION_TIME.
     *
     * Variables de entorno relevantes:
     *   JWT_EXPIRATION_TIME → Tiempo de vida del JWT (default: "15m")
     *   JWT_ISSUER          → Identificador del emisor (tu dominio)
     *   JWT_AUDIENCE        → Identificador del receptor (tu API externa)
     */
    jwt({
      jwks: {
        // Fijamos la ruta del JWKS para que FastAPI siempre sepa dónde
        // encontrar la clave pública sin depender del default.
        jwksPath: "/jwks",
      },
      jwt: {
        expirationTime: process.env.JWT_EXPIRATION_TIME ?? "15m",
        issuer:
          process.env.JWT_ISSUER ??
          process.env.BETTER_AUTH_URL ??
          "http://localhost:3000",
        audience: process.env.JWT_AUDIENCE,

        /**
         * definePayload — se ejecuta una vez al emitir o refrescar el JWT.
         * NO se ejecuta en cada petición al backend (es por request al /token).
         *
         * ⚠️ Lo que devuelves aquí REEMPLAZA el payload base.
         *    Debes incluir explícitamente los campos que necesites.
         */
        definePayload: ({ user }) => {
          return {
            email: user.email,
            name: user.name,
            emailVerified: user.emailVerified,
          };
        },
      },
    }),
  ],

  // Database — reutilizamos el mismo pool declarado arriba
  database: pool,

  // Email Provider
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    sendResetPassword: async ({ user, url }) => {
      await sendPasswordResetEmail({
        email: user.email,
        name: user.name,
        url,
      });
    },
  },
  emailVerification: {
    sendOnSignIn: true,
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      await sendVerificationEmail({
        email: user.email,
        name: user.name,
        url,
      });
    },
  },

  // Proveedores OAuth
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    },
  },
});
