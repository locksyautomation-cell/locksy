"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import VehicleSelect from "@/components/ui/VehicleSelect";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import { createClient } from "@/lib/supabase/client";
import { generateKeyCode } from "@/lib/utils/keycode";
import { generateTimeSlots, formatTime } from "@/lib/utils/dates";
import type { Appointment, User, ScheduleBlock, Attachment } from "@/lib/types";

interface ContactOption {
  kind: "registered" | "manual";
  id: string;
  first_name: string;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  nif_cif?: string | null;
  address?: string | null;
  user?: User;
}

const DAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MONTHS = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const HOURS = Array.from({ length: 17 }, (_, i) => i + 6); // 6..22

type ViewMode = "month" | "week";

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const dow = d.getDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function statusColor(status: string) {
  if (status === "pendiente_aprobacion") return "bg-yellow-100 text-yellow-800 border-yellow-300";
  if (status === "pendiente") return "bg-orange/20 text-orange-dark border-orange/30";
  if (status === "en_curso") return "bg-navy/10 text-navy border-navy/20";
  if (status === "rechazada") return "bg-red-100 text-red-700 border-red-200";
  return "bg-green-100 text-green-800 border-green-200";
}

function statusLabel(status: string) {
  if (status === "pendiente_aprobacion") return "Solicitud pendiente";
  if (status === "pendiente") return "Pendiente";
  if (status === "en_curso") return "En curso";
  if (status === "rechazada") return "Rechazada";
  return "Finalizada";
}

const EMPTY_FORM = {
  vehicle_id: "",
  scheduled_date: "",
  scheduled_time: "",
  description: "",
  manual_first_name: "",
  manual_last_name: "",
  manual_nif_cif: "",
  manual_email: "",
  manual_phone: "",
  manual_address: "",
  manual_vehicle_brand: "",
  manual_vehicle_model: "",
  manual_vehicle_plate: "",
};

