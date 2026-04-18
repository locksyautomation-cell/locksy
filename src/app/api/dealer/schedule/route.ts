import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function getDealership(userId: string) {
  const adminClient = createAdminClient();
  const { data } = await adminClient
    .from("dealerships")
    .select("id")
    .eq("user_id", userId)
    .single();
  return data as { id: string } | null;
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const dealership = await getDealership(user.id);
  if (!dealership) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const adminClient = createAdminClient();
  const { data } = await adminClient
    .from("dealership_schedules")
    .select("*")
    .eq("dealership_id", dealership.id)
    .order("day_of_week");

  return NextResponse.json({ schedule: data || [] });
}

export async function PUT(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const dealership = await getDealership(user.id);
  if (!dealership) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const { days } = await request.json();
  if (!Array.isArray(days)) return NextResponse.json({ error: "Formato inválido" }, { status: 400 });

  const adminClient = createAdminClient();

  const rows = days.map((d: {
    day_of_week: number;
    is_closed: boolean;
    morning_start: string | null;
    morning_end: string | null;
    afternoon_start: string | null;
    afternoon_end: string | null;
  }) => ({
    dealership_id: dealership.id,
    day_of_week: d.day_of_week,
    is_closed: d.is_closed,
    morning_start: d.is_closed ? null : (d.morning_start || null),
    morning_end: d.is_closed ? null : (d.morning_end || null),
    afternoon_start: d.is_closed ? null : (d.afternoon_start || null),
    afternoon_end: d.is_closed ? null : (d.afternoon_end || null),
  }));

  const { error } = await adminClient
    .from("dealership_schedules")
    .upsert(rows, { onConflict: "dealership_id,day_of_week" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
