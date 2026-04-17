// Ruta pública — devuelve los modelos de una marca
// Acepta: ?brand_id=123  o  ?brand_name=Honda[&vehicle_type=motos]
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  try {
    const brand_id = request.nextUrl.searchParams.get("brand_id");
    const brand_name = request.nextUrl.searchParams.get("brand_name");
    const vehicle_type = request.nextUrl.searchParams.get("vehicle_type");

    if (!brand_id && !brand_name) return NextResponse.json({ models: [] });

    const adminClient = createAdminClient();

    if (brand_id) {
      const { data, error } = await adminClient
        .from("vehicle_models")
        .select("id, name")
        .eq("brand_id", brand_id)
        .order("name", { ascending: true });

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ models: data ?? [] });
    }

    // Buscar por nombre de marca — puede haber entradas en motos y en coches
    let brandsQuery = adminClient
      .from("vehicle_brands")
      .select("id")
      .eq("name", brand_name!);

    if (vehicle_type === "motos" || vehicle_type === "coches") {
      brandsQuery = brandsQuery.eq("vehicle_type", vehicle_type);
    }

    const { data: matchedBrands } = await brandsQuery;
    if (!matchedBrands || matchedBrands.length === 0) return NextResponse.json({ models: [] });

    const brandIds = matchedBrands.map((b) => b.id);
    const { data, error } = await adminClient
      .from("vehicle_models")
      .select("id, name")
      .in("brand_id", brandIds)
      .order("name", { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Deduplicar modelos por nombre (misma marca puede tener modelos iguales en motos/coches)
    const seen = new Set<string>();
    const models = (data ?? []).filter((m) => {
      if (seen.has(m.name)) return false;
      seen.add(m.name);
      return true;
    });

    return NextResponse.json({ models });
  } catch {
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
