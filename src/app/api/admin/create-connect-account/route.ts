import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "LOCKSY <noreply@locksy-at.es>";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-02-25.clover",
});

async function verifyAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const adminClient = createAdminClient();
  const { data } = await adminClient.from("users").select("role").eq("id", user.id).single();
  return data?.role === "admin";
}

export async function POST(request: NextRequest) {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { dealership_id } = await request.json();
  if (!dealership_id) {
    return NextResponse.json({ error: "dealership_id requerido" }, { status: 400 });
  }

  const adminClient = createAdminClient();
  const { data: dealer } = await adminClient
    .from("dealerships")
    .select("id, name, email, stripe_connect_account_id")
    .eq("id", dealership_id)
    .single();

  if (!dealer) {
    return NextResponse.json({ error: "Concesionario no encontrado" }, { status: 404 });
  }

  let accountId = dealer.stripe_connect_account_id;

  // Create Connect Express account if it doesn't exist yet
  if (!accountId) {
    const account = await stripe.accounts.create({
      type: "express",
      email: dealer.email,
      business_profile: { name: dealer.name },
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      metadata: { dealership_id: dealer.id },
    });

    accountId = account.id;

    await adminClient
      .from("dealerships")
      .update({ stripe_connect_account_id: accountId })
      .eq("id", dealer.id);
  }

  // Generate onboarding link
  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/admin/concesionarios/${dealer.id}?connect=refresh`,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/admin/concesionarios/${dealer.id}?connect=success`,
    type: "account_onboarding",
  });

  // Send onboarding link by email to the dealership
  await resend.emails.send({
    from: FROM_EMAIL,
    to: dealer.email,
    subject: "Configura tu cuenta de pagos en LOCKSY",
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#111;">
        <h2 style="color:#0a1628;">Hola, ${dealer.name}</h2>
        <p>Para poder recibir los pagos de las reparaciones a través de LOCKSY, necesitas configurar tu cuenta de pagos.</p>
        <p>El proceso tarda menos de 5 minutos. Solo necesitarás tu IBAN y algunos datos fiscales básicos.</p>
        <div style="text-align:center;margin:32px 0;">
          <a href="${accountLink.url}"
             style="background:#0a1628;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">
            Configurar cuenta de pagos
          </a>
        </div>
        <p style="color:#666;font-size:13px;">
          Si el botón no funciona, copia y pega este enlace en tu navegador:<br>
          <a href="${accountLink.url}" style="color:#0a1628;">${accountLink.url}</a>
        </p>
        <p style="color:#666;font-size:12px;margin-top:32px;">— El equipo de LOCKSY</p>
      </div>
    `,
  });

  return NextResponse.json({ account_id: accountId });
}
