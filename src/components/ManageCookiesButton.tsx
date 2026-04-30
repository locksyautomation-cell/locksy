"use client";

import { useCookieConsent } from "@/lib/cookie-consent";

export default function ManageCookiesButton() {
  const { reset } = useCookieConsent();

  return (
    <button
      onClick={reset}
      className="text-sm text-white/70 hover:text-orange transition-colors text-left"
    >
      Gestionar cookies
    </button>
  );
}
