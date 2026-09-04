import { NextResponse } from "next/server";
import { authStore } from "@/lib/auth/user-store";

export async function POST(request: Request) {
  let body;
  try {
    body = await request.json();
  } catch (err) {
    return NextResponse.json({ error: "Malformed JSON payload." }, { status: 400 });
  }

  const { token } = body;
  if (!token || typeof token !== "string") {
    return NextResponse.json({ error: "Verification token is required." }, { status: 400 });
  }

  const result = authStore.verifyEmailToken(token);
  if (!result.valid || !result.user) {
    return NextResponse.json({ error: result.error || "Invalid verification token." }, { status: 400 });
  }

  return NextResponse.json({
    success: true,
    message: "Email verified successfully.",
    user: {
      id: result.user.id,
      email: result.user.email,
      username: result.user.username,
      email_verified: result.user.email_verified
    }
  });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Token is required." }, { status: 400 });
  }

  const result = authStore.verifyEmailToken(token);
  if (!result.valid) {
    return NextResponse.json({ error: result.error || "Invalid verification token." }, { status: 400 });
  }

  return NextResponse.json({
    success: true,
    message: "Email verified successfully."
  });
}
