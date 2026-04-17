import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { sendDealershipDeletedEmail } from "@/lib/utils/email";

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { data: userData } = await supabase.from("users").select("role").eq("id", user.id).single();
    const role = userData?.role || (user.user_metadata?.role as string | undefined);
    if (role !== "admin") return NextResponse.json({ error: "No autorizado" }, { status: 403 });

    const { dealership_id } = await request.json();
    if (!dealership_id) return NextResponse.json({ error: "dealership_id requerido" }, { status: 400 });

    const adminClient = createAdminClient();

    // Get dealership data before deleting
    const { data: dealer } = await adminClient
      .from("dealerships")
      .select("user_id, name")
      .eq("id", dealership_id)
      .single();

    if (!dealer) return NextResponse.json({ error: "Concesionario no encontrado" }, { status: 404 });

    // Get all clients linked to this dealership to notify them
    const { data: linkedClients } = await adminClient
      .from("dealership_clients")
      .select("client_id")
      .eq("dealership_id", dealership_id);

    // Send notification + email to each linked client
    if (linkedClients && linkedClients.length > 0) {
      const clientIds = linkedClients.map(({ client_id }) => client_id);

      const notifications = clientIds.map((client_id) => ({
        user_id: client_id,
        type: "dealership_deleted",
        title: "Concesionario eliminado",
        message: `El concesionario "${dealer.name}" ha sido eliminado de la plataforma. Tu historial de citas se ha conservado.`,
      }));
      await adminClient.from("notifications").insert(notifications);

      // Send email to each client
      const { data: clientUsers } = await adminClient
        .from("users")
        .select("email, first_name, last_name")
        .in("id", clientIds);
      for (const c of clientUsers || []) {
        if (c.email) {
          sendDealershipDeletedEmail(
            c.email,
            [c.first_name, c.last_name].filter(Boolean).join(" "),
            dealer.name
          ).catch(() => {});
        }
      }
    }

    // Delete dealership — cascades dealership_clients and schedule_blocks.
    // appointments.dealership_id will be set to NULL (ON DELETE SET NULL) preserving history.
    const { error: dealerError } = await adminClient
      .from("dealerships")
      .delete()
      .eq("id", dealership_id);

    if (dealerError) return NextResponse.json({ error: "Error al eliminar concesionario" }, { status: 500 });

    // Delete auth user account
    if (dealer.user_id) {
      await adminClient.auth.admin.deleteUser(dealer.user_id);
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
