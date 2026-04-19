"use client";

import { useState, useEffect, use } from "react";

interface BudgetLine {
  description: string;
  quantity: number;
  unit_price: number;
}

interface BudgetData {
  locator: string;
  dealershipName: string;
  scheduledDate: string;
  clientName: string;
  vehicleLabel: string;
  description: string | null;
  budgetAmount: number | null;
  budgetLines: BudgetLine[];
  budgetUrl: string | null;
  budgetStatus: "pending" | "accepted" | "rejected";
  budgetAcceptedAt: string | null;
}

function euro(n: number) {
  return n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

export default function BudgetAcceptancePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);

  const [budget, setBudget] = useState<BudgetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [checked, setChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    fetch(`/api/presupuesto/${token}`)
      .then((r) => {
        if (r.status === 404) { setNotFound(true); setLoading(false); return null; }
        return r.json();
      })
      .then((data) => {
        if (data) setBudget(data as BudgetData);
        setLoading(false);
      })
      .catch(() => { setNotFound(true); setLoading(false); });
  }, [token]);

  async function handleAccept() {
    setSubmitting(true);
    setSubmitError("");
    try {
      const res = await fetch(`/api/presupuesto/${token}/accept`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setSubmitError(data.error || "Error al registrar la aceptación.");
      } else {
        setAccepted(true);
        setBudget((prev) => prev ? { ...prev, budgetStatus: "accepted", budgetAcceptedAt: new Date().toISOString() } : prev);
        broadcastSigned();
      }
    } catch {
      setSubmitError("Error de conexión.");
    }
    setSubmitting(false);
    setChecked(false);
  }

  // Notify other tabs (e.g. notifications page) that the budget was signed
  function broadcastSigned() {
    try {
      const ch = new BroadcastChannel("budget_signed");
      ch.postMessage({ token });
      ch.close();
    } catch { /* not supported */ }
  }

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin h-8 w-8 border-2 border-[#1a2e4a] border-t-transparent rounded-full" />
      </div>
    );
  }

  if (notFound || !budget) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
        <div className="bg-white rounded-2xl shadow-md p-10 max-w-md w-full text-center">
          <p className="text-2xl font-bold text-[#1a2e4a] mb-2">Presupuesto no encontrado</p>
          <p className="text-gray-500 text-sm">El enlace puede haber expirado o ser incorrecto.</p>
        </div>
      </div>
    );
  }

  const alreadyAccepted = budget.budgetStatus === "accepted" || accepted;
  const alreadyRejected = budget.budgetStatus === "rejected";

  const totalConIva = budget.budgetLines.reduce((s, l) => s + l.quantity * l.unit_price, 0);
  const baseTotal = totalConIva / 1.21;
  const ivaAmount = totalConIva - baseTotal;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-10 px-4">
      {/* Header */}
      <div className="w-full max-w-xl mb-6">
        <div className="bg-[#1a2e4a] rounded-2xl px-8 py-6 flex flex-col gap-1">
          <span className="text-[#e07b3a] text-xs font-bold tracking-widest uppercase">Presupuesto</span>
          <span className="text-white text-2xl font-bold">{budget.locator}</span>
          <span className="text-[#aabbcc] text-sm">{budget.dealershipName}</span>
        </div>
      </div>

      {/* Summary */}
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-4 space-y-4">
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <div>
            <p className="text-gray-400 text-xs uppercase tracking-wider mb-0.5">Cliente</p>
            <p className="font-medium text-[#1a2e4a]">{budget.clientName}</p>
          </div>
          <div>
            <p className="text-gray-400 text-xs uppercase tracking-wider mb-0.5">Fecha cita</p>
            <p className="font-medium text-[#1a2e4a]">
              {new Date(budget.scheduledDate).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" })}
            </p>
          </div>
          <div className="col-span-2">
            <p className="text-gray-400 text-xs uppercase tracking-wider mb-0.5">Vehículo</p>
            <p className="font-medium text-[#1a2e4a]">{budget.vehicleLabel}</p>
          </div>
          {budget.description && (
            <div className="col-span-2">
              <p className="text-gray-400 text-xs uppercase tracking-wider mb-0.5">Avería descrita</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{budget.description}</p>
            </div>
          )}
        </div>

        {/* Line items table */}
        {budget.budgetLines.length > 0 && (
          <>
            <div className="border-t border-gray-100" />
            <div>
              <p className="text-gray-400 text-xs uppercase tracking-wider mb-3">Conceptos</p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-400 uppercase border-b border-gray-100">
                    <th className="text-left pb-2 font-medium">Descripción</th>
                    <th className="text-right pb-2 font-medium w-14">Cant.</th>
                    <th className="text-right pb-2 font-medium w-20">P. Unit.</th>
                    <th className="text-right pb-2 font-medium w-20">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {budget.budgetLines.map((line, i) => (
                    <tr key={i} className="border-b border-gray-50">
                      <td className="py-2 text-gray-800">{line.description}</td>
                      <td className="py-2 text-right text-gray-600">{line.quantity}</td>
                      <td className="py-2 text-right text-gray-600">{euro(line.unit_price)}</td>
                      <td className="py-2 text-right font-medium text-[#1a2e4a]">{euro(line.quantity * line.unit_price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-3 space-y-1 text-sm text-right">
                <div className="flex justify-end gap-8 text-gray-500">
                  <span>Base imponible</span>
                  <span className="w-20">{euro(baseTotal)}</span>
                </div>
                <div className="flex justify-end gap-8 text-gray-500">
                  <span>IVA (21%)</span>
                  <span className="w-20">{euro(ivaAmount)}</span>
                </div>
                <div className="flex justify-end gap-8 font-bold text-[#1a2e4a] text-base pt-1 border-t border-gray-200">
                  <span>Total (IVA inc.)</span>
                  <span className="w-20 text-[#e07b3a]">{euro(totalConIva)}</span>
                </div>
              </div>
            </div>
          </>
        )}

        {/* PDF link */}
        {budget.budgetUrl && (
          <>
            <div className="border-t border-gray-100" />
            <a
              href={budget.budgetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-medium text-[#e07b3a] hover:underline"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              Ver PDF del presupuesto
            </a>
          </>
        )}
      </div>

      {/* Action card */}
      {alreadyAccepted ? (
        <div className="w-full max-w-xl bg-green-50 border border-green-200 rounded-2xl p-6 text-center">
          <svg className="h-10 w-10 text-green-500 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <p className="text-green-800 font-semibold text-lg">Presupuesto aceptado</p>
          {budget.budgetAcceptedAt && (
            <p className="text-green-600 text-sm mt-1">Firmado el {formatDate(budget.budgetAcceptedAt)}</p>
          )}
        </div>
      ) : alreadyRejected ? (
        <div className="w-full max-w-xl bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
          <p className="text-red-800 font-semibold text-lg">Presupuesto rechazado</p>
          <p className="text-red-600 text-sm mt-1">Contacta con el taller si necesitas más información.</p>
        </div>
      ) : (
        <div className="w-full max-w-xl bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <p className="font-semibold text-[#1a2e4a] mb-1">Autorización del presupuesto</p>
          <p className="text-sm text-gray-500 mb-4">
            Al firmar este presupuesto, autorizas al taller a proceder con las reparaciones indicadas por el importe especificado.
            La reparación cuenta con garantía mínima de <strong>3 meses o 2.000 km</strong> (Art. 16 RD 1457/1986).
          </p>

          <label className="flex items-start gap-3 cursor-pointer group mb-4">
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 accent-[#1a2e4a] cursor-pointer"
            />
            <span className="text-sm text-gray-700 group-hover:text-gray-900">
              He leído el presupuesto y autorizo al taller a proceder con las reparaciones indicadas por el importe total indicado.
            </span>
          </label>

          {submitError && <p className="text-sm text-red-600 mb-3">{submitError}</p>}

          <button
            onClick={handleAccept}
            disabled={!checked || submitting}
            className="w-full py-3 rounded-xl text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-[#1a2e4a] text-white hover:bg-[#233d61]"
          >
            {submitting ? "Registrando firma..." : "Firmar y aceptar presupuesto"}
          </button>
        </div>
      )}

      <p className="mt-10 text-xs text-gray-400">locksy.app</p>
    </div>
  );
}
