import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateInvoicePDF } from "@/lib/utils/generate-invoice-pdf";
import {
  sendPaymentConfirmedEmail,
  sendSubscriptionActivatedEmail,
  sendSubscriptionPaymentEmail,
  sendSubscriptionCancelledEmail,
} from "@/lib/utils/email";

const getStripe = () => new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-02-25.clover" });

export async function POST(request: NextRequest) {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = getStripe().webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // ── Appointment one-time payments + Subscription checkout ─────────────────
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const appointmentId = session.metadata?.appointment_id;
    const clientId = session.metadata?.client_id;
    const dealershipId = session.metadata?.dealership_id;

    // One-time appointment payment
    if (appointmentId) {
      await supabase
        .from("appointments")
        .update({
          payment_status: "paid",
          stripe_payment_id: session.payment_intent as string,
        })
        .eq("id", appointmentId);

      if (clientId) {
        await supabase.from("notifications").insert({
          user_id: clientId,
          appointment_id: appointmentId,
          type: "status_change",
          title: "Pago confirmado",
          message: "Su pago ha sido procesado correctamente.",
        });

        // Email #10 — confirmación de pago al cliente
        const [aptResult, clientResult] = await Promise.all([
          supabase.from("appointments").select("locator").eq("id", appointmentId).single(),
          supabase.from("users").select("email, first_name").eq("id", clientId).single(),
        ]);
        if (clientResult.data?.email && aptResult.data) {
          sendPaymentConfirmedEmail(
            clientResult.data.email,
            clientResult.data.first_name || "",
            (aptResult.data as unknown as { locator: string }).locator,
            (session.amount_total ?? 0) / 100,
            appointmentId
          ).catch(() => {});
        }
      }
    }

    // Subscription checkout — generate invoice
    console.log("[webhook] checkout.session.completed — mode:", session.mode, "dealershipId:", dealershipId, "metadata:", JSON.stringify(session.metadata));
    if (session.mode === "subscription" && dealershipId) {
      try {
        const amountTotal = session.amount_total ?? 0;
        console.log("[webhook] Starting invoice generation for dealer:", dealershipId, "amount:", amountTotal);
        const now = new Date();
        const year = now.getFullYear();
        const monthName = now.toLocaleString("es-ES", { month: "long", year: "numeric" });
        const concept = `Suscripción mensual LOCKSY — ${monthName.charAt(0).toUpperCase() + monthName.slice(1)}`;

        // Increment invoice counter
        const { data: counterRow } = await supabase
          .from("locksy_config").select("value").eq("key", "invoice_counter").single();
        const nextCounter = (parseInt(counterRow?.value ?? "0") || 0) + 1;
        await supabase.from("locksy_config").upsert({ key: "invoice_counter", value: String(nextCounter) });
        const invoiceNumber = `LOCK-${year}-${String(nextCounter).padStart(4, "0")}`;

        // Fetch dealer billing data
        const { data: dealerBilling } = await supabase
          .from("dealerships")
          .select("billing_name, billing_nif_cif, billing_email, billing_address")
          .eq("id", dealershipId)
          .single();

        // Generate PDF
        let fileUrl: string | null = null;
        try {
          const pdfBuffer = await generateInvoicePDF({
            issuerName: process.env.LOCKSY_ISSUER_NAME ?? "LOCKSY",
            issuerNif: process.env.LOCKSY_ISSUER_NIF ?? "",
            issuerAddress: process.env.LOCKSY_ISSUER_ADDRESS ?? "",
            issuerEmail: process.env.LOCKSY_ISSUER_EMAIL ?? "noreply@locksy-at.es",
            recipientName: dealerBilling?.billing_name ?? "",
            recipientNif: dealerBilling?.billing_nif_cif ?? "",
            recipientAddress: dealerBilling?.billing_address ?? "",
            recipientEmail: dealerBilling?.billing_email ?? "",
            invoiceNumber,
            date: now,
            concept,
            baseAmount: amountTotal / 100,
            ivaPercent: 21,
          });
          const fileName = `${invoiceNumber}.pdf`;
          const { error: uploadError } = await supabase.storage
            .from("locksy-invoices")
            .upload(fileName, pdfBuffer, { contentType: "application/pdf", upsert: true });
          if (!uploadError) {
            const { data: urlData } = supabase.storage.from("locksy-invoices").getPublicUrl(fileName);
            fileUrl = urlData?.publicUrl ?? null;
          } else {
            console.warn("[webhook] PDF upload error:", uploadError.message);
          }
        } catch (pdfErr) {
          console.error("[webhook] PDF generation error:", pdfErr);
        }

        const { error: insertError } = await supabase.from("locksy_invoices").insert({
          dealer_id: dealershipId,
          invoice_number: invoiceNumber,
          concept,
          amount: amountTotal / 100,
          file_url: fileUrl,
          sent_at: now.toISOString(),
        });

        if (insertError) {
          console.error("[webhook] locksy_invoices insert error:", insertError.message, insertError.details);
        } else {
          console.log("[webhook] Subscription invoice created:", invoiceNumber);
        }
      } catch (err) {
        console.error("[webhook] Error creating subscription invoice:", err);
      }
    }
  }

  // ── Subscription events ────────────────────────────────────────────────────
  if (
    event.type === "customer.subscription.updated" ||
    event.type === "customer.subscription.created"
  ) {
    const sub = event.data.object as Stripe.Subscription;
    const dealershipId = sub.metadata?.dealership_id;
    if (!dealershipId) return NextResponse.json({ received: true });

    let status: string;
    if (sub.status === "active") {
      status = sub.cancel_at_period_end ? "canceling" : "active";
    } else if (sub.status === "past_due") {
      status = "past_due";
    } else if (sub.status === "canceled" || sub.status === "unpaid") {
      status = "inactive";
    } else {
      status = sub.status;
    }

    const periodEnd = (sub as unknown as { current_period_end?: number }).current_period_end;
    await supabase
      .from("dealerships")
      .update({
        subscription_status: status,
        stripe_subscription_id: sub.id,
        ...(periodEnd ? { subscription_period_end: new Date(periodEnd * 1000).toISOString() } : {}),
      })
      .eq("id", dealershipId);

    // Only notify when truly becoming active (not when canceling or any other state)
    if (status === "active") {
      const { data: dealer } = await supabase
        .from("dealerships")
        .select("user_id, name, email")
        .eq("id", dealershipId)
        .single();

      if (dealer?.user_id) {
        await supabase.from("notifications").insert({
          user_id: dealer.user_id,
          type: "invoice",
          title: "Suscripción activada",
          message: "Tu suscripción mensual a LOCKSY está activa.",
        });
      }
      // Email #12
      const dealerEmail = (dealer as unknown as { email?: string | null })?.email;
      if (dealerEmail) {
        sendSubscriptionActivatedEmail(dealerEmail, (dealer as unknown as { name?: string })?.name ?? "").catch(() => {});
      }
    }
  }

  if (event.type === "customer.subscription.deleted") {
    const sub = event.data.object as Stripe.Subscription;
    const dealershipId = sub.metadata?.dealership_id;
    if (!dealershipId) return NextResponse.json({ received: true });

    await supabase
      .from("dealerships")
      .update({ subscription_status: "inactive", stripe_subscription_id: null })
      .eq("id", dealershipId);

    const { data: dealer } = await supabase
      .from("dealerships")
      .select("user_id, name, email")
      .eq("id", dealershipId)
      .single();

    if (dealer?.user_id) {
      await supabase.from("notifications").insert({
        user_id: dealer.user_id,
        type: "invoice",
        title: "Suscripción cancelada",
        message: "Tu suscripción mensual a LOCKSY ha sido cancelada.",
      });
    }
    // Email #14
    const dealerEmail = (dealer as unknown as { email?: string | null })?.email;
    if (dealerEmail) {
      sendSubscriptionCancelledEmail(dealerEmail, (dealer as unknown as { name?: string })?.name ?? "", null).catch(() => {});
    }
  }

  if (event.type === "invoice.payment_failed") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const invoice = event.data.object as any as Stripe.Invoice & { subscription?: string | null };
    if (!invoice.subscription) return NextResponse.json({ received: true });

    const customerId = invoice.customer as string;
    const { data: dealer } = await supabase
      .from("dealerships")
      .select("id, user_id")
      .eq("stripe_customer_id", customerId)
      .single();

    if (dealer) {
      await supabase
        .from("dealerships")
        .update({ subscription_status: "past_due" })
        .eq("id", dealer.id);

      if (dealer.user_id) {
        await supabase.from("notifications").insert({
          user_id: dealer.user_id,
          type: "invoice",
          title: "Pago fallido",
          message: "No hemos podido procesar el pago de tu suscripción. Por favor, actualiza tu método de pago.",
        });
      }
    }
  }

  if (event.type === "invoice.payment_succeeded") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const invoice = event.data.object as any;
    console.log("[webhook] invoice.payment_succeeded - subscription:", invoice.subscription, "customer:", invoice.customer);
    if (!invoice.subscription) return NextResponse.json({ received: true });

    const customerId = invoice.customer as string;
    const { data: dealer, error: dealerErr } = await supabase
      .from("dealerships")
      .select("id, subscription_status")
      .eq("stripe_customer_id", customerId)
      .single();

    console.log("[webhook] dealer found:", !!dealer, "error:", dealerErr?.message);

    if (dealer) {
      const updates: Record<string, unknown> = {};

      // Restore active status if payment was past_due
      if (dealer.subscription_status === "past_due") {
        updates.subscription_status = "active";
      }


      // Update period end from invoice lines
      const periodEnd = invoice.lines?.data?.[0]?.period?.end;
      if (periodEnd) {
        updates.subscription_period_end = new Date(periodEnd * 1000).toISOString();
      }

      if (Object.keys(updates).length > 0) {
        await supabase.from("dealerships").update(updates).eq("id", dealer.id);
      }

      // Create locksy_invoice record with PDF for this billing cycle
      const amountPaid = invoice.amount_paid as number | null;
      const periodEndDate = periodEnd ? new Date(periodEnd * 1000) : new Date();
      const monthName = periodEndDate.toLocaleString("es-ES", { month: "long", year: "numeric" });
      const concept = `Suscripción mensual LOCKSY — ${monthName.charAt(0).toUpperCase() + monthName.slice(1)}`;
      const now = new Date();

      // Increment invoice counter
      const { data: counterRow } = await supabase
        .from("locksy_config")
        .select("value")
        .eq("key", "invoice_counter")
        .single();
      const nextCounter = (parseInt(counterRow?.value ?? "0") || 0) + 1;
      await supabase.from("locksy_config").upsert({ key: "invoice_counter", value: String(nextCounter) });
      const year = now.getFullYear();
      const invoiceNumber = `LOCK-${year}-${String(nextCounter).padStart(4, "0")}`;

      // Fetch dealer billing data
      const { data: dealerBilling } = await supabase
        .from("dealerships")
        .select("billing_name, billing_nif_cif, billing_email, billing_address")
        .eq("id", dealer.id)
        .single();

      // Generate PDF
      let fileUrl: string | null = null;
      try {
        const pdfBuffer = await generateInvoicePDF({
          issuerName: process.env.LOCKSY_ISSUER_NAME ?? "LOCKSY",
          issuerNif: process.env.LOCKSY_ISSUER_NIF ?? "",
          issuerAddress: process.env.LOCKSY_ISSUER_ADDRESS ?? "",
          issuerEmail: process.env.LOCKSY_ISSUER_EMAIL ?? "noreply@locksy-at.es",
          recipientName: dealerBilling?.billing_name ?? "",
          recipientNif: dealerBilling?.billing_nif_cif ?? "",
          recipientAddress: dealerBilling?.billing_address ?? "",
          recipientEmail: dealerBilling?.billing_email ?? "",
          invoiceNumber,
          date: now,
          concept,
          baseAmount: amountPaid != null ? amountPaid / 100 : 0,
          ivaPercent: 21,
        });
        const fileName = `${invoiceNumber}.pdf`;
        const { error: uploadError } = await supabase.storage
          .from("locksy-invoices")
          .upload(fileName, pdfBuffer, { contentType: "application/pdf", upsert: true });
        if (!uploadError) {
          const { data: urlData } = supabase.storage.from("locksy-invoices").getPublicUrl(fileName);
          fileUrl = urlData?.publicUrl ?? null;
        }
      } catch (pdfErr) {
        console.error("PDF generation error in webhook:", pdfErr);
      }

      await supabase.from("locksy_invoices").insert({
        dealer_id: dealer.id,
        invoice_number: invoiceNumber,
        concept,
        amount: amountPaid != null ? amountPaid / 100 : null,
        file_url: fileUrl,
        sent_at: now.toISOString(),
      });

      // Email #13 — pago de suscripción confirmado
      const { data: dealerInfo } = await supabase
        .from("dealerships")
        .select("name, email")
        .eq("id", dealer.id)
        .single();
      if (dealerInfo?.email && amountPaid != null) {
        sendSubscriptionPaymentEmail(
          dealerInfo.email,
          dealerInfo.name ?? "",
          amountPaid / 100,
          periodEndDate
        ).catch(() => {});
      }
    }
  }

  return NextResponse.json({ received: true });
}
