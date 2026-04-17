import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    // Verify admin role
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { data: userData } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    const role = userData?.role || (user.user_metadata?.role as string | undefined);

    if (role !== "admin") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const body = await request.json();
    const adminClient = createAdminClient();

    const DEFAULT_STATUSES = ["En espera", "En reparación", "Reparación finalizada"];
    const repair_statuses = body.repair_statuses ?? DEFAULT_STATUSES;

    // Create dealer auth user
    const { data: authData, error: authError } =
      await adminClient.auth.admin.createUser({
        email: body.dealer_email,
        password: body.dealer_password,
        email_confirm: true,
        user_metadata: { role: "dealer" },
      });

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: authError?.message || "Error al crear usuario" },
        { status: 400 }
      );
    }

    // Update user role to dealer
    await adminClient
      .from("users")
      .update({ role: "dealer" })
      .eq("id", authData.user.id);

    // Create dealership
    const { data: dealershipData, error: dealershipError } = await adminClient
      .from("dealerships")
      .insert({
        user_id: authData.user.id,
        name: body.name,
        company_name: body.company_name,
        nif_cif: body.nif_cif,
        email: body.email,
        phone: body.phone,
        address: body.address,
        city: body.city,
        postal_code: body.postal_code,
        slug: body.slug,
        active: true,
        repair_statuses: repair_statuses,
        vehicle_type: body.vehicle_type || null,
      })
      .select("id, slug")
      .single();

    if (dealershipError) {
      return NextResponse.json(
        { error: "Error al crear concesionario" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, dealership: dealershipData });
  } catch {
    return NextResponse.json(
      { error: "Error del servidor" },
      { status: 500 }
    );
  }
}
