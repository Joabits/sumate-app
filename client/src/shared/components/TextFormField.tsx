import { ComponentProps, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

type TextFormFieldProps = {
  id: string;
  name: string;
  label: string;
  placeholder: string;
  type?: "text" | "email" | "password" | "datetime-local" | string;
  description?: string;
  autoComplete?: string;
  required?: boolean;
} & Omit<ComponentProps<"input">, "type">;

export default function TextFormField({
  id,
  name,
  label,
  placeholder,
  type,
  description,
  autoComplete,
  required = true,
  className,
  ...props
}: TextFormFieldProps) {
  const [showPassword, setShowPassword] = useState(false);
  const isPasswordType = type === "password";
  const inputType = isPasswordType && showPassword ? "text" : type;

  return (
    <div className="space-y-2 w-full text-left">
      <label htmlFor={id} className="block text-[15px] font-bold text-texto">
        {label}
      </label>
      <div className="relative flex items-center">
        <input
          id={id}
          name={name}
          type={inputType}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required={required}
          className={cn(
            "w-full px-4 py-3.5 bg-fondo border border-borde rounded-2xl text-texto placeholder:text-texto-tenue text-base font-medium transition duration-200 focus:border-accion focus:ring-2 focus:ring-accion/10 outline-none",
            isPasswordType && "pr-12",
            className
          )}
          {...props}
        />
        {isPasswordType && (
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
            className="absolute right-3.5 p-1.5 text-texto-tenue hover:text-texto-secundario transition-colors focus:outline-none cursor-pointer"
          >
            {showPassword ? (
              <EyeOff className="w-5 h-5" />
            ) : (
              <Eye className="w-5 h-5" />
            )}
          </button>
        )}
      </div>
      {description ? (
        <p className="text-xs text-texto-tenue pl-1 leading-relaxed">{description}</p>
      ) : null}
    </div>
  );
}
