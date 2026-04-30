"use client";

import Link from "next/link";
import { useCookieConsent } from "@/lib/cookie-consent";

export default function CookieBanner() {
  const { status, accept, reject } = useCookieConsent();

  if (status !== "pending") return null;

  return (
    <div
      role="dialog"
      aria-label="Aviso de cookies"
      className="fixed bottom-0 left-0 right-0 z-50 px-4 py-4 sm:px-6"
    >
      <div className="mx-auto max-w-4xl rounded-xl bg-navy shadow-2xl border border-white/10 p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
          <div className="flex-1 min-w-0">
            <p className="text-sm text-white leading-relaxed">
              Usamos <span className="font-semibold text-orange">cookies de Google Maps</span> para mostrarte los talleres en el mapa.
              Puedes aceptar su uso o rechazarlo. Consulta nuestra{" "}
              <Link
                href="/politica-de-privacidad"
                className="underline text-white/80 hover:text-orange transition-colors"
              >
                Política de Privacidad
              </Link>
              .
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={reject}
              className="rounded-lg border border-white/30 px-4 py-2 text-sm text-white/80 hover:border-white/60 hover:text-white transition-colors"
            >
              Rechazar
            </button>
            <button
              onClick={accept}
              className="rounded-lg bg-orange px-5 py-2 text-sm font-semibold text-navy hover:bg-orange-light transition-colors"
            >
              Aceptar cookies
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
