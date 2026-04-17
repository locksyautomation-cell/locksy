import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    let userId: string | null = null;
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      userId = user.id;
    } else {
      const { data: { session } } = await supabase.auth.getSession();
      userId = session?.user?.id ?? null;
    }
    if (!userId) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "Archivo requerido" }, { status: 400 });

    const ext = file.name.split(".").pop();
    const path = `${userId}/avatar.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const adminClient = createAdminClient();
    const { error: uploadError } = await adminClient.storage
      .from("profile-photos")
      .upload(path, buffer, { contentType: file.type, upsert: true });

    if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

    const { data: { publicUrl } } = adminClient.storage.from("profile-photos").getPublicUrl(path);

    // Update users table with the photo URL
    await adminClient
      .from("users")
      .update({ profile_photo_url: publicUrl })
      .eq("id", userId);

    return NextResponse.json({ url: publicUrl });
  } catch {
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
