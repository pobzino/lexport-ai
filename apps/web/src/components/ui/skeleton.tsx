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

// Full dashboard page skeleton
export function DashboardSkeleton() {
    return (
        <div className="space-y-8">
            {/* Welcome section */}
            <div className="space-y-2">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-4 w-48" />
            </div>

            {/* Stats grid */}
            <DashboardStatsSkeleton />

            {/* Quick actions */}
            <QuickActionsSkeleton />

            {/* Recent contracts */}
            <div className="bg-white rounded-xl border border-slate-200">
                <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                    <div className="space-y-2">
                        <Skeleton className="h-5 w-40" />
                        <Skeleton className="h-4 w-64" />
                    </div>
                    <Skeleton className="h-4 w-16" />
                </div>
                <div className="p-6">
                    <div className="divide-y divide-slate-100">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <ContractCardSkeleton key={i} />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

// Contracts page skeleton with sidebar
export function ContractsPageSkeleton() {
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="space-y-2">
                    <Skeleton className="h-7 w-32" />
                    <Skeleton className="h-4 w-64" />
                </div>
                <div className="flex gap-2">
                    <Skeleton className="h-10 w-24 rounded-lg" />
                    <Skeleton className="h-10 w-32 rounded-lg" />
                </div>
            </div>

            <div className="flex gap-6">
                {/* Sidebar skeleton */}
                <div className="hidden lg:block w-56 flex-shrink-0 bg-white rounded-xl border border-slate-200 h-fit">
                    <div className="px-4 py-3 border-b border-slate-100">
                        <Skeleton className="h-4 w-28" />
                    </div>
                    <div className="p-4 space-y-3">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="flex items-center gap-2">
                                <Skeleton className="w-4 h-4" />
                                <Skeleton className="h-4 flex-1" />
                                <Skeleton className="h-4 w-6" />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Main content */}
                <div className="flex-1 space-y-4">
                    {/* Filter bar */}
                    <div className="bg-white rounded-xl border border-slate-200 p-4">
                        <div className="flex gap-3">
                            <Skeleton className="h-10 flex-1 rounded-lg" />
                            <Skeleton className="h-10 w-40 rounded-lg" />
                            <Skeleton className="h-10 w-40 rounded-lg" />
                            <Skeleton className="h-10 w-40 rounded-lg" />
                        </div>
                    </div>

                    {/* Contract list */}
                    <ContractListSkeleton count={8} />
                </div>
            </div>
        </div>
    );
}

// Template card skeleton
export function TemplateCardSkeleton() {
    return (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-start justify-between mb-4">
                <Skeleton className="w-10 h-10 rounded-lg" />
                <Skeleton className="w-8 h-8 rounded-lg" />
            </div>
            <div className="space-y-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-1/2" />
            </div>
            <div className="flex gap-2 mt-4">
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-6 w-16 rounded-full" />
            </div>
        </div>
    );
}

// Templates page skeleton
export function TemplatesPageSkeleton() {
    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Header */}
            <div className="flex items-start justify-between mb-8">
                <div className="space-y-2">
                    <Skeleton className="h-7 w-32" />
                    <Skeleton className="h-4 w-80" />
                </div>
                <Skeleton className="h-10 w-40 rounded-lg" />
            </div>

            {/* Filters */}
            <div className="flex gap-3 mb-6">
                <Skeleton className="h-10 flex-1 max-w-sm rounded-lg" />
                <Skeleton className="h-10 w-32 rounded-lg" />
                <Skeleton className="h-10 w-36 rounded-lg" />
                <Skeleton className="h-10 w-48 rounded-lg" />
            </div>

            {/* Templates grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                    <TemplateCardSkeleton key={i} />
                ))}
            </div>
        </div>
    );
}

// Signatures page skeleton
export function SignaturesPageSkeleton() {
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="space-y-2">
                    <Skeleton className="h-7 w-32" />
                    <Skeleton className="h-4 w-56" />
                </div>
                <Skeleton className="h-10 w-40 rounded-lg" />
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="bg-white rounded-xl border border-slate-200 p-5">
                        <div className="flex items-center justify-between">
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-20" />
                                <Skeleton className="h-6 w-12" />
                            </div>
                            <Skeleton className="w-10 h-10 rounded-lg" />
                        </div>
                    </div>
                ))}
            </div>

            {/* Signature requests list */}
            <div className="bg-white rounded-xl border border-slate-200">
                <div className="px-6 py-4 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                        <Skeleton className="w-5 h-5" />
                        <Skeleton className="h-5 w-40" />
                        <Skeleton className="h-5 w-8 rounded-full" />
                    </div>
                </div>
                <div className="divide-y divide-slate-100">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="px-6 py-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <Skeleton className="w-10 h-10 rounded-full" />
                                    <div className="space-y-2">
                                        <Skeleton className="h-4 w-32" />
                                        <Skeleton className="h-3 w-48" />
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <Skeleton className="h-6 w-20 rounded-full" />
                                    <Skeleton className="w-8 h-8 rounded-lg" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
