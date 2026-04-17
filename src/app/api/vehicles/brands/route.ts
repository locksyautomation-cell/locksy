// Ruta pública — usada por formularios de concesionarios y clientes
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  try {
    const vehicleType = request.nextUrl.searchParams.get("vehicle_type");

    const adminClient = createAdminClient();
    let query = adminClient
      .from("vehicle_brands")
      .select("id, name, vehicle_type")
      .order("name", { ascending: true });

    if (vehicleType === "motos" || vehicleType === "coches") {
      query = query.eq("vehicle_type", vehicleType);
    }

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Cuando no se filtra por tipo, deduplicar por nombre (una marca puede existir
    // en ambos catálogos — motos y coches — con el mismo nombre)
    let brands = data ?? [];
    if (!vehicleType) {
      const seen = new Set<string>();
      brands = brands.filter((b) => {
        if (seen.has(b.name)) return false;
        seen.add(b.name);
        return true;
      });
    }

    return NextResponse.json({ brands });
  } catch {
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
