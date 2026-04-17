"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import type { Appointment } from "@/lib/types";

type Period = "12m" | "6m" | "3m" | "30d" | "7d" | "today" | "custom";

const PERIODS: { id: Period; label: string }[] = [
  { id: "12m", label: "Últimos 12 meses" },
  { id: "6m", label: "Últimos 6 meses" },
  { id: "3m", label: "Últimos 3 meses" },
  { id: "30d", label: "Últimos 30 días" },
  { id: "7d", label: "Última semana" },
  { id: "today", label: "Hoy" },
  { id: "custom", label: "Intervalo personalizado" },
];

function startOfDay(d: Date): Date {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}

function endOfDay(d: Date): Date {
  const r = new Date(d);
  r.setHours(23, 59, 59, 999);
  return r;
}

function getPeriodRange(period: Period, customStart: string, customEnd: string): [Date, Date] {
  const now = new Date();
  switch (period) {
    case "12m":
      return [new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()), endOfDay(now)];
    case "6m":
      return [new Date(now.getFullYear(), now.getMonth() - 6, now.getDate()), endOfDay(now)];
    case "3m":
      return [new Date(now.getFullYear(), now.getMonth() - 3, now.getDate()), endOfDay(now)];
    case "30d": {
      const d = new Date(now);
      d.setDate(d.getDate() - 30);
      return [d, endOfDay(now)];
    }
    case "7d": {
      const d = new Date(now);
      d.setDate(d.getDate() - 7);
      return [d, endOfDay(now)];
    }
    case "today":
      return [startOfDay(now), endOfDay(now)];
    case "custom":
      return [
        customStart ? startOfDay(new Date(customStart)) : startOfDay(now),
        customEnd ? endOfDay(new Date(customEnd)) : endOfDay(now),
      ];
  }
}


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
    return `${v.brand} ${v.model}`;
  }
  return [apt.manual_vehicle_brand, apt.manual_vehicle_model].filter(Boolean).join(" ") || "—";
}

export default function DealerFacturacionPage() {
  const router = useRouter();

  const [payments, setPayments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  const [period, setPeriod] = useState<Period>("12m");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [updatingMethod, setUpdatingMethod] = useState<string | null>(null);

  async function togglePaymentMethod(apt: Appointment) {
    const newMethod = apt.payment_method === "cash" ? "card" : "cash";
    setUpdatingMethod(apt.id);
    const res = await fetch("/api/dealer/update-appointment", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: apt.id, payment_method: newMethod }),
    });
    if (res.ok) {
      setPayments((prev) =>
        prev.map((p) => (p.id === apt.id ? { ...p, payment_method: newMethod } : p))
      );
    }
    setUpdatingMethod(null);
  }

  useEffect(() => {
    async function fetchData() {
      const res = await fetch("/api/dealer/get-payments");
      if (!res.ok) { setLoading(false); return; }
      const { payments: data } = await res.json();
      setPayments((data as Appointment[]) || []);
      setLoading(false);
    }
    fetchData();
  }, []);

  const [rangeStart, rangeEnd] = useMemo(
    () => getPeriodRange(period, customStart, customEnd),
    [period, customStart, customEnd]
  );

  const filtered = useMemo(
    () =>
      payments.filter((apt) => {
        if (!apt.budget_amount || apt.budget_amount <= 0) return false;
        const d = new Date(apt.completed_at || apt.updated_at || apt.created_at);
        return d >= rangeStart && d <= rangeEnd;
      }),
    [payments, rangeStart, rangeEnd]
  );

  const totalIncome = useMemo(
    () => filtered.reduce((sum, apt) => sum + (apt.budget_amount || 0), 0),
    [filtered]
  );


  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin h-8 w-8 border-2 border-navy border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => router.back()}
          className="text-muted-foreground hover:text-foreground"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="heading text-2xl text-navy">FACTURACIÓN</h1>
      </div>

      {/* Period selector */}
      <div className="flex flex-wrap gap-2 mb-6">
        {PERIODS.map((p) => (
          <button
            key={p.id}
            onClick={() => setPeriod(p.id)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              period === p.id
                ? "bg-navy text-white"
                : "border border-border text-foreground hover:bg-muted"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Custom interval inputs */}
      {period === "custom" && (
        <Card className="mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Fecha de inicio"
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
            />
            <Input
              label="Fecha de fin"
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
            />
          </div>
        </Card>
      )}

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <Card>
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Ingresos totales</p>
          <p className="heading text-3xl text-navy">{totalIncome.toFixed(2)} €</p>
        </Card>
        <Card>
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Pagos recibidos</p>
          <p className="heading text-3xl text-navy">{filtered.length}</p>
        </Card>
      </div>

      {/* Payments list */}
      <Card>
        <h2 className="heading text-sm text-navy mb-4">PAGOS RECIBIDOS</h2>
        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No hay pagos en este periodo.
          </p>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((apt) => (
              <div key={apt.id} className="flex items-center justify-between py-3 gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{clientName(apt)}</p>
                  <p className="text-xs text-muted-foreground truncate">{vehicleLabel(apt)}</p>
                  <p className="text-xs text-muted-foreground">
                    Localizador: <span className="font-mono">{apt.locator}</span>
                  </p>
                </div>
                <div className="text-right flex-shrink-0 space-y-1">
                  <p className="text-sm font-semibold text-foreground">
                    {(apt.budget_amount || 0).toFixed(2)} €
                  </p>
                  <button
                    title="Haz clic para cambiar el método de pago"
                    disabled={updatingMethod === apt.id}
                    onClick={() => togglePaymentMethod(apt)}
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium transition-opacity hover:opacity-70 disabled:opacity-50 ${
                      apt.payment_method === "cash"
                        ? "bg-green-100 text-green-700"
                        : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    {updatingMethod === apt.id ? (
                      <span className="animate-pulse">...</span>
                    ) : apt.payment_method === "cash" ? (
                      <>
                        <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        Efectivo
                      </>
                    ) : (
                      <>
                        <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                        </svg>
                        Tarjeta
                      </>
                    )}
                  </button>
                  <p className="text-xs text-muted-foreground">
                    {new Date(apt.completed_at || apt.updated_at || apt.created_at).toLocaleDateString("es-ES", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    })}
                  </p>
                  {apt.invoice_url && (
                    <a
                      href={apt.invoice_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-orange hover:text-orange-dark"
                    >
                      Ver factura →
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
