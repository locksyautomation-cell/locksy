"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import VehicleSelect from "@/components/ui/VehicleSelect";
import Modal from "@/components/ui/Modal";
import { createClient } from "@/lib/supabase/client";
import { formatDate, formatTime } from "@/lib/utils/dates";

interface DealerContact {
  id: string;
  client_id: string | null;
  first_name: string;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  nif_cif: string | null;
  address: string | null;
  notes: string | null;
}

interface Vehicle {
  id: string;
  brand: string;
  model: string;
  plate: string;
  chassis_number: string | null;
  registration_date: string | null;
  tech_file_url: string | null;
  created_at: string;
  updated_at: string;
}

interface RegisteredUser {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  dni: string | null;
  address: string | null;
}

interface Appointment {
  id: string;
  locator: string;
  scheduled_date: string;
  status: string;
  budget_amount: number | null;
  invoice_url: string | null;
  manual_vehicle_brand: string | null;
  manual_vehicle_model: string | null;
  manual_vehicle_plate: string | null;
  vehicle: { brand: string; model: string; plate: string } | null;
}

interface FullAppointment {
  id: string;
  locator: string;
  status: string;
  scheduled_date: string;
  scheduled_time: string | null;
  key_code: string | null;
  description: string | null;
  repair_status: string | null;
  dealer_observations: string | null;
  dealer_recommendations: string | null;
  budget_amount: number | null;
  budget_url: string | null;
  invoice_url: string | null;
  payment_status: string | null;
  repair_order_url: string | null;
  order_accepted_at: string | null;
  order_return_accepted_at: string | null;
  completed_at: string | null;
  key_returned_at: string | null;
  client_id: string | null;
  client: { first_name: string; last_name: string; email: string; phone: string | null } | null;
  manual_first_name: string | null;
  manual_last_name: string | null;
  manual_email: string | null;
  manual_phone: string | null;
  manual_nif_cif: string | null;
  manual_address: string | null;
  manual_vehicle_brand: string | null;
  manual_vehicle_model: string | null;
  manual_vehicle_plate: string | null;
  vehicle_id: string | null;
  vehicle: { brand: string; model: string; plate: string } | null;
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
function vehicleLabel(apt: Appointment) {
  if (apt.vehicle) return `${apt.vehicle.brand} ${apt.vehicle.model} · ${apt.vehicle.plate}`;
  return [apt.manual_vehicle_brand, apt.manual_vehicle_model, apt.manual_vehicle_plate].filter(Boolean).join(" ") || "—";
}
function fullVehicleLabel(apt: FullAppointment) {
  if (apt.vehicle_id && apt.vehicle) {
    return `${apt.vehicle.brand} ${apt.vehicle.model} · ${apt.vehicle.plate}`;
  }
  return [apt.manual_vehicle_brand, apt.manual_vehicle_model, apt.manual_vehicle_plate].filter(Boolean).join(" ") || "—";
}
function fullClientName(apt: FullAppointment) {
  if (apt.client_id && apt.client) return `${apt.client.first_name} ${apt.client.last_name}`;
  return `${apt.manual_first_name || ""} ${apt.manual_last_name || ""}`.trim() || "—";
}
function fullClientContact(apt: FullAppointment) {
  if (apt.client_id && apt.client) return [apt.client.email, apt.client.phone].filter(Boolean).join(" · ");
  return [apt.manual_email, apt.manual_phone].filter(Boolean).join(" · ") || "—";
}

export default function DealerContactDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();

