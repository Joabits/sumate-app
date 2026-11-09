import { useEffect } from "react";

/**
 * Registra el service worker (public/sw.js) para que la app se pueda instalar.
 * Solo en producción: en desarrollo guardaría en caché código viejo.
 */
export function PwaRegister() {
  useEffect(() => {
    if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;

    const register = () => {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => registration.update())
        .catch((error) => console.error("[PWA] Error al registrar el Service Worker:", error));
    };

    if (document.readyState === "complete") {
      register();
      return;
    }
    window.addEventListener("load", register, { once: true });
    return () => window.removeEventListener("load", register);
  }, []);

  return null;
}
