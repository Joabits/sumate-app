import Link from "@/shared/components/Link";
import { appToast } from "@/shared/components/Toast";

export default function VerificationPage() {
  const handleResend = () => {
    appToast.info(
      "Por favor revisa tu bandeja de entrada o intenta registrarte nuevamente.",
    );
  };

  return (
    <div className="min-h-screen w-full bg-fondo text-texto flex flex-col justify-between px-7 pt-12 pb-10 relative overflow-hidden selection:bg-accion selection:text-sobre-accion">
      {/* Decorative subtle ambient background accents */}
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-accion-suave rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-accion-suave/70 rounded-full blur-2xl pointer-events-none" />

      {/* MainContentArea */}
      <main className="flex-1 flex flex-col items-center justify-center text-center my-auto z-10 w-full">
        {/* Central Illustrated Icon Badge */}
        <div className="relative mb-8 flex items-center justify-center">
          {/* Outer soft decorative halo */}
          <div className="w-36 h-36 rounded-full bg-accion-suave/60 flex items-center justify-center animate-pulse" />
          {/* Inner solid badge with brand shadow */}
          <div className="absolute w-28 h-28 rounded-full bg-accion-suave flex items-center justify-center shadow-inner border border-accion-borde/50">
            {/* Modern Envelope & Verification SVG */}
            <svg
              aria-hidden="true"
              className="w-14 h-14 text-accion"
              fill="none"
              viewBox="0 0 56 56"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect
                height="30"
                rx="8"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="3.2"
                width="42"
                x="7"
                y="13"
              />
              <path
                d="M9 16L24.8 28.64C26.68 30.14 29.32 30.14 31.2 28.64L47 16"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="3.2"
              />
              <circle cx="41" cy="38" className="fill-accion" r="9" />
              <path
                d="M37 38.2L39.7 40.8L45 35.5"
                className="stroke-sobre-accion"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.3"
              />
            </svg>
          </div>
          <div className="absolute -top-1 right-3 w-3 h-3 rounded-full bg-accion/40" />
          <div className="absolute bottom-2 -left-1 w-2 h-2 rounded-full bg-accion/30" />
        </div>

        {/* Title & Headline */}
        <h1 className="text-[28px] leading-[1.25] font-extrabold text-texto tracking-tight mb-3.5">
          Revisa tu correo
        </h1>

        {/* Descriptive Body Copy */}
        <p className="text-[15px] leading-relaxed text-texto-tenue max-w-[280px] mb-8 font-medium">
          Hemos enviado un enlace de confirmación a tu correo electrónico. Por
          favor, revísalo para continuar.
        </p>

        {/* Resend Notice / Spam Hint */}
        <div className="bg-accion-suave/70 border border-accion-suave rounded-2xl px-4 py-3.5 max-w-[310px]">
          <p className="text-[13px] text-texto-tenue leading-snug">
            ¿No lo recibiste? Revisa tu carpeta de spam o{" "}
            <button
              type="button"
              onClick={handleResend}
              className="text-accion font-bold hover:text-accion-hover transition-colors ml-0.5 underline decoration-accion-borde underline-offset-2 cursor-pointer"
            >
              reenviar correo
            </button>
          </p>
        </div>
      </main>

      {/* FooterActionSection */}
      <footer className="w-full flex flex-col items-center gap-3 pt-6 z-10">
        <Link
          href="/auth/login"
          className="w-full h-[54px] rounded-full bg-accion text-sobre-accion font-bold text-[16px] tracking-wide flex items-center justify-center shadow-lg shadow-accion/25 hover:bg-accion-hover active:scale-[0.98] transition-all text-center focus:outline-none focus:ring-4 focus:ring-accion/20"
        >
          Volver a iniciar sesión
        </Link>
      </footer>
    </div>
  );
}

