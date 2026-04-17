import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const adminClient = createAdminClient();
  const { data } = await adminClient
    .from("dealerships")
    .select("id, name")
    .eq("slug", slug)
    .eq("active", true)
    .single();

  if (!data) {
    return NextResponse.json({ valid: false }, { status: 404 });
  }

  return NextResponse.json({ valid: true, id: data.id, name: data.name });
}
