import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// This runs on every request. Two jobs:
// 1. Keep the Supabase session cookie fresh (required by @supabase/ssr).
// 2. Gate every /admin/* route server-side: you must be signed in, your
//    profiles.role must be 'admin', AND your session must be at AAL2
//    (i.e. you've completed the TOTP challenge this session). None of this
//    can be spoofed from the browser — it's re-checked on every request.
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isAdminArea = path.startsWith("/admin") && path !== "/admin/login" && path !== "/admin/setup-mfa";

  if (isAdminArea) {
    if (!user) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }

    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal?.currentLevel !== "aal2") {
      // Admin, but hasn't completed the 2FA challenge this session.
      return NextResponse.redirect(new URL("/admin/login?mfa=required", request.url));
    }
  }

  // Dashboard, Upload and Notes require any signed-in user.
  const requiresUser = ["/dashboard", "/upload", "/notes"].some((p) => path.startsWith(p));
  if (requiresUser && !user) {
    return NextResponse.redirect(new URL(`/login?next=${path}`, request.url));
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/dashboard/:path*", "/upload/:path*", "/notes/:path*"],
};
