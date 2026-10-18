"use client";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import type { ReactNode } from "react";

export type AppAlertDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  cancelText?: string;
  actionText?: string;
  onAction: () => void;
  actionDisabled?: boolean;
  icon?: ReactNode;
  variant?: "destructive" | "default";
};

export function AppAlertDialog({
  open,
  onOpenChange,
  title,
  description,
  cancelText = "Cancelar",
  actionText = "Confirmar",
  onAction,
  actionDisabled = false,
  icon,
  variant = "destructive",
}: AppAlertDialogProps) {
  const isDestructive = variant === "destructive";

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="rounded-3xl p-6 sm:p-7 max-w-sm sm:max-w-md">
        <AlertDialogHeader>
          {icon ? (
            icon
          ) : isDestructive ? (
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-100 text-rose-600 mb-1">
              <Trash2 className="h-7 w-7" />
            </div>
          ) : null}
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description ? (
            <AlertDialogDescription>{description}</AlertDialogDescription>
          ) : null}
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-4">
          <AlertDialogCancel
            disabled={actionDisabled}
            className="w-full h-11 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 border-none shadow-none font-medium cursor-pointer"
          >
            {cancelText}
          </AlertDialogCancel>
          <Button
            type="button"
            disabled={actionDisabled}
            onClick={onAction}
            className={`w-full h-11 rounded-xl font-semibold shadow-xs cursor-pointer ${
              isDestructive
                ? "bg-rose-600 hover:bg-rose-700 text-white"
                : "bg-[#6355de] hover:bg-[#5244cc] text-white"
            }`}
          >
            {actionText}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
