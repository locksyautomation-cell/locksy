"use client";

import { useState, useEffect, useCallback } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

interface Invoice {
  id: string;
  dealer_id: string;
  invoice_number: string | null;
  concept: string;
  amount: number | null;
  sent_at: string | null;
  created_at: string;
  file_url: string | null;
  dealerships: { name: string } | null;
}

interface IssuerConfig {
  issuer_name: string;
  issuer_nif: string;
  issuer_address: string;
  issuer_email: string;
}

function getMonthRange(year: number, month: number) {
  const from = new Date(year, month, 1);
  const to = new Date(year, month + 1, 0, 23, 59, 59);
  return { from: from.toISOString(), to: to.toISOString() };
}

function formatEur(amount: number) {
  return amount.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export default function AdminFacturacionPage() {
  const today = new Date();
  const [viewMode, setViewMode] = useState<"month" | "custom">("month");
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const [loading, setLoading] = useState(true);
  const [activeSubscriptions, setActiveSubscriptions] = useState(0);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);

  const [generatingPdf, setGeneratingPdf] = useState<string | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);

  // Issuer config
  const [issuer, setIssuer] = useState<IssuerConfig>({
    issuer_name: "", issuer_nif: "", issuer_address: "", issuer_email: "",
  });
  const [issuerEdit, setIssuerEdit] = useState<IssuerConfig | null>(null);
  const [savingIssuer, setSavingIssuer] = useState(false);
  const [issuerMsg, setIssuerMsg] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/get-issuer-config")
      .then((r) => r.json())
      .then((d) => { if (d.config) setIssuer(d.config); })
      .catch(() => {});
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      let from: string;
      let to: string;

      if (viewMode === "month") {
        const range = getMonthRange(currentYear, currentMonth);
        from = range.from;
        to = range.to;
      } else {
        if (!customFrom || !customTo) { setLoading(false); return; }
        from = new Date(customFrom).toISOString();
        to = new Date(customTo + "T23:59:59").toISOString();
      }

      const res = await fetch(
        `/api/admin/get-billing-summary?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
      );
      if (res.ok) {
        const data = await res.json();
        setActiveSubscriptions(data.activeSubscriptions);
        setInvoices(data.invoices);
        setTotalRevenue(data.totalRevenue);
      }
    } catch {
      // silently fail — keep empty state
    } finally {
      setLoading(false);
    }
  }, [viewMode, currentYear, currentMonth, customFrom, customTo]);

  useEffect(() => { fetchData(); }, [fetchData]);

  function prevMonth() {
    if (currentMonth === 0) { setCurrentYear(y => y - 1); setCurrentMonth(11); }
    else setCurrentMonth(m => m - 1);
  }

  function nextMonth() {
    if (currentMonth === 11) { setCurrentYear(y => y + 1); setCurrentMonth(0); }
    else setCurrentMonth(m => m + 1);
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
      if (!res.ok) {
        setPdfError(data.error ?? "Error al generar el PDF.");
      } else {
        setInvoices((prev) =>
          prev.map((inv) => inv.id === invoiceId ? { ...inv, file_url: data.fileUrl } : inv)
        );
      }
    } catch {
      setPdfError("Error de conexión al generar el PDF.");
    } finally {
      setGeneratingPdf(null);
    }
  }

  async function handleSaveIssuer() {
    if (!issuerEdit) return;
    setSavingIssuer(true);
    setIssuerMsg(null);
    try {
      const res = await fetch("/api/admin/update-issuer-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(issuerEdit),
      });
      if (res.ok) {
        setIssuer(issuerEdit);
        setIssuerEdit(null);
        setIssuerMsg("Datos del emisor actualizados.");
      } else {
        const d = await res.json();
        setIssuerMsg(d.error ?? "Error al guardar.");
      }
    } catch {
      setIssuerMsg("Error de conexión.");
    }
    setSavingIssuer(false);
  }

  const isCurrentMonth = currentYear === today.getFullYear() && currentMonth === today.getMonth();
  const form = issuerEdit ?? issuer;

  return (
    <div>
      <h1 className="heading text-2xl text-navy mb-6">FACTURACIÓN</h1>

      {/* Emisor LOCKSY */}
      <Card className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="heading text-base text-navy">DATOS DEL EMISOR</h2>
          {!issuerEdit && (
            <Button variant="outline" size="sm" onClick={() => { setIssuerEdit({ ...issuer }); setIssuerMsg(null); }}>
              Editar
            </Button>
          )}
        </div>

        {issuerEdit ? (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Nombre / Razón social"
                value={form.issuer_name}
                onChange={(e) => setIssuerEdit((p) => p ? { ...p, issuer_name: e.target.value } : p)}
                required
              />
              <Input
                label="NIF / CIF"
                value={form.issuer_nif}
                onChange={(e) => setIssuerEdit((p) => p ? { ...p, issuer_nif: e.target.value } : p)}
                required
              />
            </div>
            <Input
              label="Dirección"
              value={form.issuer_address}
              onChange={(e) => setIssuerEdit((p) => p ? { ...p, issuer_address: e.target.value } : p)}
            />
            <Input
              label="Email"
              type="email"
              value={form.issuer_email}
              onChange={(e) => setIssuerEdit((p) => p ? { ...p, issuer_email: e.target.value } : p)}
            />
            {issuerMsg && (
              <p className={`text-sm ${issuerMsg.includes("Error") ? "text-error" : "text-success"}`}>
                {issuerMsg}
              </p>
            )}
            <div className="flex gap-3 pt-1">
              <Button variant="outline" size="sm" onClick={() => { setIssuerEdit(null); setIssuerMsg(null); }}>
                Cancelar
              </Button>
              <Button variant="secondary" size="sm" onClick={handleSaveIssuer} loading={savingIssuer} disabled={!form.issuer_name || !form.issuer_nif}>
                Guardar cambios
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-sm">
            <div>
              <span className="text-muted-foreground">Nombre:</span>{" "}
              <span className="font-medium">{issuer.issuer_name || "—"}</span>
            </div>
            <div>
              <span className="text-muted-foreground">NIF / CIF:</span>{" "}
              <span className="font-medium">{issuer.issuer_nif || "—"}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Dirección:</span>{" "}
              <span className="font-medium">{issuer.issuer_address || "—"}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Email:</span>{" "}
              <span className="font-medium">{issuer.issuer_email || "—"}</span>
            </div>
          </div>
        )}
        {issuerMsg && !issuerEdit && (
          <p className="text-sm text-success mt-2">{issuerMsg}</p>
        )}
      </Card>

      {/* Period selector */}
      <Card className="mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex rounded-lg border border-border overflow-hidden text-sm">
            <button
              onClick={() => setViewMode("month")}
              className={`px-4 py-2 font-medium transition-colors ${viewMode === "month" ? "bg-navy text-white" : "bg-white text-foreground hover:bg-muted"}`}
            >
              Por mes
            </button>
            <button
              onClick={() => setViewMode("custom")}
              className={`px-4 py-2 font-medium transition-colors border-l border-border ${viewMode === "custom" ? "bg-navy text-white" : "bg-white text-foreground hover:bg-muted"}`}
            >
              Personalizado
            </button>
          </div>

          {viewMode === "month" ? (
            <div className="flex items-center gap-3">
              <button
                onClick={prevMonth}
                className="rounded-lg border border-border p-2 hover:bg-muted transition-colors"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <span className="text-sm font-medium min-w-[140px] text-center">
                {MONTH_NAMES[currentMonth]} {currentYear}
              </span>
              <button
                onClick={nextMonth}
                disabled={isCurrentMonth}
                className="rounded-lg border border-border p-2 hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <label className="text-sm text-muted-foreground">Desde</label>
                <input
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="rounded-lg border border-border px-3 py-1.5 text-sm focus:outline-none focus:border-navy"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-muted-foreground">Hasta</label>
                <input
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="rounded-lg border border-border px-3 py-1.5 text-sm focus:outline-none focus:border-navy"
                />
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card>
          <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">Suscripciones activas</p>
          <p className="text-3xl font-bold text-navy">
            {loading ? <span className="animate-pulse">—</span> : activeSubscriptions}
          </p>
        </Card>
        <Card>
          <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">Facturas emitidas</p>
          <p className="text-3xl font-bold text-navy">
            {loading ? <span className="animate-pulse">—</span> : invoices.length}
          </p>
        </Card>
        <Card>
          <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">Total cobrado</p>
          <p className="text-3xl font-bold text-navy">
            {loading ? <span className="animate-pulse">—</span> : formatEur(totalRevenue)}
          </p>
        </Card>
      </div>

      {/* Invoices table */}
      <Card>
        <h2 className="heading text-base text-navy mb-4">FACTURAS EMITIDAS</h2>

        {pdfError && (
          <p className="text-sm text-error mb-3">{pdfError}</p>
        )}

        {loading ? (
          <div className="flex justify-center py-10">
            <div className="animate-spin h-6 w-6 border-2 border-navy border-t-transparent rounded-full" />
          </div>
        ) : invoices.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-10">
            No hay facturas en este periodo.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Nº Factura</th>
                  <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Concesionario</th>
                  <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Concepto</th>
                  <th className="text-right py-2 pr-4 font-medium text-muted-foreground">Importe</th>
                  <th className="text-right py-2 pr-4 font-medium text-muted-foreground">Fecha</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id} className="border-b border-border/50 last:border-0">
                    <td className="py-3 pr-4 font-mono text-xs text-navy font-medium">
                      {inv.invoice_number ?? "—"}
                    </td>
                    <td className="py-3 pr-4 font-medium">
                      {inv.dealerships?.name ?? "—"}
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">{inv.concept}</td>
                    <td className="py-3 pr-4 text-right font-medium">
                      {inv.amount != null ? formatEur(inv.amount) : "—"}
                    </td>
                    <td className="py-3 pr-4 text-right text-muted-foreground">
                      {inv.sent_at
                        ? new Date(inv.sent_at).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" })
                        : "—"}
                    </td>
                    <td className="py-3">
                      <div className="flex items-center justify-end gap-2">
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
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border">
                  <td colSpan={3} className="py-3 pr-4 font-semibold">Total</td>
                  <td className="py-3 pr-4 text-right font-bold text-navy">{formatEur(totalRevenue)}</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
