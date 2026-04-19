"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Tabs from "@/components/ui/Tabs";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { formatDate, formatTime } from "@/lib/utils/dates";
import type { Appointment } from "@/lib/types";

const appointmentTabs = [
  { id: "pendiente", label: "Pendientes" },
  { id: "en_curso", label: "En Curso" },
  { id: "finalizada", label: "Finalizadas" },
];

const statusBadge: Record<string, { variant: "warning" | "info" | "success" | "error" | "default"; label: string }> = {
  pendiente_aprobacion: { variant: "warning", label: "Pendiente de aprobación" },
  pendiente: { variant: "warning", label: "Pendiente" },
  en_curso: { variant: "info", label: "En Curso" },
  finalizada: { variant: "success", label: "Finalizada" },
  rechazada: { variant: "error", label: "Rechazada" },
};

function getRepairBadge(appointment: Appointment): { variant: "warning" | "info" | "success" | "error" | "default"; label: string } {
  if (appointment.repair_status && appointment.status !== "finalizada") {
    return { variant: "info", label: appointment.repair_status };
  }
  return statusBadge[appointment.status] ?? { variant: "default", label: appointment.status };
}

export default function ClientAppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState("default");

  useEffect(() => {
    async function fetchAppointments() {
      const res = await fetch("/api/client/get-appointments");
      if (res.ok) {
        const { appointments: data } = await res.json();
        setAppointments((data as Appointment[]) || []);
      }
      setLoading(false);
    }
    fetchAppointments();
  }, []);

  function getFilteredAppointments(status: string) {
    let filtered = appointments.filter((a) => a.status === status);

    if (status === "finalizada") {
      switch (sortBy) {
        case "date_asc":
          filtered.sort(
            (a, b) =>
              new Date(a.scheduled_date).getTime() -
              new Date(b.scheduled_date).getTime()
          );
          break;
        case "date_desc":
          filtered.sort(
            (a, b) =>
              new Date(b.scheduled_date).getTime() -
              new Date(a.scheduled_date).getTime()
          );
          break;
        case "amount_asc":
          filtered.sort(
            (a, b) => (a.budget_amount || 0) - (b.budget_amount || 0)
          );
          break;
        case "amount_desc":
          filtered.sort(
            (a, b) => (b.budget_amount || 0) - (a.budget_amount || 0)
          );
          break;
        default:
          filtered.sort((a, b) => {
            const numA = parseInt(a.locator.split("-")[1] || "0", 10);
            const numB = parseInt(b.locator.split("-")[1] || "0", 10);
            return numB - numA;
          });
      }
    }

    return filtered;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin h-8 w-8 border-2 border-navy border-t-transparent rounded-full" />
      </div>
    );
  }

  const pendingApproval = appointments.filter((a) => a.status === "pendiente_aprobacion");

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="heading text-2xl text-navy">CITAS</h1>
        <Link href="/client/appointments/new">
          <Button variant="secondary" size="sm">
            Nueva Cita
          </Button>
        </Link>
      </div>

      {/* Sección visible solo cuando hay solicitudes pendientes de aprobación */}
      {pendingApproval.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <h2 className="heading text-base text-navy">SOLICITUDES PENDIENTES DE APROBACIÓN</h2>
            <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-orange text-white text-xs font-bold">
              {pendingApproval.length}
            </span>
          </div>
          <div className="space-y-3">
            {pendingApproval.map((apt) => (
              <Link key={apt.id} href={`/client/appointments/${apt.id}`}>
                <Card className="border-l-4 border-l-orange hover:border-navy/30 transition-colors">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <span className="heading text-sm text-navy">{apt.locator}</span>
                        <Badge variant="warning">Pendiente de aprobación</Badge>
                      </div>
                      {apt.dealership && (
                        <p className="text-sm font-medium text-orange mb-1">
                          {(apt.dealership as unknown as { name: string }).name}
                        </p>
                      )}
                      <p className="text-sm text-foreground mb-1">
                        {apt.vehicle?.brand} {apt.vehicle?.model} — {apt.vehicle?.plate}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(apt.scheduled_date)} a las {formatTime(apt.scheduled_time)}
                      </p>
                    </div>
                    <svg className="h-5 w-5 text-orange flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  {apt.description && (
                    <p className="mt-2 text-sm text-muted-foreground line-clamp-1">{apt.description}</p>
                  )}
                  <p className="mt-2 text-xs text-muted-foreground italic">
                    El concesionario debe aceptar o rechazar esta solicitud antes de confirmar la cita.
                  </p>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      <Tabs tabs={appointmentTabs}>
        {(activeTab) => {
          const filtered = getFilteredAppointments(activeTab);

          if (activeTab === "finalizada") {
            return (
              <div>
                {/* Sort controls */}
                <div className="mb-4 flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    Ordenar por:
                  </span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="rounded-lg border border-border px-3 py-1.5 text-sm focus:border-navy focus:outline-none"
                  >
                    <option value="default">Por defecto</option>
                    <option value="date_asc">Fecha más cercana</option>
                    <option value="date_desc">Fecha más lejana</option>
                    <option value="amount_asc">Importe ascendente</option>
                    <option value="amount_desc">Importe descendente</option>
                  </select>
                </div>

                {filtered.length === 0 ? (
                  <p className="text-center text-muted-foreground py-10">
                    No tienes citas finalizadas.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {filtered.map((apt) => (
                      <AppointmentCard key={apt.id} appointment={apt} />
                    ))}
                  </div>
                )}
              </div>
            );
          }

          return filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-10">
              {activeTab === "pendiente"
                ? "No tienes citas pendientes."
                : "No tienes citas en curso."}
            </p>
          ) : (
            <div className="space-y-4">
              {filtered.map((apt) => (
                <AppointmentCard key={apt.id} appointment={apt} />
              ))}
            </div>
          );
        }}
      </Tabs>
    </div>
  );
}

function AppointmentCard({ appointment }: { appointment: Appointment }) {
  const badge = getRepairBadge(appointment);

  return (
    <Link href={`/client/appointments/${appointment.id}`}>
      <Card className="hover:border-navy/30 transition-colors">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="heading text-sm text-navy">
                {appointment.locator}
              </span>
              <Badge variant={badge.variant}>{badge.label}</Badge>
            </div>
            {appointment.dealership && (
              <p className="text-sm font-medium text-orange mb-1">
                {(appointment.dealership as unknown as { name: string }).name}
              </p>
            )}
            <p className="text-sm text-foreground mb-1">
              {appointment.vehicle?.brand} {appointment.vehicle?.model} -{" "}
              {appointment.vehicle?.plate}
            </p>
            <p className="text-sm text-muted-foreground">
              {formatDate(appointment.scheduled_date)} a las{" "}
              {formatTime(appointment.scheduled_time)}
            </p>
          </div>
        </div>
        {appointment.description && (
          <p className="mt-3 text-sm text-muted-foreground line-clamp-2">
            {appointment.description}
          </p>
        )}
      </Card>
    </Link>
  );
}
