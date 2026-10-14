"use client";

import { useRef } from "react";
import { cn } from "@/lib/utils";
import TextFormField from "@/features/shared/presentation/components/forms/text-form-field";
import { authClient } from "@/lib/auth-client";
import { appToast } from "@/features/shared/presentation/components/notifications/toast";
import { getAuthErrorMessage } from "@/lib/auth-errors";
import SubmitButton from "@/features/shared/presentation/components/custom-buttons/submit-button";

export function ForgotPasswordForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = async (formData: FormData) => {
    const email = formData.get("email") as string;

    await authClient.requestPasswordReset(
      {
        email,
        /**
         * URL de la página donde el usuario podrá ingresar su nueva contraseña.
         * Better Auth añade automáticamente el ?token=... a esta URL.
         */
        redirectTo: "/auth/reset-password",
      },
      {
        onSuccess: () => {
          formRef.current?.reset();
          /**
           * Por seguridad, siempre mostramos el mismo mensaje de éxito
           * independientemente de si el email existe o no en la base de datos.
           * Esto evita que se pueda enumerar usuarios existentes.
           */
          appToast.success(
            "Revisa tu correo para restablecer tu contraseña.",
          );
        },
        onError: (ctx) => {
          appToast.error(
            "Error al enviar el correo",
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
        id="email"
        name="email"
        label="Correo electrónico"
        placeholder="ejemplo@correo.com"
        type="email"
        description="Te enviaremos un enlace de recuperación seguro a esta dirección."
        autoComplete="email"
        required
      />

      <div className="pt-2">
        <SubmitButton
          text="Enviar instrucciones"
          pendingText="Enviando..."
          className="w-full py-4 px-6 bg-[#6355DE] hover:bg-[#5244cc] active:scale-[0.99] text-white font-bold text-base rounded-full shadow-md shadow-[#6355DE]/20 transition-all duration-150 h-[52px]"
        />
      </div>
    </form>
  );
}

