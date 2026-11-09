import {
  submitWithSchema,
  type SubmitWithSchemaOptions,
} from "@/shared/utils/submitWithSchema";
import { useApiErrorRecovery } from "./useApiErrorRecovery";

/**
 * Version cliente de submitWithSchema para formularios que escriben mediante
 * Server Actions. Aplica la recuperacion de sesion por defecto y conserva la
 * posibilidad de que un formulario maneje sus errores de dominio.
 */
export function useSubmitWithSchema() {
  const recoverApiError = useApiErrorRecovery();

  return async function submit<TSchemaData, TSuccessData>(
    options: SubmitWithSchemaOptions<TSchemaData, TSuccessData>,
  ) {
    const { onError, ...submitOptions } = options;

    return submitWithSchema({
      ...submitOptions,
      onError: async (error) => {
        if (await recoverApiError(error)) {
          return true;
        }

        return onError?.(error);
      },
    });
  };
}
