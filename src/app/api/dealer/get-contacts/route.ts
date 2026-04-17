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
      .from("dealerships").select("id").eq("user_id", user.id).single();
    if (!dealership) return NextResponse.json({ contacts: [] });

    // 1. Get existing dealer_contacts
    const { data: contacts } = await adminClient
      .from("dealer_contacts")
      .select("*")
      .eq("dealership_id", dealership.id)
      .order("created_at", { ascending: false });

    const result = [...(contacts || [])];
    const registeredIds = new Set(result.filter((c) => c.client_id).map((c) => c.client_id));
    // Index manual contacts by email and phone for dedup
    const manualByEmail = new Map<string, string>(); // email → contact id
    const manualByPhone = new Map<string, string>(); // phone → contact id
    result.filter((c) => !c.client_id).forEach((c) => {
      if (c.email) manualByEmail.set(c.email.toLowerCase(), c.id);
      if (c.phone) manualByPhone.set(c.phone, c.id);
    });

    // 2. Find appointments without dealer_contact_id (legacy / pre-feature)
    // No join to users here — we look up user data separately to avoid PostgREST join issues
    const { data: legacyApts } = await adminClient
      .from("appointments")
      .select("id, client_id, manual_first_name, manual_last_name, manual_email, manual_phone, manual_nif_cif, manual_address, created_at")
      .eq("dealership_id", dealership.id)
      .is("dealer_contact_id", null);

    // For each legacy appointment, auto-create the dealer_contact and update the appointment
    for (const apt of legacyApts || []) {
      const a = apt as Record<string, unknown>;

      if (a.client_id) {
        // Registered client
        if (registeredIds.has(a.client_id as string)) continue; // already in dealer_contacts

        // Look up user data separately
        const { data: u } = await adminClient
          .from("users")
          .select("first_name, last_name, email, phone, dni, address")
          .eq("id", a.client_id as string)
          .maybeSingle();

        const { data: newContact } = await adminClient
          .from("dealer_contacts")
          .insert({
            dealership_id: dealership.id,
            client_id: a.client_id,
            first_name: u?.first_name || "",
            last_name: u?.last_name || null,
            email: u?.email || null,
            phone: u?.phone || null,
            nif_cif: u?.dni || null,
            address: u?.address || null,
          })
          .select("*")
          .single();
        if (newContact) {
          // Link all their appointments to this contact
          await adminClient
            .from("appointments")
            .update({ dealer_contact_id: newContact.id })
            .eq("dealership_id", dealership.id)
            .eq("client_id", a.client_id as string)
            .is("dealer_contact_id", null);
          result.push(newContact);
          registeredIds.add(a.client_id as string);
        }
      } else {
        // Manual client — dedup by email or phone before creating
        if (!a.manual_first_name && !a.manual_email && !a.manual_phone) continue;

        const email = (a.manual_email as string | null)?.toLowerCase() || null;
        const phone = (a.manual_phone as string | null) || null;

        // Check if a matching contact already exists
        const existingId =
          (email && manualByEmail.get(email)) ||
          (phone && manualByPhone.get(phone)) ||
          null;

        if (existingId) {
          // Link the appointment to the existing contact instead of creating a duplicate
          await adminClient
            .from("appointments")
            .update({ dealer_contact_id: existingId })
            .eq("id", a.id as string);
        } else {
          const { data: newContact } = await adminClient
            .from("dealer_contacts")
            .insert({
              dealership_id: dealership.id,
              client_id: null,
              first_name: (a.manual_first_name as string) || "",
              last_name: (a.manual_last_name as string) || null,
              email: (a.manual_email as string) || null,
              phone: (a.manual_phone as string) || null,
              nif_cif: (a.manual_nif_cif as string) || null,
              address: (a.manual_address as string) || null,
            })
            .select("*")
            .single();
          if (newContact) {
            await adminClient
              .from("appointments")
              .update({ dealer_contact_id: newContact.id })
              .eq("id", a.id as string);
            result.push(newContact);
            if (newContact.email) manualByEmail.set(newContact.email.toLowerCase(), newContact.id);
            if (newContact.phone) manualByPhone.set(newContact.phone, newContact.id);
          }
        }
      }
    }

    // Sort: newest first
    result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return NextResponse.json({ contacts: result });
  } catch {
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
