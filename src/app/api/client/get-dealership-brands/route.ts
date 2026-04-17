// Ruta pública — devuelve las marcas aceptadas por un concesionario concreto.
// Si accepted_brand_ids está vacío, el concesionario acepta todas las marcas.
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  try {
    const dealership_id = request.nextUrl.searchParams.get("dealership_id");
    if (!dealership_id) return NextResponse.json({ accepted_brands: [] });

    const adminClient = createAdminClient();

    const { data: dealership } = await adminClient
      .from("dealerships")
      .select("accepted_brand_ids")
      .eq("id", dealership_id)
      .single();

    const acceptedIds: number[] = (dealership as unknown as { accepted_brand_ids: number[] } | null)?.accepted_brand_ids ?? [];

    // Sin restricción → acepta todas
    if (acceptedIds.length === 0) {
      return NextResponse.json({ accepted_brands: [], accepts_all: true });
    }

    // Convertir IDs a nombres
    const { data: brands } = await adminClient
      .from("vehicle_brands")
      .select("id, name")
      .in("id", acceptedIds);

    const names = (brands ?? []).map((b: { id: number; name: string }) => b.name);
    return NextResponse.json({ accepted_brands: names, accepts_all: false });
  } catch {
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
