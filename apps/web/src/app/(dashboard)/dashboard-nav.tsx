"use client";

import { useState, useEffect } from "react";
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
  Mail,
  Upload,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DashboardNavProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  isInboxOwner?: boolean;
}

const baseNavItems = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/contracts", label: "Contracts", icon: FolderOpen },
  { href: "/invoices", label: "Invoices", icon: Receipt },
  { href: "/my-templates", label: "Templates", icon: FileStack },
  { href: "/signatures", label: "Signatures", icon: FileSignature },
  { href: "/payments", label: "Payments", icon: CreditCard },
  { href: "/activity", label: "Activity", icon: Activity },
];

const inboxNavItem = { href: "/inbox", label: "Inbox", icon: Mail };

const bottomNavItems = [
  { href: "/settings", label: "Settings", icon: Settings },
];

export function DashboardNav({ user, isInboxOwner }: DashboardNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  const navItems = isInboxOwner
    ? [...baseNavItems.slice(0, 6), inboxNavItem, ...baseNavItems.slice(6)]
    : baseNavItems;

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  const NavContent = () => (
    <>
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
        {/* Close button for mobile */}
        <button
          onClick={() => setMobileMenuOpen(false)}
          className="lg:hidden ml-auto p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          aria-label="Close menu"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* New Contract Button */}
      <div className="px-4 py-4 space-y-2">
        <Link
          href="/contracts/new"
          className="flex items-center justify-center gap-2 w-full bg-[#202e46] hover:bg-[#1a2539] text-white font-medium py-3 px-4 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Contract
        </Link>
        <Link
          href="/contracts/upload"
          className="flex items-center justify-center gap-2 w-full border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium py-3 px-4 rounded-lg transition-colors"
        >
          <Upload className="w-4 h-4" />
          Upload Contract
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
                "flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors",
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
                  "flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors",
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
                className="w-10 h-10 rounded-full"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
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
    </>
  );

  return (
    <>
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-slate-200 flex items-center px-4 z-40">
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
          aria-label="Open menu"
        >
          <Menu className="w-6 h-6" />
        </button>
        <Link href="/dashboard" className="ml-3">
          <Image
            src="/dark-logo.png"
            alt="Lexport"
            width={120}
            height={36}
            className="h-8 w-auto"
          />
        </Link>
        <div className="ml-auto flex items-center gap-2">
          <Link
            href="/contracts/new"
            className="flex items-center gap-1.5 bg-[#202e46] hover:bg-[#1a2539] text-white text-sm font-medium py-2 px-3 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New</span>
          </Link>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar - Desktop always visible, Mobile slide-in */}
      <aside
        className={cn(
          "fixed left-0 top-0 h-screen w-72 bg-white border-r border-slate-200 flex flex-col z-50 transition-transform duration-300 ease-in-out",
          // Desktop: always visible
          "lg:translate-x-0 lg:w-64",
          // Mobile: slide in/out
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <NavContent />
      </aside>
    </>
  );
}
