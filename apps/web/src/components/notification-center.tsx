"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Bell, Check, CheckCheck, X, FileText, CreditCard, AlertCircle, MessageSquare, Clock, RefreshCw } from "lucide-react";
import toast from "@/lib/toast";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

interface Notification {
    id: string;
    type: string;
    title: string;
    message: string;
    contract_id: string | null;
    data: Record<string, unknown>;
    read: boolean;
    created_at: string;
}

const notificationIcons: Record<string, React.ReactNode> = {
    contract_signed: <FileText className="h-5 w-5 text-emerald-500" />,
    signature_requested: <FileText className="h-5 w-5 text-blue-500" />,
    signature_completed: <Check className="h-5 w-5 text-emerald-500" />,
    signature_declined: <X className="h-5 w-5 text-red-500" />,
    payment_received: <CreditCard className="h-5 w-5 text-emerald-500" />,
    payment_failed: <CreditCard className="h-5 w-5 text-red-500" />,
    contract_expired: <AlertCircle className="h-5 w-5 text-amber-500" />,
    contract_expiring_soon: <Clock className="h-5 w-5 text-amber-500" />,
    review_submitted: <MessageSquare className="h-5 w-5 text-blue-500" />,
    comment_added: <MessageSquare className="h-5 w-5 text-blue-500" />,
};

export function NotificationCenter() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const supabase = createClient();

    const unreadCount = notifications.filter(n => !n.read).length;

    useEffect(() => {
        fetchNotifications();

        // Set up realtime subscription
        const channel = supabase
            .channel("notifications")
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "notifications",
                },
                (payload) => {
                    setNotifications(prev => [payload.new as Notification, ...prev]);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    async function fetchNotifications() {
        try {
            const { data, error } = await supabase
                .from("notifications")
                .select("*")
                .order("created_at", { ascending: false })
                .limit(20);

            if (error) throw error;
            setNotifications(data || []);
            setFetchError(false);
        } catch (error) {
            console.error("Error fetching notifications:", error);
            setFetchError(true);
        } finally {
            setLoading(false);
        }
    }

    async function markAsRead(id: string) {
        // Optimistic update
        setNotifications(prev =>
            prev.map(n => (n.id === id ? { ...n, read: true } : n))
        );
        try {
            const { error } = await supabase
                .from("notifications")
                .update({ read: true, read_at: new Date().toISOString() })
                .eq("id", id);

            if (error) throw error;
        } catch (error) {
            console.error("Error marking notification as read:", error);
            // Revert optimistic update
            setNotifications(prev =>
                prev.map(n => (n.id === id ? { ...n, read: false } : n))
            );
        }
    }

    async function markAllAsRead() {
        const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
        if (unreadIds.length === 0) return;

        // Optimistic update
        const prevNotifications = notifications;
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        try {
            const { error } = await supabase
                .from("notifications")
                .update({ read: true, read_at: new Date().toISOString() })
                .in("id", unreadIds);

            if (error) throw error;
        } catch (error) {
            console.error("Error marking all as read:", error);
            setNotifications(prevNotifications);
            toast.error("Failed to mark notifications as read.");
        }
    }

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Bell Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
                aria-label="Notifications"
            >
                <Bell className="h-5 w-5 text-gray-600" />
                {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                        {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute right-0 mt-2 w-[calc(100vw-2rem)] sm:w-96 max-w-[384px] rounded-xl bg-white shadow-xl border border-gray-200 z-50 overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
                        <h3 className="font-semibold text-gray-900">Notifications</h3>
                        {unreadCount > 0 && (
                            <button
                                onClick={markAllAsRead}
                                className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                            >
                                <CheckCheck className="h-4 w-4" />
                                Mark all read
                            </button>
                        )}
                    </div>

                    {/* Notification List */}
                    <div className="max-h-[400px] overflow-y-auto">
                        {loading ? (
                            <div className="p-8 text-center text-gray-500">Loading...</div>
                        ) : fetchError ? (
                            <div className="p-8 text-center">
                                <AlertCircle className="h-10 w-10 text-red-300 mx-auto mb-3" />
                                <p className="text-gray-500 mb-2">Failed to load notifications</p>
                                <button
                                    onClick={() => { setLoading(true); fetchNotifications(); }}
                                    className="text-sm text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
                                >
                                    <RefreshCw className="h-3.5 w-3.5" />
                                    Try again
                                </button>
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="p-8 text-center">
                                <Bell className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                                <p className="text-gray-500">No notifications yet</p>
                            </div>
                        ) : (
                            notifications.map((notification) => (
                                <div
                                    key={notification.id}
                                    className={`px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer ${!notification.read ? "bg-blue-50/50" : ""
                                        }`}
                                    onClick={() => markAsRead(notification.id)}
                                >
                                    <div className="flex gap-3">
                                        <div className="flex-shrink-0 mt-0.5">
                                            {notificationIcons[notification.type] || (
                                                <Bell className="h-5 w-5 text-gray-400" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-900 truncate">
                                                {notification.title}
                                            </p>
                                            <p className="text-sm text-gray-500 line-clamp-2">
                                                {notification.message}
                                            </p>
                                            <p className="text-xs text-gray-400 mt-1">
                                                {formatDistanceToNow(new Date(notification.created_at), {
                                                    addSuffix: true,
                                                })}
                                            </p>
                                        </div>
                                        {!notification.read && (
                                            <div className="flex-shrink-0">
                                                <div className="h-2 w-2 rounded-full bg-blue-500" />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Footer */}
                    {notifications.length > 0 && (
                        <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
                            <Link
                                href="/activity"
                                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                                onClick={() => setIsOpen(false)}
                            >
                                View all activity →
                            </Link>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
