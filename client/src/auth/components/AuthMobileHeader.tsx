import { useNavigate } from "react-router";
import { X, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface AuthMobileHeaderProps {
  title?: string;
  icon?: "close" | "back";
  className?: string;
  fallbackHref?: string;
}

export function AuthMobileHeader({
  title = "Súmate",
  icon = "close",
  className,
  fallbackHref = "/",
}: AuthMobileHeaderProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    navigate(fallbackHref || "/", { replace: true });
  };

  const IconComponent = icon === "close" ? X : ArrowLeft;

  return (
    <header
      className={cn(
        "relative flex items-center justify-between pb-6 pt-1 w-full",
        className
      )}
    >
      <button
        type="button"
        onClick={handleBack}
        aria-label="Volver"
        className="p-2 -ml-2 text-zinc-800 hover:text-zinc-600 active:scale-95 transition-transform rounded-full focus:outline-none focus:ring-2 focus:ring-[#6355DE] cursor-pointer"
      >
        <IconComponent className="w-6 h-6 stroke-[2.2]" />
      </button>

      <span className="text-xl font-bold tracking-tight text-zinc-900 absolute left-1/2 -translate-x-1/2 select-none">
        {title}
      </span>

      {/* Placeholder derecho para mantener equilibrio simétrico */}
      <div aria-hidden="true" className="w-8 h-8 pointer-events-none" />
    </header>
  );
}

