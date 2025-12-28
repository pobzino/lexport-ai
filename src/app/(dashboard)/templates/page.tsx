import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { TemplateLibrary } from "@/components/templates/TemplateLibrary";

export const metadata = {
  title: "Templates | Lexport",
  description: "Browse and manage your contract templates",
};

export default async function TemplatesPage() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/login");
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Templates</h1>
          <p className="text-slate-500 mt-1">
            Save and reuse your favorite contract formats. Start new contracts faster.
          </p>
        </div>
        <Link
          href="/templates/generate"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-violet-600 rounded-lg hover:bg-violet-700 transition-colors"
        >
          <Sparkles className="w-4 h-4" />
          Generate with AI
        </Link>
      </div>

      {/* Template Library */}
      <TemplateLibrary userId={user.id} showCreateButton={true} />
    </div>
  );
}
