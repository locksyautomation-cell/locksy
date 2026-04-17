"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import VehicleSelect from "@/components/ui/VehicleSelect";
import Badge from "@/components/ui/Badge";
import Tabs from "@/components/ui/Tabs";
import type { Dealership, Appointment } from "@/lib/types";

const DEFAULT_STATUSES = ["En espera", "En reparación", "Reparación finalizada"];

const PERIOD_OPTIONS = [
  { label: "Últimos 12 meses", value: "12m" },
  { label: "Últimos 6 meses", value: "6m" },
  { label: "Últimos 3 meses", value: "3m" },
  { label: "Últimos 30 días", value: "30d" },
  { label: "Última semana", value: "7d" },
  { label: "Hoy", value: "today" },
  { label: "Intervalo personalizado", value: "custom" },
];

interface LocksyInvoice {
  id: string;
  dealer_id: string;
  invoice_number: string | null;
  concept: string;
  amount: number | null;
  file_url: string | null;
  payment_url: string | null;
  sent_at: string | null;
  created_at: string;
}

interface AppointmentRow {
  id: string;
  locator: string;
  client_id: string | null;
  vehicle_id: string | null;
  scheduled_date: string;
  scheduled_time: string;
  status: string;
  repair_status: string | null;
  description: string | null;
  key_code: string;
  budget_url: string | null;
  invoice_url: string | null;
  budget_amount: number | null;
  payment_status: string | null;
  manual_first_name: string | null;
  manual_last_name: string | null;
  manual_nif_cif: string | null;
  manual_phone: string | null;
  manual_address: string | null;
  manual_vehicle_brand: string | null;
  manual_vehicle_model: string | null;
  manual_vehicle_plate: string | null;
  client: { first_name: string; last_name: string; email: string; phone: string } | null;
  vehicle: { brand: string; model: string; plate: string } | null;
  created_at: string;
}

interface BillingRow {
  id: string;
  locator: string;
  scheduled_date: string;
  completed_at: string | null;
  budget_amount: number | null;
  payment_status: string;
  manual_first_name: string | null;
  manual_last_name: string | null;
  manual_vehicle_plate: string | null;
  users: { first_name: string; last_name: string } | null;
  vehicles: { brand: string; model: string; plate: string } | null;
}

function clientName(row: AppointmentRow | BillingRow): string {
  const u = "client" in row ? row.client : ("users" in row ? (row as { users: { first_name: string; last_name: string } | null }).users : null);
  if (u) return `${u.first_name} ${u.last_name}`.trim();
  if (row.manual_first_name || row.manual_last_name)
    return `${row.manual_first_name || ""} ${row.manual_last_name || ""}`.trim();
  return "—";
}

function vehiclePlate(row: AppointmentRow | BillingRow): string {
  const v = "vehicle" in row ? row.vehicle : ("vehicles" in row ? (row as { vehicles: { plate: string } | null }).vehicles : null);
  if (v?.plate) return v.plate;
  if (row.manual_vehicle_plate) return row.manual_vehicle_plate;
  return "—";
}

function vehicleLabel(row: AppointmentRow): string {
  if (row.vehicle) return `${row.vehicle.brand} ${row.vehicle.model}`;
  if (row.manual_vehicle_brand) return `${row.manual_vehicle_brand} ${row.manual_vehicle_model || ""}`.trim();
  return "—";
}

function statusBadge(status: string) {
  if (status === "finalizada") return <Badge variant="success">Finalizada</Badge>;
  if (status === "en_curso") return <Badge variant="info">En curso</Badge>;
  if (status === "rechazada") return <Badge variant="error">Rechazada</Badge>;
  if (status === "pendiente_aprobacion") return <Badge variant="warning">Pendiente de aprobación</Badge>;
  return <Badge variant="warning">Pendiente</Badge>;
}

function filterByPeriod(rows: BillingRow[], period: string, from: string, to: string): BillingRow[] {
  const now = new Date();
  let start: Date | null = null;
  let end: Date | null = null;

  if (period === "12m") { start = new Date(now); start.setMonth(start.getMonth() - 12); }
  else if (period === "6m") { start = new Date(now); start.setMonth(start.getMonth() - 6); }
  else if (period === "3m") { start = new Date(now); start.setMonth(start.getMonth() - 3); }
  else if (period === "30d") { start = new Date(now); start.setDate(start.getDate() - 30); }
  else if (period === "7d") { start = new Date(now); start.setDate(start.getDate() - 7); }
  else if (period === "today") {
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  } else if (period === "custom") {
    if (from) start = new Date(from);
    if (to) end = new Date(to);
  }

  return rows.filter((r) => {
    const d = new Date(r.completed_at || r.scheduled_date);
    if (start && d < start) return false;
    if (end && d > end) return false;
    return true;
  });
}

