import { Settings, CreditCard, ChevronRight, Shield, Download, Trash2, ExternalLink, Receipt, User, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { PrivacyActions } from "./privacy-actions";
import { NotificationPreferences } from "@/components/settings/NotificationPreferences";

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
      <Link
        href="/settings/profile"
        className="block bg-white rounded-xl border border-slate-200 p-6 hover:border-slate-300 hover:shadow-sm transition-all group"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center group-hover:bg-slate-200 transition-colors">
              <User className="w-6 h-6 text-slate-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900 group-hover:text-slate-700 transition-colors">
                Profile Settings
              </h2>
              <p className="text-sm text-slate-500">
                {user.user_metadata?.full_name || user.email}
              </p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-600 transition-colors" />
        </div>
      </Link>

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

      {/* Invoice Settings Section */}
      <Link
        href="/settings/invoices"
        className="block bg-white rounded-xl border border-slate-200 p-6 hover:border-[#529ec6]/20 hover:shadow-sm transition-all group"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[#529ec6]/10 rounded-lg flex items-center justify-center group-hover:bg-[#529ec6]/20 transition-colors">
              <Receipt className="w-6 h-6 text-[#529ec6]" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900 group-hover:text-[#529ec6] transition-colors">
                Invoice Settings
              </h2>
              <p className="text-sm text-slate-500">
                Configure invoice numbering, branding, and default terms
              </p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-[#529ec6] transition-colors" />
        </div>
      </Link>

      {/* Billing & Subscription Section */}
      <Link
        href="/settings/billing"
        className="block bg-white rounded-xl border border-slate-200 p-6 hover:border-emerald-200 hover:shadow-sm transition-all group"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center group-hover:bg-emerald-200 transition-colors">
              <Sparkles className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900 group-hover:text-emerald-600 transition-colors">
                Billing & Subscription
              </h2>
              <p className="text-sm text-slate-500">
                Manage your plan, view usage, and upgrade
              </p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-emerald-600 transition-colors" />
        </div>
      </Link>

      {/* Privacy & Data Section */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Shield className="w-5 h-5 text-[#529ec6]" />
          <h2 className="text-lg font-semibold text-slate-900">Privacy & Data</h2>
        </div>

        <div className="space-y-4">
          {/* Privacy Policy Link */}
          <Link
            href="/privacy"
            className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors group"
          >
            <div>
              <p className="font-medium text-slate-900">Privacy Policy</p>
              <p className="text-sm text-slate-500">Learn how we handle your data</p>
            </div>
            <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />
          </Link>

          {/* Data Export */}
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
            <div>
              <p className="font-medium text-slate-900">Download Your Data</p>
              <p className="text-sm text-slate-500">Export all your data as JSON (GDPR compliant)</p>
            </div>
            <PrivacyActions action="export" userEmail={user.email || ""} />
          </div>

          {/* Delete Account */}
          <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-100">
            <div>
              <p className="font-medium text-red-900">Delete Account</p>
              <p className="text-sm text-red-600">Permanently delete your account and all data</p>
            </div>
            <PrivacyActions action="delete" userEmail={user.email || ""} />
          </div>
        </div>
      </div>

      {/* Notification Preferences Section */}
      <NotificationPreferences />
    </div>
  );
}

