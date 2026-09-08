import { NextResponse } from "next/server";
import { validateEmail, validateUsername, checkPasswordStrength } from "@/lib/auth/security";
import { authStore } from "@/lib/auth/user-store";

export async function POST(request: Request) {
  let body;
  try {
    body = await request.json();
  } catch (err) {
    return NextResponse.json({ error: "Malformed JSON payload." }, { status: 400 });
  }

  const {
    name,
    email,
    username,
    password,
    confirmPassword,
    termsAccepted,
    age
  } = body;

  // 1. Required field validations (TC-046, TC-047, TC-048, TC-049)
  if (!name || typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "Name is required." }, { status: 400 });
  }
  if (!email || typeof email !== "string" || !email.trim()) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }
  if (!username || typeof username !== "string" || !username.trim()) {
    return NextResponse.json({ error: "Username is required." }, { status: 400 });
  }
  if (!password || typeof password !== "string") {
    return NextResponse.json({ error: "Password is required." }, { status: 400 });
  }

  // 2. Terms acceptance check (TC-058)
  if (termsAccepted !== true) {
    return NextResponse.json({ error: "You must accept the terms and conditions to register." }, { status: 400 });
  }

  // 3. Password confirmation validation (TC-054, TC-055)
  if (confirmPassword !== undefined && password !== confirmPassword) {
    return NextResponse.json({ error: "Passwords do not match." }, { status: 400 });
  }

  // 4. Age validation if provided (TC-056)
  if (age !== undefined && age !== null && age !== "") {
    const ageNum = Number(age);
    if (isNaN(ageNum) || ageNum <= 0 || ageNum > 120) {
      return NextResponse.json({ error: "Please enter a valid age between 1 and 120." }, { status: 400 });
    }
  }

  // 5. Email validation & disposable email check (TC-037, TC-038, TC-044, TC-050)
  const emailRes = validateEmail(email);
  if (!emailRes.valid) {
    return NextResponse.json({ error: emailRes.error }, { status: 400 });
  }

  // 6. Username validation (TC-026 to TC-033)
  const usernameRes = validateUsername(username);
  if (!usernameRes.valid) {
    return NextResponse.json({ error: usernameRes.error }, { status: 400 });
  }

  // 7. Password strength validation (TC-053)
  const strength = checkPasswordStrength(password);
  if (!strength.valid) {
    return NextResponse.json({
      error: strength.feedback[0] || "Password does not meet the minimum security requirements."
    }, { status: 400 });
  }

  // 8. Check for existing username (TC-051)
  if (authStore.findUserByUsername(usernameRes.normalized)) {
    return NextResponse.json({ error: "Username is already taken. Please choose another." }, { status: 409 });
  }

  // 9. Check for existing email (Requirement 4 / TC-052)
  if (authStore.findUserByEmail(emailRes.normalized)) {
    return NextResponse.json({ error: "Email is already has been used please enter a new email" }, { status: 409 });
  }

  // Database level check in Supabase
  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();

    // Check if email already exists in Supabase
    const { data: existingEmailProfiles } = await supabase
      .from("user_profiles")
      .select("user_id, email")
      .ilike("email", emailRes.normalized)
      .limit(1);

    if (existingEmailProfiles && existingEmailProfiles.length > 0) {
      return NextResponse.json({ error: "Email is already has been used please enter a new email" }, { status: 409 });
    }

    const { data: existingUsersByEmail } = await supabase
      .from("users")
      .select("id")
      .ilike("email", emailRes.normalized)
      .limit(1);

    if (existingUsersByEmail && existingUsersByEmail.length > 0) {
      return NextResponse.json({ error: "Email is already has been used please enter a new email" }, { status: 409 });
    }

    // Check if username already exists in Supabase
    const { data: existingUnameProfiles } = await supabase
      .from("user_profiles")
      .select("user_id, username")
      .ilike("username", usernameRes.normalized)
      .limit(1);

    if (existingUnameProfiles && existingUnameProfiles.length > 0) {
      return NextResponse.json({ error: "Username is already taken. Please choose another." }, { status: 409 });
    }

    const { data: existingUsersByUname } = await supabase
      .from("users")
      .select("id")
      .ilike("username", usernameRes.normalized)
      .limit(1);

    if (existingUsersByUname && existingUsersByUname.length > 0) {
      return NextResponse.json({ error: "Username is already taken. Please choose another." }, { status: 409 });
    }
  } catch (dbErr) {
    // If Supabase is offline, continue with store
  }

  // 10. Create user in store
  const creation = authStore.createUser({
    name: name.trim(),
    email: emailRes.normalized,
    username: usernameRes.normalized,
    password
  });

  if (!creation.success || !creation.user) {
    return NextResponse.json({ error: creation.error || "Failed to create account." }, { status: 500 });
  }

  // 11. Create user in Supabase DB if accessible
  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    
    // Insert into public.users if table exists
    const { data: insertedUser } = await supabase
      .from("users")
      .insert({
        username: usernameRes.normalized,
        email: emailRes.normalized,
        status: "active",
        email_verified: false
      })
      .select("id")
      .single();

    const dbUserId = insertedUser?.id;

    if (dbUserId) {
      await supabase.from("user_profiles").insert({
        user_id: dbUserId,
        name: name.trim(),
        email: emailRes.normalized,
        username: usernameRes.normalized,
        age: age ? Number(age) : null
      });
    }
  } catch (dbInsertErr) {
    // Graceful fallback
  }

  // 12. Create active session and verification token
  const { token: verificationToken } = authStore.createEmailVerificationToken(creation.user.id);
  const { token: sessionToken } = authStore.createSession(creation.user.id, 24);

  const response = NextResponse.json({
    success: true,
    message: "Account created successfully.",
    user: {
      id: creation.user.id,
      username: creation.user.username,
      email: creation.user.email,
      name: creation.user.name,
      email_verified: creation.user.email_verified
    },
    verificationToken
  }, { status: 201 });

  // Set session cookie
  response.cookies.set("spendwise_session", sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 24 * 3600
  });

  return response;
}
