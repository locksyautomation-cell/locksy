import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const appointmentId = formData.get("appointment_id") as string | null;

    if (!file || !appointmentId) {
      return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
    }

    const adminClient = createAdminClient();
    const ext = file.name.split(".").pop();
    const path = `${appointmentId}/invoice.${ext}`;
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await adminClient.storage
      .from("invoices")
      .upload(path, buffer, { upsert: true, contentType: file.type });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data: { publicUrl } } = adminClient.storage.from("invoices").getPublicUrl(path);
    return NextResponse.json({ url: publicUrl });
  } catch {
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
