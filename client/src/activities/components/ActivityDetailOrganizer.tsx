import Image from "@/shared/components/Image";
import { useActivityDetail } from "@/activities/hooks/useActivityDetail";

export function ActivityDetailOrganizer() {
  const { activity } = useActivityDetail();
  const name = activity.creatorName || "Organizador";
  const initial = name.charAt(0).toUpperCase();
  const creatorImage = activity.creatorImage;

  return (
    <section
      className="mt-6 pt-5 border-t border-slate-100"
      data-purpose="event-organizer-section"
    >
      <h3 className="text-xs font-semibold tracking-wider text-slate-500 uppercase mb-3">
        Organizado por
      </h3>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {creatorImage ? (
            <div className="w-11 h-11 rounded-full overflow-hidden border-2 border-indigo-50 bg-slate-100 shrink-0">
              <Image
                src={creatorImage}
                alt={name}
                width={44}
                height={44}
                unoptimized
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="w-11 h-11 rounded-full bg-indigo-50 border-2 border-indigo-100 flex items-center justify-center text-[#6355de] font-bold text-sm shrink-0">
              {initial}
            </div>
          )}
          <div>
            <h4 className="text-sm font-semibold text-slate-900 leading-snug">
              {name}
            </h4>
            <p className="text-xs text-[#6355de] font-medium">
              Coordinador de la actividad
            </p>
          </div>
        </div>
        <span className="text-[11px] font-medium bg-indigo-50 text-[#6355de] px-2.5 py-1 rounded-full">
          Verificado
        </span>
      </div>
    </section>
  );
}
