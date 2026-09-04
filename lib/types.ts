export type Expense = {
  id: string;
  title: string;
  category: string;
  amount: number;
  date: string;
  payment_method: string;
  is_recurring?: boolean;
};

export type MonthlySummary = {
  income: number;
  expenses: number;
  invested: number;
  saved: number;
};

export type EMI = {
  id: string;
  title: string;
  principal: number;
  tenureMonths: number;
  monthlyAmount: number;
  deductionDate: number; // 1-31
  startDate: string; // YYYY-MM-DD
};

export type UserProfile = {
  id: string;
  user_id?: string;
  email?: string;
  username: string;
  name?: string;
  age?: number;
  dob?: string;
  gender?: string;
  city?: string;
  occupation?: string;
  profile_photo?: string;
  financial_type?: "student" | "earning" | "both";
  user_type?: string;
  goal?: string;
  monthly_income?: number;
  monthly_pocket_money?: number;
  current_spend?: number;
  monthly_investment?: number;
  created_at?: string;
  updated_at?: string;
};

export type User = {
  id: string;
  username: string;
  email: string;
  status: "active" | "inactive" | "suspended" | "locked";
  email_verified: boolean;
  created_at: string;
  updated_at: string;
};

export type UserCredentials = {
  user_id: string;
  password_hash: string;
  password_changed_at: string;
  failed_attempts: number;
};

export type OAuthAccount = {
  id: string;
  user_id: string;
  provider: string;
  provider_user_id: string;
  created_at: string;
};

export type EmailVerification = {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: string;
  verified_at?: string | null;
  created_at: string;
};

export type PasswordResetToken = {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: string;
  used_at?: string | null;
  created_at: string;
};

export type Session = {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: string;
  created_at: string;
};

export type LoginAttempt = {
  id: string;
  user_id?: string | null;
  ip_address?: string | null;
  attempted_at: string;
  success: boolean;
};

