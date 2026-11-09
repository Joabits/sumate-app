import type { ReactNode } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import SubmitButton from "./SubmitButton";

const dialogSizeClass = {
  sm: "sm:max-w-sm",
  md: "sm:max-w-md",
  lg: "sm:max-w-xl",
  xl: "sm:max-w-2xl",
  full: "sm:max-w-4xl",
} as const;

export type AppDialogSize = keyof typeof dialogSizeClass;

export type AppDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  size?: AppDialogSize;
  className?: string;
  bodyClassName?: string;
  showCloseButton?: boolean;
};

export function AppDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  size = "md",
  className,
  bodyClassName,
  showCloseButton = false,
}: AppDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={showCloseButton}
        onPointerDownOutside={(event) => event.preventDefault()}
        onInteractOutside={(event) => event.preventDefault()}
        onEscapeKeyDown={(event) => event.preventDefault()}
        className={cn(
          "max-w-[calc(100%-2rem)] rounded-2xl bg-popover p-0 text-popover-foreground",
          dialogSizeClass[size],
          className,
        )}
      >
        <div className="border-b border-border px-6 pb-5 pt-7">
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-2xl font-bold text-foreground">
              {title}
            </DialogTitle>
            {description ? (
              <DialogDescription className="text-sm text-muted-foreground">
                {description}
              </DialogDescription>
            ) : null}
          </DialogHeader>
        </div>
        <div className={cn("px-6 py-6", bodyClassName)}>{children}</div>
      </DialogContent>
    </Dialog>
  );
}

export type AppDialogFormActionsProps = {
  submitText?: string;
  submitPendingText?: string;
  onCancel: () => void;
  className?: string;
};

export function AppDialogFormActions({
  submitText = "Confirmar",
  submitPendingText = "Confirmando...",
  onCancel,
  className,
}: AppDialogFormActionsProps) {
  return (
    <div
      className={cn(
        "mt-6 flex w-full flex-col gap-3 sm:flex-row-reverse sm:justify-start",
        className
      )}
    >
      <SubmitButton
        text={submitText}
        pendingText={submitPendingText}
        className="w-full sm:w-auto"
      />
      <Button
        variant="secondary"
        type="button"
        className="mt-0 w-full sm:mt-0 sm:w-auto"
        onClick={onCancel}
      >
        Cancelar
      </Button>
    </div>
  );
}
