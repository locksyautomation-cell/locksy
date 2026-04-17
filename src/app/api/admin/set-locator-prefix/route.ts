import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatLocator } from "@/lib/utils/locator";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const adminClient = createAdminClient();
  const { data: userData } = await adminClient.from("users").select("role").eq("id", user.id).single();
  const role = userData?.role || (user.user_metadata?.role as string | undefined);
  if (role !== "admin") return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const { dealership_id, prefix } = await req.json();

  if (!dealership_id || !prefix) return NextResponse.json({ error: "dealership_id y prefix son requeridos" }, { status: 400 });

  const normalized = prefix.toUpperCase().trim();
  if (!/^[A-Z]{2}$/.test(normalized)) {
    return NextResponse.json({ error: "El prefijo debe ser exactamente 2 letras mayúsculas" }, { status: 400 });
  }

  // Check uniqueness (exclude current dealership)
  const { data: conflict } = await adminClient
    .from("dealerships")
    .select("id")
    .eq("locator_prefix", normalized)
    .neq("id", dealership_id)
    .maybeSingle();

  if (conflict) {
    return NextResponse.json({ error: `El prefijo ${normalized} ya está en uso por otro concesionario` }, { status: 409 });
  }

  // Fetch all appointments for this dealership in chronological order
  const { data: appointments } = await adminClient
    .from("appointments")
    .select("id")
    .eq("dealership_id", dealership_id)
    .order("created_at", { ascending: true });

  // Always renumber from 0000 in chronological order
  if (appointments && appointments.length > 0) {
    for (let i = 0; i < appointments.length; i++) {
      await adminClient
        .from("appointments")
        .update({ locator: formatLocator(normalized, i) })
        .eq("id", appointments[i].id);
    }
  }

  const nextSeq = appointments?.length ?? 0;

  const { error } = await adminClient
    .from("dealerships")
    .update({ locator_prefix: normalized, locator_sequence: nextSeq })
    .eq("id", dealership_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, prefix: normalized, next_seq: nextSeq });
}
