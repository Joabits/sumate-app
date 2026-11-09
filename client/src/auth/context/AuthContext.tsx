import { createContext } from "react";
import type { AuthContextValue } from "./authTypes";

/** La "caja" donde vive la sesión. La llena AuthProvider y se lee con useAuth(). */
export const AuthContext = createContext<AuthContextValue | null>(null);
