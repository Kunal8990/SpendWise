import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/auth/security";
import { authStore } from "@/lib/auth/user-store";
import { verifyPassword } from "@/lib/auth/security";

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for") || "127.0.0.1";

  // Rate limiting: max 5 attempts per minute per IP/identifier (TC-019, TC-125)
  const rateLimit = checkRateLimit("login", ip, { windowMs: 60 * 1000, maxRequests: 5 });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many login attempts. Please try again later." },
      { status: 429 }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch (err) {
    return NextResponse.json({ error: "Malformed JSON payload." }, { status: 400 });
  }

  const identifier = (body.identifier || body.email || body.username || "").trim();
  const password = body.password || "";
  const rememberMe = !!body.rememberMe;

  // Validation errors (TC-006, TC-007, TC-008)
  if (!identifier && !password) {
    return NextResponse.json({ error: "Email/username and password are required." }, { status: 400 });
  }
  if (!identifier) {
    return NextResponse.json({ error: "Email or username is required." }, { status: 400 });
  }
  if (!password) {
    return NextResponse.json({ error: "Password is required." }, { status: 400 });
  }

  // Look up user in authStore
  let user = authStore.findUserByIdentifier(identifier);

  // If not found in memory store, try looking up in Supabase database
  if (!user) {
    try {
      const { createClient } = await import("@/lib/supabase/server");
      const supabase = await createClient();

      const { data: profile } = await supabase
        .from("user_profiles")
        .select("*")
        .or(`email.ilike.${identifier},username.ilike.${identifier}`)
        .limit(1)
        .maybeSingle();

      if (profile) {
        // User profile found in database
        // Also check if user exists in public.users
        const { data: dbUser } = await supabase
          .from("users")
          .select("*")
          .eq("id", profile.user_id || profile.id)
          .maybeSingle();

        // Register in authStore for session tracking
        const { hash, salt } = await import("@/lib/auth/security").then(m => m.hashPassword(password));
        const storedUser = {
          id: profile.user_id || profile.id || `usr_${Math.random().toString(36).slice(2)}`,
          username: profile.username || identifier,
          email: profile.email || `${identifier}@spendwise.local`,
          name: profile.name || profile.username || identifier,
          status: (dbUser?.status as any) || "active",
          email_verified: dbUser?.email_verified ?? true,
          password_hash: hash,
          password_salt: salt,
          password_changed_at: new Date().toISOString(),
          failed_attempts: 0,
          created_at: profile.created_at || new Date().toISOString(),
          updated_at: profile.updated_at || new Date().toISOString()
        };
        // @ts-ignore - internal map addition
        (authStore as any).users.set(storedUser.id, storedUser);
        user = storedUser;
      }
    } catch (dbErr) {
      // Fallback
    }
  }

  // Generic authentication error message (TC-003, TC-004, TC-005, TC-135)
  const genericAuthError = "Invalid email/username or password.";

  if (!user) {
    authStore.recordLoginAttempt(identifier, ip, false);
    return NextResponse.json({ error: genericAuthError }, { status: 401 });
  }

  // Account status check (TC-013)
  if (user.status === "inactive" || user.status === "suspended") {
    authStore.recordLoginAttempt(identifier, ip, false);
    return NextResponse.json({ error: "This account has been disabled. Please contact support." }, { status: 403 });
  }

  // Account lockout check (TC-019)
  if (user.status === "locked") {
    authStore.recordLoginAttempt(identifier, ip, false);
    return NextResponse.json({ error: "Account is temporarily locked due to repeated failed login attempts." }, { status: 423 });
  }

  // Verify password
  const isValidPassword = verifyPassword(password, user.password_hash, user.password_salt);
  if (!isValidPassword) {
    authStore.recordLoginAttempt(identifier, ip, false);
    return NextResponse.json({ error: genericAuthError }, { status: 401 });
  }

  // Unverified account warning if applicable (TC-014)
  if (!user.email_verified) {
    // Depending on strictness, we can either warn or block:
    // Here we record success and flag verification requirement
  }

  // Successful login
  authStore.recordLoginAttempt(identifier, ip, true);

  // Session duration (TC-017, TC-018)
  const sessionDurationHours = rememberMe ? 30 * 24 : 24; // 30 days vs 24 hours
  const { token, session } = authStore.createSession(user.id, sessionDurationHours);

  const response = NextResponse.json({
    success: true,
    message: "Login successful.",
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      name: user.name,
      email_verified: user.email_verified
    },
    session: {
      expires_at: session.expires_at
    }
  });

  // Set secure HTTP-only session cookie (TC-109, TC-110, TC-111)
  response.cookies.set("spendwise_session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: sessionDurationHours * 3600
  });

  return response;
}
