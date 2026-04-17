"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";
import { validatePassword } from "@/lib/utils/password";

export default function RegisterPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.dealershipSlug as string;

  const [dealershipName, setDealershipName] = useState("");
  const [dealershipId, setDealershipId] = useState<string | null>(null);
  const [dealershipValid, setDealershipValid] = useState<boolean | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);

  // Logged-in user state
  const [sessionChecked, setSessionChecked] = useState(false);
  const [loggedInRole, setLoggedInRole] = useState<string | null>(null);
  const [addingDealership, setAddingDealership] = useState(false);
  const [addSuccess, setAddSuccess] = useState(false);

  const supabase = createClient();

  // Validate dealership slug via public API (bypasses RLS for anonymous users)
  useEffect(() => {
    async function checkDealership() {
      const res = await fetch(`/api/dealership/${slug}`);
      if (res.ok) {
        const data = await res.json();
        setDealershipName(data.name);
        setDealershipId(data.id);
        setDealershipValid(true);
      } else {
        setDealershipValid(false);
      }
    }

    checkDealership();
  }, [slug]);

  // Check if user is already logged in
  useEffect(() => {
    async function checkSession() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Get role from users table
        const { data: userData } = await supabase
          .from("users")
          .select("role")
          .eq("id", user.id)
          .single();
        setLoggedInRole(userData?.role || user.user_metadata?.role || "client");
      }
      setSessionChecked(true);
    }
    checkSession();
  }, [supabase]);

  async function handleAddDealership() {
    if (!dealershipId) return;
    setAddingDealership(true);
    setError("");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push(`/login?addDealership=${slug}`); return; }

      const res = await fetch("/api/client/add-dealership", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dealership_id: dealershipId }),
      });

      if (!res.ok) {
        const { error } = await res.json();
        setError(error || "Error al añadir el concesionario. Inténtalo de nuevo.");
        setAddingDealership(false);
        return;
      }

      setAddSuccess(true);
      setTimeout(() => router.push("/client/appointments"), 1500);
    } catch {
      setError("Error al añadir el concesionario. Inténtalo de nuevo.");
    }
    setAddingDealership(false);
  }

  async function handleLogout() {
    await fetch("/api/auth/signout", { method: "POST" });
    setLoggedInRole(null);
    setSessionChecked(true);
  }

  function handlePasswordChange(val: string) {
    setPassword(val);
    const validation = validatePassword(val);
    setPasswordErrors(validation.errors);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const validation = validatePassword(password);
    if (!validation.isValid) {
      setPasswordErrors(validation.errors);
      return;
    }

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    if (!acceptTerms) {
      setError("Debes aceptar los términos y condiciones.");
      return;
    }

    setLoading(true);

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          role: "client",
          dealership_slug: slug,
        },
      },
    });

    if (signUpError) {
      if (
        signUpError.message.toLowerCase().includes("already registered") ||
        signUpError.message.toLowerCase().includes("already in use") ||
        signUpError.message.toLowerCase().includes("email address is already")
      ) {
        router.push(`/login?addDealership=${slug}`);
        return;
      }
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    // Sign in immediately to establish session (signUp may not return one)
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      setError("Cuenta creada. Inicia sesión para continuar.");
      setLoading(false);
      return;
    }

    router.push(`/complete-profile?dealershipSlug=${slug}`);
  }

  // Loading states
  if (dealershipValid === null || !sessionChecked) {
    return (
      <div className="rounded-xl bg-white p-8 shadow-sm text-center">
        <div className="animate-pulse text-muted-foreground">Cargando...</div>
      </div>
    );
  }

  if (dealershipValid === false) {
    return (
      <div className="rounded-xl bg-white p-8 shadow-sm text-center">
        <h1 className="heading text-2xl text-navy mb-4">ENLACE NO VÁLIDO</h1>
        <p className="text-muted-foreground mb-6">
          Este enlace de registro no es válido o el concesionario no está activo.
        </p>
        <Link href="/" className="text-orange hover:text-orange-dark font-medium">
          Volver al inicio
        </Link>
      </div>
    );
  }

  // User is logged in
  if (loggedInRole) {
    if (addSuccess) {
      return (
        <div className="rounded-xl bg-white p-8 shadow-sm text-center">
          <h1 className="heading text-2xl text-navy mb-4">¡CONCESIONARIO AÑADIDO!</h1>
          <p className="text-muted-foreground">
            <strong>{dealershipName}</strong> ha sido añadido a tu perfil. Redirigiendo...
          </p>
        </div>
      );
    }

    if (loggedInRole === "client") {
      return (
        <div className="rounded-xl bg-white p-8 shadow-sm text-center">
          <h1 className="heading text-2xl text-navy mb-2">AÑADIR CONCESIONARIO</h1>
          <p className="text-sm text-muted-foreground mb-6">
            ¿Quieres añadir <strong>{dealershipName}</strong> a tu perfil?
          </p>
          {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
          <div className="flex flex-col gap-3">
            <Button variant="secondary" fullWidth onClick={handleAddDealership} loading={addingDealership}>
              Añadir a mi cuenta
            </Button>
            <button
              onClick={handleLogout}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Usar otra cuenta
            </button>
          </div>
        </div>
      );
    }

    // Dealer or admin logged in
    return (
      <div className="rounded-xl bg-white p-8 shadow-sm text-center">
        <h1 className="heading text-2xl text-navy mb-2">ENLACE DE REGISTRO DE CLIENTES</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Este enlace es para que los clientes se registren en <strong>{dealershipName}</strong>.
          Tu cuenta actual es de {loggedInRole === "dealer" ? "concesionario" : "administrador"}.
        </p>
        <div className="flex flex-col gap-3">
          <Button variant="outline" fullWidth onClick={handleLogout}>
            Cerrar sesión para probar el flujo
          </Button>
          <Link
            href={loggedInRole === "dealer" ? "/dealer/citas" : "/admin"}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Volver a mi panel
          </Link>
        </div>
      </div>
    );
  }

  // Not logged in — show registration form
  return (
    <div className="rounded-xl bg-white p-8 shadow-sm">
      <h1 className="heading text-2xl text-navy mb-2 text-center">REGISTRO</h1>
      <p className="text-center text-sm text-muted-foreground mb-2">
        Registro de cliente en <strong>{dealershipName}</strong>
      </p>
      <p className="text-center text-xs text-orange mb-8">
        Los concesionarios no pueden registrarse aquí. La cuenta del
        concesionario la crea el administrador.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Input
          label="Correo electrónico"
          type="email"
          name="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onInput={(e) => setEmail((e.target as HTMLInputElement).value)}
          required
          placeholder="email@ejemplo.com"
        />
        <div>
          <Input
            label="Contraseña"
            type="password"
            name="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => handlePasswordChange(e.target.value)}
            onInput={(e) => handlePasswordChange((e.target as HTMLInputElement).value)}
            required
            placeholder="Tu contraseña"
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
          name="confirm-password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          onInput={(e) => setConfirmPassword((e.target as HTMLInputElement).value)}
          required
          placeholder="Repite tu contraseña"
          error={
            confirmPassword && password !== confirmPassword
              ? "Las contraseñas no coinciden"
              : undefined
          }
        />

        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            id="terms"
            checked={acceptTerms}
            onChange={(e) => setAcceptTerms(e.target.checked)}
            onClick={(e) => setAcceptTerms((e.target as HTMLInputElement).checked)}
            className="mt-1 h-4 w-4 rounded border-border text-navy focus:ring-navy"
          />
          <label htmlFor="terms" className="text-sm text-foreground">
            Acepto los{" "}
            <Link
              href="/terminos-y-condiciones"
              className="text-orange hover:text-orange-dark underline"
              target="_blank"
            >
              Términos y Condiciones
            </Link>
            . Para continuar deberás aceptar estos términos y condiciones.
          </label>
        </div>

        {error && <p className="text-sm text-error text-center">{error}</p>}

        <Button
          type="submit"
          fullWidth
          loading={loading}
          disabled={
            !email ||
            !password ||
            passwordErrors.length > 0 ||
            password !== confirmPassword ||
            !acceptTerms
          }
        >
          Siguiente
        </Button>
      </form>
    </div>
  );
}
