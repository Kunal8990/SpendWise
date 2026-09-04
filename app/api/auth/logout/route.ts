import { NextResponse } from "next/server";
import { authStore } from "@/lib/auth/user-store";

export async function POST(request: Request) {
  // Extract cookie or header
  const cookieHeader = request.headers.get("cookie") || "";
  const match = cookieHeader.match(/spendwise_session=([^;]+)/);
  const token = match ? match[1] : null;

  if (token) {
    authStore.revokeSession(token);
  }

  const response = NextResponse.json({
    success: true,
    message: "Logged out successfully."
  });

  // Clear cookie
  response.cookies.set("spendwise_session", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0
  });

  return response;
}
