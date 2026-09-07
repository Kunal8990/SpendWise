import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") ?? "/dashboard";
  const error_description = requestUrl.searchParams.get("error_description");

  if (error_description) {
    return NextResponse.redirect(
      new URL(`/?error=${encodeURIComponent(error_description)}`, requestUrl.origin)
    );
  }

  if (code) {
    try {
      const supabase = await createClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        const forwardedHost = request.headers.get("x-forwarded-host");
        const isLocalEnv = process.env.NODE_ENV === "development";

        if (isLocalEnv) {
          return NextResponse.redirect(`${requestUrl.origin}${next}`);
        } else if (forwardedHost) {
          return NextResponse.redirect(`https://${forwardedHost}${next}`);
        } else {
          return NextResponse.redirect(`${requestUrl.origin}${next}`);
        }
      }
    } catch (err) {
      console.error("Auth callback error:", err);
    }
  }

  // Fallback if code exchange failed
  return NextResponse.redirect(new URL("/dashboard", requestUrl.origin));
}
