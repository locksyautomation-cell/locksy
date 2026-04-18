"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Modal from "@/components/ui/Modal";
import { createClient } from "@/lib/supabase/client";
import type { Dealership } from "@/lib/types";

type EditableFields = Pick<
  Dealership,
  "name" | "nif_cif" | "phone" | "address" | "city" | "postal_code"
>;

interface VehicleBrand { id: number; name: string; vehicle_type?: string; }

function hasChanges(original: Dealership | null, current: EditableFields): boolean {
  if (!original) return false;
  return (
    current.name !== (original.name || "") ||
    current.nif_cif !== (original.nif_cif || "") ||
    current.phone !== (original.phone || "") ||
    current.address !== (original.address || "") ||
    current.city !== (original.city || "") ||
    current.postal_code !== (original.postal_code || "")
  );
}

const SUB_PAGES = [
  { label: "Pagos", href: "/dealer/perfil/pagos", desc: "Configura tu IBAN y datos de facturación" },
  { label: "Facturación", href: "/dealer/perfil/facturacion", desc: "Consulta tus ingresos y pagos recibidos" },
  { label: "Historial de órdenes", href: "/dealer/perfil/historial", desc: "Consulta todas las reparaciones completadas" },
  { label: "Horarios", href: "/dealer/perfil/horarios", desc: "Configura el horario de apertura del taller" },
];

