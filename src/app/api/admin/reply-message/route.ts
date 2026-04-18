import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Resend } from "resend";

const getResend = () => new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "LOCKSY <noreply@locksy-at.es>";
const EMAILS_ENABLED = process.env.RESEND_ENABLED !== "false";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { data: userData } = await supabase.from("users").select("role").eq("id", user.id).single();
    const role = userData?.role || (user.user_metadata?.role as string | undefined);
    if (role !== "admin") return NextResponse.json({ error: "No autorizado" }, { status: 403 });

    const { message_id, reply_text } = await request.json();
    if (!message_id || !reply_text?.trim()) {
      return NextResponse.json({ error: "Faltan campos obligatorios" }, { status: 400 });
    }

    const adminClient = createAdminClient();
    const { data: msg, error: fetchError } = await adminClient
      .from("contact_messages")
      .select("id, name, email, form_type, message")
      .eq("id", message_id)
      .single();

    if (fetchError || !msg) {
      console.error("[reply-message] fetchError:", fetchError?.message, "msg:", msg);
      return NextResponse.json({ error: fetchError?.message || "Mensaje no encontrado" }, { status: 404 });
    }
    if (!msg.email) {
      return NextResponse.json({ error: "El mensaje no tiene email de destinatario" }, { status: 400 });
    }

    const subject =
      msg.form_type === "setup"
        ? "Re: Start Setup — LOCKSY"
        : "Re: Contact Us — LOCKSY";

    if (!EMAILS_ENABLED) {
      console.log(`[email disabled] reply-message → ${msg.email}`);
    } else {
      const originalMessage = (msg as unknown as { message?: string | null }).message;

      const { error: emailError } = await getResend().emails.send({
        from: FROM_EMAIL,
        to: msg.email,
        subject,
        html: `
          <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#111;">
            <p>Hola${msg.name ? ` ${msg.name}` : ""},</p>
            <div style="white-space:pre-wrap;line-height:1.6;">${reply_text.replace(/\n/g, "<br>")}</div>
            <br>
            <p style="color:#666;font-size:12px;">— El equipo de LOCKSY</p>
            ${originalMessage ? `
            <div style="margin-top:32px;padding:16px;border-left:3px solid #e5e7eb;background:#f9fafb;border-radius:0 8px 8px 0;">
              <p style="margin:0 0 8px;color:#9ca3af;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;">Mensaje original</p>
              <div style="color:#6b7280;font-size:13px;white-space:pre-wrap;">${originalMessage.replace(/\n/g, "<br>")}</div>
            </div>` : ""}
          </div>
        `,
      });

      if (emailError) {
        return NextResponse.json({ error: "Error al enviar el email" }, { status: 500 });
      }
    }

    // Save reply in DB
    await adminClient.from("contact_message_replies").insert({
      message_id,
      reply_text,
      sent_at: new Date().toISOString(),
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
