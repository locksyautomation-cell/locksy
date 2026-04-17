import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { data: userData } = await supabase.from("users").select("role").eq("id", user.id).single();
    const role = userData?.role || (user.user_metadata?.role as string | undefined);
    if (role !== "admin") return NextResponse.json({ error: "No autorizado" }, { status: 403 });

    const body = await request.json();
    const {
      id,
      scheduled_date,
      scheduled_time,
      status,
      repair_status,
      description,
      dealer_observations,
      dealer_recommendations,
      budget_amount,
      budget_url,
      invoice_url,
      payment_status,
      manual_first_name,
      manual_last_name,
      manual_phone,
      manual_nif_cif,
      manual_address,
      manual_vehicle_brand,
      manual_vehicle_model,
      manual_vehicle_plate,
    } = body;

    if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });

    // Validar que la nueva fecha/hora no sea pasada (si se está cambiando)
    if (scheduled_date && scheduled_time) {
      const apptDateTime = new Date(`${scheduled_date}T${scheduled_time}:00`);
      if (apptDateTime < new Date()) {
        return NextResponse.json(
          { error: "No se pueden programar citas para una fecha y hora pasadas." },
          { status: 400 }
        );
      }
    }

    const adminClient = createAdminClient();
    const { error } = await adminClient
      .from("appointments")
      .update({
        scheduled_date,
        scheduled_time,
        status,
        repair_status: repair_status || null,
        description: description || null,
        dealer_observations: dealer_observations || null,
        dealer_recommendations: dealer_recommendations || null,
        budget_amount: budget_amount !== "" && budget_amount != null ? parseFloat(budget_amount) : null,
        budget_url: budget_url || null,
        invoice_url: invoice_url || null,
        payment_status,
        manual_first_name: manual_first_name || null,
        manual_last_name: manual_last_name || null,
        manual_phone: manual_phone || null,
        manual_nif_cif: manual_nif_cif || null,
        manual_address: manual_address || null,
        manual_vehicle_brand: manual_vehicle_brand || null,
        manual_vehicle_model: manual_vehicle_model || null,
        manual_vehicle_plate: manual_vehicle_plate || null,
      })
      .eq("id", id);

    if (error) return NextResponse.json({ error: "Error al actualizar la cita" }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
