"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import VehicleSelect from "@/components/ui/VehicleSelect";
import Modal from "@/components/ui/Modal";
import { createClient } from "@/lib/supabase/client";
import { formatDate, formatTime } from "@/lib/utils/dates";

interface Vehicle {
  id: string;
  brand: string;
  model: string;
  plate: string;
  chassis_number: string | null;
  registration_date: string | null;
  tech_file_url: string | null;
  created_at: string;
}

interface ClientDetail {
  id: string;
  client_id: string | null;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  nif_cif: string | null;
  address: string | null;
  created_at: string;
  dealer_names: string[];
  is_manual: boolean;
}

interface AppointmentRow {
  id: string;
  locator: string;
  scheduled_date: string;
  scheduled_time: string;
  status: string;
  budget_amount: number | null;
  invoice_url: string | null;
  payment_status: string | null;
  manual_vehicle_brand: string | null;
  manual_vehicle_model: string | null;
  manual_vehicle_plate: string | null;
  manual_first_name: string | null;
  manual_last_name: string | null;
  manual_email: string | null;
  manual_phone: string | null;
  manual_nif_cif: string | null;
  vehicle: { brand: string; model: string; plate: string } | null;
  dealership: { name: string } | null;
  client_id: string | null;
  client: { first_name: string; last_name: string; email: string; phone: string | null } | null;
}

interface FullAppointment extends AppointmentRow {
  key_code: string | null;
  description: string | null;
  repair_status: string | null;
  dealer_observations: string | null;
  dealer_recommendations: string | null;
  budget_url: string | null;
  completed_at: string | null;
  key_returned_at: string | null;
}

function statusLabel(s: string) {
  if (s === "pendiente") return "Pendiente";
  if (s === "en_curso") return "En curso";
  return "Finalizada";
}
function statusVariant(s: string): "warning" | "info" | "success" {
  if (s === "pendiente") return "warning";
  if (s === "en_curso") return "info";
  return "success";
}
function vehicleLabel(apt: AppointmentRow) {
  if (apt.vehicle) return `${apt.vehicle.brand} ${apt.vehicle.model} · ${apt.vehicle.plate}`;
  return [apt.manual_vehicle_brand, apt.manual_vehicle_model, apt.manual_vehicle_plate].filter(Boolean).join(" ") || "—";
}
function clientName(apt: FullAppointment) {
  if (apt.client_id && apt.client) return `${apt.client.first_name} ${apt.client.last_name}`;
  return `${apt.manual_first_name || ""} ${apt.manual_last_name || ""}`.trim() || "—";
}
function clientContact(apt: FullAppointment) {
  if (apt.client_id && apt.client) return [apt.client.email, apt.client.phone].filter(Boolean).join(" · ");
  return [apt.manual_email, apt.manual_phone].filter(Boolean).join(" · ") || "—";
}

