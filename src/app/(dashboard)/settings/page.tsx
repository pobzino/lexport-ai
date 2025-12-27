import { Settings, CreditCard, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-500 mt-1">
          Manage your account and preferences
        </p>
      </div>

      {/* Profile Section */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Profile</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Email
            </label>
            <p className="text-slate-900">{user.email}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Name
            </label>
            <p className="text-slate-900">
              {user.user_metadata?.full_name || "Not set"}
            </p>
          </div>
        </div>
      </div>

      {/* Payment Settings Section */}
      <Link
        href="/settings/payments"
        className="block bg-white rounded-xl border border-slate-200 p-6 hover:border-brand-200 hover:shadow-sm transition-all group"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-brand-100 rounded-lg flex items-center justify-center group-hover:bg-brand-200 transition-colors">
              <CreditCard className="w-6 h-6 text-brand-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900 group-hover:text-brand-600 transition-colors">
                Payment Settings
              </h2>
              <p className="text-sm text-slate-500">
                Connect your bank account to receive payments from contracts
              </p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-brand-600 transition-colors" />
        </div>
      </Link>

      {/* Preferences Section */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Preferences</h2>
        <div className="text-center py-8">
          <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Settings className="w-6 h-6 text-slate-400" />
          </div>
          <p className="text-slate-500">
            Additional settings coming soon
          </p>
        </div>
      </div>
    </div>
  );
}
