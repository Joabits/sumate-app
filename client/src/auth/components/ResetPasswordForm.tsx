import { useRef } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { cn } from "@/lib/utils";
import TextFormField from "@/shared/components/TextFormField";
import { useAuth } from "@/auth/hooks/useAuth";
import { appToast } from "@/shared/components/Toast";
import SubmitButton from "@/shared/components/SubmitButton";

export function ResetPasswordForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const navigate = useNavigate();
  const { resetPassword } = useAuth();
  const [searchParams] = useSearchParams();
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = async (formData: FormData) => {
    const newPassword = formData.get("newPassword") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (newPassword !== confirmPassword) {
      appToast.error("Error", "Las contraseñas no coinciden.");
      return;
    }

    /**
     * Better Auth envía el token en la URL como query param ?token=...
     * cuando el usuario hace clic en el enlace del correo.
     */
    const token = searchParams.get("token");

    if (!token) {
      appToast.error(
        "Enlace inválido",
        "El enlace de recuperación no es válido o ha expirado.",
      );
      return;
    }

    const result = await resetPassword(token, newPassword);
    if (!result.ok) {
      appToast.error("Error al restablecer", result.message);
      return;
    }
    formRef.current?.reset();
    appToast.success("¡Contraseña actualizada!");
    navigate("/auth/login");
  };

  return (
    <form
      ref={formRef}
      action={handleSubmit}
      className={cn("space-y-6 w-full", className)}
      {...props}
    >
      <TextFormField
        id="newPassword"
        name="newPassword"
        label="Nueva contraseña"
        placeholder="Escribe tu nueva contraseña"
        type="password"
        description="Debe tener al menos 8 caracteres."
        minLength={8}
        autoComplete="new-password"
        required
      />

      <TextFormField
        id="confirmPassword"
        name="confirmPassword"
        label="Confirmar contraseña"
        placeholder="Confirma tu nueva contraseña"
        type="password"
        description="Ambas contraseñas deben coincidir."
        minLength={8}
        autoComplete="new-password"
        required
      />

      <div className="pt-2">
        <SubmitButton
          text="Guardar contraseña"
          pendingText="Guardando contraseña..."
          className="w-full py-4 px-6 bg-[#6355DE] hover:bg-[#5244cc] active:scale-[0.99] text-white font-bold text-base rounded-full shadow-md shadow-[#6355DE]/20 transition-all duration-150 h-[52px]"
        />
      </div>
    </form>
  );
}

