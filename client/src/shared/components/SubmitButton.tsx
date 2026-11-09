import * as React from "react";
import { useFormStatus } from "react-dom";
import { PrimaryButton } from "./PrimaryButton";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

export type SubmitButtonProps = Omit<React.ComponentProps<typeof PrimaryButton>, "children"> & {
  text?: string;
  pendingText?: string;
  loading?: boolean;
  icon?: React.ReactNode | React.ComponentType<{ className?: string }>;
  iconPosition?: "left" | "right";
  children?: React.ReactNode;
};

/**
 * SubmitButton — Botón de envío universal para formularios con el aspecto visual de PrimaryButton.
 * Escucha automáticamente el estado del formulario con useFormStatus o permite sobreescritura
 * con loading manual. Soporta iconos opcionales (elemento JSX o componente), posicionamiento
 * a la izquierda o derecha, spinner de carga automático y modo solo icono.
 */
export function SubmitButton({
  text,
  pendingText = "Guardando...",
  loading,
  icon,
  iconPosition = "left",
  className,
  disabled,
  children,
  ...props
}: SubmitButtonProps) {
  const { pending: formPending } = useFormStatus();
  const isPending = loading !== undefined ? loading : formPending;
  const hasContent = Boolean(text || children);

  const renderedIcon = React.useMemo(() => {
    if (!icon) return null;
    if (React.isValidElement(icon)) {
      return (
        <span
          data-icon={iconPosition === "right" ? "inline-end" : "inline-start"}
          className="shrink-0 flex items-center justify-center"
        >
          {icon}
        </span>
      );
    }
    if (typeof icon === "function") {
      const IconComponent = icon as React.ComponentType<{ className?: string }>;
      return (
        <span
          data-icon={iconPosition === "right" ? "inline-end" : "inline-start"}
          className="shrink-0 flex items-center justify-center"
        >
          <IconComponent className="size-4 shrink-0" />
        </span>
      );
    }
    return (
      <span
        data-icon={iconPosition === "right" ? "inline-end" : "inline-start"}
        className="shrink-0 flex items-center justify-center"
      >
        {icon as React.ReactNode}
      </span>
    );
  }, [icon, iconPosition]);

  return (
    <PrimaryButton
      type="submit"
      disabled={disabled || isPending}
      className={cn(
        "flex items-center justify-center gap-2 font-semibold transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-60",
        className
      )}
      {...props}
    >
      {isPending ? (
        <>
          <Spinner className="size-4 text-current shrink-0" />
          {hasContent && pendingText && <span>{pendingText}</span>}
        </>
      ) : (
        <>
          {iconPosition === "left" && renderedIcon}
          {text ? <span>{text}</span> : children}
          {iconPosition === "right" && renderedIcon}
        </>
      )}
    </PrimaryButton>
  );
}

export default SubmitButton;
