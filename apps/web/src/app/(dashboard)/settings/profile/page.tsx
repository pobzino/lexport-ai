"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  ArrowLeft,
  Loader2,
  Save,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

const ROLE_OPTIONS = [
  { value: "founder", label: "Startup Founder" },
  { value: "freelancer", label: "Freelancer" },
  { value: "consultant", label: "Consultant" },
  { value: "other", label: "Other" },
];

const JURISDICTION_OPTIONS = [
  { value: "us_california", label: "California, USA" },
  { value: "us_texas", label: "Texas, USA" },
  { value: "us_new_york", label: "New York, USA" },
  { value: "us_delaware", label: "Delaware, USA" },
  { value: "us_other", label: "Other US State" },
  { value: "uk", label: "United Kingdom" },
  { value: "other", label: "Other" },
];

interface ProfileData {
  name: string;
  email: string;
  phone: string;
  role: string;
  jurisdiction: string;
  image: string;
  // New autofill fields
  company_name: string;
  job_title: string;
  address: string;
  default_jurisdiction: string;
}

export default function ProfileSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileData>({
    name: "",
    email: "",
    phone: "",
    role: "",
    jurisdiction: "",
    image: "",
    company_name: "",
    job_title: "",
    address: "",
    default_jurisdiction: "",
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const supabase = createClient();
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        router.push("/login");
        return;
      }

      // Fetch from users table
      const { data: userData } = await supabase
        .from("users")
        .select("name, email, phone, role, jurisdiction, image, company_name, job_title, address, default_jurisdiction")
        .eq("id", user.id)
        .single();

      if (userData) {
        setProfile({
          name: userData.name || user.user_metadata?.full_name || "",
          email: userData.email || user.email || "",
          phone: userData.phone || "",
          role: userData.role || "",
          jurisdiction: userData.jurisdiction || "",
          image: userData.image || user.user_metadata?.avatar_url || "",
          company_name: userData.company_name || "",
          job_title: userData.job_title || "",
          address: userData.address || "",
          default_jurisdiction: userData.default_jurisdiction || "us_california",
        });
      } else {
        // Use auth user data as fallback
        setProfile({
          name: user.user_metadata?.full_name || "",
          email: user.email || "",
          phone: "",
          role: "",
          jurisdiction: "",
          image: user.user_metadata?.avatar_url || "",
          company_name: "",
          job_title: "",
          address: "",
          default_jurisdiction: "us_california",
        });
      }
    } catch (err) {
      console.error("Error fetching profile:", err);
      setError("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError("Not authenticated");
        return;
      }

      // Update users table
      const { error: updateError } = await supabase
        .from("users")
        .update({
          name: profile.name,
          phone: profile.phone,
          role: profile.role || null,
          jurisdiction: profile.jurisdiction || null,
          company_name: profile.company_name || null,
          job_title: profile.job_title || null,
          address: profile.address || null,
          default_jurisdiction: profile.default_jurisdiction || "us_california",
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (updateError) {
        throw updateError;
      }

      // Also update auth metadata
      await supabase.auth.updateUser({
        data: { full_name: profile.name },
      });

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error("Error saving profile:", err);
      setError("Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link
            href="/settings"
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Profile Settings
            </h1>
            <p className="text-slate-500 mt-1">
              Manage your personal information
            </p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-12 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/settings"
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Profile Settings
            </h1>
            <p className="text-slate-500 mt-1">
              Manage your personal information
            </p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-green-600" />
          <p className="text-green-800">Profile saved successfully!</p>
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Profile Picture */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">
          Profile Picture
        </h2>
        <div className="flex items-center gap-6">
          {profile.image ? (
            <img
              src={profile.image}
              alt={profile.name || "Profile"}
              className="w-20 h-20 rounded-full object-cover"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center">
              <User className="w-10 h-10 text-slate-400" />
            </div>
          )}
          <div>
            <p className="text-sm text-slate-600">
              Your profile picture is managed through your Google account.
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Sign in with a different Google account to change your picture.
            </p>
          </div>
        </div>
      </div>

      {/* Personal Information */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-6">
          Personal Information
        </h2>
        <div className="space-y-6">
          {/* Name */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
              <User className="w-4 h-4 text-slate-400" />
              Full Name
            </label>
            <input
              type="text"
              value={profile.name}
              onChange={(e) =>
                setProfile({ ...profile, name: e.target.value })
              }
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              placeholder="Enter your full name"
            />
          </div>

          {/* Email - Read Only */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
              <Mail className="w-4 h-4 text-slate-400" />
              Email Address
            </label>
            <input
              type="email"
              value={profile.email}
              disabled
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-600 cursor-not-allowed"
            />
            <p className="text-xs text-slate-400 mt-1">
              Email is managed through your login provider and cannot be changed
              here.
            </p>
          </div>

          {/* Phone */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
              <Phone className="w-4 h-4 text-slate-400" />
              Phone Number
              <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <input
              type="tel"
              value={profile.phone}
              onChange={(e) =>
                setProfile({ ...profile, phone: e.target.value })
              }
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              placeholder="+1 (555) 000-0000"
            />
          </div>
        </div>
      </div>

      {/* Business Information */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-6">
          Business Information
        </h2>
        <div className="space-y-6">
          {/* Company Name */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
              <Briefcase className="w-4 h-4 text-slate-400" />
              Company Name
              <span className="text-slate-400 font-normal">(for contract autofill)</span>
            </label>
            <input
              type="text"
              value={profile.company_name}
              onChange={(e) =>
                setProfile({ ...profile, company_name: e.target.value })
              }
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              placeholder="Acme Inc."
            />
          </div>

          {/* Job Title */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
              <Briefcase className="w-4 h-4 text-slate-400" />
              Job Title
              <span className="text-slate-400 font-normal">(for contract autofill)</span>
            </label>
            <input
              type="text"
              value={profile.job_title}
              onChange={(e) =>
                setProfile({ ...profile, job_title: e.target.value })
              }
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              placeholder="CEO, Founder, etc."
            />
          </div>

          {/* Address */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
              <MapPin className="w-4 h-4 text-slate-400" />
              Business Address
              <span className="text-slate-400 font-normal">(for contract autofill)</span>
            </label>
            <textarea
              value={profile.address}
              onChange={(e) =>
                setProfile({ ...profile, address: e.target.value })
              }
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none"
              placeholder="123 Main Street, Suite 100&#10;San Francisco, CA 94102"
              rows={2}
            />
          </div>

          {/* Role */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
              <Briefcase className="w-4 h-4 text-slate-400" />
              I am a...
            </label>
            <select
              value={profile.role}
              onChange={(e) =>
                setProfile({ ...profile, role: e.target.value })
              }
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white"
            >
              <option value="">Select your role</option>
              {ROLE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-400 mt-1">
              This helps us customize contracts for your needs.
            </p>
          </div>

          {/* Default Jurisdiction */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
              <MapPin className="w-4 h-4 text-slate-400" />
              Default Jurisdiction
            </label>
            <select
              value={profile.default_jurisdiction || profile.jurisdiction}
              onChange={(e) =>
                setProfile({ ...profile, default_jurisdiction: e.target.value })
              }
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white"
            >
              <option value="">Select your jurisdiction</option>
              {JURISDICTION_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-400 mt-1">
              Sets the default governing law for your contracts.
            </p>
          </div>
        </div>
      </div>

      {/* Bottom Save Button for Mobile */}
      <div className="flex justify-end md:hidden">
        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
