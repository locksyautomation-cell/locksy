"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import { createClient } from "@/lib/supabase/client";
import { formatDate, formatTime } from "@/lib/utils/dates";
import type { Appointment, Dealership } from "@/lib/types";

const DEFAULT_REPAIR_STATUSES = ["En espera", "En reparación", "Reparación finalizada"];

function clientName(apt: Appointment): string {
  if (apt.client_id && apt.client) {
    const c = apt.client as unknown as { first_name: string; last_name: string };
    return `${c.first_name} ${c.last_name}`;
  }
  return `${apt.manual_first_name || ""} ${apt.manual_last_name || ""}`.trim() || "—";
}

function clientContact(apt: Appointment): string {
  if (apt.client_id && apt.client) {
    const c = apt.client as unknown as { email: string; phone: string };
    return [c.email, c.phone].filter(Boolean).join(" · ");
  }
  return [apt.manual_phone, apt.manual_nif_cif].filter(Boolean).join(" · ") || "—";
}

function vehicleLabel(apt: Appointment): string {
  if (apt.vehicle_id && apt.vehicle) {
    const v = apt.vehicle as unknown as { brand: string; model: string; plate: string };
    return `${v.brand} ${v.model} · ${v.plate}`;
  }
  const parts = [
    apt.manual_vehicle_brand,
    apt.manual_vehicle_model,
    apt.manual_vehicle_plate ? `· ${apt.manual_vehicle_plate}` : null,
  ].filter(Boolean);
  return parts.join(" ") || "—";
}

