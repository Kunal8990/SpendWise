import Dashboard from "@/components/Dashboard";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  let userEmail: string | undefined = undefined;
  let userName: string | undefined = undefined;

  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (data?.user) {
      userEmail = data.user.email ?? undefined;
      userName =
        data.user.user_metadata?.full_name ||
        data.user.user_metadata?.name ||
        data.user.user_metadata?.user_name ||
        data.user.user_metadata?.username ||
        data.user.email?.split("@")[0];
    }
  } catch (err) {
    // If Supabase is unreachable or unconfigured, fall back gracefully
  }

  return <Dashboard userEmail={userEmail} userName={userName} />;
}
