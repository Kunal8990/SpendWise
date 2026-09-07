import Dashboard from "@/components/Dashboard";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  let userEmail: string | undefined = undefined;

  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    userEmail = data?.user?.email ?? undefined;
  } catch (err) {
    // If Supabase is unreachable or unconfigured, fall back gracefully
  }

  return <Dashboard userEmail={userEmail} />;
}

