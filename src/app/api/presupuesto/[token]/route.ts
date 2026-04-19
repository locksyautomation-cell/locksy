import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  if (!token) return NextResponse.json({ error: "Token requerido" }, { status: 400 });

  const adminClient = createAdminClient();

  const { data: apt, error } = await adminClient
    .from("appointments")
    .select(`
      id, locator, scheduled_date, scheduled_time, description,
      budget_amount, budget_lines, budget_url,
      budget_status, budget_accepted_at,
      client_id,
      manual_first_name, manual_last_name,
      client:users(first_name, last_name),
      vehicle:vehicles(brand, model, plate),
      manual_vehicle_brand, manual_vehicle_model, manual_vehicle_plate,
      dealership:dealerships(name)
    `)
    .eq("budget_acceptance_token", token)
    .single();

  if (error || !apt) return NextResponse.json({ error: "Presupuesto no encontrado" }, { status: 404 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const a = apt as any;
  const clientName = a.client
    ? `${a.client.first_name || ""} ${a.client.last_name || ""}`.trim()
    : `${a.manual_first_name || ""} ${a.manual_last_name || ""}`.trim();
  const vehicleLabel = a.vehicle
    ? `${a.vehicle.brand} ${a.vehicle.model} · ${a.vehicle.plate}`
    : `${a.manual_vehicle_brand || ""} ${a.manual_vehicle_model || ""} · ${a.manual_vehicle_plate || ""}`.trim();

  return NextResponse.json({
    locator: a.locator,
    dealershipName: a.dealership?.name || "",
    scheduledDate: a.scheduled_date,
    clientName,
    vehicleLabel,
    description: a.description || null,
    budgetAmount: a.budget_amount,
    budgetLines: a.budget_lines || [],
    budgetUrl: a.budget_url || null,
    budgetStatus: a.budget_status || "pending",
    budgetAcceptedAt: a.budget_accepted_at || null,
  });
}