export default function DealerCitasPage() {
  const supabase = createClient();
  const router = useRouter();

  const [dealershipId, setDealershipId] = useState("");
  const [repairStatuses, setRepairStatuses] = useState<string[]>([]);
  const [dealerVehicleType, setDealerVehicleType] = useState<"motos" | "coches" | "ambos" | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [blockedSlots, setBlockedSlots] = useState<ScheduleBlock[]>([]);
  const [loading, setLoading] = useState(true);

  // Calendar state
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [view, setView] = useState<ViewMode>("month");
  const [weekStart, setWeekStart] = useState<Date>(() => getWeekStart(new Date()));

  // Appointment detail modal
  const [selectedApt, setSelectedApt] = useState<Appointment | null>(null);
  const [aptAttachments, setAptAttachments] = useState<Attachment[]>([]);
  const [loadingAttachments, setLoadingAttachments] = useState(false);
  const [confirmingPickup, setConfirmingPickup] = useState(false);
  const [confirmPickupError, setConfirmPickupError] = useState("");
  const [approvingApt, setApprovingApt] = useState<string | null>(null);

  // Repair order
  const [generatingOrder, setGeneratingOrder] = useState(false);
  const [repairOrderError, setRepairOrderError] = useState("");
  const [copiedLink, setCopiedLink] = useState(false);

  // Edit appointment modal
  const [editingApt, setEditingApt] = useState<Appointment | null>(null);
  const [editForm, setEditForm] = useState({
    scheduled_date: "", scheduled_time: "", description: "",
    manual_first_name: "", manual_last_name: "", manual_nif_cif: "",
    manual_email: "", manual_phone: "", manual_address: "",
    manual_vehicle_brand: "", manual_vehicle_model: "", manual_vehicle_plate: "",
  });
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");

  // Delete appointment
  const [deletingApt, setDeletingApt] = useState<Appointment | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Add appointment modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [addError, setAddError] = useState("");

  // Client search
  const [clients, setClients] = useState<ContactOption[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClient, setSelectedClient] = useState<User | null>(null);
  const [selectedManualContactId, setSelectedManualContactId] = useState<string | null>(null);
  const [clientVehicles, setClientVehicles] = useState<{ value: string; label: string }[]>([]);
  const [manualContactVehicles, setManualContactVehicles] = useState<{ brand: string; model: string; plate: string }[]>([]);

  const [form, setForm] = useState({ ...EMPTY_FORM });

  // Availability modal
  const [showAvailModal, setShowAvailModal] = useState(false);
  const [blockForm, setBlockForm] = useState({ block_date: "", start_time: "", end_time: "", reason: "" });
  const [savingBlock, setSavingBlock] = useState(false);

  useEffect(() => {
    fetchAll();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchAll() {
    const dsRes = await fetch("/api/dealer/get-dealership");
    if (!dsRes.ok) { setLoading(false); return; }
    const { dealership: ds } = await dsRes.json();

    if (!ds) { setLoading(false); return; }
    setDealershipId(ds.id);
    setRepairStatuses((ds.repair_statuses as string[]) || ["En espera", "En reparación", "Reparación finalizada"]);
    setDealerVehicleType((ds.vehicle_type as "motos" | "coches" | "ambos" | null) || null);

    const [aptsData, blocksRes] = await Promise.all([
      fetch("/api/dealer/get-appointments"),
      fetch("/api/dealer/schedule-blocks"),
    ]);

    const { appointments: apts } = await aptsData.json();
    setAppointments((apts as Appointment[]) || []);
    const blocksData = await blocksRes.json();
    setBlockedSlots((blocksData.blocks as ScheduleBlock[]) || []);
    setLoading(false);
  }

  // Client search — uses API route (admin client) to bypass RLS
  useEffect(() => {
    if (searchQuery.length < 2) { setClients([]); return; }
    const t = setTimeout(async () => {
      const res = await fetch(`/api/dealer/search-clients?q=${encodeURIComponent(searchQuery)}`);
      if (!res.ok) return;
      const { registered: reg, manual: man } = await res.json();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const registered: ContactOption[] = (reg || []).map((u: any) => ({
        kind: "registered" as const,
        id: u.id,
        first_name: u.first_name,
        last_name: u.last_name,
        email: u.email,
        phone: u.phone || null,
        user: u,
      }));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const manual: ContactOption[] = (man || []).map((c: any) => ({
        kind: "manual" as const,
        id: c.id,
        first_name: c.first_name,
        last_name: c.last_name,
        email: c.email,
        phone: c.phone,
        nif_cif: c.nif_cif,
        address: c.address,
      }));
      setClients([...registered, ...manual]);
    }, 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  async function selectClient(option: ContactOption) {
    setSearchQuery("");
    setClients([]);
    if (option.kind === "registered" && option.user) {
      setSelectedClient(option.user);
      // Fetch vehicles via admin API (bypasses RLS), filtered by dealer's vehicle_type
      const params = new URLSearchParams({ client_id: option.id });
      if (dealerVehicleType === "motos" || dealerVehicleType === "coches") {
        params.set("vehicle_type", dealerVehicleType);
      }
      const res = await fetch(`/api/dealer/get-contact-vehicles?${params}`);
      if (res.ok) {
        const { vehicles } = await res.json();
        setClientVehicles((vehicles || []).map((v: { id: string; brand: string; model: string; plate: string; vehicle_type?: string }) => ({
          value: v.id,
          label: `${v.vehicle_type === "motos" ? "🏍️ " : v.vehicle_type === "coches" ? "🚗 " : ""}${v.brand} ${v.model} - ${v.plate}`,
        })));
      }
    } else {
      setSelectedManualContactId(option.id);
      setForm(p => ({
        ...p,
        manual_first_name: option.first_name || "",
        manual_last_name: option.last_name || "",
        manual_email: option.email || "",
        manual_phone: option.phone || "",
        manual_nif_cif: option.nif_cif || "",
        manual_address: option.address || "",
      }));
      const res = await fetch(`/api/dealer/get-contact-vehicles?contact_id=${option.id}`);
      if (res.ok) {
        const { vehicles } = await res.json();
        setManualContactVehicles(vehicles || []);
      }
    }
  }

  // Open appointment detail + fetch attachments
  async function openDetail(apt: Appointment) {
    setSelectedApt(apt);
    setLoadingAttachments(true);
    const { data } = await supabase.from("attachments").select("*").eq("appointment_id", apt.id);
    setAptAttachments((data as Attachment[]) || []);
    setLoadingAttachments(false);
  }

  // Week days
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => { const d = new Date(weekStart); d.setDate(d.getDate() + i); return d; }),
    [weekStart]
  );

  // Calendar grid
  const calendarDays = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1);
    let startDow = firstDay.getDay() - 1;
    if (startDow < 0) startDow = 6;
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const grid: (number | null)[] = Array(startDow).fill(null);
    for (let d = 1; d <= daysInMonth; d++) grid.push(d);
    while (grid.length % 7 !== 0) grid.push(null);
    return grid;
  }, [currentMonth, currentYear]);

  function aptsForDay(day: number) {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return appointments.filter((a) => a.scheduled_date === dateStr);
  }

  function aptsForDayHour(date: Date, hour: number): Appointment[] {
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    return appointments.filter((a) => {
      if (a.scheduled_date !== dateStr) return false;
      const aptHour = parseInt(a.scheduled_time.split(":")[0], 10);
      return aptHour === hour;
    });
  }

  function isHourBlocked(date: Date, hour: number): boolean {
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    return blockedSlots.some((b) => {
      if (b.block_date !== dateStr) return false;
      const startH = parseInt(b.start_time.split(":")[0], 10);
      const endH = parseInt(b.end_time.split(":")[0], 10);
      return hour >= startH && hour < endH;
    });
  }

  function blockedTimesForDate(date: string): string[] {
    return blockedSlots
      .filter((b) => b.block_date === date)
      .flatMap((b) => {
        const slots = generateTimeSlots();
        return slots.filter((s) => s >= b.start_time && s < b.end_time);
      });
  }

  const availableTimeSlots = useMemo(() => {
    if (!form.scheduled_date) return generateTimeSlots();
    const blocked = blockedTimesForDate(form.scheduled_date);
    return generateTimeSlots().filter((s) => !blocked.includes(s));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.scheduled_date, blockedSlots]);

  const editAvailableTimeSlots = useMemo(() => {
    if (!editForm.scheduled_date) return generateTimeSlots();
    const blocked = blockedTimesForDate(editForm.scheduled_date);
    return generateTimeSlots().filter((s) => !blocked.includes(s));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editForm.scheduled_date, blockedSlots]);

  async function handleApproveApt(action: "accept" | "reject") {
    if (!selectedApt) return;
    setApprovingApt(action);
    const res = await fetch("/api/dealer/approve-appointment", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: selectedApt.id, action }),
    });
    if (res.ok) {
      const { status } = await res.json();
      setAppointments((prev) => prev.map((a) => a.id === selectedApt.id ? { ...a, status } : a));
      setSelectedApt((prev) => prev ? { ...prev, status } : null);
    }
    setApprovingApt(null);
  }

  async function handleConfirmPickup() {
    if (!selectedApt) return;
    setConfirmingPickup(true);
    setConfirmPickupError("");
    const res = await fetch("/api/dealer/confirm-pickup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ appointment_id: selectedApt.id }),
    });
    setConfirmingPickup(false);
    if (!res.ok) {
      const data = await res.json();
      setConfirmPickupError(data.error || "Error al confirmar la recogida.");
      return;
    }
    setSelectedApt(null);
    router.push("/dealer/taller");
  }

  async function handleGenerateRepairOrder() {
    if (!selectedApt) return;
    setGeneratingOrder(true);
    setRepairOrderError("");
    const res = await fetch("/api/dealer/generate-repair-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ appointment_id: selectedApt.id }),
    });
    setGeneratingOrder(false);
    if (!res.ok) {
      const data = await res.json();
      setRepairOrderError(data.error || "Error al generar la orden.");
      return;
    }
    const { url, token } = await res.json();
    setSelectedApt((prev) => prev ? { ...prev, repair_order_url: url, repair_acceptance_token: token } : prev);
    setAppointments((prev) =>
      prev.map((a) => a.id === selectedApt.id ? { ...a, repair_order_url: url, repair_acceptance_token: token } : a)
    );
  }

  function handleCopyAcceptanceLink() {
    if (!selectedApt?.repair_acceptance_token) return;
    const link = `${window.location.origin}/orden/${selectedApt.repair_acceptance_token}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    });
  }

  async function handleAddAppointment() {
    if (!form.scheduled_date || !form.scheduled_time) {
      setAddError("Fecha y hora son obligatorios.");
      return;
    }
    if (!selectedClient && !selectedManualContactId && (!form.manual_first_name || !form.manual_vehicle_plate)) {
      setAddError("Introduce al menos nombre y matrícula del vehículo.");
      return;
    }
    if ((selectedClient || selectedManualContactId) && !form.vehicle_id && !form.manual_vehicle_plate) {
      setAddError("Selecciona o introduce la matrícula del vehículo.");
      return;
    }
    setSaving(true);
    setAddError("");

    const payload: Record<string, unknown> = {
      key_code: generateKeyCode(),
      scheduled_date: form.scheduled_date,
      scheduled_time: form.scheduled_time,
      description: form.description,
    };

    if (selectedClient) {
      payload.client_id = selectedClient.id;
      payload.vehicle_id = form.vehicle_id || null;
    } else {
      if (selectedManualContactId) payload.existing_contact_id = selectedManualContactId;
      payload.manual_first_name = form.manual_first_name;
      payload.manual_last_name = form.manual_last_name;
      payload.manual_nif_cif = form.manual_nif_cif;
      payload.manual_email = form.manual_email;
      payload.manual_phone = form.manual_phone;
      payload.manual_address = form.manual_address;
      payload.manual_vehicle_brand = form.manual_vehicle_brand;
      payload.manual_vehicle_model = form.manual_vehicle_model;
      payload.manual_vehicle_plate = form.manual_vehicle_plate;
    }

    const res = await fetch("/api/dealer/create-appointment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const { error: errMsg } = await res.json().catch(() => ({ error: "" }));
      setAddError(errMsg || "Error al crear la cita. Inténtalo de nuevo.");
      setSaving(false);
      return;
    }

    setShowAddModal(false);
    setSelectedClient(null);
    setSelectedManualContactId(null);
    setManualContactVehicles([]);
    setForm({ ...EMPTY_FORM });
    await fetchAll();
    setSaving(false);
  }

  function openEdit(apt: Appointment) {
    setEditingApt(apt);
    setEditForm({
      scheduled_date: apt.scheduled_date,
      scheduled_time: apt.scheduled_time,
      description: apt.description || "",
      manual_first_name: apt.manual_first_name || "",
      manual_last_name: apt.manual_last_name || "",
      manual_nif_cif: apt.manual_nif_cif || "",
      manual_email: apt.manual_email || "",
      manual_phone: apt.manual_phone || "",
      manual_address: apt.manual_address || "",
      manual_vehicle_brand: apt.manual_vehicle_brand || "",
      manual_vehicle_model: apt.manual_vehicle_model || "",
      manual_vehicle_plate: apt.manual_vehicle_plate || "",
    });
    setEditError("");
    setSelectedApt(null);
  }

  async function handleEditAppointment() {
    if (!editingApt) return;
    if (!editForm.scheduled_date || !editForm.scheduled_time) {
      setEditError("Fecha y hora son obligatorios.");
      return;
    }
    setEditSaving(true);
    setEditError("");

    const updateData: Record<string, unknown> = {
      id: editingApt.id,
      scheduled_date: editForm.scheduled_date,
      scheduled_time: editForm.scheduled_time,
      description: editForm.description,
    };

    if (!editingApt.client_id) {
      updateData.manual_first_name = editForm.manual_first_name;
      updateData.manual_last_name = editForm.manual_last_name;
      updateData.manual_nif_cif = editForm.manual_nif_cif;
      updateData.manual_email = editForm.manual_email;
      updateData.manual_phone = editForm.manual_phone;
      updateData.manual_address = editForm.manual_address;
      updateData.manual_vehicle_brand = editForm.manual_vehicle_brand;
      updateData.manual_vehicle_model = editForm.manual_vehicle_model;
      updateData.manual_vehicle_plate = editForm.manual_vehicle_plate;
    }

    const res = await fetch("/api/dealer/update-appointment", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updateData),
    });
    if (!res.ok) {
      setEditError("Error al guardar los cambios.");
    } else {
      setEditingApt(null);
      await fetchAll();
    }
    setEditSaving(false);
  }

  async function handleDeleteAppointment() {
    if (!deletingApt) return;
    setDeleteLoading(true);
    await fetch("/api/dealer/update-appointment", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: deletingApt.id }),
    });
    setDeletingApt(null);
    setSelectedApt(null);
    await fetchAll();
    setDeleteLoading(false);
  }

  async function handleAddBlock() {
    if (!blockForm.block_date || !blockForm.start_time || !blockForm.end_time) return;
    setSavingBlock(true);
    await fetch("/api/dealer/schedule-blocks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(blockForm),
    });
    setBlockForm({ block_date: "", start_time: "", end_time: "", reason: "" });
    await fetchAll();
    setSavingBlock(false);
  }

  async function handleDeleteBlock(id: string) {
    await fetch("/api/dealer/schedule-blocks", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await fetchAll();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin h-8 w-8 border-2 border-navy border-t-transparent rounded-full" />
      </div>
    );
  }

  const isToday = (day: number) =>
    day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();

  // Appointment detail helpers
  const aptClient = selectedApt?.client as unknown as { first_name: string; last_name: string; email: string; phone: string; dni: string };
  const aptVehicle = selectedApt?.vehicle as unknown as { brand: string; model: string; plate: string; vehicle_type?: string } | null;

  const clientName = (apt: Appointment | null) => {
    if (!apt) return "";
    const c = apt.client as unknown as { first_name: string; last_name: string } | null;
    return c ? `${c.first_name} ${c.last_name}` : `${apt.manual_first_name || ""} ${apt.manual_last_name || ""}`.trim();
  };

  function vehicleTypeEmoji(apt: Appointment): string {
    const vt = (apt.vehicle as unknown as { vehicle_type?: string } | null)?.vehicle_type;
    if (vt === "motos") return "🏍️ ";
    if (vt === "coches") return "🚗 ";
    return "";
  }

  const vehiclePlate = selectedApt
    ? (aptVehicle?.plate || selectedApt.manual_vehicle_plate || "—")
    : "";
  const vehicleLabel = selectedApt
    ? (aptVehicle ? `${aptVehicle.brand} ${aptVehicle.model}` : `${selectedApt.manual_vehicle_brand || ""} ${selectedApt.manual_vehicle_model || ""}`.trim() || "—")
    : "";

  const timeSlots = generateTimeSlots();

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="heading text-2xl text-navy">CITAS</h1>
        <div className="flex gap-2">
          <button
            onClick={() => fetchAll()}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Actualizar
          </button>
          <Button variant="outline" size="sm" onClick={() => setShowAvailModal(true)}>
            Editar disponibilidad
          </Button>
          <Button variant="secondary" size="sm" onClick={() => { setShowAddModal(true); setSelectedClient(null); setSelectedManualContactId(null); setForm({ ...EMPTY_FORM }); setAddError(""); }}>
            Añadir Cita
          </Button>
        </div>
      </div>

      {/* Calendar navigation */}
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <button
          onClick={() => {
            if (view === "month") {
              if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1); } else setCurrentMonth(m => m - 1);
            } else {
              setWeekStart(d => { const n = new Date(d); n.setDate(n.getDate() - 7); return n; });
            }
          }}
          className="rounded-lg border border-border p-2 hover:bg-muted transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div className="flex items-center gap-3">
          {view === "month" ? (
            <span className="heading text-lg text-navy">{MONTHS[currentMonth]} {currentYear}</span>
          ) : (
            <span className="heading text-base text-navy">
              {weekDays[0].getDate()} {MONTHS[weekDays[0].getMonth()].slice(0, 3)} – {weekDays[6].getDate()} {MONTHS[weekDays[6].getMonth()].slice(0, 3)} {weekDays[6].getFullYear()}
            </span>
          )}
          <div className="flex rounded-lg border border-border overflow-hidden">
            <button
              onClick={() => setView("month")}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${view === "month" ? "bg-navy text-white" : "text-foreground hover:bg-muted"}`}
            >
              Mes
            </button>
            <button
              onClick={() => setView("week")}
              className={`px-3 py-1.5 text-xs font-medium transition-colors border-l border-border ${view === "week" ? "bg-navy text-white" : "text-foreground hover:bg-muted"}`}
            >
              Semana
            </button>
          </div>
        </div>

        <button
          onClick={() => {
            if (view === "month") {
              if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1); } else setCurrentMonth(m => m + 1);
            } else {
              setWeekStart(d => { const n = new Date(d); n.setDate(n.getDate() + 7); return n; });
            }
          }}
          className="rounded-lg border border-border p-2 hover:bg-muted transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Monthly Calendar grid */}
      {view === "month" && (
        <div className="rounded-xl border border-border bg-white shadow-sm overflow-hidden">
          <div className="grid grid-cols-7 bg-muted">
            {DAYS.map((d) => (
              <div key={d} className="py-2 text-center text-xs font-semibold text-muted-foreground uppercase">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 divide-x divide-y divide-border">
            {calendarDays.map((day, i) => {
              const apts = day ? aptsForDay(day) : [];
              const dayStr = day
                ? `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
                : null;
              const dayBlocks = dayStr ? blockedSlots.filter((b) => b.block_date === dayStr) : [];
              const hasBlocks = dayBlocks.length > 0;
              return (
                <div
                  key={i}
                  className={`min-h-[100px] p-1.5 ${!day ? "bg-muted/30" : ""}`}
                  style={day && hasBlocks ? { backgroundColor: "#e8ecf0" } : undefined}
                >
                  {day && (
                    <>
                      <div className="flex items-center justify-between mb-1">
                        <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${isToday(day) ? "bg-navy text-white" : "text-foreground"}`}>
                          {day}
                        </span>
                        {hasBlocks && (
                          <span title={dayBlocks.map((b) => `${b.start_time}–${b.end_time}${b.reason ? ` (${b.reason})` : ""}`).join(", ")} className="text-gray-400">
                            <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                            </svg>
                          </span>
                        )}
                      </div>
                      <div className="space-y-0.5">
                        {apts.slice(0, 3).map((apt) => (
                          <button
                            key={apt.id}
                            onClick={() => openDetail(apt)}
                            className={`w-full text-left rounded px-1 py-0.5 text-xs border truncate ${statusColor(apt.status)}`}
                          >
                            {formatTime(apt.scheduled_time)} {clientName(apt) || apt.locator}
                          </button>
                        ))}
                        {apts.length > 3 && (
                          <span className="text-xs text-muted-foreground pl-1">+{apts.length - 3} más</span>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Weekly Calendar grid */}
      {view === "week" && (
        <div
          className="rounded-xl border border-border bg-white shadow-sm overflow-hidden flex flex-col"
          style={{ minHeight: "calc(100vh - 220px)" }}
        >
          {/* Header */}
          <div className="grid border-b border-border flex-shrink-0" style={{ gridTemplateColumns: "56px repeat(7, 1fr)" }}>
            <div className="bg-muted" />
            {weekDays.map((d, i) => {
              const isTodayCell = d.toDateString() === today.toDateString();
              return (
                <div key={i} className="bg-muted py-2 text-center border-l border-border">
                  <p className="text-xs font-semibold text-muted-foreground uppercase">{DAYS[i]}</p>
                  <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-sm font-bold mx-auto mt-0.5 ${isTodayCell ? "bg-navy text-white" : "text-navy"}`}>
                    {d.getDate()}
                  </span>
                </div>
              );
            })}
          </div>
          {/* Hour rows — stretch to fill remaining height */}
          <div className="divide-y divide-border flex-1 flex flex-col">
            {HOURS.map((hour) => (
              <div key={hour} className="grid flex-1" style={{ gridTemplateColumns: "56px repeat(7, 1fr)" }}>
                <div className="border-r border-border flex items-start justify-end pr-2 pt-1 bg-muted/30">
                  <span className="text-xs text-muted-foreground">{String(hour).padStart(2, "0")}:00</span>
                </div>
                {weekDays.map((d, i) => {
                  const apts = aptsForDayHour(d, hour);
                  const blocked = isHourBlocked(d, hour);
                  return (
                    <div
                      key={i}
                      className="border-l border-border p-1"
                      style={blocked ? { backgroundColor: "#e8ecf0" } : undefined}
                    >
                      {apts.map((apt) => (
                        <button
                          key={apt.id}
                          onClick={() => openDetail(apt)}
                          className={`w-full text-left rounded px-1 py-0.5 text-xs border mb-0.5 truncate ${statusColor(apt.status)}`}
                        >
                          {formatTime(apt.scheduled_time)} {clientName(apt) || apt.locator}
                        </button>
                      ))}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground flex-wrap">
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-orange inline-block" /> Pendiente</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-navy inline-block" /> En curso</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-green-600 inline-block" /> Finalizada</span>
        <span className="flex items-center gap-1">
          <span
              className="inline-flex h-4 w-4 items-center justify-center rounded border border-gray-300"
              style={{ backgroundColor: "#e8ecf0" }}
            >
              <svg className="h-2.5 w-2.5 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
            </span>
          Franja bloqueada
        </span>
      </div>

      {/* ── Appointment Detail Modal ── */}
      <Modal isOpen={!!selectedApt} onClose={() => { setSelectedApt(null); setConfirmPickupError(""); setRepairOrderError(""); setCopiedLink(false); }} title={`CITA ${selectedApt?.locator || ""}`}>
        {selectedApt && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">Cliente</p>
                <p className="font-medium">{clientName(selectedApt) || "—"}</p>
                {aptClient?.email && <p className="text-xs text-muted-foreground">{aptClient.email}</p>}
                {selectedApt.manual_email && <p className="text-xs text-muted-foreground">{selectedApt.manual_email}</p>}
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Vehículo</p>
                <p className="font-medium">{selectedApt && vehicleTypeEmoji(selectedApt)}{vehicleLabel}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Matrícula</p>
                <p className="font-medium font-mono">{vehiclePlate}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Fecha y hora</p>
                <p className="font-medium">
                  {new Date(selectedApt.scheduled_date + "T00:00:00").toLocaleDateString("es-ES")} {formatTime(selectedApt.scheduled_time)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Código de cita</p>
                <p className="font-mono font-bold">{selectedApt.locator}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Código recogida llaves</p>
                <p className="font-mono font-bold">{selectedApt.key_code}</p>
              </div>
              <div className="col-span-2">
                <p className="text-muted-foreground text-xs">Motivo</p>
                <p>{selectedApt.description || "—"}</p>
              </div>
              <div className="col-span-2 flex items-center gap-2">
                <p className="text-muted-foreground text-xs">Estado:</p>
                <Badge variant={
                  selectedApt.status === "pendiente_aprobacion" ? "warning" :
                  selectedApt.status === "pendiente" ? "warning" :
                  selectedApt.status === "en_curso" ? "info" :
                  selectedApt.status === "rechazada" ? "error" : "success"
                }>
                  {statusLabel(selectedApt.status)}
                </Badge>
              </div>
            </div>

            {/* Attachments */}
            {loadingAttachments ? (
              <div className="flex justify-center py-2">
                <div className="animate-spin h-5 w-5 border-2 border-navy border-t-transparent rounded-full" />
              </div>
            ) : aptAttachments.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-2">Archivos adjuntos</p>
                <div className="space-y-1">
                  {aptAttachments.map((att) => (
                    <a
                      key={att.id}
                      href={att.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted transition-colors"
                    >
                      <svg className="h-4 w-4 text-muted-foreground flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                      </svg>
                      <span className="truncate">{att.file_name}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* ── Orden de Reparación ── */}
            <div className="border-t border-border pt-3 space-y-2">
              <p className="text-xs font-semibold text-navy uppercase tracking-wider">Orden de Reparación</p>
              {selectedApt.repair_order_url ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <a
                      href={selectedApt.repair_order_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-orange hover:underline flex items-center gap-1"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      Ver PDF
                    </a>
                    <button
                      onClick={handleGenerateRepairOrder}
                      disabled={generatingOrder}
                      className="text-xs text-muted-foreground hover:text-foreground underline disabled:opacity-50"
                    >
                      {generatingOrder ? "Regenerando..." : "Regenerar"}
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-xs">
                    <span className="text-muted-foreground">Entrega:</span>
                    <span className={selectedApt.order_accepted_at ? "text-green-600 font-medium" : "text-orange"}>
                      {selectedApt.order_accepted_at
                        ? `✓ ${new Date(selectedApt.order_accepted_at).toLocaleDateString("es-ES")}`
                        : "Pendiente"}
                    </span>
                    <span className="text-muted-foreground">Recogida:</span>
                    <span className={selectedApt.order_return_accepted_at ? "text-green-600 font-medium" : "text-muted-foreground"}>
                      {selectedApt.order_return_accepted_at
                        ? `✓ ${new Date(selectedApt.order_return_accepted_at).toLocaleDateString("es-ES")}`
                        : "Pendiente"}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={handleCopyAcceptanceLink}
                      className="flex items-center gap-1.5 text-xs bg-muted hover:bg-muted/80 rounded-lg px-3 py-1.5 transition-colors"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      {copiedLink ? "¡Enlace copiado!" : "Copiar enlace de aceptación"}
                    </button>
                    {selectedApt.repair_acceptance_token && (!selectedApt.order_accepted_at || !selectedApt.order_return_accepted_at) && (
                      <a
                        href={`/orden/${selectedApt.repair_acceptance_token}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-xs bg-navy text-white hover:bg-navy/90 rounded-lg px-3 py-1.5 transition-colors"
                      >
                        {!selectedApt.order_accepted_at ? "Firma entrega →" : "Firma recogida →"}
                      </a>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleGenerateRepairOrder}
                    loading={generatingOrder}
                  >
                    Generar orden de reparación
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    El cliente recibirá un enlace para aceptar la orden antes de la recogida.
                  </p>
                </div>
              )}
              {repairOrderError && <p className="text-xs text-error">{repairOrderError}</p>}
            </div>

            {selectedApt.status === "pendiente_aprobacion" && (
              <div className="space-y-2">
                <p className="text-xs text-center text-muted-foreground">
                  Esta cita requiere tu aprobación antes de continuar.
                </p>
                <div className="flex gap-2">
                  <Button variant="secondary" fullWidth onClick={() => handleApproveApt("accept")} loading={approvingApt === "accept"} disabled={!!approvingApt}>
                    Aceptar solicitud
                  </Button>
                  <Button variant="danger" fullWidth onClick={() => handleApproveApt("reject")} loading={approvingApt === "reject"} disabled={!!approvingApt}>
                    Rechazar
                  </Button>
                </div>
              </div>
            )}
            {selectedApt.status === "pendiente" && (
              <div className="space-y-1">
                <Button variant="secondary" fullWidth onClick={handleConfirmPickup} loading={confirmingPickup}>
                  Confirmar recogida
                </Button>
                {confirmPickupError && <p className="text-xs text-error text-center">{confirmPickupError}</p>}
              </div>
            )}
            {selectedApt.status === "en_curso" && (
              <p className="text-sm text-center text-muted-foreground">Vehículo en taller</p>
            )}
            {selectedApt.status === "finalizada" && (
              <p className="text-sm text-center text-muted-foreground">Reparación finalizada</p>
            )}
            {selectedApt.status === "rechazada" && (
              <p className="text-sm text-center text-red-600 font-medium">Solicitud rechazada</p>
            )}

            {selectedApt.status !== "finalizada" && selectedApt.status !== "rechazada" && (
              <div className="flex gap-2 pt-1 border-t border-border">
                <Button variant="outline" size="sm" onClick={() => openEdit(selectedApt)}>
                  Editar
                </Button>
                <Button variant="danger" size="sm" onClick={() => { setDeletingApt(selectedApt); setSelectedApt(null); }}>
                  Eliminar
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* ── Edit Appointment Modal ── */}
      <Modal isOpen={!!editingApt} onClose={() => setEditingApt(null)} title={`EDITAR CITA ${editingApt?.locator || ""}`}>
        {editingApt && (
          <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
            {/* Manual client fields (only if no registered client) */}
            {!editingApt.client_id && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <Input label="Nombre / Empresa" value={editForm.manual_first_name} onChange={(e) => setEditForm(p => ({ ...p, manual_first_name: e.target.value }))} />
                  <Input label="Apellidos" value={editForm.manual_last_name} onChange={(e) => setEditForm(p => ({ ...p, manual_last_name: e.target.value }))} />
                  <Input label="NIF / CIF" value={editForm.manual_nif_cif} onChange={(e) => setEditForm(p => ({ ...p, manual_nif_cif: e.target.value }))} />
                  <Input label="Teléfono" value={editForm.manual_phone} onChange={(e) => setEditForm(p => ({ ...p, manual_phone: e.target.value }))} />
                </div>
                <Input label="Correo electrónico" type="email" value={editForm.manual_email} onChange={(e) => setEditForm(p => ({ ...p, manual_email: e.target.value }))} />
                <Input label="Dirección" value={editForm.manual_address} onChange={(e) => setEditForm(p => ({ ...p, manual_address: e.target.value }))} />
                <div className="grid grid-cols-2 gap-3">
                  <VehicleSelect
                    brand={editForm.manual_vehicle_brand}
                    model={editForm.manual_vehicle_model}
                    onBrandChange={(v) => setEditForm(p => ({ ...p, manual_vehicle_brand: v }))}
                    onModelChange={(v) => setEditForm(p => ({ ...p, manual_vehicle_model: v }))}
                    vehicleType={dealerVehicleType === "motos" || dealerVehicleType === "coches" ? dealerVehicleType : undefined}
                  />
                  <Input label="Matrícula" value={editForm.manual_vehicle_plate} onChange={(e) => setEditForm(p => ({ ...p, manual_vehicle_plate: e.target.value }))} />
                </div>
                <hr className="border-border" />
              </>
            )}

            <Input
              label="Fecha"
              type="date"
              value={editForm.scheduled_date}
              onChange={(e) => setEditForm(p => ({ ...p, scheduled_date: e.target.value, scheduled_time: "" }))}
            />
            <div>
              <label className="mb-1.5 block text-sm font-medium">Hora</label>
              <select
                value={editForm.scheduled_time}
                onChange={(e) => setEditForm(p => ({ ...p, scheduled_time: e.target.value }))}
                className="w-full rounded-lg border border-border px-4 py-3 text-sm focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/20"
              >
                <option value="">Selecciona una hora</option>
                {editAvailableTimeSlots.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Descripción del problema</label>
              <textarea
                value={editForm.description}
                onChange={(e) => setEditForm(p => ({ ...p, description: e.target.value }))}
                rows={3}
                className="w-full rounded-lg border border-border px-4 py-3 text-sm focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/20"
              />
            </div>

            {editError && <p className="text-sm text-error">{editError}</p>}

            <div className="flex gap-3 pt-2">
              <Button variant="outline" fullWidth onClick={() => setEditingApt(null)}>Descartar</Button>
              <Button variant="secondary" fullWidth onClick={handleEditAppointment} loading={editSaving}
                disabled={!editForm.scheduled_date || !editForm.scheduled_time}>
                Guardar cambios
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Delete Confirmation Modal ── */}
      <Modal isOpen={!!deletingApt} onClose={() => setDeletingApt(null)} title="ELIMINAR CITA">
        <div className="space-y-4">
          <p className="text-sm text-foreground">
            ¿Estás seguro de que deseas eliminar la cita <strong>{deletingApt?.locator}</strong>? Esta acción no se puede deshacer.
          </p>
          <div className="flex gap-3">
            <Button variant="outline" fullWidth onClick={() => setDeletingApt(null)}>Cancelar</Button>
            <Button variant="danger" fullWidth onClick={handleDeleteAppointment} loading={deleteLoading}>Eliminar</Button>
          </div>
        </div>
      </Modal>

      {/* ── Add Appointment Modal ── */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="AÑADIR CITA">
        <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
          {/* Client search */}
          <div className="relative">
            <Input
              label="Buscar cliente existente"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Escribe el nombre del cliente..."
            />
            {clients.length > 0 && (
              <div className="absolute z-20 mt-1 w-full rounded-lg border border-border bg-white shadow-lg">
                {clients.map((c) => (
                  <button key={`${c.kind}-${c.id}`} className="w-full px-4 py-2 text-left text-sm hover:bg-muted flex items-center justify-between" onClick={() => selectClient(c)}>
                    <span>{c.first_name} {c.last_name || ""} — {c.email || "sin email"}</span>
                    {c.kind === "manual" && <span className="text-xs text-muted-foreground ml-2">manual</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {(selectedClient || selectedManualContactId) ? (
            <div className="rounded-lg bg-muted p-3 text-sm flex items-center justify-between">
              <div>
                <strong>
                  {selectedClient
                    ? `${selectedClient.first_name} ${selectedClient.last_name || ""}`.trim()
                    : `${form.manual_first_name} ${form.manual_last_name || ""}`.trim()}
                </strong>
                <p className="text-muted-foreground">
                  {selectedClient ? selectedClient.email : form.manual_email}
                </p>
              </div>
              <button
                onClick={() => { setSelectedClient(null); setSelectedManualContactId(null); setClientVehicles([]); setManualContactVehicles([]); }}
                className="text-muted-foreground hover:text-error text-xs"
              >
                ✕ Deseleccionar
              </button>
            </div>
          ) : (
            <>
              <p className="text-xs text-muted-foreground">— O introduce los datos manualmente —</p>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Nombre / Empresa" value={form.manual_first_name} onChange={(e) => setForm(p => ({ ...p, manual_first_name: e.target.value }))} />
                <Input label="Apellidos" value={form.manual_last_name} onChange={(e) => setForm(p => ({ ...p, manual_last_name: e.target.value }))} />
                <Input label="NIF / CIF" value={form.manual_nif_cif} onChange={(e) => setForm(p => ({ ...p, manual_nif_cif: e.target.value }))} />
                <Input label="Teléfono" value={form.manual_phone} onChange={(e) => setForm(p => ({ ...p, manual_phone: e.target.value }))} />
              </div>
              <Input label="Correo electrónico" type="email" value={form.manual_email} onChange={(e) => setForm(p => ({ ...p, manual_email: e.target.value }))} />
              <Input label="Dirección" value={form.manual_address} onChange={(e) => setForm(p => ({ ...p, manual_address: e.target.value }))} />
              <div className="grid grid-cols-2 gap-3">
                <VehicleSelect
                  brand={form.manual_vehicle_brand}
                  model={form.manual_vehicle_model}
                  onBrandChange={(v) => setForm(p => ({ ...p, manual_vehicle_brand: v }))}
                  onModelChange={(v) => setForm(p => ({ ...p, manual_vehicle_model: v }))}
                  vehicleType={dealerVehicleType === "motos" || dealerVehicleType === "coches" ? dealerVehicleType : undefined}
                />
                <Input label="Matrícula" value={form.manual_vehicle_plate} onChange={(e) => setForm(p => ({ ...p, manual_vehicle_plate: e.target.value }))} />
              </div>
            </>
          )}

          {/* Vehicle selector — shown when a client is selected from search */}
          {selectedClient && clientVehicles.length > 0 && (
            <div>
              <label className="mb-1.5 block text-sm font-medium">Vehículo</label>
              <select
                value={form.vehicle_id}
                onChange={(e) => setForm(p => ({ ...p, vehicle_id: e.target.value }))}
                className="w-full rounded-lg border border-border px-4 py-3 text-sm focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/20"
              >
                <option value="">Selecciona un vehículo</option>
                {clientVehicles.map((v) => <option key={v.value} value={v.value}>{v.label}</option>)}
              </select>
            </div>
          )}
          {selectedManualContactId && manualContactVehicles.length > 0 && (
            <div>
              <label className="mb-1.5 block text-sm font-medium">Vehículo del cliente</label>
              <select
                defaultValue=""
                onChange={(e) => {
                  const v = manualContactVehicles[parseInt(e.target.value)];
                  if (v) setForm(p => ({ ...p, manual_vehicle_brand: v.brand, manual_vehicle_model: v.model, manual_vehicle_plate: v.plate }));
                }}
                className="w-full rounded-lg border border-border px-4 py-3 text-sm focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/20"
              >
                <option value="">Selecciona un vehículo</option>
                {manualContactVehicles.map((v, i) => (
                  <option key={i} value={i}>{v.brand} {v.model} — {v.plate}</option>
                ))}
              </select>
            </div>
          )}
          {selectedManualContactId && manualContactVehicles.length === 0 && (
            <div className="grid grid-cols-2 gap-3">
              <VehicleSelect
                brand={form.manual_vehicle_brand}
                model={form.manual_vehicle_model}
                onBrandChange={(v) => setForm(p => ({ ...p, manual_vehicle_brand: v }))}
                onModelChange={(v) => setForm(p => ({ ...p, manual_vehicle_model: v }))}
                vehicleType={dealerVehicleType === "motos" || dealerVehicleType === "coches" ? dealerVehicleType : undefined}
              />
              <Input label="Matrícula" value={form.manual_vehicle_plate} onChange={(e) => setForm(p => ({ ...p, manual_vehicle_plate: e.target.value }))} />
            </div>
          )}

          <Input label="Fecha" type="date" value={form.scheduled_date} min={new Date().toISOString().split("T")[0]}
            onChange={(e) => setForm(p => ({ ...p, scheduled_date: e.target.value, scheduled_time: "" }))} />

          <div>
            <label className="mb-1.5 block text-sm font-medium">Hora</label>
            <select
              value={form.scheduled_time}
              onChange={(e) => setForm(p => ({ ...p, scheduled_time: e.target.value }))}
              className="w-full rounded-lg border border-border px-4 py-3 text-sm focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/20"
            >
              <option value="">Selecciona una hora</option>
              {availableTimeSlots.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">Descripción del problema</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))}
              rows={3}
              className="w-full rounded-lg border border-border px-4 py-3 text-sm focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/20"
              placeholder="Describe el problema..."
            />
          </div>

          {addError && <p className="text-sm text-error">{addError}</p>}

          <div className="flex gap-3 pt-2">
            <Button variant="outline" fullWidth onClick={() => setShowAddModal(false)}>Descartar</Button>
            <Button variant="secondary" fullWidth onClick={handleAddAppointment} loading={saving}>
              Confirmar
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Availability Modal ── */}
      <Modal isOpen={showAvailModal} onClose={() => setShowAvailModal(false)} title="EDITAR DISPONIBILIDAD">
        <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
          <p className="text-sm text-muted-foreground">Bloquea franjas horarias para que los clientes no puedan reservar en esos momentos.</p>

          <Card>
            <p className="text-sm font-semibold text-navy mb-3">Añadir bloqueo</p>
            <div className="space-y-3">
              <Input label="Fecha" type="date" value={blockForm.block_date} min={new Date().toISOString().split("T")[0]}
                onChange={(e) => setBlockForm(p => ({ ...p, block_date: e.target.value }))} />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Hora inicio</label>
                  <select value={blockForm.start_time} onChange={(e) => setBlockForm(p => ({ ...p, start_time: e.target.value }))}
                    className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-navy focus:outline-none">
                    <option value="">Desde</option>
                    {timeSlots.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Hora fin</label>
                  <select value={blockForm.end_time} onChange={(e) => setBlockForm(p => ({ ...p, end_time: e.target.value }))}
                    className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-navy focus:outline-none">
                    <option value="">Hasta</option>
                    {timeSlots.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <Input label="Motivo (opcional)" value={blockForm.reason} onChange={(e) => setBlockForm(p => ({ ...p, reason: e.target.value }))} />
              <Button variant="secondary" size="sm" onClick={handleAddBlock} loading={savingBlock}
                disabled={!blockForm.block_date || !blockForm.start_time || !blockForm.end_time}>
                Bloquear franja
              </Button>
            </div>
          </Card>

          {blockedSlots.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-navy mb-2">Franjas bloqueadas</p>
              <div className="space-y-2">
                {blockedSlots.map((b) => (
                  <div key={b.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                    <div>
                      <span className="font-medium">{new Date(b.block_date + "T00:00:00").toLocaleDateString("es-ES")}</span>
                      <span className="text-muted-foreground ml-2">{b.start_time} — {b.end_time}</span>
                      {b.reason && <span className="text-muted-foreground ml-2">· {b.reason}</span>}
                    </div>
                    <button onClick={() => handleDeleteBlock(b.id)} className="text-muted-foreground hover:text-error ml-3">✕</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
