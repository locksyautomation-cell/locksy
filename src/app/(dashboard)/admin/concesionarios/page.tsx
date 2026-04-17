"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import type { Dealership } from "@/lib/types";

const DEFAULT_STATUSES = ["En espera", "En reparación", "Reparación finalizada"];

const EMPTY_FORM = {
  name: "",
  nif_cif: "",
  email: "",
  dealer_email: "",
  dealer_password: "",
  phone: "",
  address: "",
  city: "",
  postal_code: "",
  locator_prefix: "",
  vehicle_type: "" as "" | "motos" | "coches" | "ambos",
};

type FormState = typeof EMPTY_FORM;

export default function AdminConcesionariosPage() {
  const router = useRouter();
  const [dealerships, setDealerships] = useState<Dealership[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editingDealer, setEditingDealer] = useState<Dealership | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState<FormState>({ ...EMPTY_FORM });
  const [customStatuses, setCustomStatuses] = useState<string[]>([]);
  const [newStatus, setNewStatus] = useState("");

  const [successModal, setSuccessModal] = useState(false);
  const [registrationLink, setRegistrationLink] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchDealerships();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchDealerships() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/get-dealerships");
      const data = await res.json();
      setDealerships((data.dealerships as Dealership[]) || []);
    } catch {
      setDealerships([]);
    }
    setLoading(false);
  }

  function generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  function openCreate() {
    setEditingDealer(null);
    setForm({ ...EMPTY_FORM });
    setCustomStatuses([]);
    setNewStatus("");
    setError("");
    setShowModal(true);
  }

  function openEdit(dealer: Dealership) {
    setEditingDealer(dealer);
    setForm({
      name: dealer.name,
      nif_cif: dealer.nif_cif || "",
      email: dealer.email,
      dealer_email: dealer.email,
      dealer_password: "",
      phone: dealer.phone || "",
      address: dealer.address || "",
      city: dealer.city || "",
      postal_code: dealer.postal_code || "",
      locator_prefix: "",
      vehicle_type: (dealer.vehicle_type as "" | "motos" | "coches" | "ambos") || "",
    });
    const existing = dealer.repair_statuses || DEFAULT_STATUSES;
    const customs = existing.filter((s) => !DEFAULT_STATUSES.includes(s));
    setCustomStatuses(customs);
    setNewStatus("");
    setError("");
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditingDealer(null);
    setError("");
  }

  function addStatus() {
    const trimmed = newStatus.trim();
    if (!trimmed || customStatuses.includes(trimmed) || DEFAULT_STATUSES.includes(trimmed)) return;
    setCustomStatuses((prev) => [...prev, trimmed]);
    setNewStatus("");
  }

  function removeStatus(status: string) {
    setCustomStatuses((prev) => prev.filter((s) => s !== status));
  }

  const allStatuses = [...DEFAULT_STATUSES, ...customStatuses];

  async function handleSubmit() {
    if (!form.name || !form.email) {
      setError("El nombre y el email del concesionario son obligatorios.");
      return;
    }
    if (!editingDealer && (!form.dealer_email || !form.dealer_password)) {
      setError("El email y contraseña de acceso son obligatorios.");
      return;
    }
    const normalizedPrefix = form.locator_prefix.toUpperCase().trim();
    if (!editingDealer && normalizedPrefix && !/^[A-Z]{2}$/.test(normalizedPrefix)) {
      setError("El prefijo debe ser exactamente 2 letras mayúsculas (A–Z).");
      return;
    }

    setSaving(true);
    setError("");

    try {
      if (editingDealer) {
        const res = await fetch("/api/admin/update-dealership", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingDealer.id,
            name: form.name,
            nif_cif: form.nif_cif,
            phone: form.phone,
            address: form.address,
            city: form.city,
            postal_code: form.postal_code,
            repair_statuses: allStatuses,
            vehicle_type: form.vehicle_type || null,
          }),
        });
        if (!res.ok) {
          const data = await res.json();
          setError(data.error || "Error al actualizar concesionario.");
        } else {
          closeModal();
          fetchDealerships();
        }
      } else {
        const res = await fetch("/api/admin/create-dealership", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.name,
            nif_cif: form.nif_cif,
            email: form.email,
            dealer_email: form.dealer_email,
            dealer_password: form.dealer_password,
            phone: form.phone,
            address: form.address,
            city: form.city,
            postal_code: form.postal_code,
            slug: generateSlug(form.name),
            repair_statuses: allStatuses,
            vehicle_type: form.vehicle_type || null,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Error al crear concesionario.");
        } else {
          // Set locator prefix if provided
          if (normalizedPrefix && data.dealership?.id) {
            await fetch("/api/admin/set-locator-prefix", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ dealership_id: data.dealership.id, prefix: normalizedPrefix }),
            });
          }
          closeModal();
          const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
          setRegistrationLink(`${appUrl}/register/${data.dealership.slug}`);
          setSuccessModal(true);
          fetchDealerships();
        }
      }
    } catch {
      setError("Error de conexión. Inténtalo de nuevo.");
    }

    setSaving(false);
  }

  async function copyLink() {
    await navigator.clipboard.writeText(registrationLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const q = search.toLowerCase().trim();
  const filtered = q
    ? dealerships.filter(
        (d) =>
          (d.name || "").toLowerCase().includes(q) ||
          (d.email || "").toLowerCase().includes(q) ||
          (d.nif_cif || "").toLowerCase().includes(q)
      )
    : dealerships;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin h-8 w-8 border-2 border-navy border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div>
      {/* Top bar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
        <h1 className="heading text-2xl text-navy flex-1">CONCESIONARIOS</h1>
        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Buscar por nombre, email o NIF/CIF..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-lg border border-border px-4 py-2 text-sm focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/20 w-64"
          />
          <Button variant="secondary" size="sm" onClick={openCreate}>
            Añadir concesionario
          </Button>
        </div>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <p className="text-center text-muted-foreground py-10">
          {search ? "No se encontraron resultados." : "No hay concesionarios registrados."}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-white shadow-sm">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-muted">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nombre</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Email</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Teléfono</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Clientes</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Fecha registro</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((d) => (
                <tr
                  key={d.id}
                  onClick={() => router.push(`/admin/concesionarios/${d.id}`)}
                  className="hover:bg-muted/50 transition-colors cursor-pointer"
                >
                  <td className="px-5 py-4">
                    <div className="font-medium text-foreground flex items-center gap-2">
                      {d.vehicle_type === "motos" && <span>🏍️</span>}
                      {d.vehicle_type === "coches" && <span>🚗</span>}
                      {d.vehicle_type === "ambos" && <span>🏍️🚗</span>}
                      {d.name}
                    </div>
                    {d.nif_cif && (
                      <div className="text-xs text-muted-foreground">NIF/CIF: {d.nif_cif}</div>
                    )}
                  </td>
                  <td className="px-5 py-4 text-sm text-foreground">{d.email}</td>
                  <td className="px-5 py-4 text-sm text-foreground">{d.phone || "—"}</td>
                  <td className="px-5 py-4 text-sm text-foreground font-medium">
                    {d.client_count ?? 0}
                  </td>
                  <td className="px-5 py-4 text-sm text-muted-foreground">
                    {new Date(d.created_at).toLocaleDateString("es-ES")}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); openEdit(d); }}
                    >
                      Editar
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create / Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={closeModal}
        title={editingDealer ? "EDITAR CONCESIONARIO" : "AÑADIR CONCESIONARIO"}
      >
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          {/* Tipo de vehículo */}
          <div>
            <p className="mb-2 text-sm font-medium">Tipo de vehículo <span className="text-error">*</span></p>
            <div className="flex gap-3">
              {([["motos", "🏍️ Motos"], ["coches", "🚗 Coches"]] as const).map(([value, label]) => {
                const active = form.vehicle_type === value || form.vehicle_type === "ambos";
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setForm((p) => {
                      const cur = p.vehicle_type;
                      let next: "" | "motos" | "coches" | "ambos";
                      if (value === "motos") next = cur === "motos" ? "" : cur === "coches" ? "ambos" : cur === "ambos" ? "coches" : "motos";
                      else next = cur === "coches" ? "" : cur === "motos" ? "ambos" : cur === "ambos" ? "motos" : "coches";
                      return { ...p, vehicle_type: next };
                    })}
                    className={`flex-1 rounded-lg border-2 px-4 py-3 text-sm font-medium transition-colors ${
                      active ? "border-navy bg-navy text-white" : "border-border bg-white text-foreground hover:border-navy/50"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Puedes seleccionar ambas opciones.</p>
          </div>

          <Input
            label="Nombre / Empresa"
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            required
          />
          <Input
            label="NIF / CIF"
            value={form.nif_cif}
            onChange={(e) => setForm((p) => ({ ...p, nif_cif: e.target.value }))}
          />
          <Input
            label="Correo electrónico del concesionario"
            type="email"
            value={form.email}
            onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
            required
            disabled={!!editingDealer}
          />
          <Input
            label="Teléfono"
            value={form.phone}
            onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
          />
          <Input
            label="Dirección"
            value={form.address}
            onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Ciudad"
              value={form.city}
              onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}
            />
            <Input
              label="Código postal"
              value={form.postal_code}
              onChange={(e) => setForm((p) => ({ ...p, postal_code: e.target.value }))}
            />
          </div>

          {!editingDealer && (
            <>
              <hr className="border-border" />
              <p className="text-sm font-semibold text-muted-foreground">Cuenta de acceso</p>
              <Input
                label="Email de acceso"
                type="email"
                value={form.dealer_email}
                onChange={(e) => setForm((p) => ({ ...p, dealer_email: e.target.value }))}
                required
              />
              <Input
                label="Contraseña"
                type="password"
                value={form.dealer_password}
                onChange={(e) => setForm((p) => ({ ...p, dealer_password: e.target.value }))}
                required
              />
              <hr className="border-border" />
              <p className="text-sm font-semibold text-muted-foreground">Localizador de citas</p>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Prefijo (2 letras)</label>
                <input
                  type="text"
                  maxLength={2}
                  value={form.locator_prefix}
                  onChange={(e) => setForm((p) => ({ ...p, locator_prefix: e.target.value.toUpperCase() }))}
                  placeholder="AB"
                  className="w-24 rounded-lg border border-border px-3 py-2 text-sm font-mono uppercase tracking-widest focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/20"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Ej: <span className="font-mono">MS</span> → localizadores <span className="font-mono">MS-0000</span>, <span className="font-mono">MS-0001</span>...
                  Opcional, se puede asignar después.
                </p>
              </div>
            </>
          )}

          <hr className="border-border" />
          <p className="text-sm font-semibold text-muted-foreground">Estados de reparación</p>

          {/* Default statuses (non-deletable) */}
          <div className="space-y-2">
            {DEFAULT_STATUSES.map((status) => (
              <div
                key={status}
                className="flex items-center justify-between rounded-lg bg-muted px-3 py-2 text-sm"
              >
                <span className="text-foreground">{status}</span>
                <span className="text-xs text-muted-foreground">Por defecto</span>
              </div>
            ))}
          </div>

          {/* Custom statuses */}
          {customStatuses.map((status) => (
            <div
              key={status}
              className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
            >
              <span className="text-foreground">{status}</span>
              <button
                onClick={() => removeStatus(status)}
                className="text-muted-foreground hover:text-error transition-colors"
                aria-label="Eliminar estado"
              >
                ✕
              </button>
            </div>
          ))}

          {/* Add new status */}
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Nuevo estado..."
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addStatus())}
              className="flex-1 rounded-lg border border-border px-3 py-2 text-sm focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/20"
            />
            <Button variant="outline" size="sm" onClick={addStatus}>
              Añadir
            </Button>
          </div>

          {error && <p className="text-sm text-error">{error}</p>}

          <div className="flex gap-3 pt-2">
            <Button variant="outline" fullWidth onClick={closeModal}>
              Cancelar
            </Button>
            <Button
              variant="secondary"
              fullWidth
              onClick={handleSubmit}
              loading={saving}
              disabled={!form.name || !form.email}
            >
              {editingDealer ? "Guardar cambios" : "Crear"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Success Modal */}
      <Modal
        isOpen={successModal}
        onClose={() => { setSuccessModal(false); setCopied(false); }}
        title="CONCESIONARIO CREADO"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            El concesionario ha sido creado correctamente. Comparte el siguiente enlace de registro con los clientes:
          </p>
          <div className="rounded-lg bg-muted p-3 text-sm break-all font-mono text-foreground">
            {registrationLink}
          </div>
          <Button variant="secondary" fullWidth onClick={copyLink}>
            {copied ? "¡Copiado!" : "Copiar enlace"}
          </Button>
          <Button variant="outline" fullWidth onClick={() => { setSuccessModal(false); setCopied(false); }}>
            Cerrar
          </Button>
        </div>
      </Modal>
      {/* Sticky bottom count */}
      <div className="fixed bottom-0 left-0 right-0 z-10 bg-white border-t border-border shadow-sm">
        <div className="py-3 px-8 lg:px-12 text-sm text-muted-foreground text-right">
          {dealerships.length} {dealerships.length === 1 ? "concesionario registrado" : "concesionarios registrados"}
        </div>
      </div>
    </div>
  );
}
