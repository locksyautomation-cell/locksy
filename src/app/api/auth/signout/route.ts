import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();

  const redirectTo = request.nextUrl.searchParams.get("redirectTo") || "/login";
  const url = request.nextUrl.clone();
  url.pathname = redirectTo;
  url.search = "";
  return NextResponse.redirect(url);
}
