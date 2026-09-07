import { NextResponse } from "next/server";
import { validateEmail, checkRateLimit } from "@/lib/auth/security";
import { authStore } from "@/lib/auth/user-store";
import { sendPasswordResetEmail } from "@/lib/auth/email";

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for") || "127.0.0.1";

  // Rate limiting for forgot password requests (TC-074, TC-126)
  const rateLimit = checkRateLimit("forgotPassword", ip, { windowMs: 15 * 60 * 1000, maxRequests: 5 });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many password reset requests. Please try again later." },
      { status: 429 }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch (err) {
    return NextResponse.json({ error: "Malformed JSON payload." }, { status: 400 });
  }

  const { email } = body;

  // Empty email validation (TC-068)
  if (!email || typeof email !== "string" || !email.trim()) {
    return NextResponse.json({ error: "Please enter your email address." }, { status: 400 });
  }

  // Format validation (TC-067)
  const emailRes = validateEmail(email);
  if (!emailRes.valid) {
    return NextResponse.json({ error: emailRes.error }, { status: 400 });
  }

  // Look up user
  const user = authStore.findUserByEmail(emailRes.normalized);

  // If user exists, create secure reset token and send branded email (TC-065, TC-069)
  let resetToken = undefined;
  if (user) {
    const tokenInfo = authStore.createPasswordResetToken(user.id);
    resetToken = tokenInfo.token;

    const origin = request.headers.get("origin") || request.headers.get("host") || "https://spendwise.app";
    const baseUrl = origin.startsWith("http") ? origin : `https://${origin}`;

    sendPasswordResetEmail({
      email: user.email,
      name: user.name,
      resetToken,
      baseUrl
    });
  }

  // Uniform response preventing account enumeration (TC-066, TC-075)
  return NextResponse.json({
    success: true,
    message: "If an account exists with this email, password reset instructions have been sent.",
    // In testing/dev environment we can expose resetToken if user exists for end-to-end automation
    ...(process.env.NODE_ENV !== "production" && resetToken ? { resetToken } : {})
  });
}
