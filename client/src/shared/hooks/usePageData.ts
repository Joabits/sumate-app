import { useEffect, useState } from "react";

type PageData<T> = {
  data: T | undefined;
  error: Error | null;
  /** true solo en la primera carga; al recargar se siguen mostrando los datos anteriores */
  isLoading: boolean;
};

/**
 * Carga los datos de una página y los vuelve a cargar cada vez que cambia
 * algo de `deps` (por ejemplo dataVersion, después de unirse o publicar).
 */
export function usePageData<T>(load: () => Promise<T>, deps: unknown[]): PageData<T> {
  const [state, setState] = useState<{ data?: T; error: Error | null }>({ error: null });

  useEffect(() => {
    let active = true;
    load().then(
      (data) => active && setState({ data, error: null }),
      (error: unknown) =>
        active &&
        setState((prev) => ({
          data: prev.data,
          error: error instanceof Error ? error : new Error("Ocurrió un error inesperado."),
        })),
    );
    return () => {
      active = false;
    };
    // `load` cambia en cada render; lo que decide cuándo recargar son las deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return {
    data: state.data,
    error: state.data === undefined ? state.error : null,
    isLoading: state.data === undefined && state.error === null,
  };
}
