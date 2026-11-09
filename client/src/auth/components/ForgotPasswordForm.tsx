import { useRef } from "react";
import { cn } from "@/lib/utils";
import TextFormField from "@/shared/components/TextFormField";
import { useAuth } from "@/auth/hooks/useAuth";
import { appToast } from "@/shared/components/Toast";
import SubmitButton from "@/shared/components/SubmitButton";

export function ForgotPasswordForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const { requestPasswordReset } = useAuth();
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = async (formData: FormData) => {
    const email = formData.get("email") as string;

    const result = await requestPasswordReset(email);
    if (!result.ok) {
      appToast.error("Error al enviar el correo", result.message);
      return;
    }
    formRef.current?.reset();
    // Siempre el mismo mensaje, exista o no el correo: así no se pueden adivinar cuentas
    appToast.success("Revisa tu correo para restablecer tu contraseña.");
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

