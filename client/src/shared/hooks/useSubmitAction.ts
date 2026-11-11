import type { ApiActionResult } from "@/api/apiResults";
import { handleApiResultError } from "@/api/errors/errorHandler";
import { useApiErrorRecovery } from "./useApiErrorRecovery";

type SubmitActionOptions = {
  /** Una función que expone el Provider (ya valida y llama al backend) */
  action: () => Promise<ApiActionResult>;
  onSuccess: () => void;
  errorTitle?: string;
};

/**
 * Para formularios: ejecuta la acción del Provider y, si falla, muestra el
 * primer mensaje en un aviso. Si la sesión expiró, vuelve al inicio de sesión.
 */
export function useSubmitAction() {
  const recoverApiError = useApiErrorRecovery();

  return async function submit({ action, onSuccess, errorTitle }: SubmitActionOptions) {
    let result: ApiActionResult;
    try {
      result = await action();
    } catch {
      handleApiResultError(
        { errors: ["No pudimos completar la operación. Intenta nuevamente."] },
        { title: errorTitle },
      );
      return;
    }

    if (!result.ok) {
      if (await recoverApiError(result)) return;
      handleApiResultError(result, { title: errorTitle });
      return;
    }

    onSuccess();
  };
}
