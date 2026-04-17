import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { VERIFICATION_CODE_LENGTH, VERIFICATION_CODE_EXPIRY_MINUTES } from "@/lib/constants";
import { sendVerificationCode } from "@/lib/utils/email";

function generateCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < VERIFICATION_CODE_LENGTH; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const code = generateCode();
    const expiresAt = new Date(
      Date.now() + VERIFICATION_CODE_EXPIRY_MINUTES * 60 * 1000
    ).toISOString();

    const adminClient = createAdminClient();
    await adminClient
      .from("users")
      .update({
        verification_code: code,
        verification_code_expires_at: expiresAt,
      })
      .eq("id", user.id);

    if (user.email) {
      try {
        await sendVerificationCode(user.email, code);
        console.log("[generate-code] Email enviado a:", user.email);
      } catch (emailErr) {
        console.error("[generate-code] Error enviando email:", emailErr);
      }
    } else {
      console.warn("[generate-code] Usuario sin email:", user.id);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[generate-code] Error general:", err);
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
