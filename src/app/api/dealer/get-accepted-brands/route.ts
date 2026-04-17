import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const adminClient = createAdminClient();

    const { data: dealership } = await adminClient
      .from("dealerships")
      .select("accepted_brand_ids, vehicle_type")
      .eq("user_id", user.id)
      .single();

    const acceptedIds: number[] = (dealership as unknown as { accepted_brand_ids: number[] } | null)?.accepted_brand_ids ?? [];
    const vehicleType = (dealership as unknown as { vehicle_type: string | null } | null)?.vehicle_type;

    // Devolver las marcas según el tipo del concesionario
    let brandsQuery = adminClient
      .from("vehicle_brands")
      .select("id, name, vehicle_type")
      .order("name", { ascending: true });

    if (vehicleType === "motos" || vehicleType === "coches") {
      brandsQuery = brandsQuery.eq("vehicle_type", vehicleType);
    }
    // Para "ambos" o sin tipo: devuelve todas sin filtro

    const { data: allBrands } = await brandsQuery;

    return NextResponse.json({ accepted_brand_ids: acceptedIds, brands: allBrands ?? [], vehicle_type: vehicleType ?? null });
  } catch {
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
