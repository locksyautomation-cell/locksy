"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";
import { formatDate, formatTime } from "@/lib/utils/dates";
import type { Appointment, Attachment } from "@/lib/types";

export default function DealerAppointmentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const supabase = createClient();

  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const { data } = await supabase
        .from("appointments")
        .select(
          "*, vehicle:vehicles(*), client:users(first_name, last_name, email, phone, dni, address)"
        )
        .eq("id", id)
        .single();

      setAppointment(data as Appointment);

      const { data: attData } = await supabase
        .from("attachments")
        .select("*")
        .eq("appointment_id", id);

      setAttachments((attData as Attachment[]) || []);
      setLoading(false);
    }

    fetchData();
  }, [id, supabase]);

  async function handleConfirmPickup() {
    await supabase
      .from("appointments")
      .update({
        status: "en_curso",
        key_picked_up_at: new Date().toISOString(),
        vehicle_in_dealership: true,
      })
      .eq("id", id);

    // Create notification for client
    if (appointment) {
      await supabase.from("notifications").insert({
        user_id: appointment.client_id,
        appointment_id: id,
        type: "status_change",
        title: "Recogida confirmada",
        message: `La recogida de llaves para la cita ${appointment.locator} ha sido confirmada. Su vehículo está en el taller.`,
      });
    }

    router.push("/dealer/workshop");
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
    dni: string;
    address: string;
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
          CITA {appointment.locator}
        </h1>
        <Badge
          variant={
            appointment.status === "pendiente"
              ? "warning"
              : appointment.status === "en_curso"
                ? "info"
                : "success"
          }
        >
          {appointment.status}
        </Badge>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="heading text-lg text-navy mb-4">CLIENTE</h2>
          <dl className="space-y-2">
            <div>
              <dt className="text-sm text-muted-foreground">Nombre</dt>
              <dd>{client?.first_name} {client?.last_name}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Email</dt>
              <dd>{client?.email}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Teléfono</dt>
              <dd>{client?.phone}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">NIF/CIF</dt>
              <dd>{client?.dni}</dd>
            </div>
          </dl>
        </Card>

        <Card>
          <h2 className="heading text-lg text-navy mb-4">CITA</h2>
          <dl className="space-y-2">
            <div>
              <dt className="text-sm text-muted-foreground">Fecha y hora</dt>
              <dd>
                {formatDate(appointment.scheduled_date)} a las{" "}
                {formatTime(appointment.scheduled_time)}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Vehículo</dt>
              <dd>
                {appointment.vehicle?.brand} {appointment.vehicle?.model} -{" "}
                {appointment.vehicle?.plate}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Código llaves</dt>
              <dd className="font-mono font-bold">{appointment.key_code}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Descripción</dt>
              <dd>{appointment.description}</dd>
            </div>
          </dl>
        </Card>

        {attachments.length > 0 && (
          <Card>
            <h2 className="heading text-lg text-navy mb-4">ARCHIVOS</h2>
            <div className="space-y-2">
              {attachments.map((att) => (
                <a
                  key={att.id}
                  href={att.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-lg border border-border p-3 text-sm hover:bg-muted transition-colors"
                >
                  <span className="truncate flex-1">{att.file_name}</span>
                  <Badge>{att.file_type}</Badge>
                </a>
              ))}
            </div>
          </Card>
        )}

        {appointment.status === "pendiente" && (
          <Card>
            <h2 className="heading text-lg text-navy mb-4">ACCIONES</h2>
            <Button
              variant="secondary"
              fullWidth
              onClick={handleConfirmPickup}
            >
              Confirmar Recogida
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
}
