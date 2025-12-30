import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardNav } from "./dashboard-nav";
import { KeyboardShortcutsProvider } from "@/components/keyboard-shortcuts-provider";
import { DashboardOnboarding } from "@/components/onboarding";
import { DashboardHeader } from "@/components/dashboard-header";

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
      {/* Main content: pt-16 on mobile for fixed header, lg:ml-64 for sidebar */}
      <main className="min-h-screen pt-16 lg:pt-0 lg:ml-64">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
          <DashboardHeader />
          <KeyboardShortcutsProvider>{children}</KeyboardShortcutsProvider>
        </div>
      </main>
      <DashboardOnboarding />
    </div>
  );
}
