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

    const { notification_id, appointment_id, accept } = await request.json();
    const adminClient = createAdminClient();

    // Update budget_status on the appointment (security: must belong to this client)
    await adminClient
      .from("appointments")
      .update({ budget_status: accept ? "accepted" : "rejected" })
      .eq("id", appointment_id)
      .eq("client_id", userId);

    // Mark notification as read
    await adminClient
      .from("notifications")
      .update({ read: true })
      .eq("id", notification_id);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
