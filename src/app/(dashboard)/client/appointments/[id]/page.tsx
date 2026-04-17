"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { formatDate, formatTime } from "@/lib/utils/dates";
import type { Appointment, Attachment } from "@/lib/types";

export default function AppointmentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState("");

  useEffect(() => {
    async function fetchAppointment() {
      const res = await fetch(`/api/client/get-appointment?id=${id}`);
      if (res.ok) {
        const { appointment: apt, attachments: atts } = await res.json();
        setAppointment(apt as Appointment);
        setAttachments((atts as Attachment[]) || []);
      }
      setLoading(false);
    }
    fetchAppointment();

    // Re-fetch when the user returns to this tab (e.g. after signing in a new tab)
    const handleVisibility = () => {
      if (document.visibilityState === "visible") fetchAppointment();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [id]);

  async function handlePayment() {
    setPaying(true);
    setPayError("");
    try {
      const res = await fetch("/api/payments/create-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointment_id: id }),
      });

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setPayError(data.error || "No se pudo iniciar el pago. Inténtalo de nuevo.");
        setPaying(false);
      }
    } catch {
      setPayError("Error de conexión. Inténtalo de nuevo.");
      setPaying(false);
    }
  }

  if (loading || !appointment) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin h-8 w-8 border-2 border-navy border-t-transparent rounded-full" />
      </div>
    );
  }

  const statusConfig: Record<string, { variant: "warning" | "info" | "success" | "error" | "default"; label: string }> = {
    pendiente_aprobacion: { variant: "warning", label: "Pendiente de aprobación" },
    pendiente: { variant: "warning", label: "Pendiente" },
    en_curso: { variant: "info", label: "En Curso" },
    finalizada: { variant: "success", label: "Finalizada" },
    rechazada: { variant: "error", label: "Rechazada" },
  };

  const badge = statusConfig[appointment.status] ?? { variant: "default" as const, label: appointment.status };

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => router.push("/client/appointments")}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Volver
        </button>
        <h1 className="heading text-2xl text-navy">
          CITA {appointment.locator}
        </h1>
        <Badge variant={badge.variant}>{badge.label}</Badge>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Appointment Info */}
        <Card>
          <h2 className="heading text-lg text-navy mb-4">
            INFORMACIÓN DE LA CITA
          </h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm text-muted-foreground">Fecha y hora</dt>
              <dd className="text-foreground">
                {formatDate(appointment.scheduled_date)} a las{" "}
                {formatTime(appointment.scheduled_time)}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Código de recogida de llaves</dt>
              <dd className="font-mono text-lg font-bold text-navy">
                {appointment.key_code}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Descripción</dt>
              <dd className="text-foreground">{appointment.description}</dd>
            </div>
          </dl>
        </Card>

        {/* Vehicle Info */}
        <Card>
          <h2 className="heading text-lg text-navy mb-4">VEHÍCULO</h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm text-muted-foreground">Marca / Modelo</dt>
              <dd className="text-foreground">
                {appointment.vehicle?.brand} {appointment.vehicle?.model}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Matrícula</dt>
              <dd className="text-foreground">
                {appointment.vehicle?.plate}
              </dd>
            </div>
          </dl>
        </Card>

        {/* Dealer observations (only when finished) */}
        {appointment.status === "finalizada" && (
          <Card>
            <h2 className="heading text-lg text-navy mb-4">
              OBSERVACIONES DEL TALLER
            </h2>
            <p className="text-foreground mb-4">
              {appointment.dealer_observations || "Sin observaciones."}
            </p>
            {appointment.dealer_recommendations && (
              <>
                <h3 className="text-sm font-semibold text-navy mb-2">
                  Recomendaciones
                </h3>
                <p className="text-foreground">
                  {appointment.dealer_recommendations}
                </p>
              </>
            )}
          </Card>
        )}

        {/* Attachments */}
        {attachments.length > 0 && (
          <Card>
            <h2 className="heading text-lg text-navy mb-4">
              ARCHIVOS ADJUNTOS
            </h2>
            <div className="space-y-2">
              {attachments.map((att) => (
                <a
                  key={att.id}
                  href={att.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-lg border border-border p-3 hover:bg-muted transition-colors"
                >
                  <svg className="h-5 w-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                  <span className="text-sm truncate">{att.file_name}</span>
                  <Badge>{att.file_type}</Badge>
                </a>
              ))}
            </div>
          </Card>
        )}

        {/* Repair Order section */}
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
                <dt className="text-muted-foreground">Aceptación de reparaciones</dt>
                <dd className={appointment.order_accepted_at ? "text-green-600 font-medium" : "text-orange font-medium"}>
                  {appointment.order_accepted_at
                    ? `✓ Aceptado el ${new Date(appointment.order_accepted_at).toLocaleDateString("es-ES")}`
                    : "Pendiente de tu aceptación"}
                </dd>
              </div>
              {appointment.order_accepted_at && (
                <div>
                  <dt className="text-muted-foreground">Aceptación de recogida</dt>
                  <dd className={appointment.order_return_accepted_at ? "text-green-600 font-medium" : "text-muted-foreground"}>
                    {appointment.order_return_accepted_at
                      ? `✓ Aceptado el ${new Date(appointment.order_return_accepted_at).toLocaleDateString("es-ES")}`
                      : "Pendiente"}
                  </dd>
                </div>
              )}
              {appointment.repair_acceptance_token && !appointment.order_accepted_at && (
                <div className="pt-2">
                  <Button
                    variant="secondary"
                    onClick={() => window.open(`/orden/${appointment.repair_acceptance_token}`, "_blank")}
                  >
                    Revisar y aceptar orden
                  </Button>
                </div>
              )}
              {appointment.repair_acceptance_token &&
                appointment.order_accepted_at &&
                !appointment.order_return_accepted_at &&
                (appointment.payment_status === "paid" || appointment.payment_status === "not_required") && (
                <div className="pt-2">
                  <Button
                    variant="secondary"
                    onClick={() => window.open(`/orden/${appointment.repair_acceptance_token}`, "_blank")}
                  >
                    Confirmar recogida del vehículo
                  </Button>
                </div>
              )}
            </dl>
          </Card>
        )}

        {/* Payment section (only when completed) */}
        {appointment.status === "finalizada" && appointment.budget_amount && (
          <Card>
            <h2 className="heading text-lg text-navy mb-4">PAGO</h2>
            <div className="text-center">
              <p className="text-3xl font-bold text-navy mb-2">
                {appointment.budget_amount.toFixed(2)}€
              </p>
              {appointment.payment_status === "paid" ? (
                <Badge variant="success">Pagado</Badge>
              ) : appointment.payment_status === "not_required" ? (
                <Badge variant="default">Pago no requerido</Badge>
              ) : (
                <div className="mt-4">
                  <Button
                    variant="secondary"
                    onClick={handlePayment}
                    loading={paying}
                  >
                    Pagar Reparación
                  </Button>
                  {payError && (
                    <p className="text-sm text-error mt-2">{payError}</p>
                  )}
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Invoice — always shown when repair is finalizada */}
        {appointment.status === "finalizada" && (
          <Card>
            <h2 className="heading text-lg text-navy mb-4">FACTURA</h2>
            {appointment.invoice_url ? (
              <a
                href={appointment.invoice_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-lg border border-border p-4 hover:bg-muted transition-colors group"
              >
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-navy/10 group-hover:bg-navy/20 transition-colors">
                  <svg className="h-5 w-5 text-navy" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">Factura de reparación</p>
                  <p className="text-xs text-muted-foreground">Haz clic para ver o descargar</p>
                </div>
                <svg className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </a>
            ) : (
              <p className="text-sm text-muted-foreground">
                La factura aún no está disponible.
              </p>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
