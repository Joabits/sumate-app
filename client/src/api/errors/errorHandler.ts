import type { ZodIssue } from "zod";
import { showErrorList } from "@/shared/components/Toast";


type ValidationErrors = Record<string, string[] | undefined>;

type ApiErrorLike = {
  errors: string[];
  validationErrors?: ValidationErrors;
};

type ErrorHandlerOptions = {
  title?: string;
};

export function handleZodErrors(
  result: { success: boolean; error?: { issues: ZodIssue[] } },
  options?: ErrorHandlerOptions,
) {
  if (result.success) {
    return;
  }

  const firstMessage = (result.error?.issues ?? []).map((issue) => issue.message)[0];
  showErrorList(firstMessage ? [firstMessage] : undefined, options);
}

export function handleValidationErrors(
  validationErrors: ValidationErrors,
  options?: ErrorHandlerOptions,
) {
  const firstMessage = Object.values(validationErrors)
    .flatMap((items) => items ?? [])
    .find((message) => Boolean(message));

  showErrorList(firstMessage ? [firstMessage] : undefined, options);
}

export function handleApiResultError(result: ApiErrorLike, options?: ErrorHandlerOptions) {
  if (result.validationErrors && Object.keys(result.validationErrors).length > 0) {
    handleValidationErrors(result.validationErrors, options);
    return;
  }

  showErrorList(result.errors?.[0] ? [result.errors[0]] : undefined, options);
}
