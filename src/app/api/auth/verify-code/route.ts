import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { code } = await request.json();

    const adminClient = createAdminClient();
    const { data: userData, error } = await adminClient
      .from("users")
      .select("verification_code, verification_code_expires_at, role")
      .eq("id", user.id)
      .single();

    if (error || !userData) {
      return NextResponse.json({ error: "Error al verificar" }, { status: 500 });
    }

    if (userData.verification_code !== code) {
      return NextResponse.json({ error: "Código incorrecto" }, { status: 400 });
    }

    if (
      userData.verification_code_expires_at &&
      new Date(userData.verification_code_expires_at) < new Date()
    ) {
      return NextResponse.json({ error: "Código expirado" }, { status: 400 });
    }

    // Clear verification code
    await adminClient
      .from("users")
      .update({
        verification_code: null,
        verification_code_expires_at: null,
      })
      .eq("id", user.id);

    const res = NextResponse.json({ success: true, role: userData.role });
    res.cookies.set("pending_2fa", "", { maxAge: 0, path: "/" });
    return res;
  } catch {
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
