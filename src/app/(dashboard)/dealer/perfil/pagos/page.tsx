"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { createClient } from "@/lib/supabase/client";
import type { Dealership } from "@/lib/types";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface LocksyInvoice {
  id: string;
  invoice_number: string | null;
  concept: string;
  amount: number | null;
  file_url: string | null;
  sent_at: string | null;
  created_at: string;
}

type BillingFields = {
  iban: string;
  billing_name: string;
  billing_nif_cif: string;
  billing_email: string;
  billing_phone: string;
  billing_address: string;
};

interface SubscribeFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

function SubscribeForm({ onSuccess, onCancel }: SubscribeFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setLoading(true);
    setError("");

    const { error: confirmError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/dealer/perfil/pagos?subscription=success`,
      },
      redirect: "if_required",
    });

    if (confirmError) {
      setError(confirmError.message || "Error al procesar el pago.");
      setLoading(false);
    } else {
      onSuccess();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-3 pt-2">
        <Button variant="outline" fullWidth onClick={onCancel} type="button" disabled={loading}>
          Cancelar
        </Button>
        <Button variant="secondary" fullWidth type="submit" loading={loading} disabled={!stripe}>
          Activar suscripción
        </Button>
      </div>
    </form>
  );
}

const STATUS_INFO: Record<string, { label: string; color: string }> = {
  active:   { label: "Activa",             color: "text-green-700 bg-green-50 border-green-200" },
  canceling:{ label: "Cancela fin periodo",color: "text-yellow-700 bg-yellow-50 border-yellow-200" },
  past_due: { label: "Pago pendiente",     color: "text-red-700 bg-red-50 border-red-200" },
  inactive: { label: "Inactiva",           color: "text-muted-foreground bg-muted border-border" },
  pending:  { label: "Pendiente",          color: "text-blue-700 bg-blue-50 border-blue-200" },
};

export default function DealerPagosBillingPage() {
  const supabase = createClient();
  const router = useRouter();

  const [dealership, setDealership] = useState<Dealership | null>(null);
  const [form, setForm] = useState<BillingFields>({
    iban: "",
    billing_name: "",
    billing_nif_cif: "",
    billing_email: "",
    billing_phone: "",
    billing_address: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [invoices, setInvoices] = useState<LocksyInvoice[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState<string | null>(null); // invoice id
  const [pdfError, setPdfError] = useState<string | null>(null);

  // Subscription state
  const [subStatus, setSubStatus] = useState<string>("inactive");
  const [subAmountEur, setSubAmountEur] = useState<string | null>(null);
  const [subDaysRemaining, setSubDaysRemaining] = useState<number | null>(null);
  const [pendingPriceEur, setPendingPriceEur] = useState<string | null>(null);
  const [acknowledgingPrice, setAcknowledgingPrice] = useState(false);
  const [showSubModal, setShowSubModal] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [startingSubscription, setStartingSubscription] = useState(false);
  const [subError, setSubError] = useState("");
  const [cancelingSubscription, setCancelingSubscription] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelError, setCancelError] = useState("");
  const [reactivating, setReactivating] = useState(false);

  const fetchSubscription = useCallback(async () => {
    const res = await fetch("/api/dealer/get-subscription");
    if (res.ok) {
      const data = await res.json();
      setSubStatus(data.subscription_status || "inactive");
      setSubAmountEur(data.amount_eur);
      setSubDaysRemaining(data.days_remaining ?? null);
      setPendingPriceEur(data.pending_price_eur ?? null);
    }
  }, []);

  useEffect(() => {
    async function fetchData() {
      const dsRes = await fetch("/api/dealer/get-dealership");
      if (!dsRes.ok) { setLoading(false); return; }
      const { dealership: data } = await dsRes.json();

      if (data) {
        setDealership(data as Dealership);
        setForm({
          iban: data.iban || "",
          billing_name: data.billing_name || "",
          billing_nif_cif: data.billing_nif_cif || "",
          billing_email: data.billing_email || "",
          billing_phone: data.billing_phone || "",
          billing_address: data.billing_address || "",
        });

        setLoadingInvoices(true);
        const { data: invData } = await supabase
          .from("locksy_invoices")
          .select("*")
          .eq("dealer_id", data.id)
          .order("created_at", { ascending: false });
        const loadedInvoices = (invData as LocksyInvoice[]) || [];
        setInvoices(loadedInvoices);

        // Si la suscripción está activa pero no hay facturas, generar la del mes en curso
        if (
          (data.subscription_status === "active" || data.subscription_status === "canceling") &&
          loadedInvoices.length === 0
        ) {
          const genRes = await fetch("/api/dealer/confirm-subscription", { method: "POST" });
          if (genRes.ok) {
            const { data: freshInvoices } = await supabase
              .from("locksy_invoices")
              .select("*")
              .eq("dealer_id", data.id)
              .order("created_at", { ascending: false });
            setInvoices((freshInvoices as LocksyInvoice[]) || []);
          }
        }

        setLoadingInvoices(false);
      }
      setLoading(false);
    }

    fetchData();
    fetchSubscription();
  }, [supabase, fetchSubscription]);

  // Handle return from Stripe redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("subscription") === "success") {
      window.history.replaceState({}, "", window.location.pathname);
      fetchSubscription();
      // Generate invoice for this billing cycle
      fetch("/api/dealer/confirm-subscription", { method: "POST" }).then(async (res) => {
        if (res.ok) {
          const dsRes = await fetch("/api/dealer/get-dealership");
          if (dsRes.ok) {
            const { dealership: data } = await dsRes.json();
            if (data?.id) {
              const { data: invData } = await supabase
                .from("locksy_invoices")
                .select("*")
                .eq("dealer_id", data.id)
                .order("created_at", { ascending: false });
              setInvoices((invData as LocksyInvoice[]) || []);
            }
          }
        }
      });
    }
  }, [fetchSubscription, supabase]);

  async function handleActivateSubscription() {
    setStartingSubscription(true);
    setSubError("");
    try {
      const res = await fetch("/api/dealer/subscribe", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setSubError(data.error || "Error al iniciar la suscripción.");
        setStartingSubscription(false);
        return;
      }
      if (data.mockMode) {
        // No Stripe configured — subscription activated directly in DB
        setSubStatus("active");
        await fetchSubscription();
        setStartingSubscription(false);
        return;
      }
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }
      setClientSecret(data.clientSecret);
      setShowSubModal(true);
    } catch {
      setSubError("Error de conexión.");
    }
    setStartingSubscription(false);
  }

  async function handleCancelSubscription() {
    setCancelingSubscription(true);
    setCancelError("");
    try {
      const res = await fetch("/api/dealer/cancel-subscription", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        await fetchSubscription();
        setShowCancelConfirm(false);
      } else {
        setCancelError(data.error || "Error al cancelar la suscripción.");
      }
    } catch {
      setCancelError("Error de conexión. Inténtalo de nuevo.");
    }
    setCancelingSubscription(false);
  }

  async function handleAcknowledgePrice() {
    setAcknowledgingPrice(true);
    await fetch("/api/dealer/acknowledge-price-change", { method: "POST" });
    setPendingPriceEur(null);
    await fetchSubscription();
    setAcknowledgingPrice(false);
  }

  async function handleReactivate() {
    setReactivating(true);
    try {
      const res = await fetch("/api/dealer/reactivate-subscription", { method: "POST" });
      if (res.ok) {
        await fetchSubscription();
      }
    } catch { /* ignore */ }
    setReactivating(false);
  }

  async function handleSave() {
    if (!dealership) return;
    setSaving(true);
    setSaveMsg("");

    const res = await fetch("/api/dealer/update-billing", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (res.ok) {
      setDealership((prev) => prev ? { ...prev, ...form } : null);
      setSaveMsg("Datos guardados correctamente");
    } else {
      const data = await res.json().catch(() => ({}));
      setSaveMsg(data.error || "Error al guardar. Inténtalo de nuevo.");
    }
    setSaving(false);
    setTimeout(() => setSaveMsg(""), 4000);
  }

  async function handleGeneratePdf(invoiceId: string) {
    setGeneratingPdf(invoiceId);
    setPdfError(null);
    try {
      const res = await fetch("/api/dealer/generate-invoice-pdf", {
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

  function setField(key: keyof BillingFields) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value }));
  }

  const billingComplete =
    !!dealership?.billing_name &&
    !!dealership?.billing_nif_cif &&
    !!dealership?.billing_email &&
    !!dealership?.billing_phone &&
    !!dealership?.billing_address;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin h-8 w-8 border-2 border-navy border-t-transparent rounded-full" />
      </div>
    );
  }

  const statusInfo = STATUS_INFO[subStatus] || STATUS_INFO.inactive;

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => router.back()}
          className="text-muted-foreground hover:text-foreground"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="heading text-2xl text-navy">PAGOS Y FACTURACIÓN</h1>
      </div>

      {/* Price change notice */}
      {pendingPriceEur && (
        <div className="mb-6 rounded-xl border border-orange/40 bg-orange/5 px-5 py-4 flex items-start justify-between gap-4">
          <div>
            <p className="font-semibold text-orange text-sm">Actualización de precio</p>
            <p className="text-sm text-foreground mt-1">
              Tu cuota mensual ha sido actualizada a{" "}
              <span className="font-bold">{pendingPriceEur} € <span className="font-normal text-muted-foreground text-xs">(IVA exc.)</span></span>.
              Entrará en vigor a partir del <strong>próximo período de facturación</strong>.
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleAcknowledgePrice}
            loading={acknowledgingPrice}
            className="flex-shrink-0"
          >
            Entendido
          </Button>
        </div>
      )}

      {/* Subscription section */}
      <Card className="mb-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="heading text-lg text-navy mb-2">SUSCRIPCIÓN MENSUAL</h2>
            <div className="flex items-center gap-3 mb-2">
              <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusInfo.color}`}>
                {statusInfo.label}
              </span>
              {subAmountEur && (
                <span className="text-sm text-muted-foreground">{subAmountEur} €/mes <span className="text-xs">(IVA exc.)</span></span>
              )}
            </div>
            {subStatus === "canceling" && subDaysRemaining !== null && (
              <p className="text-sm text-muted-foreground">
                Quedan <span className="font-medium text-foreground">{subDaysRemaining} {subDaysRemaining === 1 ? "día" : "días"}</span> de acceso al sistema.
              </p>
            )}
            {subStatus === "inactive" && (
              <p className="text-sm text-muted-foreground">Activa tu suscripción para acceder al sistema.</p>
            )}
            {(subStatus === "inactive" || subStatus === "past_due") && !billingComplete && (
              <p className="text-sm text-orange mt-2">
                Completa los datos de facturación (al final de esta página) antes de activar la suscripción.
              </p>
            )}
            {subStatus === "past_due" && (
              <p className="text-sm text-muted-foreground">Hay un problema con tu último pago. Actualiza tu método de pago.</p>
            )}
            {subError && <p className="text-sm text-red-600 mt-2">{subError}</p>}
          </div>
          <div className="flex gap-2 flex-shrink-0">
            {(subStatus === "inactive" || subStatus === "past_due") && (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleActivateSubscription}
                loading={startingSubscription}
                disabled={!billingComplete}
              >
                {subStatus === "past_due" ? "Actualizar pago" : "Activar suscripción"}
              </Button>
            )}
            {subStatus === "canceling" && (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleReactivate}
                loading={reactivating}
              >
                Reactivar suscripción
              </Button>
            )}
            {subStatus === "active" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCancelConfirm(true)}
              >
                Cancelar suscripción
              </Button>
            )}
          </div>
        </div>
      </Card>

      <Card className="mb-6">
        <h2 className="heading text-lg text-navy mb-4">DATOS BANCARIOS</h2>
        <div>
          <Input
            label="IBAN *"
            value={form.iban}
            onChange={setField("iban")}
            placeholder="ES00 0000 0000 0000 0000 0000"
            required
          />
          <p className="mt-1 text-xs text-muted-foreground">* Campo obligatorio</p>
        </div>
      </Card>

      {/* LOCKSY Invoices */}
      <Card className="mb-6">
        <h2 className="heading text-lg text-navy mb-4">FACTURAS DE LOCKSY</h2>
        {pdfError && (
          <p className="text-sm text-red-600 mb-3">{pdfError}</p>
        )}
        {loadingInvoices ? (
          <div className="flex justify-center py-6">
            <div className="animate-spin h-6 w-6 border-2 border-navy border-t-transparent rounded-full" />
          </div>
        ) : invoices.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay facturas emitidas.</p>
        ) : (
          <div className="space-y-2">
            {invoices.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between rounded-lg border border-border px-4 py-3 gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    {inv.invoice_number && (
                      <span className="heading text-xs text-navy">{inv.invoice_number}</span>
                    )}
                    <p className="text-sm font-medium text-foreground truncate">{inv.concept}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {inv.amount != null ? `${Number(inv.amount).toFixed(2)} €` : "—"} ·{" "}
                    {new Date(inv.sent_at || inv.created_at).toLocaleDateString("es-ES")}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {inv.file_url && (
                    <a
                      href={inv.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-navy hover:bg-muted transition-colors"
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
                    className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-navy hover:border-navy transition-colors disabled:opacity-50"
                  >
                    {generatingPdf === inv.id ? (
                      <div className="h-3.5 w-3.5 border border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    )}
                    {inv.file_url ? "Regenerar" : "Generar PDF"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <h2 className="heading text-lg text-navy mb-4">DATOS DE FACTURACIÓN</h2>
        <div className="space-y-4">
          <Input
            label="Nombre / Razón social"
            value={form.billing_name}
            onChange={setField("billing_name")}
          />
          <Input
            label="NIF / CIF"
            value={form.billing_nif_cif}
            onChange={setField("billing_nif_cif")}
          />
          <Input
            label="Email de facturación"
            type="email"
            value={form.billing_email}
            onChange={setField("billing_email")}
          />
          <Input
            label="Teléfono de facturación"
            value={form.billing_phone}
            onChange={setField("billing_phone")}
          />
          <Input
            label="Dirección fiscal"
            value={form.billing_address}
            onChange={setField("billing_address")}
          />
        </div>

        <div className="mt-6 flex items-center gap-4">
          <Button variant="secondary" onClick={handleSave} loading={saving}>
            Guardar
          </Button>
          {saveMsg && <span className="text-sm text-green-600">{saveMsg}</span>}
        </div>
      </Card>

      {/* Subscribe Modal */}
      <Modal
        isOpen={showSubModal}
        onClose={() => { setShowSubModal(false); setClientSecret(null); }}
        title="ACTIVAR SUSCRIPCIÓN MENSUAL"
      >
        <div className="mb-4">
          <p className="text-sm text-muted-foreground">
            Introduce tu tarjeta. Se cobrarán{" "}
            <span className="font-medium text-foreground">{subAmountEur} €</span> ahora y mensualmente de forma automática.
          </p>
        </div>
        {clientSecret && (
          <Elements
            stripe={stripePromise}
            options={{
              clientSecret,
              appearance: { theme: "stripe" },
            }}
          >
            <SubscribeForm
              onSuccess={async () => {
                setShowSubModal(false);
                setClientSecret(null);
                setSubStatus("active");
                await fetchSubscription();
                // Generar factura PDF tras confirmar el pago con Stripe
                await fetch("/api/dealer/confirm-subscription", { method: "POST" });
                // Recargar facturas
                const { data: invData } = await supabase
                  .from("locksy_invoices")
                  .select("*")
                  .eq("dealer_id", dealership?.id)
                  .order("created_at", { ascending: false });
                setInvoices((invData as LocksyInvoice[]) || []);
              }}
              onCancel={() => { setShowSubModal(false); setClientSecret(null); }}
            />
          </Elements>
        )}
      </Modal>

      {/* Cancel confirm Modal */}
      <Modal
        isOpen={showCancelConfirm}
        onClose={() => { setShowCancelConfirm(false); setCancelError(""); }}
        title="CANCELAR SUSCRIPCIÓN"
      >
        <p className="text-sm text-muted-foreground mb-6">
          ¿Estás seguro de que deseas cancelar la suscripción? Seguirás teniendo acceso hasta el final del periodo de facturación actual.
        </p>
        {cancelError && (
          <p className="text-sm text-red-600 mb-4">{cancelError}</p>
        )}
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => { setShowCancelConfirm(false); setCancelError(""); }}>
            Volver
          </Button>
          <Button variant="danger" onClick={handleCancelSubscription} loading={cancelingSubscription}>
            Confirmar cancelación
          </Button>
        </div>
      </Modal>
    </div>
  );
}
