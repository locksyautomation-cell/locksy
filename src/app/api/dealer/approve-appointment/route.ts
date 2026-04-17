import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendAppointmentStatusEmail } from "@/lib/utils/email";

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const adminClient = createAdminClient();

    // Verificar que el dealer tiene concesionario
    const { data: dealership } = await adminClient
      .from("dealerships")
      .select("id, name")
      .eq("user_id", user.id)
      .single();

    if (!dealership) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

    const { id, action } = await request.json(); // action: "accept" | "reject"
    if (!id || !["accept", "reject"].includes(action)) {
      return NextResponse.json({ error: "id y action requeridos" }, { status: 400 });
    }

    // Verificar que la cita pertenece a este concesionario y está pendiente de aprobación
    const { data: apt } = await adminClient
      .from("appointments")
      .select("id, client_id, locator, status")
      .eq("id", id)
      .eq("dealership_id", dealership.id)
      .single();

    if (!apt) return NextResponse.json({ error: "Cita no encontrada" }, { status: 404 });
    if ((apt as unknown as { status: string }).status !== "pendiente_aprobacion") {
      return NextResponse.json({ error: "La cita no está pendiente de aprobación" }, { status: 400 });
    }

    const newStatus = action === "accept" ? "pendiente" : "rechazada";
    const { error } = await adminClient
      .from("appointments")
      .update({ status: newStatus })
      .eq("id", id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Notificación al cliente registrado
    const clientId = (apt as unknown as { client_id: string | null }).client_id;
    if (clientId) {
      const dealerName = (dealership as unknown as { name: string }).name;
      const locator = (apt as unknown as { locator: string }).locator;

      await adminClient.from("notifications").insert({
        user_id: clientId,
        appointment_id: id,
        type: action === "accept" ? "appointment_accepted" : "appointment_rejected",
        title: action === "accept" ? "Solicitud de cita aceptada" : "Solicitud de cita rechazada",
        message: action === "accept"
          ? `${dealerName} ha aceptado tu solicitud de cita ${locator}. Ya puedes acudir en la fecha y hora indicadas.`
          : `${dealerName} ha rechazado tu solicitud de cita ${locator}. Por favor, contacta con el taller para más información.`,
        read: false,
      });

      // Send email notification (fire and forget)
      const clientUser = await adminClient
        .from("users")
        .select("email, first_name")
        .eq("id", clientId)
        .single()
        .then(r => r.data);

      if (clientUser?.email) {
        sendAppointmentStatusEmail(
          clientUser.email,
          clientUser.first_name || "",
          locator,
          action === "accept",
          id
        ).catch(() => {});
      }
    }

    return NextResponse.json({ ok: true, status: newStatus });
  } catch {
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
