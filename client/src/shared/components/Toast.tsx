import { sileo } from "sileo";
import { CircleCheck, CircleAlert, TriangleAlert, Info } from "lucide-react";

const DEFAULT_ERROR_MESSAGE = "Ocurrió un error inesperado";
const DEFAULT_ERROR_TITLE = "Error";

const TOAST_FILL = "#ffffff";
const TOAST_ROUNDNESS = 18;
const TOAST_STYLES = {
  title: "font-semibold text-sm tracking-tight text-neutral-900",
  description: "text-xs text-neutral-600 leading-relaxed",
};

type ErrorToastOptions = {
  title?: string;
};

export function showErrorList(
  messages?: string[],
  options?: ErrorToastOptions,
) {
  const renderErrorToast = (message: string) => {
    sileo.error({
      title: options?.title ?? DEFAULT_ERROR_TITLE,
      description: message,
      icon: <CircleAlert className="text-destructive size-4 stroke-[2.25]" />,
      fill: TOAST_FILL,
      roundness: TOAST_ROUNDNESS,
      styles: TOAST_STYLES,
    });
  };

  if (!messages || messages.length === 0) {
    renderErrorToast(DEFAULT_ERROR_MESSAGE);
    return;
  }

  const uniqueMessages = [...new Set(messages.filter(Boolean))];
  uniqueMessages.forEach((message) => renderErrorToast(message));
}

export const appToast = {
  success: (title: string, description?: string) =>
    sileo.success({
      title,
      description: description || undefined,
      icon: <CircleCheck className="text-emerald-600 size-4 stroke-[2.25]" />,
      fill: TOAST_FILL,
      roundness: TOAST_ROUNDNESS,
      styles: TOAST_STYLES,
    }),
  error: (title: string, message?: string) =>
    sileo.error({
      title: message ? title : DEFAULT_ERROR_TITLE,
      description: message ?? title,
      icon: <CircleAlert className="text-destructive size-4 stroke-[2.25]" />,
      fill: TOAST_FILL,
      roundness: TOAST_ROUNDNESS,
      styles: TOAST_STYLES,
    }),
  info: (title: string, description?: string) =>
    sileo.info({
      title,
      description: description || undefined,
      icon: <Info className="text-[#6355de] size-4 stroke-[2.25]" />,
      fill: TOAST_FILL,
      roundness: TOAST_ROUNDNESS,
      styles: TOAST_STYLES,
    }),
  warning: (title: string, description?: string) =>
    sileo.warning({
      title,
      description: description || undefined,
      icon: <TriangleAlert className="text-amber-500 size-4 stroke-[2.25]" />,
      fill: TOAST_FILL,
      roundness: TOAST_ROUNDNESS,
      styles: TOAST_STYLES,
    }),
};

