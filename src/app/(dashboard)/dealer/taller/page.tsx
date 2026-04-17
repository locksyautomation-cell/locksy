"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Input from "@/components/ui/Input";
import { formatDate, formatTime } from "@/lib/utils/dates";
import type { Appointment } from "@/lib/types";

type SearchField = "client" | "plate" | "vehicle" | "locator" | "key_code";

function clientName(apt: Appointment): string {
  if (apt.client_id && apt.client) {
    const c = apt.client as unknown as { first_name: string; last_name: string };
    return `${c.first_name} ${c.last_name}`;
  }
  return `${apt.manual_first_name || ""} ${apt.manual_last_name || ""}`.trim() || "—";
}

function vehicleTypeEmoji(apt: Appointment): string {
  const vt = (apt.vehicle as unknown as { vehicle_type?: string } | null)?.vehicle_type;
  if (vt === "motos") return "🏍️ ";
  if (vt === "coches") return "🚗 ";
  return "";
}

function vehicleLabel(apt: Appointment): string {
  if (apt.vehicle_id && apt.vehicle) {
    const v = apt.vehicle as unknown as { brand: string; model: string; plate: string };
    return `${vehicleTypeEmoji(apt)}${v.brand} ${v.model} · ${v.plate}`;
  }
  const brand = apt.manual_vehicle_brand || "";
  const model = apt.manual_vehicle_model || "";
  const plate = apt.manual_vehicle_plate || "";
  return [brand, model, plate ? `· ${plate}` : ""].filter(Boolean).join(" ") || "—";
}

function vehiclePlate(apt: Appointment): string {
  if (apt.vehicle_id && apt.vehicle) {
    return (apt.vehicle as unknown as { plate: string }).plate || "";
  }
  return apt.manual_vehicle_plate || "";
}

function vehicleModel(apt: Appointment): string {
  if (apt.vehicle_id && apt.vehicle) {
    const v = apt.vehicle as unknown as { brand: string; model: string };
    return `${v.brand} ${v.model}`;
  }
  return `${apt.manual_vehicle_brand || ""} ${apt.manual_vehicle_model || ""}`.trim();
}

export default function DealerTallerPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchBy, setSearchBy] = useState<SearchField>("client");

  useEffect(() => {
    async function fetchData() {
      const res = await fetch("/api/dealer/get-appointments?in_workshop=true");
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
    return appointments.filter((apt) => {
      switch (searchBy) {
        case "client":
          return clientName(apt).toLowerCase().includes(q);
        case "plate":
          return vehiclePlate(apt).toLowerCase().includes(q);
        case "vehicle":
          return vehicleModel(apt).toLowerCase().includes(q);
        case "locator":
          return apt.locator.toLowerCase().includes(q);
        case "key_code":
          return apt.key_code.toLowerCase().includes(q);
        default:
          return true;
      }
    });
  }, [appointments, search, searchBy]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin h-8 w-8 border-2 border-navy border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="heading text-2xl text-navy mb-6">TALLER</h1>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <select
          value={searchBy}
          onChange={(e) => setSearchBy(e.target.value as SearchField)}
          className="rounded-lg border border-border px-4 py-3 text-sm focus:border-navy focus:outline-none"
        >
          <option value="client">Buscar por: Cliente</option>
          <option value="plate">Buscar por: Matrícula</option>
          <option value="vehicle">Buscar por: Vehículo</option>
          <option value="locator">Buscar por: Nº Cita</option>
          <option value="key_code">Buscar por: Código llaves</option>
        </select>
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar..."
          className="flex-1"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-center text-muted-foreground py-10">
          No hay vehículos en el taller actualmente.
        </p>
      ) : (
        <div className="space-y-4">
          {filtered.map((apt) => (
            <Link key={apt.id} href={`/dealer/taller/${apt.id}`}>
              <Card className="hover:border-navy/30 transition-colors mb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="heading text-sm text-navy">{apt.locator}</span>
                      <Badge variant={apt.status === "finalizada" ? "success" : "info"}>
                        {apt.status === "finalizada" ? "Finalizada" : "En curso"}
                      </Badge>
                      {apt.repair_status && (
                        <span className="text-xs rounded-full bg-navy/10 text-navy px-2 py-0.5">
                          {apt.repair_status}
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium">{clientName(apt)}</p>
                    <p className="text-sm text-muted-foreground">{vehicleLabel(apt)}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDate(apt.scheduled_date)} · {formatTime(apt.scheduled_time)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {apt.budget_status && apt.budget_status !== "pending" && (
                      <Badge variant={apt.budget_status === "accepted" ? "success" : "error"}>
                        {apt.budget_status === "accepted" ? "Presupuesto aceptado" : "Presupuesto rechazado"}
                      </Badge>
                    )}
                    <svg className="h-5 w-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
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
