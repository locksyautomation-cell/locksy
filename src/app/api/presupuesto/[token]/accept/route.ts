import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendSignatureConfirmationEmail } from "@/lib/utils/email";
import { regenerateBudgetPdfWithSignature } from "@/lib/utils/generate-signed-budget-pdf";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  if (!token) return NextResponse.json({ error: "Token requerido" }, { status: 400 });

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";

  const adminClient = createAdminClient();

  const { data: aptRaw, error: findError } = await adminClient
    .from("appointments")
    .select(`
      id, locator, budget_status, budget_accepted_at, client_id,
      manual_first_name, manual_last_name, manual_email,
      client:users(first_name, last_name, email),
      dealership:dealerships(name)
    `)
    .eq("budget_acceptance_token", token)
    .single();

  if (findError || !aptRaw) return NextResponse.json({ error: "Presupuesto no encontrado" }, { status: 404 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const apt = aptRaw as any;

  if (apt.budget_accepted_at) return NextResponse.json({ ok: true, alreadyAccepted: true });

  const now = new Date().toISOString();

  const { error } = await adminClient
    .from("appointments")
    .update({
      budget_status: "accepted",
      budget_accepted_at: now,
      budget_accepted_ip: ip,
    })
    .eq("id", apt.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Regenerar PDF con firma digital (fire-and-forget)
  regenerateBudgetPdfWithSignature(apt.id, now, ip, adminClient).catch(() => {});

  // Mark budget_sent notification as read
  await adminClient
    .from("notifications")
    .update({ read: true })
    .eq("appointment_id", apt.id)
    .eq("type", "budget_sent");

  // Send confirmation email (fire-and-forget)
  const clientEmail = apt.client?.email || apt.manual_email;
  const clientName = apt.client
    ? `${apt.client.first_name || ""} ${apt.client.last_name || ""}`.trim()
    : `${apt.manual_first_name || ""} ${apt.manual_last_name || ""}`.trim();
  const dealershipName = apt.dealership?.name || "";

  if (clientEmail) {
    sendSignatureConfirmationEmail(
      clientEmail,
      clientName,
      apt.locator,
      dealershipName,
      "budget_accepted",
      now,
      ip
    ).catch(() => {});
  }

  return NextResponse.json({ ok: true });
}
