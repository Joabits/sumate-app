import * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type PrimaryButtonProps = React.ComponentProps<typeof Button>;

/**
 * PrimaryButton — Botón con el color primario de la aplicación.
 * Utiliza el componente Button de Shadcn UI pero le aplica directamente
 * la clase bg-app-primary y text-app-primary-foreground definidas en el tema.
 */
export function PrimaryButton({ className, ...props }: PrimaryButtonProps) {
  return (
    <Button
      className={cn(
        "bg-app-primary text-app-primary-foreground hover:bg-app-primary/90 shadow-sm",
        className
      )}
      {...props}
    />
  );
}

export default PrimaryButton;
