import Link from "@/shared/components/Link";
import { SignupForm } from "@/auth/components/SignupForm";
import { AuthMobileHeader } from "@/auth/components/AuthMobileHeader";

export default function SignupPage() {
  return (
    <div className="min-h-screen w-full flex flex-col justify-between bg-fondo text-texto px-6 py-5 antialiased selection:bg-accion selection:text-sobre-accion">
      <div className="w-full">
        <AuthMobileHeader fallbackHref="/" />

        <section className="mt-4 mb-8">
          <h1 className="text-[28px] font-extrabold text-texto tracking-tight leading-tight">
            Completa tu registro
          </h1>
          <p className="text-sm text-texto-tenue mt-1.5 font-medium">
            Únete a la mayor comunidad de voluntariado.
          </p>
        </section>

        <SignupForm />
      </div>

      <div className="pt-6 pb-3 space-y-4 w-full">
        <p className="text-center text-[11px] text-texto-tenue px-4 leading-snug">
          Al registrarte, aceptas nuestros{" "}
          <a href="#" className="underline hover:text-texto-secundario">
            Términos de servicio
          </a>{" "}
          y{" "}
          <a href="#" className="underline hover:text-texto-secundario">
            Política de privacidad
          </a>
          .
        </p>

        <div className="text-center pt-2">
          <Link
            href="/auth/login"
            className="text-sm font-semibold text-texto hover:text-accion transition-colors"
          >
            ¿Ya tienes cuenta?{" "}
            <span className="underline decoration-1 underline-offset-4 font-bold text-accion">
              Inicia sesión
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}

