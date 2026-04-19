import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { createClient as createAdminSupabase } from "@supabase/supabase-js";

function createAdminClient() {
  return createAdminSupabase(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

const publicRoutes = [
  "/",
  "/setup",
  "/faqs",
  "/about",
  "/contact",
  "/login",
  "/register",
  "/verify",
  "/complete-profile",
  "/reset-password",
  "/terminos-y-condiciones",
  "/politica-de-privacidad",
  "/orden",
  "/api/contact",
  "/api/dealership",
  "/api/auth/callback",
  "/api/auth/signout",
  "/api/webhooks/stripe",
  "/api/repair-order",
  "/api/public",
];

function isPublicRoute(pathname: string): boolean {
  return publicRoutes.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip Supabase when not configured (allows viewing frontend without backend)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl || !supabaseUrl.startsWith("http")) {
    if (isPublicRoute(pathname)) {
      return NextResponse.next();
    }
    // Redirect protected routes to login when Supabase is not configured
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Allow public routes
  if (isPublicRoute(pathname)) {
    const { supabaseResponse } = await updateSession(request);
    return supabaseResponse;
  }

  // Only apply auth protection to known route prefixes — let everything else
  // fall through so Next.js can render the 404 page naturally.
  const isProtectedPrefix =
    pathname.startsWith("/client") ||
    pathname.startsWith("/dealer") ||
    pathname.startsWith("/admin");

  if (!isProtectedPrefix) {
    const { supabaseResponse } = await updateSession(request);
    return supabaseResponse;
  }

  // Protected routes - check auth
  const { user, supabaseResponse, supabase } = await updateSession(request);

  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Block access if 2FA code has not been verified yet (only enforced in production)
  if (process.env.NODE_ENV === "production" && request.cookies.get("pending_2fa")?.value === "1") {
    const url = request.nextUrl.clone();
    url.pathname = "/verify";
    return NextResponse.redirect(url);
  }

  // Get user role — first from DB, fallback to JWT metadata
  const { data: userData } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  const role = userData?.role || (user.user_metadata?.role as string | undefined);

  // Role-based route protection
  if (pathname.startsWith("/client") && role !== "client") {
    const url = request.nextUrl.clone();
    url.pathname = role === "dealer" ? "/dealer/citas" : "/admin";
    return NextResponse.redirect(url);
  }

  if (pathname.startsWith("/dealer") && role !== "dealer") {
    const url = request.nextUrl.clone();
    url.pathname = role === "client" ? "/client/appointments" : "/admin";
    return NextResponse.redirect(url);
  }

  // Subscription gate for dealer routes (except pagos and perfil root)
  const pagosAllowed = ["/dealer/perfil/pagos", "/dealer/perfil"];
  if (
    role === "dealer" &&
    pathname.startsWith("/dealer") &&
    !pagosAllowed.some((p) => pathname === p || pathname.startsWith(p + "/"))
  ) {
    const admin = createAdminClient();
    const { data: dealer } = await admin
      .from("dealerships")
      .select("subscription_status, subscription_period_end")
      .eq("user_id", user.id)
      .single();

    const status = dealer?.subscription_status;
    const periodEnd = dealer?.subscription_period_end
      ? new Date(dealer.subscription_period_end)
      : null;

    const hasAccess =
      status === "active" ||
      (status === "canceling" && periodEnd && periodEnd > new Date());

    if (!hasAccess) {
      const url = request.nextUrl.clone();
      url.pathname = "/dealer/perfil/pagos";
      return NextResponse.redirect(url);
    }
  }

  if (pathname.startsWith("/admin") && role !== "admin") {
    const url = request.nextUrl.clone();
    url.pathname = role === "client" ? "/client/appointments" : "/dealer/citas";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
