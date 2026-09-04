import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      name,
      age,
      dob,
      gender,
      occupation,
      userType,
      income,
      goal,
      currentSpend,
      monthlyInvestment,
      username,
      email
    } = body;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // If authenticated with Supabase, persist into user_profiles
    if (user) {
      const profileData: Record<string, any> = {
        id: user.id,
        updated_at: new Date().toISOString()
      };

      if (email || user.email) profileData.email = email || user.email;
      if (username) profileData.username = username;
      if (name) profileData.name = name;
      if (age) profileData.age = Number(age);
      if (dob) profileData.dob = dob;
      if (gender) profileData.gender = gender;
      if (occupation) profileData.occupation = occupation;
      if (userType) {
        profileData.user_type = userType;
        profileData.financial_type = userType === "Student" ? "student" : "earning";
      }
      if (income) {
        const numIncome = Number(income);
        if (userType === "Student") {
          profileData.monthly_pocket_money = numIncome;
        } else {
          profileData.monthly_income = numIncome;
        }
      }
      if (goal) profileData.goal = goal;
      if (currentSpend) profileData.current_spend = Number(currentSpend);
      if (monthlyInvestment) profileData.monthly_investment = Number(monthlyInvestment);

      await supabase.from("user_profiles").upsert(profileData);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message }, { status: 500 });
  }
}
