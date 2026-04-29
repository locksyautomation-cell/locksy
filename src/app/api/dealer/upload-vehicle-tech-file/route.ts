import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const adminClient = createAdminClient();
    const { data: dealership } = await adminClient
      .from("dealerships")
      .select("id")
      .eq("user_id", user.id)
      .single();
    if (!dealership) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const vehicleId = formData.get("vehicle_id") as string | null;
    if (!file || !vehicleId) return NextResponse.json({ error: "file y vehicle_id requeridos" }, { status: 400 });

    const ext = file.name.split(".").pop();
    const path = `${vehicleId}/tech.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await adminClient.storage
      .from("tech-files")
      .upload(path, buffer, { contentType: file.type, upsert: true });

    if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

    const { data: { publicUrl } } = adminClient.storage.from("tech-files").getPublicUrl(path);
    return NextResponse.json({ url: publicUrl });
  } catch {
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
