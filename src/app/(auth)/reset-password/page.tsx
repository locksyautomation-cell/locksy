"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";
import { validatePassword } from "@/lib/utils/password";

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const hasToken = searchParams.get("code") !== null;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const supabase = createClient();

  async function handleRequestReset(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email,
      {
        redirectTo: `${window.location.origin}/reset-password`,
      }
    );

    if (resetError) {
      setError("Error al enviar el enlace. Inténtalo de nuevo.");
    } else {
      setSent(true);
    }
    setLoading(false);
  }

  async function handleUpdatePassword(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const validation = validatePassword(password);
    if (!validation.isValid) {
      setError(validation.errors[0]);
      return;
    }

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);

    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });

    if (updateError) {
      setError("Error al restablecer la contraseña.");
    } else {
      router.push("/login");
    }
    setLoading(false);
  }

  // Step 2: Set new password (when user comes from email link)
  if (hasToken) {
    return (
      <div className="rounded-xl bg-white p-8 shadow-sm">
        <h1 className="heading text-2xl text-navy mb-2 text-center">
          NUEVA CONTRASEÑA
        </h1>
        <p className="text-center text-sm text-muted-foreground mb-8">
          Introduce tu nueva contraseña
        </p>

        <form onSubmit={handleUpdatePassword} className="space-y-6">
          <div>
            <Input
              label="Nueva contraseña"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Tu nueva contraseña"
            />
            <div className="mt-2 space-y-1">
              <p className={`text-xs ${password.length >= 8 ? "text-success" : "text-muted-foreground"}`}>
                - Al menos 8 caracteres
              </p>
              <p className={`text-xs ${/[A-Z]/.test(password) ? "text-success" : "text-muted-foreground"}`}>
                - Al menos 1 letra mayúscula
              </p>
              <p className={`text-xs ${/\d/.test(password) ? "text-success" : "text-muted-foreground"}`}>
                - Al menos 1 número
              </p>
              <p className={`text-xs ${/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password) ? "text-success" : "text-muted-foreground"}`}>
                - Al menos 1 carácter especial
              </p>
            </div>
          </div>
          <Input
            label="Confirmar contraseña"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            placeholder="Repite tu contraseña"
          />

          {error && <p className="text-sm text-error text-center">{error}</p>}

          <Button type="submit" fullWidth loading={loading}>
            Restablecer Contraseña
          </Button>
        </form>
      </div>
    );
  }

  // Step 1: Request reset email
  if (sent) {
    return (
      <div className="rounded-xl bg-white p-8 shadow-sm text-center">
        <svg className="mx-auto h-16 w-16 text-success mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        <h2 className="heading text-xl text-navy mb-4">CORREO ENVIADO</h2>
        <p className="text-muted-foreground mb-6">
          Si el correo <strong>{email}</strong> está registrado en nuestra plataforma,
          recibirás un enlace de restablecimiento en breve.
        </p>
        <Link href="/login" className="inline-block rounded-lg border-2 border-navy px-6 py-2 text-sm font-medium text-navy hover:bg-navy hover:text-white transition-colors">
          Volver al inicio de sesión
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-white p-8 shadow-sm">
      <h1 className="heading text-2xl text-navy mb-2 text-center">
        RESTABLECER CONTRASEÑA
      </h1>
      <p className="text-center text-sm text-muted-foreground mb-8">
        Introduce tu correo electrónico para recibir un enlace de
        restablecimiento.
      </p>

      <form onSubmit={handleRequestReset} className="space-y-6">
        <Input
          label="Correo electrónico"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="email@ejemplo.com"
        />

        {error && <p className="text-sm text-error text-center">{error}</p>}

        <Button type="submit" fullWidth loading={loading}>
          Enviar enlace
        </Button>

        <div className="text-center">
          <Link
            href="/login"
            className="text-sm text-orange underline hover:text-orange-dark"
          >
            ← Volver al inicio de sesión
          </Link>
        </div>
      </form>
    </div>
  );
}
