"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const addDealership = searchParams.get("addDealership");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createClient();

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError("Credenciales incorrectas. Inténtalo de nuevo.");
      setLoading(false);
      return;
    }

    await fetch("/api/auth/generate-code", { method: "POST" });

    const verifyUrl = addDealership
      ? `/verify?addDealership=${addDealership}`
      : "/verify";
    router.push(verifyUrl);
  }

  return (
    <div className="rounded-xl bg-white p-8 shadow-sm">
      <h1 className="heading text-2xl text-navy mb-2 text-center">INICIAR SESIÓN</h1>
      <p className="text-center text-sm text-muted-foreground mb-8">
        Accede a tu cuenta
      </p>

      {addDealership && (
        <div className="mb-6 rounded-lg bg-blue-50 p-4 text-sm text-blue-800">
          Ya estás registrado. Inicia sesión para añadir este concesionario a
          tu perfil.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Input
          label="Correo electrónico"
          type="email"
          name="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="email@ejemplo.com"
        />
        <div>
          <div className="relative">
            <Input
              label="Contraseña"
              type={showPassword ? "text" : "password"}
              name="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Tu contraseña"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-9 text-muted-foreground hover:text-foreground transition-colors"
              aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
            >
              {showPassword ? (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>
          <Link
            href="/reset-password"
            className="mt-2 block text-right text-sm text-orange hover:text-orange-dark"
          >
            ¿Has olvidado tu contraseña?
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="rememberMe"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="h-4 w-4 rounded border-border text-navy focus:ring-navy"
          />
          <label htmlFor="rememberMe" className="text-sm text-foreground">
            Recordarme
          </label>
        </div>

        {error && <p className="text-sm text-error text-center">{error}</p>}

        <Button type="submit" fullWidth loading={loading}>
          Iniciar Sesión
        </Button>
      </form>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        ¿Eres nuevo? Regístrate a través del enlace proporcionado por tu concesionario.
      </p>
    </div>
  );
}
