"use client";

import { useState, useEffect } from "react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";
import { createClient } from "@/lib/supabase/client";
import { formatDate, formatTime, generateTimeSlots } from "@/lib/utils/dates";
import { generateKeyCode } from "@/lib/utils/keycode";
import type { Appointment, User } from "@/lib/types";

export default function DealerAppointmentsPage() {
  const supabase = createClient();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [dealershipId, setDealershipId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );

  // Manual appointment form
  const [clients, setClients] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClient, setSelectedClient] = useState<User | null>(null);
  const [manualForm, setManualForm] = useState({
    first_name: "",
    last_name: "",
    dni: "",
    email: "",
    phone: "",
    address: "",
    vehicle_id: "",
    scheduled_date: "",
    scheduled_time: "",
    description: "",
  });
  const [clientVehicles, setClientVehicles] = useState<{ value: string; label: string }[]>([]);
  const [saving, setSaving] = useState(false);

  // Block form
  const [blockForm, setBlockForm] = useState({
    block_date: "",
    start_time: "",
    end_time: "",
    reason: "",
  });

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

      if (!dealership) {
        setLoading(false);
        return;
      }
      setDealershipId(dealership.id);

      const { data: appointmentData } = await supabase
        .from("appointments")
        .select("*, vehicle:vehicles(brand, model, plate), client:users(first_name, last_name)")
        .eq("dealership_id", dealership.id)
        .order("scheduled_date", { ascending: true });

      setAppointments((appointmentData as Appointment[]) || []);
      setLoading(false);
    }

    fetchData();
  }, [supabase]);

  // Search clients
  useEffect(() => {
    if (searchQuery.length < 2) {
      setClients([]);
      return;
    }

    const timeout = setTimeout(async () => {
      const { data } = await supabase
        .from("dealership_clients")
        .select("client:users(id, first_name, last_name, email, phone, dni, address)")
        .eq("dealership_id", dealershipId)
        .eq("active", true);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const clientList = (data || [])
        .map((dc: any) => dc.client)
        .filter(
          (c: any) =>
            c &&
            (`${c.first_name} ${c.last_name}`
              .toLowerCase()
              .includes(searchQuery.toLowerCase()))
        ) as User[];

      setClients(clientList);
    }, 300);

    return () => clearTimeout(timeout);
  }, [searchQuery, dealershipId, supabase]);

  async function selectClient(client: User) {
    setSelectedClient(client);
    setManualForm((prev) => ({
      ...prev,
      first_name: client.first_name,
      last_name: client.last_name,
      dni: client.dni || "",
      email: client.email,
      phone: client.phone || "",
      address: client.address || "",
    }));
    setSearchQuery("");
    setClients([]);

    // Fetch client vehicles
    const { data: vehicleData } = await supabase
      .from("vehicles")
      .select("id, brand, model, plate")
      .eq("client_id", client.id);

    setClientVehicles(
      (vehicleData || []).map((v: { id: string; brand: string; model: string; plate: string }) => ({
        value: v.id,
        label: `${v.brand} ${v.model} - ${v.plate}`,
      }))
    );
  }

  async function handleCreateManualAppointment() {
    if (!selectedClient) return;
    setSaving(true);

    // Generate locator
    const { data: lastApt } = await supabase
      .from("appointments")
      .select("locator")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    let locatorNum = 0;
    if (lastApt?.locator) {
      locatorNum =
        (parseInt(lastApt.locator.replace("#", ""), 10) + 1) % 10000;
    }
    const locator = `#${locatorNum.toString().padStart(4, "0")}`;

    const { error } = await supabase.from("appointments").insert({
      dealership_id: dealershipId,
      client_id: selectedClient.id,
      vehicle_id: manualForm.vehicle_id,
      locator,
      key_code: generateKeyCode(),
      scheduled_date: manualForm.scheduled_date,
      scheduled_time: manualForm.scheduled_time,
      description: manualForm.description,
    });

    if (!error) {
      setShowAddModal(false);
      // Refresh
      window.location.reload();
    }
    setSaving(false);
  }

  async function handleCreateBlock() {
    setSaving(true);
    await supabase.from("schedule_blocks").insert({
      dealership_id: dealershipId,
      ...blockForm,
    });
    setShowBlockModal(false);
    setSaving(false);
  }

  // Group appointments by date for calendar-like view
  const groupedByDate = appointments.reduce(
    (acc, apt) => {
      const date = apt.scheduled_date;
      if (!acc[date]) acc[date] = [];
      acc[date].push(apt);
      return acc;
    },
    {} as Record<string, Appointment[]>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin h-8 w-8 border-2 border-navy border-t-transparent rounded-full" />
      </div>
    );
  }

  const todayStr = new Date().toISOString().split("T")[0];
  const nowStr = `${String(new Date().getHours()).padStart(2, "0")}:${String(new Date().getMinutes()).padStart(2, "0")}`;
  const allTimeSlots = generateTimeSlots();
  const timeSlots = manualForm.scheduled_date === todayStr
    ? allTimeSlots.filter((s) => s > nowStr)
    : allTimeSlots;

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="heading text-2xl text-navy">CITAS</h1>
        <div className="flex gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowBlockModal(true)}
          >
            Gestionar Horarios
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowAddModal(true)}
          >
            Añadir Cita
          </Button>
        </div>
      </div>

      {/* Date navigation */}
      <div className="mb-6">
        <Input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
        />
      </div>

      {/* Calendar view - list by date */}
      {Object.keys(groupedByDate).length === 0 ? (
        <p className="text-center text-muted-foreground py-10">
          No hay citas programadas.
        </p>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedByDate)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, apts]) => (
              <div key={date}>
                <h2 className="heading text-sm text-muted-foreground mb-3">
                  {formatDate(date)}
                </h2>
                <div className="space-y-3">
                  {apts.map((apt) => (
                    <a
                      key={apt.id}
                      href={`/dealer/appointments/${apt.id}`}
                    >
                      <Card className="hover:border-navy/30 transition-colors mb-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="heading text-sm text-navy">
                                {apt.locator}
                              </span>
                              <span className="text-sm text-foreground">
                                {formatTime(apt.scheduled_time)}
                              </span>
                              <Badge
                                variant={
                                  apt.status === "pendiente"
                                    ? "warning"
                                    : apt.status === "en_curso"
                                      ? "info"
                                      : "success"
                                }
                              >
                                {apt.status}
                              </Badge>
                            </div>
                            <p className="text-sm text-foreground">
                              {(apt.client as unknown as { first_name: string; last_name: string })?.first_name}{" "}
                              {(apt.client as unknown as { first_name: string; last_name: string })?.last_name}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {(apt.vehicle as unknown as { brand: string; model: string; plate: string })?.brand}{" "}
                              {(apt.vehicle as unknown as { brand: string; model: string; plate: string })?.model} -{" "}
                              {(apt.vehicle as unknown as { brand: string; model: string; plate: string })?.plate}
                            </p>
                          </div>
                          <svg className="h-5 w-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </Card>
                    </a>
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Add Appointment Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="AÑADIR CITA"
      >
        <div className="space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Client search */}
          <div className="relative">
            <Input
              label="Buscar cliente"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Escribe el nombre del cliente..."
            />
            {clients.length > 0 && (
              <div className="absolute z-10 mt-1 w-full rounded-lg border border-border bg-white shadow-lg">
                {clients.map((c) => (
                  <button
                    key={c.id}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-muted"
                    onClick={() => selectClient(c)}
                  >
                    {c.first_name} {c.last_name} - {c.email}
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedClient && (
            <div className="rounded-lg bg-muted p-3 text-sm">
              <strong>{selectedClient.first_name} {selectedClient.last_name}</strong>
              <br />
              {selectedClient.email}
            </div>
          )}

          {selectedClient && clientVehicles.length > 0 && (
            <Select
              label="Vehículo"
              value={manualForm.vehicle_id}
              onChange={(e) =>
                setManualForm((prev) => ({
                  ...prev,
                  vehicle_id: e.target.value,
                }))
              }
              options={clientVehicles}
              placeholder="Selecciona un vehículo"
            />
          )}

          <Input
            label="Fecha"
            type="date"
            value={manualForm.scheduled_date}
            onChange={(e) =>
              setManualForm((prev) => ({
                ...prev,
                scheduled_date: e.target.value,
              }))
            }
            min={new Date().toISOString().split("T")[0]}
          />

          <Select
            label="Hora"
            value={manualForm.scheduled_time}
            onChange={(e) =>
              setManualForm((prev) => ({
                ...prev,
                scheduled_time: e.target.value,
              }))
            }
            options={timeSlots.map((s) => ({ value: s, label: s }))}
            placeholder="Selecciona una hora"
          />

          <Textarea
            label="Descripción del problema"
            value={manualForm.description}
            onChange={(e) =>
              setManualForm((prev) => ({
                ...prev,
                description: e.target.value,
              }))
            }
          />

          <div className="flex gap-4 pt-2">
            <Button
              variant="outline"
              fullWidth
              onClick={() => setShowAddModal(false)}
            >
              Descartar
            </Button>
            <Button
              variant="secondary"
              fullWidth
              onClick={handleCreateManualAppointment}
              loading={saving}
              disabled={!selectedClient || !manualForm.vehicle_id}
            >
              Confirmar
            </Button>
          </div>
        </div>
      </Modal>

      {/* Block Schedule Modal */}
      <Modal
        isOpen={showBlockModal}
        onClose={() => setShowBlockModal(false)}
        title="GESTIONAR HORARIOS"
      >
        <div className="space-y-4">
          <Input
            label="Fecha"
            type="date"
            value={blockForm.block_date}
            onChange={(e) =>
              setBlockForm((prev) => ({
                ...prev,
                block_date: e.target.value,
              }))
            }
          />
          <Select
            label="Hora inicio"
            value={blockForm.start_time}
            onChange={(e) =>
              setBlockForm((prev) => ({
                ...prev,
                start_time: e.target.value,
              }))
            }
            options={timeSlots.map((s) => ({ value: s, label: s }))}
            placeholder="Desde"
          />
          <Select
            label="Hora fin"
            value={blockForm.end_time}
            onChange={(e) =>
              setBlockForm((prev) => ({
                ...prev,
                end_time: e.target.value,
              }))
            }
            options={timeSlots.map((s) => ({ value: s, label: s }))}
            placeholder="Hasta"
          />
          <Input
            label="Motivo (opcional)"
            value={blockForm.reason}
            onChange={(e) =>
              setBlockForm((prev) => ({ ...prev, reason: e.target.value }))
            }
          />
          <div className="flex gap-4 pt-2">
            <Button
              variant="outline"
              fullWidth
              onClick={() => setShowBlockModal(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="secondary"
              fullWidth
              onClick={handleCreateBlock}
              loading={saving}
            >
              Bloquear Franja
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
