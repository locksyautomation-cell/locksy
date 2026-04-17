import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { data: userData } = await supabase.from("users").select("role").eq("id", user.id).single();
    const role = userData?.role || (user.user_metadata?.role as string | undefined);
    if (role !== "admin") return NextResponse.json({ error: "No autorizado" }, { status: 403 });

    const body = await request.json();
    const { issuer_name, issuer_nif, issuer_address, issuer_email } = body as Record<string, string>;

    if (!issuer_name || !issuer_nif) {
      return NextResponse.json({ error: "Nombre y NIF son obligatorios" }, { status: 400 });
    }

    const adminClient = createAdminClient();
    const upserts = [
      { key: "issuer_name", value: issuer_name },
      { key: "issuer_nif", value: issuer_nif },
      { key: "issuer_address", value: issuer_address ?? "" },
      { key: "issuer_email", value: issuer_email ?? "" },
    ];

    const { error } = await adminClient
      .from("locksy_config")
      .upsert(upserts, { onConflict: "key" });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
