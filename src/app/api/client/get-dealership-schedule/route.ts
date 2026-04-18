import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const dealership_id = searchParams.get("dealership_id");
  if (!dealership_id) return NextResponse.json({ schedule: [] });

  const adminClient = createAdminClient();
  const { data } = await adminClient
    .from("dealership_schedules")
    .select("day_of_week, is_closed, morning_start, morning_end, afternoon_start, afternoon_end")
    .eq("dealership_id", dealership_id)
    .order("day_of_week");

  return NextResponse.json({ schedule: data || [] });
}
