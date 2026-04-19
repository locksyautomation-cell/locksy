import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
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

    const adminClient = createAdminClient();

    const { data: notifications } = await adminClient
      .from("notifications")
      .select("*, appointment:appointments(budget_url, budget_amount, budget_acceptance_token, budget_accepted_at, locator, repair_acceptance_token, dealership:dealerships(name))")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    const notifs = notifications || [];

    // Auto-mark budget_sent notifications as read if the budget has been signed
    const toMark = notifs
      .filter(
        (n: Record<string, unknown>) =>
          n.type === "budget_sent" &&
          n.read === false &&
          (n.appointment as Record<string, unknown> | null)?.budget_accepted_at
      )
      .map((n: Record<string, unknown>) => n.id as string);

    if (toMark.length > 0) {
      await adminClient
        .from("notifications")
        .update({ read: true })
        .in("id", toMark);

      notifs.forEach((n: Record<string, unknown>) => {
        if (toMark.includes(n.id as string)) n.read = true;
      });
    }

    return NextResponse.json({ notifications: notifs });
  } catch {
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
