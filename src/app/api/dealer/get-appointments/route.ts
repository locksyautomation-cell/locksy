import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const inWorkshop = searchParams.get("in_workshop") === "true";
  const completed = searchParams.get("completed") === "true";

  const adminClient = createAdminClient();

  const { data: dealership } = await adminClient
    .from("dealerships")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!dealership) {
    return NextResponse.json({ appointments: [] });
  }

  const selectFields = `
    *,
    vehicle:vehicles(brand, model, plate, vehicle_type),
    client:users(first_name, last_name, email, phone, dni, address)
  `;

  let result;
  if (inWorkshop) {
    result = await adminClient
      .from("appointments")
      .select(selectFields)
      .eq("dealership_id", dealership.id)
      .eq("vehicle_in_dealership", true)
      .is("key_returned_at", null)
      .order("scheduled_date", { ascending: true });
  } else if (completed) {
    result = await adminClient
      .from("appointments")
      .select(selectFields)
      .eq("dealership_id", dealership.id)
      .eq("status", "finalizada")
      .not("key_returned_at", "is", null)
      .order("completed_at", { ascending: false });
  } else {
    result = await adminClient
      .from("appointments")
      .select(selectFields)
      .eq("dealership_id", dealership.id)
      .order("scheduled_date", { ascending: true });
  }

  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: 500 });
  }

  return NextResponse.json({ appointments: result.data || [] });
}