export default function AdminClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const type = searchParams.get("type") || "registered";
  const supabase = createClient();

  const [client, setClient] = useState<ClientDetail | null>(null);
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit state
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ first_name: "", last_name: "", email: "", phone: "", nif_cif: "", address: "" });
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [saveError, setSaveError] = useState("");

  // Vehicle edit state
  const [editingVehicle, setEditingVehicle] = useState<{ id: string | null; brand: string; model: string; plate: string; chassis_number: string | null; registration_date: string | null; tech_file_url: string | null } | null>(null);
  const [vehicleForm, setVehicleForm] = useState({ brand: "", model: "", plate: "", chassis_number: "", registration_date: "" });
  const [techFile, setTechFile] = useState<File | null>(null);
  const [savingVehicle, setSavingVehicle] = useState(false);
  const [vehicleError, setVehicleError] = useState("");
  const techFileRef = useRef<HTMLInputElement>(null);

  // Appointment detail modal
  const [selectedApt, setSelectedApt] = useState<FullAppointment | null>(null);
  const [loadingApt, setLoadingApt] = useState(false);

  const fetchClient = useCallback(async () => {
    const res = await fetch(`/api/admin/get-client?id=${id}&type=${type}`);
    if (!res.ok) { setLoading(false); return; }
    const { client: c, appointments: apts, vehicles: vs } = await res.json();
    setClient(c);
    setAppointments(apts || []);
    setVehicles(vs || []);
    setForm({
      first_name: c.first_name || "",
      last_name: c.last_name || "",
      email: c.email || "",
      phone: c.phone || "",
      nif_cif: c.nif_cif || "",
      address: c.address || "",
    });
    setLoading(false);
  }, [id, type]);

  useEffect(() => { fetchClient(); }, [fetchClient]);

  async function handleSave() {
    if (!client) return;
    setSaving(true);
    setSaveMsg("");
    setSaveError("");
    const payload = client.client_id
      ? { user_id: client.client_id, ...form, dni: form.nif_cif }
      : { dealer_contact_id: client.id, ...form };
    const res = await fetch("/api/admin/update-client", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      setClient((prev) => prev ? { ...prev, ...form } : null);
      setEditing(false);
      setSaveMsg("Guardado correctamente");
      setTimeout(() => setSaveMsg(""), 3000);
    } else {
      setSaveError("Error al guardar.");
    }
    setSaving(false);
  }

  type VehicleEntry = Vehicle | { id: null; brand: string; model: string; plate: string; chassis_number: null; registration_date: null; tech_file_url: null };
  const allVehicles = useMemo<VehicleEntry[]>(() => {
    const result: VehicleEntry[] = [...vehicles];
    const plates = new Set(vehicles.map((v) => v.plate.toLowerCase()));
    for (const apt of appointments) {
      const plate = apt.manual_vehicle_plate;
      if (plate && !plates.has(plate.toLowerCase())) {
        plates.add(plate.toLowerCase());
        result.push({ id: null, brand: apt.manual_vehicle_brand || "", model: apt.manual_vehicle_model || "", plate, chassis_number: null, registration_date: null, tech_file_url: null });
      }
      if (apt.vehicle && apt.vehicle.plate && !plates.has(apt.vehicle.plate.toLowerCase())) {
        plates.add(apt.vehicle.plate.toLowerCase());
        result.push({ id: null, brand: apt.vehicle.brand, model: apt.vehicle.model, plate: apt.vehicle.plate, chassis_number: null, registration_date: null, tech_file_url: null });
      }
    }
    return result;
  }, [vehicles, appointments]);

  function openVehicleEdit(v: VehicleEntry) {
    setEditingVehicle(v);
    setVehicleForm({ brand: v.brand, model: v.model, plate: v.plate, chassis_number: v.chassis_number || "", registration_date: v.registration_date || "" });
    setTechFile(null);
    setVehicleError("");
  }

  async function handleSaveVehicle() {
    if (!editingVehicle) return;
    if (vehicleForm.chassis_number.length > 0 && vehicleForm.chassis_number.length < 17) {
      setVehicleError("El bastidor debe tener exactamente 17 caracteres.");
      return;
    }
    setSavingVehicle(true);
    setVehicleError("");

    let tech_file_url = editingVehicle.tech_file_url;

    const uploadTechFile = async (vehicleId: string) => {
      if (!techFile) return tech_file_url;
      const ext = techFile.name.split(".").pop();
      const path = `${vehicleId}/tech.${ext}`;
      const { error: uploadError } = await supabase.storage.from("tech-files").upload(path, techFile, { upsert: true });
      if (!uploadError) {
        const { data: { publicUrl } } = supabase.storage.from("tech-files").getPublicUrl(path);
        return publicUrl;
      }
      return tech_file_url;
    };

    if (editingVehicle.id) {
      tech_file_url = await uploadTechFile(editingVehicle.id);
      const res = await fetch("/api/admin/update-vehicle", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vehicle_id: editingVehicle.id, ...vehicleForm, tech_file_url }),
      });
      if (res.ok) {
        setVehicles(prev => prev.map(v => v.id === editingVehicle.id ? { ...v, ...vehicleForm, tech_file_url: tech_file_url ?? null } : v));
        setEditingVehicle(null);
      } else { setVehicleError("Error al guardar. Inténtalo de nuevo."); }
    } else {
      const linkField = client?.client_id ? { client_id: client.client_id } : { dealer_contact_id: client?.id };
      const res = await fetch("/api/admin/update-vehicle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...linkField, ...vehicleForm }),
      });
      if (res.ok) {
        const { vehicle_id: newId } = await res.json();
        tech_file_url = await uploadTechFile(newId);
        if (techFile && tech_file_url) {
          await fetch("/api/admin/update-vehicle", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ vehicle_id: newId, ...vehicleForm, tech_file_url }) });
        }
        const newVehicle: Vehicle = { id: newId, ...vehicleForm, chassis_number: vehicleForm.chassis_number || null, registration_date: vehicleForm.registration_date || null, tech_file_url: tech_file_url ?? null, created_at: new Date().toISOString() };
        setVehicles(prev => [...prev, newVehicle]);
        setEditingVehicle(null);
      } else { setVehicleError("Error al guardar. Inténtalo de nuevo."); }
    }
    setSavingVehicle(false);
  }

  async function openAppointment(aptId: string) {
    setLoadingApt(true);
    setSelectedApt(null);
    const res = await fetch(`/api/admin/get-appointment?id=${aptId}`);
    if (res.ok) {
      const { appointment, dealership } = await res.json();
      setSelectedApt({ ...appointment, dealership: dealership ?? null } as FullAppointment);
    }
    setLoadingApt(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin h-8 w-8 border-2 border-navy border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">Cliente no encontrado.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => router.back()} className="text-muted-foreground hover:text-foreground">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex items-center gap-3">
          <h1 className="heading text-2xl text-navy">
            {client.first_name} {client.last_name}
          </h1>
          {client.is_manual ? (
            <Badge variant="default">Manual</Badge>
          ) : (
            <Badge variant="success">Cuenta activa</Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Info */}
        <Card>
          <h2 className="heading text-lg text-navy mb-4">INFORMACIÓN</h2>

          {editing ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Input label="Nombre" value={form.first_name} onChange={(e) => setForm((p) => ({ ...p, first_name: e.target.value }))} />
                <Input label="Apellidos" value={form.last_name} onChange={(e) => setForm((p) => ({ ...p, last_name: e.target.value }))} />
              </div>
              <Input label="Email" type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
              <Input label="Teléfono" value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} />
              <Input label="NIF / CIF" value={form.nif_cif} onChange={(e) => setForm((p) => ({ ...p, nif_cif: e.target.value }))} />
              <Input label="Dirección" value={form.address} onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))} />
              {saveError && <p className="text-sm text-error">{saveError}</p>}
              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={() => { setEditing(false); setSaveError(""); }}>Descartar cambios</Button>
                <Button variant="secondary" onClick={handleSave} loading={saving}>Guardar cambios</Button>
              </div>
            </div>
          ) : (
            <>
              <dl className="space-y-2 text-sm">
                <div><dt className="text-muted-foreground">Nombre</dt><dd className="font-medium">{client.first_name} {client.last_name}</dd></div>
                {client.email && <div><dt className="text-muted-foreground">Email</dt><dd>{client.email}</dd></div>}
                {client.phone && <div><dt className="text-muted-foreground">Teléfono</dt><dd>{client.phone}</dd></div>}
                {client.nif_cif && <div><dt className="text-muted-foreground">NIF / CIF</dt><dd>{client.nif_cif}</dd></div>}
                {client.address && <div><dt className="text-muted-foreground">Dirección</dt><dd>{client.address}</dd></div>}
                <div>
                  <dt className="text-muted-foreground">Alta</dt>
                  <dd>{new Date(client.created_at).toLocaleDateString("es-ES")}</dd>
                </div>
              </dl>
              {saveMsg && <p className="mt-3 text-sm text-green-600">{saveMsg}</p>}
              <div className="mt-4">
                <Button variant="outline" size="sm" onClick={() => setEditing(true)}>Editar</Button>
              </div>
            </>
          )}
        </Card>

        {/* Concesionarios */}
        <Card>
          <h2 className="heading text-lg text-navy mb-4">CONCESIONARIOS VINCULADOS</h2>
          {client.dealer_names.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin concesionarios vinculados.</p>
          ) : (
            <ul className="space-y-2">
              {client.dealer_names.map((name, i) => (
                <li key={i} className="flex items-center gap-2 text-sm">
                  <span className="h-2 w-2 rounded-full bg-navy inline-block flex-shrink-0" />
                  {name}
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Vehicles */}
        {allVehicles.length > 0 && (
          <Card className="lg:col-span-2">
            <h2 className="heading text-lg text-navy mb-4">VEHÍCULOS</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {allVehicles.map((v, i) => (
                <button
                  key={v.id ?? `apt-${i}`}
                  onClick={() => openVehicleEdit(v)}
                  className="text-left rounded-lg border border-border p-4 hover:border-navy/30 hover:bg-muted/30 transition-colors"
                >
                  <p className="font-semibold text-sm text-navy">{v.brand} {v.model}</p>
                  <p className="text-sm text-muted-foreground">{v.plate}</p>
                </button>
              ))}
            </div>
          </Card>
        )}

        {/* Appointment history */}
        <Card className="lg:col-span-2">
          <h2 className="heading text-lg text-navy mb-4">HISTORIAL DE CITAS</h2>
          {appointments.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin historial de citas.</p>
          ) : (
            <div className="space-y-3">
              {appointments.map((apt) => (
                <button
                  key={apt.id}
                  onClick={() => openAppointment(apt.id)}
                  className="w-full text-left"
                >
                  <div className="flex items-center justify-between rounded-lg border border-border p-4 hover:border-navy/30 hover:bg-muted/30 transition-colors">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="heading text-sm text-navy">{apt.locator}</span>
                        <Badge variant={statusVariant(apt.status)}>{statusLabel(apt.status)}</Badge>
                        {apt.dealership && (
                          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                            {apt.dealership.name}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{vehicleLabel(apt)}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(apt.scheduled_date)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right space-y-1">
                        <p className="font-semibold text-sm">
                          {apt.budget_amount != null ? `${apt.budget_amount.toFixed(2)} €` : "—"}
                        </p>
                        {apt.payment_status && (
                          <Badge variant={apt.payment_status === "paid" ? "success" : apt.payment_status === "not_required" ? "info" : "warning"}>
                            {apt.payment_status === "paid" ? "Pagado" : apt.payment_status === "not_required" ? "Sin pago" : "Pendiente"}
                          </Badge>
                        )}
                      </div>
                      <svg className="h-5 w-5 text-muted-foreground flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Vehicle edit modal */}
      <Modal isOpen={!!editingVehicle} onClose={() => setEditingVehicle(null)} title="EDITAR VEHÍCULO">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <VehicleSelect
              brand={vehicleForm.brand}
              model={vehicleForm.model}
              onBrandChange={(v) => setVehicleForm(p => ({ ...p, brand: v }))}
              onModelChange={(v) => setVehicleForm(p => ({ ...p, model: v }))}
            />
          </div>
          <Input label="Matrícula" value={vehicleForm.plate} onChange={(e) => setVehicleForm(p => ({ ...p, plate: e.target.value }))} />
          <div>
            <Input
              label={`Bastidor${vehicleForm.chassis_number ? ` (${vehicleForm.chassis_number.length}/17)` : ""}`}
              value={vehicleForm.chassis_number}
              onChange={(e) => {
                const filtered = e.target.value.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 17);
                setVehicleForm(p => ({ ...p, chassis_number: filtered }));
              }}
            />
            {vehicleForm.chassis_number.length > 0 && vehicleForm.chassis_number.length < 17 && (
              <p className="mt-1 text-xs text-error">El bastidor debe tener exactamente 17 caracteres</p>
            )}
          </div>
          <Input label="Fecha de matriculación" type="date" value={vehicleForm.registration_date} onChange={(e) => setVehicleForm(p => ({ ...p, registration_date: e.target.value }))} />
          <div>
            <label className="mb-1.5 block text-sm font-medium">Ficha técnica</label>
            {editingVehicle?.tech_file_url && !techFile && (
              <a href={editingVehicle.tech_file_url} target="_blank" rel="noopener noreferrer" className="text-sm text-orange hover:underline block mb-2">Ver ficha actual →</a>
            )}
            <label className="flex items-center gap-2 cursor-pointer rounded-lg border border-border px-4 py-2.5 text-sm hover:bg-muted transition-colors">
              <svg className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
              {techFile ? techFile.name : "Adjuntar archivo (PDF, imagen)"}
              <input ref={techFileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={(e) => setTechFile(e.target.files?.[0] || null)} />
            </label>
          </div>
          {vehicleError && <p className="text-sm text-error">{vehicleError}</p>}
          <div className="flex gap-3 pt-1">
            <Button variant="outline" fullWidth onClick={() => setEditingVehicle(null)}>Cancelar</Button>
            <Button variant="secondary" fullWidth onClick={handleSaveVehicle} loading={savingVehicle}>Guardar</Button>
          </div>
        </div>
      </Modal>

      {/* Appointment detail modal */}
      <Modal
        isOpen={loadingApt || !!selectedApt}
        onClose={() => { setSelectedApt(null); setLoadingApt(false); }}
        title={selectedApt ? `CITA ${selectedApt.locator}` : "CARGANDO..."}
      >
        {loadingApt ? (
          <div className="flex items-center justify-center py-10">
            <div className="animate-spin h-6 w-6 border-2 border-navy border-t-transparent rounded-full" />
          </div>
        ) : selectedApt ? (
          <div className="space-y-5 text-sm">
            {/* Estado + concesionario */}
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={statusVariant(selectedApt.status)}>{statusLabel(selectedApt.status)}</Badge>
              {selectedApt.payment_status === "paid" && <Badge variant="success">Pagado</Badge>}
              {selectedApt.payment_status === "not_required" && <Badge variant="default">Pago no requerido</Badge>}
              {selectedApt.dealership && (
                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                  {selectedApt.dealership.name}
                </span>
              )}
            </div>

            {/* Cliente y vehículo */}
            <div>
              <p className="font-semibold text-navy mb-2">Cliente y vehículo</p>
              <dl className="space-y-1.5">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Cliente</dt>
                  <dd className="font-medium">{clientName(selectedApt)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Contacto</dt>
                  <dd>{clientContact(selectedApt)}</dd>
                </div>
                {selectedApt.manual_nif_cif && (
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">NIF / CIF</dt>
                    <dd>{selectedApt.manual_nif_cif}</dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Vehículo</dt>
                  <dd>{vehicleLabel(selectedApt)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Fecha cita</dt>
                  <dd>
                    {formatDate(selectedApt.scheduled_date)}
                    {selectedApt.scheduled_time ? ` a las ${formatTime(selectedApt.scheduled_time)}` : ""}
                  </dd>
                </div>
                {selectedApt.completed_at && (
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Finalizada el</dt>
                    <dd>{formatDate(selectedApt.completed_at)}</dd>
                  </div>
                )}
                {selectedApt.key_returned_at && (
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Vehículo retirado el</dt>
                    <dd>{formatDate(selectedApt.key_returned_at)}</dd>
                  </div>
                )}
              </dl>
            </div>

            <hr className="border-border" />

            {/* Reparación */}
            <div>
              <p className="font-semibold text-navy mb-2">Reparación</p>
              <dl className="space-y-1.5">
                {selectedApt.key_code && (
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Código llaves</dt>
                    <dd className="font-mono font-semibold">{selectedApt.key_code}</dd>
                  </div>
                )}
                {selectedApt.repair_status && (
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Estado reparación</dt>
                    <dd>{selectedApt.repair_status}</dd>
                  </div>
                )}
                {selectedApt.description && (
                  <div>
                    <dt className="text-muted-foreground mb-1">Descripción</dt>
                    <dd className="whitespace-pre-wrap">{selectedApt.description}</dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Importe</dt>
                  <dd className="font-semibold text-navy">
                    {selectedApt.budget_amount != null ? `${selectedApt.budget_amount.toFixed(2)} €` : "—"}
                  </dd>
                </div>
                {selectedApt.budget_url && (
                  <div>
                    <a href={selectedApt.budget_url} target="_blank" rel="noopener noreferrer" className="text-orange hover:underline">
                      Ver presupuesto →
                    </a>
                  </div>
                )}
                {selectedApt.invoice_url && (
                  <div>
                    <a href={selectedApt.invoice_url} target="_blank" rel="noopener noreferrer" className="text-orange hover:underline">
                      Ver factura →
                    </a>
                  </div>
                )}
              </dl>
            </div>

            <hr className="border-border" />

            {/* Informe del taller */}
            <div>
              <p className="font-semibold text-navy mb-2">Informe del taller</p>
              <div className="space-y-3">
                <div>
                  <p className="text-muted-foreground mb-1">Observaciones</p>
                  <p className="whitespace-pre-wrap">{selectedApt.dealer_observations || <span className="text-muted-foreground">—</span>}</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Recomendaciones</p>
                  <p className="whitespace-pre-wrap">{selectedApt.dealer_recommendations || <span className="text-muted-foreground">—</span>}</p>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <Button variant="outline" fullWidth onClick={() => setSelectedApt(null)}>Cerrar</Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
