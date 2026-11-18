import * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type PrimaryButtonProps = React.ComponentProps<typeof Button>;

/**
 * PrimaryButton — Botón con el color primario de la aplicación.
 * Usa el Button de Shadcn UI con los tokens de la acción principal
 * (styles/tokens.css): bg-accion, text-sobre-accion y hover:bg-accion-hover.
 */
export function PrimaryButton({ className, ...props }: PrimaryButtonProps) {
  return (
    <Button
      className={cn(
        "bg-accion text-sobre-accion hover:bg-accion-hover shadow-sm",
        className
      )}
      {...props}
    />
  );
}

export default PrimaryButton;
