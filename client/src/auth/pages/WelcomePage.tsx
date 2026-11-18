import Image from "@/shared/components/Image";
import Link from "@/shared/components/Link";
import SocialSignInButtons from "@/auth/components/SocialSignInButtons";

export default function HomePage() {
  return (
    <div className="min-h-screen w-full bg-fondo flex flex-col justify-between overflow-x-hidden select-none">
      {/* Cabecera con imagen hero y degradado inferior */}
      <header className="relative w-full overflow-hidden shrink-0">
        <div className="relative w-full h-[450px]">
          <Image
            src="/hero.jpg"
            alt="Jóvenes voluntarios de Súmate"
            fill
            priority
            className="object-cover object-bottom"
            style={{
              maskImage:
                "linear-gradient(to bottom, black 80%, transparent 100%)",
              WebkitMaskImage:
                "linear-gradient(to bottom, black 82%, transparent 100%)",
            }}
          />
          {/* Título de la marca superpuesto */}
          <div className="absolute top-14 left-0 right-0 flex items-center justify-center gap-2.5 z-10">
            <Image
              src="/assets/icons/white-app-icon.webp"
              alt="Logo Súmate"
              width={46}
              height={46}
              priority
              unoptimized
              className="w-[46px] h-[46px] object-contain shrink-0"
            />
            <span className="text-[34px] font-extrabold text-sobre-accion tracking-tight lowercase">
              súmate
            </span>
          </div>
        </div>
      </header>

      {/* Contenido principal con titular y acciones */}
      <main className="flex-1 flex flex-col justify-between px-6 pt-2 pb-8 bg-fondo relative z-20 w-full">
        {/* Titular */}
        <section className="text-center my-3">
          <h1 className="text-[27px] leading-tight font-extrabold text-texto tracking-tight">
            La plataforma de <br />
            <span className="text-accion">voluntariados</span>
            <span className="text-texto">.</span>
          </h1>
        </section>

        {/* Botones de acción */}
        <section className="flex flex-col gap-3.5 mt-2 w-full">
          {/* Continuar con Google */}
          <SocialSignInButtons />

          {/* Continuar con correo electrónico */}
          <Link
            href="/auth/login"
            className="w-full h-[52px] bg-accion hover:bg-accion-hover rounded-full flex items-center justify-center text-sobre-accion font-semibold text-[15px] shadow-sm shadow-accion/20 active:scale-[0.98] transition"
          >
            Continuar con correo electrónico
          </Link>

          {/* Separador */}
          <div className="relative flex items-center justify-center my-1">
            <div className="border-t border-borde w-full absolute" />
            <span className="bg-fondo px-3 text-xs font-semibold text-texto-tenue relative z-10">
              o
            </span>
          </div>

          {/* Regístrate con correo electrónico */}
          <Link
            href="/auth/signup"
            className="w-full h-[52px] bg-accion-suave hover:bg-accion-suave-hover text-texto rounded-full flex items-center justify-center font-semibold text-[15px] active:scale-[0.98] transition"
          >
            Regístrate con correo electrónico
          </Link>
        </section>

        {/* Enlace inferior */}
        <footer className="mt-5 text-center">
          <Link
            href="/auth/login"
            className="text-[14px] font-semibold text-texto underline underline-offset-4 decoration-1 decoration-texto hover:text-accion hover:decoration-accion transition"
          >
            Inicia sesión con correo electrónico
          </Link>
        </footer>
      </main>
    </div>
  );
}

