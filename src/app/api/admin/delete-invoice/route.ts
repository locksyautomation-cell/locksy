import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

async function verifyAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const adminClient = createAdminClient();
  const { data } = await adminClient.from("users").select("role").eq("id", user.id).single();
  return data?.role === "admin";
}

export async function DELETE(request: NextRequest) {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await request.json();
  if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 });

  const adminClient = createAdminClient();

  // Get file_url before deleting to remove from storage
  const { data: inv } = await adminClient
    .from("locksy_invoices")
    .select("file_url, dealer_id")
    .eq("id", id)
    .single();

  if (inv?.file_url) {
    // Extract storage path from URL
    const url = new URL(inv.file_url);
    const pathParts = url.pathname.split("/locksy-invoices/");
    if (pathParts[1]) {
      await adminClient.storage.from("locksy-invoices").remove([pathParts[1]]);
    }
  }

  const { error } = await adminClient.from("locksy_invoices").delete().eq("id", id);
  if (error) return NextResponse.json({ error: "Error al eliminar" }, { status: 500 });
  return NextResponse.json({ success: true });
}
