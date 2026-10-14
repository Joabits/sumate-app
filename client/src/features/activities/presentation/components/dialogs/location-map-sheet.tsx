"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Image from "next/image";
import { Loader2, LocateFixed, X } from "lucide-react";
import "leaflet/dist/leaflet.css";
import { Button } from "@/components/ui/button";
import type { ActivityDetailData } from "@/features/activities/domain/entities/activity.entity";
import { appToast } from "@/features/shared/presentation/components/notifications/toast";
import { updateActivityLocationAction } from "../../actions/activity.action";

type LocationMapSheetProps = {
  activity: ActivityDetailData;
  isOpen: boolean;
  onClose: () => void;
};

// Coordenadas por defecto (Cochabamba, Bolivia)
const DEFAULT_LAT = -17.3895;
const DEFAULT_LNG = -66.1568;

export function LocationMapSheet({
  activity,
  isOpen,
  onClose,
}: LocationMapSheetProps) {
  const activityId = activity.id;
  const initialLat = activity.detail?.latitude;
  const initialLng = activity.detail?.longitude;
  const initialPlace = activity.detail?.place;
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerInstanceRef = useRef<any>(null);

  const [selectedCoords, setSelectedCoords] = useState<{
    lat: number;
    lng: number;
  }>({
    lat: initialLat ?? DEFAULT_LAT,
    lng: initialLng ?? DEFAULT_LNG,
  });

  const [place, setPlace] = useState(initialPlace ?? "");

  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (initialLat != null && initialLng != null) {
      setSelectedCoords({ lat: initialLat, lng: initialLng });
    }
    if (initialPlace != null) {
      setPlace(initialPlace);
    }
  }, [initialLat, initialLng, initialPlace, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerInstanceRef.current = null;
      }
      return;
    }

    let isMounted = true;

    // Inicializar Leaflet dinámicamente
    import("leaflet").then((L) => {
      if (!isMounted || !mapContainerRef.current) return;

      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
      }

      const centerLat = selectedCoords.lat;
      const centerLng = selectedCoords.lng;

      const map = L.map(mapContainerRef.current, {
        center: [centerLat, centerLng],
        zoom: 15,
        zoomControl: false,
      });

      L.control.zoom({ position: "bottomright" }).addTo(map);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      const pinIcon = L.divIcon({
        className: "custom-map-pin-container",
        html: `
          <div style="
            background-color: #6355de;
            width: 32px;
            height: 32px;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            border: 3px solid white;
            box-shadow: 0 4px 10px rgba(99, 85, 222, 0.45);
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            <div style="width: 8px; height: 8px; background: white; border-radius: 50%;"></div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
      });

      const marker = L.marker([centerLat, centerLng], {
        icon: pinIcon,
        draggable: true,
      }).addTo(map);

      marker.on("dragend", () => {
        const pos = marker.getLatLng();
        setSelectedCoords({ lat: pos.lat, lng: pos.lng });
      });

      map.on("click", (e: any) => {
        const { lat, lng } = e.latlng;
        marker.setLatLng([lat, lng]);
        setSelectedCoords({ lat, lng });
      });

      mapInstanceRef.current = map;
      markerInstanceRef.current = marker;

      // Invalidate size después del render inicial
      setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      }, 250);
    });

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerInstanceRef.current = null;
      }
    };
  }, [isOpen]);

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      appToast.error(
        "Geolocalización",
        "Tu navegador no soporta geolocalización."
      );
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setSelectedCoords({ lat: latitude, lng: longitude });
        if (mapInstanceRef.current && markerInstanceRef.current) {
          mapInstanceRef.current.setView([latitude, longitude], 16);
          markerInstanceRef.current.setLatLng([latitude, longitude]);
        }
      },
      () => {
        appToast.error(
          "Error",
          "No pudimos acceder a tu ubicación actual. Asegúrate de otorgar los permisos."
        );
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleSave = () => {
    if (!place.trim()) {
      appToast.error(
        "Lugar requerido",
        "Por favor ingresa el nombre del lugar, edificio o referencia."
      );
      return;
    }

    startTransition(async () => {
      const res = await updateActivityLocationAction(
        activityId,
        selectedCoords.lat,
        selectedCoords.lng,
        place.trim()
      );

      if (!res.ok) {
        appToast.error(
          "Error",
          res.errors?.[0] ?? "No se pudo actualizar la ubicación."
        );
        return;
      }

      appToast.success("Ubicación actualizada con éxito.");
      onClose();
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[85vh] sm:h-[80vh] max-h-[92vh] animate-in slide-in-from-bottom duration-300">
        {/* Cabecera del Sheet */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-5">
            <div className="shrink-0 flex items-center justify-center p-0 m-0">
              <Image
                src="/assets/icons/ubication.webp"
                alt="Ubicación"
                width={34}
                height={34}
                unoptimized
                className="w-8 h-8 object-contain"
              />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 leading-tight">
                Seleccionar Ubicación
              </h2>
              <p className="text-xs text-slate-500">
                Haz clic en el mapa para marcar las coordenadas exactas
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mapa Leaflet expandido */}
        <div className="relative w-full flex-1 min-h-[300px] bg-slate-100">
          <div ref={mapContainerRef} className="w-full h-full z-0" />

          {/* Botón flotante para detectar ubicación actual */}
          <button
            type="button"
            onClick={handleDetectLocation}
            className="absolute top-3 right-3 z-10 bg-white/95 backdrop-blur-md text-slate-700 p-2.5 rounded-full shadow-md hover:bg-white active:scale-95 transition-all flex items-center justify-center cursor-pointer"
            title="Usar mi ubicación actual"
          >
            <LocateFixed className="w-5 h-5 text-[#6355de]" />
          </button>
        </div>

        {/* Footer con input de lugar y botón de confirmar ubicación */}
        <div className="p-4 sm:p-5 bg-white border-t border-slate-100 space-y-3.5 w-full">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
              <span>Nombre o referencia del lugar</span>
              <span className="text-[11px] font-normal text-slate-400">Requerido</span>
            </label>
            <input
              type="text"
              name="place"
              autoComplete="off"
              value={place}
              onChange={(e) => setPlace(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSave();
                }
              }}
              placeholder="Ej: Parque Lincoln, Campus Central UMSS, Auditorio..."
              className="w-full text-sm font-medium text-slate-900 border border-slate-300 rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-[#6355de] focus:border-transparent focus:outline-none transition-all placeholder:text-slate-400"
            />
            <p className="text-[11px] text-slate-500 leading-normal">
              Indica el nombre del sitio o punto de encuentro. La dirección detallada se obtendrá automáticamente con las coordenadas fijadas en el mapa.
            </p>
          </div>

          <Button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            className="w-full bg-[#6355de] hover:bg-[#5446cc] text-white rounded-xl py-3 flex items-center justify-center gap-2 text-sm font-semibold shadow-sm transition-all cursor-pointer"
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Guardando...</span>
              </>
            ) : (
              <span>Confirmar Ubicación</span>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
