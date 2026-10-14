"use client";

import { useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import TextFormField from "@/features/shared/presentation/components/forms/text-form-field";
import { authClient } from "@/lib/auth-client";
import { appToast } from "@/features/shared/presentation/components/notifications/toast";
import { getAuthErrorMessage } from "@/lib/auth-errors";
import SubmitButton from "@/features/shared/presentation/components/custom-buttons/submit-button";

export function ResetPasswordForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const router = useRouter();
  const searchParams = useSearchParams();
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

    await authClient.resetPassword(
      {
        newPassword,
        token,
      },
      {
        onSuccess: () => {
          formRef.current?.reset();
          appToast.success(
            "¡Contraseña actualizada!",
          );
          router.push("/auth/login");
        },
        onError: (ctx) => {
          appToast.error(
            "Error al restablecer",
            getAuthErrorMessage(ctx.error.code),
          );
        },
      },
    );
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

