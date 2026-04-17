import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-02-25.clover",
});

async function verifyAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const adminClient = createAdminClient();
  const { data } = await adminClient.from("users").select("role").eq("id", user.id).single();
  return data?.role === "admin";
}

export async function GET(request: NextRequest) {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const dealershipId = request.nextUrl.searchParams.get("dealership_id");
  if (!dealershipId) {
    return NextResponse.json({ error: "dealership_id requerido" }, { status: 400 });
  }

  const adminClient = createAdminClient();
  const { data: dealer } = await adminClient
    .from("dealerships")
    .select("stripe_connect_account_id, stripe_connect_onboarding_complete")
    .eq("id", dealershipId)
    .single();

  if (!dealer?.stripe_connect_account_id) {
    return NextResponse.json({ status: "not_created" });
  }

  // Check live status from Stripe
  const account = await stripe.accounts.retrieve(dealer.stripe_connect_account_id);
  const complete = account.details_submitted && !account.requirements?.currently_due?.length;

  // Sync to DB if changed
  if (complete !== dealer.stripe_connect_onboarding_complete) {
    await adminClient
      .from("dealerships")
      .update({ stripe_connect_onboarding_complete: complete })
      .eq("id", dealershipId);
  }

  return NextResponse.json({
    status: complete ? "active" : "pending",
    account_id: dealer.stripe_connect_account_id,
  });
}
