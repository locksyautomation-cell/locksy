"use client";

import { Suspense, useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Button from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";
import { RESEND_CODE_DELAY_SECONDS, VERIFICATION_CODE_LENGTH } from "@/lib/constants";

export default function VerifyPage() {
  return (
    <Suspense>
      <VerifyForm />
    </Suspense>
  );
}

function VerifyForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dealershipSlug = searchParams.get("dealershipSlug");
  const addDealership = searchParams.get("addDealership");

  const [code, setCode] = useState<string[]>(
    Array(VERIFICATION_CODE_LENGTH).fill("")
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [canResend, setCanResend] = useState(false);
  const [countdown, setCountdown] = useState(RESEND_CODE_DELAY_SECONDS);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [countdown]);

  function handleChange(index: number, value: string) {
    if (!/^[a-zA-Z0-9]?$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value.toUpperCase();
    setCode(newCode);

    // Auto-focus next input
    if (value && index < VERIFICATION_CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData
      .getData("text")
      .replace(/[^a-zA-Z0-9]/g, "")
      .toUpperCase()
      .slice(0, VERIFICATION_CODE_LENGTH);
    const newCode = [...code];
    for (let i = 0; i < pasted.length; i++) {
      newCode[i] = pasted[i];
    }
    setCode(newCode);
    if (pasted.length > 0) {
      const focusIndex = Math.min(pasted.length, VERIFICATION_CODE_LENGTH - 1);
      inputRefs.current[focusIndex]?.focus();
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const fullCode = code.join("");
    if (fullCode.length !== VERIFICATION_CODE_LENGTH) {
      setError("Introduce el código completo de 6 caracteres.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const supabase = createClient();

      // Verify code via API route (uses admin client to bypass RLS)
      const res = await fetch("/api/auth/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: fullCode }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.error === "Código expirado") {
          setError("El código ha expirado. Solicita uno nuevo.");
        } else {
          setError("Código incorrecto. Inténtalo de nuevo.");
        }
        setLoading(false);
        return;
      }

      // Handle add dealership flow
      if (addDealership) {
        const { data: { user } } = await supabase.auth.getUser();
        const { data: dealership } = await supabase
          .from("dealerships")
          .select("id, name")
          .eq("slug", addDealership)
          .eq("active", true)
          .single();

        if (dealership && user) {
          await supabase.from("dealership_clients").upsert({
            dealership_id: dealership.id,
            client_id: user.id,
            active: true,
          });
        }
      }

      // Redirect based on context
      if (dealershipSlug) {
        router.push(`/complete-profile?dealershipSlug=${dealershipSlug}`);
      } else {
        if (data.role === "dealer") {
          router.push("/dealer/citas");
        } else if (data.role === "admin") {
          router.push("/admin");
        } else {
          router.push("/client/appointments");
        }
      }
    } catch {
      setError("Error al verificar. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setCanResend(false);
    setCountdown(RESEND_CODE_DELAY_SECONDS);
    setError("");

    try {
      const res = await fetch("/api/auth/generate-code", { method: "POST" });
      if (!res.ok) setError("Error al reenviar el código.");
    } catch {
      setError("Error al reenviar el código.");
    }
  }

  return (
    <div className="rounded-xl bg-white p-8 shadow-sm">
      <h1 className="heading text-2xl text-navy mb-2 text-center">
        VERIFICACIÓN
      </h1>
      <p className="text-center text-sm text-muted-foreground mb-8">
        Introduce el código de 6 caracteres enviado a tu correo electrónico.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex justify-center gap-3" onPaste={handlePaste}>
          {code.map((digit, i) => (
            <input
              key={i}
              ref={(el) => {
                inputRefs.current[i] = el;
              }}
              type="text"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              className="h-14 w-12 rounded-lg border border-border text-center text-xl font-bold uppercase
                focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/20"
            />
          ))}
        </div>

        {error && <p className="text-sm text-error text-center">{error}</p>}

        <Button
          type="submit"
          fullWidth
          loading={loading}
          disabled={code.some((c) => !c)}
        >
          Verificar
        </Button>

        <div className="text-center">
          {canResend ? (
            <button
              type="button"
              onClick={handleResend}
              className="text-sm text-orange hover:text-orange-dark"
            >
              Reenviar código
            </button>
          ) : (
            <p className="text-sm text-muted-foreground">
              Reenviar código en {countdown}s
            </p>
          )}
        </div>
      </form>
    </div>
  );
}
