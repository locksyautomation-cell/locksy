import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendStatusChangeEmail, sendBudgetEmail } from "@/lib/utils/email";
import { generateRepairInvoiceForAppointment } from "@/lib/utils/repair-invoice-service";

async function getDealership(user_id: string) {
  const adminClient = createAdminClient();
  const { data } = await adminClient
    .from("dealerships")
    .select("id")
    .eq("user_id", user_id)
    .single();
  return data;
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const dealership = await getDealership(user.id);
    if (!dealership) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

    const body = await request.json();
    const { id, ...fields } = body;
    if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });

    const adminClient = createAdminClient();

    // Fetch current appointment state for notification diffing
    const { data: currentApt } = await adminClient
      .from("appointments")
      .select("client_id, repair_status, budget_url, locator, budget_amount, status")
      .eq("id", id)
      .eq("dealership_id", dealership.id)
      .maybeSingle();

    // Fetch client email + name for emails
    const clientUser = currentApt?.client_id
      ? await adminClient.from("users").select("email, first_name").eq("id", currentApt.client_id).single().then(r => r.data)
      : null;

    const { error } = await adminClient
      .from("appointments")
      .update(fields)
      .eq("id", id)
      .eq("dealership_id", dealership.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Send notifications to the registered client
    if (currentApt?.client_id) {
      const notifications = [];

      // Budget notification: triggered when budget_sent_at is set (covers both file and no-file budgets)
      if (fields.budget_sent_at) {
        notifications.push({
          user_id: currentApt.client_id,
          appointment_id: id,
          type: "budget_sent",
          title: "Nuevo presupuesto",
          message: `El taller ha enviado un presupuesto para tu cita ${currentApt.locator}.`,
          read: false,
        });
      }

      // Repair status notification: repair_status changed
      if (
        fields.repair_status !== undefined &&
        fields.repair_status !== currentApt.repair_status &&
        fields.repair_status
      ) {
        notifications.push({
          user_id: currentApt.client_id,
          appointment_id: id,
          type: "status_change",
          title: "Actualización de tu reparación",
          message: `Estado de reparación actualizado para la cita ${currentApt.locator}: ${fields.repair_status}.`,
          read: false,
        });
      }

      if (notifications.length > 0) {
        await adminClient.from("notifications").insert(notifications);
      }

      // Send emails (fire and forget — don't block the response)
      if (clientUser?.email) {
        if (fields.budget_sent_at) {
          // budget_amount may come in the same update or already be in the DB
          const amount = fields.budget_amount ?? currentApt.budget_amount;
          if (amount) {
            sendBudgetEmail(
              clientUser.email,
              clientUser.first_name || "",
              currentApt.locator,
              amount,
              id
            ).catch(() => {});
          }
        }
        if (
          fields.repair_status !== undefined &&
          fields.repair_status !== currentApt.repair_status &&
          fields.repair_status
        ) {
          sendStatusChangeEmail(
            clientUser.email,
            clientUser.first_name || "",
            currentApt.locator,
            fields.repair_status,
            id
          ).catch(() => {});
        }
      }
    }

    // When status changes to "finalizada": notify client + generate invoice
    if (fields.status === "finalizada" && currentApt?.status !== "finalizada") {
      if (currentApt?.client_id) {
        await adminClient.from("notifications").insert({
          user_id: currentApt.client_id,
          appointment_id: id,
          type: "repair_completed",
          title: "Reparación finalizada",
          message: `La reparación de tu vehículo (cita ${currentApt.locator}) ha sido finalizada. Ya puedes ver la factura y proceder al pago.`,
          read: false,
        });
      }
      generateRepairInvoiceForAppointment(id, adminClient).catch(() => {});
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const dealership = await getDealership(user.id);
    if (!dealership) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });

    const adminClient = createAdminClient();
    const { error } = await adminClient
      .from("appointments")
      .delete()
      .eq("id", id)
      .eq("dealership_id", dealership.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
