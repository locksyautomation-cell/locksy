"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Input from "@/components/ui/Input";
import { createClient } from "@/lib/supabase/client";
import { formatDate, formatTime } from "@/lib/utils/dates";
import type { Appointment } from "@/lib/types";

export default function DealerWorkshopPage() {
  const supabase = createClient();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchBy, setSearchBy] = useState("client");

  useEffect(() => {
    async function fetchData() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: dealership } = await supabase
        .from("dealerships")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!dealership) return;

      const { data } = await supabase
        .from("appointments")
        .select(
          "*, vehicle:vehicles(brand, model, plate), client:users(first_name, last_name)"
        )
        .eq("dealership_id", dealership.id)
        .in("status", ["en_curso"])
        .order("created_at", { ascending: false });

      setAppointments((data as Appointment[]) || []);
      setLoading(false);
    }

    fetchData();
  }, [supabase]);

  const filteredAppointments = appointments.filter((apt) => {
    if (!search) return true;
    const q = search.toLowerCase();
    const client = apt.client as unknown as { first_name: string; last_name: string };
    const vehicle = apt.vehicle as unknown as { brand: string; model: string; plate: string };

    switch (searchBy) {
      case "client":
        return `${client?.first_name} ${client?.last_name}`
          .toLowerCase()
          .includes(q);
      case "plate":
        return vehicle?.plate?.toLowerCase().includes(q);
      case "locator":
        return apt.locator.toLowerCase().includes(q);
      case "key_code":
        return apt.key_code.toLowerCase().includes(q);
      default:
        return true;
    }
  });

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

      {/* Filters */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <select
          value={searchBy}
          onChange={(e) => setSearchBy(e.target.value)}
          className="rounded-lg border border-border px-4 py-3 text-sm focus:border-navy focus:outline-none"
        >
          <option value="client">Buscar por: Cliente</option>
          <option value="plate">Buscar por: Matrícula</option>
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

      {filteredAppointments.length === 0 ? (
        <p className="text-center text-muted-foreground py-10">
          No hay reparaciones activas.
        </p>
      ) : (
        <div className="space-y-4">
          {filteredAppointments.map((apt) => {
            const client = apt.client as unknown as { first_name: string; last_name: string };
            const vehicle = apt.vehicle as unknown as { brand: string; model: string; plate: string };

            return (
              <Link key={apt.id} href={`/dealer/workshop/${apt.id}`}>
                <Card className="hover:border-navy/30 transition-colors mb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="heading text-sm text-navy">
                          {apt.locator}
                        </span>
                        <Badge variant="info">En Curso</Badge>
                      </div>
                      <p className="text-sm font-medium">
                        {client?.first_name} {client?.last_name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {vehicle?.brand} {vehicle?.model} - {vehicle?.plate}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDate(apt.scheduled_date)} - {formatTime(apt.scheduled_time)}
                      </p>
                    </div>
                    <svg className="h-5 w-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
