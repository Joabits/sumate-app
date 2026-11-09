import type { AnchorHTMLAttributes } from "react";
import { Link as RouterLink } from "react-router";

type LinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  href: string;
  replace?: boolean;
};

/**
 * Enlace de la app. Las rutas internas ("/explore") navegan con React Router
 * sin recargar la página; las externas ("https://...") son un <a> normal.
 */
export default function Link({ href, replace, ...props }: LinkProps) {
  if (/^(https?:|mailto:|tel:)/.test(href)) {
    return <a href={href} {...props} />;
  }
  return <RouterLink to={href} replace={replace} {...props} />;
}
