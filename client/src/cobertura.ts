/**
 * Solo cuando la app corre instrumentada (COBERTURA=1, ver vite.config.mts):
 * cada página manda al servidor lo que ejecutó, una vez por segundo y al
 * salir. Así se mide la cobertura de todas las E2E, incluso las que abren
 * varias sesiones a la vez. Sin instrumentar, este archivo no hace nada.
 */
if (import.meta.env.VITE_COBERTURA === "1") {
  const pagina = crypto.randomUUID();
  // Se lee en cada envío: los módulos instrumentados se cargan después de este
  const enviar = () => {
    const cobertura = (window as unknown as { __coverage__?: unknown }).__coverage__;
    // fetch y no sendBeacon: la cobertura pesa más que los 64 KB que admite un beacon
    if (cobertura) {
      void fetch("/__cobertura", { method: "POST", body: JSON.stringify({ pagina, cobertura }) }).catch(() => {});
    }
  };
  setInterval(enviar, 1000);
  addEventListener("pagehide", enviar);
}

export {};
