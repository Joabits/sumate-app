import { Pencil } from "lucide-react";
import { InlineEditForm } from "./InlineEditForm";
import { useActivities } from "@/activities/hooks/useActivities";
import { useActivityDetail } from "@/activities/hooks/useActivityDetail";

type ActivityDetailTitleProps = {
  className?: string;
};

export function ActivityDetailTitle({
  className = "",
}: ActivityDetailTitleProps) {
  const { activity, isEditMode, activeField, setActiveField } = useActivityDetail();
  const { id: activityId, name, isOwner } = activity;
  const { updateTitle } = useActivities();

  const isOtherFieldActive = (field: string) =>
    activeField !== null && activeField !== field;

  return (
    <div className={`mb-4 sm:mb-6 ${className}`} data-purpose="event-title-section">
      {activeField === "title" ? (
        <InlineEditForm
          initialValue={name}
          save={(value) => updateTitle(activityId, value)}
          successMessage="Título actualizado."
          errorTitle="Error al actualizar título"
          onClose={() => setActiveField(null)}
        >
          {(value, setValue) => (
            <input
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="w-full text-xl font-bold text-texto bg-fondo border border-borde-fuerte rounded-xl px-3 py-2 focus:ring-2 focus:ring-accion focus:outline-none"
              placeholder="Nombre de la actividad"
              autoFocus
            />
          )}
        </InlineEditForm>
      ) : (
        <div>
          <h1 className="text-2xl sm:text-[1.65rem] lg:text-3xl font-extrabold text-texto leading-snug tracking-tight">
            {name}
            {isOwner && isEditMode && (
              <button
                type="button"
                onClick={() => setActiveField("title")}
                disabled={isOtherFieldActive("title")}
                title="Editar título"
                aria-label="Editar título"
                className={`inline-flex items-center justify-center align-middle ml-2.5 p-1.5 rounded-full transition-all cursor-pointer ${
                  isOtherFieldActive("title")
                    ? "opacity-30 cursor-not-allowed text-texto-deshabilitado"
                    : "text-texto-tenue hover:text-accion hover:bg-superficie-alta"
                }`}
              >
                <Pencil className="w-4 h-4" />
              </button>
            )}
          </h1>
        </div>
      )}
    </div>
  );
}
