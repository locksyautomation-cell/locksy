import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function nominatim(q: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1`,
      { headers: { "User-Agent": "LOCKSY/1.0" } }
    );
    const data = await res.json();
    if (data?.[0]) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch {}
  return null;
}

function cleanAddress(address: string): string {
  // Remove local/floor/door qualifiers that Nominatim doesn't understand
  return address
    .replace(/,?\s*(loc|local|piso|planta|pta|puerta|bajo|entlo|entreplanta|nº|num|n°|#)\s*[\w\d-]*/gi, "")
    .trim();
}

async function geocode(address: string, city: string, postalCode: string): Promise<{ lat: number; lng: number } | null> {
  const cleaned = cleanAddress(address);

  // Try 1: cleaned address + city + postal code
  const r1 = await nominatim([cleaned, city, postalCode, "España"].filter(Boolean).join(", "));
  if (r1) return r1;

  // Try 2: cleaned address + city only
  const r2 = await nominatim([cleaned, city, "España"].filter(Boolean).join(", "));
  if (r2) return r2;

  // Try 3: city + postal code only (at least put it on the map approximately)
  const r3 = await nominatim([city, postalCode, "España"].filter(Boolean).join(", "));
  return r3;
}

export async function GET() {
  const admin = createAdminClient();

  // Try with lat/lng columns first; fall back if migration hasn't run yet
  let dealerships: Record<string, unknown>[] | null = null;
  let hasCoordsColumns = true;

  const { data: withCoords, error: coordsError } = await admin
    .from("dealerships")
    .select("id, name, slug, address, city, postal_code, latitude, longitude");

  if (coordsError) {
    hasCoordsColumns = false;
    const { data: withoutCoords, error: fallbackError } = await admin
      .from("dealerships")
      .select("id, name, slug, address, city, postal_code");
    if (fallbackError) {
      return NextResponse.json({ dealerships: [] });
    }
    dealerships = withoutCoords;
  } else {
    dealerships = withCoords;
  }

  if (!dealerships || dealerships.length === 0) return NextResponse.json({ dealerships: [] });

  const results = [];

  for (const d of dealerships) {
    let lat = d.latitude as number | null;
    let lng = d.longitude as number | null;

    if (!lat || !lng) {
      const coords = await geocode(d.address as string || "", d.city as string || "", d.postal_code as string || "");
      if (coords) {
        lat = coords.lat;
        lng = coords.lng;
        if (hasCoordsColumns) {
          await admin.from("dealerships").update({ latitude: lat, longitude: lng }).eq("id", d.id);
        }
      }
    }

    if (lat && lng) {
      results.push({ id: d.id, name: d.name, slug: d.slug, address: d.address, city: d.city, lat, lng });
    }
  }

  return NextResponse.json({ dealerships: results });
}
