import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  if (!token) {
    return NextResponse.json({ error: "Token requerido" }, { status: 400 });
  }

  const adminClient = createAdminClient();

  const { data: aptRaw, error } = await adminClient
    .from("appointments")
    .select(`
      id, locator, scheduled_date, scheduled_time,
      description, dealer_observations,
      repair_order_url, order_accepted_at, order_return_accepted_at,
      payment_status, vehicle_km,
      client_id,
      manual_first_name, manual_last_name,
      manual_vehicle_brand, manual_vehicle_model, manual_vehicle_plate,
      client:users ( first_name, last_name ),
      vehicle:vehicles ( brand, model, plate ),
      dealership:dealerships ( name )
    `)
    .eq("repair_acceptance_token", token)
    .single();

  if (error || !aptRaw) {
    return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const apt = aptRaw as any;

  const clientName = apt.client_id && apt.client
    ? `${apt.client.first_name || ""} ${apt.client.last_name || ""}`.trim()
    : `${apt.manual_first_name || ""} ${apt.manual_last_name || ""}`.trim() || "—";

  const vehicleLabel = apt.vehicle_id && apt.vehicle
    ? `${apt.vehicle.brand || ""} ${apt.vehicle.model || ""} · ${apt.vehicle.plate || ""}`.trim()
    : `${apt.manual_vehicle_brand || ""} ${apt.manual_vehicle_model || ""} · ${apt.manual_vehicle_plate || ""}`.trim() || "—";

  const scheduledDate = apt.scheduled_date
    ? new Date(apt.scheduled_date + "T00:00:00").toLocaleDateString("es-ES")
    : "—";

  return NextResponse.json({
    locator: apt.locator,
    dealershipName: apt.dealership?.name ?? "—",
    scheduledDate,
    scheduledTime: apt.scheduled_time ?? "—",
    clientName,
    vehicleLabel,
    description: apt.description ?? null,
    observations: apt.dealer_observations ?? null,
    repairOrderUrl: apt.repair_order_url ?? null,
    orderAcceptedAt: apt.order_accepted_at ?? null,
    orderReturnAcceptedAt: apt.order_return_accepted_at ?? null,
    paymentStatus: apt.payment_status ?? "pending",
    vehicleKm: apt.vehicle_km ?? null,
  });
}