export default function DealerPerfilPage() {
  const supabase = createClient();

  const [dealership, setDealership] = useState<Dealership | null>(null);
  const [form, setForm] = useState<EditableFields>({
    name: "",
    nif_cif: "",
    phone: "",
    address: "",
    city: "",
    postal_code: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  // Unsaved changes guard
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [pendingHref, setPendingHref] = useState("");
  const [linkCopied, setLinkCopied] = useState(false);

  // Marcas aceptadas
  const [allBrands, setAllBrands] = useState<VehicleBrand[]>([]);
  const [acceptedBrandIds, setAcceptedBrandIds] = useState<number[]>([]);
  const [savingBrands, setSavingBrands] = useState(false);
  const [brandMsg, setBrandMsg] = useState("");
  const originalAcceptedIds = useRef<number[]>([]);

  const isDirty = hasChanges(dealership, form);

  useEffect(() => {
    async function fetchData() {
      const res = await fetch("/api/dealer/get-dealership");
      if (!res.ok) { setLoading(false); return; }
      const { dealership: data } = await res.json();
      if (data) {
        setDealership(data as Dealership);
        setForm({
          name: data.name || "",
          nif_cif: data.nif_cif || "",
          phone: data.phone || "",
          address: data.address || "",
          city: data.city || "",
          postal_code: data.postal_code || "",
        });
      }

      // Marcas aceptadas
      const brandsRes = await fetch("/api/dealer/get-accepted-brands");
      if (brandsRes.ok) {
        const brandsData = await brandsRes.json();
        setAllBrands(brandsData.brands ?? []);
        setAcceptedBrandIds(brandsData.accepted_brand_ids ?? []);
        originalAcceptedIds.current = brandsData.accepted_brand_ids ?? [];
      }

      setLoading(false);
    }

    fetchData();
  }, []);

  // Browser unload guard
  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  function handleNavClick(href: string) {
    if (isDirty) {
      setPendingHref(href);
      setShowLeaveModal(true);
    } else {
      window.location.href = href;
    }
  }

  function handleDiscard() {
    if (dealership) {
      setForm({
        name: dealership.name || "",
        nif_cif: dealership.nif_cif || "",
        phone: dealership.phone || "",
        address: dealership.address || "",
        city: dealership.city || "",
        postal_code: dealership.postal_code || "",
      });
    }
    setSaveMsg("");
  }

  async function handleSave() {
    if (!dealership) return;
    setSaving(true);
    setSaveMsg("");

    await supabase
      .from("dealerships")
      .update({
        name: form.name,
        nif_cif: form.nif_cif,
        phone: form.phone,
        address: form.address,
        city: form.city,
        postal_code: form.postal_code,
      })
      .eq("id", dealership.id);

    setDealership((prev) => prev ? { ...prev, ...form } : null);
    setSaveMsg("Cambios guardados correctamente");
    setSaving(false);
    setTimeout(() => setSaveMsg(""), 4000);
  }

  function toggleBrand(id: number) {
    setAcceptedBrandIds((prev) =>
      prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id]
    );
  }

  async function handleSaveBrands() {
    setSavingBrands(true);
    setBrandMsg("");
    try {
      const res = await fetch("/api/dealer/update-accepted-brands", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accepted_brand_ids: acceptedBrandIds }),
      });
      if (res.ok) {
        originalAcceptedIds.current = acceptedBrandIds;
        setBrandMsg(acceptedBrandIds.length === 0
          ? "Configuración guardada: se aceptan todas las marcas."
          : `Guardado: ${acceptedBrandIds.length} marca${acceptedBrandIds.length !== 1 ? "s" : ""} aceptada${acceptedBrandIds.length !== 1 ? "s" : ""}.`);
        setTimeout(() => setBrandMsg(""), 4000);
      }
    } catch {}
    setSavingBrands(false);
  }

  const brandsDirty = JSON.stringify([...acceptedBrandIds].sort()) !== JSON.stringify([...originalAcceptedIds.current].sort());

  const field = useCallback(
    (key: keyof EditableFields) => ({
      value: form[key] || "",
      onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
        setForm((prev) => ({ ...prev, [key]: e.target.value })),
    }),
    [form]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin h-8 w-8 border-2 border-navy border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="heading text-2xl text-navy mb-6">MI PERFIL</h1>

      {/* Profile Form */}
      <Card className="mb-6">
        <h2 className="heading text-lg text-navy mb-4">INFORMACIÓN DEL CONCESIONARIO</h2>
        <div className="space-y-4">
          <Input label="Nombre / Razón social" {...field("name")} />
          <Input label="NIF / CIF" {...field("nif_cif")} />
          <Input
            label="Correo electrónico"
            value={dealership?.email || ""}
            disabled
            helperText="El email no puede modificarse"
          />
          <Input label="Teléfono" {...field("phone")} />
          <Input label="Dirección" {...field("address")} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Ciudad" {...field("city")} />
            <Input label="Código postal" {...field("postal_code")} />
          </div>

        </div>

        <div className="mt-6 flex items-center gap-4">
          <Button
            variant="secondary"
            onClick={handleSave}
            loading={saving}
            disabled={!isDirty}
          >
            Guardar cambios
          </Button>
          {isDirty && (
            <Button variant="outline" onClick={handleDiscard} disabled={saving}>
              Descartar cambios
            </Button>
          )}
          {saveMsg && <span className="text-sm text-green-600">{saveMsg}</span>}
        </div>
      </Card>

      {/* Registration Link */}
      <Card className="mb-6">
        <h2 className="heading text-lg text-navy mb-3">ENLACE DE REGISTRO</h2>
        <p className="text-sm text-muted-foreground mb-3">
          Comparte este enlace con tus clientes para que se registren:
        </p>
        <div className="flex items-center gap-2">
          <code className="flex-1 rounded-lg bg-muted px-4 py-3 text-sm font-mono break-all">
            {typeof window !== "undefined"
              ? `${window.location.origin}/register/${dealership?.slug}`
              : `/register/${dealership?.slug}`}
          </code>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (dealership) {
                navigator.clipboard.writeText(
                  `${window.location.origin}/register/${dealership.slug}`
                );
                setLinkCopied(true);
                setTimeout(() => setLinkCopied(false), 2000);
              }
            }}
          >
            {linkCopied ? "¡Copiado!" : "Copiar"}
          </Button>
        </div>
      </Card>

      {/* Marcas aceptadas */}
      <Card className="mb-6">
        <h2 className="heading text-lg text-navy mb-1">MARCAS ACEPTADAS</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Selecciona las marcas que admites en tu taller. Los clientes verán un aviso si su vehículo no es de una marca aceptada.
          {acceptedBrandIds.length === 0 && (
            <span className="block mt-1 text-green-600 font-medium">Sin selección = se aceptan todas las marcas.</span>
          )}
        </p>

        {allBrands.length === 0 ? (
          <p className="text-sm text-muted-foreground">Cargando marcas…</p>
        ) : dealership?.vehicle_type === "ambos" ? (
          <div className="space-y-4 mb-4">
            {(["motos", "coches"] as const).map((vtype) => {
              const section = allBrands.filter((b) => b.vehicle_type === vtype);
              return (
                <div key={vtype}>
                  <p className="text-sm font-semibold text-navy mb-2">
                    {vtype === "motos" ? "🏍️ Marcas de Motos" : "🚗 Marcas de Coches"}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {section.map((brand) => {
                      const active = acceptedBrandIds.includes(brand.id);
                      return (
                        <button
                          key={brand.id}
                          type="button"
                          onClick={() => toggleBrand(brand.id)}
                          className={`rounded-full px-3 py-1 text-sm font-medium border transition-colors ${
                            active ? "bg-navy text-white border-navy" : "bg-white text-foreground border-border hover:border-navy/50"
                          }`}
                        >
                          {brand.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-wrap gap-2 mb-4">
            {allBrands.map((brand) => {
              const active = acceptedBrandIds.includes(brand.id);
              return (
                <button
                  key={brand.id}
                  type="button"
                  onClick={() => toggleBrand(brand.id)}
                  className={`rounded-full px-3 py-1 text-sm font-medium border transition-colors ${
                    active ? "bg-navy text-white border-navy" : "bg-white text-foreground border-border hover:border-navy/50"
                  }`}
                >
                  {brand.name}
                </button>
              );
            })}
          </div>
        )}

        <div className="flex items-center gap-4">
          <Button
            variant="secondary"
            onClick={handleSaveBrands}
            loading={savingBrands}
            disabled={!brandsDirty}
          >
            Guardar marcas
          </Button>
          {acceptedBrandIds.length > 0 && (
            <button
              type="button"
              onClick={() => setAcceptedBrandIds([])}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Deseleccionar todas
            </button>
          )}
          {brandMsg && <span className="text-sm text-green-600">{brandMsg}</span>}
        </div>
      </Card>

      {/* Sub-page navigation */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {SUB_PAGES.map((page) => (
          <button
            key={page.href}
            onClick={() => handleNavClick(page.href)}
            className="text-left"
          >
            <Card className="hover:border-navy/30 transition-colors cursor-pointer h-full">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-foreground">{page.label}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{page.desc}</p>
                </div>
                <svg
                  className="h-5 w-5 text-muted-foreground flex-shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
            </Card>
          </button>
        ))}
      </div>

      {/* Unsaved changes leave guard */}
      <Modal
        isOpen={showLeaveModal}
        onClose={() => setShowLeaveModal(false)}
        title="Cambios sin guardar"
      >
        <p className="text-sm text-muted-foreground mb-6">
          Tienes cambios sin guardar. ¿Qué deseas hacer?
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setShowLeaveModal(false)}>
            Seguir editando
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              setShowLeaveModal(false);
              window.location.href = pendingHref;
            }}
          >
            Salir sin guardar
          </Button>
          <Button
            variant="secondary"
            onClick={async () => {
              await handleSave();
              setShowLeaveModal(false);
              window.location.href = pendingHref;
            }}
            loading={saving}
          >
            Guardar y salir
          </Button>
        </div>
      </Modal>
    </div>
  );
}
