"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { formatDate, formatTime } from "@/lib/utils/dates";
import type { Appointment } from "@/lib/types";

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

export default function HistorialDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [lateInvoiceFile, setLateInvoiceFile] = useState<File | null>(null);
  const [sendingLateInvoice, setSendingLateInvoice] = useState(false);
  const [lateInvoiceMsg, setLateInvoiceMsg] = useState("");

  useEffect(() => {
    async function fetchData() {
      const res = await fetch(`/api/dealer/get-appointment?id=${id}`);
      if (!res.ok) { setLoading(false); return; }
      const { appointment: apt } = await res.json();
      if (apt) setAppointment(apt as Appointment);
      setLoading(false);
    }
    fetchData();
  }, [id]);

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
      await fetch("/api/dealer/update-appointment", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, invoice_url: url }),
      });
      setAppointment((prev) => prev ? { ...prev, invoice_url: url } : null);
      setLateInvoiceMsg("Factura enviada correctamente.");
      setLateInvoiceFile(null);
    } else {
      setLateInvoiceMsg("Error al subir la factura.");
    }
    setSendingLateInvoice(false);
  }

  const vehicleBrand = appointment.vehicle_id && appointment.vehicle
    ? (appointment.vehicle as unknown as { brand: string }).brand
    : appointment.manual_vehicle_brand || "";
  const vehicleModel = appointment.vehicle_id && appointment.vehicle
    ? (appointment.vehicle as unknown as { model: string }).model
    : appointment.manual_vehicle_model || "";
  const vehiclePlate = appointment.vehicle_id && appointment.vehicle
    ? (appointment.vehicle as unknown as { plate: string }).plate
    : appointment.manual_vehicle_plate || "—";

  const isPaid = appointment.payment_status === "paid" || appointment.payment_status === "not_required";

  return (
    <div>
      {/* Header */}
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
          <h1 className="heading text-2xl text-navy">REPARACIÓN {appointment.locator}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="success">Finalizada</Badge>
            {isPaid && <Badge variant="success">Pagado</Badge>}
          </div>
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
            {appointment.completed_at && (
              <div>
                <dt className="text-muted-foreground">Fecha finalización</dt>
                <dd>{formatDate(appointment.completed_at)}</dd>
              </div>
            )}
            {appointment.key_returned_at && (
              <div>
                <dt className="text-muted-foreground">Vehículo retirado el</dt>
                <dd>{formatDate(appointment.key_returned_at)}</dd>
              </div>
            )}
            {appointment.description && (
              <div>
                <dt className="text-muted-foreground">Descripción</dt>
                <dd>{appointment.description}</dd>
              </div>
            )}
          </dl>
        </Card>

        {/* Estado y pago */}
        <Card>
          <h2 className="heading text-lg text-navy mb-4">ESTADO Y PAGO</h2>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Código llaves</span>
              <span className="font-mono font-semibold">{appointment.key_code}</span>
            </div>
            {appointment.repair_status && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Estado reparación</span>
                <span className="rounded-full bg-navy/10 text-navy text-xs px-3 py-1">
                  {appointment.repair_status}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Pago</span>
              <Badge variant={isPaid ? "success" : "warning"}>
                {appointment.payment_status === "paid"
                  ? "Pagado"
                  : appointment.payment_status === "not_required"
                    ? "No requerido"
                    : "Pendiente"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Importe</span>
              <span className="font-semibold text-navy">
                {appointment.budget_amount != null ? `${appointment.budget_amount.toFixed(2)} €` : "—"}
              </span>
            </div>
            {appointment.budget_url && (
              <a
                href={appointment.budget_url}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-orange hover:underline"
              >
                Ver presupuesto →
              </a>
            )}
            {appointment.invoice_url && (
              <a
                href={appointment.invoice_url}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-orange hover:underline"
              >
                Ver factura →
              </a>
            )}
          </div>
        </Card>

        {/* Observaciones y recomendaciones */}
        <Card className="lg:col-span-2">
          <h2 className="heading text-lg text-navy mb-4">INFORME DEL TALLER</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 text-sm">
            <div>
              <p className="text-muted-foreground mb-1 font-medium">Observaciones</p>
              <p className="text-foreground whitespace-pre-wrap">
                {appointment.dealer_observations || <span className="text-muted-foreground">—</span>}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground mb-1 font-medium">Recomendaciones</p>
              <p className="text-foreground whitespace-pre-wrap">
                {appointment.dealer_recommendations || <span className="text-muted-foreground">—</span>}
              </p>
            </div>
          </div>
        </Card>

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

        {/* Late invoice upload */}
        {!appointment.invoice_url && (
          <Card className="lg:col-span-2">
            <h2 className="heading text-lg text-navy mb-2">ADJUNTAR FACTURA</h2>
            <p className="text-sm text-muted-foreground mb-4">
              No se adjuntó factura al finalizar la reparación. Puedes subirla ahora.
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
      </div>
    </div>
  );
}
