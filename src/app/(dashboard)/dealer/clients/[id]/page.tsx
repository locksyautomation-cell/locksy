"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";
import { formatDate } from "@/lib/utils/dates";
import type { User, Vehicle, Appointment } from "@/lib/types";

export default function DealerClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = params.id as string;
  const supabase = createClient();

  const [client, setClient] = useState<User | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [dealershipId, setDealershipId] = useState("");

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

      if (dealership) setDealershipId(dealership.id);

      const { data: userData } = await supabase
        .from("users")
        .select("*")
        .eq("id", clientId)
        .single();

      setClient(userData as User);

      const { data: vehicleData } = await supabase
        .from("vehicles")
        .select("*")
        .eq("client_id", clientId);

      setVehicles((vehicleData as Vehicle[]) || []);

      if (dealership) {
        const { data: aptData } = await supabase
          .from("appointments")
          .select("*, vehicle:vehicles(brand, model, plate)")
          .eq("client_id", clientId)
          .eq("dealership_id", dealership.id)
          .order("scheduled_date", { ascending: false });

        setAppointments((aptData as Appointment[]) || []);
      }

      setLoading(false);
    }

    fetchData();
  }, [clientId, supabase]);

  async function handleUnlinkClient() {
    if (
      !confirm(
        "¿Está seguro de que desea desvincular este cliente? El cliente no podrá acceder a los servicios desde su perfil, pero la información guardada se mantendrá."
      )
    )
      return;

    await supabase
      .from("dealership_clients")
      .update({ active: false })
      .eq("dealership_id", dealershipId)
      .eq("client_id", clientId);

    router.push("/dealer/clients");
  }

  if (loading || !client) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin h-8 w-8 border-2 border-navy border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => router.back()} className="text-muted-foreground hover:text-foreground">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="heading text-2xl text-navy">
          {client.first_name} {client.last_name}
        </h1>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="heading text-lg text-navy mb-4">INFORMACIÓN</h2>
          <dl className="space-y-2 text-sm">
            <div>
              <dt className="text-muted-foreground">NIF/CIF</dt>
              <dd>{client.dni}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Teléfono</dt>
              <dd>{client.phone}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Email</dt>
              <dd>{client.email}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Dirección</dt>
              <dd>{client.address}</dd>
            </div>
          </dl>
          <div className="mt-6">
            <Button variant="danger" size="sm" onClick={handleUnlinkClient}>
              Desvincular Cliente
            </Button>
          </div>
        </Card>

        <Card>
          <h2 className="heading text-lg text-navy mb-4">VEHÍCULOS</h2>
          {vehicles.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin vehículos registrados.</p>
          ) : (
            <div className="space-y-3">
              {vehicles.map((v) => (
                <div key={v.id} className="rounded-lg border border-border p-3">
                  <p className="font-medium">
                    {v.brand} {v.model}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {v.plate}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="lg:col-span-2">
          <h2 className="heading text-lg text-navy mb-4">
            HISTORIAL DE REPARACIONES
          </h2>
          {appointments.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin historial de reparaciones.</p>
          ) : (
            <div className="space-y-3">
              {appointments.map((apt) => {
                const vehicle = apt.vehicle as unknown as { brand: string; model: string; plate: string };
                return (
                  <div
                    key={apt.id}
                    className="flex items-center justify-between rounded-lg border border-border p-4"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="heading text-sm text-navy">
                          {apt.locator}
                        </span>
                        <Badge
                          variant={
                            apt.status === "finalizada"
                              ? "success"
                              : apt.status === "en_curso"
                                ? "info"
                                : "warning"
                          }
                        >
                          {apt.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {vehicle?.brand} {vehicle?.model} - {vehicle?.plate}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(apt.scheduled_date)}
                      </p>
                    </div>
                    <div className="text-right">
                      {apt.budget_amount && (
                        <p className="font-semibold">{apt.budget_amount.toFixed(2)}€</p>
                      )}
                      {apt.invoice_url && (
                        <a
                          href={apt.invoice_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-orange hover:text-orange-dark"
                        >
                          Ver factura
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
