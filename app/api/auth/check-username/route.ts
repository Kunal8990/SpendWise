import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, validateUsername } from "@/lib/auth/security";
import { authStore } from "@/lib/auth/user-store";

export async function GET(request: Request) {
  const ip = request.headers.get("x-forwarded-for") || "127.0.0.1";

  // Rate limiting (TC-035, TC-127)
  const rateLimit = checkRateLimit("usernameCheck", ip, { windowMs: 60 * 1000, maxRequests: 30 });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { available: false, message: "Too many username checks. Please wait a moment." },
      { status: 429 }
    );
  }

  const { searchParams } = new URL(request.url);
  const rawUsername = searchParams.get("username") || "";

  if (!rawUsername.trim()) {
    return NextResponse.json(
      { available: false, message: "Username is required." },
      { status: 400 }
    );
  }

  const validation = validateUsername(rawUsername);
  if (!validation.valid) {
    return NextResponse.json(
      { available: false, message: validation.error },
      { status: 200 }
    );
  }

  const username = validation.normalized;

  // Check local auth store
  if (authStore.findUserByUsername(username)) {
    return NextResponse.json({
      available: false,
      message: "Username is already taken."
    });
  }

  try {
    const supabase = await createClient();

    // 1. RPC function
    const { data: rpcAvailable, error: rpcError } = await supabase.rpc(
      "check_username_available",
      { requested_username: username }
    );

    if (!rpcError && typeof rpcAvailable === "boolean") {
      return NextResponse.json({
        available: rpcAvailable,
        message: rpcAvailable ? "Username is available." : "Username is already taken."
      });
    }

    // 2. Fallback query
    const { data: profiles, error: queryError } = await supabase
      .from("user_profiles")
      .select("user_id, username")
      .ilike("username", username)
      .limit(1);

    if (!queryError && profiles && profiles.length > 0) {
      return NextResponse.json({
        available: false,
        message: "Username is already taken. Please choose another."
      });
    }

    const { data: users, error: usersError } = await supabase
      .from("users")
      .select("id, username")
      .ilike("username", username)
      .limit(1);

    if (!usersError && users && users.length > 0) {
      return NextResponse.json({
        available: false,
        message: "Username is already taken. Please choose another."
      });
    }

    return NextResponse.json({
      available: true,
      message: "Username is available."
    });
  } catch (err) {
    return NextResponse.json({
      available: true,
      message: "Username is available."
    });
  }
}
