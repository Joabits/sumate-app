import { useRef } from "react";
import { useNavigate } from "react-router";
import { cn } from "@/lib/utils";
import TextFormField from "@/shared/components/TextFormField";
import { useAuth } from "@/auth/hooks/useAuth";
import { appToast } from "@/shared/components/Toast";
import SubmitButton from "@/shared/components/SubmitButton";

export function SignupForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const navigate = useNavigate();
  const { signup } = useAuth();
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = async (formData: FormData) => {
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    const result = await signup(name, email, password);
    if (!result.ok) {
      appToast.error("Error al registrarse", result.message);
      return;
    }
    formRef.current?.reset();
    appToast.success("¡Registro exitoso! Por favor verifica tu email.");
    navigate("/auth/verify-email");
  };

  return (
    <form
      ref={formRef}
      action={handleSubmit}
      className={cn("space-y-6 w-full", className)}
      {...props}
    >
      <TextFormField
        id="name"
        name="name"
        label="Nombre completo"
        placeholder="Ej. Ana García"
        type="text"
        description="Tu nombre será visible en tu perfil de voluntario"
        autoComplete="name"
        required
      />

      <TextFormField
        id="email"
        name="email"
        label="Correo electrónico"
        placeholder="ejemplo@correo.com"
        type="email"
        description="Usaremos tu correo para enviarte actualizaciones y verificar tu cuenta"
        autoComplete="email"
        required
      />

      <TextFormField
        id="password"
        name="password"
        label="Contraseña"
        placeholder="Crea una contraseña segura"
        type="password"
        description="Debe tener al menos 8 caracteres"
        minLength={8}
        autoComplete="new-password"
        required
      />

      <div className="pt-2">
        <SubmitButton
          text="Registrarse"
          pendingText="Registrando..."
          className="w-full py-4 px-6 bg-[#6355DE] hover:bg-[#5244cc] active:scale-[0.99] text-white font-bold text-base rounded-full shadow-md shadow-[#6355DE]/20 transition-all duration-150 h-[52px]"
        />
      </div>
    </form>
  );
}

