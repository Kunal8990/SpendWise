import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, validateEmail } from "@/lib/auth/security";
import { authStore } from "@/lib/auth/user-store";

export async function GET(request: Request) {
  const ip = request.headers.get("x-forwarded-for") || "127.0.0.1";

  const rateLimit = checkRateLimit("apiGeneral", ip, { windowMs: 60 * 1000, maxRequests: 30 });
  if (!rateLimit.allowed) {
    return NextResponse.json({ exists: false, message: "Too many requests." }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const rawEmail = searchParams.get("email") || "";

  if (!rawEmail.trim()) {
    return NextResponse.json(
      { exists: false, message: "Email address is required." },
      { status: 400 }
    );
  }

  const validation = validateEmail(rawEmail);
  if (!validation.valid) {
    return NextResponse.json(
      { exists: false, message: validation.error },
      { status: 400 }
    );
  }

  const email = validation.normalized;

  if (authStore.findUserByEmail(email)) {
    return NextResponse.json({ exists: true });
  }

  try {
    const supabase = await createClient();

    // 1. Try checking via RPC function
    const { data: rpcExists, error: rpcErr } = await supabase.rpc(
      "check_email_exists",
      { lookup_email: email }
    );

    if (!rpcErr && typeof rpcExists === "boolean") {
      return NextResponse.json({ exists: rpcExists });
    }

    // 2. Query user_profiles and users tables as fallback
    const { data: profiles, error: queryErr } = await supabase
      .from("user_profiles")
      .select("user_id, email")
      .ilike("email", email)
      .limit(1);

    if (!queryErr && profiles && profiles.length > 0) {
      return NextResponse.json({ exists: true, message: "Email is already has been used please enter a new email" });
    }

    const { data: users, error: usersErr } = await supabase
      .from("users")
      .select("id, email")
      .ilike("email", email)
      .limit(1);

    if (!usersErr && users && users.length > 0) {
      return NextResponse.json({ exists: true, message: "Email is already has been used please enter a new email" });
    }

    return NextResponse.json({ exists: false });
  } catch (err) {
    return NextResponse.json({ exists: false });
  }
}
