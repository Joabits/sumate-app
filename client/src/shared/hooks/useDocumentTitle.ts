import { useEffect } from "react";

const DEFAULT_TITLE = "Súmate - Voluntariado y Causas Solidarias";

/** Cambia el título de la pestaña mientras la página está abierta. */
export function useDocumentTitle(title: string | undefined) {
  useEffect(() => {
    document.title = title ?? DEFAULT_TITLE;
    return () => {
      document.title = DEFAULT_TITLE;
    };
  }, [title]);
}