  const [contact, setContact] = useState<DealerContact | null>(null);
  const [registeredUser, setRegisteredUser] = useState<RegisteredUser | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);

  // Vehicle edit state — editingVehicle.id is null for appointment-history vehicles
  const [editingVehicle, setEditingVehicle] = useState<{ id: string | null; brand: string; model: string; plate: string; chassis_number: string | null; registration_date: string | null; tech_file_url: string | null } | null>(null);
  const [vehicleForm, setVehicleForm] = useState({ brand: "", model: "", plate: "", chassis_number: "", registration_date: "" });
  const [techFile, setTechFile] = useState<File | null>(null);
  const [savingVehicle, setSavingVehicle] = useState(false);
  const [vehicleError, setVehicleError] = useState("");
  const techFileRef = useRef<HTMLInputElement>(null);

  // Edit state
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ first_name: "", last_name: "", email: "", phone: "", nif_cif: "", address: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [saveError, setSaveError] = useState("");

  // Merge state
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [mergeSearch, setMergeSearch] = useState("");
  const [mergeResults, setMergeResults] = useState<RegisteredUser[]>([]);
  const [mergeTarget, setMergeTarget] = useState<RegisteredUser | null>(null);
  const [merging, setMerging] = useState(false);
  const [mergeError, setMergeError] = useState("");

  // Appointment detail modal
  const [selectedApt, setSelectedApt] = useState<FullAppointment | null>(null);
  const [loadingApt, setLoadingApt] = useState(false);
  const [lateInvoiceFile, setLateInvoiceFile] = useState<File | null>(null);
  const [sendingLateInvoice, setSendingLateInvoice] = useState(false);
  const [lateInvoiceMsg, setLateInvoiceMsg] = useState("");

  const fetchContact = useCallback(async () => {
    const res = await fetch(`/api/dealer/get-contact?id=${id}`);
    if (!res.ok) { setLoading(false); return; }
    const { contact: c, appointments: apts, registeredUser: ru, vehicles: vs } = await res.json();
    setContact(c);
    setRegisteredUser(ru || null);
    setAppointments(apts || []);
    setVehicles(vs || []);
    setForm({
      first_name: c.first_name || "",
      last_name: c.last_name || "",
      email: c.email || "",
      phone: c.phone || "",
      nif_cif: c.nif_cif || "",
      address: c.address || "",
      notes: c.notes || "",
    });
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchContact(); }, [fetchContact]);

  async function openAppointment(aptId: string) {
    setLoadingApt(true);
    setSelectedApt(null);
    const res = await fetch(`/api/dealer/get-appointment?id=${aptId}`);
    if (res.ok) {
      const { appointment } = await res.json();
      setSelectedApt(appointment as FullAppointment);
    }
    setLoadingApt(false);
  }

  async function handleSendLateInvoice() {
    if (!selectedApt || !lateInvoiceFile) return;
    setSendingLateInvoice(true);
    setLateInvoiceMsg("");
    const fd = new FormData();
    fd.append("file", lateInvoiceFile);
    fd.append("appointment_id", selectedApt.id);
    const uploadRes = await fetch("/api/dealer/upload-invoice", { method: "POST", body: fd });
    if (uploadRes.ok) {
      const { url } = await uploadRes.json();
      await fetch("/api/dealer/update-appointment", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selectedApt.id, invoice_url: url }),
      });
      setSelectedApt((prev) => prev ? { ...prev, invoice_url: url } : null);
      setLateInvoiceMsg("Factura enviada correctamente.");
      setLateInvoiceFile(null);
    } else {
      setLateInvoiceMsg("Error al subir la factura.");
    }
    setSendingLateInvoice(false);
  }

  async function handleSave() {
    setSaving(true);
    setSaveMsg("");
    setSaveError("");
    const res = await fetch("/api/dealer/update-contact", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...form }),
    });
    if (res.ok) {
      setContact((prev) => prev ? { ...prev, ...form } : null);
      setEditing(false);
      setSaveMsg("Guardado correctamente");
      setTimeout(() => setSaveMsg(""), 3000);
    } else {
      setSaveError("Error al guardar.");
    }
    setSaving(false);
  }

  useEffect(() => {
    if (mergeSearch.length < 2) { setMergeResults([]); return; }
    const t = setTimeout(async () => {
      const res = await fetch(`/api/dealer/merge-contact?q=${encodeURIComponent(mergeSearch)}`);
      const data = await res.json();
      setMergeResults(data.users || []);
    }, 300);
    return () => clearTimeout(t);
  }, [mergeSearch]);

  async function handleMerge() {
    if (!mergeTarget) return;
    setMerging(true);
    setMergeError("");
    const res = await fetch("/api/dealer/merge-contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contact_id: id, client_id: mergeTarget.id }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMergeError(data.error || "Error al unificar.");
      setMerging(false);
      return;
    }
    if (data.merged_into && data.merged_into !== id) {
      router.replace(`/dealer/clientes/${data.merged_into}`);
    } else {
      setShowMergeModal(false);
      setMergeTarget(null);
      setMergeSearch("");
      await fetchContact();
    }
    setMerging(false);
  }

  // Combined list: vehicles table + unique vehicles extracted from appointment history
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

  function openVehicleEdit(v: { id: string | null; brand: string; model: string; plate: string; chassis_number: string | null; registration_date: string | null; tech_file_url: string | null }) {
    setEditingVehicle(v);
    setVehicleForm({
      brand: v.brand,
      model: v.model,
      plate: v.plate,
      chassis_number: v.chassis_number || "",
      registration_date: v.registration_date || "",
    });
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

    // Upload tech file if provided (use a temp path; replace vehicle id after create)
    const uploadTechFile = async (vehicleId: string) => {
      if (!techFile) return tech_file_url;
      const ext = techFile.name.split(".").pop();
      const path = `${vehicleId}/tech.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("tech-files")
        .upload(path, techFile, { upsert: true });
      if (!uploadError) {
        const { data: { publicUrl } } = supabase.storage.from("tech-files").getPublicUrl(path);
        return publicUrl;
      }
      return tech_file_url;
    };

    if (editingVehicle.id) {
      // Update existing vehicle
      tech_file_url = await uploadTechFile(editingVehicle.id);
      const res = await fetch("/api/dealer/update-vehicle", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vehicle_id: editingVehicle.id, ...vehicleForm, tech_file_url }),
      });
      if (res.ok) {
        setVehicles(prev => prev.map(v => v.id === editingVehicle.id
          ? { ...v, ...vehicleForm, tech_file_url: tech_file_url ?? null }
          : v
        ));
        setEditingVehicle(null);
      } else {
        setVehicleError("Error al guardar. Inténtalo de nuevo.");
      }
    } else if (contact?.client_id) {
      // Create new vehicle record for registered client
      const res = await fetch("/api/dealer/update-vehicle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_id: contact.client_id, ...vehicleForm }),
      });
      if (res.ok) {
        const { vehicle_id: newId } = await res.json();
        tech_file_url = await uploadTechFile(newId);
        if (techFile && tech_file_url) {
          await fetch("/api/dealer/update-vehicle", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ vehicle_id: newId, ...vehicleForm, tech_file_url }),
          });
        }
        const newVehicle: Vehicle = { id: newId, ...vehicleForm, chassis_number: vehicleForm.chassis_number || null, registration_date: vehicleForm.registration_date || null, tech_file_url: tech_file_url ?? null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
        setVehicles(prev => [...prev, newVehicle]);
        setEditingVehicle(null);
      } else {
        setVehicleError("Error al guardar. Inténtalo de nuevo.");
      }
    } else {
      // Manual contact — create a permanent vehicle record linked to the dealer_contact
      const res = await fetch("/api/dealer/update-vehicle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dealer_contact_id: id, ...vehicleForm }),
      });
      if (res.ok) {
        const { vehicle_id: newId } = await res.json();
        tech_file_url = await uploadTechFile(newId);
        if (techFile && tech_file_url) {
          await fetch("/api/dealer/update-vehicle", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ vehicle_id: newId, ...vehicleForm, tech_file_url }),
          });
        }
        const newVehicle: Vehicle = { id: newId, ...vehicleForm, chassis_number: vehicleForm.chassis_number || null, registration_date: vehicleForm.registration_date || null, tech_file_url: tech_file_url ?? null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
        setVehicles(prev => [...prev, newVehicle]);
        setEditingVehicle(null);
      } else {
        setVehicleError("Error al guardar. Inténtalo de nuevo.");
      }
    }
    setSavingVehicle(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin h-8 w-8 border-2 border-navy border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!contact) {
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
            {contact.first_name} {contact.last_name || ""}
          </h1>
          {contact.client_id ? (
            <Badge variant="success">Cuenta activa</Badge>
          ) : (
            <Badge variant="default">Manual</Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Info editable */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="heading text-lg text-navy">INFORMACIÓN</h2>
            {!editing && (
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>Editar</Button>
            )}
          </div>

          {editing ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Input label="Nombre / Empresa" value={form.first_name} onChange={(e) => setForm((p) => ({ ...p, first_name: e.target.value }))} />
                <Input label="Apellidos" value={form.last_name} onChange={(e) => setForm((p) => ({ ...p, last_name: e.target.value }))} />
              </div>
              <Input label="Email" type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
              <Input label="Teléfono" value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} />
              <Input label="NIF / CIF" value={form.nif_cif} onChange={(e) => setForm((p) => ({ ...p, nif_cif: e.target.value }))} />
              <Input label="Dirección" value={form.address} onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))} />
              <div>
                <label className="mb-1.5 block text-sm font-medium">Notas internas</label>
                <textarea
                  rows={3}
                  value={form.notes}
                  onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                  className="w-full rounded-lg border border-border px-4 py-3 text-sm focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/20 resize-none"
                  placeholder="Notas visibles solo para el concesionario..."
                />
              </div>
              {saveError && <p className="text-sm text-error">{saveError}</p>}
              <div className="flex gap-3 pt-1">
                <Button variant="outline" onClick={() => { setEditing(false); setSaveError(""); }}>Cancelar</Button>
                <Button variant="secondary" onClick={handleSave} loading={saving}>Guardar</Button>
              </div>
            </div>
          ) : (
            <dl className="space-y-2 text-sm">
              <div><dt className="text-muted-foreground">Nombre</dt><dd className="font-medium">{contact.first_name} {contact.last_name || ""}</dd></div>
              {contact.email && <div><dt className="text-muted-foreground">Email</dt><dd>{contact.email}</dd></div>}
              {contact.phone && <div><dt className="text-muted-foreground">Teléfono</dt><dd>{contact.phone}</dd></div>}
              {contact.nif_cif && <div><dt className="text-muted-foreground">NIF / CIF</dt><dd>{contact.nif_cif}</dd></div>}
              {contact.address && <div><dt className="text-muted-foreground">Dirección</dt><dd>{contact.address}</dd></div>}
              {contact.notes && (
                <div>
                  <dt className="text-muted-foreground">Notas</dt>
                  <dd className="whitespace-pre-wrap">{contact.notes}</dd>
                </div>
              )}
              {saveMsg && <p className="text-sm text-green-600">{saveMsg}</p>}
            </dl>
          )}
        </Card>

        {/* Registered account info or merge CTA */}
        <Card>
          <h2 className="heading text-lg text-navy mb-4">PERFIL DIGITAL</h2>
          {registeredUser ? (
            <div className="space-y-2 text-sm">
              <p className="text-muted-foreground text-xs mb-3">Este cliente tiene una cuenta registrada vinculada.</p>
              <div><dt className="text-muted-foreground">Nombre</dt><dd className="font-medium">{registeredUser.first_name} {registeredUser.last_name}</dd></div>
              <div><dt className="text-muted-foreground">Email</dt><dd>{registeredUser.email}</dd></div>
              {registeredUser.phone && <div><dt className="text-muted-foreground">Teléfono</dt><dd>{registeredUser.phone}</dd></div>}
              {registeredUser.dni && <div><dt className="text-muted-foreground">DNI / NIF</dt><dd>{registeredUser.dni}</dd></div>}
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Este cliente no tiene cuenta registrada. Si el cliente se registra más adelante, puedes unificar ambos perfiles para vincular su historial.
              </p>
              <Button variant="outline" size="sm" onClick={() => { setShowMergeModal(true); setMergeError(""); setMergeTarget(null); setMergeSearch(""); }}>
                Unificar con cuenta registrada
              </Button>
            </div>
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

        {/* Appointments history */}
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
                      </div>
                      <p className="text-sm text-muted-foreground">{vehicleLabel(apt)}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(apt.scheduled_date)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right space-y-1">
                        {apt.budget_amount != null && (
                          <p className="font-semibold text-sm">{apt.budget_amount.toFixed(2)} €</p>
                        )}
                        {apt.invoice_url && (
                          <span className="block text-xs text-orange">Ver factura →</span>
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
            {/* Estado */}
            <div className="flex items-center gap-2">
              <Badge variant={statusVariant(selectedApt.status)}>{statusLabel(selectedApt.status)}</Badge>
              {selectedApt.payment_status === "paid" && <Badge variant="success">Pagado</Badge>}
              {selectedApt.payment_status === "not_required" && <Badge variant="default">Pago no requerido</Badge>}
            </div>

            {/* Cliente y vehículo */}
            <div>
              <p className="font-semibold text-navy mb-2">Cliente y vehículo</p>
              <dl className="space-y-1.5">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Cliente</dt>
                  <dd className="font-medium">{fullClientName(selectedApt)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Contacto</dt>
                  <dd>{fullClientContact(selectedApt)}</dd>
                </div>
                {(selectedApt.manual_nif_cif) && (
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">NIF / CIF</dt>
                    <dd>{selectedApt.manual_nif_cif}</dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Vehículo</dt>
                  <dd>{fullVehicleLabel(selectedApt)}</dd>
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

            {selectedApt.repair_order_url && (
              <>
                <hr className="border-border" />
                <div>
                  <p className="font-semibold text-navy mb-2">Orden de reparación</p>
                  <dl className="space-y-1.5">
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Documento</dt>
                      <dd>
                        <a href={selectedApt.repair_order_url} target="_blank" rel="noopener noreferrer" className="text-orange hover:underline">
                          Ver PDF →
                        </a>
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Firma entrega</dt>
                      <dd className={selectedApt.order_accepted_at ? "text-green-600 font-medium" : "text-muted-foreground"}>
                        {selectedApt.order_accepted_at
                          ? `✓ ${new Date(selectedApt.order_accepted_at).toLocaleString("es-ES")}`
                          : "Pendiente"}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Firma recogida</dt>
                      <dd className={selectedApt.order_return_accepted_at ? "text-green-600 font-medium" : "text-muted-foreground"}>
                        {selectedApt.order_return_accepted_at
                          ? `✓ ${new Date(selectedApt.order_return_accepted_at).toLocaleString("es-ES")}`
                          : "Pendiente"}
                      </dd>
                    </div>
                  </dl>
                </div>
              </>
            )}

            {selectedApt.status === "finalizada" && !selectedApt.invoice_url && (
              <>
                <hr className="border-border" />
                <div>
                  <p className="font-semibold text-navy mb-2">Adjuntar factura</p>
                  <p className="text-xs text-muted-foreground mb-3">No se adjuntó factura al finalizar. Puedes subirla ahora.</p>
                  <div className="flex items-center gap-3 flex-wrap">
                    <label className="flex cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-border px-4 py-2 text-sm text-muted-foreground hover:border-navy transition-colors">
                      {lateInvoiceFile ? lateInvoiceFile.name : "Seleccionar factura (PDF)"}
                      <input
                        type="file"
                        accept=".pdf,.jpg,.png"
                        onChange={(e) => { setLateInvoiceFile(e.target.files?.[0] || null); setLateInvoiceMsg(""); }}
                        className="hidden"
                      />
                    </label>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleSendLateInvoice}
                      loading={sendingLateInvoice}
                      disabled={!lateInvoiceFile}
                    >
                      Enviar factura
                    </Button>
                  </div>
                  {lateInvoiceMsg && (
                    <p className={`text-xs mt-2 ${lateInvoiceMsg.includes("Error") ? "text-error" : "text-green-600"}`}>
                      {lateInvoiceMsg}
                    </p>
                  )}
                </div>
              </>
            )}

            <div className="pt-2">
              <Button variant="outline" fullWidth onClick={() => { setSelectedApt(null); setLateInvoiceFile(null); setLateInvoiceMsg(""); }}>Cerrar</Button>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* Merge Modal */}
      <Modal isOpen={showMergeModal} onClose={() => setShowMergeModal(false)} title="UNIFICAR PERFIL">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Busca la cuenta registrada del cliente para vincularla con este perfil manual. El historial de citas se conservará.
          </p>
          <Input
            label="Buscar por nombre o email"
            value={mergeSearch}
            onChange={(e) => { setMergeSearch(e.target.value); setMergeTarget(null); }}
            placeholder="Escribe para buscar..."
          />
          {mergeResults.length > 0 && !mergeTarget && (
            <div className="rounded-lg border border-border divide-y divide-border">
              {mergeResults.map((u) => (
                <button
                  key={u.id}
                  onClick={() => { setMergeTarget(u); setMergeResults([]); }}
                  className="w-full text-left px-4 py-3 text-sm hover:bg-muted transition-colors"
                >
                  <span className="font-medium">{u.first_name} {u.last_name}</span>
                  <span className="text-muted-foreground ml-2">{u.email}</span>
                </button>
              ))}
            </div>
          )}
          {mergeTarget && (
            <div className="rounded-lg bg-navy/5 border border-navy/20 p-4 text-sm">
              <p className="font-medium text-navy mb-1">Cuenta seleccionada:</p>
              <p>{mergeTarget.first_name} {mergeTarget.last_name} — {mergeTarget.email}</p>
              <button onClick={() => setMergeTarget(null)} className="text-xs text-muted-foreground mt-2 hover:text-error">✕ Cambiar selección</button>
            </div>
          )}
          {mergeError && <p className="text-sm text-error">{mergeError}</p>}
          <div className="flex gap-3 pt-2">
            <Button variant="outline" fullWidth onClick={() => setShowMergeModal(false)}>Cancelar</Button>
            <Button
              variant="secondary"
              fullWidth
              onClick={handleMerge}
              loading={merging}
              disabled={!mergeTarget}
            >
              Unificar perfiles
            </Button>
          </div>
        </div>
      </Modal>

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

          {/* Tech file upload */}
          <div>
            <label className="mb-1.5 block text-sm font-medium">Ficha técnica</label>
            {editingVehicle?.tech_file_url && !techFile && (
              <a href={editingVehicle.tech_file_url} target="_blank" rel="noopener noreferrer" className="text-sm text-orange hover:underline block mb-2">
                Ver ficha actual →
              </a>
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
    </div>
  );
}
