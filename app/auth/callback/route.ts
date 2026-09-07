import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") ?? "/dashboard";
  const error = requestUrl.searchParams.get("error");
  const error_description = requestUrl.searchParams.get("error_description");

  if (error || error_description) {
    const errorMsg = error_description || error || "Authentication failed";
    return NextResponse.redirect(
      new URL(`/?error=${encodeURIComponent(errorMsg)}`, requestUrl.origin)
    );
  }

  if (code) {
    try {
      const supabase = await createClient();
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
      if (!exchangeError) {
        const forwardedHost = request.headers.get("x-forwarded-host");
        const isLocal = requestUrl.hostname === "localhost" || requestUrl.hostname === "127.0.0.1";

        if (isLocal) {
          return NextResponse.redirect(`${requestUrl.origin}${next}`);
        } else if (forwardedHost) {
          return NextResponse.redirect(`https://${forwardedHost}${next}`);
        } else {
          return NextResponse.redirect(`${requestUrl.origin}${next}`);
        }
      } else {
        return NextResponse.redirect(
          new URL(`/?error=${encodeURIComponent(exchangeError.message)}`, requestUrl.origin)
        );
      }
    } catch (err: any) {
      console.error("Auth callback error:", err);
      return NextResponse.redirect(
        new URL(`/?error=${encodeURIComponent(err?.message || "Session exchange error")}`, requestUrl.origin)
      );
    }
  }

  return NextResponse.redirect(new URL("/dashboard", requestUrl.origin));
}
