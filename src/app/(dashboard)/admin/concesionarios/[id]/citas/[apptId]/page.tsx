"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import { formatDate, formatTime } from "@/lib/utils/dates";
import type { Appointment } from "@/lib/types";

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
  return [apt.manual_phone, apt.manual_email].filter(Boolean).join(" · ") || "—";
}

export default function AdminAppointmentDetailPage() {
  const { id, apptId } = useParams<{ id: string; apptId: string }>();
  const router = useRouter();

  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [repairStatuses, setRepairStatuses] = useState<string[]>(DEFAULT_REPAIR_STATUSES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [saveError, setSaveError] = useState("");

  const [repairStatus, setRepairStatus] = useState("");
  const [observations, setObservations] = useState("");
  const [recommendations, setRecommendations] = useState("");
  const [budgetAmount, setBudgetAmount] = useState("");
  const [budgetUrl, setBudgetUrl] = useState("");
  const [invoiceUrl, setInvoiceUrl] = useState("");
  const [status, setStatus] = useState("pendiente");
  const [paymentStatus, setPaymentStatus] = useState("pending");

  useEffect(() => {
    async function fetchData() {
      const res = await fetch(`/api/admin/get-appointment?id=${apptId}`);
      if (!res.ok) { setLoading(false); return; }
      const { appointment: apt, dealership: ds } = await res.json();
      if (ds?.repair_statuses) setRepairStatuses(ds.repair_statuses);
      if (apt) {
        setAppointment(apt as Appointment);
        setRepairStatus(apt.repair_status || "");
        setObservations(apt.dealer_observations || "");
        setRecommendations(apt.dealer_recommendations || "");
        setBudgetAmount(apt.budget_amount?.toString() || "");
        setBudgetUrl(apt.budget_url || "");
        setInvoiceUrl(apt.invoice_url || "");
        setStatus(apt.status || "pendiente");
        setPaymentStatus(apt.payment_status || "pending");
      }
      setLoading(false);
    }
    fetchData();
  }, [apptId]);

  async function handleSave() {
    if (!appointment) return;
    setSaving(true);
    setSaveMsg("");
    setSaveError("");
    const res = await fetch("/api/admin/update-appointment", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: apptId,
        scheduled_date: appointment.scheduled_date,
        scheduled_time: appointment.scheduled_time,
        status,
        repair_status: repairStatus,
        description: appointment.description,
        dealer_observations: observations,
        dealer_recommendations: recommendations,
        budget_amount: budgetAmount,
        budget_url: budgetUrl,
        invoice_url: invoiceUrl,
        payment_status: paymentStatus,
        manual_first_name: appointment.manual_first_name,
        manual_last_name: appointment.manual_last_name,
        manual_phone: appointment.manual_phone,
        manual_nif_cif: appointment.manual_nif_cif,
        manual_address: appointment.manual_address,
        manual_vehicle_brand: appointment.manual_vehicle_brand,
        manual_vehicle_model: appointment.manual_vehicle_model,
        manual_vehicle_plate: appointment.manual_vehicle_plate,
      }),
    });
    if (res.ok) {
      setAppointment((prev) => prev ? {
        ...prev, status: status as Appointment["status"], repair_status: repairStatus || null,
        dealer_observations: observations, dealer_recommendations: recommendations,
        budget_amount: budgetAmount ? parseFloat(budgetAmount) : undefined,
        budget_url: budgetUrl || undefined, invoice_url: invoiceUrl || undefined,
        payment_status: paymentStatus as Appointment["payment_status"],
      } : null);
      setSaveMsg("Guardado correctamente");
      setTimeout(() => setSaveMsg(""), 3000);
    } else {
      const data = await res.json();
      setSaveError(data.error || "Error al guardar.");
    }
    setSaving(false);
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

  const isFinished = status === "finalizada";
  const isPaid = paymentStatus === "paid" || paymentStatus === "not_required";

  const vehicleBrand = appointment.vehicle_id && appointment.vehicle
    ? (appointment.vehicle as unknown as { brand: string }).brand
    : appointment.manual_vehicle_brand || "";
  const vehicleModel = appointment.vehicle_id && appointment.vehicle
    ? (appointment.vehicle as unknown as { model: string }).model
    : appointment.manual_vehicle_model || "";
  const vehiclePlate = appointment.vehicle_id && appointment.vehicle
    ? (appointment.vehicle as unknown as { plate: string }).plate
    : appointment.manual_vehicle_plate || "—";


  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => router.replace(`/admin/concesionarios/${id}?tab=citas`)}
          className="text-muted-foreground hover:text-foreground"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="heading text-2xl text-navy">REPARACIÓN {appointment.locator}</h1>
          <p className="text-sm text-muted-foreground">
            Código llaves: <span className="font-mono font-semibold">{appointment.key_code}</span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Cliente y Vehículo */}
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
            {appointment.manual_nif_cif && (
              <div>
                <dt className="text-muted-foreground">NIF / CIF</dt>
                <dd>{appointment.manual_nif_cif}</dd>
              </div>
            )}
            {appointment.manual_address && (
              <div>
                <dt className="text-muted-foreground">Dirección</dt>
                <dd>{appointment.manual_address}</dd>
              </div>
            )}
            <div>
              <dt className="text-muted-foreground">Vehículo</dt>
              <dd className="font-medium">
                {`${vehicleBrand} ${vehicleModel}`.trim() || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Matrícula</dt>
              <dd className="font-mono">{vehiclePlate}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Fecha cita</dt>
              <dd>{formatDate(appointment.scheduled_date)} a las {formatTime(appointment.scheduled_time)}</dd>
            </div>
            {appointment.description && (
              <div>
                <dt className="text-muted-foreground">Descripción</dt>
                <dd>{appointment.description}</dd>
              </div>
            )}
          </dl>
        </Card>

        {/* Estado */}
        <Card>
          <h2 className="heading text-lg text-navy mb-4">ESTADO</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Vehículo en taller</span>
              <Badge variant={appointment.vehicle_in_dealership ? "success" : "default"}>
                {appointment.vehicle_in_dealership ? "Sí" : "No"}
              </Badge>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Estado de pago</label>
              <select
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value)}
                className="w-full rounded-lg border border-border px-4 py-3 text-sm focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/20"
              >
                <option value="pending">Pendiente</option>
                <option value="paid">Pagado</option>
                <option value="not_required">No requerido</option>
              </select>
            </div>
            {appointment.budget_status && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Presupuesto</span>
                <Badge
                  variant={
                    appointment.budget_status === "accepted" ? "success"
                      : appointment.budget_status === "rejected" ? "error"
                        : "warning"
                  }
                >
                  {appointment.budget_status === "accepted" ? "Aceptado"
                    : appointment.budget_status === "rejected" ? "Rechazado"
                      : "Pendiente respuesta"}
                </Badge>
              </div>
            )}
            {isFinished && isPaid && (
              <Badge variant="success">Reparación completa y pagada</Badge>
            )}
          </div>
        </Card>

        {/* Estado de Reparación */}
        <Card>
          <h2 className="heading text-lg text-navy mb-4">ESTADO DE REPARACIÓN</h2>
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
          </div>
        </Card>

        {/* Orden de Reparación */}
        {(appointment.repair_order_url || appointment.order_accepted_at || appointment.order_return_accepted_at) && (
          <Card>
            <h2 className="heading text-lg text-navy mb-4">ORDEN DE REPARACIÓN</h2>
            <dl className="space-y-2 text-sm">
              {appointment.repair_order_url && (
                <div>
                  <dt className="text-muted-foreground">Documento</dt>
                  <dd>
                    <a href={appointment.repair_order_url} target="_blank" rel="noopener noreferrer"
                      className="text-orange hover:underline">
                      Ver orden PDF →
                    </a>
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-muted-foreground">Aceptación entrega</dt>
                <dd className={appointment.order_accepted_at ? "text-green-600 font-medium" : "text-muted-foreground"}>
                  {appointment.order_accepted_at
                    ? `✓ ${new Date(appointment.order_accepted_at).toLocaleString("es-ES")}`
                    : "Pendiente"}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Aceptación recogida</dt>
                <dd className={appointment.order_return_accepted_at ? "text-green-600 font-medium" : "text-muted-foreground"}>
                  {appointment.order_return_accepted_at
                    ? `✓ ${new Date(appointment.order_return_accepted_at).toLocaleString("es-ES")}`
                    : "Pendiente"}
                </dd>
              </div>
            </dl>
          </Card>
        )}

        {/* Presupuesto y Factura */}
        <Card>
          <h2 className="heading text-lg text-navy mb-4">PRESUPUESTO Y FACTURA</h2>
          <div className="space-y-4">
            <Input
              label="Importe presupuesto (€)"
              type="number"
              step="0.01"
              min="0"
              value={budgetAmount}
              onChange={(e) => setBudgetAmount(e.target.value)}
              placeholder="0.00"
            />
            <Input
              label="URL del presupuesto"
              value={budgetUrl}
              onChange={(e) => setBudgetUrl(e.target.value)}
              placeholder="https://..."
            />
            {budgetUrl && (
              <a href={budgetUrl} target="_blank" rel="noopener noreferrer"
                className="block text-sm text-orange hover:underline">
                Ver presupuesto →
              </a>
            )}
            <Input
              label="URL de la factura"
              value={invoiceUrl}
              onChange={(e) => setInvoiceUrl(e.target.value)}
              placeholder="https://..."
            />
            {invoiceUrl && (
              <a href={invoiceUrl} target="_blank" rel="noopener noreferrer"
                className="block text-sm text-orange hover:underline">
                Ver factura →
              </a>
            )}
          </div>
        </Card>

        {/* Save button */}
        <div className="lg:col-span-2 flex items-center gap-4">
          <Button variant="secondary" onClick={handleSave} loading={saving}>
            Guardar cambios
          </Button>
          <Button variant="outline" onClick={() => router.replace(`/admin/concesionarios/${id}?tab=citas`)}>
            Volver
          </Button>
          {saveMsg && <span className="text-sm text-green-600">{saveMsg}</span>}
          {saveError && <span className="text-sm text-error">{saveError}</span>}
        </div>
      </div>
    </div>
  );
}
