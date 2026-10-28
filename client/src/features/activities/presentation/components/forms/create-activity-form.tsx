"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { UploadCloud, X } from "lucide-react";
import TextFormField from "@/features/shared/presentation/components/forms/text-form-field";
import { appToast } from "@/features/shared/presentation/components/notifications/toast";
import { SubmitButton } from "@/features/shared/presentation/components/custom-buttons/submit-button";
import { createActivityAction } from "../../actions/activity.action";
import { CreateActivityFormSchema } from "@/features/activities/infrastructure/schemas/activity.schemas";

type CreateActivityFormProps = {
  onSuccess?: () => void;
};

export function CreateActivityForm({ onSuccess }: CreateActivityFormProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleRemoveImage = () => {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (formData: FormData) => {
    if (selectedFile) {
      formData.set("image", selectedFile);
    }

    const payload = {
      name: formData.get("name"),
      date: formData.get("date"),
      capacity: Number(formData.get("capacity")),
      image: selectedFile,
    };

    const parsed = CreateActivityFormSchema.safeParse(payload);
    if (!parsed.success) {
      appToast.error(
        "Datos inválidos",
        parsed.error.issues[0]?.message || "Por favor verifica los campos de la actividad."
      );
      return;
    }

    // El input da la hora local sin zona; se envía en UTC igual que al editar la fecha
    formData.set("date", new Date(parsed.data.date).toISOString());

    const result = await createActivityAction(formData);

    if (!result.ok) {
      appToast.error(
        "Error al crear actividad",
        result.errors?.[0] || "No se pudo registrar la actividad."
      );
      return;
    }

    appToast.success("¡Actividad creada exitosamente!");
    handleRemoveImage();
    formRef.current?.reset();
    onSuccess?.();
  };

  return (
    <form ref={formRef} action={handleSubmit} className="space-y-5 text-left">
      {/* Slot de selección y previsualización de imagen */}
      <div className="space-y-2">
        <label className="block text-[15px] font-bold text-zinc-900">
          Imagen de la actividad
        </label>

        {previewUrl ? (
          <div className="relative w-full h-44 rounded-2xl overflow-hidden border border-zinc-200 bg-zinc-50 group">
            <Image
              src={previewUrl}
              alt="Previsualización de la actividad"
              fill
              unoptimized
              className="object-cover"
            />
            <button
              type="button"
              onClick={handleRemoveImage}
              aria-label="Eliminar imagen seleccionada"
              className="absolute top-3 right-3 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-zinc-300 rounded-2xl bg-zinc-50 hover:bg-zinc-100/70 transition-colors cursor-pointer px-4 text-center group"
          >
            <div className="w-12 h-12 rounded-full bg-[#6355DE]/10 text-[#6355DE] flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
              <UploadCloud className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-zinc-800">
              Toca para subir una fotografía
            </p>
            <p className="text-xs text-zinc-400 mt-0.5">
              PNG, JPG o WEBP (máx. 2MB)
            </p>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {/* Nombre de la actividad */}
      <TextFormField
        id="name"
        name="name"
        label="Nombre de la actividad"
        placeholder="Ej. Reforestación Comunitaria"
        required
      />

      {/* Fecha de realización y Cantidad de cupos en la misma fila */}
      <div className="grid grid-cols-2 gap-3">
        <TextFormField
          id="date"
          name="date"
          label="Fecha de realización"
          placeholder="Selecciona fecha y hora"
          type="datetime-local"
          required
        />

        <TextFormField
          id="capacity"
          name="capacity"
          label="Cantidad de cupos"
          placeholder="Ej. 10"
          type="number"
          min={1}
          max={10000}
          defaultValue="10"
          required
        />
      </div>

      {/* Botón de acción */}
      <div className="pt-2">
        <SubmitButton
          text="Registrar actividad"
          pendingText="Registrando actividad..."
          className="w-full py-3.5 px-4 rounded-2xl bg-[#6355DE] hover:bg-[#5243CE] text-white font-bold text-base shadow-lg shadow-[#6355DE]/25 active:scale-[0.99] transition duration-200 cursor-pointer"
        />
      </div>
    </form>
  );
}
