import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

async function getUserId(): Promise<string | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) return user.id;
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user?.id ?? null;
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const body = await request.json();
    const adminClient = createAdminClient();

    const { data, error } = await adminClient
      .from("vehicles")
      .insert({ ...body, client_id: userId })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ vehicle: data });
  } catch {
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const body = await request.json();
    const { id, ...fields } = body;
    const adminClient = createAdminClient();

    const { data, error } = await adminClient
      .from("vehicles")
      .update(fields)
      .eq("id", id)
      .eq("client_id", userId)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ vehicle: data });
  } catch {
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const { id } = await request.json();
    const adminClient = createAdminClient();

    await adminClient.from("vehicles").delete().eq("id", id).eq("client_id", userId);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
