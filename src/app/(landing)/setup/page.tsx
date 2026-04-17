"use client";

import { useState } from "react";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

export default function SetupPage() {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const data = {
      type: "setup",
      name: formData.get("name") as string,
      company_name: formData.get("company_name") as string,
      email: formData.get("email") as string,
      phone: formData.get("phone") as string,
      address: formData.get("address") as string,
    };

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) throw new Error("Error al enviar el formulario");
      setSubmitted(true);
    } catch {
      setError("No se ha podido enviar el formulario. Inténtelo de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6 lg:px-8">
        <div className="rounded-xl border border-success/30 bg-green-50 p-8">
          <svg className="mx-auto h-16 w-16 text-success mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h2 className="heading text-2xl text-navy mb-4">
            FORMULARIO ENVIADO CORRECTAMENTE
          </h2>
          <p className="text-muted-foreground">
            Nos pondremos en contacto contigo lo antes posible para acordar la
            implementación del sistema.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="heading text-3xl text-navy mb-4 text-center">
        IMPLEMENTACIÓN
      </h1>
      <p className="text-center text-muted-foreground mb-2">
        Solicita una llamada de un administrador de la plataforma para implementar
        el sistema en tu concesionario.
      </p>
      <p className="text-center text-xs text-muted-foreground mb-8">* Campos obligatorios</p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Input
          label="Nombre y Apellidos *"
          name="name"
          autoComplete="name"
          required
          placeholder="Tu nombre completo"
        />
        <Input
          label="Empresa *"
          name="company_name"
          autoComplete="organization"
          required
          placeholder="Nombre de tu concesionario"
        />
        <Input
          label="Correo Electrónico *"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="email@ejemplo.com"
        />
        <Input
          label="Teléfono *"
          name="phone"
          type="tel"
          autoComplete="tel"
          required
          placeholder="+34 600 000 000"
          pattern="[+]?[0-9\s\-]{9,15}"
          minLength={9}
          maxLength={15}
          title="Introduce un número de teléfono válido (9-15 dígitos)"
        />
        <Input
          label="Dirección *"
          name="address"
          autoComplete="street-address"
          required
          placeholder="Dirección de tu concesionario"
        />

        {error && (
          <p className="text-sm text-error text-center">{error}</p>
        )}

        <Button type="submit" fullWidth loading={loading} variant="secondary">
          Solicitar Implementación
        </Button>
      </form>
    </div>
  );
}
