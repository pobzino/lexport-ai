"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Home,
  FolderOpen,
  FileStack,
  FileSignature,
  Settings,
  LogOut,
  Plus,
  CreditCard,
  Activity,
  Receipt,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DashboardNavProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/contracts", label: "Contracts", icon: FolderOpen },
  { href: "/invoices", label: "Invoices", icon: Receipt },
  { href: "/templates", label: "Templates", icon: FileStack },
  { href: "/signatures", label: "Signatures", icon: FileSignature },
  { href: "/payments", label: "Payments", icon: CreditCard },
  { href: "/activity", label: "Activity", icon: Activity },
];

const bottomNavItems = [
  { href: "/settings", label: "Settings", icon: Settings },
];

export function DashboardNav({ user }: DashboardNavProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-white border-r border-slate-200 flex flex-col z-50">
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-slate-100">
        <Link href="/dashboard" className="flex items-center">
          <Image
            src="/dark-logo.png"
            alt="Lexport"
            width={140}
            height={42}
            className="h-9 w-auto"
          />
        </Link>
      </div>

      {/* New Contract Button */}
      <div className="px-4 py-4">
        <Link
          href="/contracts/new"
          className="flex items-center justify-center gap-2 w-full bg-[#202e46] hover:bg-[#1a2539] text-white font-medium py-2.5 px-4 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Contract
        </Link>
      </div>

      {/* Main Nav */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-[#529ec6]/10 text-[#202e46]"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <Icon className={cn("w-5 h-5", isActive ? "text-[#529ec6]" : "text-slate-400")} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Section */}
      <div className="border-t border-slate-100">
        {/* Settings */}
        <div className="px-3 py-2">
          {bottomNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-[#529ec6]/10 text-[#202e46]"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                )}
              >
                <Icon className={cn("w-5 h-5", isActive ? "text-[#529ec6]" : "text-slate-400")} />
                {item.label}
              </Link>
            );
          })}
        </div>

        {/* User Profile */}
        <div className="px-4 py-4 border-t border-slate-100">
          <div className="flex items-center gap-3">
            {user.image ? (
              <img
                src={user.image}
                alt={user.name || "User"}
                className="w-9 h-9 rounded-full"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center">
                <span className="text-sm font-medium text-slate-600">
                  {user.name?.charAt(0) || user.email?.charAt(0) || "U"}
                </span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">
                {user.name || "User"}
              </p>
              <p className="text-xs text-slate-500 truncate">
                {user.email}
              </p>
            </div>
            <button
              onClick={handleSignOut}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
