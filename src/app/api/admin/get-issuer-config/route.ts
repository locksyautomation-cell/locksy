import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { data: userData } = await supabase.from("users").select("role").eq("id", user.id).single();
    const role = userData?.role || (user.user_metadata?.role as string | undefined);
    if (role !== "admin") return NextResponse.json({ error: "No autorizado" }, { status: 403 });

    const adminClient = createAdminClient();
    const keys = ["issuer_name", "issuer_nif", "issuer_address", "issuer_email"];
    const { data } = await adminClient
      .from("locksy_config")
      .select("key, value")
      .in("key", keys);

    const config: Record<string, string> = {
      issuer_name: process.env.LOCKSY_ISSUER_NAME ?? "",
      issuer_nif: process.env.LOCKSY_ISSUER_NIF ?? "",
      issuer_address: process.env.LOCKSY_ISSUER_ADDRESS ?? "",
      issuer_email: process.env.LOCKSY_ISSUER_EMAIL ?? "noreply@locksy-at.es",
    };

    for (const row of data ?? []) {
      if (row.value) config[row.key] = row.value;
    }

    return NextResponse.json({ config });
  } catch {
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
