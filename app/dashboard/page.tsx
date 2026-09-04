import { redirect } from "next/navigation";
import Dashboard from "@/components/Dashboard";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return <Dashboard userEmail={user?.email ?? undefined} />;
}
