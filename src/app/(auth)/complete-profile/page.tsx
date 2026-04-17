"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";

export default function CompleteProfilePage() {
  return (
    <Suspense>
      <CompleteProfileForm />
    </Suspense>
  );
}

function CompleteProfileForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dealershipSlug = searchParams.get("dealershipSlug");

  const [step, setStep] = useState<"info" | "photo">("info");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    dni: "",
    phone: "",
    address: "",
  });

  function handleChange(field: string, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  async function handleInfoSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStep("photo");
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setProfilePhoto(file);
      const reader = new FileReader();
      reader.onloadend = () => setPhotoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  }

  async function handleFinish(skipPhoto: boolean = false) {
    setLoading(true);
    setError("");

    try {
      const supabase = createClient();

      // Use getSession (reads local cookies) as fallback when getUser fails for unconfirmed users
      let userId: string | null = null;
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        userId = user.id;
      } else {
        const { data: { session } } = await supabase.auth.getSession();
        userId = session?.user?.id ?? null;
      }

      if (!userId) {
        setError("Sesión expirada. Por favor, inicia sesión de nuevo.");
        setLoading(false);
        return;
      }

      let photoUrl: string | undefined;

      // Upload profile photo via API route (uses admin client, works for unconfirmed users)
      if (!skipPhoto && profilePhoto) {
        const fd = new FormData();
        fd.append("file", profilePhoto);
        const uploadRes = await fetch("/api/client/upload-profile-photo", { method: "POST", body: fd });
        if (uploadRes.ok) {
          const { url } = await uploadRes.json();
          photoUrl = url;
        }
      }

      // Save profile via API route (uses admin client, bypasses RLS)
      const res = await fetch("/api/auth/complete-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: formData.first_name,
          last_name: formData.last_name,
          dni: formData.dni,
          phone: formData.phone,
          address: formData.address,
          photo_url: photoUrl,
          dealership_slug: dealershipSlug,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        setError(errData.detail || errData.error || "Error al guardar el perfil.");
        setLoading(false);
        return;
      }

      router.push("/client/appointments");
    } catch {
      setError("Error al completar el perfil.");
    } finally {
      setLoading(false);
    }
  }

  if (step === "photo") {
    return (
      <div className="rounded-xl bg-white p-8 shadow-sm">
        <h1 className="heading text-2xl text-navy mb-2 text-center">
          FOTO DE PERFIL
        </h1>
        <p className="text-center text-sm text-muted-foreground mb-8">
          Selecciona una foto de perfil
        </p>

        <div className="flex flex-col items-center gap-6">
          {/* Photo preview */}
          <div className="relative h-32 w-32 rounded-full bg-muted overflow-hidden">
            {photoPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photoPreview}
                alt="Preview"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                <svg className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
            )}
          </div>

          <label className="cursor-pointer rounded-lg border-2 border-dashed border-border px-6 py-3 text-sm text-muted-foreground hover:border-navy hover:text-navy transition-colors">
            Seleccionar foto
            <input
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
              className="hidden"
            />
          </label>

          {error && <p className="text-sm text-error">{error}</p>}

          <div className="w-full space-y-3">
            <Button
              fullWidth
              loading={loading}
              disabled={!profilePhoto}
              onClick={() => handleFinish(false)}
            >
              Finalizar
            </Button>
            <button
              type="button"
              onClick={() => handleFinish(true)}
              className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
              disabled={loading}
            >
              Completar perfil más tarde
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-white p-8 shadow-sm">
      <h1 className="heading text-2xl text-navy mb-2 text-center">
        COMPLETAR PERFIL
      </h1>
      <p className="text-center text-sm text-muted-foreground mb-8">
        Completa tu información personal
      </p>

      <form onSubmit={handleInfoSubmit} className="space-y-6">
        <Input
          label="Nombre / Empresa"
          value={formData.first_name}
          onChange={(e) => handleChange("first_name", e.target.value)}
          required
          placeholder="Nombre completo o empresa"
        />
        <Input
          label="Apellidos"
          value={formData.last_name}
          onChange={(e) => handleChange("last_name", e.target.value)}
          placeholder="Apellidos (si aplica)"
        />
        <Input
          label="NIF/CIF"
          value={formData.dni}
          onChange={(e) => handleChange("dni", e.target.value)}
          required
          placeholder="12345678A"
        />
        <Input
          label="Teléfono de contacto"
          type="tel"
          value={formData.phone}
          onChange={(e) => handleChange("phone", e.target.value)}
          required
          placeholder="+34 600 000 000"
        />
        <Input
          label="Dirección"
          value={formData.address}
          onChange={(e) => handleChange("address", e.target.value)}
          required
          placeholder="Tu dirección"
        />

        {error && <p className="text-sm text-error text-center">{error}</p>}

        <Button type="submit" fullWidth>
          Siguiente
        </Button>
      </form>
    </div>
  );
}
