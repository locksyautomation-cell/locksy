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
import type { Appointment } from "@/lib/types";

export default function WorkshopDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const supabase = createClient();

  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [observations, setObservations] = useState("");
  const [recommendations, setRecommendations] = useState("");
  const [budgetAmount, setBudgetAmount] = useState("");
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);

  useEffect(() => {
    async function fetchData() {
      const { data } = await supabase
        .from("appointments")
        .select(
          "*, vehicle:vehicles(*), client:users(first_name, last_name, email, phone, dni, address)"
        )
        .eq("id", id)
        .single();

      const apt = data as Appointment;
      setAppointment(apt);
      setObservations(apt?.dealer_observations || "");
      setRecommendations(apt?.dealer_recommendations || "");
      setBudgetAmount(apt?.budget_amount?.toString() || "");
      setLoading(false);
    }

    fetchData();
  }, [id, supabase]);

  async function handleSaveObservations() {
    setSaving(true);
    await supabase
      .from("appointments")
      .update({
        dealer_observations: observations,
        dealer_recommendations: recommendations,
      })
      .eq("id", id);
    setSaving(false);
  }

  async function handleSendBudget() {
    if (!appointment || !budgetAmount) return;
    setSaving(true);

    await fetch("/api/dealer/update-appointment", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id,
        budget_amount: parseFloat(budgetAmount),
        budget_status: "pending",
        budget_sent_at: new Date().toISOString(),
      }),
    });

    // Notification is created server-side by /api/dealer/update-appointment
    setAppointment((prev) =>
      prev
        ? { ...prev, budget_amount: parseFloat(budgetAmount), budget_status: "pending" }
        : null
    );
    setSaving(false);
  }

  async function handleFinishRepair() {
    if (!appointment) return;
    setSaving(true);

    let invoiceUrl: string | undefined;

    if (invoiceFile) {
      const ext = invoiceFile.name.split(".").pop();
      const path = `${id}/invoice.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("invoices")
        .upload(path, invoiceFile, { upsert: true });

      if (!uploadError) {
        const {
          data: { publicUrl },
        } = supabase.storage.from("invoices").getPublicUrl(path);
        invoiceUrl = publicUrl;
      }
    }

    await supabase
      .from("appointments")
      .update({
        status: "finalizada",
        completed_at: new Date().toISOString(),
        dealer_observations: observations,
        dealer_recommendations: recommendations,
        budget_amount: budgetAmount ? parseFloat(budgetAmount) : undefined,
        ...(invoiceUrl && { invoice_url: invoiceUrl }),
      })
      .eq("id", id);

    await supabase.from("notifications").insert({
      user_id: appointment.client_id,
      appointment_id: id,
      type: "repair_completed",
      title: "Reparación finalizada",
      message: `La reparación de su vehículo (cita ${appointment.locator}) ha sido finalizada.`,
    });

    router.push("/dealer/workshop");
    setSaving(false);
  }

  async function handleConfirmReturn() {
    if (!appointment) return;
    setSaving(true);

    await supabase
      .from("appointments")
      .update({
        key_returned_at: new Date().toISOString(),
        vehicle_in_dealership: false,
      })
      .eq("id", id);

    router.push("/dealer/workshop");
    setSaving(false);
  }

  if (loading || !appointment) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin h-8 w-8 border-2 border-navy border-t-transparent rounded-full" />
      </div>
    );
  }

  const client = appointment.client as unknown as {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
  };

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => router.back()} className="text-muted-foreground hover:text-foreground">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="heading text-2xl text-navy">
          REPARACIÓN {appointment.locator}
        </h1>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Client & Vehicle info */}
        <Card>
          <h2 className="heading text-lg text-navy mb-4">CLIENTE Y VEHÍCULO</h2>
          <dl className="space-y-2 text-sm">
            <div>
              <dt className="text-muted-foreground">Cliente</dt>
              <dd>{client?.first_name} {client?.last_name}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Contacto</dt>
              <dd>{client?.email} | {client?.phone}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Vehículo</dt>
              <dd>
                {appointment.vehicle?.brand} {appointment.vehicle?.model} -{" "}
                {appointment.vehicle?.plate}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Fecha cita</dt>
              <dd>
                {formatDate(appointment.scheduled_date)} a las{" "}
                {formatTime(appointment.scheduled_time)}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Descripción</dt>
              <dd>{appointment.description}</dd>
            </div>
          </dl>
        </Card>

        {/* Status & Actions */}
        <Card>
          <h2 className="heading text-lg text-navy mb-4">ESTADO</h2>

          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Vehículo en concesionario:</span>
              <Badge variant={appointment.vehicle_in_dealership ? "success" : "error"}>
                {appointment.vehicle_in_dealership ? "Sí" : "No"}
              </Badge>
            </div>

            {appointment.budget_status && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Presupuesto:</span>
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
                      : "Pendiente"}
                </Badge>
              </div>
            )}

            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Pago:</span>
              <Badge
                variant={
                  appointment.payment_status === "paid" ? "success" : "warning"
                }
              >
                {appointment.payment_status === "paid" ? "Pagado" : "Pendiente"}
              </Badge>
            </div>
          </div>
        </Card>

        {/* Observations */}
        <Card>
          <h2 className="heading text-lg text-navy mb-4">OBSERVACIONES</h2>
          <div className="space-y-4">
            <Textarea
              label="Observaciones"
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              placeholder="Escriba las observaciones..."
            />
            <Textarea
              label="Recomendaciones"
              value={recommendations}
              onChange={(e) => setRecommendations(e.target.value)}
              placeholder="Escriba las recomendaciones..."
            />
            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveObservations}
              loading={saving}
            >
              Guardar Observaciones
            </Button>
          </div>
        </Card>

        {/* Budget */}
        <Card>
          <h2 className="heading text-lg text-navy mb-4">PRESUPUESTO</h2>
          <div className="space-y-4">
            <Input
              label="Importe (€)"
              type="number"
              step="0.01"
              value={budgetAmount}
              onChange={(e) => setBudgetAmount(e.target.value)}
              placeholder="0.00"
            />
            <Button
              variant="secondary"
              size="sm"
              onClick={handleSendBudget}
              loading={saving}
              disabled={!budgetAmount}
            >
              Enviar Presupuesto
            </Button>
          </div>
        </Card>

        {/* Finalize */}
        <Card className="lg:col-span-2">
          <h2 className="heading text-lg text-navy mb-4">FINALIZAR REPARACIÓN</h2>
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium">
                Adjuntar factura
              </label>
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

            <div className="flex gap-4">
              <Button
                variant="secondary"
                onClick={handleFinishRepair}
                loading={saving}
              >
                Marcar como Finalizada
              </Button>

              {appointment.status === "finalizada" &&
                appointment.payment_status === "paid" && (
                  <Button
                    variant="primary"
                    onClick={handleConfirmReturn}
                    loading={saving}
                  >
                    Confirmar Retirada
                  </Button>
                )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
