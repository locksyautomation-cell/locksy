"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Select from "@/components/ui/Select";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import Button from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";
import { generateTimeSlots } from "@/lib/utils/dates";
import type { Vehicle, Dealership, ScheduleBlock } from "@/lib/types";

export default function NewAppointmentPage() {
  const router = useRouter();
  const supabase = createClient();

  const [allVehicles, setAllVehicles] = useState<Vehicle[]>([]);
  const [dealerships, setDealerships] = useState<Dealership[]>([]);
  const [scheduleBlocks, setScheduleBlocks] = useState<ScheduleBlock[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [files, setFiles] = useState<File[]>([]);

  const [form, setForm] = useState({
    dealership_id: "",
    vehicle_id: "",
    scheduled_date: "",
    scheduled_time: "",
    description: "",
  });

  const [brandWarning, setBrandWarning] = useState("");

  useEffect(() => {
    async function fetchData() {
      const res = await fetch("/api/client/get-profile");
      if (!res.ok) return;
      const { vehicles: vehicleData, dealerships: dcData } = await res.json();

      setAllVehicles(vehicleData || []);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const dealershipList = (dcData || []).map((dc: any) => dc.dealership).filter(Boolean) as Dealership[];
      setDealerships(dealershipList);

      if (dealershipList.length === 1) {
        setForm((prev) => ({ ...prev, dealership_id: dealershipList[0].id }));
      }
    }
    fetchData();
  }, []);

  // Derive filtered vehicle list based on selected dealer's vehicle_type
  const selectedDealership = dealerships.find((d) => d.id === form.dealership_id);
  const dealerType = selectedDealership?.vehicle_type;
  const vehicles = dealerType === "motos" || dealerType === "coches"
    ? allVehicles.filter((v) => v.vehicle_type === dealerType)
    : allVehicles; // 'ambos' or no type → show all

  // Comprobar compatibilidad de marca cuando cambia vehículo o concesionario
  useEffect(() => {
    setBrandWarning("");
    if (!form.vehicle_id || !form.dealership_id) return;

    const vehicle = allVehicles.find((v) => v.id === form.vehicle_id);
    if (!vehicle) return;

    fetch(`/api/client/get-dealership-brands?dealership_id=${form.dealership_id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.accepts_all || !data.accepted_brands?.length) return;
        const accepted: string[] = data.accepted_brands;
        if (!accepted.some((b) => b.toLowerCase() === vehicle.brand.toLowerCase())) {
          setBrandWarning(
            `Este taller no repara vehículos de la marca "${vehicle.brand}". Por favor, selecciona otro vehículo o un concesionario diferente.`
          );
        }
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.vehicle_id, form.dealership_id]);

  // Fetch schedule blocks when dealership or date changes
  useEffect(() => {
    async function fetchBlocks() {
      if (!form.dealership_id || !form.scheduled_date) return;

      const { data } = await supabase
        .from("schedule_blocks")
        .select("*")
        .eq("dealership_id", form.dealership_id)
        .eq("block_date", form.scheduled_date);

      setScheduleBlocks(data || []);
    }

    fetchBlocks();
  }, [form.dealership_id, form.scheduled_date, supabase]);

  function getAvailableTimeSlots() {
    const allSlots = generateTimeSlots();
    const todayStr = new Date().toISOString().split("T")[0];
    const nowStr = `${String(new Date().getHours()).padStart(2, "0")}:${String(new Date().getMinutes()).padStart(2, "0")}`;
    const isToday = form.scheduled_date === todayStr;

    return allSlots.filter((slot) => {
      if (isToday && slot <= nowStr) return false;
      return !scheduleBlocks.some((block) => {
        return slot >= block.start_time.slice(0, 5) && slot < block.end_time.slice(0, 5);
      });
    });
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files || []);
    const valid = selected.filter((f) => f.size <= 25 * 1024 * 1024);
    if (valid.length < selected.length) {
      setError("Algunos archivos superan el límite de 25 MB y no se han añadido.");
    }
    setFiles((prev) => [...prev, ...valid]);
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Convert files to base64 for API route
      const attachments = await Promise.all(
        files.map(async (file) => {
          const buffer = await file.arrayBuffer();
          const data = Buffer.from(buffer).toString("base64");
          return {
            data,
            name: file.name,
            ext: file.name.split(".").pop(),
            mime_type: file.type,
            size: file.size,
          };
        })
      );

      const res = await fetch("/api/client/create-appointment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dealership_id: form.dealership_id,
          vehicle_id: form.vehicle_id,
          scheduled_date: form.scheduled_date,
          scheduled_time: form.scheduled_time,
          description: form.description,
          requires_approval: requiresApproval,
          attachments,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Error al crear la cita. Inténtalo de nuevo.");
        setLoading(false);
        return;
      }
      router.push(`/client/appointments/${data.appointment.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear la cita. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  const availableSlots = getAvailableTimeSlots();
  const requiresApproval = !!brandWarning;

  const isFormValid =
    form.dealership_id &&
    form.vehicle_id &&
    form.scheduled_date &&
    form.scheduled_time &&
    form.description;

  return (
    <div>
      <h1 className="heading text-2xl text-navy mb-6">NUEVA CITA</h1>

      <div className="mx-auto max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          {dealerships.length > 1 && (
            <Select
              label="Concesionario"
              value={form.dealership_id}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  dealership_id: e.target.value,
                }))
              }
              options={dealerships.map((d) => ({
                value: d.id,
                label: d.name,
              }))}
              placeholder="Selecciona un concesionario"
              required
            />
          )}

          {form.dealership_id && (dealerType === "motos" || dealerType === "coches") && vehicles.length === 0 ? (
            <div className="flex items-start gap-3 rounded-lg border border-orange/40 bg-orange/5 px-4 py-3">
              <svg className="h-5 w-5 text-orange flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
              <div>
                <p className="text-sm font-medium text-orange">Sin vehículos compatibles</p>
                <p className="text-sm text-orange/90 mt-0.5">
                  Este concesionario trabaja con {selectedDealership?.vehicle_type === "motos" ? "motos" : "coches"}.
                  Registra un vehículo del tipo correcto en tu perfil antes de reservar.
                </p>
              </div>
            </div>
          ) : (
            <Select
              label="Vehículo"
              value={form.vehicle_id}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, vehicle_id: e.target.value }))
              }
              options={vehicles.map((v) => ({
                value: v.id,
                label: `${v.vehicle_type === "motos" ? "🏍️ " : v.vehicle_type === "coches" ? "🚗 " : ""}${v.brand} ${v.model} - ${v.plate}`,
              }))}
              placeholder="Selecciona un vehículo"
              required
            />
          )}

          {brandWarning && (
            <div className="flex items-start gap-3 rounded-lg border border-orange/40 bg-orange/5 px-4 py-3">
              <svg className="h-5 w-5 text-orange flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
              <div>
                <p className="text-sm font-medium text-orange">Marca no habitual en este taller</p>
                <p className="text-sm text-orange/90 mt-0.5">{brandWarning} Tu solicitud quedará pendiente de aprobación por el concesionario.</p>
              </div>
            </div>
          )}

          <Input
            label="Fecha"
            type="date"
            value={form.scheduled_date}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                scheduled_date: e.target.value,
                scheduled_time: "",
              }))
            }
            min={new Date().toISOString().split("T")[0]}
            required
          />

          {form.scheduled_date && (
            <Select
              label="Hora"
              value={form.scheduled_time}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  scheduled_time: e.target.value,
                }))
              }
              options={availableSlots.map((slot) => ({
                value: slot,
                label: slot,
              }))}
              placeholder="Selecciona una hora"
              required
            />
          )}

          <Textarea
            label="Descripción del problema"
            value={form.description}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, description: e.target.value }))
            }
            required
            placeholder="Describe el motivo de la cita..."
          />

          {/* File upload */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Adjuntar archivos (opcional, máx. 25 MB)
            </label>
            <label className="flex cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-border px-6 py-4 text-sm text-muted-foreground hover:border-navy transition-colors">
              <svg className="mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
              Seleccionar audio, foto o vídeo
              <input
                type="file"
                multiple
                accept="image/*,video/*,audio/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>

            {files.length > 0 && (
              <div className="mt-3 space-y-2">
                {files.map((file, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-lg bg-muted px-4 py-2 text-sm"
                  >
                    <span className="truncate">{file.name}</span>
                    <button
                      type="button"
                      onClick={() => removeFile(i)}
                      className="ml-2 text-error hover:text-red-700"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && <p className="text-sm text-error text-center">{error}</p>}

          <div className="flex gap-4">
            <Button
              type="button"
              variant="outline"
              fullWidth
              onClick={() => router.back()}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              fullWidth
              loading={loading}
              disabled={!isFormValid}
              variant="secondary"
            >
              {requiresApproval ? "Solicitar reserva" : "Confirmar reserva"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
