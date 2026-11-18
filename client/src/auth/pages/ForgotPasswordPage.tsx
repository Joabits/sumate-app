import Link from "@/shared/components/Link";
import { ForgotPasswordForm } from "@/auth/components/ForgotPasswordForm";
import { AuthMobileHeader } from "@/auth/components/AuthMobileHeader";

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen w-full flex flex-col justify-between bg-fondo text-texto px-6 py-5 antialiased selection:bg-accion selection:text-sobre-accion">
      <div className="w-full">
        <AuthMobileHeader fallbackHref="/" />

        <section className="mt-4 mb-8">
          <h1 className="text-[28px] font-extrabold text-texto tracking-tight leading-tight">
            Recupera tu contraseña
          </h1>
          <p className="text-sm text-texto-tenue mt-1.5 font-medium">
            Ingresa tu correo electrónico y te enviaremos las instrucciones para restablecerla.
          </p>
        </section>

        <ForgotPasswordForm />
      </div>

      <div className="text-center pt-6 pb-3 w-full">
        <Link
          href="/auth/login"
          className="text-sm font-semibold text-texto hover:text-accion transition-colors"
        >
          ¿Recordaste tu contraseña?{" "}
          <span className="underline decoration-1 underline-offset-4 font-bold text-accion">
            Inicia sesión
          </span>
        </Link>
      </div>
    </div>
  );
}

