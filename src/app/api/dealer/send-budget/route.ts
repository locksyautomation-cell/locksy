import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { generateBudgetPDF, type BudgetLine } from "@/lib/utils/generate-budget-pdf";
import { sendBudgetEmail } from "@/lib/utils/email";
import { randomUUID } from "crypto";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const body = await request.json();
    const { appointment_id, lines, description } = body as {
      appointment_id: string;
      lines: BudgetLine[];
      description?: string;
    };

    if (!appointment_id || !lines?.length) {
      return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
    }

    const adminClient = createAdminClient();

    // Validate dealer owns this appointment
    const { data: dealership } = await adminClient
      .from("dealerships")
      .select("id, name, nif_cif, address, logo_url")
      .eq("user_id", user.id)
      .single();

    if (!dealership) return NextResponse.json({ error: "Concesionario no encontrado" }, { status: 404 });

    const { data: apt } = await adminClient
      .from("appointments")
      .select(`
        id, locator, scheduled_date, description,
        client_id,
        manual_first_name, manual_last_name, manual_nif_cif, manual_phone,
        client:users(first_name, last_name, email, phone, dni),
        vehicle:vehicles(brand, model, plate, chassis_number)
      `)
      .eq("id", appointment_id)
      .eq("dealership_id", dealership.id)
      .single();

    if (!apt) return NextResponse.json({ error: "Cita no encontrada" }, { status: 404 });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const a = apt as any;
    const clientName = a.client
      ? `${a.client.first_name || ""} ${a.client.last_name || ""}`.trim()
      : `${a.manual_first_name || ""} ${a.manual_last_name || ""}`.trim();
    const clientNif = a.client?.dni || a.manual_nif_cif || null;
    const clientPhone = a.client?.phone || a.manual_phone || null;
    const vehicle = a.vehicle || {};
    const scheduledDate = new Date(a.scheduled_date).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });

    // Logo buffer
    let logoBuffer: Buffer | null = null;
    if (dealership.logo_url) {
      try {
        const res = await fetch(dealership.logo_url);
        if (res.ok) logoBuffer = Buffer.from(await res.arrayBuffer());
      } catch { /* skip */ }
    }

    // Generate PDF
    const pdfBuffer = await generateBudgetPDF({
      dealershipName: dealership.name,
      dealershipNif: dealership.nif_cif || null,
      dealershipAddress: dealership.address || null,
      dealershipLogoBuffer: logoBuffer,
      locator: a.locator,
      scheduledDate,
      clientName,
      clientNif,
      clientPhone,
      vehicleBrand: vehicle.brand || "",
      vehicleModel: vehicle.model || "",
      vehiclePlate: vehicle.plate || "",
      vehicleChassis: vehicle.chassis_number || null,
      description: description || a.description || null,
      lines,
      ivaPercent: 21,
      validityDays: 30,
    });

    // Upload PDF
    const fileName = `${appointment_id}/budget-${Date.now()}.pdf`;
    const { error: uploadError } = await adminClient.storage
      .from("budgets")
      .upload(fileName, pdfBuffer, { upsert: true, contentType: "application/pdf" });

    if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

    const { data: { publicUrl } } = adminClient.storage.from("budgets").getPublicUrl(fileName);

    // Precios con IVA incluido — el total es la suma directa
    const totalWithIva = parseFloat(lines.reduce((sum, l) => sum + l.quantity * l.unit_price, 0).toFixed(2));

    // Generate token if not exists
    const token = randomUUID();

    // Base update — reset firma anterior si se reenvía
    const { error: updateError } = await adminClient
      .from("appointments")
      .update({
        budget_amount: totalWithIva,
        budget_status: "pending",
        budget_sent_at: new Date().toISOString(),
        budget_url: publicUrl,
        budget_accepted_at: null,
        budget_accepted_ip: null,
        budget_lines: lines,
        budget_acceptance_token: token,
      })
      .eq("id", appointment_id);

    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

    // Notification: replace any existing budget_sent notification with a fresh one
    if (a.client_id) {
      await adminClient
        .from("notifications")
        .delete()
        .eq("appointment_id", appointment_id)
        .eq("type", "budget_sent");

      await adminClient.from("notifications").insert({
        user_id: a.client_id,
        appointment_id,
        type: "budget_sent",
        title: "Nuevo presupuesto",
        message: `El taller ha enviado un presupuesto para tu cita ${a.locator}.`,
      });

      const clientEmail = a.client?.email;
      if (clientEmail) {
        sendBudgetEmail(
          clientEmail,
          a.client?.first_name || "",
          a.locator,
          totalWithIva,
          appointment_id
        ).catch(() => {});
      }
    }

    return NextResponse.json({ ok: true, budgetUrl: publicUrl, token });
  } catch (err) {
    console.error("send-budget error:", err);
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
