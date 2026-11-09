import type { CSSProperties, ImgHTMLAttributes } from "react";

type ImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "alt"> & {
  src: string;
  alt: string;
  /** Ocupa todo el contenedor (el padre debe tener position: relative) */
  fill?: boolean;
  /** Imagen importante (portada): se carga primero en vez de esperar al scroll */
  priority?: boolean;
  /** Se aceptan por compatibilidad; el navegador ya ajusta la imagen */
  unoptimized?: boolean;
  quality?: number;
};

const FILL_STYLE: CSSProperties = {
  position: "absolute",
  inset: 0,
  width: "100%",
  height: "100%",
};

/** Imagen de la app: un <img> con carga diferida y la opción `fill`. */
export default function Image({
  fill,
  priority,
  unoptimized: _unoptimized,
  quality: _quality,
  style,
  loading,
  ...props
}: ImageProps) {
  return (
    <img
      {...props}
      loading={loading ?? (priority ? "eager" : "lazy")}
      fetchPriority={priority ? "high" : undefined}
      decoding="async"
      style={fill ? { ...FILL_STYLE, ...style } : style}
    />
  );
}
