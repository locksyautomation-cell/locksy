"use client";

import { createContext, useContext, useEffect, useState } from "react";

type ConsentStatus = "pending" | "accepted" | "rejected";

interface CookieConsentContextValue {
  status: ConsentStatus;
  accept: () => void;
  reject: () => void;
  reset: () => void;
}

const STORAGE_KEY = "locksy_cookie_consent";

const CookieConsentContext = createContext<CookieConsentContextValue>({
  status: "pending",
  accept: () => {},
  reject: () => {},
  reset: () => {},
});

export function CookieConsentProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<ConsentStatus>("pending");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "accepted") setStatus("accepted");
    else if (stored === "rejected") setStatus("rejected");
  }, []);

  const accept = () => {
    localStorage.setItem(STORAGE_KEY, "accepted");
    setStatus("accepted");
  };

  const reject = () => {
    localStorage.setItem(STORAGE_KEY, "rejected");
    setStatus("rejected");
  };

  const reset = () => {
    localStorage.removeItem(STORAGE_KEY);
    setStatus("pending");
  };

  return (
    <CookieConsentContext.Provider value={{ status, accept, reject, reset }}>
      {children}
    </CookieConsentContext.Provider>
  );
}

export function useCookieConsent() {
  return useContext(CookieConsentContext);
}
