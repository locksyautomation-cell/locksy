"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";
import { formatDate } from "@/lib/utils/dates";
import type { Appointment } from "@/lib/types";

function clientName(apt: Appointment): string {
  if (apt.client_id && apt.client) {
    const c = apt.client as unknown as { first_name: string; last_name: string };
    return `${c.first_name} ${c.last_name}`;
  }
  return `${apt.manual_first_name || ""} ${apt.manual_last_name || ""}`.trim() || "—";
}

function vehicleLabel(apt: Appointment): string {
  if (apt.vehicle_id && apt.vehicle) {
    const v = apt.vehicle as unknown as { brand: string; model: string; plate: string };
    return `${v.brand} ${v.model} · ${v.plate}`;
  }
  return [apt.manual_vehicle_brand, apt.manual_vehicle_model, apt.manual_vehicle_plate]
    .filter(Boolean)
    .join(" ") || "—";
}

export default function DealerHistorialPage() {
  const router = useRouter();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function fetchData() {
      const res = await fetch("/api/dealer/get-appointments?completed=true");
      if (!res.ok) { setLoading(false); return; }
      const { appointments: apts } = await res.json();
      setAppointments((apts as Appointment[]) || []);
      setLoading(false);
    }

    fetchData();
  }, []);

  const filtered = useMemo(() => {
    if (!search) return appointments;
    const q = search.toLowerCase();
    return appointments.filter(
      (apt) =>
        clientName(apt).toLowerCase().includes(q) ||
        vehicleLabel(apt).toLowerCase().includes(q) ||
        apt.locator.toLowerCase().includes(q)
    );
  }, [appointments, search]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin h-8 w-8 border-2 border-navy border-t-transparent rounded-full" />
      </div>
    );
  }

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
        <h1 className="heading text-2xl text-navy">HISTORIAL DE REPARACIONES</h1>
      </div>

      <div className="mb-6">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por cliente, vehículo o nº cita..."
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-center text-muted-foreground py-10">
          No hay reparaciones finalizadas.
        </p>
      ) : (
        <div className="space-y-4">
          {filtered.map((apt) => (
            <Link key={apt.id} href={`/dealer/perfil/historial/${apt.id}`}>
            <Card className="hover:border-navy/30 transition-colors cursor-pointer mb-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="heading text-sm text-navy">{apt.locator}</span>
                    <Badge variant="success">Finalizada</Badge>
                  </div>
                  <p className="text-sm font-medium">{clientName(apt)}</p>
                  <p className="text-sm text-muted-foreground">{vehicleLabel(apt)}</p>
                  {apt.completed_at && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Finalizada el {formatDate(apt.completed_at)}
                    </p>
                  )}
                </div>
                <div className="text-right space-y-1">
                  <p className="font-semibold text-sm">
                    {apt.budget_amount != null ? `${apt.budget_amount.toFixed(2)} €` : "—"}
                  </p>
                  <Badge
                    variant={
                      apt.payment_status === "paid"
                        ? "success"
                        : apt.payment_status === "not_required"
                          ? "info"
                          : "warning"
                    }
                  >
                    {apt.payment_status === "paid"
                      ? "Pagado"
                      : apt.payment_status === "not_required"
                        ? "Sin pago"
                        : "Pendiente"}
                  </Badge>
                  {apt.invoice_url && (
                    <span className="block text-xs text-orange">Factura adjunta</span>
                  )}
                </div>
              </div>
            </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
