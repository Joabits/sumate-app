"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export type AppSheetSize = "sm" | "md" | "lg" | "xl" | "full" | "auto";
export type AppSheetSide = "top" | "bottom" | "left" | "right";

export type AppSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  children: ReactNode;
  side?: AppSheetSide;
  width?: AppSheetSize;
  height?: AppSheetSize;
  className?: string;
  bodyClassName?: string;
  preventCloseOnOutsideClick?: boolean;
  showCloseButton?: boolean;
  showDivider?: boolean;
  autoFocusInput?: boolean;
  showHeader?: boolean;
};

const DESKTOP_QUERY = "(min-width: 1024px)";

function subscribeToDesktop(onChange: () => void) {
  const mediaQuery = window.matchMedia(DESKTOP_QUERY);
  mediaQuery.addEventListener("change", onChange);
  return () => mediaQuery.removeEventListener("change", onChange);
}

export function AppSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  side,
  width,
  height,
  className,
  bodyClassName,
  preventCloseOnOutsideClick = false,
  showCloseButton = false,
  showDivider = false,
  autoFocusInput = false,
  showHeader = true,
}: AppSheetProps) {
  // Detección reactiva de escritorio (>= 1024px)
  const isDesktop = useSyncExternalStore(
    subscribeToDesktop,
    () => window.matchMedia(DESKTOP_QUERY).matches,
    () => false,
  );

  // En móvil/tablet es bottom sheet por defecto; en desktop es side right sheet
  const resolvedSide: AppSheetSide = side ? side : isDesktop ? "right" : "bottom";

  const getDimensionsClass = () => {
    if (resolvedSide === "right" || resolvedSide === "left") {
      const resolvedWidth = width || (isDesktop ? "xl" : "md");
      const baseWidth = {
        sm: "w-full sm:max-w-sm",
        md: "w-full sm:max-w-md",
        lg: "w-full sm:max-w-lg",
        xl: "w-full lg:max-w-2xl xl:max-w-2xl",
        full: "w-full sm:max-w-full",
        auto: "w-auto",
      }[resolvedWidth];

      return cn(baseWidth, "h-full max-h-screen");
    }

    // Viene de arriba o abajo (móviles/tablets)
    const resolvedWidth = width || "full";
    const baseWidth = {
      sm: "w-full sm:max-w-sm",
      md: "w-full sm:max-w-md",
      lg: "w-full sm:max-w-lg",
      xl: "w-full sm:max-w-xl",
      full: "w-full sm:max-w-full",
      auto: "w-auto",
    }[resolvedWidth];

    const centerHorizontally = resolvedWidth !== "full" ? "mx-auto" : "";

    const resolvedHeight = height || "auto";
    const baseHeight = {
      sm: "h-full max-h-[33vh]",
      md: "h-full max-h-[50vh]",
      lg: "h-full max-h-[75vh]",
      xl: "h-full max-h-[90vh]",
      full: "h-full max-h-screen",
      auto: "h-auto",
    }[resolvedHeight];

    return cn(baseWidth, centerHorizontally, baseHeight);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={resolvedSide}
        showCloseButton={showCloseButton || resolvedSide === "right"}
        onOpenAutoFocus={
          autoFocusInput ? undefined : (e) => e.preventDefault()
        }
        onPointerDownOutside={
          preventCloseOnOutsideClick ? (e) => e.preventDefault() : undefined
        }
        onInteractOutside={
          preventCloseOnOutsideClick ? (e) => e.preventDefault() : undefined
        }
        className={cn(
          "flex flex-col bg-white p-0 text-popover-foreground shadow-2xl",
          getDimensionsClass(),
          resolvedSide === "top" && "rounded-b-3xl",
          resolvedSide === "bottom" && "rounded-t-3xl",
          resolvedSide === "right" && "border-l border-slate-100",
          className
        )}
      >
        {/* Handle pill únicamente para bottom sheet en móvil */}
        {resolvedSide === "bottom" && (
          <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mt-3 mb-1 shrink-0" />
        )}

        {showHeader && title ? (
          <div
            className={cn(
              "px-6 lg:px-8 pt-6 pb-2",
              showDivider && "border-b border-slate-100"
            )}
          >
            <SheetHeader className="p-0 space-y-1 text-left pr-10">
              <SheetTitle className="text-xl lg:text-2xl font-bold text-slate-900 tracking-tight">
                {title}
              </SheetTitle>
              {description ? (
                <SheetDescription className="text-xs lg:text-sm text-slate-500 font-normal">
                  {description}
                </SheetDescription>
              ) : null}
            </SheetHeader>
          </div>
        ) : (
          <SheetHeader className="sr-only">
            <SheetTitle>{title || "Diálogo"}</SheetTitle>
            {description ? <SheetDescription>{description}</SheetDescription> : null}
          </SheetHeader>
        )}
        
        {/* Cuerpo del sheet con scroll interno */}
        <div className={cn("px-6 lg:px-8 py-5 flex-1 overflow-y-auto no-scrollbar", bodyClassName)}>
          {children}
        </div>
      </SheetContent>
    </Sheet>
  );
}