export default function TallerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const supabase = createClient();

  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [dealership, setDealership] = useState<Dealership | null>(null);
  const [repairStatuses, setRepairStatuses] = useState<string[]>(DEFAULT_REPAIR_STATUSES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  // Editable fields
  const [repairStatus, setRepairStatus] = useState("");
  const [observations, setObservations] = useState("");
  const [recommendations, setRecommendations] = useState("");

  // Budget
  const [budgetAmount, setBudgetAmount] = useState("");
  const [budgetFile, setBudgetFile] = useState<File | null>(null);
  const [sendingBudget, setSendingBudget] = useState(false);

  // Invoice
  const [invoiceAmount, setInvoiceAmount] = useState("");
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [finishing, setFinishing] = useState(false);
  const [lateInvoiceFile, setLateInvoiceFile] = useState<File | null>(null);
  const [sendingLateInvoice, setSendingLateInvoice] = useState(false);
  const [lateInvoiceMsg, setLateInvoiceMsg] = useState("");

  // Vehicle in dealership toggle
  const [togglingVehicle, setTogglingVehicle] = useState(false);

  // Return
  const [confirming, setConfirming] = useState(false);
  const [markingPaid, setMarkingPaid] = useState(false);
  const [markingPaidCard, setMarkingPaidCard] = useState(false);

  useEffect(() => {
    async function fetchData() {
      const res = await fetch(`/api/dealer/get-appointment?id=${id}`);
      if (!res.ok) { setLoading(false); return; }
      const { appointment: apt, dealership: ds } = await res.json();

      if (ds) {
        setDealership(ds as Dealership);
        setRepairStatuses((ds.repair_statuses as string[]) || DEFAULT_REPAIR_STATUSES);
      }
      if (apt) {
        setAppointment(apt as Appointment);
        setRepairStatus(apt.repair_status || "");
        setObservations(apt.dealer_observations || "");
        setRecommendations(apt.dealer_recommendations || "");
        setBudgetAmount(apt.budget_amount?.toString() || "");
      }
      setLoading(false);
    }

    fetchData();
  }, [id]);

  async function apiUpdate(fields: Record<string, unknown>) {
    const res = await fetch("/api/dealer/update-appointment", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...fields }),
    });
    return res.ok;
  }

  async function handleToggleVehicle() {
    if (!appointment) return;
    setTogglingVehicle(true);
    const newValue = !appointment.vehicle_in_dealership;
    await apiUpdate({ vehicle_in_dealership: newValue });
    setAppointment((prev) => prev ? { ...prev, vehicle_in_dealership: newValue } : null);
    setTogglingVehicle(false);
  }

  async function handleSaveObservations() {
    if (!appointment) return;
    setSaving(true);
    setSaveMsg("");
    await apiUpdate({
      repair_status: repairStatus || null,
      dealer_observations: observations,
      dealer_recommendations: recommendations,
    });
    setAppointment((prev) => prev ? { ...prev, repair_status: repairStatus || null, dealer_observations: observations, dealer_recommendations: recommendations } : null);
    setSaveMsg("Guardado correctamente");
    setSaving(false);
    setTimeout(() => setSaveMsg(""), 3000);
  }

  async function handleSendBudget() {
    if (!appointment || !budgetAmount) return;
    setSendingBudget(true);

    let budgetUrl: string | undefined;

    if (budgetFile) {
      const fd = new FormData();
      fd.append("file", budgetFile);
      fd.append("appointment_id", id as string);
      const uploadRes = await fetch("/api/dealer/upload-budget", { method: "POST", body: fd });
      if (uploadRes.ok) {
        const { url } = await uploadRes.json();
        budgetUrl = url;
      }
    }

    await apiUpdate({
      budget_amount: parseFloat(budgetAmount),
      budget_status: "pending",
      budget_sent_at: new Date().toISOString(),
      ...(budgetUrl && { budget_url: budgetUrl }),
    });

    // Notification is created server-side by /api/dealer/update-appointment
    setAppointment((prev) =>
      prev ? { ...prev, budget_amount: parseFloat(budgetAmount), budget_status: "pending", ...(budgetUrl && { budget_url: budgetUrl }) } : null
    );
    setSendingBudget(false);
  }

  async function handleFinishRepair() {
    if (!appointment) return;
    setFinishing(true);

    let invoiceUrl: string | undefined;

    if (invoiceFile) {
      const fd = new FormData();
      fd.append("file", invoiceFile);
      fd.append("appointment_id", id as string);
      const uploadRes = await fetch("/api/dealer/upload-invoice", { method: "POST", body: fd });
      if (uploadRes.ok) {
        const { url } = await uploadRes.json();
        invoiceUrl = url;
      }
    }

    const ok = await apiUpdate({
      status: "finalizada",
      completed_at: new Date().toISOString(),
      dealer_observations: observations,
      dealer_recommendations: recommendations,
      repair_status: repairStatus || null,
      ...(invoiceAmount && { budget_amount: parseFloat(invoiceAmount) }),
      ...(invoiceUrl && { invoice_url: invoiceUrl }),
    });

    if (ok) {
      if (appointment.client_id) {
        await supabase.from("notifications").insert({
          user_id: appointment.client_id,
          appointment_id: id,
          type: "repair_completed",
          title: "Reparación finalizada",
          message: `La reparación de su vehículo (cita ${appointment.locator}) ha sido finalizada.`,
        });
      }
      setAppointment((prev) => prev ? { ...prev, status: "finalizada" } : null);
    }
    setFinishing(false);
  }

  async function handleCashPayment() {
    if (!appointment) return;
    setMarkingPaid(true);
    await apiUpdate({ payment_status: "paid", payment_method: "cash" });
    setAppointment((prev) => prev ? { ...prev, payment_status: "paid", payment_method: "cash" } : null);
    setMarkingPaid(false);
  }

  async function handleCardPayment() {
    if (!appointment) return;
    setMarkingPaidCard(true);
    await apiUpdate({ payment_status: "paid", payment_method: "card" });
    setAppointment((prev) => prev ? { ...prev, payment_status: "paid", payment_method: "card" } : null);
    setMarkingPaidCard(false);
  }

  async function handleSendLateInvoice() {
    if (!lateInvoiceFile) return;
    setSendingLateInvoice(true);
    setLateInvoiceMsg("");
    const fd = new FormData();
    fd.append("file", lateInvoiceFile);
    fd.append("appointment_id", id as string);
    const uploadRes = await fetch("/api/dealer/upload-invoice", { method: "POST", body: fd });
    if (uploadRes.ok) {
      const { url } = await uploadRes.json();
      await apiUpdate({ invoice_url: url });
      setAppointment((prev) => prev ? { ...prev, invoice_url: url } : null);
      setLateInvoiceMsg("Factura enviada correctamente.");
      setLateInvoiceFile(null);
    } else {
      setLateInvoiceMsg("Error al subir la factura.");
    }
    setSendingLateInvoice(false);
  }

  async function handleConfirmReturn() {
    if (!appointment) return;
    setConfirming(true);

    await apiUpdate({
      key_returned_at: new Date().toISOString(),
      vehicle_in_dealership: false,
    });

    router.refresh();
    router.push("/dealer/taller");
    setConfirming(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin h-8 w-8 border-2 border-navy border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">Cita no encontrada.</p>
      </div>
    );
  }

  const isFinished = appointment.status === "finalizada";
  const isPaid = appointment.payment_status === "paid" || appointment.payment_status === "not_required";
  const clientReturnAccepted = !!appointment.order_return_accepted_at;
  const canConfirmReturn = isFinished && isPaid && clientReturnAccepted;

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => router.back()}
          className="text-muted-foreground hover:text-foreground"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="heading text-2xl text-navy">
            REPARACIÓN {appointment.locator}
          </h1>
          <p className="text-sm text-muted-foreground">
            Código llaves: <span className="font-mono font-semibold">{appointment.key_code}</span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Client & Vehicle */}
        <Card>
          <h2 className="heading text-lg text-navy mb-4">CLIENTE Y VEHÍCULO</h2>
          <dl className="space-y-2 text-sm">
            <div>
              <dt className="text-muted-foreground">Cliente</dt>
              <dd className="font-medium">{clientName(appointment)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Contacto</dt>
              <dd>{clientContact(appointment)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Vehículo</dt>
              <dd>
                {(() => {
                  if (appointment.vehicle_id && appointment.vehicle) {
                    const v = appointment.vehicle as unknown as { brand: string; model: string };
                    return `${v.brand} ${v.model}`.trim() || "—";
                  }
                  return `${appointment.manual_vehicle_brand || ""} ${appointment.manual_vehicle_model || ""}`.trim() || "—";
                })()}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Matrícula</dt>
              <dd className="font-mono">
                {(() => {
                  if (appointment.vehicle_id && appointment.vehicle) {
                    return (appointment.vehicle as unknown as { plate: string }).plate || "—";
                  }
                  return appointment.manual_vehicle_plate || "—";
                })()}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Fecha cita</dt>
              <dd>
                {formatDate(appointment.scheduled_date)} a las {formatTime(appointment.scheduled_time)}
              </dd>
            </div>
            {appointment.description && (
              <div>
                <dt className="text-muted-foreground">Descripción</dt>
                <dd>{appointment.description}</dd>
              </div>
            )}
          </dl>
        </Card>

        {/* Status Card */}
        <Card>
          <h2 className="heading text-lg text-navy mb-4">ESTADO</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Vehículo en taller</span>
              {isFinished ? (
                <Badge variant={appointment.vehicle_in_dealership ? "success" : "default"}>
                  {appointment.vehicle_in_dealership ? "Sí" : "No"}
                </Badge>
              ) : (
                <button
                  onClick={handleToggleVehicle}
                  disabled={togglingVehicle}
                  style={{
                    position: "relative",
                    display: "inline-flex",
                    height: "24px",
                    width: "44px",
                    alignItems: "center",
                    borderRadius: "9999px",
                    border: "none",
                    cursor: togglingVehicle ? "not-allowed" : "pointer",
                    opacity: togglingVehicle ? 0.5 : 1,
                    backgroundColor: appointment.vehicle_in_dealership ? "#22c55e" : "#d1d5db",
                    transition: "background-color 0.2s",
                    padding: 0,
                  }}
                >
                  <span
                    style={{
                      display: "inline-block",
                      height: "16px",
                      width: "16px",
                      borderRadius: "9999px",
                      backgroundColor: "white",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
                      transform: appointment.vehicle_in_dealership ? "translateX(24px)" : "translateX(4px)",
                      transition: "transform 0.2s",
                    }}
                  />
                </button>
              )}
            </div>
            {appointment.budget_status && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Presupuesto</span>
                <Badge
                  variant={
                    appointment.budget_status === "accepted"
                      ? "success"
                      : appointment.budget_status === "rejected"
                        ? "error"
                        : "warning"
                  }
                >
                  {appointment.budget_status === "accepted"
                    ? "Aceptado"
                    : appointment.budget_status === "rejected"
                      ? "Rechazado"
                      : "Pendiente respuesta"}
                </Badge>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Pago</span>
              <Badge variant={isPaid ? "success" : "warning"}>
                {appointment.payment_status === "paid"
                  ? appointment.payment_method === "cash" ? "Pagado (Efectivo)" : "Pagado (Tarjeta)"
                  : appointment.payment_status === "not_required"
                    ? "No requerido"
                    : "Pendiente"}
              </Badge>
            </div>
            {appointment.budget_url && (
              <a
                href={appointment.budget_url}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-sm text-orange hover:text-orange-dark"
              >
                Ver presupuesto →
              </a>
            )}
            {appointment.invoice_url && (
              <a
                href={appointment.invoice_url}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-sm text-orange hover:text-orange-dark"
              >
                Ver factura →
              </a>
            )}
          </div>
        </Card>

        {/* Repair Status & Observations */}
        <Card>
          <h2 className="heading text-lg text-navy mb-4">ESTADO DE REPARACIÓN</h2>
          {isFinished ? (
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-muted-foreground">Estado</dt>
                <dd className="font-medium">{repairStatus || "—"}</dd>
              </div>
              {observations && (
                <div>
                  <dt className="text-muted-foreground">Observaciones</dt>
                  <dd>{observations}</dd>
                </div>
              )}
              {recommendations && (
                <div>
                  <dt className="text-muted-foreground">Recomendaciones</dt>
                  <dd>{recommendations}</dd>
                </div>
              )}
            </dl>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium">Estado actual</label>
                <select
                  value={repairStatus}
                  onChange={(e) => setRepairStatus(e.target.value)}
                  className="w-full rounded-lg border border-border px-4 py-3 text-sm focus:border-navy focus:outline-none"
                >
                  <option value="">Sin asignar</option>
                  {repairStatuses.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <Textarea
                label="Observaciones"
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                placeholder="Añade observaciones sobre la reparación..."
              />
              <Textarea
                label="Recomendaciones"
                value={recommendations}
                onChange={(e) => setRecommendations(e.target.value)}
                placeholder="Añade recomendaciones para el cliente..."
              />
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSaveObservations}
                  loading={saving}
                >
                  Guardar
                </Button>
                {saveMsg && <span className="text-sm text-green-600">{saveMsg}</span>}
              </div>
            </div>
          )}
        </Card>

        {/* Budget */}
        <Card>
          <h2 className="heading text-lg text-navy mb-4">PRESUPUESTO</h2>
          {isFinished ? (
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-muted-foreground">Importe</dt>
                <dd className="font-medium">{appointment.budget_amount != null ? `${appointment.budget_amount.toFixed(2)} €` : "—"}</dd>
              </div>
              {appointment.budget_url && (
                <a href={appointment.budget_url} target="_blank" rel="noopener noreferrer"
                  className="block text-sm text-orange hover:underline">
                  Ver presupuesto →
                </a>
              )}
            </dl>
          ) : (
            <div className="space-y-4">
              <Input
                label="Importe (€)"
                type="number"
                step="0.01"
                min="0"
                value={budgetAmount}
                onChange={(e) => setBudgetAmount(e.target.value)}
                placeholder="0.00"
              />
              <div>
                <label className="mb-1.5 block text-sm font-medium">Adjuntar presupuesto (PDF)</label>
                <label className="flex cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-border px-6 py-3 text-sm text-muted-foreground hover:border-navy transition-colors">
                  {budgetFile ? budgetFile.name : "Seleccionar archivo"}
                  <input
                    type="file"
                    accept=".pdf,.jpg,.png"
                    onChange={(e) => setBudgetFile(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                </label>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleSendBudget}
                loading={sendingBudget}
                disabled={!budgetAmount}
              >
                {appointment.budget_sent_at ? "Reenviar presupuesto" : "Enviar presupuesto"}
              </Button>
              {appointment.budget_sent_at && (
                <p className="text-xs text-muted-foreground">
                  Enviado el {new Date(appointment.budget_sent_at).toLocaleDateString("es-ES")}
                </p>
              )}
            </div>
          )}
        </Card>

        {/* Late invoice upload — only when finalized with no invoice yet */}
        {isFinished && !appointment.invoice_url && (
          <Card className="lg:col-span-2">
            <h2 className="heading text-lg text-navy mb-2">ADJUNTAR FACTURA</h2>
            <p className="text-sm text-muted-foreground mb-4">
              La reparación está finalizada pero no se adjuntó factura. Puedes subirla ahora.
            </p>
            <div className="flex items-center gap-4 flex-wrap">
              <label className="flex cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-border px-6 py-3 text-sm text-muted-foreground hover:border-navy transition-colors">
                {lateInvoiceFile ? lateInvoiceFile.name : "Seleccionar factura (PDF)"}
                <input
                  type="file"
                  accept=".pdf,.jpg,.png"
                  onChange={(e) => setLateInvoiceFile(e.target.files?.[0] || null)}
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
              {lateInvoiceMsg && (
                <span className={`text-sm ${lateInvoiceMsg.includes("Error") ? "text-error" : "text-green-600"}`}>
                  {lateInvoiceMsg}
                </span>
              )}
            </div>
          </Card>
        )}

        {/* Repair Order */}
        {appointment.repair_order_url && (
          <Card>
            <h2 className="heading text-lg text-navy mb-4">ORDEN DE REPARACIÓN</h2>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-muted-foreground">Documento</dt>
                <dd>
                  <a
                    href={appointment.repair_order_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-orange hover:underline font-medium"
                  >
                    Ver PDF de la orden →
                  </a>
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Firma entrega de llaves</dt>
                <dd className={appointment.order_accepted_at ? "text-green-600 font-medium" : "text-muted-foreground"}>
                  {appointment.order_accepted_at
                    ? `✓ ${new Date(appointment.order_accepted_at).toLocaleString("es-ES")}`
                    : "Pendiente"}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Firma recogida del vehículo</dt>
                <dd className={appointment.order_return_accepted_at ? "text-green-600 font-medium" : "text-muted-foreground"}>
                  {appointment.order_return_accepted_at
                    ? `✓ ${new Date(appointment.order_return_accepted_at).toLocaleString("es-ES")}`
                    : "Pendiente"}
                </dd>
              </div>
            </dl>
          </Card>
        )}

        {/* Finalize Repair */}
        {!isFinished && (
          <Card className="lg:col-span-2">
            <h2 className="heading text-lg text-navy mb-4">FINALIZAR REPARACIÓN</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Importe factura (€)"
                type="number"
                step="0.01"
                min="0"
                value={invoiceAmount}
                onChange={(e) => setInvoiceAmount(e.target.value)}
                placeholder="0.00"
              />
              <div>
                <label className="mb-1.5 block text-sm font-medium">Adjuntar factura</label>
                <label className="flex cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-border px-6 py-3 text-sm text-muted-foreground hover:border-navy transition-colors">
                  {invoiceFile ? invoiceFile.name : "Seleccionar factura"}
                  <input
                    type="file"
                    accept=".pdf,.jpg,.png"
                    onChange={(e) => setInvoiceFile(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
            <div className="mt-4">
              <Button
                variant="secondary"
                onClick={handleFinishRepair}
                loading={finishing}
              >
                Marcar como Finalizada
              </Button>
            </div>
          </Card>
        )}

        {/* Confirm Return */}
        {canConfirmReturn && (
          <Card className="lg:col-span-2 border-2 border-green-200 bg-green-50">
            <h2 className="heading text-lg text-navy mb-2">ENTREGA DEL VEHÍCULO</h2>
            <p className="text-sm text-muted-foreground mb-4">
              La reparación ha finalizado y el pago está confirmado. Confirma la retirada del vehículo por el cliente.
            </p>
            <Button
              onClick={handleConfirmReturn}
              loading={confirming}
            >
              Confirmar Retirada del Vehículo
            </Button>
          </Card>
        )}

        {isFinished && !isPaid && (
          <Card className="lg:col-span-2 border-2 border-orange/20 bg-orange/5">
            <h2 className="heading text-lg text-navy mb-2">PENDIENTE DE PAGO</h2>
            <p className="text-sm text-muted-foreground mb-4">
              La reparación ha finalizado. Confirma el pago para habilitar la retirada del vehículo.
            </p>
            <div className="flex gap-3">
              <Button
                variant="secondary"
                onClick={handleCashPayment}
                loading={markingPaid}
                disabled={markingPaidCard}
              >
                Pagado en efectivo
              </Button>
              <Button
                variant="outline"
                onClick={handleCardPayment}
                loading={markingPaidCard}
                disabled={markingPaid}
              >
                Pagado con tarjeta
              </Button>
            </div>
          </Card>
        )}

        {isFinished && isPaid && !clientReturnAccepted && (
          <Card className="lg:col-span-2 border-2 border-blue-200 bg-blue-50/30">
            <h2 className="heading text-lg text-navy mb-2">PENDIENTE DE FIRMA DEL CLIENTE</h2>
            <p className="text-sm text-muted-foreground">
              El pago está confirmado. En espera de que el cliente firme la aceptación de recogida del vehículo para habilitar la confirmación de retirada.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
