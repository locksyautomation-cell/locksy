import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, name, company_name, email, phone, address, message } = body;

    if (!type || !name || !email) {
      return NextResponse.json(
        { error: "Faltan campos obligatorios" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    const { error } = await supabase.from("contact_messages").insert({
      form_type: type,
      name,
      email,
      phone: phone || null,
      company: company_name || null,
      message: message || null,
      extra_fields: address ? { address } : {},
    });

    if (error) {
      return NextResponse.json(
        { error: "Error al guardar la solicitud" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Error del servidor" },
      { status: 500 }
    );
  }
}
