import { useRef } from "react";
import { useNavigate } from "react-router";
import Link from "@/shared/components/Link";
import { cn } from "@/lib/utils";
import TextFormField from "@/shared/components/TextFormField";
import { useAuth } from "@/auth/hooks/useAuth";
import { appToast } from "@/shared/components/Toast";
import SubmitButton from "@/shared/components/SubmitButton";

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const navigate = useNavigate();
  const { login } = useAuth();
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = async (formData: FormData) => {
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    const result = await login(email, password);
    if (!result.ok) {
      appToast.error("Error al iniciar sesión", result.message);
      return;
    }
    formRef.current?.reset();
    appToast.success("¡Bienvenido de vuelta!");
    navigate("/home");
  };

  return (
    <form
      ref={formRef}
      action={handleSubmit}
      className={cn("space-y-6 w-full", className)}
      {...props}
    >
      <TextFormField
        id="email"
        name="email"
        label="Correo electrónico"
        placeholder="ejemplo@correo.com"
        type="email"
        autoComplete="email"
        required
      />

      <div className="space-y-1.5">
        <TextFormField
          id="password"
          name="password"
          label="Contraseña"
          placeholder="Tu contraseña"
          type="password"
          autoComplete="current-password"
          required
        />
        <div className="flex justify-end pt-0.5">
          <Link
            href="/auth/forgot-password"
            className="text-xs font-semibold text-[#6355DE] hover:underline"
          >
            ¿Olvidaste tu contraseña?
          </Link>
        </div>
      </div>

      <div className="pt-2">
        <SubmitButton
          text="Iniciar sesión"
          pendingText="Iniciando sesión..."
          className="w-full py-4 px-6 bg-[#6355DE] hover:bg-[#5244cc] active:scale-[0.99] text-white font-bold text-base rounded-full shadow-md shadow-[#6355DE]/20 transition-all duration-150 h-[52px]"
        />
      </div>
    </form>
  );
}
