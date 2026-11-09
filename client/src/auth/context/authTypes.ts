/** Usuario con sesión iniciada (lo entrega Better Auth). */
export type AuthUser = {
  id: string;
  name: string;
  email: string;
  image?: string | null;
};

/** Resultado de una operación de auth: ok, o el mensaje de error en español. */
export type AuthResult = { ok: true } | { ok: false; message: string };

/** Lo que entrega useAuth() a cualquier componente. */
export type AuthContextValue = {
  user: AuthUser | null;
  /** true mientras se consulta la sesión al abrir la app */
  isLoading: boolean;
  login: (email: string, password: string) => Promise<AuthResult>;
  signup: (name: string, email: string, password: string) => Promise<AuthResult>;
  logout: () => Promise<AuthResult>;
  loginWithGoogle: (callbackURL?: string) => Promise<AuthResult>;
  requestPasswordReset: (email: string) => Promise<AuthResult>;
  resetPassword: (token: string, newPassword: string) => Promise<AuthResult>;
};
