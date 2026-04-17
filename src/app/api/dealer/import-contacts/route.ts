import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type CsvRow = Record<string, string>;

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const adminClient = createAdminClient();
    const { data: dealership } = await adminClient
      .from("dealerships").select("id").eq("user_id", user.id).single();
    if (!dealership) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

    // Rows are pre-parsed client-side and sent as JSON
    const { rows } = (await request.json()) as { rows: CsvRow[] };

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: "El archivo está vacío o no tiene filas válidas" }, { status: 400 });
    }

    if (!("first_name" in rows[0])) {
      return NextResponse.json(
        { error: "El CSV debe tener al menos la columna 'first_name'" },
        { status: 400 }
      );
    }

    // Load existing contacts for dedup
    const { data: existingContacts } = await adminClient
      .from("dealer_contacts")
      .select("id, email, phone")
      .eq("dealership_id", dealership.id);

    const emailToId = new Map<string, string>();
    const phoneToId = new Map<string, string>();
    for (const c of existingContacts || []) {
      if (c.email) emailToId.set(c.email.toLowerCase(), c.id);
      if (c.phone) phoneToId.set(c.phone, c.id);
    }

    let created = 0;
    let skipped = 0;
    let vehicles_added = 0;
    const errors: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const lineNum = i + 2;

      const first_name = row["first_name"]?.trim();
      if (!first_name) {
        errors.push(`Fila ${lineNum}: first_name es obligatorio`);
        continue;
      }

      const email = row["email"]?.trim().toLowerCase() || null;
      const phone = row["phone"]?.trim() || null;

      const existingId =
        (email && emailToId.get(email)) ||
        (phone && phoneToId.get(phone)) ||
        null;

      let contactId: string;

      if (existingId) {
        contactId = existingId;
        skipped++;
      } else {
        const { data: newContact, error: insertError } = await adminClient
          .from("dealer_contacts")
          .insert({
            dealership_id: dealership.id,
            client_id: null,
            first_name,
            last_name: row["last_name"]?.trim() || null,
            email,
            phone,
            nif_cif: row["nif_cif"]?.trim() || null,
            address: row["address"]?.trim() || null,
            notes: row["notes"]?.trim() || null,
          })
          .select("id")
          .single();

        if (insertError || !newContact) {
          errors.push(`Fila ${lineNum}: ${insertError?.message ?? "error desconocido"}`);
          continue;
        }

        contactId = newContact.id;
        created++;
        if (email) emailToId.set(email, contactId);
        if (phone) phoneToId.set(phone, contactId);
      }

      const brand = row["vehicle_brand"]?.trim();
      const model = row["vehicle_model"]?.trim();
      const plate = row["vehicle_plate"]?.trim();

      if (brand && model && plate) {
        const { error: vehError } = await adminClient.from("vehicles").insert({
          dealer_contact_id: contactId,
          client_id: null,
          brand,
          model,
          plate,
          chassis_number: row["vehicle_chassis"]?.trim().slice(0, 17) || null,
          registration_date: row["vehicle_registration_date"]?.trim() || null,
        });

        if (!vehError) {
          vehicles_added++;
        } else {
          errors.push(`Fila ${lineNum} (vehículo): ${vehError.message}`);
        }
      }
    }

    return NextResponse.json({ success: true, created, skipped, vehicles_added, errors });
  } catch (err) {
    console.error("[import-contacts]", err);
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
