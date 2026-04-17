import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

async function getDealershipId(): Promise<string | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const adminClient = createAdminClient();
  const { data } = await adminClient
    .from("dealerships")
    .select("id")
    .eq("user_id", user.id)
    .single();

  return data?.id ?? null;
}

// GET — fetch all blocks for this dealer
export async function GET() {
  const dealershipId = await getDealershipId();
  if (!dealershipId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const adminClient = createAdminClient();
  const { data } = await adminClient
    .from("schedule_blocks")
    .select("*")
    .eq("dealership_id", dealershipId)
    .order("block_date", { ascending: true });

  return NextResponse.json({ blocks: data || [] });
}

// POST — create a block
export async function POST(request: NextRequest) {
  const dealershipId = await getDealershipId();
  if (!dealershipId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await request.json();
  const { block_date, start_time, end_time, reason } = body;

  if (!block_date || !start_time || !end_time) {
    return NextResponse.json({ error: "Fecha y horas son obligatorias" }, { status: 400 });
  }

  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .from("schedule_blocks")
    .insert({ dealership_id: dealershipId, block_date, start_time, end_time, reason })
    .select()
    .single();

  if (error) return NextResponse.json({ error: "Error al crear bloqueo" }, { status: 500 });
  return NextResponse.json({ block: data });
}

// DELETE — remove a block (verifies ownership via dealership_id)
export async function DELETE(request: NextRequest) {
  const dealershipId = await getDealershipId();
  if (!dealershipId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await request.json();
  if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 });

  const adminClient = createAdminClient();
  const { error } = await adminClient
    .from("schedule_blocks")
    .delete()
    .eq("id", id)
    .eq("dealership_id", dealershipId);

  if (error) return NextResponse.json({ error: "Error al eliminar bloqueo" }, { status: 500 });
  return NextResponse.json({ success: true });
}
