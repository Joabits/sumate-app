import type { ZodType } from "zod";
import { handleApiResultError, handleZodErrors } from "@/api/errors/errorHandler";



type ApiResultLike<TData> =
  | {
      ok: true;
      data?: TData;
    }
  | {
      ok: false;
      statusCode?: number;
      code?: string;
      errors: string[];
      validationErrors?: Record<string, string[] | undefined>;
    };

export type SubmitWithSchemaOptions<TSchemaData, TSuccessData> = {
  schema: ZodType<TSchemaData>;
  payload: unknown;
  action: (data: TSchemaData) => Promise<ApiResultLike<TSuccessData>>;
  onSuccess: (result: { data: TSuccessData | undefined }) => void;
  onError?: (
    error: Extract<ApiResultLike<TSuccessData>, { ok: false }>,
  ) => boolean | void | Promise<boolean | void>;
  errorTitle?: string;
};

export async function submitWithSchema<TSchemaData, TSuccessData>({
  schema,
  payload,
  action,
  onSuccess,
  onError,
  errorTitle,
}: SubmitWithSchemaOptions<TSchemaData, TSuccessData>) {
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    handleZodErrors(parsed, { title: errorTitle });
    return;
  }

  let response: ApiResultLike<TSuccessData>;
  try {
    response = await action(parsed.data);
  } catch {
    handleApiResultError(
      { errors: ["No pudimos completar la operación. Intenta nuevamente."] },
      { title: errorTitle },
    );
    return;
  }

  if (!response.ok) {
    const isHandled = onError ? await onError(response) : false;
    if (!isHandled) {
      handleApiResultError(response, { title: errorTitle });
    }
    return;
  }

  onSuccess({ data: response.data });
}
