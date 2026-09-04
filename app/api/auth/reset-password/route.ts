import { NextResponse } from "next/server";
import { checkPasswordStrength } from "@/lib/auth/security";
import { authStore } from "@/lib/auth/user-store";

export async function POST(request: Request) {
  let body;
  try {
    body = await request.json();
  } catch (err) {
    return NextResponse.json({ error: "Malformed JSON payload." }, { status: 400 });
  }

  const { token, newPassword, confirmPassword } = body;

  if (!token || typeof token !== "string") {
    return NextResponse.json({ error: "Reset token is required." }, { status: 400 });
  }

  // Password empty check (TC-081)
  if (!newPassword || typeof newPassword !== "string") {
    return NextResponse.json({ error: "New password is required." }, { status: 400 });
  }

  // Confirmation mismatch check (TC-084)
  if (confirmPassword !== undefined && newPassword !== confirmPassword) {
    return NextResponse.json({ error: "Passwords do not match." }, { status: 400 });
  }

  // Password strength check (TC-082, TC-083)
  const strength = checkPasswordStrength(newPassword);
  if (!strength.valid) {
    return NextResponse.json({
      error: strength.feedback[0] || "New password does not meet security requirements."
    }, { status: 400 });
  }

  // Verify and consume token (TC-079, TC-080, TC-088)
  const tokenResult = authStore.verifyAndConsumeResetToken(token);
  if (!tokenResult.valid || !tokenResult.userId) {
    return NextResponse.json({ error: tokenResult.error || "Invalid or expired reset token." }, { status: 400 });
  }

  // Update password & revoke sessions (TC-085, TC-089)
  const updated = authStore.updateUserPassword(tokenResult.userId, newPassword);
  if (!updated) {
    return NextResponse.json({ error: "Failed to update password." }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    message: "Password has been successfully reset. You can now log in with your new password."
  });
}
