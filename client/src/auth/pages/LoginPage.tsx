import { Suspense } from "react";
import Link from "@/shared/components/Link";
import { LoginForm } from "@/auth/components/LoginForm";
import { AuthMobileHeader } from "@/auth/components/AuthMobileHeader";
import AuthErrorNotifier from "@/auth/components/AuthErrorNotifier";

export default function LoginPage() {
  return (
    <div className="min-h-screen w-full flex flex-col justify-between bg-fondo text-texto px-6 py-5 antialiased selection:bg-accion selection:text-sobre-accion">
      <div className="w-full">
        {/* Lee ?error= en la URL y muestra el toast correspondiente */}
        <Suspense>
          <AuthErrorNotifier />
        </Suspense>

        <AuthMobileHeader fallbackHref="/" />

        <section className="mt-4 mb-8">
          <h1 className="text-[28px] font-extrabold text-texto tracking-tight leading-tight">
            Inicia sesión
          </h1>
          <p className="text-sm text-texto-tenue mt-1.5 font-medium">
            Ingresa a tu cuenta para continuar.
          </p>
        </section>

        <LoginForm />
      </div>

      <div className="text-center pt-6 pb-3 w-full">
        <Link
          href="/auth/signup"
          className="text-sm font-semibold text-texto hover:text-accion transition-colors"
        >
          ¿No tienes cuenta?{" "}
          <span className="underline decoration-1 underline-offset-4 font-bold text-accion">
            Regístrate
          </span>
        </Link>
      </div>
    </div>
  );
}

