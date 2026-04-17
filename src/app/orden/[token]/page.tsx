"use client";

import { useState, useEffect, use } from "react";

interface OrderData {
  locator: string;
  dealershipName: string;
  scheduledDate: string;
  scheduledTime: string;
  clientName: string;
  vehicleLabel: string;
  description: string | null;
  observations: string | null;
  repairOrderUrl: string | null;
  orderAcceptedAt: string | null;
  orderReturnAcceptedAt: string | null;
  paymentStatus: "pending" | "paid" | "not_required";
  vehicleKm: number | null;
}

export default function RepairOrderAcceptancePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);

  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [km, setKm] = useState("");
  const [kmTouched, setKmTouched] = useState(false);
  const [checked, setChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [accepted, setAccepted] = useState<"pickup" | "return" | null>(null);

  useEffect(() => {
    fetch(`/api/repair-order/${token}`)
      .then((r) => {
        if (r.status === 404) { setNotFound(true); setLoading(false); return null; }
        return r.json();
      })
      .then((data) => {
        if (data) {
          setOrder(data as OrderData);
          if (data.vehicleKm) setKm(String(data.vehicleKm));
        }
        setLoading(false);
      })
      .catch(() => { setNotFound(true); setLoading(false); });
  }, [token]);

  async function handleAccept(type: "key_pickup" | "key_return") {
    setSubmitting(true);
    setSubmitError("");
    try {
      const body: Record<string, unknown> = { type };
      if (type === "key_pickup") body.km = parseInt(km, 10);

      const res = await fetch(`/api/repair-order/${token}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setSubmitError(data.error || "Error al registrar la aceptación.");
      } else {
        setAccepted(type === "key_pickup" ? "pickup" : "return");
        setOrder((prev) =>
          prev
            ? {
                ...prev,
                orderAcceptedAt: type === "key_pickup" ? new Date().toISOString() : prev.orderAcceptedAt,
                orderReturnAcceptedAt: type === "key_return" ? new Date().toISOString() : prev.orderReturnAcceptedAt,
                vehicleKm: type === "key_pickup" ? parseInt(km, 10) : prev.vehicleKm,
              }
            : prev
        );
      }
    } catch {
      setSubmitError("Error de conexión.");
    }
    setSubmitting(false);
    setChecked(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin h-8 w-8 border-2 border-[#1a2e4a] border-t-transparent rounded-full" />
      </div>
    );
  }

  if (notFound || !order) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
        <div className="bg-white rounded-2xl shadow-md p-10 max-w-md w-full text-center">
          <p className="text-2xl font-bold text-[#1a2e4a] mb-2">Orden no encontrada</p>
          <p className="text-gray-500 text-sm">El enlace puede haber expirado o ser incorrecto.</p>
        </div>
      </div>
    );
  }

  const pickupDone = !!order.orderAcceptedAt;
  const returnDone = !!order.orderReturnAcceptedAt;
  const paymentDone = order.paymentStatus === "paid" || order.paymentStatus === "not_required";
  const bothDone = pickupDone && returnDone;

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

  const kmValue = parseInt(km, 10);
  const kmValid = !isNaN(kmValue) && kmValue > 0;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-10 px-4">
      {/* Header */}
      <div className="w-full max-w-xl mb-6">
        <div className="bg-[#1a2e4a] rounded-2xl px-8 py-6 flex flex-col gap-1">
          <span className="text-[#e07b3a] text-xs font-bold tracking-widest uppercase">Orden de Reparación</span>
          <span className="text-white text-2xl font-bold">{order.locator}</span>
          <span className="text-[#aabbcc] text-sm">{order.dealershipName}</span>
        </div>
      </div>

      {/* Summary card */}
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-4 space-y-4">
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <div>
            <p className="text-gray-400 text-xs uppercase tracking-wider mb-0.5">Cliente</p>
            <p className="font-medium text-[#1a2e4a]">{order.clientName}</p>
          </div>
          <div>
            <p className="text-gray-400 text-xs uppercase tracking-wider mb-0.5">Fecha cita</p>
            <p className="font-medium text-[#1a2e4a]">{order.scheduledDate} · {order.scheduledTime}</p>
          </div>
          <div className="col-span-2">
            <p className="text-gray-400 text-xs uppercase tracking-wider mb-0.5">Vehículo</p>
            <p className="font-medium text-[#1a2e4a]">{order.vehicleLabel}</p>
          </div>
          {order.vehicleKm != null && (
            <div className="col-span-2">
              <p className="text-gray-400 text-xs uppercase tracking-wider mb-0.5">Kilómetros registrados</p>
              <p className="font-medium text-[#1a2e4a]">{order.vehicleKm.toLocaleString("es-ES")} km</p>
            </div>
          )}
        </div>

        {(order.description || order.observations) && (
          <>
            <div className="border-t border-gray-100" />
            <div>
              <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Reparaciones a realizar</p>
              {order.description && <p className="text-sm text-gray-700 whitespace-pre-wrap">{order.description}</p>}
              {order.observations && <p className="text-sm text-gray-600 whitespace-pre-wrap mt-1">{order.observations}</p>}
            </div>
          </>
        )}

        {order.repairOrderUrl && (
          <>
            <div className="border-t border-gray-100" />
            <a
              href={order.repairOrderUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-medium text-[#e07b3a] hover:underline"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              Ver documento PDF de la orden
            </a>
          </>
        )}
      </div>

      {/* State display */}
      {bothDone ? (
        <div className="w-full max-w-xl bg-green-50 border border-green-200 rounded-2xl p-6 text-center">
          <svg className="h-10 w-10 text-green-500 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <p className="text-green-800 font-semibold text-lg">Todo completado</p>
          <p className="text-green-600 text-sm mt-1">Esta orden ha sido aceptada en ambas etapas.</p>
        </div>
      ) : (
        <div className="w-full max-w-xl space-y-4">
          {/* Step 1: key pickup */}
          <div className={`bg-white rounded-2xl shadow-sm border p-6 ${pickupDone ? "border-green-200 bg-green-50/30" : "border-gray-100"}`}>
            <div className="flex items-start gap-3 mb-3">
              <div className={`mt-0.5 h-6 w-6 rounded-full flex items-center justify-center flex-shrink-0 ${pickupDone ? "bg-green-500" : "bg-[#1a2e4a]"}`}>
                {pickupDone ? (
                  <svg className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <span className="text-white text-xs font-bold">1</span>
                )}
              </div>
              <div>
                <p className="font-semibold text-[#1a2e4a]">Entrega de llaves</p>
                {pickupDone ? (
                  <p className="text-sm text-green-700 mt-0.5">
                    Aceptado el {formatDate(order.orderAcceptedAt!)}
                    {order.vehicleKm != null && ` · ${order.vehicleKm.toLocaleString("es-ES")} km`}
                  </p>
                ) : (
                  <p className="text-sm text-gray-500 mt-0.5">Autoriza las reparaciones indicadas en esta orden.</p>
                )}
              </div>
            </div>

            {!pickupDone && accepted !== "pickup" && (
              <>
                {/* Reminder */}
                <div className="mb-4 flex items-start gap-2.5 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
                  <svg className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  </svg>
                  <p className="text-sm text-amber-800">
                    <strong>Antes de firmar:</strong> comprueba el cuentakilómetros de tu vehículo. Necesitarás indicar los kilómetros actuales.
                  </p>
                </div>

                {/* Km input */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Kilómetros actuales del vehículo <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={km}
                    onChange={(e) => { setKm(e.target.value); setKmTouched(true); }}
                    onBlur={() => setKmTouched(true)}
                    placeholder="Ej: 45000"
                    min="0"
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a2e4a]/30 focus:border-[#1a2e4a]"
                  />
                  {kmTouched && !kmValid && (
                    <p className="text-xs text-red-500 mt-1">Introduce los kilómetros actuales para continuar.</p>
                  )}
                </div>

                {/* Mismatch warning — shown once km is filled */}
                {kmValid && (
                  <div className="mb-4 flex items-start gap-2.5 rounded-xl bg-yellow-50 border border-yellow-200 px-4 py-3">
                    <svg className="h-4 w-4 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                    </svg>
                    <p className="text-sm text-yellow-800">
                      Los kilómetros que indiques quedarán registrados en la orden de reparación.{" "}
                      <strong>Si al entregar el vehículo los kilómetros no coinciden con los indicados, deberás acudir al taller para firmar los kilómetros reales antes de que se proceda con la reparación.</strong>
                    </p>
                  </div>
                )}

                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => setChecked(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[#1a2e4a] accent-[#1a2e4a] cursor-pointer"
                  />
                  <span className="text-sm text-gray-700 group-hover:text-gray-900">
                    He leído la orden de reparación y acepto que se realicen las reparaciones indicadas.
                  </span>
                </label>
                {submitError && <p className="text-sm text-red-600 mt-2">{submitError}</p>}
                <button
                  onClick={() => handleAccept("key_pickup")}
                  disabled={!checked || !kmValid || submitting}
                  className="mt-4 w-full py-3 rounded-xl text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-[#1a2e4a] text-white hover:bg-[#233d61]"
                >
                  {submitting ? "Confirmando..." : "Confirmar aceptación"}
                </button>
              </>
            )}

            {accepted === "pickup" && (
              <div className="mt-3 flex items-center gap-2 text-green-700">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-sm font-medium">Aceptación registrada correctamente.</span>
              </div>
            )}
          </div>

          {/* Step 2 locked: pickup done but payment pending */}
          {(pickupDone || accepted === "pickup") && !paymentDone && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 opacity-60">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 h-6 w-6 rounded-full flex items-center justify-center flex-shrink-0 bg-gray-300">
                  <span className="text-white text-xs font-bold">2</span>
                </div>
                <div>
                  <p className="font-semibold text-[#1a2e4a]">Recogida del vehículo</p>
                  <p className="text-sm text-gray-500 mt-0.5">Disponible una vez que la reparación esté pagada.</p>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: key return */}
          {(pickupDone || accepted === "pickup") && paymentDone && (
            <div className={`bg-white rounded-2xl shadow-sm border p-6 ${returnDone ? "border-green-200 bg-green-50/30" : "border-gray-100"}`}>
              <div className="flex items-start gap-3 mb-3">
                <div className={`mt-0.5 h-6 w-6 rounded-full flex items-center justify-center flex-shrink-0 ${returnDone ? "bg-green-500" : "bg-[#1a2e4a]"}`}>
                  {returnDone ? (
                    <svg className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <span className="text-white text-xs font-bold">2</span>
                  )}
                </div>
                <div>
                  <p className="font-semibold text-[#1a2e4a]">Recogida del vehículo</p>
                  {returnDone ? (
                    <p className="text-sm text-green-700 mt-0.5">Aceptado el {formatDate(order.orderReturnAcceptedAt!)}</p>
                  ) : (
                    <p className="text-sm text-gray-500 mt-0.5">Confirma que aceptas el trabajo realizado y recoges tu vehículo.</p>
                  )}
                </div>
              </div>

              {!returnDone && accepted !== "return" && (
                <>
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => setChecked(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-gray-300 accent-[#1a2e4a] cursor-pointer"
                    />
                    <span className="text-sm text-gray-700 group-hover:text-gray-900">
                      Acepto el trabajo realizado tal como se indica en la orden y recojo mi vehículo.
                    </span>
                  </label>
                  {submitError && <p className="text-sm text-red-600 mt-2">{submitError}</p>}
                  <button
                    onClick={() => handleAccept("key_return")}
                    disabled={!checked || submitting}
                    className="mt-4 w-full py-3 rounded-xl text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-[#1a2e4a] text-white hover:bg-[#233d61]"
                  >
                    {submitting ? "Confirmando..." : "Confirmar recogida"}
                  </button>
                </>
              )}

              {accepted === "return" && (
                <div className="mt-3 flex items-center gap-2 text-green-700">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-sm font-medium">Recogida registrada correctamente.</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <p className="mt-10 text-xs text-gray-400">locksy.app</p>
    </div>
  );
}
