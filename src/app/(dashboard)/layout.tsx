import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardNav } from "./dashboard-nav";
import { KeyboardShortcutsProvider } from "@/components/keyboard-shortcuts-provider";
import { DashboardOnboarding } from "@/components/onboarding";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <DashboardNav
        user={{
          name: user.user_metadata?.full_name || user.email?.split("@")[0],
          email: user.email,
          image: user.user_metadata?.avatar_url,
        }}
      />
      <main className="ml-64 min-h-screen">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8">
          <KeyboardShortcutsProvider>{children}</KeyboardShortcutsProvider>
        </div>
      </main>
      <DashboardOnboarding />
    </div>
  );
}
