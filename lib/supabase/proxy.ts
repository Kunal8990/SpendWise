import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const DEFAULT_SUPABASE_URL = "https://aqclqqphhxvloinkgfgz.supabase.co";
const DEFAULT_SUPABASE_KEY = "sb_publishable_AOIff5SRRiBBvD5ieSnLKw_qAsVmINl";

export async function updateSession(request: NextRequest) {
  const isProduction = process.env.NODE_ENV === "production";
  const proto = request.headers.get("x-forwarded-proto");

  // Force HTTPS in production if requested over HTTP
  if (isProduction && proto === "http") {
    const host = request.headers.get("host") || request.nextUrl.host;
    return NextResponse.redirect(`https://${host}${request.nextUrl.pathname}${request.nextUrl.search}`, {
      status: 301
    });
  }

  let response = NextResponse.next({ request });

  // Apply Industry Standard Security Headers
  response.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  response.headers.set("X-XSS-Protection", "1; mode=block");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_KEY;

  try {
    const supabase = createServerClient(
      supabaseUrl,
      supabaseKey,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
            response = NextResponse.next({ request });
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            );
            // Re-apply security headers to new response object
            response.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
            response.headers.set("X-Content-Type-Options", "nosniff");
            response.headers.set("X-Frame-Options", "DENY");
            response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
            response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
            response.headers.set("X-XSS-Protection", "1; mode=block");
          }
        }
      }
    );

    await supabase.auth.getUser();
  } catch (e) {
    // Ignore and proceed
  }

  return response;
}
