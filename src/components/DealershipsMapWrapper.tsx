"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { useCookieConsent } from "@/lib/cookie-consent";

const DealershipsMap = dynamic(() => import("./DealershipsMap"), { ssr: false });

export default function DealershipsMapWrapper() {
  const { status, accept } = useCookieConsent();
  const ref = useRef<HTMLDivElement>(null);
  const [nearViewport, setNearViewport] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setNearViewport(true); observer.disconnect(); } },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const showMap = status === "accepted" && nearViewport;

  return (
    <div ref={ref}>
      {showMap ? (
        <DealershipsMap />
      ) : status === "rejected" ? (
        <MapBlockedPlaceholder onAccept={accept} reason="rejected" />
      ) : nearViewport && status === "pending" ? (
        <MapBlockedPlaceholder onAccept={accept} reason="pending" />
      ) : (
        <div className="h-[480px] rounded-xl border border-border bg-muted/30" />
      )}
    </div>
  );
}

function MapBlockedPlaceholder({
  onAccept,
  reason,
}: {
  onAccept: () => void;
  reason: "pending" | "rejected";
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-5 h-[480px] rounded-xl border border-border bg-muted/30 px-6 text-center">
      <svg
        className="h-12 w-12 text-muted-foreground/50"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
        />
      </svg>
      <div className="max-w-xs">
        <p className="font-semibold text-navy mb-1">
          {reason === "rejected" ? "Mapa desactivado" : "Mapa de talleres"}
        </p>
        <p className="text-sm text-muted-foreground">
          {reason === "rejected"
            ? "Has rechazado las cookies de Google Maps. Puedes cambiar tu preferencia para ver los talleres en el mapa."
            : "Este mapa usa cookies de Google Maps para mostrarte los talleres cercanos."}
        </p>
      </div>
      <button
        onClick={onAccept}
        className="rounded-lg bg-orange px-6 py-2.5 text-sm font-semibold text-navy hover:bg-orange-light transition-colors"
      >
        Aceptar y ver el mapa
      </button>
    </div>
  );
}