export default function DealerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") || "facturas";

  const [dealer, setDealer] = useState<Dealership | null>(null);
  const [loadingDealer, setLoadingDealer] = useState(true);

  // Tab A — Suscripción
  const [subPriceEur, setSubPriceEur] = useState<string | null>(null);
  const [subPriceInput, setSubPriceInput] = useState("");
  const [savingSubPrice, setSavingSubPrice] = useState(false);
  const [subPriceMsg, setSubPriceMsg] = useState("");
  const [subStatus, setSubStatus] = useState<string | null>(null);

  // Tab A — Facturas LOCKSY
  const [invoices, setInvoices] = useState<LocksyInvoice[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [invoiceForm, setInvoiceForm] = useState({ concept: "", amount: "", payment_url: "" });
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [sendingInvoice, setSendingInvoice] = useState(false);
  const [invoiceError, setInvoiceError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);
  // Edit invoice
  const [editingInvoice, setEditingInvoice] = useState<LocksyInvoice | null>(null);
  const [editInvoiceForm, setEditInvoiceForm] = useState({ concept: "", amount: "", payment_url: "" });
  const [editInvoiceFile, setEditInvoiceFile] = useState<File | null>(null);
  const [savingEditInvoice, setSavingEditInvoice] = useState(false);
  const [editInvoiceError, setEditInvoiceError] = useState("");
  // Delete invoice
  const [deletingInvoice, setDeletingInvoice] = useState<LocksyInvoice | null>(null);
  const [deletingInvoiceLoading, setDeletingInvoiceLoading] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState<string | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);

  // Tab B — Citas
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [loadingAppts, setLoadingAppts] = useState(false);
  const [apptsLoaded, setApptsLoaded] = useState(false);
  const [selectedAppt, setSelectedAppt] = useState<AppointmentRow | null>(null);
  const [apptSearch, setApptSearch] = useState("");
  const [apptSort, setApptSort] = useState<"desc" | "asc">("desc");
  // Edit appointment
  const [editingAppt, setEditingAppt] = useState<AppointmentRow | null>(null);
  const [apptForm, setApptForm] = useState({
    scheduled_date: "", scheduled_time: "", status: "pendiente", repair_status: "",
    description: "", budget_amount: "", budget_url: "", invoice_url: "",
    payment_status: "pending",
    manual_first_name: "", manual_last_name: "", manual_phone: "", manual_nif_cif: "",
    manual_address: "", manual_vehicle_brand: "", manual_vehicle_model: "",
    manual_vehicle_plate: "",
  });
  const [savingAppt, setSavingAppt] = useState(false);
  const [apptError, setApptError] = useState("");

  // Tab C — Estados
  const [customStatuses, setCustomStatuses] = useState<string[]>([]);
  const [newStatus, setNewStatus] = useState("");
  const [savingStatuses, setSavingStatuses] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");

  // Tab C — Localizador
  const [prefixInput, setPrefixInput] = useState("");
  const [savingPrefix, setSavingPrefix] = useState(false);
  const [prefixMsg, setPrefixMsg] = useState("");
  const [prefixError, setPrefixError] = useState("");

  // Tab D — Facturación
  const [billingOrders, setBillingOrders] = useState<BillingRow[]>([]);
  const [loadingBilling, setLoadingBilling] = useState(false);
  const [billingLoaded, setBillingLoaded] = useState(false);
  const [period, setPeriod] = useState("12m");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  // Stripe Connect
  const [connectStatus, setConnectStatus] = useState<"not_created" | "pending" | "active" | null>(null);
  const [connectLoading, setConnectLoading] = useState(false);
  const [connectMsg, setConnectMsg] = useState("");

  // Delete dealership
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  async function fetchSubConfig() {
    try {
      const res = await fetch(`/api/admin/get-subscription-config?dealer_id=${id}`);
      if (res.ok) {
        const data = await res.json();
        setSubPriceEur(data.amount_eur);
        setSubPriceInput(data.amount_eur || "");
      }
    } catch { /* ignore */ }
  }

  async function handleSetSubPrice() {
    if (!subPriceInput || isNaN(parseFloat(subPriceInput)) || parseFloat(subPriceInput) <= 0) {
      setSubPriceMsg("Introduce un importe válido.");
      return;
    }
    setSavingSubPrice(true);
    setSubPriceMsg("");
    try {
      const res = await fetch("/api/admin/set-subscription-price", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dealer_id: id, amount_eur: subPriceInput }),
      });
      if (res.ok) {
        setSubPriceEur(parseFloat(subPriceInput).toFixed(2));
        setSubPriceMsg("Precio actualizado. El concesionario puede activar su suscripción.");
      } else {
        setSubPriceMsg("Error al actualizar el precio.");
      }
    } catch {
      setSubPriceMsg("Error de conexión.");
    }
    setSavingSubPrice(false);
    setTimeout(() => setSubPriceMsg(""), 5000);
  }

  // Load dealer info + invoices on mount
  useEffect(() => {
    async function load() {
      const [dsRes, invRes] = await Promise.all([
        fetch("/api/admin/get-dealerships"),
        fetch(`/api/admin/get-dealer-invoices?dealer_id=${id}`),
      ]);
      const dsData = await dsRes.json();
      const found = (dsData.dealerships as Dealership[])?.find((d) => d.id === id);
      if (found) {
        setDealer(found);
        setSubStatus(found.subscription_status || "inactive");
        const existing = found.repair_statuses || DEFAULT_STATUSES;
        setCustomStatuses(existing.filter((s) => !DEFAULT_STATUSES.includes(s)));
        setPrefixInput(found.locator_prefix || "");
      }
      const invData = await invRes.json();
      setInvoices(invData.invoices || []);
      setLoadingDealer(false);
    }
    load();
    fetchSubConfig();
    loadConnectStatus();
    if (initialTab === "citas") loadAppointments();
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleTabChange(tab: string) {
    if (tab === "citas") loadAppointments();
    if (tab === "facturacion" && !billingLoaded) loadBilling();
  }

  async function handleDeleteDealership() {
    setDeleting(true);
    setDeleteError("");
    try {
      const res = await fetch("/api/admin/delete-dealership", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dealership_id: id }),
      });
      if (res.ok) {
        router.push("/admin/concesionarios");
      } else {
        const data = await res.json();
        setDeleteError(data.error || "Error al eliminar el concesionario.");
      }
    } catch {
      setDeleteError("Error de conexión.");
    }
    setDeleting(false);
  }

  async function loadConnectStatus() {
    try {
      const res = await fetch(`/api/admin/get-connect-status?dealership_id=${id}`);
      if (res.ok) {
        const data = await res.json();
        setConnectStatus(data.status);
      }
    } catch { /* ignore */ }
  }

  async function handleCreateConnect() {
    setConnectLoading(true);
    setConnectMsg("");
    try {
      const res = await fetch("/api/admin/create-connect-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dealership_id: id }),
      });
      if (res.ok) {
        setConnectStatus("pending");
        setConnectMsg("Enlace enviado por email al concesionario.");
        setTimeout(() => setConnectMsg(""), 5000);
      } else {
        setConnectMsg("Error al enviar el enlace.");
      }
    } catch {
      setConnectMsg("Error de conexión.");
    }
    setConnectLoading(false);
  }

  async function loadInvoices() {
    setLoadingInvoices(true);
    const res = await fetch(`/api/admin/get-dealer-invoices?dealer_id=${id}`);
    const data = await res.json();
    setInvoices(data.invoices || []);
    setLoadingInvoices(false);
  }

  async function loadAppointments() {
    setLoadingAppts(true);
    const res = await fetch(`/api/admin/get-dealer-appointments?dealer_id=${id}`);
    const data = await res.json();
    setAppointments(data.appointments || []);
    setApptsLoaded(true);
    setLoadingAppts(false);
  }

  function openEditAppt(a: AppointmentRow) {
    setSelectedAppt(null);
    setApptForm({
      scheduled_date: a.scheduled_date?.slice(0, 10) || "",
      scheduled_time: a.scheduled_time?.slice(0, 5) || "",
      status: a.status || "pendiente",
      repair_status: a.repair_status || "",
      description: a.description || "",
      budget_amount: a.budget_amount != null ? String(a.budget_amount) : "",
      budget_url: a.budget_url || "",
      invoice_url: a.invoice_url || "",
      payment_status: a.payment_status || "pending",
      manual_first_name: a.manual_first_name || "",
      manual_last_name: a.manual_last_name || "",
      manual_phone: a.manual_phone || "",
      manual_nif_cif: a.manual_nif_cif || "",
      manual_address: a.manual_address || "",
      manual_vehicle_brand: a.manual_vehicle_brand || "",
      manual_vehicle_model: a.manual_vehicle_model || "",
      manual_vehicle_plate: a.manual_vehicle_plate || "",
    });
    setApptError("");
    setEditingAppt(a);
  }

  async function handleSaveAppt() {
    if (!editingAppt) return;
    setSavingAppt(true);
    setApptError("");
    const res = await fetch("/api/admin/update-appointment", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: editingAppt.id, ...apptForm }),
    });
    if (!res.ok) {
      const data = await res.json();
      setApptError(data.error || "Error al guardar la cita.");
    } else {
      setEditingAppt(null);
      setApptsLoaded(false);
      loadAppointments();
    }
    setSavingAppt(false);
  }

  async function loadBilling() {
    setLoadingBilling(true);
    const res = await fetch(`/api/admin/get-dealer-billing?dealer_id=${id}`);
    const data = await res.json();
    setBillingOrders(data.orders || []);
    setBillingLoaded(true);
    setLoadingBilling(false);
  }

  async function handleSendInvoice() {
    if (!invoiceForm.concept) { setInvoiceError("El concepto es obligatorio."); return; }
    setSendingInvoice(true);
    setInvoiceError("");
    const fd = new FormData();
    fd.append("dealer_id", id);
    fd.append("concept", invoiceForm.concept);
    fd.append("amount", invoiceForm.amount);
    if (invoiceForm.payment_url) fd.append("payment_url", invoiceForm.payment_url);
    if (invoiceFile) fd.append("file", invoiceFile);

    const res = await fetch("/api/admin/upload-invoice", { method: "POST", body: fd });
    if (!res.ok) {
      const data = await res.json();
      setInvoiceError(data.error || "Error al enviar factura.");
    } else {
      setShowInvoiceModal(false);
      setInvoiceForm({ concept: "", amount: "", payment_url: "" });
      setInvoiceFile(null);
      loadInvoices();
    }
    setSendingInvoice(false);
  }

  async function handleGeneratePdf(invoiceId: string) {
    setGeneratingPdf(invoiceId);
    setPdfError(null);
    try {
      const res = await fetch("/api/admin/generate-invoice-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoice_id: invoiceId }),
      });
      const data = await res.json();
      if (res.ok && data.fileUrl) {
        setInvoices((prev) =>
          prev.map((inv) => inv.id === invoiceId ? { ...inv, file_url: data.fileUrl } : inv)
        );
      } else {
        setPdfError(data.error || "Error al generar el PDF.");
      }
    } catch {
      setPdfError("Error de conexión al generar el PDF.");
    } finally {
      setGeneratingPdf(null);
    }
  }

  function openEditInvoice(inv: LocksyInvoice) {
    setEditingInvoice(inv);
    setEditInvoiceForm({ concept: inv.concept, amount: inv.amount != null ? String(inv.amount) : "", payment_url: inv.payment_url || "" });
    setEditInvoiceFile(null);
    setEditInvoiceError("");
  }

  async function handleEditInvoice() {
    if (!editingInvoice || !editInvoiceForm.concept) { setEditInvoiceError("El concepto es obligatorio."); return; }
    setSavingEditInvoice(true);
    setEditInvoiceError("");
    const fd = new FormData();
    fd.append("id", editingInvoice.id);
    fd.append("concept", editInvoiceForm.concept);
    fd.append("amount", editInvoiceForm.amount);
    if (editInvoiceForm.payment_url) fd.append("payment_url", editInvoiceForm.payment_url);
    if (editInvoiceFile) fd.append("file", editInvoiceFile);

    const res = await fetch("/api/admin/update-invoice", { method: "PUT", body: fd });
    if (!res.ok) {
      const data = await res.json();
      setEditInvoiceError(data.error || "Error al actualizar.");
    } else {
      setEditingInvoice(null);
      loadInvoices();
    }
    setSavingEditInvoice(false);
  }

  async function handleDeleteInvoice() {
    if (!deletingInvoice) return;
    setDeletingInvoiceLoading(true);
    await fetch("/api/admin/delete-invoice", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: deletingInvoice.id }),
    });
    setDeletingInvoice(null);
    loadInvoices();
    setDeletingInvoiceLoading(false);
  }

  async function handleSaveStatuses() {
    if (!dealer) return;
    setSavingStatuses(true);
    setStatusMsg("");
    const allStatuses = [...DEFAULT_STATUSES, ...customStatuses];
    const res = await fetch("/api/admin/update-dealership", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: dealer.id, name: dealer.name, repair_statuses: allStatuses }),
    });
    if (res.ok) {
      setDealer((prev) => prev ? { ...prev, repair_statuses: allStatuses } : null);
      setStatusMsg("Guardado correctamente");
      setTimeout(() => setStatusMsg(""), 3000);
    }
    setSavingStatuses(false);
  }

  function addStatus() {
    const t = newStatus.trim();
    if (!t || customStatuses.includes(t) || DEFAULT_STATUSES.includes(t)) return;
    setCustomStatuses((p) => [...p, t]);
    setNewStatus("");
  }

  async function handleSavePrefix() {
    if (!dealer) return;
    const normalized = prefixInput.toUpperCase().trim();
    if (!/^[A-Z]{2}$/.test(normalized)) {
      setPrefixError("El prefijo debe ser exactamente 2 letras (A–Z).");
      return;
    }
    setSavingPrefix(true);
    setPrefixError("");
    setPrefixMsg("");
    const res = await fetch("/api/admin/set-locator-prefix", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dealership_id: dealer.id, prefix: normalized }),
    });
    const data = await res.json();
    if (!res.ok) {
      setPrefixError(data.error || "Error al guardar el prefijo.");
    } else {
      setDealer((prev) => prev ? { ...prev, locator_prefix: normalized } : null);
      setPrefixInput(normalized);
      setPrefixMsg(`Prefijo ${normalized} guardado. Todas las citas actualizadas.`);
      setTimeout(() => setPrefixMsg(""), 4000);
    }
    setSavingPrefix(false);
  }

  const filteredBilling = useMemo(
    () => filterByPeriod(billingOrders, period, customFrom, customTo),
    [billingOrders, period, customFrom, customTo]
  );

  const totalIncome = filteredBilling.reduce((acc, r) => acc + (r.budget_amount || 0), 0);

  // Registration link
  const [linkCopied, setLinkCopied] = useState(false);
  const registrationLink = dealer?.slug ? `${process.env.NEXT_PUBLIC_APP_URL || ""}/register/${dealer.slug}` : "";

  async function copyRegLink() {
    await navigator.clipboard.writeText(registrationLink);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2500);
  }

  if (loadingDealer) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin h-8 w-8 border-2 border-navy border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!dealer) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Concesionario no encontrado.</p>
        <Button variant="outline" size="sm" className="mt-4" onClick={() => router.back()}>Volver</Button>
      </div>
    );
  }

  return (
    <div>
      {/* Back + header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="text-muted-foreground hover:text-foreground">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="heading text-2xl text-navy">{dealer.name}</h1>
            {dealer.vehicle_type === "motos" && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-orange/10 px-3 py-1 text-sm font-medium text-orange border border-orange/20">
                🏍️ Concesionario de Motos
              </span>
            )}
            {dealer.vehicle_type === "coches" && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700 border border-blue-200">
                🚗 Concesionario de Coches
              </span>
            )}
            {dealer.vehicle_type === "ambos" && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-sm font-medium text-foreground border border-border">
                🏍️🚗 Motos y Coches
              </span>
            )}
          </div>
          {dealer.nif_cif && <p className="text-sm text-muted-foreground mt-0.5">NIF/CIF: {dealer.nif_cif}</p>}
        </div>
        <Button variant="danger" size="sm" onClick={() => { setDeleteError(""); setShowDeleteModal(true); }}>
          Eliminar
        </Button>
      </div>

      <Tabs
        tabs={[
          { id: "facturas", label: "Pagos" },
          { id: "citas", label: "Citas" },
          { id: "estados", label: "Estados de reparación" },
          { id: "facturacion", label: "Facturación" },
          { id: "registro", label: "Enlace de registro" },
        ]}
        defaultTab={initialTab}
        onChange={handleTabChange}
      >
        {(activeTab) => (
          <>
            {/* ── TAB A: Pagos ── */}
            {activeTab === "facturas" && (
              <div>
                {/* Subscription section */}
                <div className="rounded-xl border border-border bg-white shadow-sm p-5 mb-6">
                  <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                    <div className="flex-1">
                      <h2 className="heading text-base text-navy mb-2">SUSCRIPCIÓN MENSUAL</h2>
                      <div className="flex items-center gap-3 mb-3 flex-wrap">
                        {(() => {
                          const statusMap: Record<string, { label: string; color: string }> = {
                            active: { label: "Activa", color: "text-green-700 bg-green-50 border-green-200" },
                            canceling: { label: "Cancela fin periodo", color: "text-yellow-700 bg-yellow-50 border-yellow-200" },
                            past_due: { label: "Pago pendiente", color: "text-red-700 bg-red-50 border-red-200" },
                            pending: { label: "Pendiente", color: "text-blue-700 bg-blue-50 border-blue-200" },
                            inactive: { label: "Inactiva", color: "text-muted-foreground bg-muted border-border" },
                          };
                          const s = subStatus || "inactive";
                          const info = statusMap[s] || statusMap.inactive;
                          const periodEnd = dealer.subscription_period_end ? new Date(dealer.subscription_period_end) : null;
                          const daysRemaining = periodEnd
                            ? Math.max(0, Math.ceil((periodEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
                            : null;
                          return (
                            <>
                              <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${info.color}`}>
                                {info.label}
                              </span>
                              {subPriceEur && (
                                <span className="text-sm text-muted-foreground">Precio: <span className="font-medium text-foreground">{subPriceEur} €/mes</span> <span className="text-xs">(IVA exc.)</span></span>
                              )}
                              {(s === "canceling" || s === "active") && periodEnd && (
                                <span className="text-sm text-muted-foreground">
                                  {s === "canceling" ? "Acceso hasta" : "Periodo hasta"}:{" "}
                                  <span className="font-medium text-foreground">
                                    {periodEnd.toLocaleDateString("es-ES")}
                                    {s === "canceling" && daysRemaining !== null && ` (${daysRemaining} ${daysRemaining === 1 ? "día" : "días"})`}
                                  </span>
                                </span>
                              )}
                            </>
                          );
                        })()}
                      </div>
                      <p className="text-xs text-muted-foreground mb-3">
                        Establece el precio mensual para este concesionario. El concesionario podrá activar la suscripción desde su panel introduciendo su tarjeta.
                      </p>
                      <div className="flex items-center gap-3 flex-wrap">
                        <div className="inline-flex items-center rounded-lg border border-border focus-within:border-navy focus-within:ring-2 focus-within:ring-navy/20 px-3 py-2 gap-0.5">
                          <input
                            type="text"
                            inputMode="decimal"
                            placeholder="0.00"
                            value={subPriceInput}
                            onChange={(e) => setSubPriceInput(e.target.value.replace(/[^0-9.]/g, ""))}
                            style={{ width: `${Math.max((subPriceInput || "0.00").length, 4)}ch` }}
                            className="text-sm outline-none bg-transparent min-w-0"
                          />
                          <span className="text-sm text-muted-foreground select-none">€</span>
                        </div>
                        <Button variant="secondary" size="sm" onClick={handleSetSubPrice} loading={savingSubPrice}>
                          {subPriceEur ? "Actualizar precio" : "Establecer precio"}
                        </Button>
                        {subPriceMsg && (
                          <span className={`text-xs ${subPriceMsg.includes("Error") ? "text-red-600" : "text-green-600"}`}>
                            {subPriceMsg}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Stripe Connect */}
                <div className="rounded-xl border border-border bg-white shadow-sm p-5 mb-6">
                  <h2 className="heading text-base text-navy mb-2">CUENTA DE PAGOS (STRIPE CONNECT)</h2>
                  <p className="text-xs text-muted-foreground mb-4">
                    El concesionario necesita una cuenta Stripe Connect para recibir los pagos de las reparaciones directamente.
                  </p>
                  <div className="flex items-center gap-3 flex-wrap">
                    {connectStatus === "active" && (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-green-200 bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700">
                        ✓ Cuenta activa — recibe pagos
                      </span>
                    )}
                    {connectStatus === "pending" && (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-yellow-200 bg-yellow-50 px-2.5 py-0.5 text-xs font-medium text-yellow-700">
                        Pendiente de completar onboarding
                      </span>
                    )}
                    {connectStatus === "not_created" && (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                        Sin cuenta
                      </span>
                    )}
                    {connectStatus !== "active" && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={handleCreateConnect}
                        loading={connectLoading}
                      >
                        {connectStatus === "pending" ? "Reenviar enlace de onboarding" : "Crear cuenta Stripe"}
                      </Button>
                    )}
                    {connectStatus === "pending" && (
                      <Button variant="outline" size="sm" onClick={loadConnectStatus}>
                        Verificar estado
                      </Button>
                    )}
                    {connectMsg && (
                      <span className={`text-xs ${connectMsg.includes("Error") ? "text-red-600" : "text-green-600"}`}>
                        {connectMsg}
                      </span>
                    )}
                  </div>
                </div>

                {/* Billing profile data filled by the dealer */}
                <div className="rounded-xl border border-border bg-white shadow-sm p-5 mb-6">
                  <h2 className="heading text-base text-navy mb-4">DATOS DE FACTURACIÓN DEL CONCESIONARIO</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    {[
                      { label: "Nombre / Razón social", value: dealer.billing_name },
                      { label: "NIF / CIF de facturación", value: dealer.billing_nif_cif },
                      { label: "Email de facturación", value: dealer.billing_email },
                      { label: "Teléfono de facturación", value: dealer.billing_phone },
                      { label: "IBAN", value: dealer.iban },
                      { label: "Dirección fiscal", value: dealer.billing_address },
                    ].map(({ label, value }) => (
                      <div key={label}>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">{label}</p>
                        <p className="font-medium text-foreground">{value || <span className="text-muted-foreground italic">Sin rellenar</span>}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between mb-4">
                  <h2 className="heading text-lg text-navy">FACTURAS EMITIDAS</h2>
                  <Button variant="secondary" size="sm" onClick={() => { setInvoiceError(""); setShowInvoiceModal(true); }}>
                    Añadir factura
                  </Button>
                </div>

                {pdfError && (
                  <p className="text-sm text-red-600 mb-3">{pdfError}</p>
                )}

                {loadingInvoices ? (
                  <div className="flex justify-center py-10">
                    <div className="animate-spin h-6 w-6 border-2 border-navy border-t-transparent rounded-full" />
                  </div>
                ) : invoices.length === 0 ? (
                  <p className="text-center text-muted-foreground py-10">No hay facturas emitidas.</p>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-border bg-white shadow-sm">
                    <table className="min-w-full divide-y divide-border">
                      <thead className="bg-muted">
                        <tr>
                          <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Nº Factura</th>
                          <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Concepto</th>
                          <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Importe</th>
                          <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Fecha</th>
                          <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Archivo</th>
                          <th className="px-5 py-3" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {invoices.map((inv) => (
                          <tr key={inv.id} className="hover:bg-muted/50">
                            <td className="px-5 py-4">
                              <span className="heading text-xs text-navy">{inv.invoice_number ?? "—"}</span>
                            </td>
                            <td className="px-5 py-4 font-medium text-foreground">{inv.concept}</td>
                            <td className="px-5 py-4 text-sm text-foreground">
                              {inv.amount != null ? `${Number(inv.amount).toFixed(2)} €` : "—"}
                            </td>
                            <td className="px-5 py-4 text-sm text-muted-foreground">
                              {new Date(inv.sent_at || inv.created_at).toLocaleDateString("es-ES")}
                            </td>
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-2">
                                {inv.file_url && (
                                  <a
                                    href={inv.file_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-xs font-medium text-navy hover:underline"
                                  >
                                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                    </svg>
                                    Descargar
                                  </a>
                                )}
                                <button
                                  onClick={() => handleGeneratePdf(inv.id)}
                                  disabled={generatingPdf === inv.id}
                                  className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-navy transition-colors disabled:opacity-50"
                                >
                                  {generatingPdf === inv.id ? (
                                    <div className="h-3 w-3 border border-current border-t-transparent rounded-full animate-spin" />
                                  ) : (
                                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                  )}
                                  {inv.file_url ? "Regenerar" : "Generar PDF"}
                                </button>
                              </div>
                            </td>
                            <td className="px-5 py-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button variant="outline" size="sm" onClick={() => openEditInvoice(inv)}>Editar</Button>
                                <Button variant="danger" size="sm" onClick={() => setDeletingInvoice(inv)}>Eliminar</Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Add invoice modal */}
                <Modal isOpen={showInvoiceModal} onClose={() => setShowInvoiceModal(false)} title="AÑADIR FACTURA">
                  <div className="space-y-4">
                    <Input label="Concepto" value={invoiceForm.concept}
                      onChange={(e) => setInvoiceForm((p) => ({ ...p, concept: e.target.value }))} required />
                    <Input label="Importe (€)" type="number" value={invoiceForm.amount} placeholder="0.00"
                      onChange={(e) => setInvoiceForm((p) => ({ ...p, amount: e.target.value }))} />
                    <Input label="Enlace de pago (opcional)" value={invoiceForm.payment_url} placeholder="https://..."
                      onChange={(e) => setInvoiceForm((p) => ({ ...p, payment_url: e.target.value }))} />
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">Archivo (PDF o imagen)</label>
                      <input ref={fileInputRef} type="file" accept=".pdf,image/*"
                        onChange={(e) => setInvoiceFile(e.target.files?.[0] || null)}
                        className="block w-full text-sm text-muted-foreground file:mr-4 file:rounded-lg file:border file:border-border file:bg-muted file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-foreground hover:file:bg-navy/10" />
                      {invoiceFile && <p className="mt-1 text-xs text-muted-foreground">{invoiceFile.name}</p>}
                    </div>
                    {invoiceError && <p className="text-sm text-error">{invoiceError}</p>}
                    <div className="flex gap-3 pt-2">
                      <Button variant="outline" fullWidth onClick={() => setShowInvoiceModal(false)}>Cancelar</Button>
                      <Button variant="secondary" fullWidth onClick={handleSendInvoice} loading={sendingInvoice}>Enviar factura</Button>
                    </div>
                  </div>
                </Modal>

                {/* Edit invoice modal */}
                <Modal isOpen={!!editingInvoice} onClose={() => setEditingInvoice(null)} title="EDITAR FACTURA">
                  <div className="space-y-4">
                    <Input label="Concepto" value={editInvoiceForm.concept}
                      onChange={(e) => setEditInvoiceForm((p) => ({ ...p, concept: e.target.value }))} required />
                    <Input label="Importe (€)" type="number" value={editInvoiceForm.amount} placeholder="0.00"
                      onChange={(e) => setEditInvoiceForm((p) => ({ ...p, amount: e.target.value }))} />
                    <Input label="Enlace de pago (opcional)" value={editInvoiceForm.payment_url} placeholder="https://..."
                      onChange={(e) => setEditInvoiceForm((p) => ({ ...p, payment_url: e.target.value }))} />
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">Reemplazar archivo (opcional)</label>
                      <input ref={editFileInputRef} type="file" accept=".pdf,image/*"
                        onChange={(e) => setEditInvoiceFile(e.target.files?.[0] || null)}
                        className="block w-full text-sm text-muted-foreground file:mr-4 file:rounded-lg file:border file:border-border file:bg-muted file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-foreground hover:file:bg-navy/10" />
                      {editInvoiceFile && <p className="mt-1 text-xs text-muted-foreground">{editInvoiceFile.name}</p>}
                      {editingInvoice?.file_url && !editInvoiceFile && (
                        <p className="mt-1 text-xs text-muted-foreground">Archivo actual: <a href={editingInvoice.file_url} target="_blank" rel="noopener noreferrer" className="text-navy hover:underline">ver</a></p>
                      )}
                    </div>
                    {editInvoiceError && <p className="text-sm text-error">{editInvoiceError}</p>}
                    <div className="flex gap-3 pt-2">
                      <Button variant="outline" fullWidth onClick={() => setEditingInvoice(null)}>Cancelar</Button>
                      <Button variant="secondary" fullWidth onClick={handleEditInvoice} loading={savingEditInvoice}>Guardar cambios</Button>
                    </div>
                  </div>
                </Modal>

                {/* Delete invoice modal */}
                <Modal isOpen={!!deletingInvoice} onClose={() => setDeletingInvoice(null)} title="ELIMINAR FACTURA">
                  <div className="space-y-4">
                    <p className="text-sm text-foreground">
                      ¿Eliminar la factura <strong>{deletingInvoice?.concept}</strong>? Esta acción no se puede deshacer.
                    </p>
                    <div className="flex gap-3">
                      <Button variant="outline" fullWidth onClick={() => setDeletingInvoice(null)}>Cancelar</Button>
                      <Button variant="danger" fullWidth onClick={handleDeleteInvoice} loading={deletingInvoiceLoading}>Eliminar</Button>
                    </div>
                  </div>
                </Modal>
              </div>
            )}

            {/* ── TAB B: Citas ── */}
            {activeTab === "citas" && (
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
                  <h2 className="heading text-lg text-navy flex-1">CITAS</h2>
                  <input
                    type="text"
                    placeholder="Buscar por código, cliente, matrícula..."
                    value={apptSearch}
                    onChange={(e) => setApptSearch(e.target.value)}
                    className="rounded-lg border border-border px-3 py-2 text-sm focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/20 sm:w-64"
                  />
                  <select
                    value={apptSort}
                    onChange={(e) => setApptSort(e.target.value as "desc" | "asc")}
                    className="rounded-lg border border-border px-3 py-2 text-sm focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/20"
                  >
                    <option value="desc">Más reciente primero</option>
                    <option value="asc">Más antigua primero</option>
                  </select>
                </div>
                {loadingAppts ? (
                  <div className="flex justify-center py-10">
                    <div className="animate-spin h-6 w-6 border-2 border-navy border-t-transparent rounded-full" />
                  </div>
                ) : (
                  (() => {
                    const q = apptSearch.toLowerCase();
                    const filtered = appointments
                      .filter((a) =>
                        !q ||
                        a.locator.toLowerCase().includes(q) ||
                        clientName(a).toLowerCase().includes(q) ||
                        vehiclePlate(a).toLowerCase().includes(q) ||
                        vehicleLabel(a).toLowerCase().includes(q)
                      )
                      .sort((a, b) => {
                        const da = new Date(a.created_at).getTime();
                        const db = new Date(b.created_at).getTime();
                        return apptSort === "desc" ? db - da : da - db;
                      });
                    return filtered.length === 0 ? (
                      <p className="text-center text-muted-foreground py-10">No hay citas registradas.</p>
                    ) : (
                  <div className="overflow-x-auto rounded-xl border border-border bg-white shadow-sm">
                    <table className="min-w-full divide-y divide-border">
                      <thead className="bg-muted">
                        <tr>
                          <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Código</th>
                          <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Cliente</th>
                          <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Vehículo</th>
                          <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Matrícula</th>
                          <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Fecha</th>
                          <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Hora</th>
                          <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Estado</th>
                          <th className="px-5 py-3" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {filtered.map((a) => (
                          <tr
                            key={a.id}
                            onClick={() => router.push(`/admin/concesionarios/${id}/citas/${a.id}`)}
                            className="hover:bg-muted/50 cursor-pointer transition-colors"
                          >
                            <td className="px-5 py-4 font-mono text-sm font-medium text-navy">{a.locator}</td>
                            <td className="px-5 py-4 text-sm text-foreground">{clientName(a)}</td>
                            <td className="px-5 py-4 text-sm text-foreground">{vehicleLabel(a)}</td>
                            <td className="px-5 py-4 text-sm text-foreground">{vehiclePlate(a)}</td>
                            <td className="px-5 py-4 text-sm text-muted-foreground">
                              {new Date(a.scheduled_date).toLocaleDateString("es-ES")}
                            </td>
                            <td className="px-5 py-4 text-sm text-muted-foreground">{a.scheduled_time?.slice(0, 5)}</td>
                            <td className="px-5 py-4">{statusBadge(a.status)}</td>
                            <td className="px-5 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                              <Button variant="outline" size="sm" onClick={() => openEditAppt(a)}>Editar</Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                    );
                  })()
                )}

              {/* Edit appointment modal */}
              <Modal
                isOpen={!!editingAppt}
                onClose={() => setEditingAppt(null)}
                title="EDITAR CITA"
              >
                <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      label="Fecha"
                      type="date"
                      value={apptForm.scheduled_date}
                      onChange={(e) => setApptForm((p) => ({ ...p, scheduled_date: e.target.value }))}
                    />
                    <div>
                      <label className="block text-sm font-medium mb-1.5">Hora</label>
                      <select
                        value={apptForm.scheduled_time}
                        onChange={(e) => setApptForm((p) => ({ ...p, scheduled_time: e.target.value }))}
                        className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/20"
                      >
                        {Array.from({ length: 24 }, (_, h) =>
                          ["00", "30"].map((m) => `${String(h).padStart(2, "0")}:${m}`)
                        ).flat().map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium mb-1.5">Estado cita</label>
                      <select
                        value={apptForm.status}
                        onChange={(e) => setApptForm((p) => ({ ...p, status: e.target.value }))}
                        className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/20"
                      >
                        <option value="pendiente_aprobacion">Pendiente de aprobación</option>
                        <option value="pendiente">Pendiente</option>
                        <option value="en_curso">En curso</option>
                        <option value="finalizada">Finalizada</option>
                        <option value="rechazada">Rechazada</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1.5">Estado reparación</label>
                      <select
                        value={apptForm.repair_status}
                        onChange={(e) => setApptForm((p) => ({ ...p, repair_status: e.target.value }))}
                        className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/20"
                      >
                        <option value="">—</option>
                        {(dealer?.repair_statuses || DEFAULT_STATUSES).map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Descripción</label>
                    <textarea
                      value={apptForm.description}
                      onChange={(e) => setApptForm((p) => ({ ...p, description: e.target.value }))}
                      rows={3}
                      className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/20 resize-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      label="Presupuesto (€)"
                      type="number"
                      value={apptForm.budget_amount}
                      placeholder="0.00"
                      onChange={(e) => setApptForm((p) => ({ ...p, budget_amount: e.target.value }))}
                    />
                    <div>
                      <label className="block text-sm font-medium mb-1.5">Estado de pago</label>
                      <select
                        value={apptForm.payment_status}
                        onChange={(e) => setApptForm((p) => ({ ...p, payment_status: e.target.value }))}
                        className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/20"
                      >
                        <option value="pending">Pendiente</option>
                        <option value="paid">Pagado</option>
                        <option value="not_required">No requerido</option>
                      </select>
                    </div>
                  </div>
                  <Input
                    label="URL presupuesto"
                    value={apptForm.budget_url}
                    placeholder="https://..."
                    onChange={(e) => setApptForm((p) => ({ ...p, budget_url: e.target.value }))}
                  />
                  <Input
                    label="URL factura"
                    value={apptForm.invoice_url}
                    placeholder="https://..."
                    onChange={(e) => setApptForm((p) => ({ ...p, invoice_url: e.target.value }))}
                  />
                  {editingAppt && !editingAppt.client_id && (
                    <>
                      <hr className="border-border" />
                      <p className="text-sm font-semibold text-muted-foreground">Datos del cliente (manual)</p>
                      <div className="grid grid-cols-2 gap-3">
                        <Input label="Nombre" value={apptForm.manual_first_name}
                          onChange={(e) => setApptForm((p) => ({ ...p, manual_first_name: e.target.value }))} />
                        <Input label="Apellidos" value={apptForm.manual_last_name}
                          onChange={(e) => setApptForm((p) => ({ ...p, manual_last_name: e.target.value }))} />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <Input label="Teléfono" value={apptForm.manual_phone}
                          onChange={(e) => setApptForm((p) => ({ ...p, manual_phone: e.target.value }))} />
                        <Input label="NIF/CIF" value={apptForm.manual_nif_cif}
                          onChange={(e) => setApptForm((p) => ({ ...p, manual_nif_cif: e.target.value }))} />
                      </div>
                      <Input label="Dirección" value={apptForm.manual_address}
                        onChange={(e) => setApptForm((p) => ({ ...p, manual_address: e.target.value }))} />
                      <p className="text-sm font-semibold text-muted-foreground">Datos del vehículo (manual)</p>
                      <div className="grid grid-cols-2 gap-3">
                        <VehicleSelect
                          brand={apptForm.manual_vehicle_brand}
                          model={apptForm.manual_vehicle_model}
                          onBrandChange={(v) => setApptForm((p) => ({ ...p, manual_vehicle_brand: v }))}
                          onModelChange={(v) => setApptForm((p) => ({ ...p, manual_vehicle_model: v }))}
                        />
                      </div>
                      <Input label="Matrícula" value={apptForm.manual_vehicle_plate}
                        onChange={(e) => setApptForm((p) => ({ ...p, manual_vehicle_plate: e.target.value }))} />
                    </>
                  )}
                  {editingAppt?.client_id && (
                    <div className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
                      Cliente registrado:{" "}
                      <span className="font-medium text-foreground">{clientName(editingAppt)}</span>
                    </div>
                  )}
                  {apptError && <p className="text-sm text-error">{apptError}</p>}
                  <div className="flex gap-3 pt-2">
                    <Button variant="outline" fullWidth onClick={() => setEditingAppt(null)}>Cancelar</Button>
                    <Button variant="secondary" fullWidth onClick={handleSaveAppt} loading={savingAppt}>
                      Guardar cambios
                    </Button>
                  </div>
                </div>
              </Modal>
              </div>
            )}

            {/* ── TAB C: Estados de reparación ── */}
            {activeTab === "estados" && (
              <div className="max-w-lg">
                <h2 className="heading text-lg text-navy mb-4">ESTADOS DE REPARACIÓN</h2>

                {/* Default (non-deletable) */}
                <div className="space-y-2 mb-4">
                  {DEFAULT_STATUSES.map((s) => (
                    <div key={s} className="flex items-center justify-between rounded-lg bg-muted px-3 py-2 text-sm">
                      <span className="text-foreground">{s}</span>
                      <span className="text-xs text-muted-foreground">Por defecto</span>
                    </div>
                  ))}
                </div>

                {/* Custom */}
                {customStatuses.map((s) => (
                  <div key={s} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm mb-2">
                    <span className="text-foreground">{s}</span>
                    <button
                      onClick={() => setCustomStatuses((p) => p.filter((x) => x !== s))}
                      className="text-muted-foreground hover:text-error transition-colors"
                    >✕</button>
                  </div>
                ))}

                {/* Add */}
                <div className="flex gap-2 mt-2 mb-4">
                  <input
                    type="text"
                    placeholder="Nuevo estado..."
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addStatus())}
                    className="flex-1 rounded-lg border border-border px-3 py-2 text-sm focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/20"
                  />
                  <Button variant="outline" size="sm" onClick={addStatus}>Añadir estado</Button>
                </div>

                <div className="flex items-center gap-4">
                  <Button variant="secondary" size="sm" onClick={handleSaveStatuses} loading={savingStatuses}>
                    Guardar cambios
                  </Button>
                  {statusMsg && <span className="text-sm text-green-600">{statusMsg}</span>}
                </div>

                {/* Locator prefix */}
                <div className="mt-8 pt-6 border-t border-border">
                  <h2 className="heading text-lg text-navy mb-1">PREFIJO DE LOCALIZADOR</h2>
                  <p className="text-sm text-muted-foreground mb-4">
                    Define las 2 letras del localizador de citas (ej: <span className="font-mono font-semibold">MS</span> → <span className="font-mono font-semibold">MS-0000</span>).
                    El cambio actualizará todos los localizadores existentes de este concesionario.
                    No pueden existir dos concesionarios con el mismo prefijo.
                  </p>
                  {dealer?.locator_prefix && (
                    <p className="text-sm mb-3">
                      Prefijo actual: <span className="font-mono font-bold text-navy">{dealer.locator_prefix}</span>
                      {" · "}Formato: <span className="font-mono text-navy">{dealer.locator_prefix}-0000</span>
                    </p>
                  )}
                  <div className="flex items-center gap-3 flex-wrap">
                    <input
                      type="text"
                      maxLength={2}
                      value={prefixInput}
                      onChange={(e) => { setPrefixInput(e.target.value.toUpperCase()); setPrefixError(""); }}
                      placeholder="AB"
                      className="w-20 rounded-lg border border-border px-3 py-2 text-sm font-mono uppercase tracking-widest focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/20"
                    />
                    <Button variant="secondary" size="sm" onClick={handleSavePrefix} loading={savingPrefix}>
                      {dealer?.locator_prefix ? "Cambiar prefijo" : "Asignar prefijo"}
                    </Button>
                  </div>
                  {prefixError && <p className="text-sm text-error mt-2">{prefixError}</p>}
                  {prefixMsg && <p className="text-sm text-green-600 mt-2">{prefixMsg}</p>}
                </div>
              </div>
            )}

            {/* ── TAB D: Facturación ── */}
            {activeTab === "facturacion" && (
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
                  <h2 className="heading text-lg text-navy flex-1">FACTURACIÓN DEL CONCESIONARIO</h2>
                  <select
                    value={period}
                    onChange={(e) => setPeriod(e.target.value)}
                    className="rounded-lg border border-border px-3 py-2 text-sm focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/20"
                  >
                    {PERIOD_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>

                {period === "custom" && (
                  <div className="flex gap-3 mb-4">
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">Desde</label>
                      <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)}
                        className="rounded-lg border border-border px-3 py-2 text-sm focus:border-navy focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">Hasta</label>
                      <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)}
                        className="rounded-lg border border-border px-3 py-2 text-sm focus:border-navy focus:outline-none" />
                    </div>
                  </div>
                )}

                {/* Revenue summary */}
                <div className="rounded-xl border border-border bg-white p-5 mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Ingresos totales</p>
                    <p className="heading text-2xl text-navy">{totalIncome.toFixed(2)} €</p>
                  </div>
                  <p className="text-sm text-muted-foreground">{filteredBilling.length} reparaciones</p>
                </div>

                {loadingBilling ? (
                  <div className="flex justify-center py-10">
                    <div className="animate-spin h-6 w-6 border-2 border-navy border-t-transparent rounded-full" />
                  </div>
                ) : filteredBilling.length === 0 ? (
                  <p className="text-center text-muted-foreground py-10">No hay datos para el período seleccionado.</p>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-border bg-white shadow-sm">
                    <table className="min-w-full divide-y divide-border">
                      <thead className="bg-muted">
                        <tr>
                          <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Cliente</th>
                          <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Vehículo</th>
                          <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Matrícula</th>
                          <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Importe</th>
                          <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Fecha</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {filteredBilling.map((r) => (
                          <tr key={r.id} className="hover:bg-muted/50">
                            <td className="px-5 py-4 text-sm font-medium text-foreground">{clientName(r)}</td>
                            <td className="px-5 py-4 text-sm text-foreground">
                              {r.vehicles ? `${r.vehicles.brand} ${r.vehicles.model}` : "—"}
                            </td>
                            <td className="px-5 py-4 text-sm font-mono text-foreground">{vehiclePlate(r)}</td>
                            <td className="px-5 py-4 text-sm font-medium text-navy">
                              {r.budget_amount != null ? `${Number(r.budget_amount).toFixed(2)} €` : "—"}
                            </td>
                            <td className="px-5 py-4 text-sm text-muted-foreground">
                              {new Date(r.completed_at || r.scheduled_date).toLocaleDateString("es-ES")}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
            {/* ── TAB F: Enlace de registro ── */}
            {activeTab === "registro" && (
              <div className="max-w-xl">
                <h2 className="heading text-lg text-navy mb-4">ENLACE DE REGISTRO</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Comparte este enlace con los clientes para que puedan registrarse asociados a este concesionario.
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={registrationLink}
                    className="flex-1 rounded-lg border border-border bg-muted px-4 py-2 text-sm font-mono text-foreground focus:outline-none"
                  />
                  <Button variant="secondary" onClick={copyRegLink}>
                    {linkCopied ? "¡Enlace copiado!" : "Copiar enlace"}
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Tabs>

      {/* Delete confirmation modal */}
      <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="ELIMINAR CONCESIONARIO">
        <div className="space-y-4">
          <p className="text-sm text-foreground">
            ¿Estás seguro de que quieres eliminar a <strong>{dealer.name}</strong>?
            Esta acción eliminará su cuenta, sus citas y todos sus datos. No se puede deshacer.
          </p>
          {deleteError && <p className="text-sm text-error">{deleteError}</p>}
          <div className="flex gap-3">
            <Button variant="outline" fullWidth onClick={() => setShowDeleteModal(false)}>
              Cancelar
            </Button>
            <Button variant="danger" fullWidth onClick={handleDeleteDealership} loading={deleting}>
              Eliminar
            </Button>
          </div>
        </div>
      </Modal>

    </div>
  );
}
