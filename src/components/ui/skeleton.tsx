"use client";

import { cn } from "@/lib/utils";

// Base Skeleton component with shimmer animation
export function Skeleton({
    className,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={cn(
                "animate-pulse rounded-md bg-slate-200",
                className
            )}
            {...props}
        />
    );
}

// Stat card skeleton for dashboard
export function StatCardSkeleton() {
    return (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between">
                <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-8 w-16" />
                </div>
                <Skeleton className="w-12 h-12 rounded-lg" />
            </div>
        </div>
    );
}

// Contract card skeleton for lists
export function ContractCardSkeleton() {
    return (
        <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-4">
                <Skeleton className="w-10 h-10 rounded-lg" />
                <div className="space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                </div>
            </div>
            <div className="flex items-center gap-3">
                <Skeleton className="h-6 w-16 rounded-full" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="w-4 h-4" />
            </div>
        </div>
    );
}

// Dashboard stats loading skeleton
export function DashboardStatsSkeleton() {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
        </div>
    );
}

// Contract list loading skeleton
export function ContractListSkeleton({ count = 5 }: { count?: number }) {
    return (
        <div className="bg-white rounded-xl border border-slate-200">
            <div className="divide-y divide-slate-100">
                {Array.from({ length: count }).map((_, i) => (
                    <ContractCardSkeleton key={i} />
                ))}
            </div>
        </div>
    );
}

// Quick action cards skeleton
export function QuickActionsSkeleton() {
    return (
        <div className="bg-white rounded-xl border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-200">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-64 mt-2" />
            </div>
            <div className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="flex flex-col items-center p-4 rounded-xl border border-slate-200">
                            <Skeleton className="w-10 h-10 rounded-lg mb-3" />
                            <Skeleton className="h-4 w-16" />
                            <Skeleton className="h-3 w-12 mt-1" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
