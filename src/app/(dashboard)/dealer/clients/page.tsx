"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import { createClient } from "@/lib/supabase/client";
import type { User, Vehicle } from "@/lib/types";

interface ClientWithVehicles extends User {
  vehicles: Vehicle[];
}

export default function DealerClientsPage() {
  const supabase = createClient();

  const [clients, setClients] = useState<ClientWithVehicles[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchBy, setSearchBy] = useState("name");

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

      const { data: dcData } = await supabase
        .from("dealership_clients")
        .select("client:users(*, vehicles(*))")
        .eq("dealership_id", dealership.id)
        .eq("active", true);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const clientList = (dcData || [])
        .map((dc: any) => dc.client)
        .filter(Boolean) as ClientWithVehicles[];

      setClients(clientList);
      setLoading(false);
    }

    fetchData();
  }, [supabase]);

  const filteredClients = clients.filter((client) => {
    if (!search) return true;
    const q = search.toLowerCase();

    if (searchBy === "plate") {
      return client.vehicles?.some((v) =>
        v.plate.toLowerCase().includes(q)
      );
    }
    return `${client.first_name} ${client.last_name}`
      .toLowerCase()
      .includes(q);
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
      <h1 className="heading text-2xl text-navy mb-6">CLIENTES</h1>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <select
          value={searchBy}
          onChange={(e) => setSearchBy(e.target.value)}
          className="rounded-lg border border-border px-4 py-3 text-sm focus:border-navy focus:outline-none"
        >
          <option value="name">Buscar por: Nombre</option>
          <option value="plate">Buscar por: Matrícula</option>
        </select>
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar..."
          className="flex-1"
        />
      </div>

      {filteredClients.length === 0 ? (
        <p className="text-center text-muted-foreground py-10">
          No se encontraron clientes.
        </p>
      ) : (
        <div className="space-y-4">
          {filteredClients.map((client) => (
            <Link key={client.id} href={`/dealer/clients/${client.id}`}>
              <Card className="hover:border-navy/30 transition-colors mb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-foreground">
                      {client.first_name} {client.last_name}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {client.email} | {client.phone}
                    </p>
                    {client.vehicles?.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {client.vehicles
                          .map((v) => `${v.brand} ${v.model} (${v.plate})`)
                          .join(", ")}
                      </p>
                    )}
                  </div>
                  <svg className="h-5 w-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
